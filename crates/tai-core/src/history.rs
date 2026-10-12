// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Historial de un perfil con cada pregunta (tabla `question_stats`).

use chrono::{DateTime, Utc};

/// Resultado de una respuesta contabilizada.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Outcome {
    Correct,
    Wrong,
    Blank,
}

impl Outcome {
    /// Texto para la base de datos.
    pub fn as_str(self) -> &'static str {
        match self {
            Outcome::Correct => "correct",
            Outcome::Wrong => "wrong",
            Outcome::Blank => "blank",
        }
    }

    /// Interpreta el texto de la base de datos.
    pub fn parse(s: &str) -> Option<Outcome> {
        match s {
            "correct" => Some(Outcome::Correct),
            "wrong" => Some(Outcome::Wrong),
            "blank" => Some(Outcome::Blank),
            _ => None,
        }
    }
}

/// Estadística acumulada de un perfil con una pregunta.
#[derive(Debug, Clone, PartialEq, Default)]
pub struct QuestionStat {
    pub question_id: String,
    /// Veces que la pregunta se ha contabilizado en exámenes entregados.
    pub seen: u32,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub last_answered_at: Option<DateTime<Utc>>,
    pub last_result: Option<Outcome>,
    /// Caja Leitner: 0 = fuera del repaso, 1–5 = en repaso (5 = dominada).
    pub srs_box: u8,
    pub srs_due_at: Option<DateTime<Utc>>,
    /// Marcada como dudosa en el último intento entregado que la incluía.
    pub flagged: bool,
}

impl QuestionStat {
    /// Estadística vacía para una pregunta.
    pub fn new(question_id: impl Into<String>) -> Self {
        Self {
            question_id: question_id.into(),
            ..Self::default()
        }
    }
}
