// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Estado del formulario de la calculadora (puro y testeable): valores por defecto,
 * blancos automáticos y validación «aciertos + fallos + blancos ≤ preguntas».
 * La nota la calcula siempre el núcleo (`calculate_grade`).
 */
import type { ManualGradeInput, ManualPartInput, ScoringPart, ScoringScheme } from "@/api/types";

export interface CalcPart extends ManualPartInput {
  /** El usuario ha escrito los blancos a mano (si no, se rellenan solos). */
  blankTouched: boolean;
}

/** Preguntas que puntúan en una parte (en la de supuesto, las de los supuestos que se eligen). */
export function partQuestions(part: ScoringPart): number {
  return part.questions * (part.kind === "case" ? (part.cases_to_choose ?? 1) : 1);
}

/** Valores de partida razonables (≈ 65 % de aciertos y 18 % de fallos). */
export function defaultParts(scheme: ScoringScheme): CalcPart[] {
  return scheme.parts.map((p) => {
    const n = partQuestions(p);
    const correct = Math.round(n * 0.65);
    const wrong = Math.min(n - correct, Math.round(n * 0.18));
    return { part: p.part, correct, wrong, blank: n - correct - wrong, blankTouched: false };
  });
}

/** Aplica un cambio en una parte y recalcula los blancos si no se han tocado. */
export function updatePart(scheme: ScoringScheme, parts: CalcPart[], partNo: number, patch: Partial<Pick<CalcPart, "correct" | "wrong" | "blank">>): CalcPart[] {
  return parts.map((p) => {
    if (p.part !== partNo) return p;
    const def = scheme.parts.find((d) => d.part === partNo);
    const n = def ? partQuestions(def) : Infinity;
    const next: CalcPart = { ...p, ...patch, blankTouched: p.blankTouched || patch.blank !== undefined };
    if (!next.blankTouched && Number.isFinite(n)) next.blank = Math.max(0, n - next.correct - next.wrong);
    return next;
  });
}

export interface PartValidation {
  part: number;
  total: number;
  questions: number;
  error: string | null;
  /** Preguntas sin asignar (cuentan como en blanco). */
  unassigned: number;
}

export function validateParts(scheme: ScoringScheme, parts: CalcPart[]): PartValidation[] {
  return scheme.parts.map((def) => {
    const p = parts.find((x) => x.part === def.part) ?? { correct: 0, wrong: 0, blank: 0 };
    const n = partQuestions(def);
    const total = p.correct + p.wrong + p.blank;
    let error: string | null = null;
    if ([p.correct, p.wrong, p.blank].some((v) => !Number.isFinite(v) || v < 0 || !Number.isInteger(v))) error = "Usa números enteros positivos.";
    else if (total > n) error = `La suma (${total}) supera las ${n} preguntas de esta parte.`;
    return { part: def.part, total, questions: n, error, unassigned: error ? 0 : n - total };
  });
}

export function toManualInput(scheme: ScoringScheme, parts: CalcPart[], cutoffOverride: number | null): ManualGradeInput {
  return {
    scheme_id: scheme.id,
    parts: scheme.parts.map((def) => {
      const p = parts.find((x) => x.part === def.part);
      return { part: def.part, correct: p?.correct ?? 0, wrong: p?.wrong ?? 0, blank: p?.blank ?? 0 };
    }),
    cutoff_override_ratio: cutoffOverride,
  };
}
