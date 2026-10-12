// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Estadísticas, resumen del repaso, calculadora de nota y utilidades de corte y predicción.

use std::collections::BTreeMap;

use super::Engine;
use crate::api::{
    CalculatorResult, DestinationSimulation, ExamMode, GradeResult, ManualGradeInput, Prediction,
    ProfileStats, ReviewBlockCount, ReviewSummary, Settings,
};
use crate::defaults::READINESS_ATTEMPTS;
use crate::error::{CoreError, CoreResult};
use crate::model::{BlockId, ScoringScheme};
use crate::prediction::{self, DestinationRequest, ObservedPart, PredictionRequest};
use crate::scoring::{self, CutoffInputs, PartCounts};
use crate::stats::{self, Breakdown, FinishedAttempt, Tally, normalized_grade};
use crate::storage::{attempts, question_stats};
use crate::util::{end_of_local_day, local_date};

/// Pesos de los simulacros recientes en la predicción de preparación (el más reciente primero).
const READINESS_WEIGHTS: [f64; 5] = [1.0, 0.85, 0.7, 0.55, 0.4];

fn block_rank(block: Option<BlockId>) -> u8 {
    match block {
        Some(BlockId::I) => 0,
        Some(BlockId::II) => 1,
        Some(BlockId::III) => 2,
        Some(BlockId::IV) => 3,
        None => 4,
    }
}

impl Engine {
    /// Entradas de corte para corregir un examen con `scheme`.
    ///
    /// Práctica, repaso y supuestos usan el corte fijo de su esquema derivado. Los exámenes
    /// completos usan el corte personalizado del usuario, el oficial (esquema o convocatoria)
    /// o la estimación de la convocatoria objetivo si el esquema es el suyo.
    pub(super) fn cutoff_inputs(
        &mut self,
        scheme: &ScoringScheme,
        mode: ExamMode,
        override_ratio: Option<f64>,
        settings: &Settings,
    ) -> CutoffInputs {
        if !mode.is_full_exam() {
            return CutoffInputs::default();
        }
        let conv = scheme
            .convocatoria
            .as_deref()
            .and_then(|c| self.catalog.convocatoria(c))
            .or_else(|| {
                self.catalog
                    .convocatorias()
                    .convocatorias
                    .iter()
                    .find(|c| c.scoring_scheme.as_deref() == Some(scheme.id.as_str()))
            })
            .cloned();
        let official_ratios = prediction::official_ratios(scheme, conv.as_ref());
        let ctx = self.prediction_context(settings.target_convocatoria.as_deref());
        let estimated_ratios = if ctx.scheme.id == scheme.id {
            let target_estimates = ctx.estimated_cutoff_ratios();
            scheme
                .grading
                .units
                .iter()
                .map(|unit| {
                    ctx.scheme
                        .grading
                        .units
                        .iter()
                        .position(|t| unit.parts.iter().all(|p| t.parts.contains(p)))
                        .and_then(|i| target_estimates.get(i).copied().flatten())
                })
                .collect()
        } else {
            Vec::new()
        };
        CutoffInputs {
            override_ratio,
            official_ratios,
            estimated_ratios,
            estimate_label: Some(ctx.estimate_label()),
        }
    }

    /// Predicción a partir de una calificación (intento o calculadora).
    pub(super) fn predict_with(
        &mut self,
        observed: &[ObservedPart],
        observed_grade: f64,
        override_ratio: Option<f64>,
        settings: &Settings,
    ) -> Prediction {
        let ctx = self.prediction_context(settings.target_convocatoria.as_deref());
        prediction::predict(
            &ctx,
            &PredictionRequest {
                observed,
                observed_grade,
                override_ratio,
                preferred_localities: &settings.preferred_localities,
            },
        )
    }

    /// Predicción a partir del resultado de un examen.
    pub(super) fn predict_from_grade(
        &mut self,
        grade: &GradeResult,
        settings: &Settings,
    ) -> Prediction {
        let observed: Vec<ObservedPart> = grade
            .parts
            .iter()
            .map(|p| ObservedPart {
                part: p.part,
                correct: f64::from(p.correct),
                wrong: f64::from(p.wrong),
                blank: f64::from(p.blank),
            })
            .collect();
        self.predict_with(
            &observed,
            normalized_grade(grade.total_grade, grade.max_grade),
            settings.cutoff_override_ratio,
            settings,
        )
    }

    /// Predicción con la media ponderada de los últimos exámenes completos.
    fn readiness(
        &mut self,
        finished: &[FinishedAttempt],
        settings: &Settings,
    ) -> CoreResult<Option<Prediction>> {
        let recent: Vec<&FinishedAttempt> = finished
            .iter()
            .rev()
            .filter(|a| a.mode.is_full_exam())
            .take(READINESS_ATTEMPTS)
            .collect();
        let mut parts: BTreeMap<u32, (f64, f64, f64)> = BTreeMap::new();
        let mut grade_acc = 0.0;
        let mut weight_sum = 0.0;
        for (i, attempt) in recent.iter().enumerate() {
            let Some(json) = attempts::result_json(self.db.conn(), &attempt.attempt_id)? else {
                continue;
            };
            let Ok(result) = serde_json::from_str::<crate::api::AttemptResult>(&json) else {
                continue;
            };
            let w = READINESS_WEIGHTS.get(i).copied().unwrap_or(0.4);
            for p in &result.grade.parts {
                let e = parts.entry(p.part).or_insert((0.0, 0.0, 0.0));
                e.0 += w * f64::from(p.correct);
                e.1 += w * f64::from(p.wrong);
                e.2 += w * f64::from(p.blank);
            }
            grade_acc += w * normalized_grade(result.grade.total_grade, result.grade.max_grade);
            weight_sum += w;
        }
        if weight_sum <= 0.0 {
            return Ok(None);
        }
        let used = recent.len() as f64;
        // Pesos normalizados para que la evidencia total equivalga al número de intentos.
        let factor = used / weight_sum;
        let observed: Vec<ObservedPart> = parts
            .into_iter()
            .map(|(part, (c, w, b))| ObservedPart {
                part,
                correct: c * factor,
                wrong: w * factor,
                blank: b * factor,
            })
            .collect();
        Ok(Some(self.predict_with(
            &observed,
            grade_acc / weight_sum,
            settings.cutoff_override_ratio,
            settings,
        )))
    }

    /// `get_stats`.
    pub fn get_stats(&mut self, profile_id: &str) -> CoreResult<ProfileStats> {
        self.profile_row(profile_id)?;
        let settings = self.get_settings(profile_id)?;
        let now = self.now();
        let offset = self.options.utc_offset;
        let today = local_date(now, offset);
        let due_limit = end_of_local_day(now, offset);

        let finished: Vec<FinishedAttempt> = attempts::finished(self.db.conn(), profile_id)?
            .iter()
            .filter_map(|m| {
                Some(FinishedAttempt {
                    attempt_id: m.id.clone(),
                    mode: ExamMode::parse(&m.mode)?,
                    title: m.title.clone(),
                    finished_at: Self::finished_at_of(m)?,
                    elapsed_seconds: m.elapsed_seconds,
                    total_grade: m.total_grade,
                    max_grade: m.max_grade,
                    passed: m.passed,
                    correct: m.correct,
                    wrong: m.wrong,
                    blank: m.blank,
                })
            })
            .collect();

        let history = question_stats::load(self.db.conn(), profile_id)?;
        let mut totals = Tally::default();
        let mut distinct = 0u32;
        let mut review_due = 0u32;
        // Rendimiento neto con la resta de la convocatoria objetivo (o del esquema por defecto).
        let divisor = stats::penalty_divisor_of(
            self.target_scheme(profile_id)
                .unwrap_or_else(|| self.catalog.default_scheme()),
        );
        let mut breakdown = Breakdown::with_penalty_divisor(divisor);
        for s in &history {
            let tally = Tally {
                correct: s.correct,
                wrong: s.wrong,
                blank: s.blank,
            };
            totals.correct += s.correct;
            totals.wrong += s.wrong;
            totals.blank += s.blank;
            if s.seen > 0 {
                distinct += 1;
            }
            let r = self.catalog.question(&s.question_id);
            if s.srs_box > 0 && r.is_some() && s.srs_due_at.is_none_or(|d| d < due_limit) {
                review_due += 1;
            }
            let (block, topic) = match &r {
                Some(r) => (r.block(), r.question.topic.as_deref()),
                None => (None, None),
            };
            breakdown.add(block, topic, tally);
        }
        let temario = self.catalog.temario();
        let by_block = breakdown.by_block(temario);
        let by_topic = breakdown.by_topic(temario);
        let weakest_topics = stats::weakest_topics(&by_topic);

        let grade_history = stats::grade_history(&finished);
        // Media, mejor y última: solo exámenes completos (escala 0–100).
        let normalized: Vec<f64> = grade_history
            .iter()
            .filter(|g| g.mode.is_full_exam())
            .map(|g| normalized_grade(g.grade, g.max_grade))
            .collect();
        let average_grade = (!normalized.is_empty())
            .then(|| normalized.iter().sum::<f64>() / normalized.len() as f64);
        let best_grade = normalized.iter().copied().reduce(f64::max);
        let last_grade = normalized.last().copied();
        // Respondidas = aciertos + errores (los blancos se informan aparte).
        let answered = totals.correct + totals.wrong;
        let readiness = self.readiness(&finished, &settings)?;

        Ok(ProfileStats {
            profile_id: profile_id.to_string(),
            attempts_finished: finished.len() as u32,
            simulacros_finished: finished.iter().filter(|a| a.mode.is_full_exam()).count() as u32,
            questions_answered: answered,
            distinct_questions_seen: distinct,
            correct: totals.correct,
            wrong: totals.wrong,
            blank: totals.blank,
            accuracy: crate::util::ratio(f64::from(totals.correct), f64::from(answered)),
            average_grade,
            best_grade,
            last_grade,
            streak_days: stats::streak_days(&finished, today, offset),
            study_seconds: finished.iter().map(|a| a.elapsed_seconds).sum(),
            grade_history,
            activity: stats::activity(&finished, today, offset),
            by_block,
            by_topic,
            weakest_topics,
            review_due,
            readiness,
        })
    }

    /// `get_review_summary`.
    pub fn get_review_summary(&self, profile_id: &str) -> CoreResult<ReviewSummary> {
        self.profile_row(profile_id)?;
        let due_limit = end_of_local_day(self.now(), self.options.utc_offset);
        let history = question_stats::load(self.db.conn(), profile_id)?;
        let mut summary = ReviewSummary {
            due: 0,
            learning: 0,
            mastered: 0,
            total_failed: 0,
            by_block: Vec::new(),
        };
        let mut blocks: BTreeMap<u8, ReviewBlockCount> = BTreeMap::new();
        for s in &history {
            if s.wrong > 0 {
                summary.total_failed += 1;
            }
            if s.srs_box == 0 {
                continue;
            }
            let Some(r) = self.catalog.question(&s.question_id) else {
                continue;
            };
            let state = crate::srs::SrsState {
                box_number: s.srs_box,
                due_at: s.srs_due_at,
            };
            let is_due = state.is_due(due_limit);
            let block = r.block();
            let entry = blocks.entry(block_rank(block)).or_insert(ReviewBlockCount {
                block,
                due: 0,
                learning: 0,
            });
            if is_due {
                summary.due += 1;
                entry.due += 1;
            }
            if state.is_learning() {
                summary.learning += 1;
                entry.learning += 1;
            } else if state.is_mastered() {
                summary.mastered += 1;
            }
        }
        summary.by_block = blocks
            .into_values()
            .filter(|b| b.due > 0 || b.learning > 0)
            .collect();
        Ok(summary)
    }

    /// `calculate_grade`: calculadora de nota y predicción (usa los ajustes del perfil si se da).
    pub fn calculate_grade(
        &mut self,
        profile_id: Option<&str>,
        input: &ManualGradeInput,
    ) -> CoreResult<CalculatorResult> {
        let scheme = self
            .catalog
            .scheme(&input.scheme_id)
            .cloned()
            .ok_or_else(|| {
                CoreError::not_found(format!(
                    "No existe el esquema de puntuación «{}».",
                    input.scheme_id
                ))
            })?;
        let settings = match profile_id {
            Some(id) => self.get_settings(id)?,
            None => Settings::default(),
        };
        let override_ratio = input
            .cutoff_override_ratio
            .or(settings.cutoff_override_ratio);
        if let Some(r) = override_ratio {
            if !r.is_finite() || !(0.0..=1.0).contains(&r) {
                return Err(CoreError::invalid(
                    "El corte personalizado debe estar entre 0 y 1.",
                ));
            }
        }

        let mut notes = Vec::new();
        let mut counts = Vec::new();
        let mut observed = Vec::new();
        for p in &input.parts {
            let part = scheme.part(p.part).ok_or_else(|| {
                CoreError::invalid(format!("El esquema no tiene {}.ª parte.", p.part))
            })?;
            if counts.iter().any(|c: &PartCounts| c.part == p.part) {
                return Err(CoreError::invalid(format!(
                    "La {}.ª parte aparece repetida.",
                    p.part
                )));
            }
            let expected = part.counted_questions();
            let given = p.correct + p.wrong + p.blank;
            if given > expected {
                return Err(CoreError::invalid(format!(
                    "La {}.ª parte tiene {expected} preguntas y has indicado {given}.",
                    p.part
                )));
            }
            let blank = p.blank + (expected - given);
            if given < expected {
                notes.push(format!(
                    "{}.ª parte: {} preguntas sin indicar se cuentan en blanco.",
                    p.part,
                    expected - given
                ));
            }
            counts.push(PartCounts {
                part: p.part,
                correct: p.correct,
                wrong: p.wrong,
                blank,
                annulled: 0,
            });
            observed.push(ObservedPart {
                part: p.part,
                correct: f64::from(p.correct),
                wrong: f64::from(p.wrong),
                blank: f64::from(blank),
            });
        }
        for part in &scheme.parts {
            if !counts.iter().any(|c| c.part == part.part) {
                notes.push(format!(
                    "Sin datos de la {}.ª parte: se cuenta en blanco.",
                    part.part
                ));
                counts.push(PartCounts {
                    part: part.part,
                    blank: part.counted_questions(),
                    ..PartCounts::default()
                });
            }
        }
        let inputs = self.cutoff_inputs(&scheme, ExamMode::Simulacro, override_ratio, &settings);
        let grade = scoring::grade(&scheme, &counts, &inputs, notes);
        let prediction = self.predict_with(
            &observed,
            normalized_grade(grade.total_grade, grade.max_grade),
            override_ratio,
            &settings,
        );
        Ok(CalculatorResult { grade, prediction })
    }

    /// `simulate_destinations`: simulador de destinos a partir de un intento entregado o, si no
    /// se indica, de una entrada manual de la calculadora.
    pub fn simulate_destinations(
        &mut self,
        profile_id: Option<&str>,
        attempt_id: Option<&str>,
        input: Option<&ManualGradeInput>,
    ) -> CoreResult<DestinationSimulation> {
        let (observed, observed_grade, owner, input_override) = match (attempt_id, input) {
            (Some(id), _) => {
                let result = self.get_attempt_result(id)?;
                let observed: Vec<ObservedPart> = result
                    .grade
                    .parts
                    .iter()
                    .map(|p| ObservedPart {
                        part: p.part,
                        correct: f64::from(p.correct),
                        wrong: f64::from(p.wrong),
                        blank: f64::from(p.blank),
                    })
                    .collect();
                let grade = normalized_grade(result.grade.total_grade, result.grade.max_grade);
                (observed, grade, Some(result.profile_id), None)
            }
            (None, Some(input)) => {
                let scheme = self
                    .catalog
                    .scheme(&input.scheme_id)
                    .cloned()
                    .ok_or_else(|| {
                        CoreError::not_found(format!(
                            "No existe el esquema de puntuación «{}».",
                            input.scheme_id
                        ))
                    })?;
                let grade = self.calculate_grade(profile_id, input)?.grade;
                let observed: Vec<ObservedPart> = input
                    .parts
                    .iter()
                    .filter_map(|p| {
                        let expected = scheme.part(p.part)?.counted_questions();
                        let given = p.correct + p.wrong + p.blank;
                        Some(ObservedPart {
                            part: p.part,
                            correct: f64::from(p.correct),
                            wrong: f64::from(p.wrong),
                            blank: f64::from(p.blank + expected.saturating_sub(given)),
                        })
                    })
                    .collect();
                let g = normalized_grade(grade.total_grade, grade.max_grade);
                (observed, g, None, input.cutoff_override_ratio)
            }
            (None, None) => {
                return Err(CoreError::invalid(
                    "Indica un examen entregado o una nota para simular los destinos.",
                ));
            }
        };
        let settings = match owner.as_deref().or(profile_id) {
            Some(id) => self.get_settings(id)?,
            None => Settings::default(),
        };
        let override_ratio = input_override.or(settings.cutoff_override_ratio);
        let ctx = self.prediction_context(settings.target_convocatoria.as_deref());
        let dctx = self.destination_context(ctx.scheme.access);
        Ok(prediction::simulate_destinations(
            &ctx,
            &dctx,
            &DestinationRequest {
                observed: &observed,
                observed_grade,
                override_ratio,
                preferred_localities: &settings.preferred_localities,
            },
        ))
    }
}
