// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Simulacro con el formato de un esquema oficial.
//!
//! 1.ª parte: preguntas no anuladas de las secciones `theory` de todos los bancos,
//! estratificadas por bloque según el reparto de la 1.ª parte del examen oficial más reciente
//! con temas asignados (si no hay temas, muestreo uniforme). Se evitan duplicados, se priorizan
//! las no vistas (`prefer_unseen`) y se evitan las desfasadas salvo que falten.
//!
//! 2.ª parte: `cases_offered` supuestos (uno del bloque III y otro del IV si existen,
//! preferentemente no vistos) con sus preguntas; las anuladas se sustituyen por reservas en
//! orden para mantener el número de preguntas, como haría el tribunal.

use std::collections::BTreeMap;

use rand::Rng;

use super::{
    BuildContext, Candidate, MAX_QUESTIONS, block_rank, candidates, case_section_id, case_title,
    rng_from,
};
use crate::api::{ExamMode, FeedbackMode};
use crate::catalog::{Catalog, QuestionRef};
use crate::error::{CoreError, CoreResult};
use crate::model::{Access, BankKind, BlockId, Section, SectionKind};
use crate::paper::{PAPER_FORMAT_VERSION, StoredPaper, StoredQuestion, StoredSection};

/// Opciones del simulacro.
#[derive(Debug, Clone, Copy)]
pub(super) struct SimulacroOptions<'a> {
    pub scheme_id: Option<&'a str>,
    pub part1_questions: Option<u32>,
    pub include_case: bool,
    pub duration_minutes: Option<u32>,
    pub prefer_unseen: bool,
    pub seed: u64,
    pub feedback: FeedbackMode,
    pub freestyle: bool,
}

/// Reparto por bloque (fracciones) de la 1.ª parte del examen oficial más reciente con temas.
pub fn block_shares(catalog: &Catalog, access: Access) -> Option<Vec<(BlockId, f64)>> {
    let officials = catalog
        .banks()
        .iter()
        .filter(|b| b.kind == BankKind::Official);
    // Primero los del mismo sistema de acceso; si no hay, cualquiera.
    let ordered = officials
        .clone()
        .filter(|b| b.access == Some(access))
        .chain(officials.filter(|b| b.access != Some(access)));
    for bank in ordered {
        let mut counts: BTreeMap<BlockId, usize> = BTreeMap::new();
        let mut total = 0usize;
        for section in bank
            .sections
            .iter()
            .filter(|s| s.kind == SectionKind::Theory && s.part == 1)
        {
            for q in &section.questions {
                total += 1;
                if let Some(block) = q.topic.as_deref().and_then(BlockId::from_topic) {
                    *counts.entry(block).or_default() += 1;
                }
            }
        }
        let classified: usize = counts.values().sum();
        if classified > 0 && classified * 2 >= total {
            return Some(
                counts
                    .into_iter()
                    .map(|(b, c)| (b, c as f64 / classified as f64))
                    .collect(),
            );
        }
    }
    None
}

/// Cuotas enteras por bloque con el método del resto mayor.
pub fn quotas(n: usize, shares: &[(BlockId, f64)]) -> Vec<(BlockId, usize)> {
    let total: f64 = shares.iter().map(|(_, s)| s).sum();
    if total <= 0.0 {
        return Vec::new();
    }
    let raw: Vec<(BlockId, f64)> = shares
        .iter()
        .map(|(b, s)| (*b, n as f64 * s / total))
        .collect();
    let mut out: Vec<(BlockId, usize)> =
        raw.iter().map(|(b, x)| (*b, x.floor() as usize)).collect();
    let assigned: usize = out.iter().map(|(_, c)| c).sum();
    let mut remainders: Vec<(usize, f64)> = raw
        .iter()
        .enumerate()
        .map(|(i, (_, x))| (i, x - x.floor()))
        .collect();
    remainders.sort_by(|a, b| b.1.total_cmp(&a.1).then(a.0.cmp(&b.0)));
    for (i, _) in remainders.into_iter().take(n.saturating_sub(assigned)) {
        out[i].1 += 1;
    }
    out
}

/// Prioridad de una candidata: no desfasada, no vista (si se pide) y azar.
fn priority(ctx: &BuildContext<'_>, c: &Candidate<'_>, prefer_unseen: bool) -> (bool, bool, u64) {
    (
        c.r.question.outdated,
        prefer_unseen && ctx.seen(&c.r.question.id),
        c.key,
    )
}

fn select_part1<'a>(
    ctx: &BuildContext<'a>,
    pool: Vec<Candidate<'a>>,
    n: usize,
    access: Access,
    prefer_unseen: bool,
) -> Vec<Candidate<'a>> {
    let mut pool = pool;
    pool.sort_by_key(|c| priority(ctx, c, prefer_unseen));
    let mut chosen: Vec<Candidate<'a>> = Vec::with_capacity(n);
    let mut taken = vec![false; pool.len()];
    if let Some(shares) = block_shares(ctx.catalog, access) {
        for (block, quota) in quotas(n, &shares) {
            let mut left = quota;
            for (i, c) in pool.iter().enumerate() {
                if left == 0 {
                    break;
                }
                if !taken[i] && c.r.block() == Some(block) {
                    taken[i] = true;
                    chosen.push(*c);
                    left -= 1;
                }
            }
        }
    }
    // Completa (sin estratificar o si un bloque se queda corto) por prioridad.
    for (i, c) in pool.iter().enumerate() {
        if chosen.len() >= n {
            break;
        }
        if !taken[i] {
            taken[i] = true;
            chosen.push(*c);
        }
    }
    chosen.sort_by_key(|c| (block_rank(c.r.block()), c.key));
    chosen
}

/// Preguntas de un supuesto: titulares con las anuladas sustituidas por reservas válidas.
pub(super) fn case_questions(section: &Section) -> Vec<&crate::model::Question> {
    let mut reserves = section.reserve.iter().filter(|q| q.is_gradable());
    section
        .questions
        .iter()
        .filter_map(|q| {
            if q.is_gradable() {
                Some(q)
            } else {
                reserves.next()
            }
        })
        .collect()
}

/// Deja solo los supuestos con tantas preguntas como pide el esquema (p. ej. 20 en ingreso libre
/// y 12 en promoción interna), para que la nota sea comparable; si no hay suficientes, no filtra.
pub(super) fn retain_fitting_cases<T>(
    cases: &mut Vec<T>,
    offered: usize,
    size: u32,
    section: impl Fn(&T) -> &Section,
) {
    let fits = |c: &T| case_questions(section(c)).len() as u32 == size;
    if size > 0 && cases.iter().filter(|c| fits(c)).count() >= offered {
        cases.retain(|c| fits(c));
    }
}

fn select_cases<'a>(
    ctx: &BuildContext<'a>,
    offered: usize,
    size: u32,
    prefer_unseen: bool,
    rng: &mut rand_chacha::ChaCha8Rng,
) -> Vec<QuestionRef<'a>> {
    // Representante de cada supuesto: su primera pregunta (para banco y sección).
    let mut cases: Vec<(QuestionRef<'a>, f64, u64)> = Vec::new();
    for r in ctx.catalog.all_questions() {
        if r.section.kind != SectionKind::Case || r.is_reserve || r.loc.index != 0 {
            continue;
        }
        let questions = case_questions(r.section);
        if questions.is_empty() {
            continue;
        }
        let seen =
            questions.iter().filter(|q| ctx.seen(&q.id)).count() as f64 / questions.len() as f64;
        cases.push((r, if prefer_unseen { seen } else { 0.0 }, rng.next_u64()));
    }
    retain_fitting_cases(&mut cases, offered, size, |(r, _, _)| r.section);
    cases.sort_by(|a, b| a.1.total_cmp(&b.1).then(a.2.cmp(&b.2)));
    let mut chosen: Vec<QuestionRef<'a>> = Vec::new();
    for block in [BlockId::III, BlockId::IV] {
        if chosen.len() >= offered {
            break;
        }
        if let Some((r, _, _)) = cases.iter().find(|(r, _, _)| {
            r.section.block == Some(block)
                && !chosen
                    .iter()
                    .any(|c| c.bank.id == r.bank.id && c.section.id == r.section.id)
        }) {
            chosen.push(*r);
        }
    }
    for (r, _, _) in &cases {
        if chosen.len() >= offered {
            break;
        }
        if !chosen
            .iter()
            .any(|c| c.bank.id == r.bank.id && c.section.id == r.section.id)
        {
            chosen.push(*r);
        }
    }
    chosen.sort_by_key(|r| block_rank(r.section.block));
    chosen
}

/// Genera el simulacro.
pub(super) fn build(
    ctx: &BuildContext<'_>,
    opts: &SimulacroOptions<'_>,
) -> CoreResult<StoredPaper> {
    let scheme = match opts.scheme_id {
        Some(id) => ctx.catalog.scheme(id).cloned().ok_or_else(|| {
            CoreError::not_found(format!("No existe el esquema de puntuación «{id}»."))
        })?,
        None => ctx.catalog.default_scheme().clone(),
    };
    let theory = scheme.theory_part().cloned();
    let n1 = opts
        .part1_questions
        .or(theory.as_ref().map(|p| p.questions))
        .unwrap_or(80);
    if n1 == 0 || n1 > MAX_QUESTIONS {
        return Err(CoreError::invalid(format!(
            "El número de preguntas de la 1.ª parte debe estar entre 1 y {MAX_QUESTIONS}."
        )));
    }
    let mut rng = rng_from(opts.seed);

    let refs = ctx
        .catalog
        .all_questions()
        .filter(|r| r.section.kind == SectionKind::Theory && r.question.is_gradable());
    let pool = candidates(refs, &mut rng);
    if pool.is_empty() {
        return Err(CoreError::invalid(
            "No hay preguntas disponibles para generar el simulacro: faltan bancos de preguntas.",
        ));
    }
    let part1 = select_part1(ctx, pool, n1 as usize, scheme.access, opts.prefer_unseen);

    let mut sections = vec![StoredSection {
        id: "p1".to_string(),
        part: theory.as_ref().map(|p| p.part).unwrap_or(1),
        kind: SectionKind::Theory,
        title: format!(
            "1.ª parte · {}",
            theory
                .as_ref()
                .map(|p| p.title.clone())
                .unwrap_or_else(|| "Cuestionario".to_string())
        ),
        block: None,
        source_bank: None,
        source_section: None,
        questions: part1
            .iter()
            .enumerate()
            .map(|(i, c)| StoredQuestion {
                id: c.r.question.id.clone(),
                display_number: (i + 1).to_string(),
                is_reserve: false,
            })
            .collect(),
    }];

    let case_part = scheme.case_part().cloned();
    let mut cases_to_choose = 0;
    let mut requires_case_choice = false;
    if let (true, Some(part)) = (opts.include_case, case_part.as_ref()) {
        let offered = part.cases_offered.unwrap_or(2).max(1) as usize;
        let chosen = select_cases(ctx, offered, part.questions, opts.prefer_unseen, &mut rng);
        for r in &chosen {
            let questions = case_questions(r.section);
            sections.push(StoredSection {
                id: case_section_id(&r.bank.id, &r.section.id),
                part: part.part,
                kind: SectionKind::Case,
                title: case_title(r),
                block: r.section.block,
                source_bank: Some(r.bank.id.clone()),
                source_section: Some(r.section.id.clone()),
                questions: questions
                    .iter()
                    .enumerate()
                    .map(|(i, q)| StoredQuestion {
                        id: q.id.clone(),
                        display_number: (i + 1).to_string(),
                        is_reserve: false,
                    })
                    .collect(),
            });
        }
        if !chosen.is_empty() {
            cases_to_choose = part.cases_to_choose.unwrap_or(1).max(1);
            requires_case_choice = chosen.len() as u32 > cases_to_choose;
        }
    }
    let has_cases = sections.iter().any(|s| s.kind == SectionKind::Case);
    let paper_scheme = if has_cases {
        scheme.clone()
    } else {
        let theory_parts: Vec<u32> = scheme
            .parts
            .iter()
            .filter(|p| p.kind == SectionKind::Theory)
            .map(|p| p.part)
            .collect();
        scheme.restricted_to_parts(&theory_parts)
    };
    let duration_minutes = match opts.duration_minutes {
        Some(0) => None,
        Some(m) => Some(m),
        None => Some(scheme.duration_minutes),
    };

    let mut subtitle = vec![if opts.freestyle {
        format!(
            "{} preguntas al azar de ingreso libre y promoción interna",
            part1.len()
        )
    } else {
        format!("{} preguntas en la 1.ª parte", part1.len())
    }];
    if has_cases {
        subtitle.push(if requires_case_choice {
            format!("supuesto práctico a elegir entre {}", sections.len() - 1)
        } else {
            "supuesto práctico".to_string()
        });
    } else if opts.include_case {
        subtitle.push("sin supuestos disponibles".to_string());
    } else {
        subtitle.push("sin supuesto práctico".to_string());
    }
    if let Some(m) = duration_minutes {
        subtitle.push(format!("{m} min"));
    }
    if opts.feedback == FeedbackMode::Immediate {
        subtitle.push("modo estudio".to_string());
    }

    Ok(StoredPaper {
        version: PAPER_FORMAT_VERSION,
        mode: ExamMode::Simulacro,
        title: if opts.freestyle {
            "Simulacro Freestyle".to_string()
        } else {
            format!("Simulacro · {}", scheme.title)
        },
        subtitle: Some(subtitle.join(" · ")),
        scheme: paper_scheme,
        duration_minutes,
        feedback: opts.feedback,
        requires_case_choice,
        cases_to_choose,
        replace_annulled: false,
        drawn: false,
        sections,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn largest_remainder_quotas_sum_to_n() {
        let shares = [
            (BlockId::I, 0.25),
            (BlockId::II, 0.15),
            (BlockId::III, 0.20),
            (BlockId::IV, 0.40),
        ];
        let q = quotas(80, &shares);
        assert_eq!(q.iter().map(|(_, c)| c).sum::<usize>(), 80);
        assert_eq!(
            q,
            vec![
                (BlockId::I, 20),
                (BlockId::II, 12),
                (BlockId::III, 16),
                (BlockId::IV, 32)
            ]
        );
        let q = quotas(7, &shares);
        assert_eq!(q.iter().map(|(_, c)| c).sum::<usize>(), 7);
    }
}
