// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { beforeEach, describe, expect, it } from "vitest";
import { MockEngine } from "./engine";
import { Registry } from "./registry";
import { clearDb, resetMemory } from "./store";
import { seedDemo } from "./seed";
import type { AnswerState } from "../types";

function engine(): MockEngine {
  return new MockEngine(new Registry(null));
}

describe("backend simulado", () => {
  beforeEach(() => {
    clearDb();
    resetMemory();
  });

  it("gestiona perfiles con nombres únicos y ajustes por defecto", () => {
    const e = engine();
    const p = e.createProfile("Ana", "#7c3aed", "🎯");
    expect(() => e.createProfile("ana", "#7c3aed", null)).toThrow(/Ya existe/);
    const s = e.getSettings(p.id);
    expect(s).toMatchObject({ exam_feedback: "end", default_feedback: "immediate", sound_volume: 0.6, random_exam_on_startup: true });
    expect(() => e.updateSettings(p.id, { ...s, preferred_localities: ["a", "b", "c", "d"] })).toThrow();
  });

  it("genera un simulacro sin soluciones, lo corrige y predice", () => {
    const e = engine();
    const p = e.createProfile("Ana", "#7c3aed", null);
    const paper = e.startExam(p.id, {
      type: "simulacro",
      scheme_id: null,
      part1_questions: null,
      include_case: true,
      duration_minutes: null,
      prefer_unseen: true,
      seed: 7,
      feedback: "end",
    });
    expect(paper.requires_case_choice).toBe(true);
    expect(paper.sections.filter((s) => s.kind === "case")).toHaveLength(2);
    expect(JSON.stringify(paper)).not.toMatch(/"answer"|"explanation"/);
    expect(paper.drawn).toBe(false);

    const answers: AnswerState[] = paper.sections[0]!.questions.slice(0, 10).map((q) => ({
      question_id: q.id,
      choice: "A",
      flagged: false,
    }));
    const result = e.submitExam({ attempt_id: paper.attempt_id, answers, chosen_case: null, elapsed_seconds: 600 });
    expect(result.grade.max_grade).toBe(100);
    expect(result.prediction).not.toBeNull();
    expect(result.prediction!.p_plaza).toBeGreaterThanOrEqual(0);
    expect(result.prediction!.p_plaza).toBeLessThanOrEqual(1);
    expect(result.prediction!.tiers).toHaveLength(3);
    expect(e.listAttempts(p.id, null)[0]?.status).toBe("finished");
    expect(e.getStats(p.id).simulacros_finished).toBe(1);
  });

  it("el sorteo lo decide el núcleo y marca el examen como sorpresa", () => {
    const e = engine();
    const p = e.createProfile("Ana", "#7c3aed", null);
    const draw = e.drawRandomExam(p.id);
    expect(["official", "numbered"]).toContain(draw.kind);
    expect(draw.pool_size).toBe(3);
    const paper = e.startExam(p.id, draw.spec);
    expect(paper.drawn).toBe(true);
    const again = e.startExam(p.id, { type: "random", feedback: "immediate" });
    expect(again.drawn).toBe(true);
    expect(again.feedback).toBe("immediate");
  });

  it("los simulacros numerados tienen composición fija", () => {
    const e = engine();
    const p = e.createProfile("Ana", "#7c3aed", null);
    const a = e.startExam(p.id, { type: "numbered", number: 3, feedback: "end" });
    const b = e.startExam(p.id, { type: "numbered", number: 3, feedback: "end" });
    const ids = (x: typeof a) => x.sections.flatMap((s) => s.questions.map((q) => q.id));
    expect(ids(a)).toEqual(ids(b));
    expect(a.title).toBe("Simulacro OpoTAI n.º 3");
  });

  it("modo aprendizaje sin límite de tiempo y modo examen real con el cronómetro oficial", () => {
    const e = engine();
    const p = e.createProfile("Ana", "#7c3aed", null);
    const real = e.startExam(p.id, { type: "numbered", number: 2, feedback: "end", timed: true });
    expect(real.duration_minutes).toBeGreaterThan(0);
    const learning = e.startExam(p.id, { type: "numbered", number: 2, feedback: "immediate", timed: false });
    expect(learning.duration_minutes).toBeNull();
    const ids = (x: typeof real) => x.sections.flatMap((s) => s.questions.map((q) => q.id));
    expect(ids(learning)).toEqual(ids(real));
    const surprise = e.startExam(p.id, { type: "random", feedback: "immediate", timed: false });
    expect(surprise.drawn).toBe(true);
    expect(surprise.duration_minutes).toBeNull();
  });

  it("en modo inmediato bloquea la respuesta comprobada", () => {
    const e = engine();
    const p = e.createProfile("Ana", "#7c3aed", null);
    const paper = e.startExam(p.id, {
      type: "practice",
      blocks: ["IV"],
      topics: [],
      bank_ids: [],
      include_cases: false,
      source: "all",
      count: 5,
      feedback: "immediate",
      duration_minutes: null,
      seed: 1,
    });
    const q = paper.sections[0]!.questions[0]!;
    const fb = e.checkAnswer(paper.attempt_id, q.id, "B");
    expect(fb.correct).toMatch(/[ABCD]/);
    const again = e.checkAnswer(paper.attempt_id, q.id, "C");
    expect(again.chosen).toBe("B");
  });

  it("ofrece teoría de ejemplo", () => {
    const e = engine();
    const index = e.getTheoryIndex();
    expect(index.length).toBeGreaterThanOrEqual(2);
    const topic = e.getTheory(index[0]!.topic);
    expect(topic.content.length).toBeGreaterThan(100);
    expect(() => e.getTheory("IV.99")).toThrow();
  });

  it("crea un historial de ejemplo coherente", () => {
    const e = engine();
    const id = seedDemo(e);
    const stats = e.getStats(id);
    expect(stats.attempts_finished).toBeGreaterThan(10);
    expect(stats.readiness).not.toBeNull();
    expect(stats.grade_history.length).toBe(stats.attempts_finished);
    expect(e.listProfiles()[0]?.id).toBe(id);
  });
});
