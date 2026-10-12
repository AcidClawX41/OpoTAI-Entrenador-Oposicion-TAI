// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Tabla `question_stats` (historial por pregunta y repaso espaciado).

use std::collections::HashMap;

use rusqlite::{Connection, params};

use super::{as_bool, as_u32};
use crate::error::CoreResult;
use crate::history::{Outcome, QuestionStat};
use crate::util::{iso, parse_iso};

/// Historial completo de un perfil.
pub fn load(conn: &Connection, profile_id: &str) -> CoreResult<Vec<QuestionStat>> {
    let mut stmt = conn.prepare(
        "SELECT question_id, seen, correct, wrong, blank, last_answered_at, last_result,
                srs_box, srs_due_at, flagged
         FROM question_stats WHERE profile_id = ?1 ORDER BY question_id",
    )?;
    let rows = stmt.query_map(params![profile_id], |row| {
        let last_answered: Option<String> = row.get(5)?;
        let last_result: Option<String> = row.get(6)?;
        let due: Option<String> = row.get(8)?;
        Ok(QuestionStat {
            question_id: row.get(0)?,
            seen: as_u32(row.get(1)?),
            correct: as_u32(row.get(2)?),
            wrong: as_u32(row.get(3)?),
            blank: as_u32(row.get(4)?),
            last_answered_at: last_answered.as_deref().and_then(parse_iso),
            last_result: last_result.as_deref().and_then(Outcome::parse),
            srs_box: row.get::<_, i64>(7)?.clamp(0, 5) as u8,
            srs_due_at: due.as_deref().and_then(parse_iso),
            flagged: as_bool(row.get(9)?),
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Historial indexado por id de pregunta.
pub fn load_map(conn: &Connection, profile_id: &str) -> CoreResult<HashMap<String, QuestionStat>> {
    Ok(load(conn, profile_id)?
        .into_iter()
        .map(|s| (s.question_id.clone(), s))
        .collect())
}

/// Inserta o reemplaza el historial de una pregunta.
pub fn upsert(conn: &Connection, profile_id: &str, s: &QuestionStat) -> CoreResult<()> {
    conn.execute(
        "INSERT INTO question_stats (profile_id, question_id, seen, correct, wrong, blank,
             last_answered_at, last_result, srs_box, srs_due_at, flagged)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)
         ON CONFLICT (profile_id, question_id) DO UPDATE SET
             seen = excluded.seen, correct = excluded.correct, wrong = excluded.wrong,
             blank = excluded.blank, last_answered_at = excluded.last_answered_at,
             last_result = excluded.last_result, srs_box = excluded.srs_box,
             srs_due_at = excluded.srs_due_at, flagged = excluded.flagged",
        params![
            profile_id,
            s.question_id,
            i64::from(s.seen),
            i64::from(s.correct),
            i64::from(s.wrong),
            i64::from(s.blank),
            s.last_answered_at.map(iso),
            s.last_result.map(Outcome::as_str),
            i64::from(s.srs_box),
            s.srs_due_at.map(iso),
            i64::from(s.flagged)
        ],
    )?;
    Ok(())
}
