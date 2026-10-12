// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Generador de exámenes: semillas, duplicados, estratificación, supuestos, numerados,
//! reservas en todas las bolsas, filtros de práctica, repaso e imágenes.

mod common;

use std::collections::{BTreeMap, HashSet};

use common::*;
use tai_core::api::{BlockId, ExamMode, ExamSpec, FeedbackMode, QuestionSource, SectionKind};

fn simulacro(n: u32, include_case: bool, seed: Option<u64>) -> ExamSpec {
    ExamSpec::Simulacro {
        scheme_id: None,
        part1_questions: Some(n),
        include_case,
        duration_minutes: None,
        prefer_unseen: false,
        seed,
        feedback: FeedbackMode::End,
        freestyle: false,
    }
}

fn practice(
    blocks: Vec<BlockId>,
    topics: Vec<&str>,
    bank_ids: Vec<&str>,
    source: QuestionSource,
    count: u32,
) -> ExamSpec {
    ExamSpec::Practice {
        blocks,
        topics: topics.into_iter().map(str::to_string).collect(),
        bank_ids: bank_ids.into_iter().map(str::to_string).collect(),
        include_cases: false,
        source,
        count,
        feedback: FeedbackMode::Immediate,
        duration_minutes: None,
        seed: Some(7),
    }
}

#[test]
fn simulacro_is_deterministic_with_seed_and_has_no_duplicates() {
    let (mut engine, _, profile) = engine_with_profile();
    let a = engine
        .start_exam(&profile, simulacro(12, true, Some(42)))
        .expect("simulacro");
    let b = engine
        .start_exam(&profile, simulacro(12, true, Some(42)))
        .expect("simulacro");
    assert_eq!(question_ids(&a), question_ids(&b));
    assert_eq!(a.sections[0].questions.len(), 12);
    let differs = (1..6u64).any(|seed| {
        let c = engine
            .start_exam(&profile, simulacro(12, true, Some(seed * 1000)))
            .expect("simulacro");
        question_ids(&c) != question_ids(&a)
    });
    assert!(
        differs,
        "semillas distintas deberían dar exámenes distintos"
    );

    // Pedimos más preguntas de las que hay: sin repetidas ni duplicados de contenido.
    let all = engine
        .start_exam(&profile, simulacro(500, false, Some(1)))
        .expect("simulacro");
    let ids = question_ids(&all);
    let unique: HashSet<&String> = ids.iter().collect();
    assert_eq!(unique.len(), ids.len());
    assert!(
        !(ids.contains(&"tai-test-2024-p1-001".to_string())
            && ids.contains(&"practica-test-p1-dup".to_string())),
        "la copia exacta de una pregunta oficial no puede salir junto al original"
    );
    // Nunca anuladas.
    assert!(
        !ids.iter()
            .any(|id| id == "tai-test-2024-p1-004" || id == "tai-test-2024-p1-r2")
    );
    // Sin supuesto: el esquema se limita a la 1.ª parte.
    assert!(all.sections.iter().all(|s| s.kind == SectionKind::Theory));
    assert_eq!(all.scheme.parts.len(), 1);
    assert_eq!(all.scheme.grading.units[0].parts, vec![1]);
    // Las respuestas nunca viajan en el examen.
    let json = serde_json::to_string(&all).expect("json");
    assert!(!json.contains("\"answer\"") && !json.contains("explanation"));
}

#[test]
fn simulacro_is_stratified_by_block() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, simulacro(10, false, Some(3)))
        .expect("simulacro");
    let mut by_block: BTreeMap<Option<BlockId>, usize> = BTreeMap::new();
    for q in &paper.sections[0].questions {
        *by_block.entry(q.block).or_default() += 1;
    }
    // Reparto del examen oficial más reciente con temas: I 30 %, II 20 %, III 20 %, IV 30 %.
    assert_eq!(by_block.get(&Some(BlockId::I)), Some(&3));
    assert_eq!(by_block.get(&Some(BlockId::II)), Some(&2));
    assert_eq!(by_block.get(&Some(BlockId::III)), Some(&2));
    assert_eq!(by_block.get(&Some(BlockId::IV)), Some(&3));
    // Ordenadas por bloque.
    let ranks: Vec<_> = paper.sections[0]
        .questions
        .iter()
        .map(|q| q.block)
        .collect();
    let mut sorted = ranks.clone();
    sorted.sort();
    assert_eq!(ranks, sorted);
}

#[test]
fn simulacro_offers_cases_from_blocks_iii_and_iv() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, simulacro(10, true, Some(9)))
        .expect("simulacro");
    let cases: Vec<_> = paper
        .sections
        .iter()
        .filter(|s| s.kind == SectionKind::Case)
        .collect();
    assert_eq!(cases.len(), 2);
    assert!(paper.requires_case_choice);
    assert_eq!(paper.cases_to_choose, 1);
    assert_eq!(cases[0].block, Some(BlockId::III));
    assert_eq!(cases[1].block, Some(BlockId::IV));
    assert!(cases[0].id.starts_with("p2-"));
    // Supuesto III oficial: la anulada se sustituye por su reserva para mantener 4 preguntas.
    let ids: Vec<&str> = cases[0].questions.iter().map(|q| q.id.as_str()).collect();
    assert_eq!(ids.len(), 4);
    assert!(ids.contains(&"tai-test-2024-p2-s1-r1"));
    assert!(!ids.contains(&"tai-test-2024-p2-s1-002"));
    assert!(cases[0].statement.as_deref().is_some_and(|s| !s.is_empty()));
    assert_eq!(paper.mode, ExamMode::Simulacro);
    assert_eq!(paper.total_questions, 14);
}

#[test]
fn numbered_simulacros_are_fixed_and_rotate_cases() {
    let (mut engine, _, profile) = engine_with_profile();
    let numbered = |engine: &mut tai_core::Engine, number: u32| {
        engine
            .start_exam(
                &profile,
                ExamSpec::Numbered {
                    number,
                    feedback: FeedbackMode::End,
                    timed: true,
                },
            )
            .expect("numerado")
    };
    let a = numbered(&mut engine, 1);
    let b = numbered(&mut engine, 1);
    assert_eq!(question_ids(&a), question_ids(&b));
    assert_eq!(a.title, "Simulacro OpoTAI n.º 1");
    assert_eq!(a.mode, ExamMode::Simulacro);
    assert_eq!(a.sections[0].questions.len(), 10);
    // Composición fija con independencia del historial del perfil (`b` es el intento en curso:
    // al empezar `b` se abandonó `a`).
    let progress = progress_with(&b, None, |id, _| correct_letter(&engine, id));
    engine.submit_exam(&progress).expect("entrega");
    assert!(
        engine
            .submit_exam(&progress_with(&a, None, |_, _| None))
            .is_err()
    );
    assert_eq!(question_ids(&numbered(&mut engine, 1)), question_ids(&a));

    let case_ids = |p: &tai_core::api::ExamPaper| -> Vec<String> {
        p.sections
            .iter()
            .filter(|s| s.kind == SectionKind::Case)
            .map(|s| s.id.clone())
            .collect()
    };
    let mut previous = case_ids(&a);
    for number in 2..=6 {
        let paper = numbered(&mut engine, number);
        let ids = question_ids(&paper);
        let unique: HashSet<&String> = ids.iter().collect();
        assert_eq!(unique.len(), ids.len(), "sin repetidas en el n.º {number}");
        let cases = case_ids(&paper);
        assert_eq!(cases.len(), 2);
        // Solo entran supuestos del tamaño del esquema (aquí, los dos de 2024): la nota manda sobre
        // la variedad. La rotación se comprueba con los datos reales (`real_data.rs`).
        assert_eq!(cases, previous, "n.º {number}");
        previous = cases;
    }
    assert!(
        engine
            .start_exam(
                &profile,
                ExamSpec::Numbered {
                    number: 31,
                    feedback: FeedbackMode::End,
                    timed: true,
                },
            )
            .is_err()
    );
}

#[test]
fn reserve_questions_are_in_every_pool() {
    let (mut engine, _, profile) = engine_with_profile();
    // Práctica: las reservas no anuladas del banco oficial salen como preguntas normales.
    let paper = engine
        .start_exam(
            &profile,
            practice(
                vec![],
                vec![],
                vec!["tai-test-2024"],
                QuestionSource::All,
                500,
            ),
        )
        .expect("práctica");
    let ids = question_ids(&paper);
    assert!(ids.contains(&"tai-test-2024-p1-r1".to_string()));
    assert!(ids.contains(&"tai-test-2024-p1-r3".to_string()));
    assert!(!ids.contains(&"tai-test-2024-p1-r2".to_string()), "anulada");
    let reserve = paper
        .sections
        .iter()
        .flat_map(|s| s.questions.iter())
        .find(|q| q.id == "tai-test-2024-p1-r1")
        .expect("reserva");
    assert!(
        !reserve.is_reserve,
        "en práctica actúa como pregunta normal"
    );
    assert!(
        reserve.source_label.contains("reserva n.º 1"),
        "{}",
        reserve.source_label
    );

    // Simulacros numerados: alguna reserva aparece en los 30.
    let any_numbered = (1..=30).any(|number| {
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Numbered {
                    number,
                    feedback: FeedbackMode::End,
                    timed: true,
                },
            )
            .expect("numerado");
        question_ids(&paper)
            .iter()
            .any(|id| id == "tai-test-2024-p1-r1" || id == "tai-test-2024-p1-r3")
    });
    assert!(any_numbered);
}

#[test]
fn practice_filters_and_sources() {
    let (mut engine, _, profile) = engine_with_profile();
    let iv = engine
        .start_exam(
            &profile,
            practice(vec![BlockId::IV], vec![], vec![], QuestionSource::All, 500),
        )
        .expect("bloque IV");
    assert!(
        iv.sections
            .iter()
            .flat_map(|s| &s.questions)
            .all(|q| q.block == Some(BlockId::IV))
    );
    assert_eq!(iv.mode, ExamMode::Practice);
    assert_eq!(iv.scheme.grading.units[0].max_grade, 10.0);
    assert!(!iv.requires_case_choice);

    let topic = engine
        .start_exam(
            &profile,
            practice(vec![], vec!["I.2"], vec![], QuestionSource::All, 3),
        )
        .expect("tema");
    assert_eq!(topic.sections[0].questions.len(), 3);
    assert!(
        topic.sections[0]
            .questions
            .iter()
            .all(|q| q.topic.as_deref() == Some("I.2"))
    );

    // Unión de bloques y temas.
    let union = engine
        .start_exam(
            &profile,
            practice(
                vec![BlockId::II],
                vec!["I.2"],
                vec![],
                QuestionSource::All,
                500,
            ),
        )
        .expect("unión");
    assert!(
        union.sections[0]
            .questions
            .iter()
            .all(|q| q.block == Some(BlockId::II) || q.topic.as_deref() == Some("I.2"))
    );

    // Falladas y marcadas: tras un test con todo mal y todo marcado.
    let paper = engine
        .start_exam(
            &profile,
            practice(vec![], vec!["II.1"], vec![], QuestionSource::All, 500),
        )
        .expect("tema II.1");
    let mut progress = progress_with(&paper, None, |id, _| Some(wrong_letter(&engine, id)));
    for a in &mut progress.answers {
        a.flagged = true;
    }
    engine.submit_exam(&progress).expect("entrega");
    let failed = engine
        .start_exam(
            &profile,
            practice(vec![], vec![], vec![], QuestionSource::Failed, 500),
        )
        .expect("falladas");
    let failed_ids: HashSet<String> = question_ids(&failed).into_iter().collect();
    let seen: HashSet<String> = question_ids(&paper).into_iter().collect();
    assert_eq!(failed_ids, seen);
    let flagged = engine
        .start_exam(
            &profile,
            practice(vec![], vec![], vec![], QuestionSource::Flagged, 500),
        )
        .expect("marcadas");
    assert_eq!(question_ids(&flagged).len(), seen.len());
    let unseen = engine
        .start_exam(
            &profile,
            practice(vec![], vec![], vec![], QuestionSource::Unseen, 500),
        )
        .expect("no vistas");
    assert!(question_ids(&unseen).iter().all(|id| !seen.contains(id)));

    // Sin preguntas que cumplan el filtro → error claro.
    assert!(
        engine
            .start_exam(
                &profile,
                practice(vec![], vec!["IV.9"], vec![], QuestionSource::All, 5)
            )
            .is_err()
    );
    assert!(
        engine
            .start_exam(
                &profile,
                practice(vec![], vec![], vec!["no-existe"], QuestionSource::All, 5)
            )
            .is_err()
    );
}

#[test]
fn practice_with_cases_groups_case_questions_with_statement() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(
            &profile,
            ExamSpec::Practice {
                blocks: vec![],
                topics: vec![],
                bank_ids: vec!["practica-test".into()],
                include_cases: true,
                source: QuestionSource::All,
                count: 500,
                feedback: FeedbackMode::End,
                duration_minutes: Some(0),
                seed: Some(5),
            },
        )
        .expect("práctica con supuestos");
    let case = paper
        .sections
        .iter()
        .find(|s| s.kind == SectionKind::Case)
        .expect("sección de supuesto");
    assert_eq!(case.questions.len(), 3);
    assert_eq!(case.statement.as_deref(), Some("Supuesto de práctica."));
    assert_eq!(paper.duration_minutes, None);
    // Numeración correlativa en todo el test.
    let numbers: Vec<String> = paper
        .sections
        .iter()
        .flat_map(|s| s.questions.iter().map(|q| q.display_number.clone()))
        .collect();
    let expected: Vec<String> = (1..=numbers.len()).map(|n| n.to_string()).collect();
    assert_eq!(numbers, expected);
    // Las desactualizadas van al final (solo si faltan).
    assert!(paper.scheme.parts.iter().any(|p| p.part == 2));
}

#[test]
fn review_mode_uses_spaced_repetition_queue() {
    let (mut engine, clock, profile) = engine_with_profile();
    assert!(
        engine
            .start_exam(
                &profile,
                ExamSpec::Review {
                    count: 10,
                    feedback: FeedbackMode::End
                }
            )
            .is_err()
    );
    let paper = engine
        .start_exam(
            &profile,
            practice(vec![], vec!["III.2"], vec![], QuestionSource::All, 500),
        )
        .expect("práctica");
    let failed: Vec<String> = question_ids(&paper);
    let progress = progress_with(&paper, None, |id, _| Some(wrong_letter(&engine, id)));
    engine.submit_exam(&progress).expect("entrega");

    let summary = engine.get_review_summary(&profile).expect("resumen");
    assert_eq!(summary.due as usize, failed.len());
    assert_eq!(summary.learning as usize, failed.len());
    assert_eq!(summary.total_failed as usize, failed.len());
    assert_eq!(summary.by_block.len(), 1);
    assert_eq!(summary.by_block[0].block, Some(BlockId::III));

    let review = engine
        .start_exam(
            &profile,
            ExamSpec::Review {
                count: 50,
                feedback: FeedbackMode::Immediate,
            },
        )
        .expect("repaso");
    assert_eq!(review.mode, ExamMode::Review);
    let ids: HashSet<String> = question_ids(&review).into_iter().collect();
    assert_eq!(ids, failed.iter().cloned().collect());
    // Acertarlas las sube a la caja 2: ya no vencen hoy, pero siguen en seguimiento.
    let progress = progress_with(&review, None, |id, _| correct_letter(&engine, id));
    engine.submit_exam(&progress).expect("entrega");
    let summary = engine.get_review_summary(&profile).expect("resumen");
    assert_eq!(summary.due, 0);
    assert_eq!(summary.learning as usize, failed.len());
    // Mañana vuelven a vencer.
    clock.advance(chrono::Duration::days(1));
    let summary = engine.get_review_summary(&profile).expect("resumen");
    assert_eq!(summary.due as usize, failed.len());
}

#[test]
fn case_mode_and_images() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(
            &profile,
            ExamSpec::Case {
                bank_id: "tai-test-2024".into(),
                section_id: "p2-s1".into(),
                feedback: FeedbackMode::Immediate,
                timed: true,
            },
        )
        .expect("supuesto");
    assert_eq!(paper.mode, ExamMode::Case);
    assert_eq!(paper.sections.len(), 1);
    let section = &paper.sections[0];
    // Enunciado con imagen en línea reescrita a data URI y media con data_url.
    let statement = section.statement.as_deref().expect("enunciado");
    assert!(
        statement.contains("](data:image/png;base64,"),
        "{statement}"
    );
    assert!(!statement.contains("](assets/"));
    assert!(
        section.media[0]
            .data_url
            .as_deref()
            .is_some_and(|u| u.starts_with("data:image/png;base64,"))
    );
    // Tiempo proporcional al peso del supuesto en el examen original: 60 · 16/26 ≈ 37 min.
    assert_eq!(paper.duration_minutes, Some(37));

    // Imagen en una opción (réplica oficial, supuesto IV).
    let official = engine
        .start_exam(
            &profile,
            ExamSpec::Official {
                bank_id: "tai-test-2024".into(),
                include_reserve: true,
                timed: false,
                feedback: FeedbackMode::Immediate,
                theory_block: None,
            },
        )
        .expect("oficial");
    let q = official
        .sections
        .iter()
        .flat_map(|s| &s.questions)
        .find(|q| q.id == "tai-test-2024-p2-s2-001")
        .expect("pregunta con imagen");
    assert!(
        q.options[1].contains("![opción B](data:image/png;base64,"),
        "{}",
        q.options[1]
    );
    // Respuesta inmediata: la explicación y las notas también llevan la imagen embebida.
    let fb = engine
        .check_answer(
            &official.attempt_id,
            "tai-test-2024-p2-s2-001",
            Some(tai_core::api::Letter::B),
        )
        .expect("feedback");
    assert!(
        fb.explanation
            .as_deref()
            .is_some_and(|e| e.contains("data:image/png;base64,"))
    );
    let notes = fb.option_notes.expect("notas");
    assert!(
        notes[1]
            .as_deref()
            .is_some_and(|n| n.contains("data:image/png;base64,"))
    );
}
