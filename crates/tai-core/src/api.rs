// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! DTO del contrato IPC. **Réplica exacta de `app/src/api/types.ts`**:
//! claves en snake_case, `Option` → `null` (nunca se omiten claves), enums como strings
//! snake_case y uniones discriminadas con `type`.
//!
//! Algunos tipos del contrato coinciden con los del modelo de datos y se reexportan
//! (`Media`, `ScoringScheme`, `TierInfo`…). El test `tests/contract.rs` compara las claves
//! serializadas con las interfaces de `types.ts`.

use serde::{Deserialize, Serialize};

pub use crate::error::{ApiError, ApiErrorCode};
pub use crate::model::{
    Access, AnswerKey, BankKind, BlockId, GradingUnit, Letter, Link, Media, ScoringPart,
    ScoringScheme, SectionKind, TierId,
};

/// `TierInfo` del contrato (mismo formato que en `localidades.json`).
pub type TierInfo = crate::model::TierDef;

fn default_true() -> bool {
    true
}

// ───────────────────────────── Primitivos ─────────────────────────────

/// Modo de corrección.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum FeedbackMode {
    Immediate,
    #[default]
    End,
}

/// Tipo de examen.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ExamMode {
    Official,
    Simulacro,
    Practice,
    Review,
    Case,
}

impl ExamMode {
    /// Texto usado en la base de datos.
    pub fn as_str(self) -> &'static str {
        match self {
            ExamMode::Official => "official",
            ExamMode::Simulacro => "simulacro",
            ExamMode::Practice => "practice",
            ExamMode::Review => "review",
            ExamMode::Case => "case",
        }
    }

    /// Interpreta el texto de la base de datos.
    pub fn parse(s: &str) -> Option<ExamMode> {
        match s {
            "official" => Some(ExamMode::Official),
            "simulacro" => Some(ExamMode::Simulacro),
            "practice" => Some(ExamMode::Practice),
            "review" => Some(ExamMode::Review),
            "case" => Some(ExamMode::Case),
            _ => None,
        }
    }

    /// Examen completo (réplica oficial o simulacro): nota 0–100 y predicción.
    pub fn is_full_exam(self) -> bool {
        matches!(self, ExamMode::Official | ExamMode::Simulacro)
    }
}

/// Origen de las preguntas en un test de práctica.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum QuestionSource {
    #[default]
    All,
    Unseen,
    Failed,
    Flagged,
}

// ───────────────────────────── Información y catálogo ─────────────────────────────

/// `AppInfo`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    /// Commit corto con el que se compiló la aplicación, si se conoce.
    pub git_commit: Option<String>,
    pub author: String,
    pub copyright: String,
    /// Identificador SPDX de la licencia.
    pub license: String,
    pub license_name: String,
    pub repository: String,
    pub data_updated: Option<String>,
    pub banks: u32,
    pub questions: u32,
    pub questions_with_explanation: u32,
    pub official_exams: u32,
    pub theory_topics: u32,
    pub db_path: String,
}

/// `Topic`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Topic {
    pub id: String,
    pub block: BlockId,
    pub number: u32,
    pub title: String,
    pub keywords: Vec<String>,
}

/// `Block`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Block {
    pub id: BlockId,
    pub title: String,
    pub topics: Vec<Topic>,
}

/// `Temario`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Temario {
    pub convocatoria: String,
    pub source_title: String,
    pub source_url: String,
    pub blocks: Vec<Block>,
}

/// `SectionSummary`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct SectionSummary {
    pub id: String,
    pub part: u32,
    pub kind: SectionKind,
    pub title: String,
    pub block: Option<BlockId>,
    pub question_count: u32,
    pub reserve_count: u32,
    /// Enunciado del supuesto en Markdown, con las figuras sustituidas por un rótulo
    /// (vista previa ligera; el examen trae las imágenes).
    pub statement: Option<String>,
}

/// `BankSummary`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct BankSummary {
    pub id: String,
    pub kind: BankKind,
    pub title: String,
    pub description: Option<String>,
    pub access: Option<Access>,
    pub year: Option<i32>,
    pub convocatoria: Option<String>,
    pub exam_date: Option<String>,
    pub duration_minutes: Option<u32>,
    pub scoring_scheme: Option<String>,
    pub question_count: u32,
    pub reserve_count: u32,
    pub annulled_count: u32,
    pub explained_count: u32,
    pub case_count: u32,
    pub sections: Vec<SectionSummary>,
    pub source_urls: Vec<String>,
    pub answer_key: AnswerKey,
    /// Banco con la otra parte del mismo examen oficial (p. ej. el 2.º ejercicio de 2018,
    /// publicado aparte): en el banco principal, el ejercicio que añade su réplica oficial; en
    /// el secundario, el principal cuya réplica completa lo incluye.
    #[serde(default)]
    pub companion_bank_id: Option<String>,
    /// `true` si la réplica oficial de este banco es el examen completo (1.ª parte + supuesto
    /// práctico), por sí mismo o con `companion_bank_id`.
    #[serde(default)]
    pub complete_exam: bool,
}

/// Estado de una convocatoria (`ConvocatoriaSummary.status`).
pub use crate::model::ConvocatoriaStatus;
/// Base del corte (`ConvocatoriaSummary.cutoff_basis`).
pub use crate::model::CutoffBasis;

/// `ConvocatoriaSummary`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ConvocatoriaSummary {
    pub id: String,
    pub access: Access,
    pub year: i32,
    pub title: String,
    pub exam_date: Option<String>,
    pub status: ConvocatoriaStatus,
    pub scoring_scheme: Option<String>,
    pub plazas_total: Option<u32>,
    pub presentados: Option<u32>,
    pub aptos: Option<u32>,
    pub cutoff_direct: Option<f64>,
    pub cutoff_max_direct: Option<f64>,
    pub cutoff_basis: Option<CutoffBasis>,
    pub has_grades: bool,
    pub has_destinations: bool,
    pub sources: Vec<Link>,
}

/// `LocalityInfo`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LocalityInfo {
    pub name: String,
    pub province: String,
    pub population: Option<u64>,
    pub is_provincial_capital: bool,
    pub tier: TierId,
    pub share_of_plazas: Option<f64>,
}

/// `CatalogInfo`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CatalogInfo {
    pub banks: Vec<BankSummary>,
    pub temario: Option<Temario>,
    pub schemes: Vec<ScoringScheme>,
    pub default_scheme: String,
    pub convocatorias: Vec<ConvocatoriaSummary>,
    pub target_convocatoria: Option<String>,
    pub tiers: Vec<TierInfo>,
}

// ───────────────────────────── Perfiles y ajustes ─────────────────────────────

/// `Profile`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub color: String,
    /// Emoji (≤ 16 caracteres) o imagen propia de cualquier proporción como data URL
    /// `data:image/png|jpeg|webp|gif;base64,…` (≤ 2 MB; la interfaz la optimiza antes de
    /// guardarla). Se guarda solo en local.
    pub avatar: Option<String>,
    pub created_at: String,
    pub last_active_at: Option<String>,
}

/// Tema visual.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

/// `Settings`. Los campos ausentes (p. ej. ajustes guardados por versiones anteriores) toman
/// los valores por defecto del contrato («Ajustes por defecto» en `docs/CONTRATO-API.md`).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(default)]
pub struct Settings {
    pub theme: Theme,
    pub accent: String,
    /// Corrección en tests de práctica.
    pub default_feedback: FeedbackMode,
    /// Corrección en simulacros y exámenes oficiales.
    pub exam_feedback: FeedbackMode,
    pub sound_enabled: bool,
    /// Volumen 0–1.
    pub sound_volume: f64,
    /// Simulacro sorpresa al abrir la aplicación.
    pub random_exam_on_startup: bool,
    pub show_timer: bool,
    pub confirm_before_submit: bool,
    pub keyboard_shortcuts: bool,
    pub target_convocatoria: Option<String>,
    pub cutoff_override_ratio: Option<f64>,
    pub preferred_localities: Vec<String>,
    pub exam_date: Option<String>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            theme: Theme::System,
            accent: crate::defaults::DEFAULT_ACCENT.to_string(),
            default_feedback: FeedbackMode::Immediate,
            exam_feedback: FeedbackMode::End,
            sound_enabled: true,
            sound_volume: 0.6,
            random_exam_on_startup: true,
            show_timer: true,
            confirm_before_submit: true,
            keyboard_shortcuts: true,
            target_convocatoria: None,
            cutoff_override_ratio: None,
            preferred_localities: Vec::new(),
            exam_date: None,
        }
    }
}

// ───────────────────────────── Generación de exámenes ─────────────────────────────

/// `ExamSpec`: unión discriminada por `type`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ExamSpec {
    /// Réplica exacta de un examen oficial.
    Official {
        bank_id: String,
        #[serde(default = "default_true")]
        include_reserve: bool,
        #[serde(default)]
        timed: bool,
        #[serde(default)]
        feedback: FeedbackMode,
        /// Bloque elegido para la 1.ª parte cuando el examen la ofrece a elegir (p. ej. 2016:
        /// preguntas comunes + bloque III o IV). `None` = el primero ofrecido.
        #[serde(default)]
        theory_block: Option<BlockId>,
    },
    /// Simulacro con el formato de un esquema oficial.
    Simulacro {
        #[serde(default)]
        scheme_id: Option<String>,
        #[serde(default)]
        part1_questions: Option<u32>,
        #[serde(default = "default_true")]
        include_case: bool,
        #[serde(default)]
        duration_minutes: Option<u32>,
        #[serde(default = "default_true")]
        prefer_unseen: bool,
        #[serde(default)]
        seed: Option<u64>,
        #[serde(default)]
        feedback: FeedbackMode,
        /// «Freestyle»: batería al azar de todas las convocatorias (ingreso libre y promoción
        /// interna de cualquier año), corregida con el esquema elegido. Solo cambia la
        /// presentación (título y subtítulo): la selección ya mezcla todos los bancos.
        #[serde(default)]
        freestyle: bool,
    },
    /// «Simulacro OpoTAI n.º N»: composición fija y determinista.
    Numbered {
        number: u32,
        #[serde(default)]
        feedback: FeedbackMode,
        /// `true` (por defecto): cronómetro con la duración oficial del esquema («examen real»).
        /// `false`: sin límite de tiempo («aprendizaje»).
        #[serde(default = "default_true")]
        timed: bool,
    },
    /// Simulacro sorpresa: el núcleo sortea un examen oficial completo o un simulacro numerado.
    Random {
        #[serde(default)]
        feedback: FeedbackMode,
        /// `true` (por defecto): el examen sorteado lleva el cronómetro oficial; `false`: sin
        /// límite de tiempo.
        #[serde(default = "default_true")]
        timed: bool,
    },
    /// Test de práctica filtrado.
    Practice {
        #[serde(default)]
        blocks: Vec<BlockId>,
        #[serde(default)]
        topics: Vec<String>,
        #[serde(default)]
        bank_ids: Vec<String>,
        #[serde(default)]
        include_cases: bool,
        #[serde(default)]
        source: QuestionSource,
        count: u32,
        #[serde(default)]
        feedback: FeedbackMode,
        #[serde(default)]
        duration_minutes: Option<u32>,
        #[serde(default)]
        seed: Option<u64>,
    },
    /// Repaso espaciado de preguntas falladas.
    Review {
        count: u32,
        #[serde(default)]
        feedback: FeedbackMode,
    },
    /// Un supuesto práctico concreto.
    Case {
        bank_id: String,
        section_id: String,
        #[serde(default)]
        feedback: FeedbackMode,
        #[serde(default)]
        timed: bool,
    },
}

impl ExamSpec {
    /// Modo de examen de la especificación (`random` se resuelve antes de generar; aquí se
    /// considera simulacro).
    pub fn mode(&self) -> ExamMode {
        match self {
            ExamSpec::Official { .. } => ExamMode::Official,
            ExamSpec::Simulacro { .. } | ExamSpec::Numbered { .. } | ExamSpec::Random { .. } => {
                ExamMode::Simulacro
            }
            ExamSpec::Practice { .. } => ExamMode::Practice,
            ExamSpec::Review { .. } => ExamMode::Review,
            ExamSpec::Case { .. } => ExamMode::Case,
        }
    }

    /// Modo de corrección pedido.
    pub fn feedback(&self) -> FeedbackMode {
        match self {
            ExamSpec::Official { feedback, .. }
            | ExamSpec::Simulacro { feedback, .. }
            | ExamSpec::Numbered { feedback, .. }
            | ExamSpec::Random { feedback, .. }
            | ExamSpec::Practice { feedback, .. }
            | ExamSpec::Review { feedback, .. }
            | ExamSpec::Case { feedback, .. } => *feedback,
        }
    }

    /// Identidad del examen dentro de la bolsa del sorteo (`official:<banco>` o `numbered:<n>`).
    pub fn draw_key(&self) -> Option<String> {
        match self {
            ExamSpec::Official { bank_id, .. } => Some(format!("official:{bank_id}")),
            ExamSpec::Numbered { number, .. } => Some(format!("numbered:{number}")),
            _ => None,
        }
    }
}

/// `PaperQuestion` (sin respuesta ni explicación).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaperQuestion {
    pub id: String,
    pub number: u32,
    pub display_number: String,
    pub text: String,
    pub options: Vec<String>,
    pub is_reserve: bool,
    pub topic: Option<String>,
    pub block: Option<BlockId>,
    pub media: Vec<Media>,
    pub source_label: String,
}

/// `PaperSection`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct PaperSection {
    pub id: String,
    pub part: u32,
    pub kind: SectionKind,
    pub title: String,
    pub block: Option<BlockId>,
    pub statement: Option<String>,
    pub media: Vec<Media>,
    pub questions: Vec<PaperQuestion>,
}

/// `ExamPaper`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ExamPaper {
    pub attempt_id: String,
    pub profile_id: String,
    pub mode: ExamMode,
    pub title: String,
    pub subtitle: Option<String>,
    pub scheme: ScoringScheme,
    pub duration_minutes: Option<u32>,
    pub feedback: FeedbackMode,
    pub requires_case_choice: bool,
    pub cases_to_choose: u32,
    pub sections: Vec<PaperSection>,
    pub started_at: String,
    pub total_questions: u32,
    /// Procede del sorteo del simulacro sorpresa.
    pub drawn: bool,
}

/// Tipo de examen sorteado (`RandomDraw.kind`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RandomDrawKind {
    Official,
    Numbered,
}

/// `RandomDraw`: resultado del sorteo del simulacro sorpresa.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct RandomDraw {
    pub spec: ExamSpec,
    pub kind: RandomDrawKind,
    pub title: String,
    pub subtitle: Option<String>,
    pub description: String,
    pub question_count: u32,
    pub case_count: u32,
    pub duration_minutes: Option<u32>,
    pub already_done: bool,
    pub pool_size: u32,
}

/// `AnswerState`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnswerState {
    pub question_id: String,
    #[serde(default)]
    pub choice: Option<Letter>,
    #[serde(default)]
    pub flagged: bool,
}

/// `ProgressPayload`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ProgressPayload {
    pub attempt_id: String,
    #[serde(default)]
    pub answers: Vec<AnswerState>,
    #[serde(default)]
    pub chosen_case: Option<String>,
    #[serde(default)]
    pub elapsed_seconds: u64,
}

/// `ActiveAttempt`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActiveAttempt {
    pub paper: ExamPaper,
    pub progress: ProgressPayload,
}

/// `AnswerFeedback`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct AnswerFeedback {
    pub question_id: String,
    pub chosen: Option<Letter>,
    pub correct: Option<Letter>,
    pub is_correct: bool,
    pub annulled: bool,
    pub explanation: Option<String>,
    pub option_notes: Option<Vec<Option<String>>>,
    pub references: Vec<String>,
}

// ───────────────────────────── Resultados ─────────────────────────────

/// `ItemStatus`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemStatus {
    Correct,
    Wrong,
    Blank,
    Annulled,
    NotCounted,
}

impl ItemStatus {
    /// Cuenta en la puntuación.
    pub fn is_counted(self) -> bool {
        matches!(
            self,
            ItemStatus::Correct | ItemStatus::Wrong | ItemStatus::Blank
        )
    }

    /// Texto para la base de datos.
    pub fn as_str(self) -> &'static str {
        match self {
            ItemStatus::Correct => "correct",
            ItemStatus::Wrong => "wrong",
            ItemStatus::Blank => "blank",
            ItemStatus::Annulled => "annulled",
            ItemStatus::NotCounted => "not_counted",
        }
    }
}

/// `ReviewItem`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReviewItem {
    pub question_id: String,
    pub section_id: String,
    pub part: u32,
    pub display_number: String,
    pub text: String,
    pub options: Vec<String>,
    pub chosen: Option<Letter>,
    pub correct: Option<Letter>,
    pub status: ItemStatus,
    pub is_reserve: bool,
    pub flagged: bool,
    pub explanation: Option<String>,
    pub option_notes: Option<Vec<Option<String>>>,
    pub references: Vec<String>,
    pub topic: Option<String>,
    pub block: Option<BlockId>,
    pub media: Vec<Media>,
    pub source_label: String,
    pub outdated: bool,
    pub outdated_note: Option<String>,
}

/// `PartScore`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PartScore {
    pub part: u32,
    pub title: String,
    pub counted: u32,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub annulled: u32,
    pub value: f64,
    pub penalty_divisor: Option<f64>,
    pub penalty_points: f64,
    pub direct: f64,
    pub max_direct: f64,
}

/// Origen del corte aplicado a una unidad.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CutoffSource {
    Official,
    Estimated,
    User,
    Floor,
}

/// `UnitGrade`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct UnitGrade {
    pub parts: Vec<u32>,
    pub direct: f64,
    pub max_direct: f64,
    pub cutoff_direct: f64,
    pub cutoff_source: CutoffSource,
    pub grade: f64,
    pub pass_grade: f64,
    pub max_grade: f64,
    pub passed: bool,
    pub margin_direct: f64,
    /// Parte eliminada: no se corrige porque no se superó la anterior (nota 0 en el total).
    #[serde(default)]
    pub ungraded: bool,
    /// Si `ungraded`, la nota que le habría correspondido por su directa (orientativa; no cuenta).
    #[serde(default)]
    pub would_be_grade: Option<f64>,
}

/// `GradeResult`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradeResult {
    pub scheme_id: String,
    pub parts: Vec<PartScore>,
    pub units: Vec<UnitGrade>,
    pub total_grade: f64,
    pub max_grade: f64,
    pub passed: bool,
    pub notes: Vec<String>,
}

/// `BlockStat`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct BlockStat {
    pub key: String,
    pub block: Option<BlockId>,
    pub topic: Option<String>,
    pub label: String,
    pub total: u32,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub accuracy: f64,
    pub net_ratio: f64,
}

/// `TierProbability`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TierProbability {
    pub tier: TierId,
    pub label: String,
    pub description: String,
    pub probability: f64,
    pub share_of_plazas: Option<f64>,
}

/// `CityProbability`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CityProbability {
    pub locality: String,
    pub province: String,
    pub tier: TierId,
    pub probability: f64,
    pub share_of_plazas: f64,
}

/// Cuantiles del puesto estimado (`Prediction.estimated_rank`).
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct RankEstimate {
    pub p10: f64,
    pub p50: f64,
    pub p90: f64,
}

/// Calidad de los datos usados en la predicción.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DataQuality {
    Real,
    Partial,
    Synthetic,
}

/// `Prediction`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Prediction {
    pub target_convocatoria: String,
    pub target_label: String,
    pub plazas: Option<u32>,
    pub observed_grade: f64,
    pub expected_grade: f64,
    pub p_pass: f64,
    pub p_plaza: f64,
    pub cutoff_ratio: f64,
    pub estimated_rank: Option<RankEstimate>,
    pub estimated_percentile: Option<f64>,
    pub tiers: Vec<TierProbability>,
    /// Probabilidad de que queden plazas en grandes ciudades distintas de Madrid al elegir
    /// (`None` sin datos de destinos).
    pub p_big_city_outside_madrid: Option<f64>,
    pub top_cities: Vec<CityProbability>,
    pub preferred: Vec<CityProbability>,
    pub verdict: String,
    pub reasoning: Vec<String>,
    pub assumptions: Vec<String>,
    pub data_quality: DataQuality,
}

/// Enunciado de un supuesto práctico de un intento (para revisar el resultado más tarde).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CaseStatement {
    pub section_id: String,
    pub title: String,
    pub statement: String,
    pub media: Vec<Media>,
}

/// `AttemptResult`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AttemptResult {
    pub attempt_id: String,
    pub profile_id: String,
    pub mode: ExamMode,
    pub title: String,
    pub started_at: String,
    pub finished_at: String,
    pub elapsed_seconds: u64,
    pub duration_minutes: Option<u32>,
    pub chosen_case: Option<String>,
    pub grade: GradeResult,
    pub by_block: Vec<BlockStat>,
    pub by_topic: Vec<BlockStat>,
    pub review: Vec<ReviewItem>,
    pub prediction: Option<Prediction>,
    /// Especificación con la que se generó (para «Repetir este examen»).
    #[serde(default)]
    pub spec: Option<ExamSpec>,
    /// Enunciados de los supuestos del intento (el elegido o, si no había que elegir, todos).
    #[serde(default)]
    pub cases: Vec<CaseStatement>,
}

/// Estado visible de un intento (`AttemptSummary.status`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum AttemptStatus {
    InProgress,
    Finished,
}

/// `AttemptSummary`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct AttemptSummary {
    pub attempt_id: String,
    pub mode: ExamMode,
    pub title: String,
    pub status: AttemptStatus,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub elapsed_seconds: u64,
    pub total_grade: Option<f64>,
    pub max_grade: Option<f64>,
    pub passed: Option<bool>,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub p_plaza: Option<f64>,
}

// ───────────────────────────── Estadísticas y repaso ─────────────────────────────

/// `GradePoint`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct GradePoint {
    pub attempt_id: String,
    pub date: String,
    pub mode: ExamMode,
    pub title: String,
    pub grade: f64,
    pub max_grade: f64,
    pub passed: bool,
}

/// `ActivityDay`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ActivityDay {
    pub date: String,
    pub answered: u32,
}

/// `ProfileStats`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProfileStats {
    pub profile_id: String,
    pub attempts_finished: u32,
    pub simulacros_finished: u32,
    pub questions_answered: u32,
    pub distinct_questions_seen: u32,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub accuracy: f64,
    pub average_grade: Option<f64>,
    pub best_grade: Option<f64>,
    pub last_grade: Option<f64>,
    pub streak_days: u32,
    pub study_seconds: u64,
    pub grade_history: Vec<GradePoint>,
    pub activity: Vec<ActivityDay>,
    pub by_block: Vec<BlockStat>,
    pub by_topic: Vec<BlockStat>,
    pub weakest_topics: Vec<BlockStat>,
    pub review_due: u32,
    pub readiness: Option<Prediction>,
}

/// Elemento de `ReviewSummary.by_block`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReviewBlockCount {
    pub block: Option<BlockId>,
    pub due: u32,
    pub learning: u32,
}

/// `ReviewSummary`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct ReviewSummary {
    pub due: u32,
    pub learning: u32,
    pub mastered: u32,
    pub total_failed: u32,
    pub by_block: Vec<ReviewBlockCount>,
}

// ───────────────────────────── Teoría ─────────────────────────────

/// `TheorySummary`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TheorySummary {
    pub topic: String,
    pub block: BlockId,
    pub title: String,
    pub summary: String,
    pub reading_minutes: u32,
    pub key_points: Vec<String>,
    pub question_count: u32,
    pub updated: Option<String>,
}

/// `TheoryTopic` (= `TheorySummary` + contenido y fuentes).
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct TheoryTopic {
    pub topic: String,
    pub block: BlockId,
    pub title: String,
    pub summary: String,
    pub reading_minutes: u32,
    pub key_points: Vec<String>,
    pub question_count: u32,
    pub updated: Option<String>,
    pub content: String,
    pub sources: Vec<Link>,
}

// ───────────────────────────── Calculadora ─────────────────────────────

/// `ManualPartInput`.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct ManualPartInput {
    pub part: u32,
    #[serde(default)]
    pub correct: u32,
    #[serde(default)]
    pub wrong: u32,
    #[serde(default)]
    pub blank: u32,
}

/// `ManualGradeInput`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ManualGradeInput {
    pub scheme_id: String,
    #[serde(default)]
    pub parts: Vec<ManualPartInput>,
    #[serde(default)]
    pub cutoff_override_ratio: Option<f64>,
}

/// `CalculatorResult`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CalculatorResult {
    pub grade: GradeResult,
    pub prediction: Prediction,
}

// ───────────────────────────── Simulador de destinos ─────────────────────────────

/// Tipo de escenario del simulador de destinos.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScenarioKind {
    /// Proyección para la convocatoria objetivo con el reparto de destinos más reciente.
    Projection,
    /// Réplica de una convocatoria anterior con sus notas y destinos reales.
    Historical,
}

/// Plazas de una provincia en un escenario (mapa).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ProvinceAvailability {
    pub province: String,
    /// Plazas adjudicadas en total en esa convocatoria.
    pub posts: u32,
    /// Media de plazas aún libres al llegar tu turno (si obtienes plaza).
    pub available_posts: f64,
    /// Probabilidad de que quede al menos una libre al elegir (si obtienes plaza).
    pub p_available: f64,
    /// Probabilidad de acabar allí según lo que eligieron los números de orden cercanos.
    pub p_likely: f64,
    /// Último número de orden que obtuvo plaza allí.
    pub last_order: u32,
}

/// Plazas de una localidad en un escenario.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LocalityAvailability {
    pub locality: String,
    pub province: String,
    pub tier: TierId,
    pub posts: u32,
    pub available_posts: f64,
    pub p_available: f64,
    pub p_likely: f64,
    pub last_order: u32,
}

/// Tipo de plaza (ámbito del organismo de destino) en un escenario.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct CategoryAvailability {
    pub category: String,
    pub posts: u32,
    pub available_posts: f64,
    pub p_likely: f64,
}

/// Destino concreto que eligieron personas con un número de orden cercano al tuyo.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct LikelyDestination {
    pub locality: String,
    pub province: String,
    pub category: String,
    /// Organismo tal y como figura en el BOE (abreviado).
    pub organism: Option<String>,
    /// Centro directivo tal y como figura en el BOE.
    pub unit: Option<String>,
    pub probability: f64,
}

/// Un escenario del simulador (proyección o convocatoria anterior).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DestinationScenario {
    /// `"proyeccion"` o el id de la convocatoria (`"li-2024"`).
    pub id: String,
    pub kind: ScenarioKind,
    pub label: String,
    /// Convocatoria cuyos destinos se usan.
    pub dataset: String,
    pub year: i32,
    /// Personas con destino en el escenario (plazas de la convocatoria objetivo en la proyección).
    pub aprobados: u32,
    /// Adjudicaciones con destino del conjunto de datos.
    pub posts_total: u32,
    /// Probabilidad de superar el examen (todas las partes).
    pub p_pass: f64,
    /// Probabilidad de obtener plaza y, por tanto, de elegir destino.
    pub p_plaza: f64,
    /// Mediana de la nota que habrías obtenido con la escala de esa convocatoria (si apruebas).
    pub equivalent_grade: Option<f64>,
    /// Número de orden estimado (condicionado a obtener plaza).
    pub rank: Option<RankEstimate>,
    /// Media de plazas libres al llegar tu turno (condicionado a obtener plaza).
    pub available_posts: f64,
    pub available_share: f64,
    pub provinces: Vec<ProvinceAvailability>,
    pub localities: Vec<LocalityAvailability>,
    pub categories: Vec<CategoryAvailability>,
    pub likely: Vec<LikelyDestination>,
    pub preferred: Vec<LocalityAvailability>,
    /// Resumen en una frase.
    pub summary: String,
}

/// `DestinationSimulation`: «con tu nota, ¿qué destinos te habrían quedado y cuál elegirías?».
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct DestinationSimulation {
    pub observed_grade: f64,
    pub target_convocatoria: String,
    pub target_label: String,
    /// Primero la proyección; después las convocatorias anteriores, de la más reciente a la más
    /// antigua.
    pub scenarios: Vec<DestinationScenario>,
    /// Número de orden a ambos lados del tuyo con el que se estima «lo más probable».
    pub neighbour_window: u32,
    pub assumptions: Vec<String>,
    pub data_quality: DataQuality,
}
