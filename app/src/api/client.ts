// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Cliente tipado de la API interna de OpoTAI.
 *
 * - En la app de escritorio (existe `window.__TAURI_INTERNALS__`) usa `invoke`
 *   de Tauri 2 con argumentos en snake_case, tal y como define
 *   `docs/CONTRATO-API.md`.
 * - En el navegador carga de forma perezosa un backend simulado (`./mock`) que
 *   implementa todos los comandos con datos de ejemplo («modo demo»).
 *
 * Todos los rechazos se normalizan a `OpoApiError` (cumple `ApiError`).
 */
import type {
  ActiveAttempt,
  AnswerFeedback,
  AppInfo,
  AttemptResult,
  AttemptSummary,
  CalculatorResult,
  CatalogInfo,
  DestinationSimulation,
  ExamPaper,
  ExamSpec,
  Letter,
  LocalityInfo,
  ManualGradeInput,
  Profile,
  ProfileStats,
  ProgressPayload,
  RandomDraw,
  ReviewSummary,
  Settings,
  TheorySummary,
  TheoryTopic,
} from "./types";
import { toApiError } from "./errors";
import { isTauri } from "@/lib/platform";

export type BackendKind = "tauri" | "mock";
export type Invoker = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

export function detectBackend(): BackendKind {
  return isTauri() ? "tauri" : "mock";
}

let invokerPromise: Promise<Invoker> | null = null;

function loadInvoker(): Promise<Invoker> {
  if (!invokerPromise) {
    invokerPromise =
      detectBackend() === "tauri"
        ? import("@tauri-apps/api/core").then((m) => (cmd, args) => m.invoke(cmd, args))
        : import("./mock").then((m) => m.createMockInvoker());
  }
  return invokerPromise;
}

/** Permite inyectar un backend (tests). */
export function setInvoker(invoker: Invoker | null): void {
  invokerPromise = invoker ? Promise.resolve(invoker) : null;
}

async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const invoke = await loadInvoker();
  try {
    return (await invoke(command, args)) as T;
  } catch (error) {
    throw toApiError(error, command);
  }
}

export const api = {
  // Información y catálogo
  getAppInfo: () => call<AppInfo>("get_app_info"),
  getCatalog: () => call<CatalogInfo>("get_catalog"),
  listLocalities: () => call<LocalityInfo[]>("list_localities"),

  // Perfiles y ajustes
  listProfiles: () => call<Profile[]>("list_profiles"),
  createProfile: (name: string, color: string, avatar: string | null) =>
    call<Profile>("create_profile", { name, color, avatar }),
  updateProfile: (profile_id: string, name: string, color: string, avatar: string | null) =>
    call<Profile>("update_profile", { profile_id, name, color, avatar }),
  deleteProfile: (profile_id: string) => call<null>("delete_profile", { profile_id }),
  touchProfile: (profile_id: string) => call<Profile>("touch_profile", { profile_id }),
  getSettings: (profile_id: string) => call<Settings>("get_settings", { profile_id }),
  updateSettings: (profile_id: string, settings: Settings) =>
    call<Settings>("update_settings", { profile_id, settings }),

  // Exámenes
  startExam: (profile_id: string, spec: ExamSpec) => call<ExamPaper>("start_exam", { profile_id, spec }),
  getActiveAttempt: (profile_id: string) => call<ActiveAttempt | null>("get_active_attempt", { profile_id }),
  saveProgress: (progress: ProgressPayload) => call<null>("save_progress", { progress }),
  /** `choice = null` revela la solución contando la pregunta en blanco (modo inmediato). */
  checkAnswer: (attempt_id: string, question_id: string, choice: Letter | null) =>
    call<AnswerFeedback>("check_answer", { attempt_id, question_id, choice }),
  submitExam: (progress: ProgressPayload) => call<AttemptResult>("submit_exam", { progress }),
  abandonExam: (attempt_id: string) => call<null>("abandon_exam", { attempt_id }),

  // Historial y estadísticas
  listAttempts: (profile_id: string, limit: number | null = null) =>
    call<AttemptSummary[]>("list_attempts", { profile_id, limit }),
  getAttemptResult: (attempt_id: string) => call<AttemptResult>("get_attempt_result", { attempt_id }),
  deleteAttempt: (attempt_id: string) => call<null>("delete_attempt", { attempt_id }),
  getStats: (profile_id: string) => call<ProfileStats>("get_stats", { profile_id }),
  getReviewSummary: (profile_id: string) => call<ReviewSummary>("get_review_summary", { profile_id }),

  // Calculadora
  calculateGrade: (profile_id: string | null, input: ManualGradeInput) =>
    call<CalculatorResult>("calculate_grade", { profile_id, input }),

  // Simulador de destinos: a partir de un intento entregado o de la entrada de la calculadora
  simulateDestinations: (
    profile_id: string | null,
    source: { attempt_id: string } | { input: ManualGradeInput },
  ) =>
    call<DestinationSimulation>("simulate_destinations", {
      profile_id,
      attempt_id: "attempt_id" in source ? source.attempt_id : null,
      input: "input" in source ? source.input : null,
    }),

  // Simulacro sorpresa (lo sortea el núcleo; la interfaz no elige)
  drawRandomExam: (profile_id: string) => call<RandomDraw>("draw_random_exam", { profile_id }),

  // Licencia (texto íntegro del fichero LICENSE)
  getLicenseText: () => call<string>("get_license_text"),

  // Teoría
  getTheoryIndex: () => call<TheorySummary[]>("get_theory_index"),
  getTheory: (topic_id: string) => call<TheoryTopic>("get_theory", { topic_id }),
};

export type Api = typeof api;

/** Herramientas exclusivas del modo demo (navegador). */
export const demo = {
  available: () => detectBackend() === "mock",
  /** Crea perfiles de ejemplo con historial simulado y devuelve el id del principal. */
  seed: async (): Promise<string> => {
    const m = await import("./mock");
    return m.seedDemoData();
  },
  reset: async (): Promise<void> => {
    const m = await import("./mock");
    m.resetDemoData();
  },
};
