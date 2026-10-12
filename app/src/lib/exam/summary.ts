// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Resumen del examen para la cabecera y el diálogo de entrega. Funciones puras. */
import type { ExamPaper, PaperSection } from "@/api/types";
import type { ExamState, TabKey } from "./model";
import { caseSections, showsOneCase, theorySections } from "./navigation";

export interface FlaggedItem {
  questionId: string;
  label: string;
  tab: TabKey;
}

export interface ExamSummary {
  /** Preguntas puntuables (como `paper.total_questions`). */
  total: number;
  answered: number;
  blank: number;
  flagged: FlaggedItem[];
  reservesAnswered: number;
  chosenCase: PaperSection | null;
  /** Respuestas en supuestos no elegidos (no puntúan). */
  answeredInOtherCases: number;
  /** Hay que elegir supuesto y aún no hay ninguno elegido. */
  caseChoicePending: boolean;
  perTab: Record<TabKey, { answered: number; total: number }>;
}

function answeredIn(state: ExamState, sections: PaperSection[], reserves: boolean): number {
  let n = 0;
  for (const s of sections)
    for (const q of s.questions) if (q.is_reserve === reserves && (state.answers[q.id]?.choice ?? null) !== null) n++;
  return n;
}

function countIn(sections: PaperSection[]): number {
  return sections.reduce((n, s) => n + s.questions.filter((q) => !q.is_reserve).length, 0);
}

export function summarize(paper: ExamPaper, state: ExamState): ExamSummary {
  const theory = theorySections(paper);
  const cases = caseSections(paper);
  const oneCase = showsOneCase(paper);
  const chosen = cases.find((s) => s.id === state.chosenCase) ?? null;
  const countedCases = oneCase ? (chosen ? [chosen] : []) : cases;

  const theoryAnswered = answeredIn(state, theory, false);
  const caseAnswered = answeredIn(state, countedCases, false);
  const caseTotal = oneCase ? countIn([chosen ?? cases[0]].filter((s): s is PaperSection => Boolean(s))) : countIn(cases);
  const answered = theoryAnswered + caseAnswered;
  const total = paper.total_questions || countIn(theory) + caseTotal;

  const flagged: FlaggedItem[] = [];
  for (const s of paper.sections)
    for (const q of s.questions)
      if (state.answers[q.id]?.flagged)
        flagged.push({
          questionId: q.id,
          label: s.kind === "case" && oneCase ? `${q.display_number} (${s.title.split("·").at(-1)?.trim() || "supuesto"})` : q.display_number,
          tab: s.kind === "case" ? "case" : "theory",
        });

  const others = oneCase ? cases.filter((s) => s.id !== chosen?.id) : [];
  return {
    total,
    answered,
    blank: Math.max(0, total - answered),
    flagged,
    reservesAnswered: answeredIn(state, paper.sections, true),
    chosenCase: chosen,
    answeredInOtherCases: chosen ? answeredIn(state, others, false) : 0,
    caseChoicePending: oneCase && !chosen,
    perTab: {
      theory: { answered: theoryAnswered, total: countIn(theory) },
      case: { answered: caseAnswered, total: caseTotal },
    },
  };
}
