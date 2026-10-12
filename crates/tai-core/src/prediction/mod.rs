// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Predicción de aprobado, plaza y destino (Monte Carlo determinista).
//!
//! Modelo (ver `docs/CONTRATO-API.md`, «Modelo de predicción»):
//!
//! 1. **Rendimiento**: por parte, fracción contestada `f = (A+E)/n` y precisión
//!    `a ~ Beta(A+1, E+1)`. En el examen objetivo: contestadas = `round(f·Q)` y aciertos
//!    `~ Binomial(contestadas, a)`. Si falta una parte se usa la otra.
//! 2. **Corte** por unidad: oficial si la convocatoria objetivo lo publica (o el del usuario);
//!    si no, el ratio del puesto `k = plazas · presentados_ref / presentados_obj` en la
//!    distribución de referencia (plazas = las del turno general en ingreso libre, porque las del
//!    cupo de discapacidad desiertas no se le acumulan), nunca por debajo del suelo y con ruido Normal(0; 0,03)
//!    truncado al suelo. Si hay más plazas que aptos tuvo la referencia, el corte es el suelo.
//!    Con calificación por partes, la 1.ª parte actúa de filtro amplio (en 2025, 3.090 aptos):
//!    su corte estimado es el suelo; las demás partes usan el corte por ranking
//!    (`docs/investigacion/modelo-plazas-destinos.md` §1). Las partes son eliminatorias.
//! 3. **Aprobado**: todas las unidades ≥ corte. **Puesto**: `#(ratios de referencia > ratio
//!    del usuario) + 1`, escalado por presentados objetivo/referencia. **Plaza**: aprobado y
//!    puesto ≤ plazas.
//! 4. **Destinos**: `q = puesto/plazas` → índice `j = ceil(q · total_ref)`; una zona o
//!    localidad está disponible si hubo alguna adjudicación allí con orden ≥ `j`.
//! 5. K = 4.000 muestras. La semilla se deriva de la entrada del modelo (convocatoria objetivo,
//!    esquema y datos de referencia) y cada muestra usa subflujos propios, de modo que el
//!    resultado es estable y responde de forma suave y casi monótona a los aciertos.

mod destinations;
mod reference;
mod sampling;
mod text;

use std::collections::BTreeMap;

pub use destinations::{
    DestinationContext, DestinationRequest, category_of, simulate as simulate_destinations,
};
pub use reference::{
    DestinationModel, LocalityIndex, LocalityStat, ReferenceDistribution, ReferenceKind,
    build_destinations, build_reference,
};
pub use sampling::inverse_normal_cdf;

use crate::api::{CityProbability, DataQuality, Prediction, RankEstimate, TierProbability};
use crate::catalog::Catalog;
use crate::defaults::{CUTOFF_NOISE_SD, DEFAULT_TURNOUT, MONTE_CARLO_SAMPLES};
use crate::model::{Access, Convocatoria, Locality, ScoringScheme, TierDef, TierId};
use crate::scoring::{transform, unit_official_ratio};
use crate::util::{StableHasher, fmt_int, quantile_sorted};

/// Rendimiento observado en una parte (admite recuentos ponderados).
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ObservedPart {
    pub part: u32,
    pub correct: f64,
    pub wrong: f64,
    pub blank: f64,
}

impl ObservedPart {
    /// Preguntas observadas.
    pub fn total(&self) -> f64 {
        self.correct + self.wrong + self.blank
    }
}

/// Entrada de una predicción.
#[derive(Debug, Clone, Copy)]
pub struct PredictionRequest<'a> {
    pub observed: &'a [ObservedPart],
    /// Nota observada normalizada a 0–100.
    pub observed_grade: f64,
    /// Corte personalizado (ratio 0–1).
    pub override_ratio: Option<f64>,
    /// Localidades preferidas del usuario.
    pub preferred_localities: &'a [String],
}

/// Datos de la convocatoria objetivo y de referencia preparados para simular.
#[derive(Debug, Clone)]
pub struct PredictionContext {
    pub target_id: String,
    pub target_label: String,
    /// Plazas por las que compite el aspirante (ver [`competing_plazas`]).
    pub plazas: Option<u32>,
    /// Plazas del cupo de discapacidad que no cuentan para el turno general.
    pub reserved_plazas: Option<u32>,
    pub scheme: ScoringScheme,
    /// Corte oficial publicado (ratio) por unidad del esquema objetivo.
    pub official_ratios: Vec<Option<f64>>,
    pub reference: ReferenceDistribution,
    pub target_presentados: f64,
    pub presentados_source: PresentadosSource,
    pub destinations: DestinationModel,
    pub tiers: Vec<TierDef>,
    pub localities: Vec<Locality>,
    pub data_quality: DataQuality,
    pub seed: u64,
}

/// Origen del número de presentados de la convocatoria objetivo.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PresentadosSource {
    /// Publicado por la CPS.
    Published,
    /// Admitidos × participación habitual.
    FromAdmitidos,
    /// Igual que la referencia.
    AsReference,
}

/// Plazas por las que compite un aspirante del turno general.
///
/// En ingreso libre, las plazas del cupo de discapacidad que quedan desiertas no se acumulan al
/// turno general (base 5.4 de las convocatorias de 2021 a 2025): cuentan solo las generales. En
/// promoción interna sí se acumulan, así que cuentan todas.
pub fn competing_plazas(conv: &Convocatoria) -> Option<u32> {
    match conv.access {
        Access::Libre => conv.plazas.general.or_else(|| conv.plazas.total()),
        Access::PromocionInterna => conv.plazas.total(),
    }
    .filter(|p| *p > 0)
}

fn target_label(conv: &Convocatoria) -> String {
    let base = match conv.access {
        Access::Libre => format!("Convocatoria {}", conv.year),
        Access::PromocionInterna => format!("Promoción interna {}", conv.year),
    };
    match (conv.plazas.total(), competing_plazas(conv)) {
        (Some(t), Some(c)) if c < t => format!(
            "{base} · {} plazas ({} de acceso general)",
            fmt_int(u64::from(t)),
            fmt_int(u64::from(c))
        ),
        (Some(t), _) => format!("{base} · {} plazas", fmt_int(u64::from(t))),
        (None, _) => base,
    }
}

/// Corte oficial publicado por la convocatoria para cada unidad del esquema.
pub fn official_ratios(scheme: &ScoringScheme, conv: Option<&Convocatoria>) -> Vec<Option<f64>> {
    let all_parts: Vec<u32> = scheme.parts.iter().map(|p| p.part).collect();
    scheme
        .grading
        .units
        .iter()
        .map(|unit| {
            unit_official_ratio(scheme, unit).or_else(|| {
                let cutoff = conv?.cutoff.as_ref()?;
                if unit.parts.len() == 1 {
                    cutoff.part_ratio(unit.parts[0]).or_else(|| {
                        (scheme.grading.units.len() == 1)
                            .then(|| cutoff.ratio())
                            .flatten()
                    })
                } else if unit.parts.iter().all(|p| all_parts.contains(p)) {
                    cutoff.ratio()
                } else {
                    None
                }
            })
        })
        .collect()
}

impl PredictionContext {
    /// Prepara la predicción para la convocatoria `target_id` (o la objetivo de los datos).
    pub fn build(catalog: &Catalog, target_id: Option<&str>) -> PredictionContext {
        let target = target_id
            .and_then(|id| catalog.convocatoria(id))
            .or_else(|| {
                catalog
                    .target_convocatoria_id()
                    .and_then(|id| catalog.convocatoria(id))
            });
        let scheme = target
            .and_then(|c| c.scoring_scheme.as_deref())
            .and_then(|id| catalog.scheme(id))
            .unwrap_or_else(|| catalog.default_scheme())
            .clone();
        let access = target.map(|c| c.access).unwrap_or(scheme.access);
        let reference = build_reference(catalog, access, &scheme);
        let destinations = build_destinations(catalog, access);
        let (target_presentados, presentados_source) = match (
            target.and_then(|c| c.presentados).filter(|p| *p > 0),
            target.and_then(|c| c.admitidos).filter(|a| *a > 0),
        ) {
            (Some(p), _) => (f64::from(p), PresentadosSource::Published),
            (None, Some(a)) => (
                (f64::from(a) * DEFAULT_TURNOUT).round(),
                PresentadosSource::FromAdmitidos,
            ),
            (None, None) => (reference.presentados(), PresentadosSource::AsReference),
        };
        let has_grades = matches!(
            reference.kind,
            ReferenceKind::Grades | ReferenceKind::Calibrated
        );
        let data_quality = match (reference.kind, destinations.synthetic) {
            (ReferenceKind::Grades, false) => DataQuality::Real,
            _ if has_grades || !destinations.synthetic => DataQuality::Partial,
            _ => DataQuality::Synthetic,
        };
        let target_id = target
            .map(|c| c.id.clone())
            .unwrap_or_else(|| "desconocida".to_string());
        let plazas = target.and_then(competing_plazas);
        let seed = StableHasher::new()
            .str("opotai/prediccion/v1")
            .str(&target_id)
            .str(&scheme.id)
            .u64(u64::from(plazas.unwrap_or(0)))
            .f64(target_presentados)
            .str(reference.convocatoria.as_deref().unwrap_or("-"))
            .u64(reference.ratios.len() as u64)
            .u64(reference.aptos as u64)
            .str(destinations.convocatoria.as_deref().unwrap_or("-"))
            .u64(MONTE_CARLO_SAMPLES as u64)
            .finish();
        let reserved_plazas = target
            .and_then(|c| Some(c.plazas.total()?.saturating_sub(plazas?)))
            .filter(|r| *r > 0);
        PredictionContext {
            reserved_plazas,
            target_label: target
                .map(target_label)
                .unwrap_or_else(|| "Convocatoria objetivo".to_string()),
            target_id,
            plazas,
            official_ratios: official_ratios(&scheme, target),
            scheme,
            reference,
            target_presentados,
            presentados_source,
            destinations,
            tiers: catalog.tiers().to_vec(),
            localities: catalog.localidades().localities.clone(),
            data_quality,
            seed,
        }
    }

    /// Factor de escala presentados objetivo / referencia.
    pub fn scale(&self) -> f64 {
        let p_ref = self.reference.presentados();
        if p_ref > 0.0 {
            self.target_presentados / p_ref
        } else {
            1.0
        }
    }

    /// Suelo (ratio) de cada unidad.
    pub fn floors(&self) -> Vec<f64> {
        self.scheme
            .grading
            .units
            .iter()
            .map(|u| u.min_direct_ratio.clamp(0.0, 1.0))
            .collect()
    }

    /// Puesto equivalente en la referencia: `k_ref = plazas · presentados_ref / presentados_obj`.
    pub fn reference_rank_k(&self) -> Option<usize> {
        self.plazas
            .map(|p| (f64::from(p) / self.scale()).round().max(1.0) as usize)
    }

    /// Corte estimado sin ruido (ratio) de la unidad `index` sin corte oficial.
    ///
    /// - Sin datos de notas (referencia sintética): el suelo.
    /// - Calificación por partes: la 1.ª unidad es un filtro amplio → suelo; las demás, el
    ///   ratio del puesto `k_ref` en la referencia.
    /// - Calificación conjunta: el ratio del puesto `k_ref`.
    ///
    /// Si `k_ref` supera los aptos de la referencia, el suelo.
    fn estimated_ratio(&self, index: usize, floor: f64) -> f64 {
        let multi = self.scheme.grading.units.len() > 1;
        if self.reference.kind == ReferenceKind::Synthetic || (multi && index == 0) {
            return floor;
        }
        match self
            .reference_rank_k()
            .and_then(|k| self.reference.ratio_at_rank(k))
        {
            Some(r) => r.max(floor),
            None => floor,
        }
    }

    /// Corte central (sin ruido) de cada unidad: oficial o estimado.
    pub fn base_cutoff_ratios(&self) -> Vec<f64> {
        self.floors()
            .into_iter()
            .zip(&self.official_ratios)
            .enumerate()
            .map(|(i, (floor, official))| match official {
                Some(r) => r.max(floor),
                None => self.estimated_ratio(i, floor),
            })
            .collect()
    }

    /// Cortes estimados para la corrección (solo con datos reales de notas; si no, la
    /// corrección usa el suelo reglamentario).
    pub fn estimated_cutoff_ratios(&self) -> Vec<Option<f64>> {
        if self.reference.kind == ReferenceKind::Synthetic {
            return vec![None; self.scheme.grading.units.len()];
        }
        self.floors()
            .into_iter()
            .zip(&self.official_ratios)
            .enumerate()
            .map(|(i, (floor, official))| match official {
                Some(_) => None,
                None => Some(self.estimated_ratio(i, floor)),
            })
            .collect()
    }

    /// Descripción del origen de la estimación del corte.
    pub fn estimate_label(&self) -> String {
        match &self.reference.convocatoria {
            Some(c) => format!(
                "según {} plazas de {} y los datos de {c}",
                fmt_int(u64::from(self.plazas.unwrap_or(0))),
                self.target_id
            ),
            None => format!("para {}", self.target_id),
        }
    }
}

/// Parámetros de simulación de una parte del examen objetivo.
#[derive(Debug, Clone, Copy)]
struct PartModel {
    part: u32,
    questions: u32,
    value: f64,
    penalty: f64,
    answered_fraction: f64,
    alpha: f64,
    beta: f64,
    weight: f64,
}

/// Observación de una parte (o de la que la sustituye) y si se ha sustituido.
fn observation_for(observed: &[ObservedPart], part: u32) -> (Option<ObservedPart>, bool) {
    if let Some(o) = observed.iter().find(|o| o.part == part && o.total() > 0.0) {
        return (Some(*o), false);
    }
    let fallback = observed
        .iter()
        .filter(|o| o.total() > 0.0)
        .max_by(|a, b| a.total().total_cmp(&b.total()))
        .copied();
    (fallback, fallback.is_some())
}

/// Muestreador del examen objetivo, compartido por la predicción y el simulador de destinos.
///
/// Cada muestra `k` usa subflujos propios (`sampling::stream(seed, k, propósito)`), de modo que
/// el resultado no depende del orden en que se pidan las muestras.
pub(crate) struct Sampler<'a> {
    ctx: &'a PredictionContext,
    parts: Vec<PartModel>,
    /// Partes sin observación sustituidas por otra: (parte, parte usada).
    pub(crate) substituted: Vec<(u32, u32)>,
    floors: Vec<f64>,
    fixed: Vec<bool>,
    centers: Vec<f64>,
    max_total: f64,
    scale: f64,
    /// Ordenación con las reglas de la objetivo sobre las directas por parte de los aptos de la
    /// referencia (calificación por partes): columna de cada parte del esquema objetivo.
    by_parts: Option<Vec<Vec<f64>>>,
}

/// Resultado de una muestra del examen objetivo.
#[derive(Debug, Clone)]
pub(crate) struct Sample {
    /// Calificación normalizada a 0–100.
    pub grade: f64,
    /// Corte de la muestra como ratio de la directa máxima.
    pub cutoff_ratio: f64,
    /// Puesto en la convocatoria objetivo.
    pub rank: f64,
    /// Supera todas las unidades.
    pub all_pass: bool,
    /// Por parte: (parte, aciertos, errores, preguntas).
    pub counts: Vec<(u32, u32, u32, u32)>,
}

impl<'a> Sampler<'a> {
    /// Prepara el muestreo con lo observado y el corte personalizado.
    pub(crate) fn new(
        ctx: &'a PredictionContext,
        observed: &[ObservedPart],
        override_ratio: Option<f64>,
    ) -> Self {
        let mut substituted = Vec::new();
        let parts: Vec<PartModel> = ctx
            .scheme
            .parts
            .iter()
            .map(|p| {
                let (obs, replaced) = observation_for(observed, p.part);
                if replaced {
                    if let Some(o) = obs {
                        substituted.push((p.part, o.part));
                    }
                }
                let (f, alpha, beta) = match obs {
                    Some(o) => (
                        ((o.correct + o.wrong) / o.total()).clamp(0.0, 1.0),
                        o.correct + 1.0,
                        o.wrong + 1.0,
                    ),
                    None => (0.0, 1.0, 1.0),
                };
                let weight = ctx
                    .reference
                    .part_weights
                    .iter()
                    .find(|(part, _)| *part == p.part)
                    .map(|(_, w)| *w)
                    .unwrap_or_else(|| p.nominal_max_direct());
                PartModel {
                    part: p.part,
                    questions: p.counted_questions(),
                    value: p.value,
                    penalty: p.penalty_per_error(),
                    answered_fraction: f,
                    alpha,
                    beta,
                    weight,
                }
            })
            .collect();
        let floors = ctx.floors();
        let base = ctx.base_cutoff_ratios();
        let fixed: Vec<bool> = ctx
            .official_ratios
            .iter()
            .map(|o| o.is_some() || override_ratio.is_some())
            .collect();
        let centers: Vec<f64> = base
            .iter()
            .zip(&floors)
            .map(|(b, floor)| match override_ratio {
                Some(r) => r.clamp(0.0, 1.0).max(*floor),
                None => *b,
            })
            .collect();
        let max_total: f64 = ctx.scheme.grading.units.iter().map(|u| u.max_grade).sum();
        // Con calificación por partes, el puesto se calcula con la nota de la objetivo aplicada a
        // la cohorte de referencia (si se conocen sus directas por parte), no con la suma
        // ponderada de las partes: en 2025 el supuesto pesa más que en 2024.
        let by_parts = ctx
            .reference
            .apto_parts
            .as_ref()
            .filter(|_| ctx.scheme.grading.units.len() > 1)
            .and_then(|ap| {
                let cols = parts
                    .iter()
                    .map(|p| ap.parts.iter().position(|q| *q == p.part))
                    .collect::<Option<Vec<usize>>>()?;
                // Directa de cada apto en cada unidad, en la escala del esquema objetivo.
                Some(
                    (0..ap.len())
                        .map(|i| {
                            let row = ap.row(i);
                            ctx.scheme
                                .grading
                                .units
                                .iter()
                                .map(|unit| {
                                    parts
                                        .iter()
                                        .zip(&cols)
                                        .filter(|(p, _)| unit.parts.contains(&p.part))
                                        .map(|(p, c)| row[*c] * p.value * f64::from(p.questions))
                                        .sum()
                                })
                                .collect()
                        })
                        .collect(),
                )
            });
        // Quien no llega al suelo de alguna unidad no la supera con ningún corte: fuera.
        let by_parts = by_parts.map(|rows: Vec<Vec<f64>>| {
            let unit_max: Vec<f64> = ctx
                .scheme
                .grading
                .units
                .iter()
                .map(|u| ctx.scheme.nominal_max_direct(u))
                .collect();
            rows.into_iter()
                .filter(|row| {
                    row.iter()
                        .zip(&unit_max)
                        .zip(&floors)
                        .all(|((d, n), f)| *d + 1e-9 >= f * n)
                })
                .collect()
        });
        Self {
            by_parts,
            ctx,
            parts,
            substituted,
            floors,
            fixed,
            centers,
            max_total,
            scale: ctx.scale(),
        }
    }

    /// Muestra `k`.
    pub(crate) fn sample(&self, k: u64) -> Sample {
        let ctx = self.ctx;
        let units = &ctx.scheme.grading.units;
        let mut part_direct = Vec::with_capacity(self.parts.len());
        let mut counts = Vec::with_capacity(self.parts.len());
        for (pi, p) in self.parts.iter().enumerate() {
            let purpose = 10 + 2 * pi as u64;
            let accuracy =
                sampling::beta(&mut sampling::stream(ctx.seed, k, purpose), p.alpha, p.beta);
            let answered = (p.answered_fraction * f64::from(p.questions))
                .round()
                .clamp(0.0, f64::from(p.questions)) as u32;
            let correct = sampling::binomial(
                &mut sampling::stream(ctx.seed, k, purpose + 1),
                answered,
                accuracy,
            );
            let wrong = answered - correct;
            let direct = p.value * f64::from(correct) - p.penalty * f64::from(wrong);
            let max_direct = p.value * f64::from(p.questions);
            part_direct.push((p.part, direct, max_direct, p.weight));
            counts.push((p.part, correct, wrong, p.questions));
        }
        let mut all_pass = true;
        let mut eliminated = false;
        let mut grade_sum = 0.0;
        let mut cutoff_direct_sum = 0.0;
        let mut max_direct_sum = 0.0;
        let mut unit_cuts = Vec::with_capacity(units.len());
        for (ui, unit) in units.iter().enumerate() {
            let (d, n) = part_direct
                .iter()
                .filter(|(part, _, _, _)| unit.parts.contains(part))
                .fold((0.0, 0.0), |acc, (_, d, n, _)| (acc.0 + d, acc.1 + n));
            let ratio = if self.fixed[ui] {
                self.centers[ui]
            } else {
                let noise = CUTOFF_NOISE_SD
                    * sampling::standard_normal(&mut sampling::stream(
                        ctx.seed,
                        k,
                        100 + ui as u64,
                    ));
                (self.centers[ui] + noise).max(self.floors[ui]).min(1.0)
            };
            let m = ratio * n;
            unit_cuts.push((n, m));
            let (mut g, mut passed) = transform(d, n, m, unit.pass_grade, unit.max_grade);
            // Partes eliminatorias: si no se supera una, las siguientes no se corrigen.
            if eliminated {
                g = 0.0;
                passed = false;
            } else if units.len() > 1 && !passed {
                eliminated = true;
            }
            all_pass &= passed;
            grade_sum += g;
            cutoff_direct_sum += m;
            max_direct_sum += n;
        }
        let grade = if self.max_total > 0.0 {
            grade_sum / self.max_total * 100.0
        } else {
            0.0
        };
        let cutoff_ratio = if max_direct_sum > 0.0 {
            cutoff_direct_sum / max_direct_sum
        } else {
            0.0
        };

        // Ratio comparable con la referencia (ponderación de partes de la referencia).
        let (wsum, rsum) = part_direct.iter().fold((0.0, 0.0), |acc, (_, d, n, w)| {
            if *n > 0.0 {
                (acc.0 + w, acc.1 + w * d / n)
            } else {
                acc
            }
        });
        let user_ratio = if wsum > 0.0 { rsum / wsum } else { 0.0 };
        let mut rank_ref = ctx.reference.rank_of(user_ratio) as f64;
        if let Some(directs) = &self.by_parts {
            let (better, passers) = self.rank_by_parts(directs, &unit_cuts, grade_sum);
            rank_ref = if all_pass {
                (better + 1) as f64
            } else {
                // Quien no supera una parte queda detrás de todos los que la superan.
                rank_ref.max((passers + 1) as f64)
            };
        }
        let rank = (rank_ref * self.scale).round().max(1.0);
        Sample {
            grade,
            cutoff_ratio,
            rank,
            all_pass,
            counts,
        }
    }

    /// Aptos de la referencia que, con las reglas de la objetivo y los cortes de esta muestra,
    /// superan todas las partes con una nota mayor que `grade_sum`, y cuántos las superan.
    ///
    /// Quien no fue apto en la referencia tampoco supera estas partes: con cortes de al menos el
    /// 30 % en cada parte, su directa conjunta habría alcanzado el corte de la referencia.
    fn rank_by_parts(
        &self,
        directs: &[Vec<f64>],
        unit_cuts: &[(f64, f64)],
        grade_sum: f64,
    ) -> (usize, usize) {
        let units = &self.ctx.scheme.grading.units;
        let (mut better, mut passers) = (0usize, 0usize);
        'aptos: for row in directs {
            let mut total = 0.0;
            for ((unit, (n, m)), d) in units.iter().zip(unit_cuts).zip(row) {
                let (g, passed) = transform(*d, *n, *m, unit.pass_grade, unit.max_grade);
                if !passed {
                    continue 'aptos;
                }
                total += g;
            }
            passers += 1;
            if total > grade_sum + 1e-9 {
                better += 1;
            }
        }
        (better, passers)
    }

    /// ¿La muestra obtiene plaza en la convocatoria objetivo?
    pub(crate) fn has_plaza(&self, s: &Sample) -> bool {
        s.all_pass && self.ctx.plazas.is_none_or(|p| s.rank <= f64::from(p))
    }
}

/// Ejecuta la predicción.
pub fn predict(ctx: &PredictionContext, req: &PredictionRequest<'_>) -> Prediction {
    let sampler = Sampler::new(ctx, req.observed, req.override_ratio);
    let substituted = sampler.substituted.clone();

    let k_samples = MONTE_CARLO_SAMPLES;
    let mut grades = Vec::with_capacity(k_samples);
    let mut cutoffs = Vec::with_capacity(k_samples);
    let mut ranks = Vec::with_capacity(k_samples);
    let mut passes = 0usize;
    let mut plazas_won = 0usize;
    let mut tier_hits: BTreeMap<TierId, usize> = BTreeMap::new();
    let top: Vec<&LocalityStat> = ctx.destinations.localities.iter().take(8).collect();
    let mut top_hits = vec![0usize; top.len()];
    let preferred: Vec<Option<&LocalityStat>> = req
        .preferred_localities
        .iter()
        .map(|name| ctx.destinations.locality(name))
        .collect();
    let mut preferred_hits = vec![0usize; preferred.len()];
    let mut outside_madrid_hits = 0usize;

    for k in 0..k_samples as u64 {
        let s = sampler.sample(k);
        grades.push(s.grade);
        cutoffs.push(s.cutoff_ratio);
        ranks.push(s.rank);
        if s.all_pass {
            passes += 1;
        }
        if sampler.has_plaza(&s) {
            plazas_won += 1;
            let q = match ctx.plazas {
                Some(p) => s.rank / f64::from(p),
                None => 1.0,
            };
            let j = ctx.destinations.order_index(q);
            for (tier, max_order) in &ctx.destinations.tier_max_order {
                if *max_order >= j {
                    *tier_hits.entry(*tier).or_insert(0) += 1;
                }
            }
            if ctx
                .destinations
                .big_city_outside_madrid_max
                .is_some_and(|m| m >= j)
            {
                outside_madrid_hits += 1;
            }
            for (i, l) in top.iter().enumerate() {
                if l.max_order >= j {
                    top_hits[i] += 1;
                }
            }
            for (i, l) in preferred.iter().enumerate() {
                if l.is_some_and(|l| l.max_order >= j) {
                    preferred_hits[i] += 1;
                }
            }
        }
    }

    let kf = k_samples as f64;
    grades.sort_by(f64::total_cmp);
    cutoffs.sort_by(f64::total_cmp);
    ranks.sort_by(f64::total_cmp);
    let p_pass = passes as f64 / kf;
    let p_plaza = plazas_won as f64 / kf;
    let rank = RankEstimate {
        p10: quantile_sorted(&ranks, 0.10).round(),
        p50: quantile_sorted(&ranks, 0.50).round(),
        p90: quantile_sorted(&ranks, 0.90).round(),
    };
    let percentile = (1.0 - (rank.p50 - 1.0) / ctx.target_presentados.max(1.0)).clamp(0.0, 1.0);

    let tiers: Vec<TierProbability> = ctx
        .tiers
        .iter()
        .map(|t| TierProbability {
            tier: t.id,
            label: t.label.clone(),
            description: t.description.clone(),
            probability: tier_hits.get(&t.id).copied().unwrap_or(0) as f64 / kf,
            share_of_plazas: if ctx.destinations.synthetic {
                None
            } else {
                Some(
                    ctx.destinations
                        .tier_share
                        .get(&t.id)
                        .copied()
                        .unwrap_or(0.0),
                )
            },
        })
        .collect();
    let total_dest = f64::from(ctx.destinations.total.max(1));
    let top_cities: Vec<CityProbability> = top
        .iter()
        .zip(&top_hits)
        .map(|(l, hits)| CityProbability {
            locality: l.name.clone(),
            province: l.province.clone(),
            tier: l.tier,
            probability: *hits as f64 / kf,
            share_of_plazas: f64::from(l.count) / total_dest,
        })
        .collect();
    let index = LocalityIndex::new(&ctx.localities);
    let preferred_out: Vec<CityProbability> = req
        .preferred_localities
        .iter()
        .zip(preferred.iter().zip(&preferred_hits))
        .map(|(name, (stat, hits))| match stat {
            Some(l) => CityProbability {
                locality: l.name.clone(),
                province: l.province.clone(),
                tier: l.tier,
                probability: *hits as f64 / kf,
                share_of_plazas: f64::from(l.count) / total_dest,
            },
            None => {
                let known = index.find(name, None);
                let tier = known.map(|l| l.tier).unwrap_or(TierId::Pueblo);
                // Sin adjudicaciones en la referencia: 0 con datos reales; con datos sintéticos,
                // la probabilidad de su zona.
                let probability = if ctx.destinations.synthetic {
                    tiers
                        .iter()
                        .find(|t| t.tier == tier)
                        .map(|t| t.probability)
                        .unwrap_or(p_plaza)
                } else {
                    0.0
                };
                CityProbability {
                    locality: known
                        .map(|l| l.name.clone())
                        .unwrap_or_else(|| name.clone()),
                    province: known.map(|l| l.province.clone()).unwrap_or_default(),
                    tier,
                    probability,
                    share_of_plazas: 0.0,
                }
            }
        })
        .collect();

    let p_big_city_outside_madrid = if ctx.destinations.synthetic {
        None
    } else {
        Some(outside_madrid_hits as f64 / kf)
    };

    let summary = text::Summary {
        ctx,
        parts_observed: req.observed,
        substituted: &substituted,
        override_ratio: req.override_ratio,
        p_pass,
        p_plaza,
        p_big_city_outside_madrid,
        expected_grade: quantile_sorted(&grades, 0.5),
        observed_grade: req.observed_grade,
        cutoff_ratio: quantile_sorted(&cutoffs, 0.5),
        cutoff_p10: quantile_sorted(&cutoffs, 0.1),
        cutoff_p90: quantile_sorted(&cutoffs, 0.9),
        rank,
        tiers: &tiers,
        preferred: &preferred_out,
    };

    Prediction {
        target_convocatoria: ctx.target_id.clone(),
        target_label: ctx.target_label.clone(),
        plazas: ctx.plazas,
        observed_grade: req.observed_grade,
        expected_grade: summary.expected_grade,
        p_pass,
        p_plaza,
        cutoff_ratio: summary.cutoff_ratio,
        estimated_rank: Some(rank),
        estimated_percentile: Some(percentile),
        verdict: text::verdict(&summary),
        reasoning: text::reasoning(&summary),
        assumptions: text::assumptions(&summary),
        tiers,
        p_big_city_outside_madrid,
        top_cities,
        preferred: preferred_out,
        data_quality: ctx.data_quality,
    }
}
