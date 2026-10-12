// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Test de **contrato**: lee `app/src/api/types.ts` (fuente de verdad) y comprueba que los
//! DTO que serializa el núcleo tienen exactamente las mismas claves, de forma recursiva
//! (interfaces anidadas, arrays, objetos en línea y la unión `ExamSpec` por `type`).
//! Los `null` no se omiten nunca: las claves deben estar siempre.

mod common;

use std::collections::{BTreeMap, BTreeSet};

use common::*;
use serde::Serialize;
use serde_json::Value;
use tai_core::api::{
    AnswerState, BlockId, ExamSpec, FeedbackMode, Letter, ManualGradeInput, ManualPartInput,
    ProgressPayload, QuestionSource,
};
use tai_core::{ApiError, CoreError};

// ───────────────────────────── Analizador mínimo de types.ts ─────────────────────────────

#[derive(Debug, Clone)]
enum TsType {
    Named(String),
    Inline(Vec<(String, String)>),
    Array(Box<TsType>),
    Other,
}

#[derive(Debug, Default)]
struct TsModel {
    interfaces: BTreeMap<String, Vec<(String, String)>>,
    exam_spec: BTreeMap<String, Vec<(String, String)>>,
}

fn strip_comment(line: &str) -> &str {
    match line.find("//") {
        Some(i) => &line[..i],
        None => line,
    }
}

fn is_ident(s: &str) -> bool {
    !s.is_empty()
        && s.chars()
            .next()
            .is_some_and(|c| c.is_ascii_alphabetic() || c == '_')
        && s.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Campo `nombre?: tipo;` de una línea (ya sin comentarios).
fn parse_field(line: &str) -> Option<(String, String)> {
    let t = line.trim();
    if t.starts_with('|') || t.starts_with('*') || t.starts_with("/*") {
        return None;
    }
    let (name, ty) = t.split_once(':')?;
    let name = name.trim().trim_end_matches('?');
    if !is_ident(name) {
        return None;
    }
    let ty = ty.trim().trim_end_matches(';').trim();
    Some((name.to_string(), ty.to_string()))
}

fn split_top_level(s: &str, sep: char) -> Vec<String> {
    let mut parts = Vec::new();
    let mut depth = 0i32;
    let mut current = String::new();
    for ch in s.chars() {
        match ch {
            '{' | '(' | '[' => depth += 1,
            '}' | ')' | ']' => depth -= 1,
            _ => {}
        }
        if ch == sep && depth == 0 {
            parts.push(current.trim().to_string());
            current.clear();
        } else {
            current.push(ch);
        }
    }
    if !current.trim().is_empty() {
        parts.push(current.trim().to_string());
    }
    parts
}

fn parse_type(t: &str) -> TsType {
    let mut t = t.trim();
    let alternatives = split_top_level(t, '|');
    let non_null: Vec<&String> = alternatives
        .iter()
        .filter(|a| a.as_str() != "null")
        .collect();
    let joined;
    if non_null.len() == 1 && alternatives.len() > 1 {
        joined = non_null[0].clone();
        t = joined.as_str();
    } else if non_null.len() > 1 {
        return TsType::Other;
    }
    if let Some(inner) = t.strip_suffix("[]") {
        return TsType::Array(Box::new(parse_type(inner)));
    }
    if t.starts_with('{') && t.ends_with('}') {
        let fields = split_top_level(&t[1..t.len() - 1], ';')
            .iter()
            .filter_map(|f| parse_field(f))
            .collect();
        return TsType::Inline(fields);
    }
    if is_ident(t) {
        return TsType::Named(t.to_string());
    }
    TsType::Other
}

fn brace_delta(line: &str) -> i32 {
    line.chars()
        .map(|c| match c {
            '{' => 1,
            '}' => -1,
            _ => 0,
        })
        .sum()
}

fn parse_types_ts(source: &str) -> TsModel {
    let mut model = TsModel::default();
    let lines: Vec<&str> = source.lines().collect();
    let mut i = 0;
    let mut in_block_comment = false;
    let mut clean = Vec::with_capacity(lines.len());
    for line in &lines {
        let t = line.trim();
        if in_block_comment {
            if t.contains("*/") {
                in_block_comment = false;
            }
            clean.push(String::new());
            continue;
        }
        if t.starts_with("/*") {
            if !t.contains("*/") {
                in_block_comment = true;
            }
            clean.push(String::new());
            continue;
        }
        clean.push(strip_comment(line).to_string());
    }
    while i < clean.len() {
        let line = clean[i].trim().to_string();
        if let Some(rest) = line.strip_prefix("export interface ") {
            let header = rest.trim_end_matches('{').trim();
            let (name, parent) = match header.split_once(" extends ") {
                Some((n, p)) => (n.trim().to_string(), Some(p.trim().to_string())),
                None => (header.to_string(), None),
            };
            let mut fields: Vec<(String, String)> = parent
                .and_then(|p| model.interfaces.get(&p).cloned())
                .unwrap_or_default();
            let mut depth = brace_delta(&line);
            i += 1;
            while i < clean.len() && depth > 0 {
                let l = &clean[i];
                if depth == 1 {
                    if let Some(f) = parse_field(l) {
                        fields.push(f);
                    }
                }
                depth += brace_delta(l);
                i += 1;
            }
            model.interfaces.insert(name, fields);
            continue;
        }
        if line.starts_with("export type ExamSpec") {
            let mut depth = 0;
            let mut current: Option<Vec<(String, String)>> = None;
            i += 1;
            while i < clean.len() {
                let l = clean[i].trim().to_string();
                if depth == 0 && l.starts_with("| {") {
                    current = Some(Vec::new());
                } else if depth == 1 {
                    if let (Some(fields), Some(f)) = (current.as_mut(), parse_field(&l)) {
                        fields.push(f);
                    }
                }
                depth += brace_delta(&l);
                if depth == 0 {
                    if let Some(fields) = current.take() {
                        let tag = fields
                            .iter()
                            .find(|(n, _)| n == "type")
                            .map(|(_, t)| t.trim_matches('"').to_string())
                            .unwrap_or_default();
                        model.exam_spec.insert(tag, fields);
                    }
                    if l.ends_with(';') {
                        break;
                    }
                }
                i += 1;
            }
        }
        i += 1;
    }
    model
}

// ───────────────────────────── Comprobación recursiva ─────────────────────────────

fn check_fields(
    value: &Value,
    fields: &[(String, String)],
    model: &TsModel,
    path: &str,
    errors: &mut Vec<String>,
) {
    let Some(obj) = value.as_object() else {
        errors.push(format!("{path}: se esperaba un objeto y llega {value}"));
        return;
    };
    let expected: BTreeSet<&str> = fields.iter().map(|(n, _)| n.as_str()).collect();
    let actual: BTreeSet<&str> = obj.keys().map(String::as_str).collect();
    for missing in expected.difference(&actual) {
        errors.push(format!("{path}: falta la clave «{missing}»"));
    }
    for extra in actual.difference(&expected) {
        errors.push(format!("{path}: sobra la clave «{extra}»"));
    }
    for (name, ty) in fields {
        if let Some(v) = obj.get(name) {
            check_type(v, &parse_type(ty), model, &format!("{path}.{name}"), errors);
        }
    }
}

fn check_type(value: &Value, ty: &TsType, model: &TsModel, path: &str, errors: &mut Vec<String>) {
    if value.is_null() {
        return;
    }
    match ty {
        TsType::Named(name) if name == "ExamSpec" => {
            let tag = value
                .get("type")
                .and_then(Value::as_str)
                .unwrap_or_default();
            match model.exam_spec.get(tag) {
                Some(fields) => {
                    check_fields(value, fields, model, &format!("{path}<{tag}>"), errors)
                }
                None => errors.push(format!("{path}: variante de ExamSpec desconocida «{tag}»")),
            }
        }
        TsType::Named(name) => {
            if let Some(fields) = model.interfaces.get(name) {
                check_fields(value, fields, model, path, errors);
            }
        }
        TsType::Inline(fields) => check_fields(value, fields, model, path, errors),
        TsType::Array(inner) => match value.as_array() {
            Some(items) => {
                for (i, item) in items.iter().enumerate() {
                    check_type(item, inner, model, &format!("{path}[{i}]"), errors);
                }
            }
            None => errors.push(format!("{path}: se esperaba un array")),
        },
        TsType::Other => {}
    }
}

fn types_ts() -> Option<String> {
    let path = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("../../app/src/api/types.ts");
    std::fs::read_to_string(path).ok()
}

/// Registra los tipos comprobados y sus muestras.
struct Checker {
    model: TsModel,
    errors: Vec<String>,
    covered: BTreeSet<String>,
}

impl Checker {
    fn check<T: Serialize>(&mut self, interface: &str, value: &T) {
        let json = serde_json::to_value(value).expect("serializa");
        self.covered.insert(interface.to_string());
        let ty = TsType::Named(interface.to_string());
        if interface != "ExamSpec" && !self.model.interfaces.contains_key(interface) {
            self.errors
                .push(format!("types.ts no define «{interface}»"));
            return;
        }
        check_type(&json, &ty, &self.model, interface, &mut self.errors);
    }
}

#[test]
fn dto_keys_match_types_ts() {
    let Some(source) = types_ts() else {
        eprintln!("types.ts no disponible: se omite el test de contrato");
        return;
    };
    let model = parse_types_ts(&source);
    assert!(
        model.interfaces.len() > 30,
        "análisis de types.ts incompleto"
    );
    assert_eq!(
        model.exam_spec.len(),
        7,
        "variantes de ExamSpec: {:?}",
        model.exam_spec.keys()
    );
    let mut checker = Checker {
        model,
        errors: Vec::new(),
        covered: BTreeSet::new(),
    };

    let (mut engine, _, profile) = engine_with_profile();
    let mut settings = engine.get_settings(&profile).expect("ajustes");
    settings.preferred_localities = vec!["Sevilla".into(), "Barcelona".into()];
    settings.target_convocatoria = Some("li-test-obj".into());
    let settings = engine.update_settings(&profile, settings).expect("ajustes");
    checker.check("Settings", &settings);
    checker.check("AppInfo", &engine.get_app_info());
    checker.check("CatalogInfo", &engine.get_catalog());
    for l in engine.list_localities() {
        checker.check("LocalityInfo", &l);
    }
    checker.check("Profile", &engine.list_profiles().expect("perfiles")[0]);
    for t in engine.get_theory_index() {
        checker.check("TheorySummary", &t);
    }
    checker.check("TheoryTopic", &engine.get_theory("IV.1").expect("teoría"));

    // Examen oficial con corrección inmediata (imágenes, reservas, supuestos).
    let spec = ExamSpec::Official {
        bank_id: "tai-test-2024".into(),
        include_reserve: true,
        timed: true,
        feedback: FeedbackMode::Immediate,
        theory_block: None,
    };
    let paper = engine.start_exam(&profile, spec).expect("examen");
    checker.check("ExamPaper", &paper);
    let feedback = engine
        .check_answer(
            &paper.attempt_id,
            "tai-test-2024-p2-s2-001",
            Some(Letter::C),
        )
        .expect("feedback");
    checker.check("AnswerFeedback", &feedback);
    let progress = ProgressPayload {
        attempt_id: paper.attempt_id.clone(),
        answers: vec![AnswerState {
            question_id: "tai-test-2024-p1-001".into(),
            choice: None,
            flagged: true,
        }],
        chosen_case: None,
        elapsed_seconds: 10,
    };
    checker.check("ProgressPayload", &progress);
    engine.save_progress(&progress).expect("progreso");
    let active = engine
        .get_active_attempt(&profile)
        .expect("activo")
        .expect("en curso");
    checker.check("ActiveAttempt", &active);
    let result = engine
        .submit_exam(&progress_with(&paper, Some("p2-s2"), |id, _| {
            Some(wrong_letter(&engine, id))
        }))
        .expect("entrega");
    assert!(result.prediction.is_some());
    checker.check("AttemptResult", &result);
    for s in engine.list_attempts(&profile, None).expect("lista") {
        checker.check("AttemptSummary", &s);
    }
    let stats = engine.get_stats(&profile).expect("stats");
    assert!(stats.readiness.is_some() && !stats.by_topic.is_empty());
    checker.check("ProfileStats", &stats);
    let review = engine.get_review_summary(&profile).expect("repaso");
    assert!(!review.by_block.is_empty());
    checker.check("ReviewSummary", &review);
    let calc = engine
        .calculate_grade(
            Some(&profile),
            &ManualGradeInput {
                scheme_id: "tai-test".into(),
                parts: vec![ManualPartInput {
                    part: 1,
                    correct: 7,
                    wrong: 2,
                    blank: 1,
                }],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora");
    checker.check("CalculatorResult", &calc);
    let sim = engine
        .simulate_destinations(
            Some(&profile),
            None,
            Some(&ManualGradeInput {
                scheme_id: "tai-test".into(),
                parts: vec![ManualPartInput {
                    part: 1,
                    correct: 8,
                    wrong: 1,
                    blank: 1,
                }],
                cutoff_override_ratio: None,
            }),
        )
        .expect("simulador de destinos");
    checker.check("DestinationSimulation", &sim);
    checker.check(
        "ManualGradeInput",
        &ManualGradeInput {
            scheme_id: "tai-test".into(),
            parts: vec![ManualPartInput {
                part: 2,
                correct: 1,
                wrong: 1,
                blank: 1,
            }],
            cutoff_override_ratio: Some(0.4),
        },
    );
    checker.check(
        "RandomDraw",
        &engine.draw_random_exam(&profile).expect("sorteo"),
    );
    checker.check(
        "ApiError",
        &ApiError::from(CoreError::not_found("No existe el perfil.")),
    );

    for spec in [
        ExamSpec::Official {
            bank_id: "b".into(),
            include_reserve: true,
            timed: false,
            feedback: FeedbackMode::End,
            theory_block: None,
        },
        ExamSpec::Simulacro {
            scheme_id: None,
            part1_questions: Some(80),
            include_case: true,
            duration_minutes: None,
            prefer_unseen: true,
            seed: Some(1),
            feedback: FeedbackMode::End,
            freestyle: false,
        },
        ExamSpec::Numbered {
            number: 3,
            feedback: FeedbackMode::Immediate,
            timed: true,
        },
        ExamSpec::Random {
            feedback: FeedbackMode::End,
            timed: true,
        },
        ExamSpec::Practice {
            blocks: vec![BlockId::I],
            topics: vec!["I.1".into()],
            bank_ids: vec![],
            include_cases: true,
            source: QuestionSource::Failed,
            count: 10,
            feedback: FeedbackMode::Immediate,
            duration_minutes: None,
            seed: None,
        },
        ExamSpec::Review {
            count: 5,
            feedback: FeedbackMode::End,
        },
        ExamSpec::Case {
            bank_id: "b".into(),
            section_id: "s".into(),
            feedback: FeedbackMode::End,
            timed: true,
        },
    ] {
        checker.check("ExamSpec", &spec);
    }

    assert!(
        checker.errors.is_empty(),
        "diferencias con types.ts:\n{}",
        checker.errors.join("\n")
    );
    // Las interfaces exigidas en la tarea están cubiertas.
    for required in [
        "ExamPaper",
        "AttemptResult",
        "ProfileStats",
        "ExamSpec",
        "CatalogInfo",
    ] {
        assert!(
            checker.covered.contains(required),
            "{required} sin comprobar"
        );
    }
}

#[test]
fn enum_strings_match_types_ts() {
    let json = |v: &dyn erased::Ser| v.to_json();
    assert_eq!(json(&tai_core::api::ExamMode::Simulacro), "\"simulacro\"");
    assert_eq!(
        json(&tai_core::api::ItemStatus::NotCounted),
        "\"not_counted\""
    );
    assert_eq!(
        json(&tai_core::api::CutoffSource::Estimated),
        "\"estimated\""
    );
    assert_eq!(
        json(&tai_core::api::DataQuality::Synthetic),
        "\"synthetic\""
    );
    assert_eq!(
        json(&tai_core::api::AttemptStatus::InProgress),
        "\"in_progress\""
    );
    assert_eq!(
        json(&tai_core::api::RandomDrawKind::Numbered),
        "\"numbered\""
    );
    assert_eq!(json(&tai_core::api::QuestionSource::Unseen), "\"unseen\"");
    assert_eq!(json(&tai_core::api::Theme::System), "\"system\"");
    assert_eq!(
        json(&tai_core::api::AnswerKey::Provisional),
        "\"provisional\""
    );
    assert_eq!(
        json(&tai_core::api::ConvocatoriaStatus::ExamenRealizado),
        "\"examen_realizado\""
    );
    assert_eq!(json(&tai_core::api::CutoffBasis::Rank), "\"rank\"");
    assert_eq!(
        json(&tai_core::ApiErrorCode::InvalidInput),
        "\"invalid_input\""
    );
    assert_eq!(json(&tai_core::api::TierId::GranCiudad), "\"gran_ciudad\"");
    // Una unión `ExamSpec` se lee igual que la envía la interfaz (con `type`).
    let spec: ExamSpec =
        serde_json::from_str(r#"{"type":"numbered","number":7,"feedback":"immediate"}"#)
            .expect("spec");
    assert_eq!(
        spec,
        ExamSpec::Numbered {
            number: 7,
            feedback: FeedbackMode::Immediate,
            timed: true,
        }
    );
}

/// Serialización sin genéricos para la tabla de enums.
mod erased {
    pub trait Ser {
        fn to_json(&self) -> String;
    }
    impl<T: serde::Serialize> Ser for T {
        fn to_json(&self) -> String {
            serde_json::to_string(self).unwrap_or_default()
        }
    }
}
