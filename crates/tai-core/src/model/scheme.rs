// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Esquemas de puntuación (`data/meta/scoring.json`, ver `docs/CONTRATO-DATOS.md` §2).
//!
//! `ScoringScheme` sirve a la vez para leer los datos y como DTO del contrato
//! (`ScoringScheme` en `types.ts`): por eso `sources` no se serializa hacia la interfaz.

use serde::{Deserialize, Serialize};

use super::common::{Access, Link, SectionKind};

fn one() -> u32 {
    1
}

/// Parte del ejercicio (cuestionario o supuesto práctico).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScoringPart {
    pub part: u32,
    #[serde(default)]
    pub title: String,
    pub kind: SectionKind,
    /// Preguntas de la parte (por supuesto si `kind = case`).
    pub questions: u32,
    #[serde(default)]
    pub reserve: u32,
    pub value: f64,
    /// Cada error resta `value / penalty_divisor`; `None` = sin penalización.
    #[serde(default)]
    pub penalty_divisor: Option<f64>,
    #[serde(default)]
    pub cases_offered: Option<u32>,
    #[serde(default)]
    pub cases_to_choose: Option<u32>,
}

impl ScoringPart {
    /// Puntos que resta cada error.
    pub fn penalty_per_error(&self) -> f64 {
        match self.penalty_divisor {
            Some(d) if d > 0.0 => self.value / d,
            _ => 0.0,
        }
    }

    /// Preguntas que puntúan en la parte (supuestos elegidos incluidos).
    pub fn counted_questions(&self) -> u32 {
        self.questions * self.cases_to_choose.unwrap_or(1).max(1)
    }

    /// Puntuación directa máxima nominal de la parte.
    pub fn nominal_max_direct(&self) -> f64 {
        self.value * f64::from(self.counted_questions())
    }
}

/// Unidad de calificación (una o varias partes calificadas juntas).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradingUnit {
    pub parts: Vec<u32>,
    pub max_grade: f64,
    pub pass_grade: f64,
    /// Corte mínimo reglamentario como fracción de la directa máxima (p. ej. 0,30).
    #[serde(default)]
    pub min_direct_ratio: f64,
    /// Corte oficial en puntos directos sobre la directa máxima nominal del esquema.
    #[serde(default)]
    pub cutoff_direct: Option<f64>,
    #[serde(default)]
    pub cutoff_note: Option<String>,
}

/// Calificación del ejercicio.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Grading {
    pub units: Vec<GradingUnit>,
}

/// Esquema de puntuación de una convocatoria.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScoringScheme {
    pub id: String,
    pub title: String,
    pub access: Access,
    #[serde(default)]
    pub convocatoria: Option<String>,
    /// Fuentes oficiales (solo en los datos; no viaja a la interfaz).
    #[serde(default, skip_serializing)]
    pub sources: Vec<Link>,
    pub duration_minutes: u32,
    pub parts: Vec<ScoringPart>,
    pub grading: Grading,
    #[serde(default)]
    pub notes: Option<String>,
}

impl ScoringScheme {
    /// Parte por número.
    pub fn part(&self, part: u32) -> Option<&ScoringPart> {
        self.parts.iter().find(|p| p.part == part)
    }

    /// Primera parte de tipo supuesto práctico.
    pub fn case_part(&self) -> Option<&ScoringPart> {
        self.parts.iter().find(|p| p.kind == SectionKind::Case)
    }

    /// Primera parte de tipo cuestionario.
    pub fn theory_part(&self) -> Option<&ScoringPart> {
        self.parts.iter().find(|p| p.kind == SectionKind::Theory)
    }

    /// Directa máxima nominal de una unidad (`N_oficial`).
    pub fn nominal_max_direct(&self, unit: &GradingUnit) -> f64 {
        unit.parts
            .iter()
            .filter_map(|p| self.part(*p))
            .map(ScoringPart::nominal_max_direct)
            .sum()
    }

    /// Calificación máxima total.
    pub fn max_grade(&self) -> f64 {
        self.grading.units.iter().map(|u| u.max_grade).sum()
    }

    /// Copia del esquema limitada a unas partes (p. ej. simulacro sin supuesto).
    ///
    /// Las unidades conservan solo las partes incluidas y se descartan las que quedan vacías.
    /// El corte oficial de una unidad recortada se reescala a su nueva directa máxima nominal.
    pub fn restricted_to_parts(&self, keep: &[u32]) -> ScoringScheme {
        let mut out = self.clone();
        out.parts.retain(|p| keep.contains(&p.part));
        let mut units = Vec::new();
        for unit in &self.grading.units {
            let parts: Vec<u32> = unit
                .parts
                .iter()
                .copied()
                .filter(|p| keep.contains(p))
                .collect();
            if parts.is_empty() {
                continue;
            }
            let mut new_unit = unit.clone();
            if parts.len() != unit.parts.len() {
                let old_n = self.nominal_max_direct(unit);
                new_unit.parts = parts;
                let new_n = out.nominal_max_direct(&new_unit);
                new_unit.cutoff_direct = unit
                    .cutoff_direct
                    .filter(|_| old_n > 0.0)
                    .map(|c| c * new_n / old_n);
            }
            units.push(new_unit);
        }
        out.grading.units = units;
        out
    }
}

/// Fichero `scoring.json`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ScoringFile {
    #[serde(default = "one")]
    pub schema_version: u32,
    pub default_scheme: String,
    pub schemes: Vec<ScoringScheme>,
}

impl ScoringFile {
    /// Esquema por id.
    pub fn scheme(&self, id: &str) -> Option<&ScoringScheme> {
        self.schemes.iter().find(|s| s.id == id)
    }
}
