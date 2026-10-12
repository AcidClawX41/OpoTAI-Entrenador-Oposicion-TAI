// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! «Simulacro OpoTAI n.º N» (N = 1…30): composición fija y determinista para cada N.
//!
//! - Formato completo del esquema por defecto (p. ej. 80 preguntas + 2 supuestos a elegir).
//! - Preguntas no anuladas, sin repetir, preferentemente **oficiales** y no desactualizadas:
//!   en cada bloque se usan primero las oficiales vigentes, después las de práctica vigentes y
//!   por último las desactualizadas.
//! - Estratificación por bloque igual que en los simulacros.
//! - Cada lista se baraja **una vez** con una semilla fija y el simulacro N toma una ventana
//!   cíclica que empieza en `(N − 1) · cuota`: los números consecutivos no comparten preguntas
//!   mientras el banco tenga suficientes y entre los 30 se recorre todo el banco.
//! - Supuestos: uno del bloque III y otro del IV con la misma rotación, así que números
//!   consecutivos tienen supuestos distintos si hay al menos dos de cada bloque.
//! - El orden de presentación dentro del simulacro usa una semilla derivada de N.
//!
//! La composición solo cambia si cambian los bancos de preguntas.

use std::collections::BTreeMap;

use rand::Rng;

use super::simulacro::{block_shares, case_questions, quotas, retain_fitting_cases};
use super::{
    BuildContext, Candidate, block_rank, candidates, case_section_id, case_title, rng_from,
};
use crate::api::{ExamMode, FeedbackMode};
use crate::catalog::QuestionRef;
use crate::defaults::NUMBERED_SIMULACROS;
use crate::error::{CoreError, CoreResult};
use crate::model::{Bank, BankKind, BlockId, SectionKind};
use crate::paper::{PAPER_FORMAT_VERSION, StoredPaper, StoredQuestion, StoredSection};
use crate::util::{StableHasher, mix_seed};

/// Semilla fija de las permutaciones (no depende del usuario ni de N).
fn base_seed() -> u64 {
    StableHasher::new()
        .str("opotai/simulacros-numerados/v1")
        .finish()
}

/// Banco oficial completo (1.ª parte con preguntas y al menos un supuesto): entra en el sorteo.
pub fn is_complete_official(bank: &Bank) -> bool {
    bank.kind == BankKind::Official
        && bank
            .sections
            .iter()
            .any(|s| s.kind == SectionKind::Theory && !s.questions.is_empty())
        && bank
            .sections
            .iter()
            .any(|s| s.kind == SectionKind::Case && !s.questions.is_empty())
}

/// Ventana cíclica de `count` elementos distintos empezando en `start`.
fn cyclic_window<T: Copy>(list: &[T], start: usize, count: usize) -> Vec<T> {
    if list.is_empty() {
        return Vec::new();
    }
    let count = count.min(list.len());
    let start = start % list.len();
    (0..count).map(|i| list[(start + i) % list.len()]).collect()
}

/// Nivel de preferencia: 0 oficial vigente, 1 práctica vigente, 2 desactualizada.
fn tier(c: &Candidate<'_>) -> u8 {
    if c.r.question.outdated {
        2
    } else if c.r.bank.kind == BankKind::Official {
        0
    } else {
        1
    }
}

/// Elige `quota` preguntas de un cubo recorriendo los niveles de preferencia.
fn take_from_bucket<'a>(bucket: &[Candidate<'a>], quota: usize, number: u32) -> Vec<Candidate<'a>> {
    let mut picked = Vec::with_capacity(quota);
    let mut need = quota;
    for level in 0..=2u8 {
        if need == 0 {
            break;
        }
        let list: Vec<Candidate<'a>> = bucket
            .iter()
            .copied()
            .filter(|c| tier(c) == level)
            .collect();
        let window = cyclic_window(&list, (number as usize - 1) * need, need);
        need -= window.len();
        picked.extend(window);
    }
    picked
}

fn select_cases<'a>(
    ctx: &BuildContext<'a>,
    offered: usize,
    size: u32,
    number: u32,
) -> Vec<QuestionRef<'a>> {
    let mut rng = rng_from(mix_seed(base_seed(), 2, 0));
    let mut cases: Vec<(QuestionRef<'a>, u8, u64)> = Vec::new();
    for r in ctx.catalog.all_questions() {
        if r.section.kind != SectionKind::Case || r.is_reserve || r.loc.index != 0 {
            continue;
        }
        if case_questions(r.section).is_empty() {
            continue;
        }
        let level = u8::from(r.bank.kind != BankKind::Official);
        cases.push((r, level, rng.next_u64()));
    }
    retain_fitting_cases(&mut cases, offered, size, |(r, _, _)| r.section);
    cases.sort_by_key(|(_, level, key)| (*level, *key));
    let n = number as usize - 1;
    let mut chosen: Vec<QuestionRef<'a>> = Vec::new();
    let same = |a: &QuestionRef<'_>, b: &QuestionRef<'_>| {
        a.bank.id == b.bank.id && a.section.id == b.section.id
    };
    for block in [BlockId::III, BlockId::IV] {
        if chosen.len() >= offered {
            break;
        }
        let list: Vec<QuestionRef<'a>> = cases
            .iter()
            .filter(|(r, _, _)| r.section.block == Some(block))
            .map(|(r, _, _)| *r)
            .collect();
        if let Some(r) = cyclic_window(&list, n, 1).first() {
            chosen.push(*r);
        }
    }
    let rest: Vec<QuestionRef<'a>> = cases
        .iter()
        .map(|(r, _, _)| *r)
        .filter(|r| !chosen.iter().any(|c| same(c, r)))
        .collect();
    let missing = offered.saturating_sub(chosen.len());
    chosen.extend(cyclic_window(&rest, n * missing.max(1), missing));
    chosen.sort_by_key(|r| block_rank(r.section.block));
    chosen
}

/// Genera el simulacro numerado `number`.
pub(super) fn build(
    ctx: &BuildContext<'_>,
    number: u32,
    feedback: FeedbackMode,
    timed: bool,
) -> CoreResult<StoredPaper> {
    if number == 0 || number > NUMBERED_SIMULACROS {
        return Err(CoreError::invalid(format!(
            "Los simulacros numerados van del 1 al {NUMBERED_SIMULACROS}."
        )));
    }
    let scheme = ctx.catalog.default_scheme().clone();
    let theory = scheme.theory_part().cloned();
    let n1 = theory.as_ref().map(|p| p.questions).unwrap_or(80).max(1) as usize;

    // Candidatas en orden estable con claves de una permutación fija.
    let mut rng = rng_from(mix_seed(base_seed(), 1, 0));
    let refs = ctx
        .catalog
        .all_questions()
        .filter(|r| r.section.kind == SectionKind::Theory && r.question.is_gradable());
    let mut pool = candidates(refs, &mut rng);
    if pool.is_empty() {
        return Err(CoreError::invalid(
            "No hay preguntas disponibles para generar el simulacro: faltan bancos de preguntas.",
        ));
    }
    pool.sort_by_key(|c| c.key);

    // Cubos por bloque según el reparto oficial (o un único cubo si no hay temas).
    let mut picked: Vec<Candidate<'_>> = Vec::with_capacity(n1);
    if let Some(shares) = block_shares(ctx.catalog, scheme.access) {
        let mut buckets: BTreeMap<BlockId, Vec<Candidate<'_>>> = BTreeMap::new();
        for c in &pool {
            if let Some(b) = c.r.block() {
                buckets.entry(b).or_default().push(*c);
            }
        }
        for (block, quota) in quotas(n1, &shares) {
            if let Some(bucket) = buckets.get(&block) {
                picked.extend(take_from_bucket(bucket, quota, number));
            }
        }
    }
    if picked.len() < n1 {
        let rest: Vec<Candidate<'_>> = pool
            .iter()
            .copied()
            .filter(|c| !picked.iter().any(|p| p.r.question.id == c.r.question.id))
            .collect();
        let missing = n1 - picked.len();
        picked.extend(take_from_bucket(&rest, missing, number));
    }
    // Orden de presentación: por bloque y, dentro, con una semilla derivada de N.
    let mut order_rng = rng_from(mix_seed(base_seed(), 3, u64::from(number)));
    let mut ordered: Vec<(u8, u64, Candidate<'_>)> = picked
        .into_iter()
        .map(|c| (block_rank(c.r.block()), order_rng.next_u64(), c))
        .collect();
    ordered.sort_by_key(|(rank, key, _)| (*rank, *key));

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
        questions: ordered
            .iter()
            .enumerate()
            .map(|(i, (_, _, c))| StoredQuestion {
                id: c.r.question.id.clone(),
                display_number: (i + 1).to_string(),
                is_reserve: false,
            })
            .collect(),
    }];

    let mut cases_to_choose = 0;
    let mut requires_case_choice = false;
    if let Some(part) = scheme.case_part() {
        let offered = part.cases_offered.unwrap_or(2).max(1) as usize;
        let chosen = select_cases(ctx, offered, part.questions, number);
        for r in &chosen {
            sections.push(StoredSection {
                id: case_section_id(&r.bank.id, &r.section.id),
                part: part.part,
                kind: SectionKind::Case,
                title: case_title(r),
                block: r.section.block,
                source_bank: Some(r.bank.id.clone()),
                source_section: Some(r.section.id.clone()),
                questions: case_questions(r.section)
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
    let case_sections = sections
        .iter()
        .filter(|s| s.kind == SectionKind::Case)
        .count();
    let paper_scheme = if case_sections > 0 {
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

    let mut subtitle = vec![format!("{} preguntas", sections[0].questions.len())];
    match case_sections {
        0 => subtitle.push("sin supuestos disponibles".to_string()),
        1 => subtitle.push("supuesto práctico".to_string()),
        n => subtitle.push(format!("supuesto práctico a elegir entre {n}")),
    }
    let duration_minutes = timed.then_some(scheme.duration_minutes);
    subtitle.push(match duration_minutes {
        Some(m) => format!("{m} min"),
        None => "sin límite de tiempo".to_string(),
    });
    if feedback == FeedbackMode::Immediate {
        subtitle.push("modo estudio".to_string());
    }

    Ok(StoredPaper {
        version: PAPER_FORMAT_VERSION,
        mode: ExamMode::Simulacro,
        title: format!("Simulacro OpoTAI n.º {number}"),
        subtitle: Some(subtitle.join(" · ")),
        scheme: paper_scheme,
        duration_minutes,
        feedback,
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
    fn cyclic_windows_rotate_without_repeating() {
        let list = [1, 2, 3, 4, 5];
        assert_eq!(cyclic_window(&list, 0, 2), vec![1, 2]);
        assert_eq!(cyclic_window(&list, 2, 2), vec![3, 4]);
        assert_eq!(cyclic_window(&list, 4, 2), vec![5, 1]);
        assert_eq!(cyclic_window(&list, 7, 9), vec![3, 4, 5, 1, 2]);
        assert!(cyclic_window::<u8>(&[], 3, 2).is_empty());
    }
}
