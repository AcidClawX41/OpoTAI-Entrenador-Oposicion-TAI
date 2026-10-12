// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! # tai-core
//!
//! Núcleo de dominio de **OpoTAI**, el entrenador de tests y simulacros para la oposición
//! TAI (Técnicos Auxiliares de Informática de la Administración del Estado).
//!
//! El crate no depende de Tauri: la capa de escritorio (`app/src-tauri`) solo traduce cada
//! comando IPC a un método de [`Engine`]. Módulos principales:
//!
//! - [`model`]: formatos de los ficheros de datos (`data/banks`, `data/meta`).
//! - [`catalog`]: carga (directorio o memoria), índices y validación de los datos.
//! - [`scoring`]: corrección oficial (directa, penalización, reservas, cortes, transformación).
//! - [`builder`]: generación de exámenes (réplica oficial, simulacro, práctica, repaso, supuesto).
//! - [`attempt`]: evaluación de un intento, revisión y respuesta inmediata.
//! - [`srs`]: repaso espaciado tipo Leitner.
//! - [`stats`]: estadísticas del perfil.
//! - [`prediction`]: modelo Monte Carlo de aprobado, plaza y destino.
//! - [`storage`]: persistencia SQLite del progreso del usuario.
//! - [`api`]: DTO que viajan por IPC (idénticos a `app/src/api/types.ts`).
//! - [`engine`]: fachada con un método por comando del contrato.
//!
//! Autor: Eric Valls Gramunt.

pub mod api;
pub mod attempt;
pub mod builder;
pub mod catalog;
pub mod defaults;
pub mod engine;
pub mod error;
pub mod history;
pub mod model;
pub mod paper;
pub mod prediction;
pub mod scoring;
pub mod srs;
pub mod stats;
pub mod storage;
pub mod util;

pub use catalog::Catalog;
pub use engine::{Clock, Engine, EngineOptions, FixedClock, SystemClock};
pub use error::{ApiError, ApiErrorCode, CoreError, CoreResult};
pub use storage::Database;

/// Versión del crate (se muestra en «Acerca de»).
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Nombre visible de la aplicación.
pub const APP_NAME: &str = "OpoTAI";

/// Autor del proyecto.
pub const AUTHOR: &str = "Eric Valls Gramunt";

/// Repositorio del proyecto.
pub const REPOSITORY: &str = env!("CARGO_PKG_REPOSITORY");

/// Año de la primera publicación (inicio del aviso de derechos de autor).
pub const COPYRIGHT_FIRST_YEAR: i32 = 2026;

/// Titular de los derechos de autor.
pub const COPYRIGHT_HOLDER: &str = "Eric Valls Gramunt";

/// Aviso de derechos de autor para el año en curso: «© 2026 …» el primer año y
/// «© 2026–2027 …» a partir del siguiente, sin tener que tocarlo cada enero.
pub fn copyright_line(current_year: i32) -> String {
    if current_year > COPYRIGHT_FIRST_YEAR {
        format!("© {COPYRIGHT_FIRST_YEAR}–{current_year} {COPYRIGHT_HOLDER}")
    } else {
        format!("© {COPYRIGHT_FIRST_YEAR} {COPYRIGHT_HOLDER}")
    }
}

/// Licencia (identificador SPDX del workspace).
pub const LICENSE: &str = env!("CARGO_PKG_LICENSE");

/// Nombre legible de la licencia.
pub const LICENSE_NAME: &str = "GNU General Public License v3.0 o posterior";

/// Texto íntegro de la licencia (fichero `LICENSE` de la raíz del repositorio).
pub const LICENSE_TEXT: &str = include_str!(concat!(env!("CARGO_MANIFEST_DIR"), "/../../LICENSE"));
