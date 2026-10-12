// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Teoría por tema (`data/teoria/index.json` + `data/teoria/<topic>.md`,
//! ver `docs/CONTRATO-DATOS.md` §7).

use serde::{Deserialize, Serialize};

use super::common::Link;

fn one() -> u32 {
    1
}

/// Entrada del índice de teoría.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TheoryEntry {
    /// Tema del temario, p. ej. `"IV.7"`.
    pub topic: String,
    /// Fichero Markdown relativo a `data/teoria/`, p. ej. `"IV.7.md"`.
    pub file: String,
    pub title: String,
    #[serde(default)]
    pub summary: String,
    #[serde(default)]
    pub reading_minutes: u32,
    #[serde(default)]
    pub key_points: Vec<String>,
    #[serde(default)]
    pub sources: Vec<Link>,
    #[serde(default)]
    pub updated: Option<String>,
}

/// Fichero `teoria/index.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TheoryIndexFile {
    #[serde(default = "one")]
    pub schema_version: u32,
    #[serde(default)]
    pub updated: Option<String>,
    #[serde(default)]
    pub topics: Vec<TheoryEntry>,
}
