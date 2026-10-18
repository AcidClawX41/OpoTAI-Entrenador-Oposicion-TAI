// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Corrección oficial de extremo a extremo: reservas que sustituyen anuladas, supuesto
//! elegido, calificación por partes eliminatoria y calculadora.

mod common;

use common::*;
use tai_core::api::{
    CutoffSource, ExamSpec, FeedbackMode, ItemStatus, ManualGradeInput, ManualPartInput,
    SectionKind,
};

fn close(a: f64, b: f64) -> bool {
    (a - b).abs() < 1e-6
}

fn official_spec(include_reserve: bool) -> ExamSpec {
    ExamSpec::Official {
        bank_id: "tai-test-2024".into(),
        include_reserve,
        timed: true,
        feedback: FeedbackMode::End,
        theory_block: None,
    }
}

#[test]
fn reserves_replace_annulled_in_official_replica() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, official_spec(true))
        .expect("examen");
    assert!(paper.requires_case_choice);
    assert_eq!(paper.cases_to_choose, 1);
    assert_eq!(paper.duration_minutes, Some(60));
    // 10 de la 1.ª parte (2 anuladas sustituidas por reservas) + 4 del supuesto elegido.
    assert_eq!(paper.total_questions, 14);
    let p1 = &paper.sections[0];
    assert_eq!(p1.questions.len(), 13);
    assert_eq!(p1.questions[10].display_number, "R1");
    assert!(p1.questions[10].is_reserve);
    assert!(
        p1.questions[10]
            .source_label
            .contains("1.ª parte · reserva n.º 1"),
        "{}",
        p1.questions[10].source_label
    );

    // Todo correcto en la 1.ª parte y en el supuesto III.
    let progress = progress_with(&paper, Some("p2-s1"), |id, _| correct_letter(&engine, id));
    let result = engine.submit_exam(&progress).expect("entrega");
    let part1 = &result.grade.parts[0];
    assert_eq!((part1.counted, part1.correct, part1.annulled), (10, 10, 2));
    let part2 = &result.grade.parts[1];
    assert_eq!((part2.counted, part2.correct, part2.annulled), (4, 4, 1));
    assert!(close(result.grade.total_grade, 100.0));
    assert!(result.grade.passed);
    assert_eq!(result.grade.units[0].cutoff_source, CutoffSource::Official);
    assert!(result.grade.notes.iter().any(|n| n.contains("reserva")));

    let status = |id: &str| {
        result
            .review
            .iter()
            .find(|r| r.question_id == id)
            .map(|r| r.status)
            .expect("pregunta en la revisión")
    };
    assert_eq!(status("tai-test-2024-p1-004"), ItemStatus::Annulled);
    assert_eq!(status("tai-test-2024-p1-007"), ItemStatus::Annulled);
    assert_eq!(status("tai-test-2024-p1-r1"), ItemStatus::Correct);
    assert_eq!(status("tai-test-2024-p1-r2"), ItemStatus::Annulled);
    assert_eq!(status("tai-test-2024-p1-r3"), ItemStatus::Correct);
    assert_eq!(status("tai-test-2024-p2-s1-r1"), ItemStatus::Correct);
    assert_eq!(status("tai-test-2024-p2-s1-r2"), ItemStatus::NotCounted);
    // El supuesto no elegido no cuenta.
    assert_eq!(status("tai-test-2024-p2-s2-001"), ItemStatus::NotCounted);
    assert_eq!(result.chosen_case.as_deref(), Some("p2-s1"));
    // Prediction en exámenes oficiales.
    assert!(result.prediction.is_some());
}

#[test]
fn without_reserves_annulled_questions_just_do_not_count() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, official_spec(false))
        .expect("examen");
    assert_eq!(paper.sections[0].questions.len(), 10);
    let progress = progress_with(&paper, Some("p2-s2"), |id, _| correct_letter(&engine, id));
    let result = engine.submit_exam(&progress).expect("entrega");
    assert_eq!(result.grade.parts[0].counted, 8);
    // N = 8 + 16 = 24 y el corte oficial (30 %) se reescala: 7,2.
    assert!(close(result.grade.units[0].max_direct, 24.0));
    assert!(close(result.grade.units[0].cutoff_direct, 7.2));
}

#[test]
fn case_choice_rules() {
    // Respuestas solo en un supuesto y sin elegir → se corrige ese.
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, official_spec(true))
        .expect("examen");
    let progress = progress_with(&paper, None, |id, kind| {
        (kind == SectionKind::Theory || id.contains("p2-s2"))
            .then(|| correct_letter(&engine, id))
            .flatten()
    });
    let result = engine.submit_exam(&progress).expect("entrega");
    assert_eq!(result.chosen_case.as_deref(), Some("p2-s2"));
    assert!(
        result
            .grade
            .notes
            .iter()
            .any(|n| n.contains("único con respuestas"))
    );
    assert_eq!(result.grade.parts[1].correct, 4);

    // Respuestas en ambos supuestos sin elegir → la 2.ª parte cuenta como en blanco.
    let paper = engine
        .start_exam(&profile, official_spec(true))
        .expect("examen");
    let progress = progress_with(&paper, None, |id, _| correct_letter(&engine, id));
    let result = engine.submit_exam(&progress).expect("entrega");
    assert_eq!(result.chosen_case, None);
    let part2 = &result.grade.parts[1];
    assert_eq!((part2.correct, part2.blank, part2.counted), (0, 4, 4));
    assert!(
        result
            .grade
            .notes
            .iter()
            .any(|n| n.contains("como en el examen real"))
    );
    assert!(
        result
            .review
            .iter()
            .filter(|r| r.part == 2)
            .all(|r| matches!(r.status, ItemStatus::NotCounted | ItemStatus::Annulled))
    );
}

#[test]
fn calculator_acceptance_and_promocion_interna() {
    let (mut engine, _) = engine();
    let result = engine
        .calculate_grade(
            None,
            &ManualGradeInput {
                scheme_id: "tai-li-2024".into(),
                parts: vec![
                    ManualPartInput {
                        part: 1,
                        correct: 60,
                        wrong: 15,
                        blank: 5,
                    },
                    ManualPartInput {
                        part: 2,
                        correct: 14,
                        wrong: 3,
                        blank: 3,
                    },
                ],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora");
    assert!(close(result.grade.parts[0].direct, 55.0));
    assert!(close(result.grade.parts[1].direct, 52.0));
    assert!(close(result.grade.total_grade, 50.0 + 50.0 * 59.0 / 112.0));
    assert_eq!(
        tai_core::util::fmt_dec(result.grade.total_grade, 2),
        "76,34"
    );
    assert!(result.prediction.p_pass >= 0.0 && result.prediction.p_pass <= 1.0);

    let pi = engine
        .calculate_grade(
            None,
            &ManualGradeInput {
                scheme_id: "tai-pi-2024".into(),
                parts: vec![
                    ManualPartInput {
                        part: 1,
                        correct: 40,
                        wrong: 8,
                        blank: 2,
                    },
                    ManualPartInput {
                        part: 2,
                        correct: 8,
                        wrong: 2,
                        blank: 2,
                    },
                ],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora PI");
    assert!(close(pi.grade.units[0].max_direct, 98.0));
    assert!(close(pi.grade.units[0].cutoff_direct, 29.4));
    assert!(close(
        pi.grade.total_grade,
        50.0 + 50.0 * (68.0 - 29.4) / 68.6
    ));
}

#[test]
fn calculator_validates_and_fills_blanks() {
    let (mut engine, _) = engine();
    let too_many = engine.calculate_grade(
        None,
        &ManualGradeInput {
            scheme_id: "tai-li-2024".into(),
            parts: vec![ManualPartInput {
                part: 1,
                correct: 70,
                wrong: 15,
                blank: 0,
            }],
            cutoff_override_ratio: None,
        },
    );
    assert!(too_many.is_err());
    let unknown = engine.calculate_grade(
        None,
        &ManualGradeInput {
            scheme_id: "no-existe".into(),
            parts: vec![],
            cutoff_override_ratio: None,
        },
    );
    assert!(unknown.is_err());

    let partial = engine
        .calculate_grade(
            None,
            &ManualGradeInput {
                scheme_id: "tai-li-2024".into(),
                parts: vec![ManualPartInput {
                    part: 1,
                    correct: 60,
                    wrong: 10,
                    blank: 0,
                }],
                cutoff_override_ratio: Some(0.4),
            },
        )
        .expect("calculadora");
    let p1 = &partial.grade.parts[0];
    assert_eq!(p1.blank, 10);
    assert_eq!(partial.grade.parts[1].blank, 20);
    assert_eq!(partial.grade.units[0].cutoff_source, CutoffSource::User);
    assert!(partial.grade.notes.iter().any(|n| n.contains("en blanco")));
}

#[test]
fn per_part_scheme_is_eliminatory() {
    let (mut engine, _) = engine();
    // Esquema por partes de los fixtures: 1.ª parte con 2 directos de 10 (< 3) → no apto y
    // la 2.ª parte no se corrige aunque esté perfecta.
    let result = engine
        .calculate_grade(
            None,
            &ManualGradeInput {
                scheme_id: "tai-test-partes".into(),
                parts: vec![
                    ManualPartInput {
                        part: 1,
                        correct: 2,
                        wrong: 0,
                        blank: 8,
                    },
                    ManualPartInput {
                        part: 2,
                        correct: 4,
                        wrong: 0,
                        blank: 0,
                    },
                ],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora");
    let units = &result.grade.units;
    assert_eq!(units.len(), 2);
    assert!(!units[0].passed);
    assert!(close(units[0].grade, 25.0 * 2.0 / 3.0));
    assert!(!units[1].passed);
    assert_eq!(units[1].grade, 0.0);
    assert!(close(units[1].direct, 4.0));
    // Se marca como «sin corregir» y se informa de lo que habría sacado (sin sumarlo).
    assert!(!units[0].ungraded && units[0].would_be_grade.is_none());
    assert!(units[1].ungraded);
    assert!(close(units[1].would_be_grade.expect("orientativa"), 50.0));
    assert!(!result.grade.passed);
    assert!(
        result
            .grade
            .notes
            .iter()
            .any(|n| n.contains("no se corrige"))
    );

    // Con la 1.ª parte superada, cada parte se transforma por separado (0–50).
    let ok = engine
        .calculate_grade(
            None,
            &ManualGradeInput {
                scheme_id: "tai-test-partes".into(),
                parts: vec![
                    ManualPartInput {
                        part: 1,
                        correct: 8,
                        wrong: 0,
                        blank: 2,
                    },
                    ManualPartInput {
                        part: 2,
                        correct: 4,
                        wrong: 0,
                        blank: 0,
                    },
                ],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora");
    assert!(ok.grade.units[0].passed);
    assert!(close(ok.grade.units[1].grade, 50.0));
    assert!(close(ok.grade.max_grade, 100.0));
}
