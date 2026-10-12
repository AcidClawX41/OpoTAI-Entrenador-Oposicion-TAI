// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Datos de entrada de la predicción del mock: reales (`data/meta` en `pnpm dev`)
 * o sintéticos (modo demo sin datos).
 */
import type { ConvocatoriaSummary, LocalityInfo, TierInfo } from "../types";
import type { DestinationAvailability } from "./bankTypes";
import {
  DEMO_CONVOCATORIAS,
  DEMO_DESTINATIONS,
  DEMO_LOCALITIES,
  DEMO_REFERENCE_CONVOCATORIA,
  DEMO_TARGET_CONVOCATORIA,
  DEMO_TIERS,
  referenceAptoRatios,
} from "./demoMeta";
import type { DevData } from "./devData";

export interface ReferenceData {
  conv: ConvocatoriaSummary;
  /** Ratios de puntuación directa de los aptos (de mejor a peor). */
  ratios: number[];
  destinations: DestinationAvailability[] | null;
  realGrades: boolean;
}

export interface PredictionData {
  real: boolean;
  convocatorias: ConvocatoriaSummary[];
  target: string;
  tiers: TierInfo[];
  localities: LocalityInfo[];
  referenceFor(targetId: string): ReferenceData;
}

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

/** Convierte notas finales (0–100, aprobado 50) de los aptos a ratio de directa. */
export function gradesToRatios(grades: number[], conv: ConvocatoriaSummary): number[] {
  const floor = conv.cutoff_direct !== null && conv.cutoff_max_direct ? conv.cutoff_direct / conv.cutoff_max_direct : 0.3;
  return grades
    .map((g) => floor + (Math.max(0, g - 50) / 50) * (1 - floor))
    .sort((a, b) => b - a);
}

function demoData(): PredictionData {
  const reference = DEMO_CONVOCATORIAS.find((c) => c.id === DEMO_REFERENCE_CONVOCATORIA) ?? DEMO_CONVOCATORIAS[1]!;
  const ratios = referenceAptoRatios(reference.aptos ?? 1756);
  return {
    real: false,
    convocatorias: DEMO_CONVOCATORIAS,
    target: DEMO_TARGET_CONVOCATORIA,
    tiers: DEMO_TIERS,
    localities: DEMO_LOCALITIES,
    referenceFor: () => ({ conv: reference, ratios, destinations: DEMO_DESTINATIONS, realGrades: false }),
  };
}

export function buildPredictionData(dev: DevData | null): PredictionData {
  if (!dev || dev.convocatorias.length === 0 || dev.localities.length === 0) return demoData();
  const convs = dev.convocatorias;
  const target = dev.target_convocatoria && convs.some((c) => c.id === dev.target_convocatoria) ? dev.target_convocatoria : convs[0]!.id;
  const cache = new Map<string, ReferenceData>();

  const referenceFor = (targetId: string): ReferenceData => {
    const cached = cache.get(targetId);
    if (cached) return cached;
    const t = convs.find((c) => c.id === targetId) ?? convs[0]!;
    const candidates = convs
      .filter((c) => c.id !== t.id && c.access === t.access && dev.grades[c.id]?.length)
      .sort((a, b) => Number(Boolean(dev.destinations[b.id])) - Number(Boolean(dev.destinations[a.id])) || b.year - a.year);
    const ref = candidates.find((c) => c.year <= t.year) ?? candidates[0];
    let data: ReferenceData;
    if (ref) {
      data = {
        conv: ref,
        ratios: gradesToRatios(dev.grades[ref.id] ?? [], ref),
        destinations: dev.destinations[ref.id]?.availability ?? null,
        realGrades: true,
      };
    } else {
      const demo = demoData().referenceFor(targetId);
      data = { ...demo, destinations: null };
    }
    cache.set(targetId, data);
    return data;
  };

  // Cuota de plazas por localidad según la adjudicación de referencia de la convocatoria objetivo.
  const share = (() => {
    const ref = referenceFor(target);
    const dest = dev.destinations[ref.conv.id];
    if (!dest) return new Map<string, number>();
    return new Map(Object.entries(dest.share).map(([k, v]) => [norm(k), v]));
  })();
  const localities: LocalityInfo[] = dev.localities.map((l) => ({
    ...l,
    share_of_plazas: share.size ? (share.get(norm(l.name)) ?? 0) : null,
  }));

  return {
    real: true,
    convocatorias: convs,
    target,
    tiers: dev.tiers.length ? dev.tiers : DEMO_TIERS,
    localities,
    referenceFor,
  };
}
