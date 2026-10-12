// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Predicción simplificada del modo demo (inspirada en `tai-core::prediction`):
 * Monte Carlo determinista sobre el rendimiento observado, corte estimado a
 * partir de la distribución de aptos de la convocatoria de referencia (real en
 * `pnpm dev` si existe `data/meta`, sintética si no) y disponibilidad de
 * destinos. Sirve para enseñar la interfaz; la app de escritorio usa el modelo
 * completo del núcleo en Rust.
 */
import type {
  CityProbability,
  ConvocatoriaSummary,
  LocalityInfo,
  Prediction,
  ScoringScheme,
  SectionKind,
  TierId,
  TierInfo,
  TierProbability,
} from "../types";
import { formatInt, formatNumber, formatPercent } from "@/lib/format";
import type { DestinationAvailability } from "./bankTypes";
import { hashString, mulberry32, quantile, randomBeta, randomBinomial, randomNormal } from "./rng";
import { directScore, transformGrade } from "./scoring";

export interface PartPerformance {
  kind: SectionKind;
  correct: number;
  wrong: number;
  blank: number;
}

export interface PredictionContext {
  targetScheme: ScoringScheme;
  target: ConvocatoriaSummary;
  reference: ConvocatoriaSummary;
  /** Ratios de directa de los aptos de la referencia, de mejor a peor. */
  referenceRatios: number[];
  tiers: TierInfo[];
  localities: LocalityInfo[];
  /** `null` si no hay datos de destinos. */
  destinations: DestinationAvailability[] | null;
  preferred: string[];
  cutoffOverrideRatio: number | null;
  observedGrade: number;
  dataQuality: Prediction["data_quality"];
  /** Añade el aviso de que los datos son de ejemplo. */
  syntheticNote: boolean;
  samples?: number;
}

const DEFAULT_SAMPLES = 1500;
const MADRID = "madrid";

/** Número de ratios (orden descendente) estrictamente mayores que `x`. */
function countAbove(desc: number[], x: number): number {
  let lo = 0;
  let hi = desc.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((desc[mid] ?? 0) > x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

export function predict(performance: PartPerformance[], ctx: PredictionContext): Prediction {
  const K = ctx.samples ?? DEFAULT_SAMPLES;
  const seed = hashString(JSON.stringify(performance) + ctx.target.id + String(ctx.cutoffOverrideRatio) + ctx.preferred.join("|"));
  const rng = mulberry32(seed);
  const assumptions: string[] = [];
  if (ctx.syntheticNote)
    assumptions.push("MODO DEMO: las notas de la referencia y los destinos son datos sintéticos de ejemplo.");
  else assumptions.push("MODO DEMO: cálculo simplificado en el navegador con los datos reales de data/meta; la app de escritorio usa el modelo completo del núcleo.");
  assumptions.push(
    "Tu precisión en el examen será parecida a la de tus intentos (con la incertidumbre de una distribución Beta).",
    "Contestarás una proporción de preguntas similar y elegirás destino como los aprobados de la referencia.",
  );

  const theory = performance.find((p) => p.kind === "theory");
  const cases = performance.find((p) => p.kind === "case");
  const fallback = theory ?? cases;
  if (!theory && cases) assumptions.push("No hay datos de la 1.ª parte: se proyecta con tu rendimiento en el supuesto.");
  if (!cases && theory && ctx.targetScheme.parts.some((p) => p.kind === "case"))
    assumptions.push("Sin supuesto práctico en tus intentos: la 2.ª parte se proyecta con tu rendimiento en la 1.ª.");

  const parts = ctx.targetScheme.parts.map((part) => {
    const perf = (part.kind === "case" ? cases : theory) ?? fallback;
    const n = perf ? perf.correct + perf.wrong + perf.blank : 0;
    const answeredFraction = perf && n > 0 ? (perf.correct + perf.wrong) / n : 0.85;
    const questions = part.questions * (part.kind === "case" ? (part.cases_to_choose ?? 1) : 1);
    return {
      part,
      questions,
      max: part.value * questions,
      answered: Math.round(answeredFraction * questions),
      alpha: (perf?.correct ?? 0) + 1,
      beta: (perf?.wrong ?? 0) + 1,
    };
  });
  const units = ctx.targetScheme.grading.units.map((u) => ({
    unit: u,
    idx: parts.map((p, i) => (u.parts.includes(p.part.part) ? i : -1)).filter((i) => i >= 0),
    max: parts.filter((p) => u.parts.includes(p.part.part)).reduce((s, p) => s + p.max, 0),
  }));
  const maxDirect = parts.reduce((s, p) => s + p.max, 0);
  const floorRatio = Math.max(...units.map((u) => u.unit.min_direct_ratio), 0.3);

  const plazas = ctx.target.plazas_total ?? ctx.reference.plazas_total ?? 1000;
  const refAptos = ctx.referenceRatios.length;
  const refPresentados = ctx.reference.presentados ?? Math.round(refAptos / 0.3);
  const targetPresentados = ctx.target.presentados ?? refPresentados;
  const rankScale = targetPresentados / Math.max(1, refPresentados);

  type Mode = "user" | "official_units" | "official_joint" | "rank";
  let mode: Mode = "rank";
  let fixedRatio = 0;
  if (ctx.cutoffOverrideRatio !== null) {
    mode = "user";
    fixedRatio = ctx.cutoffOverrideRatio;
  } else if (units.length > 0 && units.every((u) => u.unit.cutoff_direct !== null)) {
    mode = "official_units";
  } else if (ctx.target.cutoff_direct !== null && ctx.target.cutoff_max_direct) {
    mode = "official_joint";
    fixedRatio = ctx.target.cutoff_direct / ctx.target.cutoff_max_direct;
  }
  const k = Math.max(1, Math.round(plazas / rankScale));
  const rankBase = k <= refAptos ? (ctx.referenceRatios[k - 1] ?? floorRatio) : floorRatio;

  const destinations = ctx.destinations;
  const availOf = (name: string) =>
    destinations?.find((d) => norm(d.locality) === norm(name))?.last_order_ratio ?? 0;
  const tierAvail = new Map<TierId, number>();
  let bigNoMadridAvail = 0;
  for (const loc of ctx.localities) {
    const a = availOf(loc.name);
    tierAvail.set(loc.tier, Math.max(tierAvail.get(loc.tier) ?? 0, a));
    if (loc.tier === "gran_ciudad" && norm(loc.name) !== MADRID) bigNoMadridAvail = Math.max(bigNoMadridAvail, a);
  }

  const ranks: number[] = [];
  const grades: number[] = [];
  const cutoffs: number[] = [];
  let passCount = 0;
  let plazaCount = 0;
  let bigNoMadridHits = 0;
  const tierHits = new Map<TierId, number>();
  const topCities = [...ctx.localities]
    .sort((a, b) => (b.share_of_plazas ?? 0) - (a.share_of_plazas ?? 0))
    .slice(0, 8);
  const preferredLocs = ctx.preferred
    .map((name) => ctx.localities.find((l) => norm(l.name) === norm(name)))
    .filter((l): l is LocalityInfo => Boolean(l));
  const cityHits = new Map<string, number>();
  // Una localidad puede estar a la vez entre las principales y entre las preferidas: se cuenta una vez.
  const trackedCities = [...new Map([...topCities, ...preferredLocs].map((l) => [l.name, l])).values()];

  for (let s = 0; s < K; s++) {
    const direct: number[] = parts.map((p) => {
      const accuracy = randomBeta(p.alpha, p.beta, rng);
      const correct = randomBinomial(p.answered, accuracy, rng);
      return directScore(p.part, correct, p.answered - correct);
    });
    const total = direct.reduce((a, b) => a + b, 0);
    const ratio = total / maxDirect;
    const sampleRatio =
      mode === "rank" ? Math.max(floorRatio, rankBase + 0.03 * randomNormal(rng)) : mode === "official_units" ? 0 : fixedRatio;

    let passed = true;
    let grade = 0;
    let cutSum = 0;
    for (const u of units) {
      const d = u.idx.reduce((a, i) => a + (direct[i] ?? 0), 0);
      const cut =
        mode === "official_units" ? (u.unit.cutoff_direct ?? 0) : Math.max(sampleRatio, u.unit.min_direct_ratio) * u.max;
      cutSum += cut;
      if (d < cut - 1e-9) passed = false;
      grade += transformGrade(d, cut, u.max, u.unit.pass_grade, u.unit.max_grade);
    }
    cutoffs.push(cutSum / maxDirect);
    grades.push(grade);

    let rank: number;
    if (ratio >= floorRatio) rank = (countAbove(ctx.referenceRatios, ratio) + 1) * rankScale;
    else {
      const below = Math.min(1, (floorRatio - ratio) / Math.max(floorRatio, 1e-6));
      rank = (refAptos + below * Math.max(0, refPresentados - refAptos)) * rankScale;
    }
    rank = Math.max(1, Math.round(rank));
    ranks.push(rank);

    if (passed) passCount++;
    const plaza = passed && rank <= plazas;
    if (plaza) {
      plazaCount++;
      const q = rank / plazas;
      if (destinations) {
        for (const [tier, avail] of tierAvail) if (q <= avail) tierHits.set(tier, (tierHits.get(tier) ?? 0) + 1);
        if (q <= bigNoMadridAvail) bigNoMadridHits++;
        for (const loc of trackedCities)
          if (q <= availOf(loc.name)) cityHits.set(loc.name, (cityHits.get(loc.name) ?? 0) + 1);
      } else {
        for (const tier of ctx.tiers) tierHits.set(tier.id, (tierHits.get(tier.id) ?? 0) + 1);
      }
    }
  }

  ranks.sort((a, b) => a - b);
  grades.sort((a, b) => a - b);
  cutoffs.sort((a, b) => a - b);
  const pPass = passCount / K;
  const pPlaza = plazaCount / K;
  const p10 = Math.round(quantile(ranks, 0.1));
  const p50 = Math.round(quantile(ranks, 0.5));
  const p90 = Math.round(quantile(ranks, 0.9));
  const expected = quantile(grades, 0.5);
  const cutoffRatio = quantile(cutoffs, 0.5);
  const maxGrade = units.reduce((s, u) => s + u.unit.max_grade, 0) || 100;

  const tiers: TierProbability[] = [...ctx.tiers]
    .sort((a, b) => a.order - b.order)
    .map((tier) => ({
      tier: tier.id,
      label: tier.label,
      description: tier.description,
      probability: (tierHits.get(tier.id) ?? 0) / K,
      share_of_plazas: ctx.localities.filter((l) => l.tier === tier.id).reduce((s, l) => s + (l.share_of_plazas ?? 0), 0),
    }));

  const city = (loc: LocalityInfo): CityProbability => ({
    locality: loc.name,
    province: loc.province,
    tier: loc.tier,
    probability: (cityHits.get(loc.name) ?? 0) / K,
    share_of_plazas: loc.share_of_plazas ?? 0,
  });

  const theoryPerf = theory ?? fallback;
  const answeredTheory = theoryPerf ? theoryPerf.correct + theoryPerf.wrong : 0;
  const precision = answeredTheory > 0 && theoryPerf ? theoryPerf.correct / answeredTheory : 0;
  const perUnit = units.length > 1;
  const reasoning = [
    theoryPerf
      ? `Tu rendimiento de partida: ${formatInt(theoryPerf.correct)} aciertos, ${formatInt(theoryPerf.wrong)} fallos y ${formatInt(theoryPerf.blank)} en blanco (precisión ${formatPercent(precision)}).`
      : "Sin respuestas suficientes: se usa un rendimiento neutro.",
    `Se han simulado ${formatInt(K)} exámenes con el formato «${ctx.targetScheme.title}»: nota esperada ${formatNumber(expected, 2, 2)} sobre ${formatInt(maxGrade)} (mediana)${perUnit ? ", sumando las dos partes, que se califican por separado" : ""}.`,
    mode === "user"
      ? `Corte fijado por ti en el ${formatPercent(fixedRatio)} de la puntuación directa máxima.`
      : mode === "official_units"
        ? "Cortes oficiales publicados para cada parte de la convocatoria objetivo."
        : mode === "official_joint"
          ? `Corte oficial de la convocatoria objetivo: ${formatPercent(fixedRatio)} de la puntuación directa máxima.`
          : `Corte estimado en torno al ${formatPercent(cutoffRatio)} de la directa máxima: la puntuación del aspirante n.º ${formatInt(k)} de la convocatoria de referencia (${formatInt(plazas)} plazas escaladas por presentados), con ruido de ±3 puntos y nunca por debajo del ${formatPercent(floorRatio)}${perUnit ? "; hay que superarlo en las dos partes" : ""}.`,
    `Puesto estimado ${formatInt(p50)} (entre ${formatInt(p10)} y ${formatInt(p90)} en el 80 % de las simulaciones) con ${formatInt(plazas)} plazas y unos ${formatInt(targetPresentados)} presentados.`,
    destinations
      ? "Destinos: con tu puesto relativo se comprueba qué localidades seguían disponibles en ese mismo punto de la adjudicación de referencia."
      : "Sin datos de destinos: no se puede estimar la localidad.",
  ];

  return {
    target_convocatoria: ctx.target.id,
    target_label: `${ctx.target.title} · ${formatInt(plazas)} plazas`,
    plazas,
    observed_grade: ctx.observedGrade,
    expected_grade: (expected / maxGrade) * 100,
    p_pass: pPass,
    p_plaza: pPlaza,
    cutoff_ratio: cutoffRatio,
    estimated_rank: { p10, p50, p90 },
    estimated_percentile: Math.max(0, Math.min(1, 1 - p50 / targetPresentados)),
    tiers,
    p_big_city_outside_madrid: destinations ? bigNoMadridHits / K : null,
    top_cities: destinations ? topCities.map(city) : [],
    preferred: preferredLocs.map(city),
    verdict: verdictFor(pPass, pPlaza),
    reasoning,
    assumptions,
    data_quality: ctx.dataQuality,
  };
}

export function verdictFor(pPass: number, pPlaza: number): string {
  if (pPlaza >= 0.85) return "¡Vas muy bien! Con tu nivel actual obtendrías plaza con mucha probabilidad.";
  if (pPlaza >= 0.55) return "Vas por buen camino: tienes opciones reales de plaza. Mantén el ritmo.";
  if (pPlaza >= 0.25) return "Estás cerca: un empujón en tus temas débiles marcaría la diferencia.";
  if (pPass >= 0.5) return "Probablemente superarías el corte, pero aún estás lejos de las plazas.";
  return "Todavía lejos del corte: consolida la primera parte y reduce los fallos.";
}
