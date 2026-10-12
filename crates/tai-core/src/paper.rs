// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Estructura de un examen generado tal y como se guarda en `attempts.paper_json`.
//!
//! Solo contiene ids y numeración (no textos) para poder recalcular la revisión con el banco
//! actual. [`StoredPaper::to_exam_paper`] la convierte en el `ExamPaper` del contrato
//! **sin respuestas ni explicaciones**.

use serde::{Deserialize, Serialize};

use crate::api::{CaseStatement, ExamMode, ExamPaper, FeedbackMode, PaperQuestion, PaperSection};
use crate::catalog::{Catalog, QuestionRef};
use crate::model::{BlockId, ScoringScheme, SectionKind};

/// Versión del formato de `paper_json`.
pub const PAPER_FORMAT_VERSION: u32 = 1;

/// Pregunta del examen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoredQuestion {
    pub id: String,
    pub display_number: String,
    /// Actúa como pregunta de reserva (solo en réplicas oficiales).
    #[serde(default)]
    pub is_reserve: bool,
}

/// Sección del examen.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct StoredSection {
    pub id: String,
    pub part: u32,
    pub kind: SectionKind,
    pub title: String,
    #[serde(default)]
    pub block: Option<BlockId>,
    /// Banco y sección de origen (para el enunciado y las imágenes del supuesto).
    #[serde(default)]
    pub source_bank: Option<String>,
    #[serde(default)]
    pub source_section: Option<String>,
    pub questions: Vec<StoredQuestion>,
}

/// Examen generado.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StoredPaper {
    pub version: u32,
    pub mode: ExamMode,
    pub title: String,
    #[serde(default)]
    pub subtitle: Option<String>,
    pub scheme: ScoringScheme,
    #[serde(default)]
    pub duration_minutes: Option<u32>,
    pub feedback: FeedbackMode,
    pub requires_case_choice: bool,
    pub cases_to_choose: u32,
    /// Réplica oficial: las anuladas se sustituyen por reservas al corregir.
    #[serde(default)]
    pub replace_annulled: bool,
    /// Procede del sorteo del simulacro sorpresa.
    #[serde(default)]
    pub drawn: bool,
    pub sections: Vec<StoredSection>,
}

impl StoredPaper {
    /// Sección por id.
    pub fn section(&self, id: &str) -> Option<&StoredSection> {
        self.sections.iter().find(|s| s.id == id)
    }

    /// Ids de los supuestos que se pueden elegir.
    pub fn case_section_ids(&self) -> Vec<&str> {
        self.sections
            .iter()
            .filter(|s| s.kind == SectionKind::Case)
            .map(|s| s.id.as_str())
            .collect()
    }

    /// Contiene la pregunta.
    pub fn contains_question(&self, question_id: &str) -> bool {
        self.sections
            .iter()
            .any(|s| s.questions.iter().any(|q| q.id == question_id))
    }

    /// Preguntas puntuables: sin reservas ni supuestos no elegidos.
    pub fn total_questions(&self, catalog: &Catalog) -> u32 {
        let countable = |section: &StoredSection| -> u32 {
            let mut main = 0u32;
            let mut annulled = 0u32;
            let mut usable_reserve = 0u32;
            for q in &section.questions {
                let Some(r) = catalog.question(&q.id) else {
                    continue;
                };
                let void = r.question.counts_as_annulled();
                if q.is_reserve {
                    if !void {
                        usable_reserve += 1;
                    }
                } else {
                    main += 1;
                    if void {
                        annulled += 1;
                    }
                }
            }
            let replaced = if self.replace_annulled {
                annulled.min(usable_reserve)
            } else {
                0
            };
            main - annulled + replaced
        };
        let mut total = 0;
        let mut best_case = 0;
        for section in &self.sections {
            if self.requires_case_choice && section.kind == SectionKind::Case {
                best_case = best_case.max(countable(section));
            } else {
                total += countable(section);
            }
        }
        total + best_case * self.cases_to_choose.max(1) * u32::from(self.requires_case_choice)
    }

    /// Enunciados (con imágenes) de los supuestos del examen: el elegido o, si no había que
    /// elegir, todos.
    pub fn case_statements(&self, catalog: &Catalog, chosen: Option<&str>) -> Vec<CaseStatement> {
        self.sections
            .iter()
            .filter(|s| s.kind == SectionKind::Case)
            .filter(|s| !self.requires_case_choice || chosen.is_none_or(|c| c == s.id))
            .filter_map(|section| {
                let origin = section
                    .source_bank
                    .as_deref()
                    .and_then(|b| catalog.bank(b))
                    .and_then(|bank| {
                        section
                            .source_section
                            .as_deref()
                            .and_then(|s| bank.section(s))
                    })?;
                let statement = catalog.rewrite_opt(origin.statement.as_deref())?;
                Some(CaseStatement {
                    section_id: section.id.clone(),
                    title: section.title.clone(),
                    statement,
                    media: catalog.resolve_media(&origin.media),
                })
            })
            .collect()
    }

    /// Convierte el examen guardado en el `ExamPaper` del contrato (sin soluciones).
    pub fn to_exam_paper(
        &self,
        catalog: &Catalog,
        attempt_id: &str,
        profile_id: &str,
        started_at: &str,
    ) -> ExamPaper {
        let sections = self
            .sections
            .iter()
            .map(|section| {
                let origin = section
                    .source_bank
                    .as_deref()
                    .and_then(|b| catalog.bank(b))
                    .and_then(|bank| {
                        section
                            .source_section
                            .as_deref()
                            .and_then(|s| bank.section(s))
                    });
                PaperSection {
                    id: section.id.clone(),
                    part: section.part,
                    kind: section.kind,
                    title: section.title.clone(),
                    block: section.block,
                    statement: origin.and_then(|s| catalog.rewrite_opt(s.statement.as_deref())),
                    media: origin
                        .map(|s| catalog.resolve_media(&s.media))
                        .unwrap_or_default(),
                    questions: section
                        .questions
                        .iter()
                        .filter_map(|q| {
                            catalog.question(&q.id).map(|r| {
                                paper_question(catalog, &r, &q.display_number, q.is_reserve)
                            })
                        })
                        .collect(),
                }
            })
            .collect();
        ExamPaper {
            attempt_id: attempt_id.to_string(),
            profile_id: profile_id.to_string(),
            mode: self.mode,
            title: self.title.clone(),
            subtitle: self.subtitle.clone(),
            scheme: self.scheme.clone(),
            duration_minutes: self.duration_minutes,
            feedback: self.feedback,
            requires_case_choice: self.requires_case_choice,
            cases_to_choose: self.cases_to_choose,
            sections,
            started_at: started_at.to_string(),
            total_questions: self.total_questions(catalog),
            drawn: self.drawn,
        }
    }

    /// Preguntas titulares de la 1.ª parte (cuestionario) y número de supuestos.
    pub fn shape(&self) -> (u32, u32) {
        let theory = self
            .sections
            .iter()
            .filter(|s| s.kind == SectionKind::Theory)
            .map(|s| s.questions.iter().filter(|q| !q.is_reserve).count() as u32)
            .sum();
        let cases = self
            .sections
            .iter()
            .filter(|s| s.kind == SectionKind::Case)
            .count() as u32;
        (theory, cases)
    }
}

/// Etiqueta de procedencia: «Oficial TAI-LI 2024 · 1.ª parte · n.º 12».
pub fn source_label(r: &QuestionRef<'_>) -> String {
    let base = r.bank.short_label();
    let part = match r.section.kind {
        SectionKind::Theory => format!("{}.ª parte", r.section.part),
        SectionKind::Case => {
            let title = r.section.title.trim();
            if title.is_empty() {
                "Supuesto práctico".to_string()
            } else {
                title.to_string()
            }
        }
    };
    let number = if r.is_reserve {
        format!("reserva n.º {}", r.question.number)
    } else {
        format!("n.º {}", r.question.number)
    };
    format!("{base} · {part} · {number}")
}

/// Pregunta del contrato sin respuesta ni explicación (imágenes en línea ya resueltas).
pub fn paper_question(
    catalog: &Catalog,
    r: &QuestionRef<'_>,
    display_number: &str,
    is_reserve: bool,
) -> PaperQuestion {
    PaperQuestion {
        id: r.question.id.clone(),
        number: r.question.number,
        display_number: display_number.to_string(),
        text: catalog.rewrite_markdown(&r.question.text),
        options: catalog.rewrite_all(&r.question.options),
        is_reserve,
        topic: r.question.topic.clone(),
        block: r.block(),
        media: catalog.resolve_media(&r.question.media),
        source_label: source_label(r),
    }
}
