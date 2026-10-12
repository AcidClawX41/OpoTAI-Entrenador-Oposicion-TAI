// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Tabla `profiles`.

use rusqlite::{Connection, OptionalExtension, Row, params};

use crate::error::CoreResult;

/// Fila de `profiles`.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProfileRow {
    pub id: String,
    pub name: String,
    pub color: String,
    pub avatar: Option<String>,
    pub created_at: String,
    pub last_active_at: Option<String>,
    pub settings_json: Option<String>,
}

const COLUMNS: &str = "id, name, color, avatar, created_at, last_active_at, settings_json";

fn from_row(row: &Row<'_>) -> rusqlite::Result<ProfileRow> {
    Ok(ProfileRow {
        id: row.get(0)?,
        name: row.get(1)?,
        color: row.get(2)?,
        avatar: row.get(3)?,
        created_at: row.get(4)?,
        last_active_at: row.get(5)?,
        settings_json: row.get(6)?,
    })
}

/// Inserta un perfil.
pub fn insert(conn: &Connection, p: &ProfileRow) -> CoreResult<()> {
    conn.execute(
        &format!("INSERT INTO profiles ({COLUMNS}) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)"),
        params![
            p.id,
            p.name,
            p.color,
            p.avatar,
            p.created_at,
            p.last_active_at,
            p.settings_json
        ],
    )?;
    Ok(())
}

/// Perfil por id.
pub fn get(conn: &Connection, id: &str) -> CoreResult<Option<ProfileRow>> {
    Ok(conn
        .query_row(
            &format!("SELECT {COLUMNS} FROM profiles WHERE id = ?1"),
            params![id],
            from_row,
        )
        .optional()?)
}

/// Perfiles: último activo primero.
pub fn list(conn: &Connection) -> CoreResult<Vec<ProfileRow>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM profiles
         ORDER BY COALESCE(last_active_at, created_at) DESC, created_at DESC, name"
    ))?;
    let rows = stmt.query_map([], from_row)?;
    Ok(rows.collect::<rusqlite::Result<Vec<_>>>()?)
}

/// ¿Existe otro perfil con ese nombre (sin distinguir mayúsculas ni tildes)?
pub fn name_taken(conn: &Connection, name: &str, exclude_id: Option<&str>) -> CoreResult<bool> {
    let key = crate::util::normalize_key(name);
    Ok(list(conn)?
        .iter()
        .any(|p| Some(p.id.as_str()) != exclude_id && crate::util::normalize_key(&p.name) == key))
}

/// Actualiza nombre, color y avatar.
pub fn update(
    conn: &Connection,
    id: &str,
    name: &str,
    color: &str,
    avatar: Option<&str>,
) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE profiles SET name = ?2, color = ?3, avatar = ?4 WHERE id = ?1",
        params![id, name, color, avatar],
    )?)
}

/// Marca el perfil como activo.
pub fn touch(conn: &Connection, id: &str, now: &str) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE profiles SET last_active_at = ?2 WHERE id = ?1",
        params![id, now],
    )?)
}

/// Guarda los ajustes (JSON).
pub fn set_settings(conn: &Connection, id: &str, json: &str) -> CoreResult<usize> {
    Ok(conn.execute(
        "UPDATE profiles SET settings_json = ?2 WHERE id = ?1",
        params![id, json],
    )?)
}

/// Borra el perfil (en cascada intentos, respuestas y estadísticas).
pub fn delete(conn: &Connection, id: &str) -> CoreResult<usize> {
    Ok(conn.execute("DELETE FROM profiles WHERE id = ?1", params![id])?)
}
