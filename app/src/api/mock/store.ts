// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Persistencia del backend simulado: un único documento JSON en `localStorage`
 * (con try/catch: si el almacenamiento no está disponible, se usa memoria).
 * Es el ÚNICO lugar de la interfaz que usa `localStorage`.
 */
import type {
  AnswerState,
  BlockId,
  ExamMode,
  ExamSpec,
  FeedbackMode,
  Letter,
  Profile,
  ScoringScheme,
  SectionKind,
  Settings,
} from "../types";

export const STORAGE_KEY = "opotai.demo.v1";

export interface SkeletonQuestion {
  id: string;
  display_number: string;
  is_reserve: boolean;
}

export interface SkeletonSection {
  id: string;
  part: number;
  kind: SectionKind;
  title: string;
  block: BlockId | null;
  /** Sección del banco de la que salen enunciado e imágenes (supuestos). */
  source: { bank_id: string; section_id: string } | null;
  questions: SkeletonQuestion[];
}

/** Estructura del examen (solo ids, como `paper_json` en el núcleo). */
export interface PaperSkeleton {
  title: string;
  subtitle: string | null;
  scheme: ScoringScheme;
  duration_minutes: number | null;
  feedback: FeedbackMode;
  requires_case_choice: boolean;
  cases_to_choose: number;
  use_reserves: boolean;
  with_prediction: boolean;
  total_questions: number;
  /** Procede del sorteo del simulacro sorpresa. */
  drawn: boolean;
  /** Clave del examen en la bolsa del sorteo («official:<bank>» o «numbered:<n>»). */
  pool_key: string | null;
  sections: SkeletonSection[];
}

export interface PartTally {
  part: number;
  kind: SectionKind;
  correct: number;
  wrong: number;
  blank: number;
}

export interface AttemptSummaryData {
  total_grade: number;
  max_grade: number;
  passed: boolean;
  correct: number;
  wrong: number;
  blank: number;
  p_plaza: number | null;
  parts: PartTally[];
}

export interface StoredAttempt {
  id: string;
  profile_id: string;
  mode: ExamMode;
  spec: ExamSpec;
  skeleton: PaperSkeleton;
  status: "in_progress" | "finished" | "abandoned";
  started_at: string;
  finished_at: string | null;
  elapsed_seconds: number;
  answers: AnswerState[];
  chosen_case: string | null;
  /** Respuestas ya comprobadas en modo inmediato (bloqueadas). */
  checked: Record<string, Letter | null>;
  summary: AttemptSummaryData | null;
}

export interface QuestionStat {
  seen: number;
  correct: number;
  wrong: number;
  blank: number;
  last_answered_at: string | null;
  last_result: "correct" | "wrong" | "blank" | null;
  /** 0 = fuera del repaso; 1–4 = en seguimiento; 5 = dominada. */
  srs_box: number;
  srs_due_at: string | null;
  flagged: boolean;
}

export interface MockDb {
  version: 1;
  profiles: Profile[];
  settings: Record<string, Settings>;
  attempts: StoredAttempt[];
  stats: Record<string, Record<string, QuestionStat>>;
  /** Último sorteo pendiente por perfil (clave de la bolsa), para marcar `drawn`. */
  draws: Record<string, string>;
}

function emptyDb(): MockDb {
  return { version: 1, profiles: [], settings: {}, attempts: [], stats: {}, draws: {} };
}

let memory: MockDb | null = null;

function storage(): Storage | null {
  try {
    return typeof window !== "undefined" && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function loadDb(): MockDb {
  if (memory) return memory;
  let db = emptyDb();
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<MockDb>;
      if (parsed && parsed.version === 1) {
        db = {
          version: 1,
          profiles: parsed.profiles ?? [],
          settings: parsed.settings ?? {},
          attempts: parsed.attempts ?? [],
          stats: parsed.stats ?? {},
          draws: parsed.draws ?? {},
        };
      }
    }
  } catch {
    db = emptyDb();
  }
  memory = db;
  return db;
}

export function saveDb(db: MockDb): void {
  memory = db;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Sin almacenamiento persistente (modo privado, cuota…): se mantiene en memoria.
  }
}

export function clearDb(): void {
  memory = emptyDb();
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // ignorado
  }
}

/** Solo para tests: olvida la copia en memoria. */
export function resetMemory(): void {
  memory = null;
}

export function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch {
    // ignorado
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
