// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Persistencia en un fichero SQLite temporal: los datos sobreviven a cerrar y reabrir la
//! aplicación, y un intento en curso se puede reanudar.

mod common;

use std::sync::Arc;

use common::*;
use tai_core::api::{AnswerState, ExamSpec, FeedbackMode, Letter, ProgressPayload};
use tai_core::storage::SCHEMA_VERSION;
use tai_core::{Database, Engine, EngineOptions, FixedClock};

fn open(path: &std::path::Path) -> Engine {
    let db = Database::open(path).expect("base de datos");
    assert_eq!(db.schema_version().expect("versión"), SCHEMA_VERSION);
    Engine::with_options(
        catalog(),
        db,
        EngineOptions::with_clock(Arc::new(FixedClock::new(now()))),
    )
}

#[test]
fn data_survives_reopening_the_app() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("datos").join("opotai.sqlite3");
    let (profile, finished, in_progress) = {
        let mut engine = open(&path);
        assert_eq!(engine.get_app_info().db_path, path.display().to_string());
        let profile = engine
            .create_profile("Persistente", "#112233", None)
            .expect("perfil")
            .id;
        let mut settings = engine.get_settings(&profile).expect("ajustes");
        settings.sound_volume = 0.25;
        engine.update_settings(&profile, settings).expect("ajustes");

        let spec = ExamSpec::Official {
            bank_id: "tai-test-2024".into(),
            include_reserve: true,
            timed: true,
            feedback: FeedbackMode::End,
            theory_block: None,
        };
        let paper = engine.start_exam(&profile, spec.clone()).expect("examen");
        let result = engine
            .submit_exam(&progress_with(&paper, Some("p2-s1"), |id, _| {
                correct_letter(&engine, id)
            }))
            .expect("entrega");
        // Segundo intento a medias (simula cerrar la app durante el examen).
        let open_paper = engine.start_exam(&profile, spec).expect("examen");
        engine
            .save_progress(&ProgressPayload {
                attempt_id: open_paper.attempt_id.clone(),
                answers: vec![AnswerState {
                    question_id: "tai-test-2024-p1-001".into(),
                    choice: Some(Letter::D),
                    flagged: true,
                }],
                chosen_case: Some("p2-s2".into()),
                elapsed_seconds: 321,
            })
            .expect("progreso");
        (profile, result, open_paper.attempt_id)
    };

    let mut engine = open(&path);
    let profiles = engine.list_profiles().expect("perfiles");
    assert_eq!(profiles.len(), 1);
    assert_eq!(profiles[0].id, profile);
    assert!((engine.get_settings(&profile).expect("ajustes").sound_volume - 0.25).abs() < 1e-12);

    let active = engine
        .get_active_attempt(&profile)
        .expect("activo")
        .expect("en curso");
    assert_eq!(active.paper.attempt_id, in_progress);
    assert_eq!(active.progress.elapsed_seconds, 321);
    assert_eq!(active.progress.chosen_case.as_deref(), Some("p2-s2"));
    assert_eq!(active.progress.answers[0].choice, Some(Letter::D));
    assert!(active.progress.answers[0].flagged);

    let again = engine
        .get_attempt_result(&finished.attempt_id)
        .expect("resultado");
    assert_eq!(again.grade, finished.grade);
    let stats = engine.get_stats(&profile).expect("stats");
    assert_eq!(stats.attempts_finished, 1);
    assert_eq!(stats.correct, 14);
}

#[test]
fn opening_a_corrupt_or_newer_database_fails_cleanly() {
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("roto.sqlite3");
    std::fs::write(&path, b"esto no es una base de datos SQLite").expect("fichero");
    assert!(Database::open(&path).is_err());
}

fn copy_dir(from: &std::path::Path, to: &std::path::Path) {
    std::fs::create_dir_all(to).expect("directorio");
    for entry in std::fs::read_dir(from).expect("leer") {
        let entry = entry.expect("entrada");
        let target = to.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir(&entry.path(), &target);
        } else {
            std::fs::copy(entry.path(), &target).expect("copiar");
        }
    }
}

#[test]
fn reopened_result_also_updates_the_history_counts() {
    // Si el banco cambia (p. ej. se anula una pregunta), al reabrir el resultado se recalcula la
    // nota y también los aciertos, errores y blancos del historial.
    let dir = tempfile::tempdir().expect("tempdir");
    let path = dir.path().join("opotai.sqlite3");
    let (profile, attempt_id, annulled_id) = {
        let mut engine = open(&path);
        let profile = engine
            .create_profile("Historial", "#112233", None)
            .expect("perfil")
            .id;
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Official {
                    bank_id: "tai-test-2024".into(),
                    include_reserve: false,
                    timed: false,
                    feedback: FeedbackMode::End,
                    theory_block: None,
                },
            )
            .expect("examen");
        let first = paper.sections[0].questions[0].id.clone();
        engine
            .submit_exam(&progress_with(&paper, Some("p2-s2"), |id, _| {
                correct_letter(&engine, id)
            }))
            .expect("entrega");
        (profile, paper.attempt_id, first)
    };
    // Mismo banco con la primera pregunta anulada.
    let data = dir.path().join("data");
    copy_dir(&fixtures_dir(), &data);
    let bank_path = data
        .join("banks")
        .join("oficiales")
        .join("tai-test-2024.json");
    let mut bank: serde_json::Value =
        serde_json::from_str(&std::fs::read_to_string(&bank_path).expect("banco")).expect("json");
    for section in bank["sections"].as_array_mut().expect("secciones") {
        for q in section["questions"].as_array_mut().expect("preguntas") {
            if q["id"] == serde_json::Value::String(annulled_id.clone()) {
                q["annulled"] = serde_json::Value::Bool(true);
            }
        }
    }
    std::fs::write(&bank_path, serde_json::to_string(&bank).expect("json")).expect("escribir");
    let catalog = tai_core::Catalog::load_dir(&data).expect("catálogo");
    let mut engine = Engine::with_options(
        catalog,
        Database::open(&path).expect("base de datos"),
        EngineOptions::with_clock(Arc::new(FixedClock::new(now()))),
    );
    let result = engine.get_attempt_result(&attempt_id).expect("resultado");
    let correct: u32 = result.grade.parts.iter().map(|p| p.correct).sum();
    let listed = engine.list_attempts(&profile, Some(1)).expect("lista");
    assert_eq!(listed[0].correct, correct);
    assert!(result.grade.parts.iter().any(|p| p.annulled >= 1));
}
