// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import type { ExamSpec } from "@/api/types";
import { paperMode, runModeFromFeedback, runModeFromSettings, withRunMode } from "@/lib/examMode";
import { remainingSeconds, timerTone } from "@/lib/time";

describe("modo aprendizaje / examen real", () => {
  it("se recuerda con el ajuste exam_feedback", () => {
    expect(runModeFromFeedback("immediate")).toBe("learning");
    expect(runModeFromFeedback("end")).toBe("real");
    expect(runModeFromSettings(null)).toBe("real");
    expect(runModeFromSettings({ exam_feedback: "immediate" })).toBe("learning");
  });

  it("aprendizaje: sin límite y corrección inmediata en todos los lanzadores", () => {
    const official: ExamSpec = { type: "official", bank_id: "tai-li-2024", include_reserve: true, timed: true, feedback: "end", theory_block: null };
    expect(withRunMode(official, "learning")).toEqual({ ...official, timed: false, feedback: "immediate" });
    expect(withRunMode({ type: "numbered", number: 3, feedback: "end" }, "learning")).toEqual({
      type: "numbered",
      number: 3,
      feedback: "immediate",
      timed: false,
    });
    expect(withRunMode({ type: "random", feedback: "end" }, "learning")).toEqual({ type: "random", feedback: "immediate", timed: false });
    expect(withRunMode({ type: "case", bank_id: "b", section_id: "s", feedback: "end", timed: true }, "learning")).toMatchObject({
      timed: false,
      feedback: "immediate",
    });
    const sim: ExamSpec = {
      type: "simulacro",
      scheme_id: null,
      part1_questions: null,
      include_case: true,
      duration_minutes: null,
      prefer_unseen: true,
      seed: null,
      feedback: "end",
    };
    expect(withRunMode(sim, "learning")).toMatchObject({ duration_minutes: 0, feedback: "immediate" });
  });

  it("examen real: cronómetro oficial y corrección al entregar", () => {
    expect(withRunMode({ type: "numbered", number: 7, feedback: "immediate", timed: false }, "real")).toEqual({
      type: "numbered",
      number: 7,
      feedback: "end",
      timed: true,
    });
    const quick: ExamSpec = {
      type: "simulacro",
      scheme_id: "tai-li-2025",
      part1_questions: 30,
      include_case: false,
      duration_minutes: 45,
      prefer_unseen: true,
      seed: null,
      feedback: "immediate",
    };
    expect(withRunMode(quick, "real")).toMatchObject({ duration_minutes: 45, feedback: "end" });
    expect(withRunMode({ ...quick, duration_minutes: 0 }, "real")).toMatchObject({ duration_minutes: null });
    // Los tests de práctica solo cambian la corrección.
    const practice: ExamSpec = {
      type: "practice",
      blocks: [],
      topics: [],
      bank_ids: [],
      include_cases: false,
      source: "all",
      count: 10,
      feedback: "immediate",
      duration_minutes: null,
      seed: null,
    };
    expect(withRunMode(practice, "real")).toEqual({ ...practice, feedback: "end" });
  });

  it("el cronómetro avisa a 10 minutos y a 1 minuto del final", () => {
    expect(timerTone(null)).toBe("normal");
    expect(timerTone(10 * 60 + 1)).toBe("normal");
    expect(timerTone(10 * 60)).toBe("warning");
    expect(timerTone(61)).toBe("warning");
    expect(timerTone(60)).toBe("danger");
    expect(remainingSeconds(120, 119 * 60)).toBe(60);
    expect(remainingSeconds(null, 500)).toBeNull();
  });

  it("describe el modo de un examen ya generado", () => {
    expect(paperMode({ duration_minutes: null, feedback: "immediate" })).toMatchObject({ learning: true, real: false, timed: false });
    expect(paperMode({ duration_minutes: 120, feedback: "end" })).toMatchObject({ learning: false, real: true, timed: true });
    expect(paperMode({ duration_minutes: 0, feedback: "end" })).toMatchObject({ timed: false, real: false });
  });
});
