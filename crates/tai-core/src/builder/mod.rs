// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Generación de exámenes (`start_exam`), ver `docs/CONTRATO-API.md`.
//!
//! - **official**: réplica de un examen oficial (reservas opcionales, supuesto a elegir).
//! - **simulacro**: 1.ª parte estratificada por bloque + supuestos de los bloques III y IV.
//! - **practice**: test filtrado por bloques/temas/bancos y origen (no vistas, falladas…).
//! - **review**: repaso espaciado (vencidas primero).
//! - **case**: un supuesto práctico concreto.
//! - **numbered**: «Simulacro OpoTAI n.º N», composición fija para cada N.
//!
//! `random` (simulacro sorpresa) lo resuelve el [`crate::Engine`] con un sorteo y llega aquí
//! convertido en `official` o `numbered`.
//!
//! Todo el azar procede de un `ChaCha8Rng` con semilla: con la misma semilla, el mismo
//! catálogo y el mismo historial se obtiene exactamente el mismo examen. El examen generado
//! ([`crate::paper::StoredPaper`]) nunca contiene respuestas ni explicaciones.

mod numbered;
mod official;
mod practice;
mod simulacro;

pub use numbered::is_complete_official;
pub use simulacro::{block_shares, quotas};

use std::collections::{HashMap, HashSet};

use chrono::{DateTime, Utc};
use rand::{Rng, SeedableRng};
use rand_chacha::ChaCha8Rng;

use crate::api::ExamSpec;
use crate::catalog::{Catalog, QuestionRef};
use crate::error::CoreResult;
use crate::history::QuestionStat;
use crate::model::{BlockId, Question};
use crate::paper::{StoredQuestion, StoredSection};
use crate::util::normalize_key;

/// Máximo de preguntas de un test generado.
pub const MAX_QUESTIONS: u32 = 500;

/// Datos necesarios para generar un examen.
#[derive(Debug, Clone, Copy)]
pub struct BuildContext<'a> {
    pub catalog: &'a Catalog,
    /// Historial del perfil por id de pregunta.
    pub history: &'a HashMap<String, QuestionStat>,
    /// Límite de «vence hoy» para el repaso (inicio del día local siguiente, en UTC).
    pub due_limit: DateTime<Utc>,
    /// Esquema de la convocatoria objetivo del perfil: da el valor y la resta de la práctica y
    /// del repaso (−1/4 si prepara promoción interna). `None` = esquema por defecto.
    pub practice_base: Option<&'a crate::model::ScoringScheme>,
}

impl BuildContext<'_> {
    fn stat(&self, id: &str) -> Option<&QuestionStat> {
        self.history.get(id)
    }

    fn seen(&self, id: &str) -> bool {
        self.stat(id).is_some_and(|s| s.seen > 0)
    }
}

/// Examen generado y especificación efectiva (con la semilla usada).
#[derive(Debug, Clone)]
pub struct BuiltExam {
    pub paper: crate::paper::StoredPaper,
    pub spec: ExamSpec,
}

/// Genera el examen descrito por `spec`.
pub fn build(ctx: &BuildContext<'_>, spec: &ExamSpec) -> CoreResult<BuiltExam> {
    match spec {
        ExamSpec::Official {
            bank_id,
            include_reserve,
            timed,
            feedback,
            theory_block,
        } => Ok(BuiltExam {
            paper: official::build(
                ctx,
                bank_id,
                *include_reserve,
                *timed,
                *feedback,
                *theory_block,
            )?,
            spec: spec.clone(),
        }),
        ExamSpec::Simulacro {
            scheme_id,
            part1_questions,
            include_case,
            duration_minutes,
            prefer_unseen,
            seed,
            feedback,
            freestyle,
        } => {
            let seed = seed_or_random(*seed);
            let paper = simulacro::build(
                ctx,
                &simulacro::SimulacroOptions {
                    scheme_id: scheme_id.as_deref(),
                    part1_questions: *part1_questions,
                    include_case: *include_case,
                    duration_minutes: *duration_minutes,
                    prefer_unseen: *prefer_unseen,
                    seed,
                    feedback: *feedback,
                    freestyle: *freestyle,
                },
            )?;
            Ok(BuiltExam {
                paper,
                spec: ExamSpec::Simulacro {
                    scheme_id: scheme_id.clone(),
                    part1_questions: *part1_questions,
                    include_case: *include_case,
                    duration_minutes: *duration_minutes,
                    prefer_unseen: *prefer_unseen,
                    seed: Some(seed),
                    feedback: *feedback,
                    freestyle: *freestyle,
                },
            })
        }
        ExamSpec::Numbered {
            number,
            feedback,
            timed,
        } => Ok(BuiltExam {
            paper: numbered::build(ctx, *number, *feedback, *timed)?,
            spec: spec.clone(),
        }),
        ExamSpec::Random { .. } => Err(crate::error::CoreError::internal(
            "el simulacro sorpresa debe sortearse antes de generarlo",
        )),
        ExamSpec::Practice {
            blocks,
            topics,
            bank_ids,
            include_cases,
            source,
            count,
            feedback,
            duration_minutes,
            seed,
        } => {
            let seed = seed_or_random(*seed);
            let paper = practice::build_practice(
                ctx,
                &practice::PracticeOptions {
                    blocks,
                    topics,
                    bank_ids,
                    include_cases: *include_cases,
                    source: *source,
                    count: *count,
                    feedback: *feedback,
                    duration_minutes: *duration_minutes,
                    seed,
                },
            )?;
            Ok(BuiltExam {
                paper,
                spec: ExamSpec::Practice {
                    blocks: blocks.clone(),
                    topics: topics.clone(),
                    bank_ids: bank_ids.clone(),
                    include_cases: *include_cases,
                    source: *source,
                    count: *count,
                    feedback: *feedback,
                    duration_minutes: *duration_minutes,
                    seed: Some(seed),
                },
            })
        }
        ExamSpec::Review { count, feedback } => Ok(BuiltExam {
            paper: practice::build_review(ctx, *count, *feedback)?,
            spec: spec.clone(),
        }),
        ExamSpec::Case {
            bank_id,
            section_id,
            feedback,
            timed,
        } => Ok(BuiltExam {
            paper: practice::build_case(ctx, bank_id, section_id, *feedback, *timed)?,
            spec: spec.clone(),
        }),
    }
}

// ───────────────────────────── Utilidades comunes ─────────────────────────────

/// Semilla indicada o una aleatoria.
fn seed_or_random(seed: Option<u64>) -> u64 {
    seed.unwrap_or_else(rand::random)
}

/// Generador determinista.
fn rng_from(seed: u64) -> ChaCha8Rng {
    ChaCha8Rng::seed_from_u64(seed)
}

/// Clave para detectar preguntas repetidas entre bancos (enunciado + opciones).
pub fn dedupe_key(q: &Question) -> String {
    let mut key = normalize_key(&q.text);
    for option in &q.options {
        key.push('\u{1f}');
        key.push_str(&normalize_key(option));
    }
    key
}

/// Candidata con clave aleatoria para ordenar de forma reproducible.
#[derive(Debug, Clone, Copy)]
struct Candidate<'a> {
    r: QuestionRef<'a>,
    key: u64,
}

/// Asigna claves aleatorias (en el orden estable del catálogo) y elimina duplicados.
fn candidates<'a>(
    refs: impl Iterator<Item = QuestionRef<'a>>,
    rng: &mut ChaCha8Rng,
) -> Vec<Candidate<'a>> {
    let mut seen_keys = HashSet::new();
    let mut out = Vec::new();
    for r in refs {
        if !seen_keys.insert(dedupe_key(r.question)) {
            continue;
        }
        out.push(Candidate {
            r,
            key: rng.next_u64(),
        });
    }
    out
}

/// Orden de bloque para presentar preguntas (I → IV y sin clasificar al final).
fn block_rank(block: Option<BlockId>) -> u8 {
    match block {
        Some(BlockId::I) => 0,
        Some(BlockId::II) => 1,
        Some(BlockId::III) => 2,
        Some(BlockId::IV) => 3,
        None => 4,
    }
}

/// Agrupa preguntas sueltas en secciones: una de cuestionario (`p1`) y una por supuesto de
/// origen (`p2-<banco>-<sección>`, con su enunciado). Numeración correlativa.
fn group_sections(refs: &[QuestionRef<'_>]) -> Vec<StoredSection> {
    let mut theory = Vec::new();
    let mut cases: Vec<(String, &QuestionRef<'_>, Vec<&QuestionRef<'_>>)> = Vec::new();
    for r in refs {
        match r.section.kind {
            crate::model::SectionKind::Theory => theory.push(r),
            crate::model::SectionKind::Case => {
                let id = case_section_id(r.bank.id.as_str(), r.section.id.as_str());
                if let Some(entry) = cases.iter_mut().find(|(cid, _, _)| *cid == id) {
                    entry.2.push(r);
                } else {
                    cases.push((id, r, vec![r]));
                }
            }
        }
    }
    let mut sections = Vec::new();
    let mut number = 0u32;
    let mut next = || {
        number += 1;
        number.to_string()
    };
    if !theory.is_empty() {
        sections.push(StoredSection {
            id: "p1".to_string(),
            part: 1,
            kind: crate::model::SectionKind::Theory,
            title: "Preguntas".to_string(),
            block: None,
            source_bank: None,
            source_section: None,
            questions: theory
                .iter()
                .map(|r| StoredQuestion {
                    id: r.question.id.clone(),
                    display_number: next(),
                    is_reserve: false,
                })
                .collect(),
        });
    }
    for (id, first, list) in cases {
        sections.push(StoredSection {
            id,
            part: first.section.part.max(2),
            kind: crate::model::SectionKind::Case,
            title: case_title(first),
            block: first.section.block,
            source_bank: Some(first.bank.id.clone()),
            source_section: Some(first.section.id.clone()),
            questions: list
                .iter()
                .map(|r| StoredQuestion {
                    id: r.question.id.clone(),
                    display_number: next(),
                    is_reserve: false,
                })
                .collect(),
        });
    }
    sections
}

/// Id de una sección de supuesto en exámenes generados.
fn case_section_id(bank_id: &str, section_id: &str) -> String {
    format!("p2-{bank_id}-{section_id}")
}

/// Título de un supuesto: «Supuesto práctico · Bloque III · Oficial TAI-LI 2024».
fn case_title(r: &QuestionRef<'_>) -> String {
    let mut title = if r.section.title.trim().is_empty() {
        "Supuesto práctico".to_string()
    } else {
        r.section.title.trim().to_string()
    };
    if let Some(block) = r.section.block {
        if !title.contains(block.as_str()) || !title.to_lowercase().contains("bloque") {
            title.push_str(&format!(" · Bloque {}", block.as_str()));
        }
    }
    format!("{title} · {}", r.bank.short_label())
}

/// Duración final: `None`/`Some(0)` → sin límite.
fn optional_duration(minutes: Option<u32>) -> Option<u32> {
    minutes.filter(|m| *m > 0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn dedupe_key_ignores_case_and_accents() {
        let a = Question {
            id: "a".into(),
            number: 1,
            text: "¿Qué   es HTTP?".into(),
            options: vec!["Un protocolo".into(), "b".into(), "c".into(), "d".into()],
            answer: Some(crate::model::Letter::A),
            annulled: false,
            topic: None,
            explanation: None,
            option_notes: None,
            references: vec![],
            tags: vec![],
            media: vec![],
            outdated: false,
            outdated_note: None,
            needs_review: false,
        };
        let mut b = a.clone();
        b.id = "b".into();
        b.text = "¿qué es http?".into();
        assert_eq!(dedupe_key(&a), dedupe_key(&b));
        b.options[1] = "otra".into();
        assert_ne!(dedupe_key(&a), dedupe_key(&b));
    }
}
