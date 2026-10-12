// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { BankSummary, GradeResult, ScoringScheme, SectionSummary } from "@/api/types";
import { bankStructure, officialExamMinutes, officialExamSections, structureFromScheme } from "@/lib/exam/structure";
import { ExamStructure, passRule } from "@/components/exam/ExamStructure";
import { PartsTable } from "@/components/results/PartsTable";

afterEach(cleanup);

const perPart: ScoringScheme = {
  id: "tai-li-2025",
  title: "TAI ingreso libre · convocatoria 2025",
  access: "libre",
  convocatoria: "li-2025",
  duration_minutes: 120,
  parts: [
    { part: 1, title: "Primera parte · Cuestionario", kind: "theory", questions: 80, reserve: 5, value: 1, penalty_divisor: 3, cases_offered: null, cases_to_choose: null },
    { part: 2, title: "Segunda parte · Supuesto práctico", kind: "case", questions: 20, reserve: 5, value: 1, penalty_divisor: 3, cases_offered: 2, cases_to_choose: 1 },
  ],
  grading: {
    units: [
      { parts: [1], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: 24, cutoff_note: null },
      { parts: [2], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: 6, cutoff_note: null },
    ],
  },
  notes: null,
};

const joint: ScoringScheme = {
  ...perPart,
  id: "tai-li-2024",
  parts: [perPart.parts[0]!, { ...perPart.parts[1]!, value: 4 }],
  grading: { units: [{ parts: [1, 2], max_grade: 100, pass_grade: 50, min_direct_ratio: 0.3, cutoff_direct: 48, cutoff_note: null }] },
};

function section(id: string, kind: "theory" | "case", questions: number, reserve: number): SectionSummary {
  return { id, part: kind === "case" ? 2 : 1, kind, title: id, block: kind === "case" ? "III" : null, question_count: questions, reserve_count: reserve, statement: null };
}

function bank(over: Partial<BankSummary>): BankSummary {
  return {
    id: "b",
    kind: "official",
    title: "TAI",
    description: null,
    access: "libre",
    year: 2018,
    convocatoria: "li-2018",
    exam_date: null,
    duration_minutes: 90,
    scoring_scheme: "tai-li-2025",
    question_count: 0,
    reserve_count: 0,
    annulled_count: 0,
    explained_count: 0,
    case_count: 0,
    sections: [],
    source_urls: [],
    answer_key: "definitiva",
    companion_bank_id: null,
    complete_exam: true,
    ...over,
  };
}

describe("estructura del examen en dos partes", () => {
  it("por partes: cada una con su escala y su mínimo; nota final = suma", () => {
    const info = structureFromScheme(perPart);
    expect(info.grading).toBe("per_part");
    expect(info.parts.map((p) => [p.name, p.questions, p.reserve, p.maxGrade, p.passGrade])).toEqual([
      ["Cuestionario", 80, 5, 50, 25],
      ["Supuesto práctico", 20, 5, 50, 25],
    ]);
    expect(info.totalMax).toBe(100);
    expect(passRule(info)).toMatch(/superar las dos partes \(25 de 50 en cada una\).*suma: de 0 a 100/);
  });

  it("conjunta: una sola nota de 0 a 100 con su corte en directa", () => {
    const info = structureFromScheme(joint);
    expect(info.grading).toBe("joint");
    expect(info.parts.every((p) => p.maxGrade === null)).toBe(true);
    expect(info.totalPass).toBe(50);
    expect(passRule(info)).toMatch(/se califican juntas.*aprueba con 50 \(corte: 48 puntos directos\)/);
  });

  it("simulacro rápido sin supuesto: una sola parte con su escala", () => {
    const info = structureFromScheme(perPart, { questions1: 30, includeCase: false, durationMinutes: 40 });
    expect(info.grading).toBe("single");
    expect(info.parts).toHaveLength(1);
    expect(info.totalMax).toBe(50);
    expect(info.durationMinutes).toBe(40);
  });

  it("examen completo repartido en dos bancos (1.er ejercicio + 2.º publicado aparte)", () => {
    const main = bank({ id: "tai-li-2018", sections: [section("p1", "theory", 100, 3)], companion_bank_id: "tai-li-2018-ej2", duration_minutes: 90 });
    const ej2 = bank({
      id: "tai-li-2018-ej2",
      sections: [section("p2-s1", "case", 30, 3), section("p2-s2", "case", 30, 3)],
      companion_bank_id: "tai-li-2018",
      complete_exam: false,
      duration_minutes: 70,
      answer_key: "propia",
    });
    const banks = [main, ej2];
    expect(officialExamSections(banks, main).map((s) => s.id)).toEqual(["p1", "p2-s1", "p2-s2"]);
    expect(officialExamSections(banks, ej2).map((s) => s.id)).toEqual(["p2-s1", "p2-s2"]);
    expect(officialExamMinutes(banks, main)).toBe(160);
    const catalog = { banks, schemes: [perPart], default_scheme: perPart.id };
    const full = bankStructure(catalog, main)!;
    expect(full.parts.map((p) => [p.kind, p.questions, p.reserve, p.casesOffered])).toEqual([
      ["theory", 100, 3, null],
      ["case", 30, 3, 2],
    ]);
    expect(full.durationMinutes).toBe(160);
    const alone = bankStructure(catalog, ej2)!;
    expect(alone.parts.map((p) => p.kind)).toEqual(["case"]);
  });

  it("se muestra antes de empezar con las dos partes, la duración y la regla de aprobado", () => {
    render(<ExamStructure info={structureFromScheme(perPart)} />);
    const region = screen.getByRole("region", { name: /estructura del examen/i });
    expect(within(region).getByText(/dos partes, un solo examen/i)).toBeInTheDocument();
    expect(within(region).getByText("Cuestionario", { exact: false })).toBeInTheDocument();
    expect(within(region).getByText(/Eliges 1 de 2 supuestos/)).toBeInTheDocument();
    expect(within(region).getAllByText(/Nota de 0 a 50 · mínimo 25/)).toHaveLength(2);
    expect(within(region).getByText(/120 min para las dos partes/)).toBeInTheDocument();
    expect(within(region).getByText(/Hay que superar las dos partes/)).toBeInTheDocument();
  });
});

describe("puntuación de cada parte en los resultados", () => {
  const grade: GradeResult = {
    scheme_id: "tai-li-2025",
    parts: [
      { part: 1, title: "Primera parte", counted: 80, correct: 55, wrong: 22, blank: 3, annulled: 0, value: 1, penalty_divisor: 3, penalty_points: 7.33, direct: 47.67, max_direct: 80 },
      { part: 2, title: "Segunda parte", counted: 20, correct: 4, wrong: 9, blank: 7, annulled: 0, value: 1, penalty_divisor: 3, penalty_points: 3, direct: 1, max_direct: 20 },
    ],
    units: [
      { parts: [1], direct: 47.67, max_direct: 80, cutoff_direct: 24, cutoff_source: "floor", grade: 35.57, pass_grade: 25, max_grade: 50, passed: true, margin_direct: 23.67 },
      { parts: [2], direct: 1, max_direct: 20, cutoff_direct: 6, cutoff_source: "floor", grade: 4.17, pass_grade: 25, max_grade: 50, passed: false, margin_direct: -5 },
    ],
    total_grade: 39.74,
    max_grade: 100,
    passed: false,
    notes: [],
  };

  it("muestra aciertos, errores, blancos, directa, nota en su escala, mínimo y si se supera, y la nota final", () => {
    render(<PartsTable grade={grade} scheme={perPart} />);
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    const part1 = rows.find((r) => /1\.ª parte · Cuestionario/.test(r.textContent ?? ""))!;
    const part2 = rows.find((r) => /2\.ª parte · Supuesto práctico/.test(r.textContent ?? ""))!;
    expect(part1).toHaveTextContent("55");
    expect(part1).toHaveTextContent("47,67 / 80");
    expect(part1).toHaveTextContent("35,57 / 50");
    expect(part1).toHaveTextContent("Superada");
    expect(part2).toHaveTextContent("4,17 / 50");
    expect(part2).toHaveTextContent("No superada");
    const total = rows.find((r) => /Examen completo/.test(r.textContent ?? ""))!;
    expect(total).toHaveTextContent("39,74 / 100");
    expect(total).toHaveTextContent("NO APTO");
  });
});
