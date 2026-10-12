// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Estadísticas: desglose por bloque y tema, historial de notas, actividad y racha.
//!
//! Definiciones (las usa `get_stats`):
//!
//! - `questions_answered` = preguntas respondidas (aciertos + errores) en exámenes entregados;
//!   `accuracy = correct / (correct + wrong)`. Los blancos se informan aparte.
//! - `BlockStat.accuracy = correct / total` (incluye blancos) y
//!   `net_ratio = (correct − wrong/d) / total`, con `d` la resta del examen de referencia
//!   (3 en ingreso libre, 4 en promoción interna; ver [`penalty_divisor_of`]).
//! - `grade_history`: todos los intentos entregados en orden cronológico (cada punto lleva su
//!   `mode` y `max_grade`: 100 en exámenes completos, 10 en práctica). Media, mejor y última
//!   nota: solo exámenes completos (réplicas oficiales y simulacros), normalizadas a 0–100.
//! - Actividad: preguntas respondidas por día local en los últimos 120 días (incluye días sin
//!   actividad); racha: días consecutivos con actividad hasta hoy (o hasta ayer si hoy todavía
//!   no se ha estudiado).

use std::collections::{BTreeMap, BTreeSet};

use chrono::{DateTime, Duration, FixedOffset, NaiveDate, Utc};

use crate::api::{ActivityDay, BlockStat, ExamMode, GradePoint};
use crate::defaults::{ACTIVITY_DAYS, WEAK_TOPIC_MIN_ANSWERS};
use crate::model::{BlockId, ScoringScheme, TemarioFile};
use crate::util::{iso, local_date, ratio};

/// Aciertos, errores y blancos.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct Tally {
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
}

impl Tally {
    /// Total contabilizado.
    pub fn total(&self) -> u32 {
        self.correct + self.wrong + self.blank
    }

    fn add(&mut self, other: Tally) {
        self.correct += other.correct;
        self.wrong += other.wrong;
        self.blank += other.blank;
    }
}

fn block_rank(block: Option<BlockId>) -> u8 {
    match block {
        Some(BlockId::I) => 0,
        Some(BlockId::II) => 1,
        Some(BlockId::III) => 2,
        Some(BlockId::IV) => 3,
        None => 4,
    }
}

fn topic_number(topic: &str) -> u32 {
    topic
        .split_once('.')
        .and_then(|(_, n)| n.parse().ok())
        .unwrap_or(u32::MAX)
}

/// Resta por error por defecto (ingreso libre: un tercio).
pub const DEFAULT_PENALTY_DIVISOR: f64 = 3.0;

/// Divisor de la resta por error de un esquema: el de su cuestionario (o su primera parte).
pub fn penalty_divisor_of(scheme: &ScoringScheme) -> f64 {
    scheme
        .theory_part()
        .or_else(|| scheme.parts.first())
        .and_then(|p| p.penalty_divisor)
        .filter(|d| *d > 0.0)
        .unwrap_or(DEFAULT_PENALTY_DIVISOR)
}

/// Construye `BlockStat` a partir de recuentos (`divisor`: cada error resta `1/divisor`).
pub fn block_stat(
    key: String,
    block: Option<BlockId>,
    topic: Option<String>,
    label: String,
    tally: Tally,
    divisor: f64,
) -> BlockStat {
    let total = tally.total();
    let t = f64::from(total);
    BlockStat {
        key,
        block,
        topic,
        label,
        total,
        correct: tally.correct,
        wrong: tally.wrong,
        blank: tally.blank,
        accuracy: ratio(f64::from(tally.correct), t),
        net_ratio: ratio(
            f64::from(tally.correct) - f64::from(tally.wrong) / divisor,
            t,
        ),
    }
}

/// Acumulador de recuentos por bloque y por tema.
#[derive(Debug, Clone)]
pub struct Breakdown {
    blocks: BTreeMap<u8, (Option<BlockId>, Tally)>,
    topics: BTreeMap<(u8, u32, String), (Option<BlockId>, Tally)>,
    /// Cada error resta `1/divisor` en el rendimiento neto.
    divisor: f64,
}

impl Default for Breakdown {
    fn default() -> Self {
        Self::with_penalty_divisor(DEFAULT_PENALTY_DIVISOR)
    }
}

impl Breakdown {
    /// Acumulador cuyo rendimiento neto resta `1/divisor` por error.
    pub fn with_penalty_divisor(divisor: f64) -> Self {
        Self {
            blocks: BTreeMap::new(),
            topics: BTreeMap::new(),
            divisor: if divisor > 0.0 {
                divisor
            } else {
                DEFAULT_PENALTY_DIVISOR
            },
        }
    }

    /// Añade recuentos de una pregunta.
    pub fn add(&mut self, block: Option<BlockId>, topic: Option<&str>, tally: Tally) {
        if tally.total() == 0 {
            return;
        }
        self.blocks
            .entry(block_rank(block))
            .or_insert((block, Tally::default()))
            .1
            .add(tally);
        if let Some(topic) = topic {
            self.topics
                .entry((block_rank(block), topic_number(topic), topic.to_string()))
                .or_insert((block, Tally::default()))
                .1
                .add(tally);
        }
    }

    /// Desglose por bloque (solo bloques con respuestas; «sin clasificar» al final).
    pub fn by_block(&self, temario: Option<&TemarioFile>) -> Vec<BlockStat> {
        self.blocks
            .values()
            .map(|(block, tally)| match block {
                Some(b) => {
                    let title = temario
                        .and_then(|t| t.block(*b))
                        .map(|tb| tb.title.trim().to_string())
                        .filter(|t| !t.is_empty());
                    let label = match title {
                        Some(t) => format!("Bloque {} · {t}", b.as_str()),
                        None => format!("Bloque {}", b.as_str()),
                    };
                    block_stat(
                        b.as_str().to_string(),
                        Some(*b),
                        None,
                        label,
                        *tally,
                        self.divisor,
                    )
                }
                None => block_stat(
                    "sin_clasificar".to_string(),
                    None,
                    None,
                    "Sin clasificar".to_string(),
                    *tally,
                    self.divisor,
                ),
            })
            .collect()
    }

    /// Desglose por tema (solo temas con respuestas, en orden del temario).
    pub fn by_topic(&self, temario: Option<&TemarioFile>) -> Vec<BlockStat> {
        self.topics
            .iter()
            .map(|((_, _, topic), (block, tally))| {
                let title = temario
                    .and_then(|t| t.topic(topic))
                    .map(|tp| tp.title.trim().to_string())
                    .filter(|t| !t.is_empty());
                let label = match title {
                    Some(t) => format!("{topic} · {t}"),
                    None => format!("Tema {topic}"),
                };
                block_stat(
                    topic.clone(),
                    *block,
                    Some(topic.clone()),
                    label,
                    *tally,
                    self.divisor,
                )
            })
            .collect()
    }
}

/// Hasta 5 temas con peor rendimiento neto (con un mínimo de respuestas).
pub fn weakest_topics(by_topic: &[BlockStat]) -> Vec<BlockStat> {
    let mut candidates: Vec<&BlockStat> = by_topic
        .iter()
        .filter(|t| t.total >= WEAK_TOPIC_MIN_ANSWERS)
        .collect();
    candidates.sort_by(|a, b| {
        a.net_ratio
            .total_cmp(&b.net_ratio)
            .then(a.accuracy.total_cmp(&b.accuracy))
            .then(b.total.cmp(&a.total))
            .then(a.key.cmp(&b.key))
    });
    candidates.into_iter().take(5).cloned().collect()
}

/// Resumen de un intento entregado (para estadísticas del perfil).
#[derive(Debug, Clone, PartialEq)]
pub struct FinishedAttempt {
    pub attempt_id: String,
    pub mode: ExamMode,
    pub title: String,
    pub finished_at: DateTime<Utc>,
    pub elapsed_seconds: u64,
    pub total_grade: Option<f64>,
    pub max_grade: Option<f64>,
    pub passed: Option<bool>,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
}

impl FinishedAttempt {
    /// Preguntas respondidas (aciertos + errores).
    pub fn answered(&self) -> u32 {
        self.correct + self.wrong
    }
}

/// Historial de notas de todos los intentos entregados, en orden cronológico.
pub fn grade_history(attempts: &[FinishedAttempt]) -> Vec<GradePoint> {
    let mut points: Vec<GradePoint> = attempts
        .iter()
        .filter_map(|a| {
            Some(GradePoint {
                attempt_id: a.attempt_id.clone(),
                date: iso(a.finished_at),
                mode: a.mode,
                title: a.title.clone(),
                grade: a.total_grade?,
                max_grade: a.max_grade?,
                passed: a.passed.unwrap_or(false),
            })
        })
        .collect();
    points.sort_by(|a, b| a.date.cmp(&b.date).then(a.attempt_id.cmp(&b.attempt_id)));
    points
}

/// Nota normalizada a 0–100.
pub fn normalized_grade(grade: f64, max: f64) -> f64 {
    if max > 0.0 { grade / max * 100.0 } else { 0.0 }
}

/// Actividad diaria de los últimos `ACTIVITY_DAYS` días (el último es hoy).
pub fn activity(
    attempts: &[FinishedAttempt],
    today: NaiveDate,
    offset: FixedOffset,
) -> Vec<ActivityDay> {
    let mut per_day: BTreeMap<NaiveDate, u32> = BTreeMap::new();
    for a in attempts {
        *per_day
            .entry(local_date(a.finished_at, offset))
            .or_default() += a.answered();
    }
    (0..ACTIVITY_DAYS)
        .rev()
        .map(|back| {
            let day = today - Duration::days(back);
            ActivityDay {
                date: day.format("%Y-%m-%d").to_string(),
                answered: per_day.get(&day).copied().unwrap_or(0),
            }
        })
        .collect()
}

/// Racha de días consecutivos con actividad (hasta hoy o hasta ayer).
pub fn streak_days(attempts: &[FinishedAttempt], today: NaiveDate, offset: FixedOffset) -> u32 {
    let days: BTreeSet<NaiveDate> = attempts
        .iter()
        .filter(|a| a.answered() > 0)
        .map(|a| local_date(a.finished_at, offset))
        .collect();
    let mut day = if days.contains(&today) {
        today
    } else {
        today - Duration::days(1)
    };
    let mut streak = 0;
    while days.contains(&day) {
        streak += 1;
        day -= Duration::days(1);
    }
    streak
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util::parse_iso;

    fn attempt(id: &str, mode: ExamMode, when: &str, grade: f64, answered: u32) -> FinishedAttempt {
        FinishedAttempt {
            attempt_id: id.to_string(),
            mode,
            title: id.to_string(),
            finished_at: parse_iso(when).expect("fecha"),
            elapsed_seconds: 60,
            total_grade: Some(grade),
            max_grade: Some(if mode.is_full_exam() { 100.0 } else { 10.0 }),
            passed: Some(grade >= 50.0),
            correct: answered,
            wrong: 0,
            blank: 0,
        }
    }

    #[test]
    fn breakdown_accuracy_and_net_ratio() {
        let mut b = Breakdown::default();
        b.add(
            Some(BlockId::IV),
            Some("IV.7"),
            Tally {
                correct: 6,
                wrong: 3,
                blank: 1,
            },
        );
        b.add(
            None,
            None,
            Tally {
                correct: 1,
                wrong: 0,
                blank: 0,
            },
        );
        let blocks = b.by_block(None);
        assert_eq!(blocks.len(), 2);
        assert_eq!(blocks[0].key, "IV");
        assert!((blocks[0].accuracy - 0.6).abs() < 1e-9);
        assert!((blocks[0].net_ratio - 0.5).abs() < 1e-9);
        assert_eq!(blocks[1].key, "sin_clasificar");
        let topics = b.by_topic(None);
        assert_eq!(topics[0].label, "Tema IV.7");
        assert_eq!(weakest_topics(&topics).len(), 1);
    }

    #[test]
    fn net_ratio_uses_the_given_penalty() {
        let mut b = Breakdown::with_penalty_divisor(4.0);
        b.add(
            Some(BlockId::I),
            None,
            Tally {
                correct: 6,
                wrong: 4,
                blank: 0,
            },
        );
        // (6 − 4/4) / 10 = 0,5
        assert!((b.by_block(None)[0].net_ratio - 0.5).abs() < 1e-9);
    }

    #[test]
    fn empty_tally_never_produces_nan() {
        let s = block_stat("x".into(), None, None, "x".into(), Tally::default(), 3.0);
        assert_eq!(s.accuracy, 0.0);
        assert_eq!(s.net_ratio, 0.0);
    }

    #[test]
    fn streak_and_activity() {
        let offset = FixedOffset::east_opt(0).expect("offset");
        let today = NaiveDate::from_ymd_opt(2026, 10, 11).expect("fecha");
        let attempts = vec![
            attempt("a", ExamMode::Practice, "2026-10-09T12:00:00Z", 7.0, 10),
            attempt("b", ExamMode::Simulacro, "2026-10-10T12:00:00Z", 60.0, 100),
            attempt("c", ExamMode::Practice, "2026-10-07T12:00:00Z", 5.0, 5),
        ];
        // Hoy sin actividad: la racha cuenta hasta ayer (10 y 9).
        assert_eq!(streak_days(&attempts, today, offset), 2);
        let act = activity(&attempts, today, offset);
        assert_eq!(act.len(), 120);
        assert_eq!(act.last().map(|d| d.date.as_str()), Some("2026-10-11"));
        assert_eq!(act[118].answered, 100);
        let history = grade_history(&attempts);
        assert_eq!(history.len(), 3);
        assert_eq!(history[0].attempt_id, "c", "cronológico");
        assert_eq!(history[1].max_grade, 10.0, "práctica sobre 10");
        assert_eq!(history[2].attempt_id, "b");
        assert_eq!(history[2].max_grade, 100.0);
    }
}
