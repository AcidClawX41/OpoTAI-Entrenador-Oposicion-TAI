// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Etiquetas en castellano para valores del contrato y títulos cortos de temas. */
import type {
  Access,
  BankSummary,
  BlockId,
  CatalogInfo,
  ExamMode,
  FeedbackMode,
  Prediction,
  Temario,
  UnitGrade,
} from "@/api/types";
import { ordinalFem } from "./format";
import { truncate } from "./text";

export const MODE_LABEL: Record<ExamMode, string> = {
  official: "Examen oficial",
  simulacro: "Simulacro",
  practice: "Práctica",
  review: "Repaso",
  case: "Supuesto práctico",
};

export const ACCESS_LABEL: Record<Access, string> = {
  libre: "Ingreso libre",
  promocion_interna: "Promoción interna",
};

export const FEEDBACK_LABEL: Record<FeedbackMode, string> = {
  end: "Al final, como el examen real",
  immediate: "Inmediata · modo estudio",
};

export const ANSWER_KEY_LABEL: Record<BankSummary["answer_key"], string> = {
  definitiva: "Plantilla definitiva",
  provisional: "Plantilla provisional",
  propia: "Respuestas propuestas (sin plantilla oficial)",
};

export const CUTOFF_SOURCE_LABEL: Record<UnitGrade["cutoff_source"], string> = {
  official: "corte oficial",
  estimated: "corte estimado",
  user: "tu corte personalizado",
  floor: "mínimo reglamentario",
};

export const DATA_QUALITY_LABEL: Record<Prediction["data_quality"], { label: string; description: string }> = {
  real: { label: "Datos reales", description: "Notas de los aptos y destinos adjudicados de convocatorias anteriores." },
  partial: { label: "Datos parciales", description: "Faltan las notas de los aptos o los destinos adjudicados: parte del cálculo usa valores por defecto." },
  synthetic: { label: "Datos de ejemplo", description: "No hay datos históricos suficientes: se usan valores por defecto documentados." },
};

export const BLOCK_ORDER: BlockId[] = ["I", "II", "III", "IV"];

/** Primera frase del título oficial, recortada con elegancia (para tarjetas y listas). */
export function shortTitle(title: string, max = 92): string {
  const clean = title.trim().replace(/\s+/g, " ");
  const first = clean.split(/\.\s+/)[0] ?? clean;
  return truncate(first.replace(/\.$/, ""), max);
}

export function topicTitle(temario: Temario | null | undefined, topicId: string | null | undefined): string | null {
  if (!temario || !topicId) return null;
  for (const b of temario.blocks) {
    const t = b.topics.find((x) => x.id === topicId);
    if (t) return t.title;
  }
  return null;
}

export function blockTitle(temario: Temario | null | undefined, block: BlockId | null | undefined): string | null {
  if (!temario || !block) return null;
  return temario.blocks.find((b) => b.id === block)?.title ?? null;
}

/** Nombre corto de una unidad de calificación: «Nota total», «1.ª parte»… */
export function unitLabel(unit: Pick<UnitGrade, "parts">, totalUnits: number): string {
  if (totalUnits <= 1 || unit.parts.length > 1) return unit.parts.length > 1 ? "Calificación conjunta" : "Calificación";
  return `${ordinalFem(unit.parts[0] ?? 1)} parte`;
}

export function partTitle(part: number, title?: string | null): string {
  if (title && /parte|ejercicio/i.test(title)) return title;
  return `${ordinalFem(part)} parte${title ? ` · ${title}` : ""}`;
}

/** Bancos oficiales del catálogo, del más reciente al más antiguo. */
export function officialBanks(catalog: CatalogInfo | null): BankSummary[] {
  return (catalog?.banks ?? [])
    .filter((b) => b.kind === "official")
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || (a.access ?? "").localeCompare(b.access ?? "") || a.id.localeCompare(b.id));
}

/** Título corto de un supuesto: «Segunda parte · Supuesto I» → «Supuesto I». */
export function caseShortTitle(title: string): string {
  const rest = title.replace(/^(?:(?:primera|segunda)\s+parte|(?:primer|segundo)\s+ejercicio)\s*·\s*/i, "").trim();
  return rest || title;
}

/** Etiqueta breve de un banco: «TAI-LI 2024», «TAI-PI 2023 · extraordinario» o su título. */
export function bankShortLabel(bank: Pick<BankSummary, "id" | "kind" | "access" | "year" | "title">): string {
  if (bank.kind === "official" && bank.year) {
    const access = bank.access === "promocion_interna" ? "PI" : "LI";
    return `TAI-${access} ${bank.year}${bank.id.endsWith("-ext") ? " · extraordinario" : ""}`;
  }
  return bank.title;
}

