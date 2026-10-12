// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! `get_catalog` y `list_localities`.

use super::Engine;
use crate::api::{
    BankSummary, Block, CatalogInfo, ConvocatoriaSummary, LocalityInfo, SectionSummary, Temario,
    Topic,
};
use crate::model::{Bank, BlockId, Convocatoria};
use crate::util::normalize_key;

fn bank_summary(catalog: &crate::catalog::Catalog, bank: &Bank) -> BankSummary {
    let mut question_count = 0;
    let mut reserve_count = 0;
    let mut annulled_count = 0;
    let mut explained_count = 0;
    let sections = bank
        .sections
        .iter()
        .map(|s| {
            question_count += s.questions.len() as u32;
            reserve_count += s.reserve.len() as u32;
            for (q, _) in s.all_questions() {
                if q.annulled {
                    annulled_count += 1;
                }
                if q.has_explanation() {
                    explained_count += 1;
                }
            }
            SectionSummary {
                id: s.id.clone(),
                part: s.part,
                kind: s.kind,
                title: s.title.clone(),
                block: s.block,
                question_count: s.questions.len() as u32,
                reserve_count: s.reserve.len() as u32,
                statement: s
                    .statement
                    .as_deref()
                    .filter(|t| !t.trim().is_empty())
                    .map(crate::catalog::strip_images),
            }
        })
        .collect();
    BankSummary {
        id: bank.id.clone(),
        kind: bank.kind,
        title: bank.title.clone(),
        description: bank.description.clone(),
        access: bank.access,
        year: bank.year,
        convocatoria: bank.convocatoria.clone(),
        exam_date: bank.exam_date.clone(),
        duration_minutes: bank.duration_minutes,
        scoring_scheme: bank.scoring_scheme.clone(),
        question_count,
        reserve_count,
        annulled_count,
        explained_count,
        case_count: bank.case_count() as u32,
        sections,
        source_urls: bank
            .source
            .as_ref()
            .map(|s| {
                s.documents
                    .iter()
                    .map(|d| d.url.clone())
                    .filter(|u| !u.is_empty())
                    .collect()
            })
            .unwrap_or_default(),
        answer_key: bank.answer_key(),
        companion_bank_id: catalog.companion(bank).map(|c| c.id.clone()),
        complete_exam: catalog.is_complete_official(bank),
    }
}

impl Engine {
    fn convocatoria_summary(&self, c: &Convocatoria) -> ConvocatoriaSummary {
        ConvocatoriaSummary {
            id: c.id.clone(),
            access: c.access,
            year: c.year,
            title: c.title.clone(),
            exam_date: c.exam_date.clone(),
            status: c.status,
            scoring_scheme: c.scoring_scheme.clone(),
            plazas_total: c.plazas.total(),
            presentados: c.presentados,
            aptos: c.aptos,
            cutoff_direct: c.cutoff.as_ref().and_then(|x| x.direct),
            cutoff_max_direct: c.cutoff.as_ref().and_then(|x| x.max_direct),
            cutoff_basis: c.cutoff.as_ref().map(|x| x.basis),
            has_grades: c.has_grades(),
            has_destinations: self.catalog.destinos_for(c).is_some(),
            sources: c.sources.clone(),
        }
    }

    fn temario_info(&self) -> Option<Temario> {
        let t = self.catalog.temario()?;
        Some(Temario {
            convocatoria: t.convocatoria.clone(),
            source_title: t
                .source
                .as_ref()
                .map(|s| s.title.clone())
                .unwrap_or_default(),
            source_url: t.source.as_ref().map(|s| s.url.clone()).unwrap_or_default(),
            blocks: t
                .blocks
                .iter()
                .map(|b| Block {
                    id: b.id,
                    title: b.title.clone(),
                    topics: b
                        .topics
                        .iter()
                        .map(|tp| Topic {
                            id: tp.id.clone(),
                            block: BlockId::from_topic(&tp.id).unwrap_or(b.id),
                            number: tp.number,
                            title: tp.title.clone(),
                            keywords: tp.keywords.clone(),
                        })
                        .collect(),
                })
                .collect(),
        })
    }

    /// `get_catalog`: bancos, temario, esquemas, convocatorias y tamaños en una llamada.
    pub fn get_catalog(&self) -> CatalogInfo {
        CatalogInfo {
            banks: self
                .catalog
                .banks()
                .iter()
                .map(|b| bank_summary(&self.catalog, b))
                .collect(),
            temario: self.temario_info(),
            schemes: self.catalog.scoring().schemes.clone(),
            default_scheme: self.catalog.default_scheme().id.clone(),
            convocatorias: self
                .catalog
                .convocatorias()
                .convocatorias
                .iter()
                .map(|c| self.convocatoria_summary(c))
                .collect(),
            target_convocatoria: self.catalog.target_convocatoria_id().map(str::to_string),
            tiers: self.catalog.tiers().to_vec(),
        }
    }

    /// `list_localities`: localidades clasificadas con su peso en la referencia de destinos.
    pub fn list_localities(&mut self) -> Vec<LocalityInfo> {
        let ctx = self.prediction_context(None);
        let total = f64::from(ctx.destinations.total.max(1));
        let mut out: Vec<LocalityInfo> = self
            .catalog
            .localidades()
            .localities
            .iter()
            .map(|l| {
                let share = if ctx.destinations.synthetic {
                    None
                } else {
                    let name = normalize_key(&l.name);
                    let province = normalize_key(&l.province);
                    let count: u32 = ctx
                        .destinations
                        .localities
                        .iter()
                        .filter(|d| {
                            normalize_key(&d.name) == name
                                && (province.is_empty() || normalize_key(&d.province) == province)
                        })
                        .map(|d| d.count)
                        .sum();
                    Some(f64::from(count) / total)
                };
                LocalityInfo {
                    name: l.name.clone(),
                    province: l.province.clone(),
                    population: l.population,
                    is_provincial_capital: l.is_provincial_capital,
                    tier: l.tier,
                    share_of_plazas: share,
                }
            })
            .collect();
        out.sort_by(|a, b| {
            b.population
                .unwrap_or(0)
                .cmp(&a.population.unwrap_or(0))
                .then_with(|| normalize_key(&a.name).cmp(&normalize_key(&b.name)))
        });
        out
    }
}
