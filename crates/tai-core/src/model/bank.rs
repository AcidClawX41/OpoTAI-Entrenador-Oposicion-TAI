// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Banco de preguntas (`data/banks/**/<bank-id>.json`, ver `docs/CONTRATO-DATOS.md` §1).
//!
//! La deserialización es tolerante: los campos opcionales del esquema toman valores por
//! defecto para que un banco a medias no impida arrancar la aplicación.

use serde::{Deserialize, Serialize};

use super::common::{Access, BankKind, BlockId, Letter, SectionKind};

fn one() -> u32 {
    1
}

/// Imagen asociada a una pregunta o a un enunciado.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Media {
    /// Ruta relativa a `data/banks/`, p. ej. `assets/tai-li-2024/q12.png`.
    pub path: String,
    #[serde(default)]
    pub alt: String,
    /// Data URI que rellena el núcleo al servir el examen (nunca viene en los ficheros).
    #[serde(default)]
    pub data_url: Option<String>,
}

/// Origen de la plantilla de respuestas.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AnswerKey {
    Definitiva,
    Provisional,
    #[default]
    Propia,
}

/// Documento oficial de origen (cuadernillo, plantilla, criterios…).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SourceDocument {
    #[serde(default)]
    pub kind: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
    #[serde(default)]
    pub sha256: Option<String>,
}

/// Procedencia del banco.
#[derive(Debug, Clone, PartialEq, Eq, Default, Serialize, Deserialize)]
pub struct BankSource {
    #[serde(default)]
    pub publisher: String,
    #[serde(default)]
    pub documents: Vec<SourceDocument>,
    #[serde(default)]
    pub answer_key: AnswerKey,
    #[serde(default)]
    pub retrieved: Option<String>,
    #[serde(default)]
    pub notes: Option<String>,
}

/// Pregunta tipo test (4 opciones, una correcta).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Question {
    pub id: String,
    #[serde(default)]
    pub number: u32,
    pub text: String,
    #[serde(default)]
    pub options: Vec<String>,
    /// Letra correcta; `None` si está anulada sin respuesta.
    #[serde(default)]
    pub answer: Option<Letter>,
    #[serde(default)]
    pub annulled: bool,
    #[serde(default)]
    pub topic: Option<String>,
    #[serde(default)]
    pub explanation: Option<String>,
    #[serde(default)]
    pub option_notes: Option<Vec<Option<String>>>,
    #[serde(default)]
    pub references: Vec<String>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(default)]
    pub media: Vec<Media>,
    #[serde(default)]
    pub outdated: bool,
    #[serde(default)]
    pub outdated_note: Option<String>,
    #[serde(default)]
    pub needs_review: bool,
}

impl Question {
    /// Bloque de la pregunta: el del tema o, si no tiene, el de su sección (supuestos).
    pub fn block(&self, section: &Section) -> Option<BlockId> {
        self.topic
            .as_deref()
            .and_then(BlockId::from_topic)
            .or(section.block)
    }

    /// Tiene explicación no vacía.
    pub fn has_explanation(&self) -> bool {
        self.explanation
            .as_deref()
            .is_some_and(|e| !e.trim().is_empty())
    }

    /// Se puede corregir: 4 opciones, no anulada y con respuesta.
    pub fn is_gradable(&self) -> bool {
        self.options.len() == 4 && !self.annulled && self.answer.is_some()
    }

    /// Cuenta como anulada al corregir (anulada en plantilla o sin respuesta).
    pub fn counts_as_annulled(&self) -> bool {
        self.annulled || self.answer.is_none()
    }
}

/// Sección de un banco: cuestionario (`theory`) o un supuesto práctico (`case`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Section {
    pub id: String,
    #[serde(default = "one")]
    pub part: u32,
    pub kind: SectionKind,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub block: Option<BlockId>,
    #[serde(default)]
    pub statement: Option<String>,
    #[serde(default)]
    pub media: Vec<Media>,
    #[serde(default)]
    pub questions: Vec<Question>,
    #[serde(default)]
    pub reserve: Vec<Question>,
}

impl Section {
    /// Todas las preguntas (titulares y de reserva) con su marca de reserva.
    pub fn all_questions(&self) -> impl Iterator<Item = (&Question, bool)> {
        self.questions
            .iter()
            .map(|q| (q, false))
            .chain(self.reserve.iter().map(|q| (q, true)))
    }
}

/// Banco de preguntas (examen oficial o colección de práctica).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Bank {
    #[serde(default = "one")]
    pub schema_version: u32,
    pub id: String,
    pub kind: BankKind,
    pub title: String,
    #[serde(default)]
    pub description: Option<String>,
    #[serde(default)]
    pub access: Option<Access>,
    #[serde(default)]
    pub year: Option<i32>,
    #[serde(default)]
    pub convocatoria: Option<String>,
    #[serde(default)]
    pub exam_date: Option<String>,
    #[serde(default)]
    pub model: Option<String>,
    #[serde(default)]
    pub duration_minutes: Option<u32>,
    #[serde(default)]
    pub scoring_scheme: Option<String>,
    #[serde(default)]
    pub source: Option<BankSource>,
    #[serde(default)]
    pub sections: Vec<Section>,
}

impl Bank {
    /// Plantilla de respuestas del banco (por defecto «propia»).
    pub fn answer_key(&self) -> AnswerKey {
        self.source
            .as_ref()
            .map(|s| s.answer_key)
            .unwrap_or_default()
    }

    /// Etiqueta corta del origen: `"Oficial TAI-LI 2024"` (con el modelo de cuadernillo o
    /// «llamamiento extraordinario» si procede) o el título del banco.
    pub fn short_label(&self) -> String {
        match (self.kind, self.access, self.year) {
            (BankKind::Official, Some(access), Some(year)) => {
                let mut label = format!("Oficial TAI-{} {year}", access.short());
                if self.title.to_lowercase().contains("extraordinari") {
                    label.push_str(" (llamamiento extraordinario)");
                } else if let Some(m) = self.model.as_deref() {
                    label.push_str(&format!(" (modelo {m})"));
                }
                label
            }
            _ => self.title.clone(),
        }
    }

    /// Busca una sección por id.
    pub fn section(&self, id: &str) -> Option<&Section> {
        self.sections.iter().find(|s| s.id == id)
    }

    /// Número de supuestos prácticos.
    pub fn case_count(&self) -> usize {
        self.sections
            .iter()
            .filter(|s| s.kind == SectionKind::Case)
            .count()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn tolerant_deserialization() {
        let json = r#"{
            "id": "mini", "kind": "practice", "title": "Mini",
            "sections": [{ "id": "p1", "kind": "theory",
                "questions": [{ "id": "mini-p1-001", "text": "¿?", "options": ["a","b","c","d"], "answer": "B" }] }]
        }"#;
        let bank: Bank = serde_json::from_str(json).expect("banco válido");
        assert_eq!(bank.schema_version, 1);
        assert_eq!(bank.sections[0].part, 1);
        let q = &bank.sections[0].questions[0];
        assert_eq!(q.answer, Some(Letter::B));
        assert!(q.is_gradable());
        assert!(!q.annulled);
        assert_eq!(bank.answer_key(), AnswerKey::Propia);
    }
}
