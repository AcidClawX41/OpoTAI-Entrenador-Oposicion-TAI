// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Metadatos de `data/meta`: convocatorias, temario, localidades y destinos
//! (ver `docs/CONTRATO-DATOS.md` §3–§6).

use serde::{Deserialize, Serialize};

use super::common::{Access, BlockId, Link, TierId};

fn one() -> u32 {
    1
}

// ───────────────────────────── Convocatorias ─────────────────────────────

/// Estado de una convocatoria.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ConvocatoriaStatus {
    Convocada,
    ExamenRealizado,
    Finalizada,
}

/// Cómo se fijó la nota de corte.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CutoffBasis {
    Floor,
    Rank,
    Unknown,
}

/// Plazas convocadas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct Plazas {
    #[serde(default)]
    pub general: Option<u32>,
    #[serde(default)]
    pub discapacidad: Option<u32>,
    #[serde(default)]
    pub total: Option<u32>,
}

impl Plazas {
    /// Total de plazas (o suma de turnos si falta el total).
    pub fn total(&self) -> Option<u32> {
        self.total.or(match (self.general, self.discapacidad) {
            (Some(g), Some(d)) => Some(g + d),
            (Some(g), None) => Some(g),
            _ => None,
        })
    }
}

/// Corte de una parte cuando cada parte se califica por separado.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct CutoffPart {
    pub part: u32,
    #[serde(default)]
    pub direct: Option<f64>,
    #[serde(default)]
    pub max_direct: Option<f64>,
}

/// Nota de corte publicada.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Cutoff {
    #[serde(default)]
    pub direct: Option<f64>,
    #[serde(default)]
    pub max_direct: Option<f64>,
    #[serde(default)]
    pub grade: Option<f64>,
    #[serde(default = "unknown_basis")]
    pub basis: CutoffBasis,
    #[serde(default)]
    pub per_part: Option<Vec<CutoffPart>>,
}

fn unknown_basis() -> CutoffBasis {
    CutoffBasis::Unknown
}

impl Cutoff {
    /// Corte conjunto como ratio de la directa máxima.
    pub fn ratio(&self) -> Option<f64> {
        match (self.direct, self.max_direct) {
            (Some(d), Some(n)) if n > 0.0 => Some(d / n),
            _ => None,
        }
    }

    /// Corte de una parte como ratio de su directa máxima.
    pub fn part_ratio(&self, part: u32) -> Option<f64> {
        self.per_part
            .as_ref()?
            .iter()
            .find(|c| c.part == part)
            .and_then(|c| match (c.direct, c.max_direct) {
                (Some(d), Some(n)) if n > 0.0 => Some(d / n),
                _ => None,
            })
    }
}

/// Calificaciones (0–100) de los aptos, anonimizadas.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradesOfAptos {
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub count: u32,
    #[serde(default)]
    pub values: Vec<f64>,
    /// Directas de cada parte, en el mismo orden que `values` (cuando el BOE las publica).
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub part_directs: Vec<PartDirects>,
}

/// Directas de una parte de cada apto (alineadas con [`GradesOfAptos::values`]).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartDirects {
    pub part: u32,
    #[serde(default)]
    pub values: Vec<f64>,
}

/// Convocatoria del histórico.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Convocatoria {
    pub id: String,
    pub access: Access,
    pub year: i32,
    #[serde(default)]
    pub oep: Option<String>,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub resolution: Option<String>,
    #[serde(default)]
    pub boe_id: Option<String>,
    #[serde(default)]
    pub exam_date: Option<String>,
    pub status: ConvocatoriaStatus,
    #[serde(default)]
    pub scoring_scheme: Option<String>,
    #[serde(default)]
    pub plazas: Plazas,
    #[serde(default)]
    pub admitidos: Option<u32>,
    #[serde(default)]
    pub presentados: Option<u32>,
    #[serde(default)]
    pub aptos: Option<u32>,
    #[serde(default)]
    pub aprobados: Option<u32>,
    #[serde(default)]
    pub cutoff: Option<Cutoff>,
    #[serde(default)]
    pub grades_of_aptos: Option<GradesOfAptos>,
    #[serde(default)]
    pub destinations_dataset: Option<String>,
    #[serde(default)]
    pub sources: Vec<Link>,
    #[serde(default)]
    pub notes: Option<String>,
}

impl Convocatoria {
    /// Hay calificaciones de aptos utilizables.
    pub fn has_grades(&self) -> bool {
        self.grades_of_aptos
            .as_ref()
            .is_some_and(|g| !g.values.is_empty())
    }
}

/// Fichero `convocatorias.json`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConvocatoriasFile {
    #[serde(default = "one")]
    pub schema_version: u32,
    #[serde(default)]
    pub updated: Option<String>,
    #[serde(default)]
    pub target_convocatoria: Option<String>,
    #[serde(default)]
    pub convocatorias: Vec<Convocatoria>,
}

impl ConvocatoriasFile {
    /// Convocatoria por id.
    pub fn get(&self, id: &str) -> Option<&Convocatoria> {
        self.convocatorias.iter().find(|c| c.id == id)
    }
}

// ───────────────────────────── Temario ─────────────────────────────

/// Tema del programa.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TemarioTopic {
    pub id: String,
    #[serde(default)]
    pub number: u32,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub keywords: Vec<String>,
}

/// Bloque del programa.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TemarioBlock {
    pub id: BlockId,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub topics: Vec<TemarioTopic>,
}

/// Fichero `temario.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TemarioFile {
    #[serde(default = "one")]
    pub schema_version: u32,
    #[serde(default)]
    pub convocatoria: String,
    #[serde(default)]
    pub source: Option<Link>,
    #[serde(default)]
    pub blocks: Vec<TemarioBlock>,
}

impl TemarioFile {
    /// Busca un tema por id.
    pub fn topic(&self, id: &str) -> Option<&TemarioTopic> {
        self.blocks
            .iter()
            .flat_map(|b| b.topics.iter())
            .find(|t| t.id == id)
    }

    /// Busca un bloque por id.
    pub fn block(&self, id: BlockId) -> Option<&TemarioBlock> {
        self.blocks.iter().find(|b| b.id == id)
    }
}

// ───────────────────────────── Localidades ─────────────────────────────

/// Definición de un tamaño de localidad (también es el `TierInfo` del contrato).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TierDef {
    pub id: TierId,
    pub order: u32,
    pub label: String,
    #[serde(default)]
    pub description: String,
}

/// Localidad clasificada por tamaño.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Locality {
    pub name: String,
    #[serde(default)]
    pub province: String,
    #[serde(default)]
    pub population: Option<u64>,
    #[serde(default)]
    pub is_provincial_capital: bool,
    pub tier: TierId,
}

/// Fichero `localidades.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct LocalidadesFile {
    #[serde(default = "one")]
    pub schema_version: u32,
    #[serde(default)]
    pub source: Option<Link>,
    #[serde(default)]
    pub population_year: Option<i32>,
    #[serde(default)]
    pub tiers: Vec<TierDef>,
    #[serde(default)]
    pub localities: Vec<Locality>,
}

// ───────────────────────────── Destinos ─────────────────────────────

/// Fuente de un dataset de destinos.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct DestinosSource {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub boe_id: Option<String>,
}

/// Plaza adjudicada (anonimizada: solo número de orden y destino).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Assignment {
    pub order: u32,
    #[serde(default)]
    pub organism: Option<String>,
    #[serde(default)]
    pub unit: Option<String>,
    #[serde(default)]
    pub province: String,
    pub locality: String,
}

/// Fichero `destinos/<conv>.json`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct DestinosFile {
    #[serde(default = "one")]
    pub schema_version: u32,
    pub convocatoria: String,
    #[serde(default)]
    pub source: DestinosSource,
    #[serde(default)]
    pub anonymized: bool,
    #[serde(default)]
    pub total: u32,
    #[serde(default)]
    pub notes: Option<String>,
    #[serde(default)]
    pub assignments: Vec<Assignment>,
}

impl DestinosFile {
    /// Total efectivo (el declarado o el número de adjudicaciones).
    pub fn effective_total(&self) -> u32 {
        let max_order = self.assignments.iter().map(|a| a.order).max().unwrap_or(0);
        self.total.max(max_order).max(self.assignments.len() as u32)
    }
}
