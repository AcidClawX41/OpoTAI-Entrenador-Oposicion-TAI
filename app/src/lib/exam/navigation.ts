// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Navegación por el examen: pestañas, supuestos y lista de preguntas. Funciones puras. */
import type { ExamPaper, PaperSection } from "@/api/types";
import { ordinalFem } from "@/lib/format";
import type { ExamState, NavEntry, TabKey } from "./model";

export function theorySections(paper: ExamPaper): PaperSection[] {
  return paper.sections.filter((s) => s.kind === "theory" && s.questions.length > 0);
}

export function caseSections(paper: ExamPaper): PaperSection[] {
  return paper.sections.filter((s) => s.kind === "case" && s.questions.length > 0);
}

export function tabsOf(paper: ExamPaper): TabKey[] {
  const tabs: TabKey[] = [];
  if (theorySections(paper).length) tabs.push("theory");
  if (caseSections(paper).length) tabs.push("case");
  return tabs;
}

/** Con supuestos a elegir, la 2.ª parte muestra un supuesto cada vez. */
export function showsOneCase(paper: ExamPaper): boolean {
  return paper.requires_case_choice && caseSections(paper).length > 1;
}

export function defaultViewedCase(paper: ExamPaper, chosen: string | null): string | null {
  return chosen ?? caseSections(paper)[0]?.id ?? null;
}

export function navList(paper: ExamPaper, tab: TabKey, viewedCase: string | null): NavEntry[] {
  let sections: PaperSection[];
  if (tab === "theory") sections = theorySections(paper);
  else if (showsOneCase(paper)) {
    const id = viewedCase ?? defaultViewedCase(paper, null);
    sections = caseSections(paper).filter((s) => s.id === id);
  } else sections = caseSections(paper);
  const out: NavEntry[] = [];
  for (const section of sections)
    for (const question of section.questions) out.push({ question, section, tab, index: out.length });
  return out;
}

export function currentList(paper: ExamPaper, state: ExamState): NavEntry[] {
  return navList(paper, state.tab, state.viewedCase);
}

export function currentEntry(paper: ExamPaper, state: ExamState): NavEntry | undefined {
  const list = currentList(paper, state);
  return list[Math.min(state.cursor[state.tab], Math.max(0, list.length - 1))];
}

export function sectionOfQuestion(paper: ExamPaper, questionId: string): PaperSection | undefined {
  return paper.sections.find((s) => s.questions.some((q) => q.id === questionId));
}

/** Dónde está una pregunta: pestaña, supuesto visible e índice. */
export function locate(paper: ExamPaper, questionId: string): { tab: TabKey; viewedCase: string | null; index: number } | null {
  const section = sectionOfQuestion(paper, questionId);
  if (!section) return null;
  const tab: TabKey = section.kind === "case" ? "case" : "theory";
  const viewedCase = tab === "case" && showsOneCase(paper) ? section.id : null;
  const list = navList(paper, tab, viewedCase ?? defaultViewedCase(paper, null));
  const index = list.findIndex((e) => e.question.id === questionId);
  return index < 0 ? null : { tab, viewedCase, index };
}

/** «1.ª parte · Cuestionario» / «2.ª parte · Supuesto práctico». */
export function tabLabel(paper: ExamPaper, tab: TabKey): string {
  const section = tab === "theory" ? theorySections(paper)[0] : caseSections(paper)[0];
  const part = section?.part ?? (tab === "theory" ? 1 : 2);
  return `${ordinalFem(part)} parte · ${tab === "theory" ? "Cuestionario" : "Supuesto práctico"}`;
}

/** Número que se muestra para una pregunta («12», «R1»). */
export function questionLabel(entry: NavEntry): string {
  return entry.question.display_number;
}
