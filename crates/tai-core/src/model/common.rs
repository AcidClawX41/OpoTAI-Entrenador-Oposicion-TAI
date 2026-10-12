// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Tipos básicos compartidos por los datos y el contrato IPC.

use serde::{Deserialize, Serialize};

/// Letra de respuesta (`"A" | "B" | "C" | "D"`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Letter {
    A,
    B,
    C,
    D,
}

impl Letter {
    /// Todas las letras en orden.
    pub const ALL: [Letter; 4] = [Letter::A, Letter::B, Letter::C, Letter::D];

    /// Índice 0–3 de la opción.
    pub fn index(self) -> usize {
        match self {
            Letter::A => 0,
            Letter::B => 1,
            Letter::C => 2,
            Letter::D => 3,
        }
    }

    /// Texto de la letra.
    pub fn as_str(self) -> &'static str {
        match self {
            Letter::A => "A",
            Letter::B => "B",
            Letter::C => "C",
            Letter::D => "D",
        }
    }

    /// Interpreta `"A"`…`"D"` (admite minúsculas).
    pub fn parse(s: &str) -> Option<Letter> {
        match s.trim() {
            "A" | "a" => Some(Letter::A),
            "B" | "b" => Some(Letter::B),
            "C" | "c" => Some(Letter::C),
            "D" | "d" => Some(Letter::D),
            _ => None,
        }
    }
}

/// Bloque del temario (`"I" | "II" | "III" | "IV"`).
#[allow(clippy::upper_case_acronyms)] // Son números romanos, no siglas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub enum BlockId {
    I,
    II,
    III,
    IV,
}

impl BlockId {
    /// Todos los bloques en orden.
    pub const ALL: [BlockId; 4] = [BlockId::I, BlockId::II, BlockId::III, BlockId::IV];

    /// Texto del bloque.
    pub fn as_str(self) -> &'static str {
        match self {
            BlockId::I => "I",
            BlockId::II => "II",
            BlockId::III => "III",
            BlockId::IV => "IV",
        }
    }

    /// Interpreta `"I"`…`"IV"`.
    pub fn parse(s: &str) -> Option<BlockId> {
        match s.trim() {
            "I" => Some(BlockId::I),
            "II" => Some(BlockId::II),
            "III" => Some(BlockId::III),
            "IV" => Some(BlockId::IV),
            _ => None,
        }
    }

    /// Bloque de un tema `"IV.7"` → `IV`.
    pub fn from_topic(topic: &str) -> Option<BlockId> {
        topic.split_once('.').and_then(|(b, _)| BlockId::parse(b))
    }
}

/// Sistema de acceso.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Access {
    Libre,
    PromocionInterna,
}

impl Access {
    /// Sigla usada en etiquetas: `LI` / `PI`.
    pub fn short(self) -> &'static str {
        match self {
            Access::Libre => "LI",
            Access::PromocionInterna => "PI",
        }
    }
}

/// Tipo de banco de preguntas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum BankKind {
    Official,
    Practice,
}

/// Tipo de sección: cuestionario o supuesto práctico.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SectionKind {
    Theory,
    Case,
}

/// Tamaño de localidad para la predicción de destinos.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TierId {
    GranCiudad,
    CiudadMedia,
    Pueblo,
}

/// Enlace con título (fuentes oficiales).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Link {
    pub title: String,
    pub url: String,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn block_from_topic() {
        assert_eq!(BlockId::from_topic("IV.7"), Some(BlockId::IV));
        assert_eq!(BlockId::from_topic("II.10"), Some(BlockId::II));
        assert_eq!(BlockId::from_topic("V.1"), None);
        assert_eq!(BlockId::from_topic("IV"), None);
    }

    #[test]
    fn serde_names_match_contract() {
        let json = serde_json::to_string(&(
            Letter::C,
            BlockId::III,
            Access::PromocionInterna,
            TierId::CiudadMedia,
        ))
        .expect("serializa");
        assert_eq!(json, r#"["C","III","promocion_interna","ciudad_media"]"#);
    }
}
