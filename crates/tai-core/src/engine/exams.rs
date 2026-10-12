// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Ciclo de vida de un intento: generar, reanudar, guardar progreso, comprobar respuestas,
//! entregar, abandonar, listar, revisar y borrar.

use std::collections::HashMap;

use super::Engine;
use crate::api::{
    ActiveAttempt, AnswerFeedback, AnswerState, AttemptResult, AttemptStatus, AttemptSummary,
    ExamMode, ExamPaper, ExamSpec, FeedbackMode, GradeResult, ProgressPayload,
};
use crate::attempt::{self, Evaluation};
use crate::builder::{self, BuildContext};
use crate::defaults::DEFAULT_ATTEMPT_LIMIT;
use crate::error::{CoreError, CoreResult};
use crate::history::{Outcome, QuestionStat};
use crate::model::Letter;
use crate::paper::StoredPaper;
use crate::scoring;
use crate::stats::{self, Breakdown, Tally};
use crate::storage::attempts::{self, AnswerRow, AttemptRow, FinishData};
use crate::storage::question_stats;
use crate::util::{end_of_local_day, iso, parse_iso};
use crate::{api::ItemStatus, srs};

/// Límite máximo de `list_attempts`.
const MAX_LIST: u32 = 1000;

fn parse_paper(row: &AttemptRow) -> CoreResult<StoredPaper> {
    serde_json::from_str(&row.paper_json)
        .map_err(|e| CoreError::data(format!("el examen guardado no se puede leer: {e}")))
}

fn answers_map(rows: &[AnswerRow]) -> HashMap<String, AnswerState> {
    rows.iter()
        .map(|a| {
            (
                a.question_id.clone(),
                AnswerState {
                    question_id: a.question_id.clone(),
                    choice: a.choice,
                    flagged: a.flagged,
                },
            )
        })
        .collect()
}

/// Combina las respuestas guardadas con las recibidas: una respuesta comprobada
/// (`check_answer`) no se puede cambiar, pero sí su marca de dudosa.
fn merge_answers(
    paper: &StoredPaper,
    stored: &[AnswerRow],
    incoming: &[AnswerState],
) -> Vec<AnswerRow> {
    let mut merged: Vec<AnswerRow> = stored.to_vec();
    for a in incoming {
        if !paper.contains_question(&a.question_id) {
            log::debug!("respuesta ignorada: {} no está en el examen", a.question_id);
            continue;
        }
        match merged.iter_mut().find(|m| m.question_id == a.question_id) {
            Some(m) if m.checked => m.flagged = a.flagged,
            Some(m) => {
                m.choice = a.choice;
                m.flagged = a.flagged;
            }
            None => merged.push(AnswerRow {
                question_id: a.question_id.clone(),
                choice: a.choice,
                flagged: a.flagged,
                checked: false,
            }),
        }
    }
    merged
}

/// Aciertos, errores y blancos del historial: los mismos que la nota (incluye la 2.ª parte en
/// blanco si no se eligió supuesto).
fn grade_totals(grade: &GradeResult) -> Tally {
    grade.parts.iter().fold(Tally::default(), |mut t, p| {
        t.correct += p.correct;
        t.wrong += p.wrong;
        t.blank += p.blank;
        t
    })
}

fn attempt_status(status: &str) -> Option<AttemptStatus> {
    match status {
        attempts::IN_PROGRESS => Some(AttemptStatus::InProgress),
        attempts::FINISHED => Some(AttemptStatus::Finished),
        _ => None,
    }
}

impl Engine {
    fn attempt_row(&self, attempt_id: &str) -> CoreResult<AttemptRow> {
        attempts::get(self.db.conn(), attempt_id)?
            .ok_or_else(|| CoreError::not_found("No existe el intento."))
    }

    fn in_progress_row(&self, attempt_id: &str) -> CoreResult<AttemptRow> {
        let row = self.attempt_row(attempt_id)?;
        match row.status.as_str() {
            attempts::IN_PROGRESS => Ok(row),
            attempts::FINISHED => Err(CoreError::conflict("El intento ya se ha entregado.")),
            _ => Err(CoreError::conflict(
                "El intento se abandonó y ya no admite cambios.",
            )),
        }
    }

    /// `start_exam`: genera el examen y crea un intento en curso (abandonando el anterior).
    pub fn start_exam(&mut self, profile_id: &str, spec: ExamSpec) -> CoreResult<ExamPaper> {
        self.profile_row(profile_id)?;
        let now = self.now();
        let (spec, drawn) = match spec {
            ExamSpec::Random { feedback, timed } => {
                let draw = self.draw_spec(profile_id, feedback, timed)?;
                self.pending_draws.remove(profile_id);
                (draw.spec, true)
            }
            other => {
                let drawn = self.take_pending_draw(profile_id, &other, now);
                (other, drawn)
            }
        };
        let history = question_stats::load_map(self.db.conn(), profile_id)?;
        let ctx = BuildContext {
            catalog: &self.catalog,
            history: &history,
            due_limit: end_of_local_day(now, self.options.utc_offset),
            practice_base: self.target_scheme(profile_id),
        };
        let built = builder::build(&ctx, &spec)?;
        let mut paper = built.paper;
        paper.drawn = drawn;

        let attempt_id = uuid::Uuid::new_v4().to_string();
        let started_at = iso(now);
        let row = AttemptRow {
            id: attempt_id.clone(),
            profile_id: profile_id.to_string(),
            mode: paper.mode.as_str().to_string(),
            title: paper.title.clone(),
            spec_json: serde_json::to_string(&built.spec)
                .map_err(|e| CoreError::internal(e.to_string()))?,
            paper_json: serde_json::to_string(&paper)
                .map_err(|e| CoreError::internal(e.to_string()))?,
            status: attempts::IN_PROGRESS.to_string(),
            started_at: started_at.clone(),
            finished_at: None,
            elapsed_seconds: 0,
            chosen_case: None,
            total_grade: None,
            max_grade: None,
            passed: None,
            correct: 0,
            wrong: 0,
            blank: 0,
            p_plaza: None,
            result_json: None,
        };
        let tx = self.db.conn_mut().transaction()?;
        let abandoned = attempts::abandon_in_progress(&tx, profile_id)?;
        attempts::insert(&tx, &row)?;
        tx.commit()?;
        if abandoned > 0 {
            log::info!("se abandona el intento en curso anterior del perfil {profile_id}");
        }
        Ok(paper.to_exam_paper(&self.catalog, &attempt_id, profile_id, &started_at))
    }

    /// `get_active_attempt`: intento en curso para reanudar tras cerrar la app.
    pub fn get_active_attempt(&mut self, profile_id: &str) -> CoreResult<Option<ActiveAttempt>> {
        self.profile_row(profile_id)?;
        let rows = attempts::in_progress(self.db.conn(), profile_id)?;
        let Some((row, older)) = rows.split_first() else {
            return Ok(None);
        };
        for old in older {
            attempts::set_status(self.db.conn(), &old.id, attempts::ABANDONED)?;
        }
        let paper = match parse_paper(row) {
            Ok(p) => p,
            Err(err) => {
                log::warn!("intento {} irrecuperable: {err}", row.id);
                attempts::set_status(self.db.conn(), &row.id, attempts::ABANDONED)?;
                return Ok(None);
            }
        };
        let exam = paper.to_exam_paper(&self.catalog, &row.id, profile_id, &row.started_at);
        if exam.sections.iter().all(|s| s.questions.is_empty()) {
            log::warn!("intento {} sin preguntas en el catálogo actual", row.id);
            attempts::set_status(self.db.conn(), &row.id, attempts::ABANDONED)?;
            return Ok(None);
        }
        let answers = attempts::answers(self.db.conn(), &row.id)?;
        Ok(Some(ActiveAttempt {
            paper: exam,
            progress: ProgressPayload {
                attempt_id: row.id.clone(),
                answers: answers
                    .into_iter()
                    .map(|a| AnswerState {
                        question_id: a.question_id,
                        choice: a.choice,
                        flagged: a.flagged,
                    })
                    .collect(),
                chosen_case: row.chosen_case.clone(),
                elapsed_seconds: row.elapsed_seconds,
            },
        }))
    }

    fn validated_case(paper: &StoredPaper, chosen: Option<&str>) -> CoreResult<Option<String>> {
        match chosen.map(str::trim).filter(|c| !c.is_empty()) {
            None => Ok(None),
            Some(c) if paper.case_section_ids().contains(&c) => Ok(Some(c.to_string())),
            Some(_) => Err(CoreError::invalid(
                "El supuesto elegido no forma parte de este examen.",
            )),
        }
    }

    /// `save_progress`: guarda respuestas, marcas, supuesto elegido y tiempo.
    pub fn save_progress(&mut self, progress: &ProgressPayload) -> CoreResult<()> {
        let row = self.in_progress_row(&progress.attempt_id)?;
        let paper = parse_paper(&row)?;
        let chosen = Self::validated_case(&paper, progress.chosen_case.as_deref())?;
        let stored = attempts::answers(self.db.conn(), &row.id)?;
        let merged = merge_answers(&paper, &stored, &progress.answers);
        let tx = self.db.conn_mut().transaction()?;
        for a in &merged {
            attempts::upsert_answer(&tx, &row.id, a)?;
        }
        attempts::update_progress(&tx, &row.id, chosen.as_deref(), progress.elapsed_seconds)?;
        tx.commit()?;
        Ok(())
    }

    /// `check_answer`: corrección inmediata; la respuesta queda bloqueada.
    pub fn check_answer(
        &mut self,
        attempt_id: &str,
        question_id: &str,
        choice: Option<Letter>,
    ) -> CoreResult<AnswerFeedback> {
        let row = self.in_progress_row(attempt_id)?;
        let paper = parse_paper(&row)?;
        if paper.feedback != FeedbackMode::Immediate {
            return Err(CoreError::invalid(
                "Este examen se corrige al final: no hay corrección pregunta a pregunta.",
            ));
        }
        if !paper.contains_question(question_id) {
            return Err(CoreError::not_found(
                "La pregunta no forma parte de este examen.",
            ));
        }
        let r = self
            .catalog
            .question(question_id)
            .ok_or_else(|| CoreError::data("La pregunta ya no existe en el banco de preguntas."))?;
        let stored = attempts::answers(self.db.conn(), attempt_id)?;
        let existing = stored.iter().find(|a| a.question_id == question_id);
        if let Some(prev) = existing.filter(|a| a.checked) {
            if prev.choice == choice {
                return Ok(attempt::feedback(&self.catalog, &r, prev.choice));
            }
            return Err(CoreError::conflict(
                "Ya comprobaste esta pregunta: la respuesta no se puede cambiar.",
            ));
        }
        attempts::upsert_answer(
            self.db.conn(),
            attempt_id,
            &AnswerRow {
                question_id: question_id.to_string(),
                choice,
                flagged: existing.is_some_and(|a| a.flagged),
                checked: true,
            },
        )?;
        Ok(attempt::feedback(&self.catalog, &r, choice))
    }

    /// Evalúa, califica y predice un intento (sin guardar).
    fn compute_result(
        &mut self,
        row: &AttemptRow,
        paper: &StoredPaper,
        answers: &[AnswerRow],
        chosen_case: Option<&str>,
        finished_at: &str,
        elapsed_seconds: u64,
    ) -> CoreResult<(AttemptResult, Evaluation)> {
        let settings = self.get_settings(&row.profile_id)?;
        let evaluation =
            attempt::evaluate(paper, &self.catalog, &answers_map(answers), chosen_case);
        let inputs = self.cutoff_inputs(
            &paper.scheme,
            paper.mode,
            settings.cutoff_override_ratio,
            &settings,
        );
        let grade = scoring::grade(
            &paper.scheme,
            &evaluation.counts,
            &inputs,
            evaluation.notes.clone(),
        );
        let prediction = if paper.mode.is_full_exam() {
            Some(self.predict_from_grade(&grade, &settings))
        } else {
            None
        };
        // Rendimiento neto con la resta del propio examen (1/4 en promoción interna).
        let mut breakdown =
            Breakdown::with_penalty_divisor(stats::penalty_divisor_of(&paper.scheme));
        for item in evaluation.items.iter().filter(|i| i.status.is_counted()) {
            let tally = match item.status {
                ItemStatus::Correct => Tally {
                    correct: 1,
                    ..Tally::default()
                },
                ItemStatus::Wrong => Tally {
                    wrong: 1,
                    ..Tally::default()
                },
                _ => Tally {
                    blank: 1,
                    ..Tally::default()
                },
            };
            breakdown.add(item.block, item.topic.as_deref(), tally);
        }
        let temario = self.catalog.temario();
        let result = AttemptResult {
            attempt_id: row.id.clone(),
            profile_id: row.profile_id.clone(),
            mode: paper.mode,
            title: paper.title.clone(),
            started_at: row.started_at.clone(),
            finished_at: finished_at.to_string(),
            elapsed_seconds,
            duration_minutes: paper.duration_minutes,
            chosen_case: evaluation.chosen_case.clone(),
            by_block: breakdown.by_block(temario),
            by_topic: breakdown.by_topic(temario),
            review: attempt::review_items(&self.catalog, &evaluation),
            grade,
            prediction,
            spec: serde_json::from_str(&row.spec_json).ok(),
            cases: paper.case_statements(&self.catalog, evaluation.chosen_case.as_deref()),
        };
        Ok((result, evaluation))
    }

    fn stored_result_json(result: &AttemptResult) -> CoreResult<String> {
        let mut compact = result.clone();
        compact.review.clear();
        // Los enunciados (con imágenes) se regeneran al leer el resultado.
        compact.cases.clear();
        serde_json::to_string(&compact).map_err(|e| CoreError::internal(e.to_string()))
    }

    /// `submit_exam`: corrige, guarda el resultado y las estadísticas, y actualiza el repaso.
    pub fn submit_exam(&mut self, progress: &ProgressPayload) -> CoreResult<AttemptResult> {
        let row = self.in_progress_row(&progress.attempt_id)?;
        let paper = parse_paper(&row)?;
        let chosen = Self::validated_case(&paper, progress.chosen_case.as_deref())
            .unwrap_or_else(|_| row.chosen_case.clone());
        let chosen = chosen.or_else(|| row.chosen_case.clone());
        let stored = attempts::answers(self.db.conn(), &row.id)?;
        let merged = merge_answers(&paper, &stored, &progress.answers);
        let now = self.now();
        let finished_at = iso(now);
        let elapsed = row.elapsed_seconds.max(progress.elapsed_seconds);
        let (result, evaluation) = self.compute_result(
            &row,
            &paper,
            &merged,
            chosen.as_deref(),
            &finished_at,
            elapsed,
        )?;

        let totals = grade_totals(&result.grade);
        let result_json = Self::stored_result_json(&result)?;
        let mut history = question_stats::load_map(self.db.conn(), &row.profile_id)?;

        let tx = self.db.conn_mut().transaction()?;
        for a in &merged {
            attempts::upsert_answer(&tx, &row.id, a)?;
        }
        attempts::finish(
            &tx,
            &row.id,
            &FinishData {
                finished_at: &finished_at,
                elapsed_seconds: elapsed,
                chosen_case: result.chosen_case.as_deref().or(chosen.as_deref()),
                total_grade: result.grade.total_grade,
                max_grade: result.grade.max_grade,
                passed: result.grade.passed,
                correct: totals.correct,
                wrong: totals.wrong,
                blank: totals.blank,
                p_plaza: result.prediction.as_ref().map(|p| p.p_plaza),
                result_json: &result_json,
            },
        )?;
        for item in &evaluation.items {
            let outcome = match item.status {
                ItemStatus::Correct => Outcome::Correct,
                ItemStatus::Wrong => Outcome::Wrong,
                ItemStatus::Blank => Outcome::Blank,
                ItemStatus::Annulled | ItemStatus::NotCounted => continue,
            };
            let stat = history
                .entry(item.question_id.clone())
                .or_insert_with(|| QuestionStat::new(item.question_id.clone()));
            srs::apply(stat, outcome, item.flagged, now);
            question_stats::upsert(&tx, &row.profile_id, stat)?;
        }
        tx.commit()?;
        Ok(result)
    }

    /// `abandon_exam`.
    pub fn abandon_exam(&mut self, attempt_id: &str) -> CoreResult<()> {
        let row = self.attempt_row(attempt_id)?;
        match row.status.as_str() {
            attempts::FINISHED => Err(CoreError::conflict(
                "El intento ya se ha entregado: no se puede abandonar.",
            )),
            attempts::ABANDONED => Ok(()),
            _ => {
                attempts::set_status(self.db.conn(), attempt_id, attempts::ABANDONED)?;
                Ok(())
            }
        }
    }

    /// `list_attempts`: en curso y entregados, el más reciente primero.
    pub fn list_attempts(
        &self,
        profile_id: &str,
        limit: Option<u32>,
    ) -> CoreResult<Vec<AttemptSummary>> {
        self.profile_row(profile_id)?;
        let limit = limit.unwrap_or(DEFAULT_ATTEMPT_LIMIT).clamp(1, MAX_LIST);
        Ok(attempts::list(self.db.conn(), profile_id, limit)?
            .into_iter()
            .filter_map(|m| {
                Some(AttemptSummary {
                    status: attempt_status(&m.status)?,
                    mode: ExamMode::parse(&m.mode)?,
                    attempt_id: m.id,
                    title: m.title,
                    started_at: m.started_at,
                    finished_at: m.finished_at,
                    elapsed_seconds: m.elapsed_seconds,
                    total_grade: m.total_grade,
                    max_grade: m.max_grade,
                    passed: m.passed,
                    correct: m.correct,
                    wrong: m.wrong,
                    blank: m.blank,
                    p_plaza: m.p_plaza,
                })
            })
            .collect())
    }

    /// `get_attempt_result`: recalcula la revisión (y la nota) con el banco actual.
    pub fn get_attempt_result(&mut self, attempt_id: &str) -> CoreResult<AttemptResult> {
        let row = self.attempt_row(attempt_id)?;
        if row.status != attempts::FINISHED {
            return Err(CoreError::conflict(
                "El intento todavía no se ha entregado.",
            ));
        }
        let finished_at = row
            .finished_at
            .clone()
            .unwrap_or_else(|| row.started_at.clone());
        let recomputed = parse_paper(&row).and_then(|paper| {
            let answers = attempts::answers(self.db.conn(), &row.id)?;
            self.compute_result(
                &row,
                &paper,
                &answers,
                row.chosen_case.as_deref(),
                &finished_at,
                row.elapsed_seconds,
            )
        });
        match recomputed {
            Ok((result, _)) => {
                let totals = grade_totals(&result.grade);
                let changed = row
                    .total_grade
                    .is_none_or(|g| (g - result.grade.total_grade).abs() > 1e-9)
                    || (row.correct, row.wrong, row.blank)
                        != (totals.correct, totals.wrong, totals.blank)
                    || row.passed != Some(result.grade.passed)
                    || row.p_plaza.map(|p| (p * 1e9).round())
                        != result
                            .prediction
                            .as_ref()
                            .map(|p| (p.p_plaza * 1e9).round());
                if changed {
                    let json = Self::stored_result_json(&result)?;
                    attempts::finish(
                        self.db.conn(),
                        &row.id,
                        &FinishData {
                            finished_at: &finished_at,
                            elapsed_seconds: row.elapsed_seconds,
                            chosen_case: result.chosen_case.as_deref(),
                            total_grade: result.grade.total_grade,
                            max_grade: result.grade.max_grade,
                            passed: result.grade.passed,
                            correct: totals.correct,
                            wrong: totals.wrong,
                            blank: totals.blank,
                            p_plaza: result.prediction.as_ref().map(|p| p.p_plaza),
                            result_json: &json,
                        },
                    )?;
                }
                Ok(result)
            }
            Err(err) => {
                log::warn!("no se puede recalcular el intento {attempt_id}: {err}");
                let json = row
                    .result_json
                    .ok_or_else(|| CoreError::data("El resultado guardado no está disponible."))?;
                Ok(serde_json::from_str(&json)?)
            }
        }
    }

    /// `delete_attempt`: borra el intento y sus respuestas (las estadísticas por pregunta y el
    /// repaso no se revierten).
    pub fn delete_attempt(&mut self, attempt_id: &str) -> CoreResult<()> {
        if attempts::delete(self.db.conn(), attempt_id)? == 0 {
            return Err(CoreError::not_found("No existe el intento."));
        }
        Ok(())
    }

    /// Fecha de entrega de un intento (para estadísticas).
    pub(super) fn finished_at_of(
        meta: &attempts::AttemptMeta,
    ) -> Option<chrono::DateTime<chrono::Utc>> {
        meta.finished_at.as_deref().and_then(parse_iso)
    }
}
