// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import type { ApiError } from "./types";

type ApiErrorCode = ApiError["code"];

const CODES: readonly ApiErrorCode[] = ["not_found", "invalid_input", "conflict", "storage", "data", "internal"];

/**
 * Error de la API como instancia de `Error` (con traza) que cumple la interfaz
 * `ApiError` del contrato: `{ code, message }` con mensaje en castellano.
 */
export class OpoApiError extends Error implements ApiError {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = "OpoApiError";
    this.code = code;
  }

  toJSON(): ApiError {
    return { code: this.code, message: this.message };
  }
}

export function isApiError(value: unknown): value is ApiError {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.code === "string" && CODES.includes(v.code as ApiErrorCode) && typeof v.message === "string";
}

/** Convierte cualquier rechazo (objeto serde, string, Error…) en `OpoApiError`. */
export function toApiError(value: unknown, command?: string): OpoApiError {
  if (value instanceof OpoApiError) return value;
  if (isApiError(value)) return new OpoApiError(value.code, value.message);
  if (typeof value === "string") {
    // Tauri rechaza con string cuando el comando no existe o falla la deserialización.
    const missing = /not found|unknown command|no se encontr/i.test(value);
    return new OpoApiError(
      missing ? "not_found" : "internal",
      missing && command ? `El núcleo no implementa todavía «${command}».` : value,
    );
  }
  if (value instanceof Error) return new OpoApiError("internal", value.message || "Error inesperado.");
  return new OpoApiError("internal", "Error inesperado al comunicarse con el núcleo de OpoTAI.");
}

/** Mensaje apto para mostrar. */
export function errorMessage(value: unknown): string {
  return toApiError(value).message;
}
