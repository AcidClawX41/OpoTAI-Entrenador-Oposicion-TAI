// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Persistencia del progreso del usuario en SQLite (rusqlite con SQLite embebido).
//!
//! - Migraciones con `PRAGMA user_version` (cada versión se aplica en una transacción).
//! - Claves foráneas activadas y `ON DELETE CASCADE` (borrar un perfil borra sus intentos,
//!   respuestas y estadísticas).
//! - Modo WAL para que la escritura periódica del progreso sea rápida y segura.
//!
//! Esquema v1 (ver `docs/CONTRATO-API.md`, «Persistencia»): `profiles`, `attempts`,
//! `attempt_answers` (con la columna adicional `checked`: respuesta bloqueada por
//! `check_answer`) y `question_stats`.

pub mod attempts;
pub mod profiles;
pub mod question_stats;

use std::path::{Path, PathBuf};
use std::time::Duration;

use rusqlite::Connection;

use crate::error::{CoreError, CoreResult};

/// Migraciones en orden: la posición `i` lleva la base de datos a `user_version = i + 1`.
const MIGRATIONS: &[&str] = &[
    // v1 · esquema inicial.
    r#"
    CREATE TABLE profiles (
        id              TEXT PRIMARY KEY,
        name            TEXT NOT NULL,
        color           TEXT NOT NULL,
        avatar          TEXT,
        created_at      TEXT NOT NULL,
        last_active_at  TEXT,
        settings_json   TEXT
    );

    CREATE TABLE attempts (
        id              TEXT PRIMARY KEY,
        profile_id      TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        mode            TEXT NOT NULL,
        title           TEXT NOT NULL,
        spec_json       TEXT NOT NULL,
        paper_json      TEXT NOT NULL,
        status          TEXT NOT NULL CHECK (status IN ('in_progress', 'finished', 'abandoned')),
        started_at      TEXT NOT NULL,
        finished_at     TEXT,
        elapsed_seconds INTEGER NOT NULL DEFAULT 0,
        chosen_case     TEXT,
        total_grade     REAL,
        max_grade       REAL,
        passed          INTEGER,
        correct         INTEGER NOT NULL DEFAULT 0,
        wrong           INTEGER NOT NULL DEFAULT 0,
        blank           INTEGER NOT NULL DEFAULT 0,
        p_plaza         REAL,
        result_json     TEXT
    );
    CREATE INDEX idx_attempts_profile ON attempts(profile_id, status, started_at);

    CREATE TABLE attempt_answers (
        attempt_id      TEXT NOT NULL REFERENCES attempts(id) ON DELETE CASCADE,
        question_id     TEXT NOT NULL,
        choice          TEXT CHECK (choice IN ('A', 'B', 'C', 'D')),
        flagged         INTEGER NOT NULL DEFAULT 0,
        checked         INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (attempt_id, question_id)
    );

    CREATE TABLE question_stats (
        profile_id       TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        question_id      TEXT NOT NULL,
        seen             INTEGER NOT NULL DEFAULT 0,
        correct          INTEGER NOT NULL DEFAULT 0,
        wrong            INTEGER NOT NULL DEFAULT 0,
        blank            INTEGER NOT NULL DEFAULT 0,
        last_answered_at TEXT,
        last_result      TEXT,
        srs_box          INTEGER NOT NULL DEFAULT 0,
        srs_due_at       TEXT,
        flagged          INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY (profile_id, question_id)
    );
    CREATE INDEX idx_question_stats_due ON question_stats(profile_id, srs_box, srs_due_at);
    "#,
];

/// Versión del esquema que crea esta versión del núcleo.
pub const SCHEMA_VERSION: i64 = MIGRATIONS.len() as i64;

/// Base de datos del usuario.
#[derive(Debug)]
pub struct Database {
    conn: Connection,
    path: Option<PathBuf>,
}

impl Database {
    /// Abre (o crea) la base de datos en `path`, creando el directorio si hace falta.
    pub fn open(path: impl AsRef<Path>) -> CoreResult<Database> {
        let path = path.as_ref();
        if let Some(dir) = path.parent() {
            if !dir.as_os_str().is_empty() {
                std::fs::create_dir_all(dir).map_err(|e| {
                    CoreError::internal(format!(
                        "no se puede crear el directorio {}: {e}",
                        dir.display()
                    ))
                })?;
            }
        }
        let conn = Connection::open(path)?;
        let mut db = Database {
            conn,
            path: Some(path.to_path_buf()),
        };
        db.init(true)?;
        Ok(db)
    }

    /// Base de datos en memoria (tests o emergencia si no se puede abrir el fichero).
    pub fn open_in_memory() -> CoreResult<Database> {
        let conn = Connection::open_in_memory()?;
        let mut db = Database { conn, path: None };
        db.init(false)?;
        Ok(db)
    }

    fn init(&mut self, file_backed: bool) -> CoreResult<()> {
        self.conn.busy_timeout(Duration::from_secs(5))?;
        self.conn.pragma_update(None, "foreign_keys", true)?;
        if file_backed {
            // `journal_mode` devuelve una fila: se consulta en vez de usar `pragma_update`.
            let _mode: String = self
                .conn
                .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))?;
            // 1 = NORMAL: seguro con WAL y mucho más rápido que FULL.
            self.conn.pragma_update(None, "synchronous", 1)?;
        }
        self.migrate()
    }

    fn migrate(&mut self) -> CoreResult<()> {
        let current = self.schema_version()?;
        if current > SCHEMA_VERSION {
            return Err(CoreError::data(format!(
                "La base de datos es de una versión más reciente de OpoTAI (esquema {current}); \
                 actualiza la aplicación."
            )));
        }
        for (i, sql) in MIGRATIONS.iter().enumerate() {
            let version = i as i64 + 1;
            if version <= current {
                continue;
            }
            let tx = self.conn.transaction()?;
            tx.execute_batch(sql)?;
            tx.pragma_update(None, "user_version", version)?;
            tx.commit()?;
            log::info!("base de datos migrada al esquema v{version}");
        }
        Ok(())
    }

    /// Versión del esquema (`PRAGMA user_version`).
    pub fn schema_version(&self) -> CoreResult<i64> {
        Ok(self
            .conn
            .pragma_query_value(None, "user_version", |row| row.get(0))?)
    }

    /// Conexión.
    pub fn conn(&self) -> &Connection {
        &self.conn
    }

    /// Conexión mutable (para transacciones).
    pub fn conn_mut(&mut self) -> &mut Connection {
        &mut self.conn
    }

    /// Ruta del fichero (o `None` si está en memoria).
    pub fn path(&self) -> Option<&Path> {
        self.path.as_deref()
    }
}

/// Convierte un booleano de SQLite.
pub(crate) fn as_bool(v: i64) -> bool {
    v != 0
}

/// Convierte un entero de SQLite a `u32` sin desbordar.
pub(crate) fn as_u32(v: i64) -> u32 {
    v.clamp(0, i64::from(u32::MAX)) as u32
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_are_idempotent() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("sub").join("opotai.sqlite3");
        {
            let db = Database::open(&path).expect("abre");
            assert_eq!(db.schema_version().expect("versión"), SCHEMA_VERSION);
        }
        let db = Database::open(&path).expect("reabre");
        assert_eq!(db.schema_version().expect("versión"), SCHEMA_VERSION);
        let fk: i64 = db
            .conn()
            .pragma_query_value(None, "foreign_keys", |r| r.get(0))
            .expect("pragma");
        assert_eq!(fk, 1);
    }

    #[test]
    fn newer_schema_is_rejected() {
        let dir = tempfile::tempdir().expect("tempdir");
        let path = dir.path().join("opotai.sqlite3");
        {
            let db = Database::open(&path).expect("abre");
            db.conn()
                .pragma_update(None, "user_version", SCHEMA_VERSION + 5)
                .expect("pragma");
        }
        assert!(matches!(Database::open(&path), Err(CoreError::Data(_))));
    }
}
