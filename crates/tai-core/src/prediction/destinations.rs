// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Simulador de destinos: «con tu nota, ¿qué plazas te habrían quedado y dónde acabarías?».
//!
//! La adjudicación de destinos se hace «según el orden obtenido en el proceso selectivo»
//! (art. 26 del RD 364/1995): quien tiene el número de orden `j` elige entre las plazas que no
//! han escogido los `j − 1` anteriores. Con los datos anonimizados de cada convocatoria
//! (número de orden → destino), las plazas que seguían libres en el puesto `j` son
//! exactamente las que eligieron los números de orden ≥ `j`.
//!
//! Escenarios:
//!
//! 1. **Réplicas** de las convocatorias con notas de aprobados y destinos publicados: el
//!    rendimiento muestreado del usuario se puntúa con la escala de cada convocatoria
//!    (penalización, peso de las partes y corte), se ordena entre sus aprobados y se mira qué
//!    plazas quedaban y qué eligieron los números de orden cercanos.
//! 2. **Proyección** a la convocatoria objetivo: el puesto muestreado por la predicción se
//!    traslada en posición relativa (`puesto / plazas`) al reparto más reciente.
//!
//! Se reutiliza el muestreador de la predicción ([`super::Sampler`]): mismas muestras, mismas
//! semillas, resultados deterministas.

use std::collections::{BTreeMap, HashMap};

use super::reference::{LocalityIndex, same_access_desc, scheme_of};
use super::{ObservedPart, PredictionContext, Sample, Sampler};
use crate::api::{
    CategoryAvailability, DataQuality, DestinationScenario, DestinationSimulation,
    LikelyDestination, LocalityAvailability, ProvinceAvailability, RankEstimate, ScenarioKind,
};
use crate::catalog::Catalog;
use crate::defaults::MONTE_CARLO_SAMPLES;
use crate::model::{
    Access, Convocatoria, CutoffBasis, DestinosFile, GradingUnit, ScoringScheme, TierId,
};
use crate::scoring::transform;
use crate::util::{fmt_dec, fmt_int, fmt_pct, normalize_key, quantile_sorted};

/// Entradas de «lo más probable» que se devuelven.
const LIKELY_TOP: usize = 12;
/// Fracción de la plantilla a cada lado del número de orden con la que se estima lo que
/// elegirías (mínimo 2 personas).
const NEIGHBOUR_FRACTION: f64 = 0.01;
/// Tolerancia numérica en las comparaciones de ratios.
const EPS: f64 = 1e-9;

/// Ámbito del organismo de destino a partir del texto (abreviado) del BOE.
///
/// Los nombres de los ministerios cambian con cada legislatura; el ámbito es estable y es lo
/// que interesa al elegir («Agencia Tributaria», «Seguridad Social», «Defensa»…).
pub fn category_of(organism: Option<&str>) -> &'static str {
    let Some(raw) = organism else {
        return "Otros organismos";
    };
    // Sin acentos ni signos («SEG.SOC.Y» → «seg soc y»), como en la interfaz.
    let o = normalize_key(raw)
        .split(|c: char| !c.is_ascii_alphanumeric())
        .filter(|w| !w.is_empty())
        .collect::<Vec<_>>()
        .join(" ");
    let has = |needle: &str| o.contains(needle);
    if has("tributari") || has("inspeccion fin") {
        "Agencia Tributaria"
    } else if has("seg soc") || has("seguridad social") {
        "Seguridad Social, Inclusión y Migraciones"
    } else if has("trabajo") {
        "Trabajo y Economía Social"
    } else if has("transf digit")
        || has("transformacion digital")
        || has("func publica")
        || has("funcion publica")
    {
        "Transformación Digital y Función Pública"
    } else if has("pol territ") || has("politica territorial") {
        "Política Territorial (Delegaciones del Gobierno)"
    } else if has("defensa") {
        "Defensa"
    } else if has("interior") {
        "Interior"
    } else if has("hacienda") {
        "Hacienda"
    } else if has("just") || has("presidencia") || has("rel cort") {
        "Presidencia y Justicia"
    } else if has("economia") || has("industria") || has("comercio") {
        "Economía, Industria y Comercio"
    } else if has("transicion") {
        "Transición Ecológica y Reto Demográfico"
    } else if has("transportes") || has("vivienda") {
        "Transportes, Movilidad y Vivienda"
    } else if has("ciencia") || has("universidades") || has("csic") || has("investig") {
        "Ciencia, Universidades e Investigación"
    } else if has("agencia")
        || has("agencias")
        || has("entes")
        || has("consejo")
        || has("comision")
        || has("museo")
        || has("boletin")
    {
        "Agencias y organismos públicos"
    } else {
        "Otros ministerios"
    }
}

/// Grupo de adjudicaciones (provincia, localidad o ámbito) con sus números de orden.
#[derive(Debug, Clone)]
struct Group {
    name: String,
    province: String,
    tier: TierId,
    /// Números de orden ordenados de menor a mayor.
    orders: Vec<u32>,
}

impl Group {
    /// Plazas que eligieron los números de orden ≥ `j` (las que seguían libres en `j`).
    fn available_from(&self, j: u32) -> usize {
        self.orders.len() - self.orders.partition_point(|&o| o < j)
    }

    fn last_order(&self) -> u32 {
        self.orders.last().copied().unwrap_or(0)
    }
}

/// Adjudicación indexada.
#[derive(Debug, Clone)]
struct Entry {
    order: u32,
    province: usize,
    locality: usize,
    category: usize,
    /// Índice del destino concreto (localidad + organismo + centro directivo) en `combos`.
    combo: usize,
}

/// Destino concreto (para «lo más probable»).
#[derive(Debug, Clone)]
struct Combo {
    locality: usize,
    category: usize,
    organism: Option<String>,
    unit: Option<String>,
}

/// Destinos de una convocatoria indexados para consultar «lo que queda desde el puesto `j`».
#[derive(Debug, Clone)]
pub struct Dataset {
    pub conv_id: String,
    pub total: u32,
    entries: Vec<Entry>,
    orders: Vec<u32>,
    provinces: Vec<Group>,
    localities: Vec<Group>,
    categories: Vec<Group>,
    combos: Vec<Combo>,
}

fn group_index(
    groups: &mut Vec<Group>,
    index: &mut HashMap<String, usize>,
    key: String,
    make: impl FnOnce() -> Group,
) -> usize {
    *index.entry(key).or_insert_with(|| {
        groups.push(make());
        groups.len() - 1
    })
}

impl Dataset {
    fn build(file: &DestinosFile, localities: &LocalityIndex<'_>) -> Option<Dataset> {
        if file.assignments.is_empty() {
            return None;
        }
        let mut assignments: Vec<_> = file.assignments.iter().collect();
        assignments.sort_by_key(|a| a.order);
        let (mut provinces, mut localities_out, mut categories) =
            (Vec::new(), Vec::new(), Vec::new());
        let (mut p_idx, mut l_idx, mut c_idx) = (HashMap::new(), HashMap::new(), HashMap::new());
        let mut combos: Vec<Combo> = Vec::new();
        let mut combo_idx: HashMap<(usize, Option<String>, Option<String>), usize> = HashMap::new();
        let mut entries = Vec::with_capacity(assignments.len());
        for a in assignments {
            let tier = localities
                .find(&a.locality, Some(&a.province))
                .map(|l| l.tier)
                .unwrap_or(TierId::Pueblo);
            let province = group_index(
                &mut provinces,
                &mut p_idx,
                normalize_key(&a.province),
                || Group {
                    name: a.province.clone(),
                    province: a.province.clone(),
                    tier,
                    orders: Vec::new(),
                },
            );
            let locality = group_index(
                &mut localities_out,
                &mut l_idx,
                format!(
                    "{}|{}",
                    normalize_key(&a.locality),
                    normalize_key(&a.province)
                ),
                || Group {
                    name: a.locality.clone(),
                    province: a.province.clone(),
                    tier,
                    orders: Vec::new(),
                },
            );
            let cat = category_of(a.organism.as_deref());
            let category = group_index(&mut categories, &mut c_idx, cat.to_string(), || Group {
                name: cat.to_string(),
                province: String::new(),
                tier,
                orders: Vec::new(),
            });
            provinces[province].orders.push(a.order);
            localities_out[locality].orders.push(a.order);
            categories[category].orders.push(a.order);
            let combo = *combo_idx
                .entry((locality, a.organism.clone(), a.unit.clone()))
                .or_insert_with(|| {
                    combos.push(Combo {
                        locality,
                        category,
                        organism: a.organism.clone(),
                        unit: a.unit.clone(),
                    });
                    combos.len() - 1
                });
            entries.push(Entry {
                order: a.order,
                province,
                locality,
                category,
                combo,
            });
        }
        let orders = entries.iter().map(|e| e.order).collect();
        Some(Dataset {
            conv_id: file.convocatoria.clone(),
            total: file.effective_total(),
            entries,
            orders,
            provinces,
            localities: localities_out,
            categories,
            combos,
        })
    }

    /// Número de orden equivalente a una posición relativa `q` (0–1].
    fn order_index(&self, q: f64) -> u32 {
        (q.clamp(0.0, 1.0) * f64::from(self.total)).ceil().max(1.0) as u32
    }

    /// Personas a cada lado del número de orden con las que se estima «lo que elegirías».
    fn neighbour_window(&self) -> usize {
        ((self.entries.len() as f64 * NEIGHBOUR_FRACTION).round() as usize).max(2)
    }
}

/// Parte del examen de una convocatoria anterior.
#[derive(Debug, Clone)]
struct HistPart {
    part: u32,
    /// Puntuación directa máxima nominal de la parte.
    max_direct: f64,
    /// Penalización por error como fracción del valor de la pregunta.
    penalty: f64,
}

/// Unidad de calificación de una convocatoria anterior, con su corte oficial.
#[derive(Debug, Clone)]
struct HistUnit {
    parts: Vec<u32>,
    max_direct: f64,
    cutoff_direct: f64,
    pass_grade: f64,
    max_grade: f64,
}

/// Convocatoria anterior con notas de aprobados y destinos: se puede «repetir» con la nota
/// del usuario.
///
/// La muestra se corrige con las reglas de esa convocatoria (preguntas, penalización, unidades
/// de calificación y cortes oficiales de cada unidad, eliminatorias si hay varias) y la nota
/// resultante se ordena entre las calificaciones publicadas de sus aprobados. En 2019 y 2021
/// cada parte se calificaba por separado (el BOE publica «Parte 1», «Parte 2» y la suma), así que
/// no basta con la directa conjunta.
#[derive(Debug, Clone)]
pub struct HistoricalCall {
    pub id: String,
    pub year: i32,
    pub label: String,
    parts: Vec<HistPart>,
    units: Vec<HistUnit>,
    /// Calificaciones publicadas de los aprobados, de mayor a menor (el orden de los números
    /// de orden).
    grades_desc: Vec<f64>,
    /// El corte fue el suelo reglamentario (hubo menos aptos que plazas): todo apto tuvo plaza.
    every_apto_placed: bool,
    pub dataset: Dataset,
}

impl HistoricalCall {
    /// Directa de la muestra en una parte de esta convocatoria (en proporción a sus preguntas).
    fn part_direct(&self, part: &HistPart, s: &Sample) -> f64 {
        let (c, e, q) = match s.counts.iter().find(|(p, ..)| *p == part.part) {
            Some((_, c, e, q)) if *q > 0 => (f64::from(*c), f64::from(*e), f64::from(*q)),
            // Sin esa parte en la muestra: el rendimiento conjunto de todas sus partes.
            _ => s.counts.iter().fold((0.0, 0.0, 0.0), |acc, (_, c, e, q)| {
                (
                    acc.0 + f64::from(*c),
                    acc.1 + f64::from(*e),
                    acc.2 + f64::from(*q),
                )
            }),
        };
        if q > 0.0 {
            part.max_direct * (c - part.penalty * e) / q
        } else {
            0.0
        }
    }

    /// Calificación (0–100) con las reglas de esta convocatoria y si supera todas las unidades.
    fn grade(&self, s: &Sample) -> (f64, bool) {
        let mut total = 0.0;
        let mut max_total = 0.0;
        let mut passed_all = true;
        for unit in &self.units {
            let d: f64 = self
                .parts
                .iter()
                .filter(|p| unit.parts.contains(&p.part))
                .map(|p| self.part_direct(p, s))
                .sum();
            let (mut g, passed) = transform(
                d,
                unit.max_direct,
                unit.cutoff_direct,
                unit.pass_grade,
                unit.max_grade,
            );
            // Partes eliminatorias: si no se supera una, las siguientes no se corrigen.
            if !passed_all {
                g = 0.0;
            }
            passed_all &= passed;
            total += g;
            max_total += unit.max_grade;
        }
        let grade = if max_total > 0.0 {
            total / max_total * 100.0
        } else {
            0.0
        };
        (grade, passed_all)
    }

    /// (aprobado, número de orden si obtiene plaza, nota equivalente si aprueba).
    ///
    /// Con el número de orden `j` se eligen las plazas que escogieron los números de orden
    /// ≥ `j`. Si la nota queda por debajo de todos los aprobados: con corte por ranking (2019,
    /// 2021) no hay plaza —en 2021 hubo 472 aptos para 455 aprobados—; con corte en el suelo
    /// (2023, 2024) todo apto tuvo plaza y se elige en último lugar.
    fn place(&self, s: &Sample) -> (bool, Option<u32>, Option<f64>) {
        let (grade, passed) = self.grade(s);
        if !passed {
            return (false, None, None);
        }
        let n = self.grades_desc.len();
        let rank = self.grades_desc.partition_point(|&x| x > grade + EPS) + 1;
        let order = if rank <= n {
            Some(rank as u32)
        } else if self.every_apto_placed && n > 0 {
            Some(n as u32)
        } else {
            None
        };
        (true, order, Some(grade))
    }
}

/// Corte oficial (directa) de una unidad de una convocatoria anterior.
fn unit_cutoff(scheme: &ScoringScheme, unit: &GradingUnit, conv: &Convocatoria) -> f64 {
    let nominal = scheme.nominal_max_direct(unit);
    if let Some(c) = unit.cutoff_direct {
        return c;
    }
    let published = conv.cutoff.as_ref().and_then(|c| {
        if unit.parts.len() == 1 {
            c.per_part
                .as_ref()?
                .iter()
                .find(|p| p.part == unit.parts[0])
                .and_then(|p| match (p.direct, p.max_direct) {
                    (Some(d), Some(n)) if n > 0.0 => Some(d / n * nominal),
                    (Some(d), None) => Some(d),
                    _ => None,
                })
        } else if scheme.grading.units.len() == 1 {
            match (c.direct, c.max_direct) {
                (Some(d), Some(n)) if n > 0.0 => Some(d / n * nominal),
                (Some(d), None) => Some(d),
                _ => None,
            }
        } else {
            None
        }
    });
    published.unwrap_or(unit.min_direct_ratio * nominal)
}

/// Datos del simulador para un tipo de acceso.
#[derive(Debug, Clone)]
pub struct DestinationContext {
    pub access: Access,
    /// Convocatorias anteriores replicables, de la más reciente a la más antigua.
    pub calls: Vec<HistoricalCall>,
    /// Reparto más reciente (para la proyección).
    pub latest: Option<Dataset>,
}

impl DestinationContext {
    /// Construye el contexto con las convocatorias del acceso que tienen notas y destinos.
    /// Si el acceso no tiene destinos publicados (promoción interna), usa los de libre.
    pub fn build(catalog: &Catalog, access: Access) -> DestinationContext {
        let index = LocalityIndex::new(&catalog.localidades().localities);
        let mut calls = Vec::new();
        let mut latest: Option<Dataset> = None;
        for acc in [access, Access::Libre] {
            for conv in same_access_desc(catalog, acc) {
                let Some(file) = catalog.destinos_for(conv) else {
                    continue;
                };
                let Some(dataset) = Dataset::build(file, &index) else {
                    continue;
                };
                if latest.is_none() {
                    latest = Some(dataset.clone());
                }
                let Some(grades) = conv
                    .grades_of_aptos
                    .as_ref()
                    .filter(|g| !g.values.is_empty())
                else {
                    continue;
                };
                let scheme = scheme_of(catalog, conv, catalog.default_scheme());
                let mut grades_desc = grades.values.clone();
                grades_desc.sort_by(|a, b| b.total_cmp(a));
                let parts = scheme
                    .parts
                    .iter()
                    .map(|p| HistPart {
                        part: p.part,
                        max_direct: p.nominal_max_direct(),
                        penalty: match p.penalty_divisor {
                            Some(d) if d > 0.0 => 1.0 / d,
                            _ => 0.0,
                        },
                    })
                    .collect();
                let units = scheme
                    .grading
                    .units
                    .iter()
                    .map(|u| HistUnit {
                        parts: u.parts.clone(),
                        max_direct: scheme.nominal_max_direct(u),
                        cutoff_direct: unit_cutoff(scheme, u, conv),
                        pass_grade: u.pass_grade,
                        max_grade: u.max_grade,
                    })
                    .collect();
                let every_apto_placed = conv
                    .cutoff
                    .as_ref()
                    .is_some_and(|c| c.basis == CutoffBasis::Floor);
                let access_label = match conv.access {
                    Access::Libre => "Ingreso libre",
                    Access::PromocionInterna => "Promoción interna",
                };
                calls.push(HistoricalCall {
                    id: conv.id.clone(),
                    year: conv.year,
                    label: format!("{access_label} {}", conv.year),
                    parts,
                    units,
                    grades_desc,
                    every_apto_placed,
                    dataset,
                });
            }
            if latest.is_some() {
                break;
            }
        }
        DestinationContext {
            access,
            calls,
            latest,
        }
    }
}

/// Entrada del simulador.
#[derive(Debug, Clone, Copy)]
pub struct DestinationRequest<'a> {
    pub observed: &'a [ObservedPart],
    pub observed_grade: f64,
    pub override_ratio: Option<f64>,
    pub preferred_localities: &'a [String],
}

/// Acumuladores de un escenario: los resultados dependen solo del número de orden, así que se
/// guarda el histograma de números de orden y se evalúa cada valor distinto una sola vez.
struct Tally<'d> {
    ds: &'d Dataset,
    samples: usize,
    passes: usize,
    grades: Vec<f64>,
    orders: BTreeMap<u32, usize>,
}

impl<'d> Tally<'d> {
    fn new(ds: &'d Dataset) -> Self {
        Tally {
            ds,
            samples: 0,
            passes: 0,
            grades: Vec::new(),
            orders: BTreeMap::new(),
        }
    }

    /// Añade una muestra: aprobado, número de orden (si hay plaza) y nota equivalente.
    fn add(&mut self, passed: bool, order: Option<u32>, grade: Option<f64>) {
        self.samples += 1;
        if passed {
            self.passes += 1;
        }
        if let Some(g) = grade {
            self.grades.push(g);
        }
        if let Some(j) = order {
            *self.orders.entry(j).or_insert(0) += 1;
        }
    }

    fn with_plaza(&self) -> usize {
        self.orders.values().sum()
    }
}

/// Sumas ponderadas por el histograma de números de orden.
struct Sums {
    available_total: f64,
    province_avail: Vec<f64>,
    province_hit: Vec<f64>,
    province_likely: Vec<f64>,
    locality_avail: Vec<f64>,
    locality_hit: Vec<f64>,
    locality_likely: Vec<f64>,
    category_avail: Vec<f64>,
    category_likely: Vec<f64>,
    combo_likely: Vec<f64>,
}

impl Sums {
    fn compute(ds: &Dataset, orders: &BTreeMap<u32, usize>) -> Sums {
        let mut out = Sums {
            available_total: 0.0,
            province_avail: vec![0.0; ds.provinces.len()],
            province_hit: vec![0.0; ds.provinces.len()],
            province_likely: vec![0.0; ds.provinces.len()],
            locality_avail: vec![0.0; ds.localities.len()],
            locality_hit: vec![0.0; ds.localities.len()],
            locality_likely: vec![0.0; ds.localities.len()],
            category_avail: vec![0.0; ds.categories.len()],
            category_likely: vec![0.0; ds.categories.len()],
            combo_likely: vec![0.0; ds.combos.len()],
        };
        let w = ds.neighbour_window();
        for (&j, &count) in orders {
            let c = count as f64;
            let start = ds.orders.partition_point(|&o| o < j);
            out.available_total += c * (ds.orders.len() - start) as f64;
            for (i, g) in ds.provinces.iter().enumerate() {
                let n = g.available_from(j);
                out.province_avail[i] += c * n as f64;
                if n > 0 {
                    out.province_hit[i] += c;
                }
            }
            for (i, g) in ds.localities.iter().enumerate() {
                let n = g.available_from(j);
                out.locality_avail[i] += c * n as f64;
                if n > 0 {
                    out.locality_hit[i] += c;
                }
            }
            for (i, g) in ds.categories.iter().enumerate() {
                out.category_avail[i] += c * g.available_from(j) as f64;
            }
            // Lo que eligieron los números de orden cercanos (ventana centrada en tu puesto).
            let centre = start.min(ds.entries.len().saturating_sub(1));
            let lo = centre.saturating_sub(w);
            let hi = (centre + w + 1).min(ds.entries.len());
            if hi > lo {
                let weight = c / (hi - lo) as f64;
                for e in &ds.entries[lo..hi] {
                    out.province_likely[e.province] += weight;
                    out.locality_likely[e.locality] += weight;
                    out.category_likely[e.category] += weight;
                    out.combo_likely[e.combo] += weight;
                }
            }
        }
        out
    }
}

/// Metadatos de un escenario.
struct ScenarioMeta {
    id: String,
    kind: ScenarioKind,
    label: String,
    year: i32,
    aprobados: u32,
    /// Factor para expresar el número de orden en la convocatoria del escenario (en la
    /// proyección, plazas objetivo / adjudicaciones del reparto usado).
    order_scale: f64,
}

fn rank_estimate(orders: &mut [f64]) -> Option<RankEstimate> {
    if orders.is_empty() {
        return None;
    }
    orders.sort_by(f64::total_cmp);
    let q = |p: f64| quantile_sorted(orders, p).round().max(1.0);
    Some(RankEstimate {
        p10: q(0.10),
        p50: q(0.50),
        p90: q(0.90),
    })
}

fn finish(meta: ScenarioMeta, mut t: Tally<'_>, preferred: &[String]) -> DestinationScenario {
    let ds = t.ds;
    let n = t.samples.max(1) as f64;
    let with_plaza = t.with_plaza();
    let wp = with_plaza.max(1) as f64;
    let has = with_plaza > 0;
    let mean = |x: f64| if has { x / wp } else { 0.0 };
    let sums = Sums::compute(ds, &t.orders);
    let mut orders: Vec<f64> = t
        .orders
        .iter()
        .flat_map(|(j, c)| std::iter::repeat_n(f64::from(*j) * meta.order_scale, *c))
        .collect();
    let rank = rank_estimate(&mut orders);
    t.grades.sort_by(f64::total_cmp);
    let equivalent_grade = (!t.grades.is_empty()).then(|| quantile_sorted(&t.grades, 0.5));

    let mut provinces: Vec<ProvinceAvailability> = ds
        .provinces
        .iter()
        .enumerate()
        .map(|(i, g)| ProvinceAvailability {
            province: g.name.clone(),
            posts: g.orders.len() as u32,
            available_posts: mean(sums.province_avail[i]),
            p_available: mean(sums.province_hit[i]),
            p_likely: mean(sums.province_likely[i]),
            last_order: g.last_order(),
        })
        .collect();
    provinces.sort_by(|a, b| {
        b.posts
            .cmp(&a.posts)
            .then_with(|| a.province.cmp(&b.province))
    });

    let locality = |i: usize| {
        let g = &ds.localities[i];
        LocalityAvailability {
            locality: g.name.clone(),
            province: g.province.clone(),
            tier: g.tier,
            posts: g.orders.len() as u32,
            available_posts: mean(sums.locality_avail[i]),
            p_available: mean(sums.locality_hit[i]),
            p_likely: mean(sums.locality_likely[i]),
            last_order: g.last_order(),
        }
    };
    let mut localities: Vec<LocalityAvailability> =
        (0..ds.localities.len()).map(locality).collect();
    localities.sort_by(|a, b| {
        b.posts
            .cmp(&a.posts)
            .then_with(|| a.locality.cmp(&b.locality))
    });

    let mut categories: Vec<CategoryAvailability> = ds
        .categories
        .iter()
        .enumerate()
        .map(|(i, g)| CategoryAvailability {
            category: g.name.clone(),
            posts: g.orders.len() as u32,
            available_posts: mean(sums.category_avail[i]),
            p_likely: mean(sums.category_likely[i]),
        })
        .collect();
    categories.sort_by(|a, b| {
        b.p_likely
            .total_cmp(&a.p_likely)
            .then_with(|| b.available_posts.total_cmp(&a.available_posts))
            .then_with(|| a.category.cmp(&b.category))
    });

    let mut likely: Vec<LikelyDestination> = ds
        .combos
        .iter()
        .zip(&sums.combo_likely)
        .filter(|(_, w)| **w > 0.0)
        .map(|(c, w)| {
            let g = &ds.localities[c.locality];
            LikelyDestination {
                locality: g.name.clone(),
                province: g.province.clone(),
                category: ds.categories[c.category].name.clone(),
                organism: c.organism.clone(),
                unit: c.unit.clone(),
                probability: mean(*w),
            }
        })
        .collect();
    likely.sort_by(|a, b| {
        b.probability
            .total_cmp(&a.probability)
            .then_with(|| a.locality.cmp(&b.locality))
            .then_with(|| a.unit.cmp(&b.unit))
    });
    likely.truncate(LIKELY_TOP);

    let preferred: Vec<LocalityAvailability> = preferred
        .iter()
        .map(|name| {
            let key = normalize_key(name);
            match ds
                .localities
                .iter()
                .position(|g| normalize_key(&g.name) == key)
            {
                Some(i) => locality(i),
                None => LocalityAvailability {
                    locality: name.clone(),
                    province: String::new(),
                    tier: TierId::Pueblo,
                    posts: 0,
                    available_posts: 0.0,
                    p_available: 0.0,
                    p_likely: 0.0,
                    last_order: 0,
                },
            }
        })
        .collect();

    let available_posts = mean(sums.available_total);
    let posts_total = ds.entries.len() as u32;
    let p_plaza = with_plaza as f64 / n;
    let summary = summary(
        &meta,
        rank.as_ref(),
        p_plaza,
        available_posts,
        posts_total,
        equivalent_grade,
    );
    DestinationScenario {
        id: meta.id,
        kind: meta.kind,
        label: meta.label,
        dataset: ds.conv_id.clone(),
        year: meta.year,
        aprobados: meta.aprobados,
        posts_total,
        p_pass: t.passes as f64 / n,
        p_plaza,
        equivalent_grade,
        rank,
        available_posts,
        available_share: if posts_total > 0 {
            available_posts / f64::from(posts_total)
        } else {
            0.0
        },
        provinces,
        localities,
        categories,
        likely,
        preferred,
        summary,
    }
}

fn summary(
    meta: &ScenarioMeta,
    rank: Option<&RankEstimate>,
    p_plaza: f64,
    available: f64,
    total: u32,
    grade: Option<f64>,
) -> String {
    let avail = fmt_int(available.round().max(0.0) as u64);
    let total_s = fmt_int(u64::from(total));
    let Some(r) = rank else {
        return format!(
            "{}: con tu nivel actual no habrías obtenido plaza; sigue practicando y vuelve a \
             simular.",
            meta.label
        );
    };
    let order = format!(
        "{} de {}",
        fmt_int(r.p50 as u64),
        fmt_int(u64::from(meta.aprobados))
    );
    match meta.kind {
        ScenarioKind::Historical if p_plaza < 0.5 => format!(
            "{}: lo más probable es que no hubieras obtenido plaza (probabilidad del {}); si la \
             consiguieras, tendrías el número de orden {order} y quedarían libres unas {avail} \
             de sus {total_s} plazas.",
            meta.label,
            fmt_pct(p_plaza)
        ),
        ScenarioKind::Historical => {
            let grade = grade
                .map(|g| format!(" con un {}", fmt_dec(g, 2)))
                .unwrap_or_default();
            let chance = if p_plaza < 0.95 {
                format!(" (probabilidad de plaza del {})", fmt_pct(p_plaza))
            } else {
                String::new()
            };
            format!(
                "{}: habrías aprobado{grade} con el número de orden {order}{chance}; al elegir \
                 quedaban libres unas {avail} de sus {total_s} plazas.",
                meta.label
            )
        }
        ScenarioKind::Projection => format!(
            "{}: con tu nivel actual tendrías plaza con una probabilidad del {}; si la \
             obtienes, tu número de orden más probable sería el {order} y, trasladado al último \
             reparto, quedarían libres unas {avail} de sus {total_s} plazas.",
            meta.label,
            fmt_pct(p_plaza)
        ),
    }
}

/// Ejecuta el simulador.
pub fn simulate(
    ctx: &PredictionContext,
    dctx: &DestinationContext,
    req: &DestinationRequest<'_>,
) -> DestinationSimulation {
    let sampler = Sampler::new(ctx, req.observed, req.override_ratio);
    let samples: Vec<Sample> = (0..MONTE_CARLO_SAMPLES as u64)
        .map(|k| sampler.sample(k))
        .collect();
    let mut scenarios = Vec::new();
    let mut window = 0u32;

    if let Some(ds) = dctx.latest.as_ref() {
        window = ds.neighbour_window() as u32;
        let mut t = Tally::new(ds);
        for s in &samples {
            let order = sampler.has_plaza(s).then(|| {
                let q = match ctx.plazas {
                    Some(p) => s.rank / f64::from(p),
                    None => 1.0,
                };
                ds.order_index(q)
            });
            t.add(s.all_pass, order, s.all_pass.then_some(s.grade));
        }
        // En la proyección el número de orden se expresa en la convocatoria objetivo.
        let order_scale = ctx
            .plazas
            .map(|p| f64::from(p) / f64::from(ds.total.max(1)))
            .unwrap_or(1.0);
        scenarios.push(finish(
            ScenarioMeta {
                id: "proyeccion".to_string(),
                kind: ScenarioKind::Projection,
                label: ctx.target_label.clone(),
                year: ctx
                    .target_id
                    .rsplit('-')
                    .next()
                    .and_then(|y| y.parse().ok())
                    .unwrap_or(0),
                aprobados: ctx.plazas.unwrap_or(ds.total),
                order_scale,
            },
            t,
            req.preferred_localities,
        ));
    }

    for call in &dctx.calls {
        let mut t = Tally::new(&call.dataset);
        for s in &samples {
            let (passed, order, grade) = call.place(s);
            t.add(passed, order, grade);
        }
        scenarios.push(finish(
            ScenarioMeta {
                id: call.id.clone(),
                kind: ScenarioKind::Historical,
                label: call.label.clone(),
                year: call.year,
                aprobados: call.grades_desc.len() as u32,
                order_scale: 1.0,
            },
            t,
            req.preferred_localities,
        ));
    }

    let latest = dctx
        .latest
        .as_ref()
        .map(|d| d.conv_id.clone())
        .unwrap_or_else(|| "—".to_string());
    let mut assumptions = vec![
        "Los destinos se adjudican según el orden obtenido en el proceso selectivo (art. 26 del \
         RD 364/1995): con el número de orden j se elige entre las plazas que no escogieron los \
         j − 1 anteriores, que son las que eligieron los números de orden ≥ j."
            .to_string(),
        "Datos: relaciones de aprobados (notas) y resoluciones de nombramiento con destino \
         publicadas en el BOE, anonimizadas (solo número de orden y destino)."
            .to_string(),
        format!(
            "«Lo más probable» refleja lo que eligieron las {} personas con número de orden más \
             cercano por cada lado al tuyo; tus preferencias personales pueden cambiarlo.",
            fmt_int(u64::from(window.max(2)))
        ),
        format!(
            "La proyección traslada tu puesto estimado en {} (en proporción a sus plazas) al \
             reparto de destinos de {latest}; la oferta real de destinos cambia en cada \
             convocatoria.",
            ctx.target_id
        ),
        "Las personas del cupo de discapacidad pueden alterar el orden de elección (art. 9 del \
         RD 2271/2004) y hay renuncias: es una estimación orientativa."
            .to_string(),
    ];
    if dctx.access == Access::PromocionInterna {
        assumptions.push(
            "Promoción interna no publica destinos por número de orden: se usan los de ingreso \
             libre como referencia."
                .to_string(),
        );
    }
    let data_quality = if dctx.calls.is_empty() {
        DataQuality::Partial
    } else {
        ctx.data_quality
    };
    DestinationSimulation {
        observed_grade: req.observed_grade,
        target_convocatoria: ctx.target_id.clone(),
        target_label: ctx.target_label.clone(),
        scenarios,
        neighbour_window: window,
        assumptions,
        data_quality,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn categories_group_ministries_by_scope() {
        assert_eq!(
            category_of(Some("AG. ESTATAL DE ADMON. TRIBUTARIA")),
            "Agencia Tributaria"
        );
        assert_eq!(
            category_of(Some("DEPARTAMENTO DE INFORMATICA TRIBUTARIA")),
            "Agencia Tributaria"
        );
        assert_eq!(
            category_of(Some("MINISTERIO DE INCLUS., SEG.SOC.Y MIGRAC")),
            "Seguridad Social, Inclusión y Migraciones"
        );
        assert_eq!(
            category_of(Some("MINISTERIO TRANSF. DIGIT.Y FUNC. PUBLICA")),
            "Transformación Digital y Función Pública"
        );
        assert_eq!(
            category_of(Some("MINISTERIO POL.TERRIT. Y MEM.DEMOCRATICA")),
            "Política Territorial (Delegaciones del Gobierno)"
        );
        assert_eq!(category_of(Some("MINISTERIO DE DEFENSA")), "Defensa");
        assert_eq!(
            category_of(Some("CONSEJO SUP.INVESTIG.CIENTIFICAS - CSIC")),
            "Ciencia, Universidades e Investigación"
        );
        assert_eq!(category_of(None), "Otros organismos");
    }

    #[test]
    fn availability_counts_orders_at_or_after_position() {
        let g = Group {
            name: "X".into(),
            province: "X".into(),
            tier: TierId::Pueblo,
            orders: vec![3, 10, 50],
        };
        assert_eq!(g.available_from(1), 3);
        assert_eq!(g.available_from(10), 2);
        assert_eq!(g.available_from(11), 1);
        assert_eq!(g.available_from(51), 0);
        assert_eq!(g.last_order(), 50);
    }
}
