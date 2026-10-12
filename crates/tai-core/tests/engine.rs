// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Fachada `Engine`: perfiles, ajustes, ciclo de vida del intento, corrección inmediata,
//! simulacro sorpresa, teoría y estadísticas.

mod common;

use std::collections::HashSet;

use common::*;
use tai_core::api::{
    AnswerState, AttemptStatus, ExamMode, ExamSpec, FeedbackMode, Letter, ProgressPayload,
    RandomDrawKind, Settings, Theme,
};
use tai_core::{ApiErrorCode, Catalog, CoreError};

fn official(feedback: FeedbackMode) -> ExamSpec {
    ExamSpec::Official {
        bank_id: "tai-test-2024".into(),
        include_reserve: true,
        timed: true,
        feedback,
        theory_block: None,
    }
}

#[test]
fn profiles_crud_and_validation() {
    let (mut engine, clock) = engine();
    let ana = engine
        .create_profile("  Ana  ", "#7c3aed", Some("🦊".into()))
        .expect("perfil");
    assert_eq!(ana.name, "Ana");
    assert_eq!(ana.avatar.as_deref(), Some("🦊"));
    assert_eq!(ana.last_active_at, None);
    // Nombre único sin distinguir mayúsculas ni tildes.
    let dup = engine
        .create_profile("ANA", "#000", None)
        .expect_err("duplicado");
    assert_eq!(tai_core::ApiError::from(dup).code, ApiErrorCode::Conflict);
    assert!(engine.create_profile("", "#000", None).is_err());
    assert!(
        engine
            .create_profile(&"x".repeat(41), "#000", None)
            .is_err()
    );
    assert!(engine.create_profile("Luis", "morado", None).is_err());

    clock.advance(chrono::Duration::minutes(1));
    let luis = engine
        .create_profile("Luis", "#0ea5e9", None)
        .expect("perfil");
    let names: Vec<String> = engine
        .list_profiles()
        .expect("lista")
        .into_iter()
        .map(|p| p.name)
        .collect();
    assert_eq!(names, vec!["Luis", "Ana"]);
    clock.advance(chrono::Duration::minutes(1));
    let touched = engine.touch_profile(&ana.id).expect("touch");
    assert!(touched.last_active_at.is_some());
    let names: Vec<String> = engine
        .list_profiles()
        .expect("lista")
        .into_iter()
        .map(|p| p.name)
        .collect();
    assert_eq!(names, vec!["Ana", "Luis"]);

    let renamed = engine
        .update_profile(&luis.id, "Luisa", "#ffffff", None)
        .expect("actualiza");
    assert_eq!(renamed.name, "Luisa");
    assert!(
        engine
            .update_profile(&luis.id, "ana", "#ffffff", None)
            .is_err()
    );
    engine.delete_profile(&luis.id).expect("borra");
    assert!(matches!(
        engine.delete_profile(&luis.id),
        Err(CoreError::NotFound(_))
    ));
    assert_eq!(engine.list_profiles().expect("lista").len(), 1);
}

#[test]
fn settings_defaults_validation_and_old_format() {
    let (mut engine, _, profile) = engine_with_profile();
    let defaults = engine.get_settings(&profile).expect("ajustes");
    assert_eq!(defaults, Settings::default());
    assert_eq!(defaults.default_feedback, FeedbackMode::Immediate);
    assert_eq!(defaults.exam_feedback, FeedbackMode::End);
    assert!(defaults.sound_enabled && defaults.random_exam_on_startup);
    assert!((defaults.sound_volume - 0.6).abs() < 1e-12);

    let mut s = defaults.clone();
    s.theme = Theme::Dark;
    s.preferred_localities = vec![
        "Madrid".into(),
        " madrid ".into(),
        "Toledo".into(),
        "".into(),
    ];
    s.cutoff_override_ratio = Some(0.35);
    s.target_convocatoria = Some("li-test".into());
    s.exam_date = Some("2027-05-22".into());
    let saved = engine.update_settings(&profile, s).expect("guarda");
    assert_eq!(saved.preferred_localities, vec!["Madrid", "Toledo"]);
    assert_eq!(engine.get_settings(&profile).expect("ajustes"), saved);

    for bad in [
        Settings {
            sound_volume: 1.5,
            ..Settings::default()
        },
        Settings {
            cutoff_override_ratio: Some(-0.1),
            ..Settings::default()
        },
        Settings {
            accent: "rojo".into(),
            ..Settings::default()
        },
        Settings {
            target_convocatoria: Some("li-1900".into()),
            ..Settings::default()
        },
        Settings {
            exam_date: Some("22/05/2027".into()),
            ..Settings::default()
        },
        Settings {
            preferred_localities: vec!["A".into(), "B".into(), "C".into(), "D".into()],
            ..Settings::default()
        },
    ] {
        let err = engine.update_settings(&profile, bad).expect_err("inválido");
        assert_eq!(
            tai_core::ApiError::from(err).code,
            ApiErrorCode::InvalidInput
        );
    }

    // Ajustes guardados por una versión anterior (sin los campos nuevos) → valores por defecto.
    let old = r##"{"theme":"light","accent":"#ff0000","default_feedback":"end","show_timer":false,
        "confirm_before_submit":true,"keyboard_shortcuts":true,"target_convocatoria":null,
        "cutoff_override_ratio":null,"preferred_localities":[],"exam_date":null}"##;
    let parsed: Settings = serde_json::from_str(old).expect("formato antiguo");
    assert_eq!(parsed.theme, Theme::Light);
    assert_eq!(parsed.default_feedback, FeedbackMode::End);
    assert!(!parsed.show_timer);
    assert_eq!(parsed.exam_feedback, FeedbackMode::End);
    assert!(parsed.sound_enabled);
    assert!((parsed.sound_volume - 0.6).abs() < 1e-12);
    assert!(parsed.random_exam_on_startup);
    tai_core::storage::profiles::set_settings(engine.database().conn(), &profile, old)
        .expect("sql");
    let loaded = engine.get_settings(&profile).expect("ajustes");
    assert_eq!(loaded, parsed);
}

#[test]
fn attempt_lifecycle_save_resume_submit() {
    let (mut engine, clock, profile) = engine_with_profile();
    assert!(
        engine
            .get_active_attempt(&profile)
            .expect("activo")
            .is_none()
    );
    let paper = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("examen");
    assert!(!paper.drawn);
    assert_eq!(paper.mode, ExamMode::Official);

    let first = paper.sections[0].questions[0].id.clone();
    let progress = ProgressPayload {
        attempt_id: paper.attempt_id.clone(),
        answers: vec![
            AnswerState {
                question_id: first.clone(),
                choice: Some(Letter::C),
                flagged: true,
            },
            AnswerState {
                question_id: "no-existe".into(),
                choice: Some(Letter::A),
                flagged: false,
            },
        ],
        chosen_case: Some("p2-s2".into()),
        elapsed_seconds: 125,
    };
    engine.save_progress(&progress).expect("guarda");
    // Un supuesto que no es del examen es un error.
    let bad = ProgressPayload {
        chosen_case: Some("p9".into()),
        ..progress.clone()
    };
    assert!(engine.save_progress(&bad).is_err());
    // Corrección inmediata no disponible en modo «end».
    assert!(
        engine
            .check_answer(&paper.attempt_id, &first, Some(Letter::A))
            .is_err()
    );

    let active = engine
        .get_active_attempt(&profile)
        .expect("activo")
        .expect("en curso");
    assert_eq!(active.paper.attempt_id, paper.attempt_id);
    assert_eq!(active.progress.chosen_case.as_deref(), Some("p2-s2"));
    assert_eq!(active.progress.elapsed_seconds, 125);
    assert_eq!(active.progress.answers.len(), 1);
    assert!(active.progress.answers[0].flagged);

    let listed = engine.list_attempts(&profile, None).expect("lista");
    assert_eq!(listed.len(), 1);
    assert_eq!(listed[0].status, AttemptStatus::InProgress);

    clock.advance(chrono::Duration::minutes(30));
    let final_progress = progress_with(&paper, Some("p2-s2"), |id, _| correct_letter(&engine, id));
    let result = engine.submit_exam(&final_progress).expect("entrega");
    assert_eq!(result.elapsed_seconds, 600);
    assert_eq!(result.finished_at, "2026-10-11T12:30:00Z");
    assert!(
        engine.submit_exam(&final_progress).is_err(),
        "no se entrega dos veces"
    );
    assert!(engine.save_progress(&final_progress).is_err());
    assert!(
        engine
            .get_active_attempt(&profile)
            .expect("activo")
            .is_none()
    );

    let listed = engine.list_attempts(&profile, Some(10)).expect("lista");
    assert_eq!(listed[0].status, AttemptStatus::Finished);
    assert_eq!(listed[0].correct, 14);
    assert!(listed[0].total_grade.is_some() && listed[0].p_plaza.is_some());

    // La revisión se recalcula con el banco actual y coincide con la entrega.
    let again = engine
        .get_attempt_result(&paper.attempt_id)
        .expect("resultado");
    assert_eq!(again.grade, result.grade);
    assert_eq!(again.review.len(), result.review.len());
    assert_eq!(again.prediction, result.prediction);

    engine.delete_attempt(&paper.attempt_id).expect("borra");
    assert!(engine.get_attempt_result(&paper.attempt_id).is_err());
    assert!(
        engine
            .list_attempts(&profile, None)
            .expect("lista")
            .is_empty()
    );
}

#[test]
fn history_counts_match_the_grade_when_no_case_is_chosen() {
    // Sin supuesto elegido (respuestas en varios), la 2.ª parte cuenta entera como en blanco:
    // el historial debe mostrar los mismos aciertos, errores y blancos que la nota.
    let (mut engine, _clock, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("examen");
    assert!(paper.requires_case_choice);
    let result = engine
        .submit_exam(&progress_with(&paper, None, |id, _| {
            correct_letter(&engine, id)
        }))
        .expect("entrega");
    let blank: u32 = result.grade.parts.iter().map(|p| p.blank).sum();
    let correct: u32 = result.grade.parts.iter().map(|p| p.correct).sum();
    let wrong: u32 = result.grade.parts.iter().map(|p| p.wrong).sum();
    assert!(blank > 0, "la 2.ª parte cuenta en blanco");
    let listed = engine.list_attempts(&profile, Some(1)).expect("lista");
    assert_eq!(
        (listed[0].correct, listed[0].wrong, listed[0].blank),
        (correct, wrong, blank)
    );
}

#[test]
fn starting_a_new_exam_abandons_the_previous_one() {
    let (mut engine, _, profile) = engine_with_profile();
    let a = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("a");
    let b = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("b");
    let active = engine
        .get_active_attempt(&profile)
        .expect("activo")
        .expect("b");
    assert_eq!(active.paper.attempt_id, b.attempt_id);
    // El abandonado no aparece en la lista.
    let ids: Vec<String> = engine
        .list_attempts(&profile, None)
        .expect("lista")
        .into_iter()
        .map(|s| s.attempt_id)
        .collect();
    assert_eq!(ids, vec![b.attempt_id.clone()]);
    assert!(engine.check_answer(&a.attempt_id, "x", None).is_err());
    engine.abandon_exam(&b.attempt_id).expect("abandona");
    engine.abandon_exam(&b.attempt_id).expect("idempotente");
    assert!(
        engine
            .get_active_attempt(&profile)
            .expect("activo")
            .is_none()
    );
}

#[test]
fn immediate_feedback_in_official_exam_locks_answers() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, official(FeedbackMode::Immediate))
        .expect("examen");
    assert_eq!(paper.feedback, FeedbackMode::Immediate);
    let qid = "tai-test-2024-p1-001";
    let correct = correct_letter(&engine, qid).expect("respuesta");
    let wrong = wrong_letter(&engine, qid);

    let fb = engine
        .check_answer(&paper.attempt_id, qid, Some(wrong))
        .expect("feedback");
    assert!(!fb.is_correct);
    assert_eq!(fb.correct, Some(correct));
    assert_eq!(fb.chosen, Some(wrong));
    assert_eq!(
        fb.explanation.as_deref(),
        Some("Explicación de la pregunta 1.")
    );
    // Repetir la misma respuesta es idempotente; cambiarla no se permite.
    assert_eq!(
        engine
            .check_answer(&paper.attempt_id, qid, Some(wrong))
            .expect("idempotente"),
        fb
    );
    let err = engine
        .check_answer(&paper.attempt_id, qid, Some(correct))
        .expect_err("bloqueada");
    assert_eq!(tai_core::ApiError::from(err).code, ApiErrorCode::Conflict);
    // Pregunta anulada.
    let annulled = engine
        .check_answer(&paper.attempt_id, "tai-test-2024-p1-004", Some(Letter::A))
        .expect("anulada");
    assert!(annulled.annulled && !annulled.is_correct);
    // Pregunta ajena al examen.
    assert!(
        engine
            .check_answer(&paper.attempt_id, "practica-test-p1-001", Some(Letter::A))
            .is_err()
    );

    // Aunque la interfaz envíe otra respuesta al guardar o entregar, cuenta la comprobada.
    let progress = progress_with(&paper, Some("p2-s1"), |id, _| correct_letter(&engine, id));
    engine.save_progress(&progress).expect("guarda");
    let result = engine.submit_exam(&progress).expect("entrega");
    let item = result
        .review
        .iter()
        .find(|r| r.question_id == qid)
        .expect("item");
    assert_eq!(item.chosen, Some(wrong));
    assert_eq!(item.status, tai_core::api::ItemStatus::Wrong);
    assert_eq!(result.grade.parts[0].wrong, 1);
}

#[test]
fn random_draw_only_uses_the_pool_and_prioritises_undone() {
    let (mut engine, clock, profile) = engine_with_profile();
    let first = engine.draw_random_exam(&profile).expect("sorteo");
    // Bolsa: 1 oficial completo (el de 2023 solo tiene 1.ª parte) + 30 numerados.
    assert_eq!(first.pool_size, 31);
    assert!(!first.already_done);
    assert!(first.description.contains("31 exámenes"));

    let mut seen_official = false;
    for _ in 0..600 {
        let draw = engine.draw_random_exam(&profile).expect("sorteo");
        match &draw.spec {
            ExamSpec::Official {
                bank_id,
                include_reserve,
                timed,
                feedback,
                ..
            } => {
                assert_eq!(bank_id, "tai-test-2024");
                assert!(*include_reserve && *timed);
                assert_eq!(*feedback, FeedbackMode::End);
                assert_eq!(draw.kind, RandomDrawKind::Official);
                assert_eq!(draw.question_count, 10);
                assert_eq!(draw.case_count, 2);
                assert_eq!(draw.duration_minutes, Some(60));
                seen_official = true;
            }
            ExamSpec::Numbered { number, .. } => {
                assert!((1..=30).contains(number));
                assert_eq!(draw.kind, RandomDrawKind::Numbered);
                assert_eq!(draw.title, format!("Simulacro OpoTAI n.º {number}"));
            }
            other => panic!("tipo inesperado: {other:?}"),
        }
    }
    assert!(seen_official, "el oficial también debe poder salir");

    // Se terminan 30 de los 31 (uno por minuto): el sorteo solo puede dar el que falta.
    for number in 1..=30 {
        clock.advance(chrono::Duration::minutes(1));
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
        engine
            .submit_exam(&progress_with(&paper, None, |_, _| None))
            .expect("entrega");
    }
    for _ in 0..20 {
        let draw = engine.draw_random_exam(&profile).expect("sorteo");
        assert!(matches!(draw.spec, ExamSpec::Official { .. }));
        assert!(!draw.already_done);
    }
    // Hecho todo: se repite el terminado hace más tiempo (el numerado 1).
    clock.advance(chrono::Duration::minutes(1));
    let paper = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("oficial");
    engine
        .submit_exam(&progress_with(&paper, None, |_, _| None))
        .expect("entrega");
    let draw = engine.draw_random_exam(&profile).expect("sorteo");
    assert!(draw.already_done);
    assert_eq!(
        draw.spec,
        ExamSpec::Numbered {
            number: 1,
            feedback: FeedbackMode::End,
            timed: true,
        }
    );
}

#[test]
fn drawn_flag_and_random_spec() {
    let (mut engine, _, profile) = engine_with_profile();
    let mut s = engine.get_settings(&profile).expect("ajustes");
    s.exam_feedback = FeedbackMode::Immediate;
    engine.update_settings(&profile, s).expect("ajustes");

    let draw = engine.draw_random_exam(&profile).expect("sorteo");
    let feedback = match &draw.spec {
        ExamSpec::Official { feedback, .. } | ExamSpec::Numbered { feedback, .. } => *feedback,
        _ => FeedbackMode::End,
    };
    assert_eq!(
        feedback,
        FeedbackMode::Immediate,
        "usa la corrección de exámenes del perfil"
    );
    let paper = engine
        .start_exam(&profile, draw.spec.clone())
        .expect("examen sorteado");
    assert!(paper.drawn);
    assert_eq!(paper.feedback, FeedbackMode::Immediate);
    // Tras reanudar sigue marcado.
    let active = engine
        .get_active_attempt(&profile)
        .expect("activo")
        .expect("en curso");
    assert!(active.paper.drawn);
    // El sorteo se consume: el mismo examen pedido otra vez ya no cuenta como sorteado.
    let again = engine.start_exam(&profile, draw.spec).expect("examen");
    assert!(!again.drawn);
    // Otro examen tras un sorteo tampoco.
    engine.draw_random_exam(&profile).expect("sorteo");
    let other = engine
        .start_exam(
            &profile,
            ExamSpec::Review {
                count: 5,
                feedback: FeedbackMode::End,
            },
        )
        .map(|p| p.drawn)
        .unwrap_or(false);
    assert!(!other);
    // `type: "random"` sortea y arranca directamente.
    let random = engine
        .start_exam(
            &profile,
            ExamSpec::Random {
                feedback: FeedbackMode::End,
                timed: true,
            },
        )
        .expect("sorpresa");
    assert!(random.drawn);
    assert!(matches!(
        random.mode,
        ExamMode::Official | ExamMode::Simulacro
    ));
}

#[test]
fn learning_mode_has_no_timer_and_real_mode_uses_the_official_time() {
    let (mut engine, _, profile) = engine_with_profile();
    // «Examen real»: el sorteo se describe con el cronómetro oficial.
    let draw = engine.draw_random_exam(&profile).expect("sorteo");
    let official_minutes = draw.duration_minutes.expect("duración oficial");
    assert!(official_minutes > 0);

    // «Aprendizaje»: el mismo examen sorteado, sin límite de tiempo, sigue contando como sorteo.
    let learning = match draw.spec.clone() {
        ExamSpec::Official {
            bank_id,
            include_reserve,
            feedback,
            theory_block,
            ..
        } => ExamSpec::Official {
            bank_id,
            include_reserve,
            timed: false,
            feedback,
            theory_block,
        },
        ExamSpec::Numbered {
            number, feedback, ..
        } => ExamSpec::Numbered {
            number,
            feedback,
            timed: false,
        },
        other => panic!("sorteo inesperado: {other:?}"),
    };
    let paper = engine.start_exam(&profile, learning).expect("aprendizaje");
    assert!(paper.drawn, "cambiar el modo no pierde la marca de sorteo");
    assert_eq!(paper.duration_minutes, None);

    // Numerado: cronómetro con la duración del esquema o sin límite.
    let timed = engine
        .start_exam(
            &profile,
            ExamSpec::Numbered {
                number: 2,
                feedback: FeedbackMode::End,
                timed: true,
            },
        )
        .expect("numerado con tiempo");
    assert!(timed.duration_minutes.is_some_and(|m| m > 0));
    let untimed = engine
        .start_exam(
            &profile,
            ExamSpec::Numbered {
                number: 2,
                feedback: FeedbackMode::Immediate,
                timed: false,
            },
        )
        .expect("numerado sin tiempo");
    assert_eq!(untimed.duration_minutes, None);
    assert!(
        untimed
            .subtitle
            .as_deref()
            .is_some_and(|s| s.contains("sin límite de tiempo"))
    );
    // Misma composición en ambos modos.
    let ids = |p: &tai_core::api::ExamPaper| {
        p.sections
            .iter()
            .flat_map(|s| s.questions.iter().map(|q| q.id.clone()))
            .collect::<Vec<_>>()
    };
    assert_eq!(ids(&timed), ids(&untimed));

    // Sorteo directo sin límite de tiempo.
    let random = engine
        .start_exam(
            &profile,
            ExamSpec::Random {
                feedback: FeedbackMode::Immediate,
                timed: false,
            },
        )
        .expect("sorpresa sin tiempo");
    assert!(random.drawn);
    assert_eq!(random.duration_minutes, None);

    // Las especificaciones antiguas (sin `timed`) siguen siendo cronometradas.
    let legacy: ExamSpec =
        serde_json::from_str(r#"{"type":"random","feedback":"end"}"#).expect("spec");
    assert_eq!(
        legacy,
        ExamSpec::Random {
            feedback: FeedbackMode::End,
            timed: true,
        }
    );
}

#[test]
fn random_draw_without_data_is_a_clear_error() {
    let (mut engine, _) = engine_with(Catalog::empty());
    let profile = engine
        .create_profile("Sin datos", "#123456", None)
        .expect("perfil")
        .id;
    let err = engine.draw_random_exam(&profile).expect_err("sin exámenes");
    assert_eq!(tai_core::ApiError::from(err).code, ApiErrorCode::Conflict);
    assert!(engine.get_theory_index().is_empty());
    assert!(engine.get_theory("IV.1").is_err());
    let info = engine.get_app_info();
    assert_eq!((info.banks, info.questions, info.theory_topics), (0, 0, 0));
    assert_eq!(info.db_path, ":memory:");
    // El catálogo funciona con los metadatos por defecto.
    let catalog = engine.get_catalog();
    assert_eq!(catalog.default_scheme, "tai-li-2025");
    assert_eq!(catalog.target_convocatoria.as_deref(), Some("li-2025"));
    assert!(catalog.temario.is_none());
    assert!(engine.list_localities().is_empty());
}

#[test]
fn theory_index_and_topics() {
    let (engine, _) = engine();
    let index = engine.get_theory_index();
    // El índice cita 3 temas pero uno no tiene fichero: se omite. Orden del temario.
    let topics: Vec<&str> = index.iter().map(|t| t.topic.as_str()).collect();
    assert_eq!(topics, vec!["I.1", "IV.1"]);
    let iv1 = &index[1];
    assert_eq!(iv1.block, tai_core::api::BlockId::IV);
    assert_eq!(iv1.reading_minutes, 7);
    assert_eq!(iv1.updated.as_deref(), Some("2026-10-10"));
    // Preguntas del catálogo con ese tema (titulares y reservas, de todos los bancos).
    let expected = engine
        .catalog()
        .all_questions()
        .filter(|r| r.question.topic.as_deref() == Some("IV.1"))
        .count() as u32;
    assert_eq!(iv1.question_count, expected);
    assert!(expected >= 5);
    assert_eq!(
        index[0].updated.as_deref(),
        Some("2026-10-11"),
        "fecha del índice"
    );

    let topic = engine.get_theory("IV.1").expect("tema");
    assert!(topic.content.starts_with("# Redes"));
    assert!(
        topic.content.contains("](data:image/png;base64,"),
        "imágenes embebidas"
    );
    assert!(
        topic
            .content
            .contains("![Capas del modelo OSI](data:image/svg+xml;base64,"),
        "diagramas de la teoría como data URL"
    );
    assert!(!topic.content.contains("](diagramas/"));
    assert_eq!(topic.sources.len(), 1);
    assert_eq!(topic.key_points, vec!["Modelo OSI", "TCP/IP"]);
    assert!(matches!(
        engine.get_theory("II.9"),
        Err(CoreError::NotFound(_))
    ));
    assert_eq!(engine.get_app_info().theory_topics, 2);
}

#[test]
fn copyright_year_follows_the_current_year() {
    assert_eq!(tai_core::copyright_line(2026), "© 2026 Eric Valls Gramunt");
    assert_eq!(
        tai_core::copyright_line(2027),
        "© 2026–2027 Eric Valls Gramunt"
    );
    assert_eq!(
        tai_core::copyright_line(2031),
        "© 2026–2031 Eric Valls Gramunt"
    );
    // Un reloj atrasado nunca muestra un año anterior a la publicación.
    assert_eq!(tai_core::copyright_line(2024), "© 2026 Eric Valls Gramunt");
}

#[test]
fn app_info_has_version_license_and_copyright() {
    let (engine, _) = engine();
    let info = engine.get_app_info();
    assert_eq!(info.version, env!("CARGO_PKG_VERSION"));
    assert_eq!(info.license, "GPL-3.0-or-later");
    assert_eq!(
        info.license_name,
        "GNU General Public License v3.0 o posterior"
    );
    assert_eq!(info.copyright, "© 2026 Eric Valls Gramunt");
    assert_eq!(info.author, "Eric Valls Gramunt");
    assert!(info.repository.starts_with("https://github.com/"));
    assert_eq!(info.git_commit, None);
    let license = engine.get_license_text();
    assert!(license.contains("GNU GENERAL PUBLIC LICENSE"));
    assert!(license.contains("Version 3, 29 June 2007"));

    // La capa de escritorio aporta el commit de compilación.
    let clock = std::sync::Arc::new(tai_core::FixedClock::new(now()));
    let options = tai_core::EngineOptions::with_clock(clock).with_git_commit(Some(" a1b2c3d \n"));
    let engine = tai_core::Engine::with_options(
        Catalog::empty(),
        tai_core::Database::open_in_memory().expect("db"),
        options,
    );
    assert_eq!(engine.get_app_info().git_commit.as_deref(), Some("a1b2c3d"));
    let options = tai_core::EngineOptions::system().with_git_commit(Some("   "));
    assert_eq!(options.git_commit, None);
}

#[test]
fn app_info_and_catalog() {
    let (mut engine, _) = engine();
    let info = engine.get_app_info();
    assert_eq!(info.name, "OpoTAI");
    assert_eq!(info.author, "Eric Valls Gramunt");
    assert_eq!(info.banks, 3);
    assert_eq!(info.official_exams, 2);
    assert_eq!(info.data_updated.as_deref(), Some("2026-10-11"));
    assert!(
        info.questions_with_explanation > 0 && info.questions_with_explanation < info.questions
    );

    let catalog = engine.get_catalog();
    assert_eq!(catalog.default_scheme, "tai-test");
    assert_eq!(catalog.target_convocatoria.as_deref(), Some("li-test-obj"));
    let bank = catalog
        .banks
        .iter()
        .find(|b| b.id == "tai-test-2024")
        .expect("banco");
    assert_eq!(
        (bank.question_count, bank.reserve_count, bank.case_count),
        (18, 7, 2)
    );
    assert_eq!(bank.annulled_count, 4);
    assert_eq!(bank.sections.len(), 3);
    let reference = catalog
        .convocatorias
        .iter()
        .find(|c| c.id == "li-test")
        .expect("conv");
    assert!(reference.has_grades && reference.has_destinations);
    assert_eq!(catalog.tiers.len(), 3);
    assert_eq!(catalog.temario.as_ref().map(|t| t.blocks.len()), Some(4));

    let localities = engine.list_localities();
    assert_eq!(localities[0].name, "Madrid");
    let madrid_share = localities[0].share_of_plazas.expect("reparto");
    assert!(madrid_share > 0.5 && madrid_share < 1.0);
    let leioa = localities
        .iter()
        .find(|l| l.name == "Leioa")
        .expect("Leioa");
    assert!((leioa.share_of_plazas.unwrap_or(0.0) - 2.0 / 250.0).abs() < 1e-9);
}

#[test]
fn stats_after_several_attempts() {
    let (mut engine, clock, profile) = engine_with_profile();
    let empty = engine.get_stats(&profile).expect("stats");
    assert_eq!(empty.attempts_finished, 0);
    assert_eq!(empty.accuracy, 0.0);
    assert!(empty.readiness.is_none());
    assert_eq!(empty.activity.len(), 120);

    // Día 1: oficial con todo bien.
    let paper = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("examen");
    engine
        .submit_exam(&progress_with(&paper, Some("p2-s1"), |id, _| {
            correct_letter(&engine, id)
        }))
        .expect("entrega");
    // Día 2: práctica con todo mal.
    clock.advance(chrono::Duration::days(1));
    let practice = engine
        .start_exam(
            &profile,
            ExamSpec::Practice {
                blocks: vec![tai_core::api::BlockId::II],
                topics: vec![],
                bank_ids: vec!["practica-test".into()],
                include_cases: false,
                source: tai_core::api::QuestionSource::All,
                count: 6,
                feedback: FeedbackMode::End,
                duration_minutes: None,
                seed: Some(3),
            },
        )
        .expect("práctica");
    engine
        .submit_exam(&progress_with(&practice, None, |id, _| {
            Some(wrong_letter(&engine, id))
        }))
        .expect("entrega");

    let stats = engine.get_stats(&profile).expect("stats");
    assert_eq!(stats.attempts_finished, 2);
    assert_eq!(stats.simulacros_finished, 1);
    assert_eq!(stats.questions_answered, 14 + 6);
    assert_eq!((stats.correct, stats.wrong, stats.blank), (14, 6, 0));
    assert!((stats.accuracy - 14.0 / 20.0).abs() < 1e-9);
    assert_eq!(stats.distinct_questions_seen, 20);
    assert_eq!(
        stats.grade_history.len(),
        2,
        "todos los intentos entregados"
    );
    assert_eq!(stats.grade_history[1].max_grade, 10.0);
    assert!((stats.average_grade.unwrap_or(0.0) - 100.0).abs() < 1e-9);
    assert_eq!(stats.best_grade, stats.last_grade);
    assert_eq!(stats.streak_days, 2);
    assert_eq!(stats.activity.last().map(|d| d.answered), Some(6));
    assert_eq!(stats.activity[118].answered, 14);
    assert_eq!(stats.study_seconds, 1200);
    assert_eq!(stats.review_due, 6);
    let block_ii = stats
        .by_block
        .iter()
        .find(|b| b.key == "II")
        .expect("bloque II");
    assert!(block_ii.label.starts_with("Bloque II · "));
    assert!(block_ii.wrong >= 6);
    assert!(stats.by_topic.iter().all(|t| t.topic.is_some()));
    assert!(stats.weakest_topics.len() <= 5);
    assert!(stats.weakest_topics.iter().all(|t| t.total >= 5));
    let readiness = stats.readiness.expect("preparación");
    assert_eq!(readiness.target_convocatoria, "li-test-obj");
    assert!((readiness.observed_grade - 100.0).abs() < 1e-9);
    assert!(readiness.p_pass > 0.2 && readiness.p_pass <= 1.0);

    // Un perfil inexistente es un error.
    assert!(engine.get_stats("no-existe").is_err());
    let ids: HashSet<String> = engine
        .list_attempts(&profile, None)
        .expect("lista")
        .into_iter()
        .map(|a| a.attempt_id)
        .collect();
    assert_eq!(ids.len(), 2);
}

#[test]
fn delete_profile_cascades() {
    let (mut engine, _, profile) = engine_with_profile();
    let paper = engine
        .start_exam(&profile, official(FeedbackMode::End))
        .expect("examen");
    engine
        .submit_exam(&progress_with(&paper, Some("p2-s1"), |id, _| {
            correct_letter(&engine, id)
        }))
        .expect("entrega");
    engine.delete_profile(&profile).expect("borra");
    let conn = engine.database().conn();
    let count = |table: &str| -> i64 {
        conn.query_row(&format!("SELECT COUNT(*) FROM {table}"), [], |r| r.get(0))
            .expect("conteo")
    };
    assert_eq!(count("attempts"), 0);
    assert_eq!(count("attempt_answers"), 0);
    assert_eq!(count("question_stats"), 0);
}

#[test]
fn profile_avatar_can_be_an_emoji_or_an_own_image() {
    use base64::Engine as _;
    let b64 = |bytes: &[u8]| base64::engine::general_purpose::STANDARD.encode(bytes);
    let (mut engine, _) = engine();
    // PNG 1 × 1 válido.
    let png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    let p = engine
        .create_profile("Con foto", "#7c3aed", Some(png.to_string()))
        .expect("avatar PNG");
    assert_eq!(p.avatar.as_deref(), Some(png));
    // JPEG, WebP y GIF (un GIF animado se guarda tal cual) por su firma; también una imagen
    // grande (1,5 MB) de cualquier proporción.
    let jpeg = format!(
        "data:image/jpeg;base64,{}",
        b64(&[0xFF, 0xD8, 0xFF, 0xE0, 0, 16])
    );
    let mut webp = b"RIFF\x1a\x00\x00\x00WEBPVP8 ".to_vec();
    webp.extend_from_slice(&[0; 14]);
    let webp = format!("data:image/webp;base64,{}", b64(&webp));
    let gif = format!(
        "data:image/gif;base64,{}",
        b64(b"GIF89a\x01\x00\x01\x00\x00\x00\x00;")
    );
    let mut large = vec![0xFF, 0xD8, 0xFF, 0xE0];
    large.resize(1_500_000, 0);
    let large = format!("data:image/jpeg;base64,{}", b64(&large));
    for (i, ok) in [jpeg, webp, gif, large].into_iter().enumerate() {
        engine
            .update_profile(&p.id, "Con foto", "#7c3aed", Some(ok))
            .unwrap_or_else(|e| panic!("formato {i}: {e}"));
    }
    // Emoji: sigue funcionando; quitar el avatar también.
    let emoji = engine
        .update_profile(&p.id, "Con foto", "#7c3aed", Some("🦊".into()))
        .expect("emoji");
    assert_eq!(emoji.avatar.as_deref(), Some("🦊"));
    let none = engine
        .update_profile(&p.id, "Con foto", "#7c3aed", None)
        .expect("sin avatar");
    assert_eq!(none.avatar, None);

    // Rechazos: SVG (puede llevar código), MIME que no cuadra con el contenido, base64 roto y
    // imágenes demasiado grandes.
    let svg = format!(
        "data:image/svg+xml;base64,{}",
        b64(b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>")
    );
    let fake_png = format!("data:image/png;base64,{}", b64(b"no soy una imagen"));
    let broken = "data:image/png;base64,%%%".to_string();
    let mut big = vec![0x89, b'P', b'N', b'G', 0x0D, 0x0A, 0x1A, 0x0A];
    big.resize(tai_core::util::MAX_AVATAR_IMAGE_BYTES + 1, 0);
    let big = format!("data:image/png;base64,{}", b64(&big));
    for bad in [
        svg,
        fake_png,
        broken,
        big,
        "data:text/html,hola".to_string(),
    ] {
        let err = engine
            .update_profile(&p.id, "Con foto", "#7c3aed", Some(bad.clone()))
            .expect_err("avatar no válido");
        assert_eq!(
            tai_core::ApiError::from(err).code,
            ApiErrorCode::InvalidInput,
            "{}",
            &bad[..bad.len().min(40)]
        );
    }
}
