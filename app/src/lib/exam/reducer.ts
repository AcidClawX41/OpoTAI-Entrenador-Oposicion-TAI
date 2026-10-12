// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Reducer puro del examen: respuestas (clic de nuevo = en blanco), dudosas,
 * elección de supuesto, navegación y tiempo. No corrige: la corrección es del núcleo.
 */
import type { AnswerFeedback, ExamPaper, Letter, ProgressPayload } from "@/api/types";
import type { Answer, ExamState, TabKey } from "./model";
import { caseSections, defaultViewedCase, locate, navList, sectionOfQuestion, showsOneCase, tabsOf } from "./navigation";

export type ExamAction =
  | { type: "answer"; questionId: string; choice: Letter }
  | { type: "clear"; questionId: string }
  | { type: "flag"; questionId: string }
  | { type: "goto"; index: number }
  | { type: "gotoQuestion"; questionId: string }
  | { type: "next" }
  | { type: "prev" }
  | { type: "setTab"; tab: TabKey }
  | { type: "viewCase"; sectionId: string }
  | { type: "chooseCase"; sectionId: string | null }
  | { type: "tick"; seconds: number }
  | { type: "feedback"; feedback: AnswerFeedback };

export function initExamState(paper: ExamPaper, progress?: ProgressPayload | null): ExamState {
  const answers: Record<string, Answer> = {};
  const locked: Record<string, true> = {};
  for (const a of progress?.answers ?? []) {
    answers[a.question_id] = { choice: a.choice, flagged: a.flagged };
    // En modo inmediato, lo ya respondido quedó registrado en el núcleo y no se puede cambiar.
    if (paper.feedback === "immediate" && a.choice !== null) locked[a.question_id] = true;
  }
  const chosen = progress?.chosen_case ?? null;
  const tabs = tabsOf(paper);
  return {
    attemptId: paper.attempt_id,
    answers,
    chosenCase: chosen,
    tab: tabs[0] ?? "theory",
    viewedCase: defaultViewedCase(paper, chosen),
    cursor: { theory: 0, case: 0 },
    elapsed: Math.max(0, progress?.elapsed_seconds ?? 0),
    feedback: {},
    locked,
    revision: 0,
  };
}

function withAnswer(state: ExamState, questionId: string, patch: Partial<Answer>): ExamState {
  const prev = state.answers[questionId] ?? { choice: null, flagged: false };
  return { ...state, answers: { ...state.answers, [questionId]: { ...prev, ...patch } }, revision: state.revision + 1 };
}

/** Responder en un supuesto a elegir sin supuesto elegido lo selecciona. */
function autoChooseCase(paper: ExamPaper, state: ExamState, questionId: string): ExamState {
  if (!paper.requires_case_choice || state.chosenCase) return state;
  const section = sectionOfQuestion(paper, questionId);
  if (section?.kind !== "case" || caseSections(paper).length < 2) return state;
  return { ...state, chosenCase: section.id };
}

function clampCursor(paper: ExamPaper, state: ExamState, tab: TabKey, index: number): ExamState {
  const list = navList(paper, tab, state.viewedCase);
  const max = Math.max(0, list.length - 1);
  return { ...state, cursor: { ...state.cursor, [tab]: Math.min(max, Math.max(0, index)) } };
}

export function examReducer(paper: ExamPaper, state: ExamState, action: ExamAction): ExamState {
  switch (action.type) {
    case "answer": {
      if (state.locked[action.questionId]) return state;
      const prev = state.answers[action.questionId]?.choice ?? null;
      const next = prev === action.choice ? null : action.choice;
      const updated = withAnswer(state, action.questionId, { choice: next });
      return next === null ? updated : autoChooseCase(paper, updated, action.questionId);
    }
    case "clear": {
      if (state.locked[action.questionId]) return state;
      if ((state.answers[action.questionId]?.choice ?? null) === null) return state;
      return withAnswer(state, action.questionId, { choice: null });
    }
    case "flag": {
      const prev = state.answers[action.questionId]?.flagged ?? false;
      return withAnswer(state, action.questionId, { flagged: !prev });
    }
    case "goto":
      return clampCursor(paper, state, state.tab, action.index);
    case "gotoQuestion": {
      const where = locate(paper, action.questionId);
      if (!where) return state;
      const viewedCase = where.viewedCase ?? state.viewedCase;
      return { ...state, tab: where.tab, viewedCase, cursor: { ...state.cursor, [where.tab]: where.index } };
    }
    case "next":
      return clampCursor(paper, state, state.tab, state.cursor[state.tab] + 1);
    case "prev":
      return clampCursor(paper, state, state.tab, state.cursor[state.tab] - 1);
    case "setTab": {
      if (!tabsOf(paper).includes(action.tab)) return state;
      const viewedCase = action.tab === "case" ? (state.viewedCase ?? defaultViewedCase(paper, state.chosenCase)) : state.viewedCase;
      return { ...state, tab: action.tab, viewedCase };
    }
    case "viewCase": {
      if (!caseSections(paper).some((s) => s.id === action.sectionId)) return state;
      if (state.viewedCase === action.sectionId && state.tab === "case") return state;
      return { ...state, tab: "case", viewedCase: action.sectionId, cursor: { ...state.cursor, case: 0 } };
    }
    case "chooseCase": {
      if (action.sectionId !== null && !caseSections(paper).some((s) => s.id === action.sectionId)) return state;
      const next: ExamState = { ...state, chosenCase: action.sectionId, revision: state.revision + 1 };
      if (action.sectionId && showsOneCase(paper) && state.viewedCase !== action.sectionId)
        return { ...next, viewedCase: action.sectionId, cursor: { ...next.cursor, case: 0 } };
      return next;
    }
    case "tick":
      return action.seconds > 0 ? { ...state, elapsed: state.elapsed + action.seconds } : state;
    case "feedback": {
      const fb = action.feedback;
      const prev = state.answers[fb.question_id] ?? { choice: null, flagged: false };
      const next: ExamState = {
        ...state,
        answers: { ...state.answers, [fb.question_id]: { ...prev, choice: fb.chosen } },
        feedback: { ...state.feedback, [fb.question_id]: fb },
        locked: { ...state.locked, [fb.question_id]: true },
        revision: state.revision + 1,
      };
      return fb.chosen ? autoChooseCase(paper, next, fb.question_id) : next;
    }
    default:
      return state;
  }
}

/** Progreso para `save_progress` / `submit_exam`. */
export function toProgress(state: ExamState): ProgressPayload {
  return {
    attempt_id: state.attemptId,
    answers: Object.entries(state.answers)
      .filter(([, a]) => a.choice !== null || a.flagged)
      .map(([question_id, a]) => ({ question_id, choice: a.choice, flagged: a.flagged })),
    chosen_case: state.chosenCase,
    elapsed_seconds: Math.floor(state.elapsed),
  };
}
