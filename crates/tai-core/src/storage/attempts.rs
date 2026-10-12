// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Tablas `attempts` y `attempt_answers`.

use rusqlite::{Connection, OptionalExtension, Row, params};

use super::{as_bool, as_u32};
use crate::error::CoreResult;
use crate::model::Letter;

/// Estados de un intento en la base de datos.
pub const IN_PROGRESS: &str = "in_progress";
/// Intento entregado.
pub const FINISHED: &str = "finished";
/// Intento abandonado (no aparece en listados ni estadísticas).
pub const ABANDONED: &str = "abandoned";

/// Fila completa de `attempts`.
#[derive(Debug, Clone, PartialEq)]
pub struct AttemptRow {
    pub id: String,
    pub profile_id: String,
    pub mode: String,
    pub title: String,
    pub spec_json: String,
    pub paper_json: String,
    pub status: String,
    pub started_at: String,
    pub finished_at: Option<String>,
    pub elapsed_seconds: u64,
    pub chosen_case: Option<String>,
    pub total_grade: Option<f64>,
    pub max_grade: Option<f64>,
    pub passed: Option<bool>,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub p_plaza: Option<f64>,
    pub result_json: Option<String>,
}

/// Resumen de un intento (sin los JSON grandes).
#[derive(Debug, Clone, PartialEq)]
pub struct AttemptMeta {
    pub id: String,
    pub mode: String,
    pub title: String,
    pub spec_json: String,
    pub status: String,
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

/// Respuesta guardada.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AnswerRow {
    pub question_id: String,
    pub choice: Option<Letter>,
    pub flagged: bool,
    /// Bloqueada por `check_answer` (corrección inmediata).
    pub checked: bool,
}

/// Resultado que se guarda al entregar o recalcular.
#[derive(Debug, Clone, PartialEq)]
pub struct FinishData<'a> {
    pub finished_at: &'a str,
    pub elapsed_seconds: u64,
    pub chosen_case: Option<&'a str>,
    pub total_grade: f64,
    pub max_grade: f64,
    pub passed: bool,
    pub correct: u32,
    pub wrong: u32,
    pub blank: u32,
    pub p_plaza: Option<f64>,
    pub result_json: &'a str,
}

const FULL: &str = "id, profile_id, mode, title, spec_json, paper_json, status, started_at, \
                    finished_at, elapsed_seconds, chosen_case, total_grade, max_grade, passed, \
                    correct, wrong, blank, p_plaza, result_json";

const META: &str = "id, mode, title, spec_json, status, started_at, finished_at, \
                    elapsed_seconds, total_grade, max_grade, passed, correct, wrong, blank, p_plaza";

fn full_from_row(row: &Row<'_>) -> rusqlite::Result<AttemptRow> {
    Ok(AttemptRow {
        id: row.get(0)?,
        profile_id: row.get(1)?,
        mode: row.get(2)?,
        title: row.get(3)?,
        spec_json: row.get(4)?,
        paper_json: row.get(5)?,
        status: row.get(6)?,
        started_at: row.get(7)?,
        finished_at: row.get(8)?,
        elapsed_seconds: row.get::<_, i64>(9)?.max(0) as u64,
        chosen_case: row.get(10)?,
        total_grade: row.get(11)?,
        max_grade: row.get(12)?,
        passed: row.get::<_, Option<i64>>(13)?.map(as_bool),
        correct: as_u32(row.get(14)?),
        wrong: as_u32(row.get(15)?),
        blank: as_u32(row.get(16)?),
        p_plaza: row.get(17)?,
        result_json: row.get(18)?,
    })
}

fn meta_from_row(row: &Row<'_>) -> rusqlite::Result<AttemptMeta> {
    Ok(AttemptMeta {
        id: row.get(0)?,
        mode: row.get(1)?,
        title: row.get(2)?,
        spec_json: row.get(3)?,
        status: row.get(4)?,
        started_at: row.get(5)?,
        finished_at: row.get(6)?,
        elapsed_seconds: row.get::<_, i64>(7)?.max(0) as u64,
        total_grade: row.get(8)?,
        max_grade: row.get(9)?,
        passed: row.get::<_, Option<i64>>(10)?.map(as_bool),
        correct: as_u32(row.get(11)?),
        wrong: as_u32(row.get(12)?),
        blank: as_u32(row.get(13)?),
        p_plaza: row.get(14)?,
    })
}

/// Inserta un intento.
pub fn insert(conn: &Connection, a: &AttemptRow) -> CoreResult<()> {
    conn.execute(
        &format!(
            "INSERT INTO attempts ({FULL}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, \
             ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)"
        ),
        params![
            a.id,
            a.profile_id,
            a.mode,
            a.title,
            a.spec_json,
            a.paper_json,
            a.status,
            a.started_at,
            a.finished_at,
            a.elapsed_seconds as i64,
            a.chosen_case,
            a.total_grade,
            a.max_grade,
            a.passed.map(i64::from),
            i64::from(a.correct),
            i64::from(a.wrong),
            i64::from(a.blank),
            a.p_plaza,
            a.result_json
        ],
    )?;
    Ok(())
}

/// Intento por id.
pub fn get(conn: &Connection, id: &str) -> CoreResult<Option<AttemptRow>> {
    Ok(conn
        .query_row(
            &format!("SELECT {FULL} FROM attempts WHERE id = ?1"),
            params![id],
            full_from_row,
        )
        .optional()?)
}

/// Intentos en curso de un perfil (el más reciente primero).
pub fn in_progress(conn: &Connection, profile_id: &str) -> CoreResult<Vec<AttemptRow>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {FULL} FROM attempts WHERE profile_id = ?1 AND status = ?2
         ORDER BY started_at DESC, rowid DESC"
    ))?;
    let rows = stmt.query_map(params![profile_id, IN_PROGRESS], full_from_row)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Cambia el estado de un intento.
pub fn set_status(conn: &Connection, id: &str, status: &str) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE attempts SET status = ?2 WHERE id = ?1",
        params![id, status],
    )?)
}

/// Marca como abandonados los intentos en curso del perfil.
pub fn abandon_in_progress(conn: &Connection, profile_id: &str) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE attempts SET status = ?3 WHERE profile_id = ?1 AND status = ?2",
        params![profile_id, IN_PROGRESS, ABANDONED],
    )?)
}

/// Guarda supuesto elegido y tiempo (el tiempo nunca disminuye).
pub fn update_progress(
    conn: &Connection,
    id: &str,
    chosen_case: Option<&str>,
    elapsed_seconds: u64,
) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE attempts SET chosen_case = ?2, elapsed_seconds = MAX(elapsed_seconds, ?3)
         WHERE id = ?1",
        params![id, chosen_case, elapsed_seconds as i64],
    )?)
}

/// Respuestas guardadas de un intento.
pub fn answers(conn: &Connection, attempt_id: &str) -> CoreResult<Vec<AnswerRow>> {
    let mut stmt = conn.prepare(
        "SELECT question_id, choice, flagged, checked FROM attempt_answers
         WHERE attempt_id = ?1 ORDER BY rowid",
    )?;
    let rows = stmt.query_map(params![attempt_id], |row| {
        let choice: Option<String> = row.get(1)?;
        Ok(AnswerRow {
            question_id: row.get(0)?,
            choice: choice.as_deref().and_then(Letter::parse),
            flagged: as_bool(row.get(2)?),
            checked: as_bool(row.get(3)?),
        })
    })?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Inserta o actualiza una respuesta.
pub fn upsert_answer(conn: &Connection, attempt_id: &str, a: &AnswerRow) -> CoreResult<()> {
    conn.execute(
        "INSERT INTO attempt_answers (attempt_id, question_id, choice, flagged, checked)
         VALUES (?1, ?2, ?3, ?4, ?5)
         ON CONFLICT (attempt_id, question_id) DO UPDATE SET
             choice = excluded.choice, flagged = excluded.flagged, checked = excluded.checked",
        params![
            attempt_id,
            a.question_id,
            a.choice.map(Letter::as_str),
            i64::from(a.flagged),
            i64::from(a.checked)
        ],
    )?;
    Ok(())
}

/// Guarda el resultado y marca el intento como entregado.
pub fn finish(conn: &Connection, id: &str, f: &FinishData<'_>) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE attempts SET status = ?2, finished_at = ?3, elapsed_seconds = ?4,
             chosen_case = ?5, total_grade = ?6, max_grade = ?7, passed = ?8, correct = ?9,
             wrong = ?10, blank = ?11, p_plaza = ?12, result_json = ?13
         WHERE id = ?1",
        params![
            id,
            FINISHED,
            f.finished_at,
            f.elapsed_seconds as i64,
            f.chosen_case,
            f.total_grade,
            f.max_grade,
            i64::from(f.passed),
            i64::from(f.correct),
            i64::from(f.wrong),
            i64::from(f.blank),
            f.p_plaza,
            f.result_json
        ],
    )?)
}

/// Intentos visibles (en curso y entregados), el más reciente primero.
pub fn list(conn: &Connection, profile_id: &str, limit: u32) -> CoreResult<Vec<AttemptMeta>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {META} FROM attempts WHERE profile_id = ?1 AND status IN (?2, ?3)
         ORDER BY started_at DESC, rowid DESC LIMIT ?4"
    ))?;
    let rows = stmt.query_map(
        params![profile_id, IN_PROGRESS, FINISHED, i64::from(limit)],
        meta_from_row,
    )?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// Intentos entregados de un perfil en orden cronológico de entrega.
pub fn finished(conn: &Connection, profile_id: &str) -> CoreResult<Vec<AttemptMeta>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {META} FROM attempts WHERE profile_id = ?1 AND status = ?2
         ORDER BY finished_at ASC, rowid ASC"
    ))?;
    let rows = stmt.query_map(params![profile_id, FINISHED], meta_from_row)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// `result_json` de un intento.
pub fn result_json(conn: &Connection, id: &str) -> CoreResult<Option<String>> {
    Ok(conn
        .query_row(
            "SELECT result_json FROM attempts WHERE id = ?1",
            params![id],
            |row| row.get::<_, Option<String>>(0),
        )
        .optional()?
        .flatten())
}

/// Borra un intento (y sus respuestas en cascada).
pub fn delete(conn: &Connection, id: &str) -> CoreResult<usize> {
    Ok(conn.execute("DELETE FROM attempts WHERE id = ?1", params![id])?)
}
