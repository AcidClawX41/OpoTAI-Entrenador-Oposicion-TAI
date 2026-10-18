// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import { SCHEME_2024, SCHEME_2025 } from "./demoMeta";
import { derivedScheme, directScore, gradeUnits, scoreExam, transformGrade, type GradableSection } from "./scoring";
import type { Letter, PartScore } from "../types";

function part(p: number, value: number, correct: number, wrong: number, blank: number): PartScore {
  const counted = correct + wrong + blank;
  return {
    part: p,
    title: `Parte ${p}`,
    counted,
    correct,
    wrong,
    blank,
    annulled: 0,
    value,
    penalty_divisor: 3,
    penalty_points: (value * wrong) / 3,
    direct: directScore({ value, penalty_divisor: 3 }, correct, wrong),
    max_direct: value * counted,
  };
}

describe("corrección oficial (mock)", () => {
  it("aplica A − E/3 y 4A − 4E/3", () => {
    expect(directScore({ value: 1, penalty_divisor: 3 }, 60, 12)).toBeCloseTo(56);
    expect(directScore({ value: 4, penalty_divisor: 3 }, 15, 3)).toBeCloseTo(56);
    expect(directScore({ value: 1, penalty_divisor: null }, 10, 5)).toBe(10);
  });

  it("transforma linealmente con el corte 48/160 → 50", () => {
    expect(transformGrade(48, 48, 160, 50, 100)).toBeCloseTo(50);
    expect(transformGrade(160, 48, 160, 50, 100)).toBeCloseTo(100);
    expect(transformGrade(104, 48, 160, 50, 100)).toBeCloseTo(75);
    expect(transformGrade(24, 48, 160, 50, 100)).toBeCloseTo(25);
    expect(transformGrade(-3, 48, 160, 50, 100)).toBe(0);
  });

  it("califica la unidad conjunta del esquema de 2024", () => {
    const parts = [part(1, 1, 60, 12, 8), part(2, 4, 15, 3, 2)];
    const g = gradeUnits(SCHEME_2024, parts, null);
    expect(g.units).toHaveLength(1);
    const u = g.units[0]!;
    expect(u.direct).toBeCloseTo(112);
    expect(u.max_direct).toBe(160);
    expect(u.cutoff_direct).toBeCloseTo(48);
    expect(u.cutoff_source).toBe("official");
    expect(u.grade).toBeCloseTo(50 + (50 * (112 - 48)) / 112, 3);
    expect(g.passed).toBe(true);
  });

  it("escala el corte oficial a la N del examen y respeta el corte del usuario", () => {
    const parts = [part(1, 1, 20, 4, 6)]; // N = 30
    const official = gradeUnits(SCHEME_2024, parts, null).units[0]!;
    expect(official.cutoff_direct).toBeCloseTo(48 * (30 / 160));
    const user = gradeUnits(SCHEME_2024, parts, 0.6).units[0]!;
    expect(user.cutoff_source).toBe("user");
    expect(user.cutoff_direct).toBeCloseTo(18);
    const floor = gradeUnits(SCHEME_2024, parts, 0.1).units[0]!;
    expect(floor.cutoff_source).toBe("floor");
    expect(floor.cutoff_direct).toBeCloseTo(9);
  });

  it("califica por partes cuando el esquema tiene varias unidades", () => {
    const g = gradeUnits(SCHEME_2025, [part(1, 1, 40, 10, 10), part(2, 1, 2, 6, 2)], null);
    expect(g.units).toHaveLength(2);
    expect(g.units[0]!.passed).toBe(true);
    expect(g.units[1]!.passed).toBe(false);
    expect(g.passed).toBe(false);
    expect(g.max).toBe(100);
  });

  const item = (id: string, answer: Letter, chosen: Letter | null, extra: Partial<{ annulled: boolean; is_reserve: boolean }> = {}) => ({
    question_id: id,
    answer,
    chosen,
    annulled: extra.annulled ?? false,
    is_reserve: extra.is_reserve ?? false,
  });

  it("sustituye anuladas por reservas y solo corrige el supuesto elegido", () => {
    const sections: GradableSection[] = [
      {
        id: "p1",
        part: 1,
        kind: "theory",
        title: "Cuestionario",
        items: [
          item("q1", "A", "A"),
          item("q2", "B", "C"),
          item("q3", "C", null),
          item("q4", "D", "D", { annulled: true }),
          item("r1", "A", "A", { is_reserve: true }),
          item("r2", "B", "B", { is_reserve: true }),
        ],
      },
      { id: "s1", part: 2, kind: "case", title: "Supuesto 1", items: [item("c1", "A", "A"), item("c2", "B", "B")] },
      { id: "s2", part: 2, kind: "case", title: "Supuesto 2", items: [item("d1", "A", null), item("d2", "B", null)] },
    ];
    const out = scoreExam({
      scheme: SCHEME_2024,
      sections,
      chosen_case: null,
      requires_case_choice: true,
      use_reserves: true,
      cutoff_override_ratio: null,
    });
    expect(out.effective_case).toBe("s1");
    expect(out.statuses.q4).toBe("annulled");
    expect(out.statuses.r1).toBe("correct");
    expect(out.statuses.r2).toBe("not_counted");
    expect(out.statuses.d1).toBe("not_counted");
    const p1 = out.grade.parts.find((p) => p.part === 1)!;
    expect(p1).toMatchObject({ correct: 2, wrong: 1, blank: 1, annulled: 1, counted: 4 });
    const p2 = out.grade.parts.find((p) => p.part === 2)!;
    expect(p2).toMatchObject({ correct: 2, wrong: 0, blank: 0, counted: 2 });
    expect(out.grade.notes.join(" ")).toMatch(/reserva/);
    expect(out.grade.notes.join(" ")).toMatch(/No elegiste supuesto/);
  });

  it("cuenta en blanco la 2.ª parte si se responde a varios supuestos sin elegir", () => {
    const sections: GradableSection[] = [
      { id: "s1", part: 2, kind: "case", title: "Supuesto 1", items: [item("c1", "A", "A"), item("c2", "B", "B")] },
      { id: "s2", part: 2, kind: "case", title: "Supuesto 2", items: [item("d1", "A", "A"), item("d2", "B", null)] },
    ];
    const out = scoreExam({
      scheme: SCHEME_2024,
      sections,
      chosen_case: null,
      requires_case_choice: true,
      use_reserves: false,
      cutoff_override_ratio: null,
    });
    expect(out.effective_case).toBeNull();
    // Como el núcleo: tantas en blanco como preguntas puntúa la 2.ª parte del esquema.
    const casePart = SCHEME_2024.parts.find((p) => p.kind === "case")!;
    expect(out.grade.parts[0]).toMatchObject({ part: 2, correct: 0, wrong: 0, blank: casePart.questions });
  });

  it("no corrige la 2.ª parte si no se supera la 1.ª (partes eliminatorias, como el núcleo)", () => {
    // 1.ª parte: 10 − 30/3 = 0 directos (< 30 %); 2.ª parte perfecta.
    const g = gradeUnits(SCHEME_2025, [part(1, 1, 10, 30, 40), part(2, 1, 20, 0, 0)], null);
    expect(g.units).toHaveLength(2);
    expect(g.units[0]!.passed).toBe(false);
    expect(g.units[1]!.grade).toBe(0);
    expect(g.units[1]!.passed).toBe(false);
    // «Sin corregir», con la nota que habría sacado (orientativa, no suma).
    expect(g.units[0]!.ungraded).toBe(false);
    expect(g.units[1]!.ungraded).toBe(true);
    expect(g.units[1]!.would_be_grade).toBe(50);
    expect(g.total).toBe(0);
    expect(g.notes.join(" ")).toMatch(/no se corrige/);
  });

  it("supera el corte cuando la directa lo iguala salvo error de redondeo", () => {
    // 95/3 directos frente a un corte reescalado que el coma flotante deja un pelo por encima.
    expect(transformGrade(95 / 3, 95 / 3 + 1e-9, 100, 25, 50)).toBeCloseTo(25, 6);
    const g = gradeUnits(
      { ...SCHEME_2025, grading: { units: [{ ...SCHEME_2025.grading.units[0]!, cutoff_direct: 95 / 3 }] } },
      [part(1, 1, 35, 10, 35)],
      null,
    );
    // 80 preguntas: el corte se reescala a 95/3 · 80/80 y se supera con 25.
    expect(g.units[0]!.passed).toBe(true);
    expect(g.units[0]!.grade).toBeCloseTo(25, 6);
  });

  it("deriva una unidad 0–10 con corte al 50 % para la práctica", () => {
    const scheme = derivedScheme(SCHEME_2024, ["theory"], "practica", "Práctica", { theory: 10 });
    const g = gradeUnits(scheme, [part(1, 1, 7, 3, 0)], null);
    expect(g.max).toBe(10);
    // (7 − 1) / 10 → 6 sobre 10
    expect(g.total).toBeCloseTo(6);
  });
});
