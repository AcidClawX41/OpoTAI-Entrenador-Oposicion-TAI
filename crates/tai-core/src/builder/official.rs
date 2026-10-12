// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Réplica de un examen oficial.

use super::BuildContext;
use crate::api::{ExamMode, FeedbackMode};
use crate::error::{CoreError, CoreResult};
use crate::model::{Bank, BlockId, ScoringScheme, SectionKind};
use crate::paper::{PAPER_FORMAT_VERSION, StoredPaper, StoredQuestion, StoredSection};
use crate::util::fmt_date_es;

/// Partes del examen presentes en los bancos (ordenadas, sin repetir).
fn present_parts(banks: &[&Bank]) -> Vec<u32> {
    let mut parts: Vec<u32> = banks
        .iter()
        .flat_map(|b| b.sections.iter().map(|s| s.part))
        .collect();
    parts.sort_unstable();
    parts.dedup();
    parts
}

/// Esquema del banco o, si no se conoce, uno aproximado a partir del esquema por defecto.
///
/// Si el banco solo contiene algunas partes de su esquema (p. ej. un ejercicio cuya plantilla
/// no se publicó), la réplica se califica con el esquema restringido a las partes presentes.
pub(super) fn scheme_for_bank(ctx: &BuildContext<'_>, bank: &Bank) -> ScoringScheme {
    scheme_for_exam(ctx, bank, None)
}

/// Esquema de la réplica de `bank` junto con su ejercicio complementario, si lo hay (las partes
/// presentes son las de ambos bancos y la duración, la suma de las de los dos ejercicios).
fn scheme_for_exam(ctx: &BuildContext<'_>, bank: &Bank, companion: Option<&Bank>) -> ScoringScheme {
    let banks: Vec<&Bank> = std::iter::once(bank).chain(companion).collect();
    let present = present_parts(&banks);
    if let Some(scheme) = bank
        .scoring_scheme
        .as_deref()
        .and_then(|id| ctx.catalog.scheme(id))
    {
        let complete = scheme.parts.iter().all(|p| present.contains(&p.part));
        if complete || present.is_empty() {
            return scheme.clone();
        }
        let mut partial = scheme.restricted_to_parts(&present);
        let titles: Vec<&str> = partial.parts.iter().map(|p| p.title.as_str()).collect();
        let exam_duration = exam_duration(&banks);
        partial.id = format!("{}-{}", scheme.id, bank.id);
        partial.notes = Some(format!(
            "Este banco solo incluye {} del examen de {}: se califica como réplica de esa parte, \
             con su corte y su escala oficiales.",
            titles.join(" y "),
            scheme.title
        ));
        if let Some(minutes) = exam_duration {
            partial.duration_minutes = minutes;
        }
        return partial;
    }
    let base = ctx.catalog.default_scheme();
    let mut scheme = base.clone();
    scheme = scheme.restricted_to_parts(&present);
    for part in &mut scheme.parts {
        if let Some(section) = bank.sections.iter().find(|s| s.part == part.part) {
            part.questions = section.questions.len() as u32;
            part.reserve = section.reserve.len() as u32;
        }
        if part.kind == SectionKind::Case {
            part.cases_offered = Some(bank.case_count().max(1) as u32);
        }
    }
    scheme.id = format!("{}-aprox", bank.id);
    scheme.title = format!("{} (esquema aproximado)", bank.title);
    scheme.notes = Some(
        "El banco no indica un esquema de puntuación conocido: se aproxima con el esquema por \
         defecto."
            .to_string(),
    );
    if let Some(minutes) = exam_duration(&banks) {
        scheme.duration_minutes = minutes;
    }
    scheme
}

/// Duración del examen formado por `banks` (suma de los ejercicios si todos la indican).
fn exam_duration(banks: &[&Bank]) -> Option<u32> {
    banks.iter().map(|b| b.duration_minutes).sum()
}

/// Genera la réplica del banco `bank_id`.
pub(super) fn build(
    ctx: &BuildContext<'_>,
    bank_id: &str,
    include_reserve: bool,
    timed: bool,
    feedback: FeedbackMode,
    theory_block: Option<BlockId>,
) -> CoreResult<StoredPaper> {
    let bank = ctx
        .catalog
        .bank(bank_id)
        .ok_or_else(|| CoreError::not_found(format!("No existe el examen «{bank_id}».")))?;
    // Examen publicado en dos bancos (p. ej. 2018: 1.er ejercicio con plantilla oficial y 2.º
    // ejercicio aparte): la réplica del banco principal (el de la 1.ª parte) añade el otro.
    let companion = bank
        .sections
        .iter()
        .any(|s| s.kind == SectionKind::Theory && !s.questions.is_empty())
        .then(|| ctx.catalog.companion(bank))
        .flatten();
    let scheme = scheme_for_exam(ctx, bank, companion);
    let mut exam_sections: Vec<(&Bank, &crate::model::Section)> =
        bank.sections.iter().map(|s| (bank, s)).collect();
    if let Some(other) = companion {
        exam_sections.extend(other.sections.iter().map(|s| (other, s)));
        exam_sections.sort_by_key(|(_, s)| s.part);
    }

    // 1.ª parte con bloque a elegir (p. ej. 2016: comunes + bloque III o IV): entran las
    // secciones comunes y la alternativa elegida (por defecto, la primera que ofrece el banco).
    let alternatives: Vec<BlockId> = exam_sections
        .iter()
        .map(|(_, s)| *s)
        .filter(|s| s.kind == SectionKind::Theory)
        .filter_map(|s| s.block)
        .collect();
    let chosen_block = (alternatives.len() > 1).then(|| {
        theory_block
            .filter(|b| alternatives.contains(b))
            .unwrap_or(alternatives[0])
    });

    let mut sections = Vec::new();
    for &(source, section) in &exam_sections {
        if let Some(chosen) = chosen_block {
            if section.kind == SectionKind::Theory && section.block.is_some_and(|b| b != chosen) {
                continue;
            }
        }
        let mut questions: Vec<StoredQuestion> = section
            .questions
            .iter()
            .enumerate()
            .map(|(i, q)| StoredQuestion {
                id: q.id.clone(),
                display_number: if q.number > 0 {
                    q.number.to_string()
                } else {
                    (i + 1).to_string()
                },
                is_reserve: false,
            })
            .collect();
        if include_reserve {
            questions.extend(
                section
                    .reserve
                    .iter()
                    .enumerate()
                    .map(|(i, q)| StoredQuestion {
                        id: q.id.clone(),
                        display_number: format!("R{}", i + 1),
                        is_reserve: true,
                    }),
            );
        }
        // Los ids de sección son locales a cada banco: si el complementario repite uno, se
        // distingue con el id de su banco.
        let id = if source.id != bank.id && bank.section(&section.id).is_some() {
            format!("{}:{}", source.id, section.id)
        } else {
            section.id.clone()
        };
        sections.push(StoredSection {
            id,
            part: section.part,
            kind: section.kind,
            title: if section.title.trim().is_empty() {
                match section.kind {
                    SectionKind::Theory => format!("{}.ª parte · Cuestionario", section.part),
                    SectionKind::Case => "Supuesto práctico".to_string(),
                }
            } else {
                section.title.clone()
            },
            block: section.block,
            source_bank: Some(source.id.clone()),
            source_section: Some(section.id.clone()),
            questions,
        });
    }
    if sections.iter().all(|s| s.questions.is_empty()) {
        return Err(CoreError::data(format!(
            "El examen «{}» no tiene preguntas.",
            bank.title
        )));
    }

    let case_count = (bank.case_count() + companion.map_or(0, Bank::case_count)) as u32;
    let cases_to_choose = if case_count > 0 {
        scheme
            .case_part()
            .and_then(|p| p.cases_to_choose)
            .unwrap_or(1)
            .max(1)
    } else {
        0
    };
    let requires_case_choice = case_count > cases_to_choose && cases_to_choose > 0;
    let duration_minutes = if timed {
        let banks: Vec<&Bank> = std::iter::once(bank).chain(companion).collect();
        Some(exam_duration(&banks).unwrap_or(scheme.duration_minutes))
    } else {
        None
    };

    let mut subtitle = vec!["Réplica del examen oficial".to_string()];
    if let Some(other) = companion {
        subtitle.push(if other.answer_key() == crate::model::AnswerKey::Propia {
            "1.er y 2.º ejercicio (2.º con respuestas propuestas por OpoTAI, sin plantilla oficial)"
                .to_string()
        } else {
            "1.er y 2.º ejercicio".to_string()
        });
    }
    if let Some(block) = chosen_block {
        subtitle.push(format!("1.ª parte con el bloque {}", block.as_str()));
    }
    if let Some(date) = bank.exam_date.as_deref() {
        subtitle.push(format!("examen del {}", fmt_date_es(date)));
    }
    if include_reserve {
        subtitle.push("con preguntas de reserva".to_string());
    }
    if bank.answer_key() == crate::model::AnswerKey::Provisional {
        subtitle.push("plantilla provisional".to_string());
    }
    if feedback == FeedbackMode::Immediate {
        subtitle.push("modo estudio".to_string());
    }

    Ok(StoredPaper {
        version: PAPER_FORMAT_VERSION,
        mode: ExamMode::Official,
        title: bank.title.clone(),
        subtitle: Some(subtitle.join(" · ")),
        scheme,
        duration_minutes,
        feedback,
        requires_case_choice,
        cases_to_choose,
        replace_annulled: include_reserve,
        drawn: false,
        sections,
    })
}
