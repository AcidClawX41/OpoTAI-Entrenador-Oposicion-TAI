// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Utilidades compartidas por los tests de integración (fixtures sintéticos).
#![allow(dead_code)]

use std::path::PathBuf;
use std::sync::Arc;

use chrono::{DateTime, Utc};
use tai_core::api::{AnswerState, ExamPaper, Letter, ProgressPayload, SectionKind};
use tai_core::util::parse_iso;
use tai_core::{Catalog, Database, Engine, EngineOptions, FixedClock};

/// Instante fijo de los tests (mediodía UTC para que la fecha local no dependa de la zona).
pub const NOW: &str = "2026-10-11T12:00:00Z";

/// Directorio de fixtures (`tests/fixtures/data`).
pub fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("fixtures")
        .join("data")
}

/// Catálogo de fixtures.
pub fn catalog() -> Catalog {
    Catalog::load_dir(fixtures_dir()).expect("fixtures")
}

/// Instante de referencia.
pub fn now() -> DateTime<Utc> {
    parse_iso(NOW).expect("fecha")
}

/// Motor con fixtures, base de datos en memoria y reloj fijo.
pub fn engine() -> (Engine, Arc<FixedClock>) {
    engine_with(catalog())
}

/// Motor con un catálogo dado.
pub fn engine_with(catalog: Catalog) -> (Engine, Arc<FixedClock>) {
    let clock = Arc::new(FixedClock::new(now()));
    let db = Database::open_in_memory().expect("base de datos");
    let engine = Engine::with_options(catalog, db, EngineOptions::with_clock(clock.clone()));
    (engine, clock)
}

/// Motor con un perfil creado.
pub fn engine_with_profile() -> (Engine, Arc<FixedClock>, String) {
    let (mut engine, clock) = engine();
    let profile = engine
        .create_profile("Opositora", "#7c3aed", None)
        .expect("perfil");
    (engine, clock, profile.id)
}

/// Respuesta correcta (según el catálogo) de una pregunta.
pub fn correct_letter(engine: &Engine, question_id: &str) -> Option<Letter> {
    engine
        .catalog()
        .question(question_id)
        .and_then(|r| r.question.answer)
}

/// Una letra incorrecta para la pregunta.
pub fn wrong_letter(engine: &Engine, question_id: &str) -> Letter {
    let correct = correct_letter(engine, question_id);
    Letter::ALL
        .into_iter()
        .find(|l| Some(*l) != correct)
        .unwrap_or(Letter::A)
}

/// Progreso con las respuestas dadas por `choose` para cada pregunta del examen.
pub fn progress_with(
    paper: &ExamPaper,
    chosen_case: Option<&str>,
    mut choose: impl FnMut(&str, SectionKind) -> Option<Letter>,
) -> ProgressPayload {
    let mut answers = Vec::new();
    for section in &paper.sections {
        for q in &section.questions {
            answers.push(AnswerState {
                question_id: q.id.clone(),
                choice: choose(&q.id, section.kind),
                flagged: false,
            });
        }
    }
    ProgressPayload {
        attempt_id: paper.attempt_id.clone(),
        answers,
        chosen_case: chosen_case.map(str::to_string),
        elapsed_seconds: 600,
    }
}

/// Ids de todas las preguntas de un examen.
pub fn question_ids(paper: &ExamPaper) -> Vec<String> {
    paper
        .sections
        .iter()
        .flat_map(|s| s.questions.iter().map(|q| q.id.clone()))
        .collect()
}
