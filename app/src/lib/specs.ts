// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Ayudas para construir especificaciones de examen (sin lógica de negocio). */
import type { BlockId, ExamSpec, FeedbackMode, QuestionSource } from "@/api/types";

/** Aplica el modo de corrección a las specs que lo admiten. */
export function withFeedback(spec: ExamSpec, feedback: FeedbackMode): ExamSpec {
  switch (spec.type) {
    case "official":
    case "simulacro":
    case "numbered":
    case "random":
    case "practice":
    case "review":
    case "case":
      return { ...spec, feedback };
    default:
      return spec;
  }
}

export function practiceSpec(opts: {
  topics?: string[];
  blocks?: BlockId[];
  bankIds?: string[];
  count: number;
  feedback: FeedbackMode;
  source?: QuestionSource;
  includeCases?: boolean;
  durationMinutes?: number | null;
}): ExamSpec {
  return {
    type: "practice",
    blocks: opts.blocks ?? [],
    topics: opts.topics ?? [],
    bank_ids: opts.bankIds ?? [],
    include_cases: opts.includeCases ?? false,
    source: opts.source ?? "all",
    count: opts.count,
    feedback: opts.feedback,
    duration_minutes: opts.durationMinutes ?? null,
    seed: null,
  };
}
