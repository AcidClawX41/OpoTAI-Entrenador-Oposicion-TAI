// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Esquema derivado para práctica, repaso y supuestos sueltos.
//!
//! Mismo valor y penalización que la parte equivalente del esquema base (el del examen de origen
//! en un supuesto suelto; el esquema por defecto en práctica y repaso) y una única unidad 0–10
//! con aprobado en 5 y corte en el 50 % de la directa máxima («nota sobre 10 con penalización»).

use crate::model::{Grading, GradingUnit, ScoringPart, ScoringScheme, SectionKind};

/// Construye el esquema de práctica para las partes presentes en el examen.
///
/// `parts` = (número de parte, tipo, preguntas de esa parte en el examen).
pub fn practice_scheme(base: &ScoringScheme, parts: &[(u32, SectionKind, u32)]) -> ScoringScheme {
    let mut scheme_parts = Vec::new();
    for &(part, kind, questions) in parts {
        if questions == 0 {
            continue;
        }
        let reference = base
            .part(part)
            .or_else(|| base.parts.iter().find(|p| p.kind == kind));
        let (title, value, penalty_divisor) = match reference {
            Some(r) => (r.title.clone(), r.value, r.penalty_divisor),
            None => (
                match kind {
                    SectionKind::Theory => "Cuestionario".to_string(),
                    SectionKind::Case => "Supuesto práctico".to_string(),
                },
                1.0,
                Some(3.0),
            ),
        };
        scheme_parts.push(ScoringPart {
            part,
            title,
            kind,
            questions,
            reserve: 0,
            value,
            penalty_divisor,
            cases_offered: None,
            cases_to_choose: None,
        });
    }
    scheme_parts.sort_by_key(|p| p.part);
    let unit_parts: Vec<u32> = scheme_parts.iter().map(|p| p.part).collect();
    let nominal: f64 = scheme_parts
        .iter()
        .map(ScoringPart::nominal_max_direct)
        .sum();
    ScoringScheme {
        id: "practica".to_string(),
        title: "Práctica · nota sobre 10 con penalización".to_string(),
        access: base.access,
        convocatoria: None,
        sources: Vec::new(),
        duration_minutes: base.duration_minutes,
        parts: scheme_parts,
        grading: Grading {
            units: vec![GradingUnit {
                parts: unit_parts,
                max_grade: 10.0,
                pass_grade: 5.0,
                min_direct_ratio: 0.5,
                cutoff_direct: Some(0.5 * nominal),
                cutoff_note: Some(
                    "Práctica: aprobado con el 50 % de la puntuación directa máxima".to_string(),
                ),
            }],
        },
        notes: Some(format!(
            "Esquema derivado de «{}» para tests de práctica.",
            base.title
        )),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::defaults::scheme_li_2024;
    use crate::scoring::{CutoffInputs, PartCounts, grade};

    #[test]
    fn practice_grade_out_of_ten() {
        let scheme = practice_scheme(&scheme_li_2024(), &[(1, SectionKind::Theory, 20)]);
        assert_eq!(scheme.parts.len(), 1);
        assert_eq!(scheme.grading.units[0].cutoff_direct, Some(10.0));
        // 16 aciertos, 3 errores, 1 blanco → 15 directos de 20; corte 10 → 5 + 5·5/10 = 7,5.
        let r = grade(
            &scheme,
            &[PartCounts {
                part: 1,
                correct: 16,
                wrong: 3,
                blank: 1,
                annulled: 0,
            }],
            &CutoffInputs::default(),
            Vec::new(),
        );
        assert!((r.total_grade - 7.5).abs() < 1e-9);
        assert!(r.passed);
        assert_eq!(r.max_grade, 10.0);
    }

    #[test]
    fn case_questions_keep_their_value() {
        let scheme = practice_scheme(
            &scheme_li_2024(),
            &[(1, SectionKind::Theory, 10), (2, SectionKind::Case, 5)],
        );
        assert_eq!(scheme.part(2).map(|p| p.value), Some(4.0));
        assert_eq!(scheme.grading.units[0].parts, vec![1, 2]);
        assert_eq!(scheme.grading.units[0].cutoff_direct, Some(15.0));
    }
}
