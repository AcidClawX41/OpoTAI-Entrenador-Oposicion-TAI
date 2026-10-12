// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Tests de práctica, repaso espaciado y supuestos sueltos (puntuación derivada sobre 10).

use super::{
    BuildContext, MAX_QUESTIONS, candidates, case_section_id, group_sections, optional_duration,
    rng_from,
};
use crate::api::{ExamMode, FeedbackMode, QuestionSource};
use crate::catalog::QuestionRef;
use crate::error::{CoreError, CoreResult};
use crate::model::{BlockId, SectionKind};
use crate::paper::{PAPER_FORMAT_VERSION, StoredPaper, StoredQuestion, StoredSection};
use crate::scoring::practice_scheme;
use crate::util::fmt_int;

/// Opciones del test de práctica.
#[derive(Debug, Clone, Copy)]
pub(super) struct PracticeOptions<'a> {
    pub blocks: &'a [BlockId],
    pub topics: &'a [String],
    pub bank_ids: &'a [String],
    pub include_cases: bool,
    pub source: QuestionSource,
    pub count: u32,
    pub feedback: FeedbackMode,
    pub duration_minutes: Option<u32>,
    pub seed: u64,
}

fn validate_count(count: u32) -> CoreResult<()> {
    if count == 0 || count > MAX_QUESTIONS {
        return Err(CoreError::invalid(format!(
            "El número de preguntas debe estar entre 1 y {MAX_QUESTIONS}."
        )));
    }
    Ok(())
}

/// Esquema derivado (nota sobre 10) para las secciones del examen.
fn derived_scheme(
    ctx: &BuildContext<'_>,
    sections: &[StoredSection],
) -> crate::model::ScoringScheme {
    let mut parts: Vec<(u32, SectionKind, u32)> = Vec::new();
    for s in sections {
        let n = s.questions.len() as u32;
        if let Some(entry) = parts.iter_mut().find(|(p, _, _)| *p == s.part) {
            entry.2 += n;
        } else {
            parts.push((s.part, s.kind, n));
        }
    }
    practice_scheme(
        ctx.practice_base
            .unwrap_or_else(|| ctx.catalog.default_scheme()),
        &parts,
    )
}

fn matches_filters(r: &QuestionRef<'_>, opts: &PracticeOptions<'_>) -> bool {
    if !opts.bank_ids.is_empty() && !opts.bank_ids.contains(&r.bank.id) {
        return false;
    }
    if opts.blocks.is_empty() && opts.topics.is_empty() {
        return true;
    }
    // Unión: pertenece a alguno de los bloques o a alguno de los temas elegidos.
    let in_block = r.block().is_some_and(|b| opts.blocks.contains(&b));
    let in_topic = r
        .question
        .topic
        .as_deref()
        .is_some_and(|t| opts.topics.iter().any(|x| x == t));
    in_block || in_topic
}

fn matches_source(ctx: &BuildContext<'_>, r: &QuestionRef<'_>, source: QuestionSource) -> bool {
    let stat = ctx.stat(&r.question.id);
    match source {
        QuestionSource::All => true,
        QuestionSource::Unseen => stat.is_none_or(|s| s.seen == 0),
        QuestionSource::Failed => stat.is_some_and(|s| s.wrong > 0),
        QuestionSource::Flagged => stat.is_some_and(|s| s.flagged),
    }
}

/// Test de práctica filtrado.
pub(super) fn build_practice(
    ctx: &BuildContext<'_>,
    opts: &PracticeOptions<'_>,
) -> CoreResult<StoredPaper> {
    validate_count(opts.count)?;
    for bank_id in opts.bank_ids {
        if ctx.catalog.bank(bank_id).is_none() {
            return Err(CoreError::not_found(format!(
                "No existe el banco de preguntas «{bank_id}»."
            )));
        }
    }
    let mut rng = rng_from(opts.seed);
    let refs = ctx.catalog.all_questions().filter(|r| {
        r.question.is_gradable()
            && (r.section.kind == SectionKind::Theory || opts.include_cases)
            && matches_filters(r, opts)
            && matches_source(ctx, r, opts.source)
    });
    let mut pool = candidates(refs, &mut rng);
    if pool.is_empty() {
        return Err(CoreError::invalid(
            "No hay preguntas que cumplan los filtros elegidos.",
        ));
    }
    pool.sort_by_key(|c| (c.r.question.outdated, c.key));
    pool.truncate(opts.count as usize);
    let refs: Vec<QuestionRef<'_>> = pool.iter().map(|c| c.r).collect();
    let sections = group_sections(&refs);
    let scheme = derived_scheme(ctx, &sections);

    let mut subtitle = vec![format!("{} preguntas", fmt_int(refs.len() as u64))];
    if !opts.blocks.is_empty() {
        let names: Vec<&str> = opts.blocks.iter().map(|b| b.as_str()).collect();
        subtitle.push(format!("bloques {}", names.join(", ")));
    }
    if !opts.topics.is_empty() {
        subtitle.push(format!("temas {}", opts.topics.join(", ")));
    }
    match opts.source {
        QuestionSource::All => {}
        QuestionSource::Unseen => subtitle.push("no vistas".to_string()),
        QuestionSource::Failed => subtitle.push("falladas alguna vez".to_string()),
        QuestionSource::Flagged => subtitle.push("marcadas como dudosas".to_string()),
    }

    Ok(StoredPaper {
        version: PAPER_FORMAT_VERSION,
        mode: ExamMode::Practice,
        title: "Test de práctica".to_string(),
        subtitle: Some(subtitle.join(" · ")),
        scheme,
        duration_minutes: optional_duration(opts.duration_minutes),
        feedback: opts.feedback,
        requires_case_choice: false,
        cases_to_choose: 0,
        replace_annulled: false,
        drawn: false,
        sections,
    })
}

/// Repaso espaciado: vencidas (las más antiguas primero) y, si faltan, falladas en
/// seguimiento.
pub(super) fn build_review(
    ctx: &BuildContext<'_>,
    count: u32,
    feedback: FeedbackMode,
) -> CoreResult<StoredPaper> {
    validate_count(count)?;
    let mut due = Vec::new();
    let mut learning = Vec::new();
    for stat in ctx.history.values() {
        if stat.srs_box == 0 {
            continue;
        }
        let Some(r) = ctx.catalog.question(&stat.question_id) else {
            continue;
        };
        if !r.question.is_gradable() {
            continue;
        }
        let is_due = stat.srs_due_at.is_none_or(|d| d < ctx.due_limit);
        let key = (stat.srs_due_at, stat.question_id.clone());
        if is_due {
            due.push((key, r));
        } else if stat.srs_box < crate::srs::MASTERED_BOX {
            learning.push((key, r));
        }
    }
    due.sort_by(|a, b| a.0.cmp(&b.0));
    learning.sort_by(|a, b| a.0.cmp(&b.0));
    let due_count = due.len();
    let refs: Vec<QuestionRef<'_>> = due
        .into_iter()
        .chain(learning)
        .take(count as usize)
        .map(|(_, r)| r)
        .collect();
    if refs.is_empty() {
        return Err(CoreError::invalid(
            "No tienes preguntas pendientes de repaso. ¡Buen trabajo!",
        ));
    }
    let sections = group_sections(&refs);
    let scheme = derived_scheme(ctx, &sections);
    let pending = due_count.min(refs.len());
    Ok(StoredPaper {
        version: PAPER_FORMAT_VERSION,
        mode: ExamMode::Review,
        title: "Repaso de fallos".to_string(),
        subtitle: Some(format!(
            "{} preguntas · {} pendientes hoy",
            fmt_int(refs.len() as u64),
            fmt_int(pending as u64)
        )),
        scheme,
        duration_minutes: None,
        feedback,
        requires_case_choice: false,
        cases_to_choose: 0,
        replace_annulled: false,
        drawn: false,
        sections,
    })
}

/// Un supuesto práctico concreto (enunciado + preguntas, sin reservas).
pub(super) fn build_case(
    ctx: &BuildContext<'_>,
    bank_id: &str,
    section_id: &str,
    feedback: FeedbackMode,
    timed: bool,
) -> CoreResult<StoredPaper> {
    let bank = ctx
        .catalog
        .bank(bank_id)
        .ok_or_else(|| CoreError::not_found(format!("No existe el banco «{bank_id}».")))?;
    let section = bank.section(section_id).ok_or_else(|| {
        CoreError::not_found(format!(
            "No existe la sección «{section_id}» en «{}».",
            bank.title
        ))
    })?;
    if section.kind != SectionKind::Case {
        return Err(CoreError::invalid(format!(
            "La sección «{}» no es un supuesto práctico.",
            section.title
        )));
    }
    if section.questions.is_empty() {
        return Err(CoreError::data(format!(
            "El supuesto «{}» no tiene preguntas.",
            section.title
        )));
    }
    let stored = StoredSection {
        id: case_section_id(&bank.id, &section.id),
        part: section.part,
        kind: SectionKind::Case,
        title: if section.title.trim().is_empty() {
            "Supuesto práctico".to_string()
        } else {
            section.title.clone()
        },
        block: section.block,
        source_bank: Some(bank.id.clone()),
        source_section: Some(section.id.clone()),
        questions: section
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
            .collect(),
    };
    let gradable = section.questions.iter().filter(|q| q.is_gradable()).count() as u32;
    // Valor y penalización del examen al que pertenece el supuesto (p. ej. −1/4 en promoción
    // interna), no los del esquema por defecto.
    let original = super::official::scheme_for_bank(ctx, bank);
    let scheme = practice_scheme(
        &original,
        &[(section.part, SectionKind::Case, gradable.max(1))],
    );
    let duration_minutes = if timed {
        // Tiempo proporcional al peso del supuesto en el examen original (mínimo 30 min).
        let total: f64 = original.parts.iter().map(|p| p.nominal_max_direct()).sum();
        let case_points = original
            .case_part()
            .map(|p| p.value * f64::from(p.questions))
            .unwrap_or(0.0);
        let minutes = if total > 0.0 {
            (f64::from(original.duration_minutes) * case_points / total).round() as u32
        } else {
            0
        };
        Some(minutes.max(30))
    } else {
        None
    };
    Ok(StoredPaper {
        version: PAPER_FORMAT_VERSION,
        mode: ExamMode::Case,
        title: format!("Supuesto práctico · {}", stored.title),
        subtitle: Some(bank.title.clone()),
        scheme,
        duration_minutes,
        feedback,
        requires_case_choice: false,
        cases_to_choose: 0,
        replace_annulled: false,
        drawn: false,
        sections: vec![stored],
    })
}
