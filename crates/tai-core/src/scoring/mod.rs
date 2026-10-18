// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Corrección oficial (ver `docs/CONTRATO-DATOS.md` §2 y `docs/CONTRATO-API.md`).
//!
//! Para cada parte `p` con `A` aciertos y `E` errores contabilizados:
//!
//! ```text
//! directa_p = value_p · A − value_p · E / penalty_divisor_p
//! ```
//!
//! Para cada unidad de calificación `u` (una o varias partes):
//!
//! ```text
//! D = Σ directa_p      N = Σ value_p · preguntas_contabilizadas_p      M = corte · N
//! D ≥ M      → nota = pass + (max − pass) · (D − M) / (N − M)   (APTO)
//! 0 ≤ D < M  → nota = pass · D / M                             (NO APTO, orientativa)
//! D < 0      → nota = 0
//! ```
//!
//! El corte `M` se elige así: corte personalizado del usuario (`user`) → corte oficial del
//! esquema o de la convocatoria, reescalado a la `N` del examen (`official`) → estimación
//! de la convocatoria objetivo (`estimated`) → mínimo reglamentario (`floor`). En todos los
//! casos `M ≥ min_direct_ratio · N`.
//!
//! **Calificación por partes** (varias unidades, p. ej. TAI-LI 2025: cada parte 0–50 con
//! mínimo 25): las partes son eliminatorias, como en el examen real. Si no se supera una
//! unidad, las siguientes no se corrigen (calificación 0, no apto) y se añade una nota.
//! Con `pass = E/2` y `max = E` la fórmula anterior coincide con la transformación por tramos
//! de la CPS: `d < M → (E/2)·d/M`; `d ≥ M → (E/2)·(1 + (d−M)/(N−M))`.

mod derived;

pub use derived::practice_scheme;

use crate::api::{CutoffSource, GradeResult, PartScore, UnitGrade};
use crate::model::{GradingUnit, ScoringPart, ScoringScheme};
use crate::util::{EPS, fmt_dec, fmt_pct};

/// Recuento de una parte tras evaluar las respuestas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub struct PartCounts {
    pub part: u32,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    /// Anuladas en las secciones que puntúan (informativo: no se contabilizan).
    pub annulled: u32,
}

impl PartCounts {
    /// Recuento vacío de una parte.
    pub fn new(part: u32) -> Self {
        Self {
            part,
            ..Self::default()
        }
    }

    /// Preguntas contabilizadas.
    pub fn counted(&self) -> u32 {
        self.correct + self.wrong + self.blank
    }
}

/// Entradas para elegir el corte de cada unidad.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct CutoffInputs {
    /// Corte personalizado del usuario (ratio 0–1), común a todas las unidades.
    pub override_ratio: Option<f64>,
    /// Corte oficial publicado por la convocatoria (ratio) por unidad, si el esquema no lo trae.
    pub official_ratios: Vec<Option<f64>>,
    /// Corte estimado (ratio) por unidad para la convocatoria objetivo.
    pub estimated_ratios: Vec<Option<f64>>,
    /// Descripción del origen de la estimación (se muestra en las notas).
    pub estimate_label: Option<String>,
}

/// Corte resuelto de una unidad.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct ResolvedCutoff {
    pub ratio: f64,
    pub source: CutoffSource,
    /// El usuario pidió un corte inferior al mínimo reglamentario.
    pub user_clamped: bool,
}

/// Número con hasta 2 decimales y sin ceros sobrantes: `48` → "48", `29.4` → "29,4".
pub fn fmt_points(x: f64) -> String {
    let s = fmt_dec(x, 2);
    if s.contains(',') {
        s.trim_end_matches('0').trim_end_matches(',').to_string()
    } else {
        s
    }
}

/// Puntuación de una parte.
pub fn part_score(part: &ScoringPart, counts: &PartCounts) -> PartScore {
    let penalty_points = part.penalty_per_error() * f64::from(counts.wrong);
    let direct = part.value * f64::from(counts.correct) - penalty_points;
    PartScore {
        part: part.part,
        title: part.title.clone(),
        counted: counts.counted(),
        correct: counts.correct,
        wrong: counts.wrong,
        blank: counts.blank,
        annulled: counts.annulled,
        value: part.value,
        penalty_divisor: part.penalty_divisor,
        penalty_points,
        direct,
        max_direct: part.value * f64::from(counts.counted()),
    }
}

/// Transformación oficial de la directa `d` (sobre `n`, corte `m`) a la escala `pass`–`max`.
///
/// Devuelve la calificación y si se supera el corte.
pub fn transform(d: f64, n: f64, m: f64, pass: f64, max: f64) -> (f64, bool) {
    if n <= EPS {
        return (0.0, false);
    }
    if d + EPS >= m {
        let span = n - m;
        let grade = if span <= EPS {
            max
        } else {
            pass + (max - pass) * (d - m) / span
        };
        (grade.clamp(pass.min(max), max), true)
    } else if d <= 0.0 {
        (0.0, false)
    } else {
        let grade = if m <= EPS { 0.0 } else { pass * d / m };
        (grade.clamp(0.0, pass), false)
    }
}

/// Corte oficial de una unidad como ratio de su directa máxima nominal.
pub fn unit_official_ratio(scheme: &ScoringScheme, unit: &GradingUnit) -> Option<f64> {
    let nominal = scheme.nominal_max_direct(unit);
    unit.cutoff_direct
        .filter(|_| nominal > EPS)
        .map(|c| (c / nominal).clamp(0.0, 1.0))
}

/// Elige el corte de la unidad `index` (ver la cabecera del módulo).
pub fn resolve_cutoff(
    scheme: &ScoringScheme,
    index: usize,
    inputs: &CutoffInputs,
) -> ResolvedCutoff {
    let Some(unit) = scheme.grading.units.get(index) else {
        return ResolvedCutoff {
            ratio: 0.0,
            source: CutoffSource::Floor,
            user_clamped: false,
        };
    };
    let floor = unit.min_direct_ratio.clamp(0.0, 1.0);
    let official = unit_official_ratio(scheme, unit)
        .or_else(|| inputs.official_ratios.get(index).copied().flatten());
    let estimated = inputs.estimated_ratios.get(index).copied().flatten();
    let (ratio, source) = if let Some(r) = inputs.override_ratio {
        (r.clamp(0.0, 1.0), CutoffSource::User)
    } else if let Some(r) = official {
        (r, CutoffSource::Official)
    } else if let Some(r) = estimated {
        (r.clamp(0.0, 1.0), CutoffSource::Estimated)
    } else {
        (floor, CutoffSource::Floor)
    };
    if ratio + EPS < floor {
        ResolvedCutoff {
            ratio: floor,
            source: CutoffSource::Floor,
            user_clamped: source == CutoffSource::User,
        }
    } else {
        ResolvedCutoff {
            ratio,
            source,
            user_clamped: false,
        }
    }
}

fn parts_label(parts: &[u32]) -> String {
    let names: Vec<String> = parts.iter().map(|p| format!("{p}.ª parte")).collect();
    names.join(" + ")
}

/// Califica un examen con el esquema dado.
///
/// `counts` trae el recuento de cada parte; las partes del esquema que no aparezcan se
/// consideran vacías (0 preguntas contabilizadas). `notes` se copian al resultado y se
/// completan con las explicaciones de los cortes aplicados.
pub fn grade(
    scheme: &ScoringScheme,
    counts: &[PartCounts],
    inputs: &CutoffInputs,
    mut notes: Vec<String>,
) -> GradeResult {
    let parts: Vec<PartScore> = scheme
        .parts
        .iter()
        .map(|sp| {
            let c = counts
                .iter()
                .find(|c| c.part == sp.part)
                .copied()
                .unwrap_or_else(|| PartCounts::new(sp.part));
            part_score(sp, &c)
        })
        .collect();

    let mut units = Vec::with_capacity(scheme.grading.units.len());
    let multi = scheme.grading.units.len() > 1;
    let mut eliminated_by: Option<Vec<u32>> = None;
    for (index, unit) in scheme.grading.units.iter().enumerate() {
        let in_unit = |p: &&PartScore| unit.parts.contains(&p.part);
        let direct: f64 = parts.iter().filter(in_unit).map(|p| p.direct).sum();
        let max_direct: f64 = parts.iter().filter(in_unit).map(|p| p.max_direct).sum();
        let cutoff = resolve_cutoff(scheme, index, inputs);
        let cutoff_direct = cutoff.ratio * max_direct;
        let (mut grade, mut passed) = transform(
            direct,
            max_direct,
            cutoff_direct,
            unit.pass_grade,
            unit.max_grade,
        );
        let mut ungraded = false;
        let mut would_be_grade = None;
        if let Some(failed) = &eliminated_by {
            // Partes eliminatorias: esta no se corrige.
            notes.push(format!(
                "La {} no se corrige porque no se ha superado la {} (como en el examen real).",
                parts_label(&unit.parts),
                parts_label(failed)
            ));
            would_be_grade = Some(grade);
            ungraded = true;
            grade = 0.0;
            passed = false;
        } else if multi && !passed {
            eliminated_by = Some(unit.parts.clone());
        }
        let label = if multi {
            format!(" ({})", parts_label(&unit.parts))
        } else {
            String::new()
        };
        if cutoff.user_clamped {
            notes.push(format!(
                "Tu corte personalizado es inferior al mínimo reglamentario; se aplica el {}{label}.",
                fmt_pct(cutoff.ratio)
            ));
        }
        match cutoff.source {
            CutoffSource::Estimated => notes.push(format!(
                "Corte estimado{label}: {} puntos directos de {} ({}){}.",
                fmt_points(cutoff_direct),
                fmt_points(max_direct),
                fmt_pct(cutoff.ratio),
                inputs
                    .estimate_label
                    .as_deref()
                    .map(|l| format!(", {l}"))
                    .unwrap_or_default()
            )),
            CutoffSource::Floor if !cutoff.user_clamped => notes.push(format!(
                "Sin corte oficial publicado{label}: se aplica el mínimo reglamentario ({} de la directa máxima).",
                fmt_pct(cutoff.ratio)
            )),
            _ => {}
        }
        units.push(UnitGrade {
            parts: unit.parts.clone(),
            direct,
            max_direct,
            cutoff_direct,
            cutoff_source: cutoff.source,
            grade,
            pass_grade: unit.pass_grade,
            max_grade: unit.max_grade,
            passed,
            margin_direct: direct - cutoff_direct,
            ungraded,
            would_be_grade,
        });
    }

    let total_grade = units.iter().map(|u| u.grade).sum();
    let max_grade = units.iter().map(|u| u.max_grade).sum();
    let passed = !units.is_empty() && units.iter().all(|u| u.passed);
    GradeResult {
        scheme_id: scheme.id.clone(),
        parts,
        units,
        total_grade,
        max_grade,
        passed,
        notes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::defaults::{scheme_li_2024, scheme_li_2025, scheme_pi_2024};

    fn counts(part: u32, correct: u32, wrong: u32, blank: u32) -> PartCounts {
        PartCounts {
            part,
            correct,
            wrong,
            blank,
            annulled: 0,
        }
    }

    fn close(a: f64, b: f64) -> bool {
        (a - b).abs() < 1e-6
    }

    #[test]
    fn acceptance_case_li_2024() {
        // 1.ª parte: 60 A, 15 E, 5 B → 55; 2.ª parte: 14 A, 3 E, 3 B → 52; D = 107.
        let scheme = scheme_li_2024();
        let result = grade(
            &scheme,
            &[counts(1, 60, 15, 5), counts(2, 14, 3, 3)],
            &CutoffInputs::default(),
            Vec::new(),
        );
        assert!(close(result.parts[0].direct, 55.0));
        assert!(close(result.parts[0].penalty_points, 5.0));
        assert!(close(result.parts[1].direct, 52.0));
        assert!(close(result.parts[1].max_direct, 80.0));
        let unit = &result.units[0];
        assert!(close(unit.direct, 107.0));
        assert!(close(unit.max_direct, 160.0));
        assert!(close(unit.cutoff_direct, 48.0));
        assert_eq!(unit.cutoff_source, CutoffSource::Official);
        assert!(unit.passed && result.passed);
        // 50 + 50 · (107 − 48) / (160 − 48) = 76,339…
        assert!(close(result.total_grade, 50.0 + 50.0 * 59.0 / 112.0));
        assert_eq!(fmt_dec(result.total_grade, 2), "76,34");
        assert!(close(unit.margin_direct, 59.0));
    }

    #[test]
    fn promocion_interna_2024_penalty_quarter() {
        let scheme = scheme_pi_2024();
        // 1.ª: 40 A, 8 E → 40 − 2 = 38; 2.ª: 8 A, 2 E (valor 4, −1 por error) → 32 − 2 = 30.
        let result = grade(
            &scheme,
            &[counts(1, 40, 8, 2), counts(2, 8, 2, 2)],
            &CutoffInputs::default(),
            Vec::new(),
        );
        assert!(close(result.parts[0].direct, 38.0));
        assert!(close(result.parts[1].direct, 30.0));
        let unit = &result.units[0];
        assert!(close(unit.max_direct, 98.0));
        assert!(close(unit.cutoff_direct, 29.4));
        assert!(close(
            result.total_grade,
            50.0 + 50.0 * (68.0 - 29.4) / (98.0 - 29.4)
        ));
        // Por debajo del corte la nota es proporcional.
        let fail = grade(
            &scheme,
            &[counts(1, 20, 0, 30), counts(2, 0, 0, 12)],
            &CutoffInputs::default(),
            Vec::new(),
        );
        assert!(!fail.passed);
        assert!(close(fail.total_grade, 50.0 * 20.0 / 29.4));
    }

    #[test]
    fn negative_direct_scores_zero() {
        let (g, passed) = transform(-3.0, 160.0, 48.0, 50.0, 100.0);
        assert_eq!(g, 0.0);
        assert!(!passed);
        let (g, passed) = transform(160.0, 160.0, 48.0, 50.0, 100.0);
        assert!(close(g, 100.0) && passed);
        let (g, passed) = transform(48.0, 160.0, 48.0, 50.0, 100.0);
        assert!(close(g, 50.0) && passed);
        let (g, _) = transform(0.0, 0.0, 0.0, 50.0, 100.0);
        assert_eq!(g, 0.0);
    }

    #[test]
    fn per_part_units_each_need_the_cutoff() {
        let scheme = scheme_li_2025();
        // Sin corte oficial ni estimación → suelo del 30 % por parte.
        let result = grade(
            &scheme,
            &[counts(1, 60, 15, 5), counts(2, 5, 9, 6)],
            &CutoffInputs::default(),
            Vec::new(),
        );
        assert_eq!(result.units.len(), 2);
        let u1 = &result.units[0];
        assert_eq!(u1.cutoff_source, CutoffSource::Floor);
        assert!(close(u1.cutoff_direct, 24.0));
        assert!(u1.passed);
        assert!(close(u1.grade, 25.0 + 25.0 * (55.0 - 24.0) / (80.0 - 24.0)));
        // 2.ª parte: 5 − 3 = 2 directos < 6 → no apto.
        let u2 = &result.units[1];
        assert!(close(u2.direct, 2.0));
        assert!(close(u2.cutoff_direct, 6.0));
        assert!(!u2.passed);
        assert!(!result.passed);
        assert!(close(result.max_grade, 100.0));
    }

    #[test]
    fn user_override_and_floor() {
        let scheme = scheme_li_2024();
        let c = [counts(1, 60, 15, 5), counts(2, 14, 3, 3)];
        let inputs = CutoffInputs {
            override_ratio: Some(0.5),
            ..CutoffInputs::default()
        };
        let r = grade(&scheme, &c, &inputs, Vec::new());
        assert_eq!(r.units[0].cutoff_source, CutoffSource::User);
        assert!(close(r.units[0].cutoff_direct, 80.0));
        // Por debajo del suelo se aplica el mínimo y se avisa.
        let inputs = CutoffInputs {
            override_ratio: Some(0.1),
            ..CutoffInputs::default()
        };
        let r = grade(&scheme, &c, &inputs, Vec::new());
        assert_eq!(r.units[0].cutoff_source, CutoffSource::Floor);
        assert!(close(r.units[0].cutoff_direct, 48.0));
        assert!(r.notes.iter().any(|n| n.contains("personalizado")));
    }

    #[test]
    fn estimated_cutoff_scales_to_exam_size() {
        let scheme = scheme_li_2025();
        let inputs = CutoffInputs {
            estimated_ratios: vec![Some(0.45), Some(0.40)],
            estimate_label: Some("a partir de li-2024".into()),
            ..CutoffInputs::default()
        };
        // Simulacro corto: 40 preguntas en la 1.ª parte.
        let r = grade(&scheme, &[counts(1, 30, 6, 4)], &inputs, Vec::new());
        assert_eq!(r.units[0].cutoff_source, CutoffSource::Estimated);
        assert!(close(r.units[0].cutoff_direct, 18.0));
        assert!(r.notes.iter().any(|n| n.contains("Corte estimado")));
    }

    #[test]
    fn official_cutoff_rescales_with_counted_questions() {
        // Si una anulada no tiene reserva, N baja y el corte se reescala (M = 0,3 · N).
        let scheme = scheme_li_2024();
        let r = grade(
            &scheme,
            &[counts(1, 60, 15, 4), counts(2, 14, 3, 3)],
            &CutoffInputs::default(),
            Vec::new(),
        );
        assert!(close(r.units[0].max_direct, 159.0));
        assert!(close(r.units[0].cutoff_direct, 0.3 * 159.0));
    }

    #[test]
    fn points_format() {
        assert_eq!(fmt_points(48.0), "48");
        assert_eq!(fmt_points(29.4), "29,4");
        assert_eq!(fmt_points(52.666_666), "52,67");
    }
}
