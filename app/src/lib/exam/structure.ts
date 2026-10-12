// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Estructura de un examen completo en dos partes (1.ª parte · Cuestionario y 2.ª parte ·
 * Supuesto práctico) a partir del esquema oficial. Solo reordena datos del contrato para
 * presentarlos; la corrección la hace el núcleo.
 */
import type { BankSummary, CatalogInfo, ScoringScheme, SectionKind, SectionSummary } from "@/api/types";

export interface StructurePart {
  part: number;
  kind: SectionKind;
  /** «Cuestionario» o «Supuesto práctico». */
  name: string;
  questions: number;
  reserve: number;
  value: number;
  penaltyDivisor: number | null;
  casesOffered: number | null;
  casesToChoose: number | null;
  /** Escala propia de la parte (solo si se califica por separado). */
  maxGrade: number | null;
  passGrade: number | null;
  /** Corte en puntuación directa de la parte, si se conoce. */
  cutoffDirect: number | null;
  /** Puntuación directa máxima de la parte (preguntas × valor). */
  maxDirect: number;
}

export interface ExamStructureInfo {
  parts: StructurePart[];
  durationMinutes: number | null;
  /**
   * «per_part»: cada parte con su escala y su mínimo (hay que superar las dos; nota final = suma).
   * «joint»: las dos partes se califican juntas en una sola escala.
   * «single»: examen de una sola parte.
   */
  grading: "per_part" | "joint" | "single";
  totalMax: number;
  /** Aprobado de la nota conjunta o suma de los mínimos de cada parte. */
  totalPass: number;
  /** Corte conjunto en puntuación directa (si se califica de forma conjunta y se conoce). */
  jointCutoffDirect: number | null;
  /** Fracción mínima de la directa máxima (suelo reglamentario), si es común a todas las unidades. */
  minDirectRatio: number | null;
}

export interface StructureOverrides {
  /** Preguntas puntuables de la 1.ª parte (p. ej. simulacro rápido o banco concreto). */
  questions1?: number;
  reserve1?: number;
  caseQuestions?: number;
  caseReserve?: number;
  casesOffered?: number | null;
  /** false = examen sin 2.ª parte (simulacro rápido sin supuesto). */
  includeCase?: boolean;
  /** false = examen sin 1.ª parte (2.º ejercicio publicado aparte, hecho suelto). */
  includeTheory?: boolean;
  /** Duración del examen; undefined = la del esquema; null = sin límite. */
  durationMinutes?: number | null;
}

export function partName(kind: SectionKind): string {
  return kind === "case" ? "Supuesto práctico" : "Cuestionario";
}

export function structureFromScheme(scheme: ScoringScheme, o: StructureOverrides = {}): ExamStructureInfo {
  const units = scheme.grading.units;
  const includeCase = o.includeCase ?? true;
  const includeTheory = o.includeTheory ?? true;
  const parts: StructurePart[] = scheme.parts
    .filter((p) => (includeCase || p.kind !== "case") && (includeTheory || p.kind !== "theory"))
    .map((p) => {
      const isCase = p.kind === "case";
      const questions = (isCase ? o.caseQuestions : o.questions1) ?? p.questions;
      const reserve = (isCase ? o.caseReserve : o.reserve1) ?? p.reserve;
      const own = units.length > 1 ? units.find((u) => u.parts.length === 1 && u.parts[0] === p.part) : undefined;
      return {
        part: p.part,
        kind: p.kind,
        name: partName(p.kind),
        questions,
        reserve,
        value: p.value,
        penaltyDivisor: p.penalty_divisor,
        casesOffered: isCase ? (o.casesOffered !== undefined ? o.casesOffered : p.cases_offered) : null,
        casesToChoose: isCase ? p.cases_to_choose : null,
        maxGrade: own?.max_grade ?? null,
        passGrade: own?.pass_grade ?? null,
        cutoffDirect: own?.cutoff_direct ?? null,
        maxDirect: questions * p.value,
      };
    });
  const perPart = parts.length > 0 && parts.every((p) => p.maxGrade !== null);
  const joint = units.find((u) => u.parts.length > 1) ?? (units.length === 1 ? units[0] : undefined);
  const grading: ExamStructureInfo["grading"] = parts.length <= 1 ? "single" : perPart ? "per_part" : "joint";
  const ratios = [...new Set(units.map((u) => u.min_direct_ratio))];
  return {
    parts,
    durationMinutes: o.durationMinutes === undefined ? scheme.duration_minutes : o.durationMinutes,
    grading,
    totalMax: perPart ? parts.reduce((s, p) => s + (p.maxGrade ?? 0), 0) : (joint?.max_grade ?? units.reduce((s, u) => s + u.max_grade, 0)),
    totalPass: perPart ? parts.reduce((s, p) => s + (p.passGrade ?? 0), 0) : (joint?.pass_grade ?? units.reduce((s, u) => s + u.pass_grade, 0)),
    jointCutoffDirect: perPart ? null : (joint?.cutoff_direct ?? null),
    minDirectRatio: ratios.length === 1 ? (ratios[0] ?? null) : null,
  };
}

// ───────────────────────────── Exámenes oficiales (bancos) ─────────────────────────────

/** Banco complementario (la otra parte del mismo examen publicada aparte), si existe. */
export function companionBank(banks: BankSummary[], bank: BankSummary): BankSummary | null {
  if (!bank.companion_bank_id) return null;
  return banks.find((b) => b.id === bank.companion_bank_id) ?? null;
}

/**
 * Secciones del examen oficial completo de un banco: las suyas y, si su réplica es el examen
 * completo con un banco complementario (`complete_exam` + `companion_bank_id`), también las de este.
 */
export function officialExamSections(banks: BankSummary[], bank: BankSummary): SectionSummary[] {
  const companion = bank.complete_exam ? companionBank(banks, bank) : null;
  if (!companion) return bank.sections;
  const own = new Set(bank.sections.map((s) => s.kind));
  return [...bank.sections, ...companion.sections.filter((s) => !own.has(s.kind))];
}

/** Duración de la réplica oficial: la suma de la de sus bancos (como el núcleo); null si falta alguna. */
export function officialExamMinutes(banks: BankSummary[], bank: BankSummary): number | null {
  const companion = bank.complete_exam ? companionBank(banks, bank) : null;
  const list = companion ? [bank, companion] : [bank];
  if (list.some((b) => b.duration_minutes === null)) return null;
  return list.reduce((n, b) => n + (b.duration_minutes ?? 0), 0);
}

/** 1.ª parte: secciones que cuentan (comunes + una alternativa si el bloque es a elegir). */
export function theorySectionsCounted(sections: SectionSummary[]) {
  const theory = sections.filter((s) => s.kind === "theory");
  const alternatives = theory.filter((s) => s.block !== null);
  const choosable = alternatives.length > 1;
  const counted = choosable ? [...theory.filter((s) => s.block === null), alternatives[0]!] : theory;
  return { alternatives, choosable, counted };
}

/** Estructura de la réplica oficial de un banco (con su banco complementario si lo tiene). */
export function bankStructure(catalog: Pick<CatalogInfo, "banks" | "schemes" | "default_scheme"> | null, bank: BankSummary): ExamStructureInfo | null {
  if (!catalog) return null;
  const scheme =
    catalog.schemes.find((s) => s.id === bank.scoring_scheme) ?? catalog.schemes.find((s) => s.id === catalog.default_scheme) ?? null;
  if (!scheme) return null;
  const sections = officialExamSections(catalog.banks, bank);
  const { counted } = theorySectionsCounted(sections);
  const cases = sections.filter((s) => s.kind === "case");
  const firstCase = cases[0];
  return structureFromScheme(scheme, {
    questions1: counted.reduce((n, s) => n + s.question_count, 0) || undefined,
    reserve1: counted.reduce((n, s) => n + s.reserve_count, 0),
    caseQuestions: firstCase?.question_count,
    caseReserve: firstCase?.reserve_count ?? 0,
    casesOffered: cases.length || null,
    includeCase: cases.length > 0,
    includeTheory: counted.length > 0,
    durationMinutes: officialExamMinutes(catalog.banks, bank) ?? scheme.duration_minutes,
  });
}
