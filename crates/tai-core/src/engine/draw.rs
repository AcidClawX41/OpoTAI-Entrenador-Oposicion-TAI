// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Simulacro sorpresa (`draw_random_exam` y `start_exam` con `type: "random"`).
//!
//! - **Bolsa**: exámenes oficiales completos (1.ª parte + supuestos) y los simulacros
//!   numerados 1…30 (si hay preguntas para generarlos).
//! - **Sorteo** con aleatoriedad del sistema operativo (sin semilla), uniforme entre los
//!   exámenes que el perfil **no ha terminado**; si los ha hecho todos, entre los que terminó
//!   hace más tiempo (empate → al azar).
//! - **`ExamPaper.drawn`**: el motor recuerda el último sorteo de cada perfil (en memoria,
//!   12 horas). El siguiente `start_exam` del perfil lo consume: si pide el mismo examen
//!   (`official:<banco>` o `numbered:<n>`), el examen se marca como sorteado. Así la interfaz
//!   puede llamar a `start_exam(draw.spec)` sin campos extra en el contrato. `start_exam` con
//!   `type: "random"` sortea y arranca directamente (siempre `drawn = true`).

use std::collections::HashMap;

use chrono::{DateTime, Duration, Utc};

use super::Engine;
use crate::api::{ExamSpec, FeedbackMode, RandomDraw, RandomDrawKind};
use crate::builder::{self, BuildContext};
use crate::defaults::{DRAW_VALID_HOURS, NUMBERED_SIMULACROS};
use crate::error::{CoreError, CoreResult};
use crate::model::{Access, SectionKind};
use crate::storage::attempts;
use crate::util::{end_of_local_day, fmt_date_es};

/// Último sorteo pendiente de un perfil.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct PendingDraw {
    /// `official:<banco>` o `numbered:<n>`.
    pub key: String,
    pub at: DateTime<Utc>,
}

/// Examen de la bolsa del sorteo.
#[derive(Debug, Clone)]
struct PoolItem {
    key: String,
    spec: ExamSpec,
    kind: RandomDrawKind,
}

impl Engine {
    fn draw_pool(&self, feedback: FeedbackMode, timed: bool) -> Vec<PoolItem> {
        let mut pool: Vec<PoolItem> = self
            .catalog
            .banks()
            .iter()
            .filter(|b| self.catalog.is_complete_official(b))
            .map(|b| {
                let spec = ExamSpec::Official {
                    bank_id: b.id.clone(),
                    include_reserve: true,
                    timed,
                    feedback,
                    theory_block: None,
                };
                PoolItem {
                    key: spec.draw_key().unwrap_or_default(),
                    spec,
                    kind: RandomDrawKind::Official,
                }
            })
            .collect();
        let has_questions = self
            .catalog
            .all_questions()
            .any(|r| r.section.kind == SectionKind::Theory && r.question.is_gradable());
        if has_questions {
            for number in 1..=NUMBERED_SIMULACROS {
                let spec = ExamSpec::Numbered {
                    number,
                    feedback,
                    timed,
                };
                pool.push(PoolItem {
                    key: spec.draw_key().unwrap_or_default(),
                    spec,
                    kind: RandomDrawKind::Numbered,
                });
            }
        }
        pool
    }

    /// Fecha de la última entrega de cada examen de la bolsa por el perfil.
    fn finished_draw_keys(&self, profile_id: &str) -> CoreResult<HashMap<String, String>> {
        let mut done: HashMap<String, String> = HashMap::new();
        for meta in attempts::finished(self.db.conn(), profile_id)? {
            let Ok(spec) = serde_json::from_str::<ExamSpec>(&meta.spec_json) else {
                continue;
            };
            let (Some(key), Some(at)) = (spec.draw_key(), meta.finished_at) else {
                continue;
            };
            let entry = done.entry(key).or_default();
            if at > *entry {
                *entry = at;
            }
        }
        Ok(done)
    }

    fn official_title(&self, bank_id: &str) -> (String, String) {
        let Some(bank) = self.catalog.bank(bank_id) else {
            return ("Examen oficial".to_string(), String::new());
        };
        let access = match bank.access {
            Some(Access::PromocionInterna) => "promoción interna",
            _ => "ingreso libre",
        };
        let mut title = match bank.year {
            Some(year) => format!("Examen oficial · TAI {access} {year}"),
            None => format!("Examen oficial · {}", bank.title),
        };
        let twins = self
            .catalog
            .banks()
            .iter()
            .filter(|b| {
                self.catalog.is_complete_official(b)
                    && b.access == bank.access
                    && b.year == bank.year
            })
            .count();
        if twins > 1 {
            if let Some(date) = bank.exam_date.as_deref() {
                title.push_str(&format!(" ({})", fmt_date_es(date)));
            }
        }
        let date = bank
            .exam_date
            .as_deref()
            .map(|d| format!(" del {}", fmt_date_es(d)))
            .unwrap_or_default();
        let description = format!(
            "Réplica del examen oficial{date} («{}»). Se corrige como el tribunal: cada error resta y las reservas sustituyen a las preguntas anuladas.",
            bank.title
        );
        (title, description)
    }

    /// Sortea un examen de la bolsa para el perfil y lo recuerda como sorteo pendiente.
    pub(super) fn draw_spec(
        &mut self,
        profile_id: &str,
        feedback: FeedbackMode,
        timed: bool,
    ) -> CoreResult<RandomDraw> {
        let pool = self.draw_pool(feedback, timed);
        if pool.is_empty() {
            return Err(CoreError::conflict(
                "Todavía no hay exámenes cargados para el simulacro sorpresa.",
            ));
        }
        let done = self.finished_draw_keys(profile_id)?;
        let undone: Vec<&PoolItem> = pool.iter().filter(|i| !done.contains_key(&i.key)).collect();
        let (candidates, already_done) = if undone.is_empty() {
            let oldest = pool
                .iter()
                .filter_map(|i| done.get(&i.key))
                .min()
                .cloned()
                .unwrap_or_default();
            let list: Vec<&PoolItem> = pool
                .iter()
                .filter(|i| done.get(&i.key) == Some(&oldest))
                .collect();
            (list, true)
        } else {
            (undone, false)
        };
        let pending = candidates.len();
        // Aleatoriedad del sistema operativo: el usuario no puede predecir ni elegir el examen.
        let item = candidates
            .get(rand::random_range(0..candidates.len()))
            .copied()
            .ok_or_else(|| CoreError::internal("sorteo vacío"))?
            .clone();

        // Generación de prueba (determinista) para describir el examen.
        let history = HashMap::new();
        let now = self.now();
        let ctx = BuildContext {
            catalog: &self.catalog,
            history: &history,
            due_limit: end_of_local_day(now, self.options.utc_offset),
            practice_base: self.target_scheme(profile_id),
        };
        let built = builder::build(&ctx, &item.spec)?;
        let (question_count, case_count) = built.paper.shape();
        let duration = built.paper.duration_minutes;
        let (title, mut description) = match &item.spec {
            ExamSpec::Official { bank_id, .. } => self.official_title(bank_id),
            ExamSpec::Numbered { number, .. } => (
                format!("Simulacro OpoTAI n.º {number}"),
                "Composición fija con preguntas de exámenes oficiales, repartidas por bloques como en el examen real, y supuestos prácticos a elegir. Si lo repites, verás las mismas preguntas.".to_string(),
            ),
            _ => (built.paper.title.clone(), String::new()),
        };
        description.push(' ');
        description.push_str(&if already_done {
            "Ya has hecho todos los exámenes del sorteo: se repite el que hiciste hace más tiempo."
                .to_string()
        } else {
            format!("Elegido al azar entre los {pending} exámenes que aún no has hecho.")
        });
        let mut subtitle = format!("{question_count} preguntas");
        match case_count {
            0 => {}
            1 => subtitle.push_str(" + supuesto práctico"),
            n => subtitle.push_str(&format!(" + supuesto práctico a elegir entre {n}")),
        }
        if let Some(m) = duration {
            subtitle.push_str(&format!(" · {m} min"));
        }
        self.pending_draws.insert(
            profile_id.to_string(),
            PendingDraw {
                key: item.key.clone(),
                at: now,
            },
        );
        Ok(RandomDraw {
            spec: item.spec,
            kind: item.kind,
            title,
            subtitle: Some(subtitle),
            description,
            question_count,
            case_count,
            duration_minutes: duration,
            already_done,
            pool_size: pool.len() as u32,
        })
    }

    /// `draw_random_exam`: sortea el simulacro sorpresa del perfil (el usuario no elige).
    pub fn draw_random_exam(&mut self, profile_id: &str) -> CoreResult<RandomDraw> {
        self.profile_row(profile_id)?;
        let feedback = self.get_settings(profile_id)?.exam_feedback;
        // El sorteo se describe con el cronómetro oficial; la interfaz puede arrancarlo en modo
        // aprendizaje (`timed: false`, sin límite) sin perder la marca de «sorteado».
        self.draw_spec(profile_id, feedback, true)
    }

    /// Consume el sorteo pendiente del perfil: `true` si `spec` es el examen sorteado.
    pub(super) fn take_pending_draw(
        &mut self,
        profile_id: &str,
        spec: &ExamSpec,
        now: DateTime<Utc>,
    ) -> bool {
        let Some(pending) = self.pending_draws.remove(profile_id) else {
            return false;
        };
        spec.draw_key().as_deref() == Some(pending.key.as_str())
            && now - pending.at <= Duration::hours(DRAW_VALID_HOURS)
    }
}
