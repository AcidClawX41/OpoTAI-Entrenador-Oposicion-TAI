// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Estado del examen en curso (envoltorio zustand del reducer puro) y caché de resultados. */
import { create } from "zustand";
import type { AttemptResult, ExamPaper, ProgressPayload } from "@/api/types";
import type { ExamState } from "@/lib/exam/model";
import { examReducer, initExamState, type ExamAction } from "@/lib/exam/reducer";

interface ExamStore {
  paper: ExamPaper | null;
  state: ExamState | null;
  lastSavedAt: number | null;
  saveError: string | null;
  results: Record<string, AttemptResult>;
  load: (paper: ExamPaper, progress?: ProgressPayload | null) => void;
  dispatch: (action: ExamAction) => void;
  reset: () => void;
  markSaved: (at: number) => void;
  markSaveError: (message: string | null) => void;
  cacheResult: (result: AttemptResult) => void;
}

export const useExam = create<ExamStore>((set, get) => ({
  paper: null,
  state: null,
  lastSavedAt: null,
  saveError: null,
  results: {},
  load: (paper, progress) => set({ paper, state: initExamState(paper, progress), lastSavedAt: null, saveError: null }),
  dispatch: (action) => {
    const { paper, state } = get();
    if (!paper || !state) return;
    const next = examReducer(paper, state, action);
    if (next !== state) set({ state: next });
  },
  reset: () => set({ paper: null, state: null, lastSavedAt: null, saveError: null }),
  markSaved: (at) => set({ lastSavedAt: at, saveError: null }),
  markSaveError: (message) => set({ saveError: message }),
  cacheResult: (result) => set({ results: { ...get().results, [result.attempt_id]: result } }),
}));
