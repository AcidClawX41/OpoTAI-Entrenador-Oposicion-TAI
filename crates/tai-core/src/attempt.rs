// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Evaluación de un intento: estado de cada pregunta, sustitución de anuladas por reservas,
//! elección del supuesto, revisión pregunta a pregunta y respuesta inmediata.
//!
//! Reglas (ver `docs/CONTRATO-API.md`, «Corrección»):
//!
//! - Respuesta a pregunta anulada → `annulled`, no cuenta.
//! - En réplica oficial, la k-ésima anulada de una sección se sustituye por la k-ésima reserva
//!   no anulada de esa sección; las reservas no usadas son `not_counted`.
//! - Supuestos: solo cuenta el elegido. Si no se eligió y solo hay respuestas en uno, se elige
//!   ese automáticamente; si hay respuestas en varios y ninguno elegido, la 2.ª parte cuenta
//!   como en blanco (como en el examen real).

use std::collections::{BTreeMap, HashMap};

use crate::api::{AnswerFeedback, AnswerState, ItemStatus, ReviewItem};
use crate::catalog::{Catalog, QuestionRef};
use crate::model::{BlockId, Letter, SectionKind};
use crate::paper::{StoredPaper, StoredSection, source_label};
use crate::scoring::PartCounts;

/// Pregunta evaluada.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EvaluatedItem {
    pub section_id: String,
    pub part: u32,
    pub question_id: String,
    pub display_number: String,
    pub is_reserve: bool,
    pub status: ItemStatus,
    pub choice: Option<Letter>,
    pub flagged: bool,
    pub block: Option<BlockId>,
    pub topic: Option<String>,
}

/// Resultado de evaluar un intento.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Evaluation {
    /// Preguntas en el orden del examen.
    pub items: Vec<EvaluatedItem>,
    /// Recuento por parte (solo secciones que puntúan).
    pub counts: Vec<PartCounts>,
    /// Notas legibles (reservas aplicadas, supuesto elegido…).
    pub notes: Vec<String>,
    /// Supuesto que cuenta (elegido o deducido).
    pub chosen_case: Option<String>,
}

fn status_for(r: &QuestionRef<'_>, choice: Option<Letter>) -> ItemStatus {
    if r.question.counts_as_annulled() {
        return ItemStatus::Annulled;
    }
    match choice {
        None => ItemStatus::Blank,
        Some(c) if Some(c) == r.question.answer => ItemStatus::Correct,
        Some(_) => ItemStatus::Wrong,
    }
}

/// Decide qué supuesto cuenta y anota la decisión.
fn resolve_case_choice(
    paper: &StoredPaper,
    answers: &HashMap<String, AnswerState>,
    chosen_case: Option<&str>,
    notes: &mut Vec<String>,
) -> Option<String> {
    let cases: Vec<&StoredSection> = paper
        .sections
        .iter()
        .filter(|s| s.kind == SectionKind::Case)
        .collect();
    if cases.is_empty() {
        return None;
    }
    if !paper.requires_case_choice {
        return None;
    }
    if let Some(chosen) = chosen_case {
        if cases.iter().any(|s| s.id == chosen) {
            return Some(chosen.to_string());
        }
        notes.push("El supuesto elegido no forma parte de este examen; se ignora.".to_string());
    }
    let answered: Vec<&&StoredSection> = cases
        .iter()
        .filter(|s| {
            s.questions
                .iter()
                .any(|q| answers.get(&q.id).is_some_and(|a| a.choice.is_some()))
        })
        .collect();
    match answered.as_slice() {
        [only] => {
            notes.push(format!(
                "No elegiste supuesto: se corrige «{}» porque es el único con respuestas.",
                only.title
            ));
            Some(only.id.clone())
        }
        [] => {
            notes.push(
                "No elegiste supuesto práctico: la 2.ª parte cuenta como en blanco.".to_string(),
            );
            None
        }
        _ => {
            notes.push(
                "No elegiste supuesto y hay respuestas en varios: la 2.ª parte cuenta como en \
                 blanco, como en el examen real."
                    .to_string(),
            );
            None
        }
    }
}

/// Evalúa las respuestas de un intento.
pub fn evaluate(
    paper: &StoredPaper,
    catalog: &Catalog,
    answers: &HashMap<String, AnswerState>,
    chosen_case: Option<&str>,
) -> Evaluation {
    let mut notes = Vec::new();
    let effective_case = resolve_case_choice(paper, answers, chosen_case, &mut notes);
    let mut counts: BTreeMap<u32, PartCounts> = BTreeMap::new();
    let mut items = Vec::new();
    let mut missing = 0usize;
    let mut blank_case_part: Option<(u32, u32)> = None;

    for section in &paper.sections {
        let is_case_choice = paper.requires_case_choice && section.kind == SectionKind::Case;
        let counts_section =
            !is_case_choice || effective_case.as_deref() == Some(section.id.as_str());

        let resolved: Vec<(usize, QuestionRef<'_>)> = section
            .questions
            .iter()
            .enumerate()
            .filter_map(|(i, q)| match catalog.question(&q.id) {
                Some(r) => Some((i, r)),
                None => {
                    missing += 1;
                    None
                }
            })
            .collect();

        // Reservas que sustituyen a anuladas (réplica oficial).
        let mut used_reserves: Vec<usize> = Vec::new();
        let mut annulled_main = 0u32;
        if counts_section {
            annulled_main = resolved
                .iter()
                .filter(|(i, r)| {
                    !section.questions[*i].is_reserve && r.question.counts_as_annulled()
                })
                .count() as u32;
            if paper.replace_annulled && annulled_main > 0 {
                used_reserves = resolved
                    .iter()
                    .filter(|(i, r)| {
                        section.questions[*i].is_reserve && !r.question.counts_as_annulled()
                    })
                    .map(|(i, _)| *i)
                    .take(annulled_main as usize)
                    .collect();
                if !used_reserves.is_empty() {
                    notes.push(format!(
                        "{}: {} pregunta(s) anulada(s) sustituida(s) por reserva.",
                        section.title,
                        used_reserves.len()
                    ));
                }
                let uncovered = annulled_main as usize - used_reserves.len();
                if uncovered > 0 {
                    notes.push(format!(
                        "{}: {uncovered} pregunta(s) anulada(s) sin reserva disponible no se \
                         contabilizan.",
                        section.title
                    ));
                }
            }
        }

        let entry = counts
            .entry(section.part)
            .or_insert_with(|| PartCounts::new(section.part));
        if counts_section {
            entry.annulled += annulled_main;
        }
        for (i, r) in &resolved {
            let stored = &section.questions[*i];
            let answer = answers.get(&stored.id);
            let choice = answer.and_then(|a| a.choice);
            let flagged = answer.is_some_and(|a| a.flagged);
            // No puntúa: supuesto no elegido o reserva que no sustituye a ninguna anulada.
            let excluded = !counts_section || (stored.is_reserve && !used_reserves.contains(i));
            let status = if !excluded {
                status_for(r, choice)
            } else if r.question.counts_as_annulled() {
                ItemStatus::Annulled
            } else {
                ItemStatus::NotCounted
            };
            match status {
                ItemStatus::Correct => entry.correct += 1,
                ItemStatus::Wrong => entry.wrong += 1,
                ItemStatus::Blank => entry.blank += 1,
                ItemStatus::Annulled | ItemStatus::NotCounted => {}
            }
            items.push(EvaluatedItem {
                section_id: section.id.clone(),
                part: section.part,
                question_id: stored.id.clone(),
                display_number: stored.display_number.clone(),
                is_reserve: stored.is_reserve,
                status,
                choice,
                flagged,
                block: r.block(),
                topic: r.question.topic.clone(),
            });
        }
        if is_case_choice && effective_case.is_none() && blank_case_part.is_none() {
            let countable = resolved
                .iter()
                .filter(|(i, r)| {
                    !section.questions[*i].is_reserve && !r.question.counts_as_annulled()
                })
                .count() as u32;
            blank_case_part = Some((section.part, countable));
        }
    }

    // Sin supuesto elegido: la 2.ª parte cuenta entera como en blanco.
    if let Some((part, countable)) = blank_case_part {
        let entry = counts.entry(part).or_insert_with(|| PartCounts::new(part));
        // Preguntas por supuesto según el esquema (las que puntuarían), o las del supuesto.
        let per_case = paper
            .scheme
            .part(part)
            .map(|p| p.questions)
            .filter(|q| *q > 0)
            .unwrap_or(countable);
        entry.blank += per_case;
    }
    if missing > 0 {
        notes.push(format!(
            "{missing} pregunta(s) ya no existen en el banco actual y no se contabilizan."
        ));
    }

    Evaluation {
        items,
        counts: counts.into_values().collect(),
        notes,
        chosen_case: effective_case,
    }
}

/// Revisión pregunta a pregunta con explicaciones (para `AttemptResult.review`).
pub fn review_items(catalog: &Catalog, evaluation: &Evaluation) -> Vec<ReviewItem> {
    evaluation
        .items
        .iter()
        .filter_map(|item| {
            let r = catalog.question(&item.question_id)?;
            Some(ReviewItem {
                question_id: item.question_id.clone(),
                section_id: item.section_id.clone(),
                part: item.part,
                display_number: item.display_number.clone(),
                text: catalog.rewrite_markdown(&r.question.text),
                options: catalog.rewrite_all(&r.question.options),
                chosen: item.choice,
                correct: r.question.answer,
                status: item.status,
                is_reserve: item.is_reserve,
                flagged: item.flagged,
                explanation: catalog.rewrite_opt(r.question.explanation.as_deref()),
                option_notes: catalog.rewrite_notes(r.question.option_notes.as_ref()),
                references: r.question.references.clone(),
                topic: r.question.topic.clone(),
                block: r.block(),
                media: catalog.resolve_media(&r.question.media),
                source_label: source_label(&r),
                outdated: r.question.outdated,
                outdated_note: r.question.outdated_note.clone(),
            })
        })
        .collect()
}

/// Respuesta inmediata a una pregunta (imágenes en línea ya resueltas).
pub fn feedback(catalog: &Catalog, r: &QuestionRef<'_>, choice: Option<Letter>) -> AnswerFeedback {
    let annulled = r.question.counts_as_annulled();
    AnswerFeedback {
        question_id: r.question.id.clone(),
        chosen: choice,
        correct: r.question.answer,
        is_correct: !annulled && choice.is_some() && choice == r.question.answer,
        annulled,
        explanation: catalog.rewrite_opt(r.question.explanation.as_deref()),
        option_notes: catalog.rewrite_notes(r.question.option_notes.as_ref()),
        references: r.question.references.clone(),
    }
}
