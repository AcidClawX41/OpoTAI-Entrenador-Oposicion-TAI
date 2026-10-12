// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Datos de referencia del modelo: distribución de puntuaciones de los presentados y
//! adjudicación histórica de destinos.

use std::collections::{BTreeMap, HashMap};

use super::sampling::inverse_normal_cdf;
use crate::catalog::Catalog;
use crate::defaults::{
    DEFAULT_PASS_RATE, MADRID, RATIO_SD, SYNTHETIC_MEAN_RATIO, SYNTHETIC_PRESENTADOS,
    SYNTHETIC_TIER_LAST, SYNTHETIC_TIER_SHARES,
};
use crate::model::{Access, Convocatoria, Locality, ScoringScheme, TierId};
use crate::util::{fmt_dec, fmt_int, normalize_key};

/// Procedencia de la distribución de referencia.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ReferenceKind {
    /// Calificaciones publicadas de los aptos.
    Grades,
    /// Normal ajustada a presentados, aptos y corte publicados.
    Calibrated,
    /// Distribución sintética documentada.
    Synthetic,
}

/// Distribución de ratios de puntuación directa (D/N) de los presentados de la referencia,
/// materializada en orden descendente (una entrada por presentado).
#[derive(Debug, Clone, PartialEq)]
pub struct ReferenceDistribution {
    pub convocatoria: Option<String>,
    pub kind: ReferenceKind,
    pub ratios: Vec<f64>,
    /// Número de aptos (las primeras entradas).
    pub aptos: usize,
    /// Corte de la referencia como ratio.
    pub cutoff_ratio: f64,
    /// Peso de cada parte (directa máxima nominal) en la referencia, para comparar ratios.
    pub part_weights: Vec<(u32, f64)>,
    /// Descripción para los supuestos del modelo.
    pub description: String,
    /// Directas por parte de cada apto de la referencia (si el BOE las publica), para ordenar con
    /// las reglas de la convocatoria objetivo.
    pub apto_parts: Option<AptoParts>,
}

/// Rendimiento por parte de los aptos de la referencia, como fracción de la directa máxima
/// nominal de cada parte (comparable entre convocatorias con distinto valor por pregunta).
#[derive(Debug, Clone, PartialEq)]
pub struct AptoParts {
    /// Partes, en el orden de las columnas.
    pub parts: Vec<u32>,
    /// Fracciones por apto: `fractions[i * parts.len() + k]` es la del apto `i` en `parts[k]`.
    pub fractions: Vec<f64>,
}

impl AptoParts {
    /// Número de aptos.
    pub fn len(&self) -> usize {
        if self.parts.is_empty() {
            0
        } else {
            self.fractions.len() / self.parts.len()
        }
    }

    /// ¿Sin aptos?
    pub fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// Fracciones del apto `i`.
    pub fn row(&self, i: usize) -> &[f64] {
        let w = self.parts.len();
        &self.fractions[i * w..(i + 1) * w]
    }
}

/// Directas por parte de los aptos de `conv`, como fracción de la directa máxima de su esquema.
fn apto_parts(conv: &Convocatoria, scheme: &ScoringScheme) -> Option<AptoParts> {
    let grades = conv.grades_of_aptos.as_ref()?;
    let n = grades.values.len();
    if grades.part_directs.is_empty() || n == 0 {
        return None;
    }
    let mut parts = Vec::new();
    let mut columns = Vec::new();
    for pd in &grades.part_directs {
        let max = scheme.part(pd.part)?.nominal_max_direct();
        if pd.values.len() != n || max <= 0.0 {
            return None;
        }
        parts.push(pd.part);
        columns.push((max, &pd.values));
    }
    let fractions = (0..n)
        .flat_map(|i| columns.iter().map(move |(max, v)| v[i] / max))
        .collect();
    Some(AptoParts { parts, fractions })
}

impl ReferenceDistribution {
    /// Presentados de la referencia.
    pub fn presentados(&self) -> f64 {
        self.ratios.len().max(1) as f64
    }

    /// Puesto en la referencia: `#(ratios > r) + 1`.
    pub fn rank_of(&self, ratio: f64) -> usize {
        self.ratios.partition_point(|&x| x > ratio) + 1
    }

    /// Ratio del puesto `k` si está entre los aptos.
    pub fn ratio_at_rank(&self, k: usize) -> Option<f64> {
        if k == 0 || k > self.aptos {
            None
        } else {
            self.ratios.get(k - 1).copied()
        }
    }
}

/// Parámetros de conversión calificación ↔ directa de una convocatoria.
#[derive(Debug, Clone, Copy, PartialEq)]
pub(super) struct Conversion {
    pub(super) cutoff_ratio: f64,
    pub(super) max_direct: f64,
    pub(super) cutoff_direct: f64,
    pub(super) pass_grade: f64,
    pub(super) max_grade: f64,
}

pub(super) fn conversion(conv: &Convocatoria, scheme: &ScoringScheme) -> Conversion {
    let nominal: f64 = scheme
        .grading
        .units
        .iter()
        .map(|u| scheme.nominal_max_direct(u))
        .sum();
    let max_direct = conv
        .cutoff
        .as_ref()
        .and_then(|c| c.max_direct)
        .filter(|n| *n > 0.0)
        .unwrap_or(if nominal > 0.0 { nominal } else { 100.0 });
    let floor_ratio = scheme
        .grading
        .units
        .first()
        .map(|u| u.min_direct_ratio)
        .unwrap_or(0.3);
    let scheme_cutoff: Option<f64> = scheme
        .grading
        .units
        .iter()
        .map(|u| u.cutoff_direct)
        .sum::<Option<f64>>()
        .filter(|_| nominal > 0.0)
        .map(|c| c * max_direct / nominal);
    let cutoff_direct = conv
        .cutoff
        .as_ref()
        .and_then(|c| c.direct)
        .or(scheme_cutoff)
        .unwrap_or(floor_ratio * max_direct);
    let pass_grade = conv
        .cutoff
        .as_ref()
        .and_then(|c| c.grade)
        .unwrap_or_else(|| scheme.grading.units.iter().map(|u| u.pass_grade).sum());
    let max_grade: f64 = scheme.grading.units.iter().map(|u| u.max_grade).sum();
    Conversion {
        cutoff_ratio: (cutoff_direct / max_direct).clamp(0.0, 1.0),
        max_direct,
        cutoff_direct,
        pass_grade,
        max_grade: if max_grade > pass_grade {
            max_grade
        } else {
            100.0
        },
    }
}

impl Conversion {
    /// Calificación de apto → ratio de directa: `D = M + (g − pass)/(max − pass) · (N − M)`.
    pub(super) fn ratio_of_grade(&self, g: f64) -> f64 {
        let span = self.max_grade - self.pass_grade;
        let d = if span > 0.0 {
            self.cutoff_direct
                + (g - self.pass_grade) / span * (self.max_direct - self.cutoff_direct)
        } else {
            self.cutoff_direct
        };
        (d / self.max_direct).clamp(-1.0, 1.0)
    }
}

/// Cuantiles de una normal materializados en orden descendente.
fn normal_ratios(n: usize, mean: f64, sd: f64) -> Vec<f64> {
    (0..n)
        .map(|i| {
            let p = 1.0 - (i as f64 + 0.5) / n as f64;
            (mean + sd * inverse_normal_cdf(p)).clamp(-0.5, 1.0)
        })
        .collect()
}

/// Expande una muestra ordenada a `count` valores por interpolación de cuantiles.
fn expand_sorted(desc: &[f64], count: usize) -> Vec<f64> {
    if desc.len() >= count || desc.len() < 2 {
        return desc.to_vec();
    }
    (0..count)
        .map(|i| {
            let pos = i as f64 * (desc.len() - 1) as f64 / (count - 1) as f64;
            let lo = pos.floor() as usize;
            let hi = pos.ceil() as usize;
            desc[lo] + (desc[hi] - desc[lo]) * (pos - lo as f64)
        })
        .collect()
}

pub(super) fn part_weights(scheme: &ScoringScheme) -> Vec<(u32, f64)> {
    scheme
        .parts
        .iter()
        .map(|p| (p.part, p.nominal_max_direct()))
        .collect()
}

pub(super) fn same_access_desc(catalog: &Catalog, access: Access) -> Vec<&Convocatoria> {
    let mut list: Vec<&Convocatoria> = catalog
        .convocatorias()
        .convocatorias
        .iter()
        .filter(|c| c.access == access)
        .collect();
    list.sort_by(|a, b| {
        b.year
            .cmp(&a.year)
            .then_with(|| b.exam_date.cmp(&a.exam_date))
            .then_with(|| a.id.cmp(&b.id))
    });
    list
}

pub(super) fn scheme_of<'a>(
    catalog: &'a Catalog,
    conv: &Convocatoria,
    fallback: &'a ScoringScheme,
) -> &'a ScoringScheme {
    conv.scoring_scheme
        .as_deref()
        .and_then(|id| catalog.scheme(id))
        .unwrap_or(fallback)
}

/// Elige la convocatoria de referencia y construye su distribución.
pub fn build_reference(
    catalog: &Catalog,
    access: Access,
    target_scheme: &ScoringScheme,
) -> ReferenceDistribution {
    let candidates = same_access_desc(catalog, access);

    // 1) Calificaciones publicadas de los aptos.
    if let Some(conv) = candidates.iter().find(|c| c.has_grades()) {
        let scheme = scheme_of(catalog, conv, target_scheme);
        let conv_params = conversion(conv, scheme);
        let mut aptos: Vec<f64> = conv
            .grades_of_aptos
            .as_ref()
            .map(|g| {
                g.values
                    .iter()
                    .map(|v| conv_params.ratio_of_grade(*v))
                    .collect()
            })
            .unwrap_or_default();
        aptos.sort_by(|a, b| b.total_cmp(a));
        let declared = conv
            .grades_of_aptos
            .as_ref()
            .map(|g| g.count as usize)
            .unwrap_or(0);
        let aptos = expand_sorted(&aptos, declared.max(aptos.len()));
        let n_aptos = aptos.len();
        let (presentados, assumed) = match conv.presentados.map(|p| p as usize) {
            Some(p) if p >= n_aptos => (p, false),
            _ => (
                ((n_aptos as f64) / DEFAULT_PASS_RATE).round() as usize,
                true,
            ),
        };
        let tail = presentados.saturating_sub(n_aptos);
        let mut ratios = aptos;
        ratios.extend(
            (0..tail).map(|i| conv_params.cutoff_ratio * (1.0 - (i as f64 + 0.5) / tail as f64)),
        );
        ratios.sort_by(|a, b| b.total_cmp(a));
        let mut description = format!(
            "Distribución de referencia: calificaciones de los {} aptos de {} convertidas a \
             puntuación directa (corte {} de la directa máxima)",
            fmt_int(n_aptos as u64),
            conv.id,
            pct(conv_params.cutoff_ratio)
        );
        if assumed {
            description.push_str(&format!(
                "; se desconocen los presentados y se suponen {} (tasa de aptos del {})",
                fmt_int(presentados as u64),
                pct(DEFAULT_PASS_RATE)
            ));
        } else {
            description.push_str(&format!(
                " y {} presentados; por debajo del corte se asume un reparto uniforme",
                fmt_int(presentados as u64)
            ));
        }
        return ReferenceDistribution {
            convocatoria: Some(conv.id.clone()),
            kind: ReferenceKind::Grades,
            ratios,
            aptos: n_aptos,
            cutoff_ratio: conv_params.cutoff_ratio,
            part_weights: part_weights(scheme),
            description: format!("{description}."),
            apto_parts: apto_parts(conv, scheme),
        };
    }

    // 2) Normal ajustada a presentados, aptos y corte publicados.
    if let Some(conv) = candidates
        .iter()
        .find(|c| matches!((c.presentados, c.aptos), (Some(p), Some(a)) if p > 0 && a > 0 && a < p))
    {
        let scheme = scheme_of(catalog, conv, target_scheme);
        let conv_params = conversion(conv, scheme);
        let presentados = conv.presentados.unwrap_or(1) as usize;
        let aptos = conv.aptos.unwrap_or(0) as usize;
        let pass_rate = aptos as f64 / presentados as f64;
        let mean = conv_params.cutoff_ratio - RATIO_SD * inverse_normal_cdf(1.0 - pass_rate);
        return ReferenceDistribution {
            convocatoria: Some(conv.id.clone()),
            kind: ReferenceKind::Calibrated,
            ratios: normal_ratios(presentados, mean, RATIO_SD),
            aptos,
            cutoff_ratio: conv_params.cutoff_ratio,
            part_weights: part_weights(scheme),
            description: format!(
                "Sin calificaciones individuales: se asume una distribución normal de \
                 puntuaciones (desviación {} de la directa máxima) ajustada a los {} presentados \
                 y {} aptos de {} con corte del {}.",
                fmt_dec(RATIO_SD, 2),
                fmt_int(presentados as u64),
                fmt_int(aptos as u64),
                conv.id,
                pct(conv_params.cutoff_ratio)
            ),
            apto_parts: None,
        };
    }

    // 3) Sintética (con los presentados reales si se conocen).
    let with_presentados = candidates
        .iter()
        .find(|c| c.presentados.is_some_and(|p| p > 0));
    let (presentados, conv_id) = match with_presentados {
        Some(c) => (
            c.presentados.unwrap_or(SYNTHETIC_PRESENTADOS) as usize,
            Some(c.id.clone()),
        ),
        None => (SYNTHETIC_PRESENTADOS as usize, None),
    };
    let floor = target_scheme
        .grading
        .units
        .first()
        .map(|u| u.min_direct_ratio)
        .unwrap_or(0.3);
    let ratios = normal_ratios(presentados, SYNTHETIC_MEAN_RATIO, RATIO_SD);
    let aptos = ratios.iter().filter(|r| **r >= floor).count();
    ReferenceDistribution {
        convocatoria: conv_id.clone(),
        kind: ReferenceKind::Synthetic,
        ratios,
        aptos,
        cutoff_ratio: floor,
        part_weights: part_weights(target_scheme),
        description: format!(
            "Sin datos de notas: distribución sintética de {} presentados{} con media del {} y \
             desviación del {} de la directa máxima.",
            fmt_int(presentados as u64),
            conv_id
                .map(|c| format!(" (los de {c})"))
                .unwrap_or_default(),
            pct(SYNTHETIC_MEAN_RATIO),
            pct(RATIO_SD)
        ),
        apto_parts: None,
    }
}

fn pct(x: f64) -> String {
    crate::util::fmt_pct(x)
}

// ───────────────────────────── Destinos ─────────────────────────────

/// Plazas adjudicadas en una localidad de la referencia.
#[derive(Debug, Clone, PartialEq)]
pub struct LocalityStat {
    pub name: String,
    pub province: String,
    pub tier: TierId,
    pub count: u32,
    /// Mayor número de orden que obtuvo plaza allí (disponibilidad).
    pub max_order: u32,
}

/// Modelo de adjudicación de destinos.
#[derive(Debug, Clone, PartialEq)]
pub struct DestinationModel {
    pub convocatoria: Option<String>,
    pub total: u32,
    pub tier_max_order: BTreeMap<TierId, u32>,
    pub tier_share: BTreeMap<TierId, f64>,
    /// Localidades ordenadas por número de plazas (desc).
    pub localities: Vec<LocalityStat>,
    /// Último número de orden con destino en una gran ciudad distinta de Madrid.
    pub big_city_outside_madrid_max: Option<u32>,
    /// Fracción de las plazas de la referencia en Madrid capital.
    pub madrid_share: Option<f64>,
    /// Adjudicaciones cuya localidad no aparece en `localidades.json`.
    pub unclassified: u32,
    pub synthetic: bool,
}

impl DestinationModel {
    /// Índice equivalente en la referencia para una posición relativa `q` (0–1].
    pub fn order_index(&self, q: f64) -> u32 {
        (q.clamp(0.0, 1.0) * f64::from(self.total)).ceil().max(1.0) as u32
    }

    /// Busca una localidad por nombre (normalizado).
    pub fn locality(&self, name: &str) -> Option<&LocalityStat> {
        let key = normalize_key(name);
        self.localities
            .iter()
            .find(|l| normalize_key(&l.name) == key)
    }
}

/// Índice de localidades por nombre normalizado.
pub struct LocalityIndex<'a> {
    by_name: HashMap<String, Vec<&'a Locality>>,
}

impl<'a> LocalityIndex<'a> {
    /// Construye el índice.
    pub fn new(localities: &'a [Locality]) -> Self {
        let mut by_name: HashMap<String, Vec<&Locality>> = HashMap::new();
        for l in localities {
            by_name.entry(normalize_key(&l.name)).or_default().push(l);
        }
        Self { by_name }
    }

    /// Localidad por nombre (y provincia si hay homónimas).
    pub fn find(&self, name: &str, province: Option<&str>) -> Option<&'a Locality> {
        let list = self.by_name.get(&normalize_key(name))?;
        if let Some(prov) = province {
            let key = normalize_key(prov);
            if let Some(l) = list.iter().find(|l| normalize_key(&l.province) == key) {
                return Some(l);
            }
        }
        list.first().copied()
    }
}

/// Construye el modelo de destinos con el dataset más reciente del mismo acceso.
pub fn build_destinations(catalog: &Catalog, access: Access) -> DestinationModel {
    let index = LocalityIndex::new(&catalog.localidades().localities);
    for conv in same_access_desc(catalog, access) {
        let Some(dataset) = catalog.destinos_for(conv) else {
            continue;
        };
        if dataset.assignments.is_empty() {
            continue;
        }
        let total = dataset.effective_total();
        let mut tier_max_order: BTreeMap<TierId, u32> = BTreeMap::new();
        let mut tier_count: BTreeMap<TierId, u32> = BTreeMap::new();
        let mut by_locality: BTreeMap<(String, String), LocalityStat> = BTreeMap::new();
        let mut unclassified = 0;
        for a in &dataset.assignments {
            let tier = match index.find(&a.locality, Some(&a.province)) {
                Some(l) => l.tier,
                None => {
                    unclassified += 1;
                    TierId::Pueblo
                }
            };
            let max = tier_max_order.entry(tier).or_insert(0);
            *max = (*max).max(a.order);
            *tier_count.entry(tier).or_insert(0) += 1;
            let entry = by_locality
                .entry((normalize_key(&a.locality), normalize_key(&a.province)))
                .or_insert_with(|| LocalityStat {
                    name: a.locality.clone(),
                    province: a.province.clone(),
                    tier,
                    count: 0,
                    max_order: 0,
                });
            entry.count += 1;
            entry.max_order = entry.max_order.max(a.order);
        }
        let assigned = dataset.assignments.len() as f64;
        let tier_share = tier_count
            .iter()
            .map(|(t, c)| (*t, f64::from(*c) / assigned))
            .collect();
        let mut localities: Vec<LocalityStat> = by_locality.into_values().collect();
        localities.sort_by(|a, b| b.count.cmp(&a.count).then_with(|| a.name.cmp(&b.name)));
        let is_madrid = |l: &LocalityStat| normalize_key(&l.name) == MADRID;
        let big_city_outside_madrid_max = localities
            .iter()
            .filter(|l| l.tier == TierId::GranCiudad && !is_madrid(l))
            .map(|l| l.max_order)
            .max();
        let madrid_count: u32 = localities
            .iter()
            .filter(|l| is_madrid(l))
            .map(|l| l.count)
            .sum();
        return DestinationModel {
            convocatoria: Some(conv.id.clone()),
            total,
            tier_max_order,
            tier_share,
            localities,
            big_city_outside_madrid_max,
            madrid_share: Some(f64::from(madrid_count) / assigned),
            unclassified,
            synthetic: false,
        };
    }
    // Sin datos: reparto y agotamiento medios de 2023–2024 (Madrid no se agota nunca).
    let total = 1000u32;
    DestinationModel {
        convocatoria: None,
        total,
        tier_max_order: SYNTHETIC_TIER_LAST
            .iter()
            .map(|(t, frac)| (*t, (frac * f64::from(total)).round() as u32))
            .collect(),
        tier_share: SYNTHETIC_TIER_SHARES.iter().copied().collect(),
        localities: Vec::new(),
        big_city_outside_madrid_max: None,
        madrid_share: None,
        unclassified: 0,
        synthetic: true,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normal_ratios_are_descending_and_centered() {
        let r = normal_ratios(1001, 0.2, 0.17);
        assert!(r.windows(2).all(|w| w[0] >= w[1]));
        assert!((r[500] - 0.2).abs() < 1e-9);
    }

    #[test]
    fn expand_keeps_extremes() {
        let e = expand_sorted(&[0.9, 0.5, 0.3], 5);
        assert_eq!(e.len(), 5);
        assert!((e[0] - 0.9).abs() < 1e-12 && (e[4] - 0.3).abs() < 1e-12);
    }

    #[test]
    fn calibrated_default_reference_matches_pass_rate() {
        let catalog = Catalog::empty();
        let scheme = catalog.default_scheme().clone();
        let reference = build_reference(&catalog, Access::Libre, &scheme);
        // Valores por defecto: li-2024 con 5.261 presentados y 1.756 aptos (corte 30 %).
        assert_eq!(reference.kind, ReferenceKind::Calibrated);
        assert_eq!(reference.convocatoria.as_deref(), Some("li-2024"));
        assert_eq!(reference.ratios.len(), 5261);
        let above = reference.ratios.iter().filter(|r| **r >= 0.3).count();
        assert!((above as i64 - 1756).abs() <= 2, "aptos {above}");
    }
}
