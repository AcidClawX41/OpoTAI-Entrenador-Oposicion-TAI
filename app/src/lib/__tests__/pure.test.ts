// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import type { ScoringScheme, Temario } from "@/api/types";
import { defaultParts, partQuestions, toManualInput, updatePart, validateParts } from "@/lib/calculator";
import { activityLevel, buildCalendar, heatColor, heatIntensity } from "@/lib/heat";
import { blockState, parseSelectionParams, selectionLabel, selectionToFilters, toggleBlock } from "@/lib/practiceSelection";
import { formatPercentile, formatGrade, formatInt } from "@/lib/format";
import { caseShortTitle, bankShortLabel } from "@/lib/labels";
import { markdownUrlTransform } from "@/components/ui/Markdown";

const scheme: ScoringScheme = {
  id: "tai-li-2025",
  title: "TAI libre 2025",
  access: "libre",
  convocatoria: "li-2025",
  duration_minutes: 120,
  parts: [
    { part: 1, title: "Cuestionario", kind: "theory", questions: 80, reserve: 5, value: 1, penalty_divisor: 3, cases_offered: null, cases_to_choose: null },
    { part: 2, title: "Supuesto", kind: "case", questions: 20, reserve: 5, value: 1, penalty_divisor: 3, cases_offered: 2, cases_to_choose: 1 },
  ],
  grading: {
    units: [
      { parts: [1], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: null, cutoff_note: null },
      { parts: [2], max_grade: 50, pass_grade: 25, min_direct_ratio: 0.3, cutoff_direct: null, cutoff_note: null },
    ],
  },
  notes: null,
};

const temario: Temario = {
  convocatoria: "li-2025",
  source_title: "BOE",
  source_url: "https://www.boe.es",
  blocks: [
    { id: "I", title: "Organización", topics: [1, 2, 3].map((n) => ({ id: `I.${n}`, block: "I" as const, number: n, title: `Tema I.${n}`, keywords: [] })) },
    { id: "II", title: "Tecnología básica", topics: [1, 2].map((n) => ({ id: `II.${n}`, block: "II" as const, number: n, title: `Tema II.${n}`, keywords: [] })) },
  ],
};

describe("calculadora", () => {
  it("parte de valores válidos y rellena los blancos solos", () => {
    const parts = defaultParts(scheme);
    expect(partQuestions(scheme.parts[1]!)).toBe(20);
    expect(validateParts(scheme, parts).every((v) => v.error === null)).toBe(true);
    const next = updatePart(scheme, parts, 1, { correct: 70, wrong: 5 });
    expect(next[0]!.blank).toBe(5);
  });

  it("marca el error si la suma supera las preguntas", () => {
    const parts = updatePart(scheme, defaultParts(scheme), 2, { blank: 19 });
    const v = validateParts(scheme, parts).find((x) => x.part === 2)!;
    expect(v.error).toMatch(/supera las 20/);
    expect(toManualInput(scheme, parts, 0.5).cutoff_override_ratio).toBe(0.5);
  });
});

describe("selección de temas", () => {
  it("un bloque completo viaja como bloque y uno parcial como temas", () => {
    let sel = toggleBlock(temario.blocks[0]!, new Set(), true);
    sel.add("II.2");
    expect(blockState(temario.blocks[0]!, sel)).toBe(true);
    expect(blockState(temario.blocks[1]!, sel)).toBe("mixed");
    expect(selectionToFilters(temario, sel)).toEqual({ blocks: ["I"], topics: ["II.2"] });
    sel = toggleBlock(temario.blocks[1]!, sel, true);
    expect(selectionToFilters(temario, sel)).toEqual({ blocks: [], topics: [] });
    expect(selectionLabel(temario, new Set())).toBe("Todo el temario");
  });

  it("lee ?temas= y ?bloque= de la URL", () => {
    const sel = parseSelectionParams(temario, new URLSearchParams("temas=i.2,X.9&bloque=II"));
    expect([...sel].sort()).toEqual(["I.2", "II.1", "II.2"]);
  });
});

describe("escalas de color y calendario", () => {
  it("la escala divergente es neutra en el 50 %", () => {
    expect(heatIntensity(0.5)).toBe(0);
    expect(heatIntensity(0)).toBe(1);
    expect(heatColor(0.1)).toContain("#e11d48");
    expect(heatColor(0.9)).toContain("#0284c7");
  });

  it("construye 120 días en semanas de lunes a domingo", () => {
    const today = new Date(2026, 9, 11);
    const grid = buildCalendar([{ date: "2026-10-11", answered: 40 }, { date: "2026-10-01", answered: 10 }], 120, today);
    expect(grid.total).toBe(50);
    expect(grid.activeDays).toBe(2);
    expect(grid.weeks.every((w) => w.length === 7)).toBe(true);
    expect(grid.weeks.flat().filter((c) => c.inRange)).toHaveLength(120);
    expect(activityLevel(40, 40)).toBe(4);
    expect(activityLevel(0, 40)).toBe(0);
  });
});

describe("formato y etiquetas", () => {
  it("nunca muestra un percentil del 100 %", () => {
    expect(formatPercentile(0.9997)).toMatch(/99,9/);
    expect(formatGrade(62.456)).toBe("62,46");
    expect(formatInt(1030)).toBe("1.030");
  });

  it("acorta títulos de supuestos y bancos", () => {
    expect(caseShortTitle("Segunda parte · Supuesto I")).toBe("Supuesto I");
    expect(bankShortLabel({ id: "tai-li-2025-ext", kind: "official", access: "libre", year: 2025, title: "x" })).toBe("TAI-LI 2025 · extraordinario");
  });
});

describe("Markdown seguro", () => {
  it("admite data:image en imágenes y bloquea javascript:", () => {
    expect(markdownUrlTransform("data:image/png;base64,AAAA", "src", undefined as never)).toBe("data:image/png;base64,AAAA");
    expect(markdownUrlTransform("javascript:alert(1)", "href", undefined as never)).toBe("");
    expect(markdownUrlTransform("data:text/html;base64,AAAA", "src", undefined as never)).toBe("");
  });
});
