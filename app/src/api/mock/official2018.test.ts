// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Réplica de 2018 en el motor simulado con los datos reales del repositorio: como el núcleo,
 * une el 1.er ejercicio (100 preguntas) y el 2.º (supuesto de 30, publicado en otro banco).
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { MockEngine } from "./engine";
import { Registry } from "./registry";
import { clearDb, resetMemory } from "./store";
import type { BankFile } from "./bankTypes";
import type { DevData } from "./devData";
import type { AnswerState, ScoringScheme } from "../types";

const DATA = resolve(__dirname, "../../../../data");
const json = <T>(path: string): T => JSON.parse(readFileSync(resolve(DATA, path), "utf8")) as T;

function engine(): MockEngine {
  const scoring = json<{ schemes: ScoringScheme[] }>("meta/scoring.json");
  const dev = {
    banks: [json<BankFile>("banks/oficiales/tai-li-2018.json"), json<BankFile>("banks/oficiales/tai-li-2018-ej2.json")],
    temario: null,
    schemes: scoring.schemes.filter((s) => s.id === "tai-li-2018"),
    default_scheme: null,
    convocatorias: [],
    target_convocatoria: null,
    updated: null,
    grades: {},
    destinations: {},
    assignments: {},
    tiers: [],
    localities: [],
    theory: [],
    license: null,
  } as DevData;
  return new MockEngine(new Registry(dev));
}

describe("réplica de 2018 (dos ejercicios en dos bancos)", () => {
  beforeEach(() => {
    clearDb();
    resetMemory();
  });

  it("une los dos ejercicios y califica cada uno con su corte", () => {
    const e = engine();
    const summary = e.registry.bankSummary(e.registry.bank("tai-li-2018")!);
    expect(summary.companion_bank_id).toBe("tai-li-2018-ej2");
    expect(summary.complete_exam).toBe(true);

    const p = e.createProfile("Ana", "#7c3aed", null);
    const paper = e.startExam(p.id, { type: "official", bank_id: "tai-li-2018", include_reserve: true, timed: true, feedback: "end" });
    expect(paper.sections.map((s) => s.part)).toEqual([1, 2, 2]);
    expect(paper.duration_minutes).toBe(160);
    const firstCase = paper.sections.find((s) => s.kind === "case")!;
    // Al 70 %: 70 A / 30 E en el cuestionario (60 directos) y 21 A / 9 E en el supuesto (18).
    const answers: AnswerState[] = paper.sections.flatMap((s) =>
      s.questions
        .filter((q) => !q.is_reserve)
        .map((q, i) => {
          const correct = e.registry.get(q.id)!.question.answer!;
          const wrong = correct === "A" ? "B" : "A";
          return { question_id: q.id, choice: i % 10 < 7 ? correct : wrong, flagged: false };
        }),
    );
    const result = e.submitExam({ attempt_id: paper.attempt_id, answers, chosen_case: firstCase.id, elapsed_seconds: 60 });
    const [u1, u2] = result.grade.units;
    expect(u1).toMatchObject({ parts: [1], max_direct: 100, passed: true });
    expect(u2).toMatchObject({ parts: [2], max_direct: 30, passed: true });
    expect(u1!.cutoff_direct).toBeCloseTo(97 / 3, 3);
    expect(u2!.cutoff_direct).toBeCloseTo(35 / 3, 3);
    // Mismas notas que el núcleo: 35,22 + 33,63 = 68,86.
    expect(result.grade.total_grade).toBeCloseTo(68.86, 2);
    expect(result.grade.max_grade).toBe(100);
  });
});
