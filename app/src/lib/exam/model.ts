// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Modelo de estado del examen en la interfaz (presentación pura, sin corrección). */
import type { AnswerFeedback, Letter, PaperQuestion, PaperSection } from "@/api/types";

/** Pestañas del examen: 1.ª parte (cuestionario) y 2.ª parte (supuestos). */
export type TabKey = "theory" | "case";

export interface Answer {
  choice: Letter | null;
  flagged: boolean;
}

export interface NavEntry {
  question: PaperQuestion;
  section: PaperSection;
  tab: TabKey;
  /** Posición dentro de la lista navegable de su pestaña. */
  index: number;
}

export interface ExamState {
  attemptId: string;
  answers: Record<string, Answer>;
  chosenCase: string | null;
  tab: TabKey;
  /** Supuesto que se está viendo en la 2.ª parte. */
  viewedCase: string | null;
  cursor: Record<TabKey, number>;
  /** Segundos transcurridos (con decimales). */
  elapsed: number;
  feedback: Record<string, AnswerFeedback>;
  /** Respuestas ya comprobadas en modo inmediato (no se pueden cambiar). */
  locked: Record<string, true>;
  /** Se incrementa con cada cambio que hay que guardar (respuestas, dudosas, supuesto). */
  revision: number;
}

export const LETTERS: Letter[] = ["A", "B", "C", "D"];
