// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Reglas puras de qué sonido corresponde a cada evento del examen.
 * Nunca suena al dejar una pregunta en blanco o borrar la respuesta.
 */
import type { AnswerFeedback, FeedbackMode, Letter } from "@/api/types";
import type { SfxName } from "./sfx";

/** Al marcar o cambiar la respuesta. En modo inmediato suena el resultado de `check_answer`. */
export function soundForSelection(feedback: FeedbackMode, next: Letter | null): SfxName | null {
  if (next === null) return null;
  return feedback === "end" ? "tick" : null;
}

/** Al conocer la corrección (modo inmediato). Revelar la solución en blanco no suena. */
export function soundForFeedback(fb: Pick<AnswerFeedback, "chosen" | "is_correct" | "annulled">): SfxName | null {
  if (fb.chosen === null || fb.annulled) return null;
  return fb.is_correct ? "correct" : "wrong";
}

/** Al entregar el examen. */
export function soundForResult(passed: boolean): SfxName {
  return passed ? "pass" : "fail";
}
