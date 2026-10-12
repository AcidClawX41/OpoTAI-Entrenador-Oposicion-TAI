// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Corrección del backend simulado (réplica simplificada de `tai-core::scoring`,
 * `docs/CONTRATO-DATOS.md` §2):
 *
 *   directa_p = value_p · A − value_p · E / penalty_divisor_p
 *   D = Σ directa_p      N = Σ value_p · contabilizadas_p
 *   M = corte (usuario | oficial escalado | suelo min_direct_ratio · N)
 *   D ≥ M → nota = pass + (max − pass) · (D − M) / (N − M)        (APTO)
 *   0 ≤ D < M → nota = pass · D / M                                (NO APTO)
 *   D < 0 → 0
 */
import type {
  GradeResult,
  GradingUnit,
  ItemStatus,
  Letter,
  PartScore,
  ScoringPart,
  ScoringScheme,
  SectionKind,
  UnitGrade,
} from "../types";

/** Tolerancia de coma flotante al comparar con el corte (la misma que el núcleo). */
const EPS = 1e-6;

export interface GradableItem {
  question_id: string;
  is_reserve: boolean;
  answer: Letter | null;
  annulled: boolean;
  chosen: Letter | null;
}

export interface GradableSection {
  id: string;
  part: number;
  kind: SectionKind;
  title: string;
  items: GradableItem[];
}

export interface ScoreInput {
  scheme: ScoringScheme;
  sections: GradableSection[];
  chosen_case: string | null;
  requires_case_choice: boolean;
  use_reserves: boolean;
  cutoff_override_ratio: number | null;
}

export interface ScoreOutput {
  grade: GradeResult;
  statuses: Record<string, ItemStatus>;
  effective_case: string | null;
}

/** Transformación lineal oficial de la puntuación directa a la calificación. */
export function transformGrade(direct: number, cutoff: number, maxDirect: number, passGrade: number, maxGrade: number): number {
  if (maxDirect <= 0) return 0;
  // Misma tolerancia que el núcleo: igualar el corte (salvo error de coma flotante) lo supera.
  if (direct + EPS >= cutoff) {
    if (maxDirect - cutoff <= EPS) return maxGrade;
    const grade = passGrade + ((maxGrade - passGrade) * (direct - cutoff)) / (maxDirect - cutoff);
    return Math.min(maxGrade, Math.max(Math.min(passGrade, maxGrade), grade));
  }
  if (direct <= 0 || cutoff <= 0) return 0;
  return (passGrade * direct) / cutoff;
}

/** Divisor de la resta por error de un esquema (el de su cuestionario; 3 si no consta). */
export function penaltyDivisorOf(scheme: ScoringScheme | null | undefined): number {
  const part = scheme?.parts.find((p) => p.kind === "theory") ?? scheme?.parts[0];
  const d = part?.penalty_divisor;
  return d && d > 0 ? d : 3;
}

export function directScore(part: Pick<ScoringPart, "value" | "penalty_divisor">, correct: number, wrong: number): number {
  const penalty = part.penalty_divisor ? (part.value * wrong) / part.penalty_divisor : 0;
  return part.value * correct - penalty;
}

/** Directa máxima «oficial» de una unidad según el esquema (para escalar el corte). */
export function officialMaxDirect(scheme: ScoringScheme, unit: GradingUnit): number {
  return unit.parts.reduce((sum, p) => {
    const part = scheme.parts.find((x) => x.part === p);
    if (!part) return sum;
    const factor = part.kind === "case" ? (part.cases_to_choose ?? 1) : 1;
    return sum + part.value * part.questions * factor;
  }, 0);
}

export function itemStatus(item: GradableItem): Exclude<ItemStatus, "not_counted"> {
  if (item.annulled) return "annulled";
  if (item.chosen === null) return "blank";
  return item.chosen === item.answer ? "correct" : "wrong";
}

export interface UnitCutoff {
  cutoff: number;
  source: UnitGrade["cutoff_source"];
}

export function unitCutoff(
  scheme: ScoringScheme,
  unit: GradingUnit,
  maxDirect: number,
  overrideRatio: number | null,
): UnitCutoff {
  const floor = unit.min_direct_ratio * maxDirect;
  let cutoff: number;
  let source: UnitGrade["cutoff_source"];
  if (overrideRatio !== null && overrideRatio !== undefined) {
    cutoff = overrideRatio * maxDirect;
    source = "user";
  } else if (unit.cutoff_direct !== null) {
    const official = officialMaxDirect(scheme, unit);
    cutoff = official > 0 ? (unit.cutoff_direct * maxDirect) / official : unit.cutoff_direct;
    source = "official";
  } else {
    cutoff = floor;
    source = "floor";
  }
  if (cutoff < floor - 1e-9) {
    cutoff = floor;
    source = "floor";
  }
  return { cutoff, source };
}

const partsLabel = (parts: number[]) => parts.map((p) => `${p}.ª parte`).join(" + ");

/**
 * Califica cada unidad. Como el núcleo, con varias unidades las partes son eliminatorias: si no
 * se supera una, las siguientes no se corrigen (calificación 0, no apto) y se añade una nota.
 */
export function gradeUnits(
  scheme: ScoringScheme,
  parts: PartScore[],
  overrideRatio: number | null,
): { units: UnitGrade[]; total: number; max: number; passed: boolean; notes: string[] } {
  const units: UnitGrade[] = [];
  const notes: string[] = [];
  const multi = scheme.grading.units.length > 1;
  let eliminatedBy: number[] | null = null;
  for (const unit of scheme.grading.units) {
    const present = parts.filter((p) => unit.parts.includes(p.part));
    if (present.length === 0) continue;
    const direct = present.reduce((s, p) => s + p.direct, 0);
    const maxDirect = present.reduce((s, p) => s + p.max_direct, 0);
    const { cutoff, source } = unitCutoff(scheme, unit, maxDirect, overrideRatio);
    let grade = transformGrade(direct, cutoff, maxDirect, unit.pass_grade, unit.max_grade);
    let passed = maxDirect > 0 && direct + EPS >= cutoff;
    if (eliminatedBy) {
      notes.push(
        `La ${partsLabel(unit.parts)} no se corrige porque no se ha superado la ${partsLabel(eliminatedBy)} (como en el examen real).`,
      );
      grade = 0;
      passed = false;
    } else if (multi && !passed) {
      eliminatedBy = unit.parts;
    }
    units.push({
      parts: present.map((p) => p.part),
      direct: round(direct),
      max_direct: round(maxDirect),
      cutoff_direct: round(cutoff),
      cutoff_source: source,
      grade: round(grade),
      pass_grade: unit.pass_grade,
      max_grade: unit.max_grade,
      passed,
      margin_direct: round(direct - cutoff),
    });
  }
  const total = units.reduce((s, u) => s + u.grade, 0);
  const max = units.reduce((s, u) => s + u.max_grade, 0);
  return { units, total: round(total), max, passed: units.length > 0 && units.every((u) => u.passed), notes };
}

export function round(n: number, decimals = 4): number {
  const f = 10 ** decimals;
  return Math.round(n * f) / f;
}

function hasAnswers(section: GradableSection): boolean {
  return section.items.some((i) => i.chosen !== null);
}

/** Corrige un examen completo. */
export function scoreExam(input: ScoreInput): ScoreOutput {
  const { scheme } = input;
  const notes: string[] = [];
  const statuses: Record<string, ItemStatus> = {};

  // 1) Supuesto que cuenta.
  const caseSections = input.sections.filter((s) => s.kind === "case");
  let effectiveCase: string | null = input.chosen_case;
  if (input.requires_case_choice && caseSections.length > 0 && !effectiveCase) {
    const answered = caseSections.filter(hasAnswers);
    if (answered.length === 1 && answered[0]) {
      effectiveCase = answered[0].id;
      notes.push(`No elegiste supuesto: se ha corregido «${answered[0].title}», el único con respuestas.`);
    } else if (answered.length > 1) {
      notes.push("Respondiste a varios supuestos sin elegir ninguno: la 2.ª parte cuenta como en blanco, como en el examen real.");
    } else {
      notes.push("No elegiste ni respondiste ningún supuesto: la 2.ª parte cuenta como en blanco.");
    }
  }

  // 2) Recuento por parte.
  interface Tally {
    correct: number;
    wrong: number;
    blank: number;
    annulled: number;
  }
  const tallies = new Map<number, Tally>();
  const tally = (part: number): Tally => {
    let t = tallies.get(part);
    if (!t) {
      t = { correct: 0, wrong: 0, blank: 0, annulled: 0 };
      tallies.set(part, t);
    }
    return t;
  };
  let reservesUsed = 0;

  for (const section of input.sections) {
    const counts =
      section.kind === "theory" || !input.requires_case_choice || section.id === effectiveCase;
    const main = section.items.filter((i) => !i.is_reserve);
    const reserves = section.items.filter((i) => i.is_reserve);
    if (!counts) {
      for (const item of section.items) statuses[item.question_id] = "not_counted";
      continue;
    }
    const t = tally(section.part);
    let annulledHere = 0;
    for (const item of main) {
      const st = itemStatus(item);
      statuses[item.question_id] = st;
      if (st === "annulled") {
        annulledHere++;
        t.annulled++;
      } else t[st]++;
    }
    // Reservas: la k-ésima anulada se sustituye por la k-ésima reserva no anulada.
    const usable = reserves.filter((r) => !r.annulled);
    reserves.forEach((r) => {
      statuses[r.question_id] = r.annulled ? "annulled" : "not_counted";
    });
    if (input.use_reserves) {
      for (let k = 0; k < Math.min(annulledHere, usable.length); k++) {
        const r = usable[k];
        if (!r) continue;
        const st = itemStatus(r);
        statuses[r.question_id] = st;
        if (st !== "annulled") t[st]++;
        reservesUsed++;
      }
    }
  }

  // 2.ª parte en blanco si no hay supuesto que corregir: tantas preguntas como puntúa el esquema
  // (como el núcleo), o las del primer supuesto si el esquema no lo indica.
  if (input.requires_case_choice && caseSections.length > 0 && !effectiveCase) {
    const first = caseSections[0];
    if (first) {
      const t = tally(first.part);
      const perCase = scheme.parts.find((p) => p.part === first.part)?.questions ?? 0;
      t.blank += perCase > 0 ? perCase : first.items.filter((i) => !i.is_reserve && !i.annulled).length;
    }
  }

  if (reservesUsed > 0) {
    notes.push(
      reservesUsed === 1
        ? "Se ha aplicado 1 pregunta de reserva en sustitución de una anulada."
        : `Se han aplicado ${reservesUsed} preguntas de reserva en sustitución de las anuladas.`,
    );
  }

  // 3) Puntuación por parte.
  const parts: PartScore[] = [];
  for (const [partNo, t] of [...tallies.entries()].sort((a, b) => a[0] - b[0])) {
    const def =
      scheme.parts.find((p) => p.part === partNo) ??
      ({ part: partNo, title: `Parte ${partNo}`, value: 1, penalty_divisor: 3 } as ScoringPart);
    const counted = t.correct + t.wrong + t.blank;
    const direct = directScore(def, t.correct, t.wrong);
    parts.push({
      part: partNo,
      title: def.title,
      counted,
      correct: t.correct,
      wrong: t.wrong,
      blank: t.blank,
      annulled: t.annulled,
      value: def.value,
      penalty_divisor: def.penalty_divisor,
      penalty_points: round(def.penalty_divisor ? (def.value * t.wrong) / def.penalty_divisor : 0),
      direct: round(direct),
      max_direct: round(def.value * counted),
    });
  }

  // 4) Unidades de calificación.
  const graded = gradeUnits(scheme, parts, input.cutoff_override_ratio);

  return {
    grade: {
      scheme_id: scheme.id,
      parts,
      units: graded.units,
      total_grade: graded.total,
      max_grade: graded.max,
      passed: graded.passed,
      notes: [...notes, ...graded.notes],
    },
    statuses,
    effective_case: effectiveCase,
  };
}

/**
 * Esquema derivado para práctica, repaso y supuestos sueltos: mismo valor y
 * penalización que la parte equivalente del esquema por defecto y una unidad
 * 0–10 con aprobado en 5 y corte en el 50 % de la directa máxima.
 */
export function derivedScheme(
  base: ScoringScheme,
  kinds: SectionKind[],
  id: string,
  title: string,
  counts: Partial<Record<SectionKind, number>>,
): ScoringScheme {
  const parts: ScoringPart[] = [];
  for (const kind of ["theory", "case"] as const) {
    if (!kinds.includes(kind)) continue;
    const ref = base.parts.find((p) => p.kind === kind);
    parts.push({
      part: kind === "theory" ? 1 : 2,
      title: kind === "theory" ? "Preguntas" : "Supuesto práctico",
      kind,
      questions: counts[kind] ?? 0,
      reserve: 0,
      value: ref?.value ?? 1,
      penalty_divisor: ref?.penalty_divisor ?? 3,
      cases_offered: null,
      cases_to_choose: null,
    });
  }
  return {
    id,
    title,
    access: base.access,
    convocatoria: null,
    duration_minutes: 0,
    parts,
    grading: {
      units: [
        {
          parts: parts.map((p) => p.part),
          max_grade: 10,
          pass_grade: 5,
          min_direct_ratio: 0.5,
          cutoff_direct: null,
          cutoff_note: "50 % de la puntuación directa máxima (nota sobre 10 con penalización)",
        },
      ],
    },
    notes: "Nota sobre 10 con la misma penalización que el examen oficial.",
  };
}
