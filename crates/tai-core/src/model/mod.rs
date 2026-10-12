// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Modelos serde de los ficheros de datos (`data/banks`, `data/meta`).
//!
//! Todos aceptan campos ausentes con valores por defecto razonables para que un fichero
//! incompleto no impida arrancar la aplicación (los problemas se recogen en el informe de
//! validación del catálogo).

mod bank;
mod common;
mod meta;
mod scheme;
mod theory;

pub use bank::{AnswerKey, Bank, BankSource, Media, Question, Section, SourceDocument};
pub use common::{Access, BankKind, BlockId, Letter, Link, SectionKind, TierId};
pub use meta::{
    Assignment, Convocatoria, ConvocatoriaStatus, ConvocatoriasFile, Cutoff, CutoffBasis,
    CutoffPart, DestinosFile, DestinosSource, GradesOfAptos, LocalidadesFile, Locality,
    PartDirects, Plazas, TemarioBlock, TemarioFile, TemarioTopic, TierDef,
};
pub use scheme::{Grading, GradingUnit, ScoringFile, ScoringPart, ScoringScheme};
pub use theory::{TheoryEntry, TheoryIndexFile};
