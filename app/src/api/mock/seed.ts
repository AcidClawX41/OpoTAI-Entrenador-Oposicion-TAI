// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Datos de ejemplo del modo demo: perfiles con historial simulado (simulacros,
 * prácticas y repasos fechados en las últimas semanas) para enseñar Inicio,
 * Estadísticas y Repaso con contenido realista. Solo se usa en el navegador.
 */
import type { AnswerState, ExamPaper, ExamSpec, Letter } from "../types";
import type { MockEngine } from "./engine";
import { setClock } from "./engine";
import { mulberry32, type Rng } from "./rng";
import { clearDb } from "./store";

const LETTERS: Letter[] = ["A", "B", "C", "D"];

interface Skill {
  base: number;
  answerRate: number;
  block: Record<string, number>;
  topic: Record<string, number>;
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, x));
}

function simulate(engine: MockEngine, paper: ExamPaper, skill: Skill, rng: Rng): { answers: AnswerState[]; chosen: string | null } {
  const answers: AnswerState[] = [];
  const cases = paper.sections.filter((s) => s.kind === "case");
  const chosen = paper.requires_case_choice && cases.length ? (cases[Math.floor(rng() * cases.length)]?.id ?? null) : null;
  for (const section of paper.sections) {
    if (section.kind === "case" && paper.requires_case_choice && section.id !== chosen) continue;
    for (const q of section.questions) {
      if (q.is_reserve && rng() < 0.7) continue;
      const entry = engine.registry.get(q.id);
      const answer = entry?.question.answer ?? "A";
      const flagged = rng() < 0.06;
      if (rng() > skill.answerRate) {
        answers.push({ question_id: q.id, choice: null, flagged });
        continue;
      }
      const p = clamp(
        skill.base + (skill.block[q.block ?? ""] ?? 0) + (skill.topic[q.topic ?? ""] ?? 0) + (rng() - 0.5) * 0.12,
        0.05,
        0.97,
      );
      let choice: Letter = answer;
      if (rng() > p) {
        const wrong = LETTERS.filter((l) => l !== answer);
        choice = wrong[Math.floor(rng() * wrong.length)] ?? "A";
      }
      answers.push({ question_id: q.id, choice, flagged });
    }
  }
  return { answers, chosen };
}

interface Plan {
  daysAgo: number;
  hour: number;
  minutes: number;
  spec: ExamSpec;
  skill: number;
  answerRate?: number;
}

function runPlan(engine: MockEngine, profileId: string, plans: Plan[], skillShape: Omit<Skill, "base" | "answerRate">, seed: number, setNow: (d: Date) => void) {
  const rng = mulberry32(seed);
  const today = new Date();
  for (const plan of plans) {
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - plan.daysAgo, plan.hour, Math.floor(rng() * 50));
    setNow(start);
    let paper: ExamPaper;
    try {
      paper = engine.startExam(profileId, plan.spec);
    } catch {
      continue;
    }
    const { answers, chosen } = simulate(
      engine,
      paper,
      { ...skillShape, base: plan.skill, answerRate: plan.answerRate ?? 0.86 },
      rng,
    );
    const elapsed = Math.round(plan.minutes * 60 * (0.85 + rng() * 0.15));
    setNow(new Date(start.getTime() + elapsed * 1000));
    engine.submitExam({ attempt_id: paper.attempt_id, answers, chosen_case: chosen, elapsed_seconds: elapsed });
  }
}

const sim = (seed: number, full = true): ExamSpec => ({
  type: "simulacro",
  scheme_id: null,
  part1_questions: full ? null : 30,
  include_case: full,
  duration_minutes: full ? null : 45,
  prefer_unseen: true,
  seed,
  feedback: "end",
});

const practice = (topics: string[], count: number, seed: number): ExamSpec => ({
  type: "practice",
  blocks: [],
  topics,
  bank_ids: [],
  include_cases: false,
  source: "all",
  count,
  feedback: "immediate",
  duration_minutes: null,
  seed,
});

/** Borra los datos del modo demo y crea perfiles de ejemplo. Devuelve el id del perfil principal. */
export function seedDemo(engine: MockEngine): string {
  clearDb();
  engine.reload();
  let current = new Date();
  setClock(() => current);
  const setNow = (d: Date) => {
    current = d;
  };
  try {
    const today = new Date();
    setNow(new Date(today.getTime() - 60 * 86_400_000));
    const marc = engine.createProfile("Marc", "#0891b2", "🦉");
    const laura = engine.createProfile("Laura", "#db2777", null);
    const alex = engine.createProfile("Alex", "#7c3aed", "🚀");

    const examDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 47);
    const pad = (n: number) => String(n).padStart(2, "0");
    const settings = engine.getSettings(alex.id);
    engine.updateSettings(alex.id, {
      ...settings,
      preferred_localities: ["Valencia", "Toledo", "Madrid"],
      exam_date: `${examDate.getFullYear()}-${pad(examDate.getMonth() + 1)}-${pad(examDate.getDate())}`,
    });

    const alexShape = {
      block: { I: -0.13, II: 0.04, III: 0.02, IV: 0.07 },
      topic: { "I.7": -0.12, "I.8": -0.08, "II.1": -0.06, "IV.7": 0.05 },
    };
    // Examen oficial para el historial: el real más reciente de acceso libre o el de muestra.
    const officialBank =
      engine.registry.banks
        .filter((b) => b.kind === "official" && b.access === "libre" && b.sections.some((s) => s.kind === "case"))
        .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.id.localeCompare(b.id))[0]?.id ?? "demo-muestra";
    const official = (): ExamSpec => ({ type: "official", bank_id: officialBank, include_reserve: true, timed: true, feedback: "end" });
    runPlan(
      engine,
      alex.id,
      [
        { daysAgo: 52, hour: 18, minutes: 110, spec: sim(11), skill: 0.5, answerRate: 0.74 },
        { daysAgo: 47, hour: 10, minutes: 14, spec: practice(["I.8", "I.7"], 12, 3), skill: 0.55 },
        { daysAgo: 44, hour: 19, minutes: 45, spec: sim(12, false), skill: 0.55, answerRate: 0.78 },
        { daysAgo: 39, hour: 17, minutes: 112, spec: sim(13), skill: 0.57, answerRate: 0.8 },
        { daysAgo: 35, hour: 11, minutes: 12, spec: practice(["IV.7", "IV.10"], 10, 4), skill: 0.66 },
        { daysAgo: 31, hour: 18, minutes: 70, spec: official(), skill: 0.6, answerRate: 0.82 },
        { daysAgo: 27, hour: 20, minutes: 44, spec: sim(14, false), skill: 0.63 },
        { daysAgo: 23, hour: 18, minutes: 115, spec: sim(15), skill: 0.64, answerRate: 0.84 },
        { daysAgo: 19, hour: 10, minutes: 15, spec: practice(["I.1", "I.2", "I.3"], 12, 5), skill: 0.66 },
        { daysAgo: 16, hour: 19, minutes: 108, spec: sim(16), skill: 0.67, answerRate: 0.86 },
        { daysAgo: 12, hour: 18, minutes: 42, spec: sim(17, false), skill: 0.7 },
        { daysAgo: 9, hour: 17, minutes: 113, spec: sim(18), skill: 0.7, answerRate: 0.87 },
        { daysAgo: 6, hour: 9, minutes: 10, spec: practice(["III.3", "III.1"], 10, 6), skill: 0.72 },
        { daysAgo: 5, hour: 19, minutes: 16, spec: { type: "case", bank_id: "demo-muestra", section_id: "p2-s2", feedback: "immediate", timed: false }, skill: 0.74 },
        { daysAgo: 4, hour: 18, minutes: 109, spec: sim(19), skill: 0.73, answerRate: 0.88 },
        { daysAgo: 3, hour: 20, minutes: 12, spec: practice(["I.7", "I.9", "I.8"], 12, 7), skill: 0.66 },
        { daysAgo: 2, hour: 18, minutes: 72, spec: official(), skill: 0.76, answerRate: 0.9 },
        { daysAgo: 1, hour: 21, minutes: 11, spec: { type: "review", count: 15, feedback: "immediate" }, skill: 0.72 },
        { daysAgo: 0, hour: 8, minutes: 13, spec: practice(["II.1", "II.3", "II.4"], 12, 8), skill: 0.75 },
      ],
      alexShape,
      2026,
      setNow,
    );

    runPlan(
      engine,
      laura.id,
      [
        { daysAgo: 18, hour: 18, minutes: 112, spec: sim(31), skill: 0.6 },
        { daysAgo: 11, hour: 19, minutes: 44, spec: sim(32, false), skill: 0.63 },
        { daysAgo: 6, hour: 18, minutes: 110, spec: sim(33), skill: 0.66 },
      ],
      { block: { I: 0.05, II: -0.05, III: -0.04, IV: 0.0 }, topic: {} },
      77,
      setNow,
    );

    setNow(new Date(today.getTime() - 3 * 86_400_000));
    engine.touchProfile(laura.id);
    setNow(new Date(today.getTime() - 9 * 86_400_000));
    engine.touchProfile(marc.id);
    setNow(new Date());
    engine.touchProfile(alex.id);
    return alex.id;
  } finally {
    setClock(null);
  }
}
