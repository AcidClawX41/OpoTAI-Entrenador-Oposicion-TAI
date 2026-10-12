// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Modo de realización de un examen completo:
 *  - «Aprendizaje»: sin límite de tiempo y corrección con explicación tras cada pregunta.
 *  - «Examen real»: cronómetro con la duración oficial y corrección al entregar, como el tribunal.
 *
 * Solo traduce el modo a la especificación del contrato (`timed` / `duration_minutes` y
 * `feedback`); la duración y la corrección las decide el núcleo.
 */
import type { ExamPaper, ExamSpec, FeedbackMode, Settings } from "@/api/types";

export type ExamRunMode = "learning" | "real";

export const RUN_MODE_LABEL: Record<ExamRunMode, string> = {
  learning: "Aprendizaje",
  real: "Examen real",
};

/** Corrección asociada a cada modo. */
export const RUN_MODE_FEEDBACK: Record<ExamRunMode, FeedbackMode> = {
  learning: "immediate",
  real: "end",
};

/** El modo recordado se guarda en el ajuste `exam_feedback` («immediate» = aprendizaje). */
export function runModeFromFeedback(feedback: FeedbackMode | null | undefined): ExamRunMode {
  return feedback === "immediate" ? "learning" : "real";
}

export function runModeFromSettings(settings: Pick<Settings, "exam_feedback"> | null | undefined): ExamRunMode {
  return runModeFromFeedback(settings?.exam_feedback ?? "end");
}

/**
 * Aplica el modo a una especificación de examen:
 * aprendizaje → sin límite (`timed: false` o `duration_minutes: 0`) y corrección inmediata;
 * examen real → cronómetro oficial (`timed: true`; en `simulacro`, la duración indicada o la del
 * esquema) y corrección al entregar.
 */
export function withRunMode(spec: ExamSpec, mode: ExamRunMode): ExamSpec {
  const timed = mode === "real";
  const feedback = RUN_MODE_FEEDBACK[mode];
  switch (spec.type) {
    case "official":
    case "numbered":
    case "random":
    case "case":
      return { ...spec, timed, feedback };
    case "simulacro":
      return {
        ...spec,
        duration_minutes: timed ? (spec.duration_minutes === 0 ? null : spec.duration_minutes) : 0,
        feedback,
      };
    default:
      return { ...spec, feedback };
  }
}

/** Cómo se está haciendo un examen ya generado. */
export interface PaperModeInfo {
  timed: boolean;
  immediate: boolean;
  /** Examen completo en modo aprendizaje (sin límite y corrección inmediata). */
  learning: boolean;
  /** Examen completo como el real (cronómetro y corrección al entregar). */
  real: boolean;
}

export function paperMode(paper: Pick<ExamPaper, "duration_minutes" | "feedback">): PaperModeInfo {
  const timed = Boolean(paper.duration_minutes && paper.duration_minutes > 0);
  const immediate = paper.feedback === "immediate";
  return { timed, immediate, learning: !timed && immediate, real: timed && !immediate };
}

// ───────────────────────────── Preferencia local (supuestos) ─────────────────────────────

/** Lee un modo guardado en este navegador/equipo (puede no haber almacenamiento). */
export function readStoredRunMode(key: string, fallback: ExamRunMode): ExamRunMode {
  try {
    const value = window.localStorage.getItem(key);
    return value === "learning" || value === "real" ? value : fallback;
  } catch {
    return fallback;
  }
}

export function storeRunMode(key: string, mode: ExamRunMode): void {
  try {
    window.localStorage.setItem(key, mode);
  } catch {
    // Sin almacenamiento (modo privado, permisos): solo se pierde el recuerdo de la elección.
  }
}
