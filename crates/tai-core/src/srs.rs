// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Repaso espaciado tipo Leitner.
//!
//! - Un **error** pone la pregunta en la caja 1, que vence de inmediato.
//! - Cada **acierto** posterior la sube de caja; al entrar en la caja `k` vence a los
//!   `0 / 1 / 3 / 7 / 15` días (cajas 1–5). En la caja 5 se considera **dominada** y sigue
//!   apareciendo cada 15 días mientras se acierte.
//! - Una pregunta **en blanco** que ya está en el repaso vuelve a la caja 1 («no la sé»);
//!   si no estaba en el repaso, no se añade.
//! - Un acierto en una pregunta que nunca se ha fallado no la añade al repaso.

use chrono::{DateTime, Duration, Utc};

use crate::history::{Outcome, QuestionStat};

/// Intervalo en días al entrar en cada caja (índice = caja − 1).
pub const INTERVAL_DAYS: [i64; 5] = [0, 1, 3, 7, 15];

/// Caja de las preguntas dominadas.
pub const MASTERED_BOX: u8 = 5;

/// Estado Leitner de una pregunta.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct SrsState {
    /// 0 = fuera del repaso; 1–5 = caja.
    pub box_number: u8,
    pub due_at: Option<DateTime<Utc>>,
}

impl SrsState {
    /// Fuera del repaso.
    pub const NONE: SrsState = SrsState {
        box_number: 0,
        due_at: None,
    };

    /// Está en seguimiento (cajas 1–4).
    pub fn is_learning(self) -> bool {
        (1..MASTERED_BOX).contains(&self.box_number)
    }

    /// Está dominada (caja 5).
    pub fn is_mastered(self) -> bool {
        self.box_number >= MASTERED_BOX
    }

    /// Vence antes de `limit` (p. ej. el final del día local).
    pub fn is_due(self, limit: DateTime<Utc>) -> bool {
        self.box_number > 0 && self.due_at.is_none_or(|d| d < limit)
    }
}

fn enter_box(box_number: u8, now: DateTime<Utc>) -> SrsState {
    let b = box_number.clamp(1, MASTERED_BOX);
    let days = INTERVAL_DAYS[usize::from(b - 1)];
    SrsState {
        box_number: b,
        due_at: Some(now + Duration::days(days)),
    }
}

/// Nuevo estado tras contestar una pregunta.
pub fn next_state(current: SrsState, outcome: Outcome, now: DateTime<Utc>) -> SrsState {
    match outcome {
        Outcome::Wrong => enter_box(1, now),
        Outcome::Blank if current.box_number > 0 => enter_box(1, now),
        Outcome::Blank => current,
        Outcome::Correct if current.box_number == 0 => current,
        Outcome::Correct => enter_box((current.box_number + 1).min(MASTERED_BOX), now),
    }
}

/// Aplica una respuesta contabilizada al historial de la pregunta.
pub fn apply(stat: &mut QuestionStat, outcome: Outcome, flagged: bool, now: DateTime<Utc>) {
    stat.seen += 1;
    match outcome {
        Outcome::Correct => stat.correct += 1,
        Outcome::Wrong => stat.wrong += 1,
        Outcome::Blank => stat.blank += 1,
    }
    stat.last_answered_at = Some(now);
    stat.last_result = Some(outcome);
    stat.flagged = flagged;
    let next = next_state(
        SrsState {
            box_number: stat.srs_box,
            due_at: stat.srs_due_at,
        },
        outcome,
        now,
    );
    stat.srs_box = next.box_number;
    stat.srs_due_at = next.due_at;
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::util::parse_iso;

    fn now() -> DateTime<Utc> {
        parse_iso("2026-10-11T10:00:00Z").expect("fecha")
    }

    #[test]
    fn wrong_answer_enters_box_one_due_now() {
        let s = next_state(SrsState::NONE, Outcome::Wrong, now());
        assert_eq!(s.box_number, 1);
        assert_eq!(s.due_at, Some(now()));
        assert!(s.is_due(now() + Duration::seconds(1)));
    }

    #[test]
    fn correct_answers_climb_boxes_with_intervals() {
        let mut s = next_state(SrsState::NONE, Outcome::Wrong, now());
        let mut t = now();
        let expected = [(2, 1), (3, 3), (4, 7), (5, 15), (5, 15)];
        for (box_number, days) in expected {
            s = next_state(s, Outcome::Correct, t);
            assert_eq!(s.box_number, box_number);
            assert_eq!(s.due_at, Some(t + Duration::days(days)));
            t += Duration::days(days);
        }
        assert!(s.is_mastered());
        assert!(!s.is_learning());
        // Un fallo devuelve a la caja 1 incluso desde «dominada».
        let s = next_state(s, Outcome::Wrong, t);
        assert_eq!(s.box_number, 1);
    }

    #[test]
    fn correct_or_blank_outside_review_does_nothing() {
        assert_eq!(
            next_state(SrsState::NONE, Outcome::Correct, now()),
            SrsState::NONE
        );
        assert_eq!(
            next_state(SrsState::NONE, Outcome::Blank, now()),
            SrsState::NONE
        );
        let learning = next_state(SrsState::NONE, Outcome::Wrong, now());
        let learning = next_state(learning, Outcome::Correct, now());
        assert_eq!(learning.box_number, 2);
        let reset = next_state(learning, Outcome::Blank, now());
        assert_eq!(reset.box_number, 1);
    }

    #[test]
    fn apply_updates_counters() {
        let mut stat = QuestionStat::new("q1");
        apply(&mut stat, Outcome::Wrong, true, now());
        apply(&mut stat, Outcome::Correct, false, now());
        assert_eq!(
            (stat.seen, stat.correct, stat.wrong, stat.blank),
            (2, 1, 1, 0)
        );
        assert_eq!(stat.srs_box, 2);
        assert!(!stat.flagged);
        assert_eq!(stat.last_result, Some(Outcome::Correct));
    }
}
