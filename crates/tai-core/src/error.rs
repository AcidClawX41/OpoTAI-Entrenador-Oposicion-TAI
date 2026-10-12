// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Errores del núcleo y su traducción al `ApiError` que recibe la interfaz.

use serde::{Deserialize, Serialize};

/// Resultado con el error del núcleo.
pub type CoreResult<T> = Result<T, CoreError>;

/// Error interno del núcleo. Los mensajes están en castellano porque llegan a la interfaz.
#[derive(Debug, thiserror::Error)]
pub enum CoreError {
    /// No existe el perfil, intento, banco… solicitado.
    #[error("{0}")]
    NotFound(String),
    /// Argumentos inválidos (rangos, filtros sin preguntas…).
    #[error("{0}")]
    InvalidInput(String),
    /// La operación no es compatible con el estado actual (intento ya entregado…).
    #[error("{0}")]
    Conflict(String),
    /// Error de SQLite.
    #[error("Error de almacenamiento: {0}")]
    Storage(#[from] rusqlite::Error),
    /// Datos embebidos o guardados incoherentes.
    #[error("Error en los datos: {0}")]
    Data(String),
    /// Error inesperado.
    #[error("Error interno: {0}")]
    Internal(String),
}

impl CoreError {
    /// Atajo para `NotFound`.
    pub fn not_found(msg: impl Into<String>) -> Self {
        Self::NotFound(msg.into())
    }

    /// Atajo para `InvalidInput`.
    pub fn invalid(msg: impl Into<String>) -> Self {
        Self::InvalidInput(msg.into())
    }

    /// Atajo para `Conflict`.
    pub fn conflict(msg: impl Into<String>) -> Self {
        Self::Conflict(msg.into())
    }

    /// Atajo para `Data`.
    pub fn data(msg: impl Into<String>) -> Self {
        Self::Data(msg.into())
    }

    /// Atajo para `Internal`.
    pub fn internal(msg: impl Into<String>) -> Self {
        Self::Internal(msg.into())
    }

    /// Código estable que entiende la interfaz.
    pub fn code(&self) -> ApiErrorCode {
        match self {
            Self::NotFound(_) => ApiErrorCode::NotFound,
            Self::InvalidInput(_) => ApiErrorCode::InvalidInput,
            Self::Conflict(_) => ApiErrorCode::Conflict,
            Self::Storage(_) => ApiErrorCode::Storage,
            Self::Data(_) => ApiErrorCode::Data,
            Self::Internal(_) => ApiErrorCode::Internal,
        }
    }
}

impl From<serde_json::Error> for CoreError {
    fn from(err: serde_json::Error) -> Self {
        Self::Data(format!("JSON no válido: {err}"))
    }
}

/// Código de error del contrato (`ApiError.code` en `types.ts`).
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ApiErrorCode {
    NotFound,
    InvalidInput,
    Conflict,
    Storage,
    Data,
    Internal,
}

/// Error que devuelven los comandos IPC: `{ code, message }`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, thiserror::Error)]
#[error("{message}")]
pub struct ApiError {
    pub code: ApiErrorCode,
    pub message: String,
}

impl ApiError {
    /// Error interno con mensaje libre (p. ej. fallos de la capa Tauri).
    pub fn internal(message: impl Into<String>) -> Self {
        Self {
            code: ApiErrorCode::Internal,
            message: message.into(),
        }
    }
}

impl From<CoreError> for ApiError {
    fn from(err: CoreError) -> Self {
        Self {
            code: err.code(),
            message: err.to_string(),
        }
    }
}
