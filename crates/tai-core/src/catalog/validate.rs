// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Validación de coherencia del catálogo (complementa a `tools/opotai/validate.py`).

use std::collections::HashSet;

use super::Catalog;
use crate::model::{BankKind, SectionKind};

/// Gravedad de un problema.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Severity {
    Error,
    Warning,
}

/// Tipo de problema.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IssueKind {
    /// El fichero no se puede deserializar.
    Parse,
    /// Ids duplicados, número de opciones, respuestas…
    Integrity,
    /// Referencias a esquemas, convocatorias, temas o imágenes inexistentes.
    Reference,
    /// Calidad de contenido (sin explicación, pendiente de revisión…).
    Quality,
}

/// Problema encontrado en los datos.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Issue {
    pub severity: Severity,
    pub kind: IssueKind,
    pub path: String,
    pub message: String,
}

/// Informe de validación del catálogo.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct ValidationReport {
    pub issues: Vec<Issue>,
}

impl ValidationReport {
    /// Añade un problema.
    pub fn push(
        &mut self,
        severity: Severity,
        kind: IssueKind,
        path: &str,
        message: impl Into<String>,
    ) {
        self.issues.push(Issue {
            severity,
            kind,
            path: path.to_string(),
            message: message.into(),
        });
    }

    /// Errores.
    pub fn errors(&self) -> impl Iterator<Item = &Issue> {
        self.issues.iter().filter(|i| i.severity == Severity::Error)
    }

    /// Avisos.
    pub fn warnings(&self) -> impl Iterator<Item = &Issue> {
        self.issues
            .iter()
            .filter(|i| i.severity == Severity::Warning)
    }

    /// Ficheros que no se han podido deserializar.
    pub fn parse_errors(&self) -> impl Iterator<Item = &Issue> {
        self.issues.iter().filter(|i| i.kind == IssueKind::Parse)
    }

    /// Hay algún error.
    pub fn has_errors(&self) -> bool {
        self.errors().next().is_some()
    }
}

/// Revisa la coherencia interna del catálogo ya indexado.
pub(super) fn validate(catalog: &mut Catalog) {
    let mut report = std::mem::take(&mut catalog.report);
    let topics: Option<HashSet<&str>> = catalog.temario.as_ref().map(|t| {
        t.blocks
            .iter()
            .flat_map(|b| b.topics.iter().map(|tp| tp.id.as_str()))
            .collect()
    });

    for bank in &catalog.banks {
        let path = format!("bank:{}", bank.id);
        if let Some(scheme) = bank.scoring_scheme.as_deref() {
            if catalog.scoring.scheme(scheme).is_none() {
                report.push(
                    Severity::Warning,
                    IssueKind::Reference,
                    &path,
                    format!("esquema de puntuación desconocido «{scheme}»"),
                );
            }
        } else if bank.kind == BankKind::Official {
            report.push(
                Severity::Warning,
                IssueKind::Reference,
                &path,
                "examen oficial sin esquema de puntuación",
            );
        }
        if let Some(conv) = bank.convocatoria.as_deref() {
            if catalog.convocatorias.get(conv).is_none() {
                report.push(
                    Severity::Warning,
                    IssueKind::Reference,
                    &path,
                    format!("convocatoria desconocida «{conv}»"),
                );
            }
        }
        if bank.sections.is_empty() {
            report.push(
                Severity::Error,
                IssueKind::Integrity,
                &path,
                "banco sin secciones",
            );
        }
        let mut section_ids = HashSet::new();
        for section in &bank.sections {
            if !section_ids.insert(section.id.as_str()) {
                report.push(
                    Severity::Error,
                    IssueKind::Integrity,
                    &path,
                    format!("sección duplicada «{}»", section.id),
                );
            }
            if section.kind == SectionKind::Case
                && section
                    .statement
                    .as_deref()
                    .is_none_or(|s| s.trim().is_empty())
            {
                report.push(
                    Severity::Warning,
                    IssueKind::Quality,
                    &path,
                    format!("el supuesto «{}» no tiene enunciado", section.id),
                );
            }
            for media in &section.media {
                if catalog.asset(&media.path).is_none() {
                    report.push(
                        Severity::Warning,
                        IssueKind::Reference,
                        &path,
                        format!("imagen no encontrada «{}»", media.path),
                    );
                }
            }
            for (question, _) in section.all_questions() {
                let qpath = format!("{path}/{}", question.id);
                if question.options.len() != 4 {
                    report.push(
                        Severity::Error,
                        IssueKind::Integrity,
                        &qpath,
                        format!("tiene {} opciones (deben ser 4)", question.options.len()),
                    );
                }
                if question.answer.is_none() && !question.annulled {
                    report.push(
                        Severity::Error,
                        IssueKind::Integrity,
                        &qpath,
                        "respuesta nula en una pregunta no anulada",
                    );
                }
                if let Some(notes) = &question.option_notes {
                    if notes.len() != 4 {
                        report.push(
                            Severity::Warning,
                            IssueKind::Integrity,
                            &qpath,
                            "option_notes debe tener 4 elementos",
                        );
                    }
                }
                if let (Some(topic), Some(known)) = (question.topic.as_deref(), topics.as_ref()) {
                    if !known.contains(topic) {
                        report.push(
                            Severity::Warning,
                            IssueKind::Reference,
                            &qpath,
                            format!("tema desconocido «{topic}»"),
                        );
                    }
                }
                for media in &question.media {
                    if catalog.asset(&media.path).is_none() {
                        report.push(
                            Severity::Warning,
                            IssueKind::Reference,
                            &qpath,
                            format!("imagen no encontrada «{}»", media.path),
                        );
                    }
                }
            }
        }
    }

    for conv in &catalog.convocatorias.convocatorias {
        let path = format!("convocatoria:{}", conv.id);
        if let Some(scheme) = conv.scoring_scheme.as_deref() {
            if catalog.scoring.scheme(scheme).is_none() {
                report.push(
                    Severity::Warning,
                    IssueKind::Reference,
                    &path,
                    format!("esquema de puntuación desconocido «{scheme}»"),
                );
            }
        }
        if let Some(grades) = &conv.grades_of_aptos {
            if grades.count as usize != grades.values.len() && !grades.values.is_empty() {
                report.push(
                    Severity::Warning,
                    IssueKind::Integrity,
                    &path,
                    format!(
                        "grades_of_aptos.count = {} pero hay {} valores",
                        grades.count,
                        grades.values.len()
                    ),
                );
            }
            for pd in &grades.part_directs {
                if pd.values.len() != grades.values.len() {
                    report.push(
                        Severity::Warning,
                        IssueKind::Integrity,
                        &path,
                        format!(
                            "grades_of_aptos.part_directs de la parte {} tiene {} valores y hay {} notas",
                            pd.part,
                            pd.values.len(),
                            grades.values.len()
                        ),
                    );
                }
            }
        }
        if conv.destinations_dataset.is_some() && catalog.destinos_for(conv).is_none() {
            report.push(
                Severity::Warning,
                IssueKind::Reference,
                &path,
                "el dataset de destinos indicado no está disponible",
            );
        }
    }
    if let Some(target) = catalog.convocatorias.target_convocatoria.as_deref() {
        if catalog.convocatorias.get(target).is_none() {
            report.push(
                Severity::Warning,
                IssueKind::Reference,
                "meta/convocatorias.json",
                format!("convocatoria objetivo desconocida «{target}»"),
            );
        }
    }
    for (path, destinos) in &catalog.destinos {
        if !destinos.anonymized {
            report.push(
                Severity::Warning,
                IssueKind::Integrity,
                path,
                "el dataset de destinos debe estar anonimizado",
            );
        }
    }

    catalog.report = report;
}
