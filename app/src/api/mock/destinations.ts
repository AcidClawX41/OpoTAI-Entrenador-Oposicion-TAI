// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Simulador de destinos del backend simulado (modo demo y tests).
 *
 * Versión simplificada del núcleo Rust (`tai-core/src/prediction/destinations.rs`): en vez de
 * Monte Carlo usa una cuadratura de 5 puntos alrededor de la nota observada, y sin datos reales
 * genera un reparto sintético determinista parecido al de 2023–2024 (Madrid ≈ 76 %).
 * La app de escritorio siempre usa el cálculo del núcleo.
 */
import type {
  CategoryAvailability,
  DestinationScenario,
  DestinationSimulation,
  LikelyDestination,
  LocalityAvailability,
  Prediction,
  ProvinceAvailability,
  TierId,
} from "../types";
import { mulberry32 } from "./rng";

export interface MockAssignment {
  order: number;
  province: string;
  locality: string;
  organism: string | null;
  unit: string | null;
}

export interface MockCall {
  id: string;
  year: number;
  label: string;
  /** Notas finales (0–100) de los aprobados, de mayor a menor. */
  grades: number[];
  assignments: MockAssignment[];
}

const norm = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Mismo criterio que `category_of` del núcleo. */
export function categoryOf(organism: string | null): string {
  if (!organism) return "Otros organismos";
  const o = norm(organism);
  const has = (n: string) => o.includes(n);
  if (has("tributari") || has("inspeccion fin")) return "Agencia Tributaria";
  if (has("seg soc") || has("seguridad social")) return "Seguridad Social, Inclusión y Migraciones";
  if (has("trabajo")) return "Trabajo y Economía Social";
  if (has("transf digit") || has("transformacion digital") || has("func publica") || has("funcion publica"))
    return "Transformación Digital y Función Pública";
  if (has("pol territ") || has("politica territorial")) return "Política Territorial (Delegaciones del Gobierno)";
  if (has("defensa")) return "Defensa";
  if (has("interior")) return "Interior";
  if (has("hacienda")) return "Hacienda";
  if (has("just") || has("presidencia") || has("rel cort")) return "Presidencia y Justicia";
  if (has("economia") || has("industria") || has("comercio")) return "Economía, Industria y Comercio";
  if (has("transicion")) return "Transición Ecológica y Reto Demográfico";
  if (has("transportes") || has("vivienda")) return "Transportes, Movilidad y Vivienda";
  if (has("ciencia") || has("universidades") || has("csic") || has("investig"))
    return "Ciencia, Universidades e Investigación";
  if (["agencia", "agencias", "entes", "consejo", "comision", "museo", "boletin"].some(has))
    return "Agencias y organismos públicos";
  return "Otros ministerios";
}

// ───────────────────────────── Reparto sintético ─────────────────────────────

const SYNTH_PROVINCES: [province: string, locality: string, posts: number, tier: TierId][] = [
  ["Madrid", "Madrid", 1330, "gran_ciudad"],
  ["Barcelona", "Barcelona", 28, "gran_ciudad"],
  ["Valencia", "València", 21, "gran_ciudad"],
  ["Illes Balears", "Palma", 15, "gran_ciudad"],
  ["Murcia", "Murcia", 14, "gran_ciudad"],
  ["Zaragoza", "Zaragoza", 14, "gran_ciudad"],
  ["A Coruña", "A Coruña", 12, "ciudad_media"],
  ["Sevilla", "Sevilla", 11, "gran_ciudad"],
  ["Valladolid", "Valladolid", 11, "gran_ciudad"],
  ["Salamanca", "Salamanca", 10, "ciudad_media"],
  ["Bizkaia", "Bilbao", 10, "gran_ciudad"],
  ["Toledo", "Toledo", 10, "ciudad_media"],
  ["Asturias", "Oviedo", 9, "ciudad_media"],
  ["Málaga", "Málaga", 9, "gran_ciudad"],
  ["Cantabria", "Santander", 8, "ciudad_media"],
  ["Navarra", "Pamplona", 8, "ciudad_media"],
  ["Granada", "Granada", 7, "ciudad_media"],
  ["Alicante", "Alicante", 7, "gran_ciudad"],
  ["Las Palmas", "Las Palmas de Gran Canaria", 7, "gran_ciudad"],
  ["Santa Cruz de Tenerife", "Santa Cruz de Tenerife", 6, "ciudad_media"],
  ["Badajoz", "Mérida", 6, "pueblo"],
  ["León", "León", 6, "ciudad_media"],
  ["Burgos", "Burgos", 5, "ciudad_media"],
  ["Cádiz", "Cádiz", 5, "ciudad_media"],
  ["Córdoba", "Córdoba", 5, "ciudad_media"],
  ["Pontevedra", "Vigo", 5, "gran_ciudad"],
  ["Girona", "Girona", 4, "ciudad_media"],
  ["Huesca", "Huesca", 3, "pueblo"],
  ["Soria", "Soria", 3, "pueblo"],
  ["Teruel", "Teruel", 3, "pueblo"],
];
const SYNTH_ORGANISMS = [
  "MINISTERIO TRANSF. DIGIT.Y FUNC. PUBLICA",
  "AG. ESTATAL DE ADMON. TRIBUTARIA",
  "MINISTERIO DE INCLUS., SEG.SOC.Y MIGRAC",
  "MINISTERIO DE TRABAJO Y ECONOMIA SOCIAL",
  "MINISTERIO DE DEFENSA",
  "MINISTERIO DEL INTERIOR",
  "MINISTERIO POL.TERRIT. Y MEM.DEMOCRATICA",
];

/** Reparto sintético determinista: fuera de Madrid las plazas se eligen antes. */
export function syntheticCall(id = "li-2024", year = 2024): MockCall {
  const rng = mulberry32(2024);
  const pool: { province: string; locality: string; weight: number }[] = [];
  for (const [province, locality, posts] of SYNTH_PROVINCES) {
    for (let i = 0; i < posts; i++) pool.push({ province, locality, weight: province === "Madrid" ? 1 : 6 });
  }
  const assignments: MockAssignment[] = [];
  let order = 1;
  while (pool.length) {
    const total = pool.reduce((s, p) => s + p.weight, 0);
    let r = rng() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx]!.weight;
      if (r <= 0) break;
    }
    const [pick] = pool.splice(idx, 1);
    const organism = pick!.province === "Madrid" ? SYNTH_ORGANISMS[Math.floor(rng() * 5)]! : SYNTH_ORGANISMS[6]!;
    assignments.push({ order: order++, province: pick!.province, locality: pick!.locality, organism, unit: null });
  }
  const grades = assignments.map((_, i) => Math.round((88 - (38 * i) / assignments.length) * 100) / 100);
  return { id, year, label: `Ingreso libre ${year} (demo)`, grades, assignments };
}

// ───────────────────────────── Cálculo ─────────────────────────────

interface Weighted {
  order: number;
  weight: number;
}

const tierOf = (locality: string): TierId => SYNTH_PROVINCES.find((p) => p.at(1) === locality)?.[3] ?? "ciudad_media";

function scenario(
  meta: { id: string; kind: "projection" | "historical"; label: string; year: number; aprobados: number; orderScale: number },
  call: MockCall,
  positions: Weighted[],
  pPass: number,
  grade: number | null,
  preferred: string[],
): DestinationScenario {
  const list = [...call.assignments].sort((a, b) => a.order - b.order);
  const withPlaza = positions.reduce((s, p) => s + p.weight, 0);
  const mean = (x: number) => (withPlaza > 0 ? x / withPlaza : 0);
  const window = Math.max(2, Math.round(list.length * 0.01));
  const group = <K extends string>(key: (a: MockAssignment) => K) => {
    const m = new Map<K, MockAssignment[]>();
    for (const a of list) m.set(key(a), [...(m.get(key(a)) ?? []), a]);
    return m;
  };
  const stats = (items: MockAssignment[]) => {
    let avail = 0;
    let hit = 0;
    let likely = 0;
    for (const { order, weight } of positions) {
      const n = items.filter((a) => a.order >= order).length;
      avail += weight * n;
      if (n > 0) hit += weight;
      const start = list.findIndex((a) => a.order >= order);
      const centre = start < 0 ? list.length - 1 : start;
      const lo = Math.max(0, centre - window);
      const hi = Math.min(list.length, centre + window + 1);
      const near = list.slice(lo, hi);
      likely += (weight * near.filter((a) => items.includes(a)).length) / Math.max(1, near.length);
    }
    return {
      available_posts: mean(avail),
      p_available: mean(hit),
      p_likely: mean(likely),
      last_order: Math.max(...items.map((a) => a.order)),
    };
  };
  const provinces: ProvinceAvailability[] = [...group((a) => a.province).entries()]
    .map(([province, items]) => ({ province, posts: items.length, ...stats(items) }))
    .sort((a, b) => b.posts - a.posts);
  const localities: LocalityAvailability[] = [...group((a) => `${a.locality}|${a.province}`).entries()]
    .map(([, items]) => ({
      locality: items[0]!.locality,
      province: items[0]!.province,
      tier: tierOf(items[0]!.locality),
      posts: items.length,
      ...stats(items),
    }))
    .sort((a, b) => b.posts - a.posts);
  const categories: CategoryAvailability[] = [...group((a) => categoryOf(a.organism)).entries()]
    .map(([category, items]) => {
      const s = stats(items);
      return { category, posts: items.length, available_posts: s.available_posts, p_likely: s.p_likely };
    })
    .sort((a, b) => b.p_likely - a.p_likely);
  const likely: LikelyDestination[] = [...group((a) => `${a.locality}|${a.organism ?? ""}|${a.unit ?? ""}`).values()]
    .map((items) => ({
      locality: items[0]!.locality,
      province: items[0]!.province,
      category: categoryOf(items[0]!.organism),
      organism: items[0]!.organism,
      unit: items[0]!.unit,
      probability: stats(items).p_likely,
    }))
    .filter((d) => d.probability > 0)
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 12);
  const ranks = positions.filter((p) => p.weight > 0).map((p) => p.order * meta.orderScale);
  const sorted = [...ranks].sort((a, b) => a - b);
  const q = (f: number) => Math.max(1, Math.round(sorted[Math.min(sorted.length - 1, Math.floor(f * sorted.length))] ?? 1));
  const rank = sorted.length ? { p10: q(0.1), p50: q(0.5), p90: q(0.9) } : null;
  const available = mean(positions.reduce((s, p) => s + p.weight * list.filter((a) => a.order >= p.order).length, 0));
  const prefs = preferred.map((name) => localities.find((l) => norm(l.locality) === norm(name)) ?? {
    locality: name,
    province: "",
    tier: "pueblo" as TierId,
    posts: 0,
    available_posts: 0,
    p_available: 0,
    p_likely: 0,
    last_order: 0,
  });
  const fmt = (n: number) => Math.round(n).toLocaleString("es-ES");
  const summary = rank
    ? `${meta.label}: número de orden ${fmt(rank.p50)} de ${fmt(meta.aprobados)}; al elegir quedaban libres unas ${fmt(available)} de ${fmt(list.length)} plazas.`
    : `${meta.label}: con tu nivel actual no habrías obtenido plaza; sigue practicando y vuelve a simular.`;
  return {
    id: meta.id,
    kind: meta.kind,
    label: meta.label,
    dataset: call.id,
    year: meta.year,
    aprobados: meta.aprobados,
    posts_total: list.length,
    p_pass: pPass,
    p_plaza: Math.min(1, withPlaza),
    equivalent_grade: grade,
    rank,
    available_posts: available,
    available_share: list.length ? available / list.length : 0,
    provinces,
    localities,
    categories,
    likely,
    preferred: prefs,
    summary,
  };
}

const OFFSETS: [delta: number, weight: number][] = [
  [-6, 0.1],
  [-3, 0.2],
  [0, 0.4],
  [3, 0.2],
  [6, 0.1],
];

/** Simulación del modo demo a partir de la nota y de la predicción del mock. */
export function simulateDestinationsMock(
  observedGrade: number,
  prediction: Prediction,
  calls: MockCall[],
  preferred: string[],
): DestinationSimulation {
  const data = calls.length ? calls : [syntheticCall()];
  const latest = data[0]!;
  const scenarios: DestinationScenario[] = [];
  const plazas = prediction.plazas ?? latest.grades.length;
  const p50 = prediction.estimated_rank?.p50 ?? null;
  const projectionPositions: Weighted[] =
    p50 !== null && prediction.p_plaza > 0
      ? OFFSETS.map(([d, w]) => ({
          order: Math.max(1, Math.ceil((Math.max(1, p50 * (1 + d / 20)) / plazas) * latest.assignments.length)),
          weight: w * prediction.p_plaza,
        }))
      : [];
  scenarios.push(
    scenario(
      {
        id: "proyeccion",
        kind: "projection",
        label: prediction.target_label,
        year: Number(prediction.target_convocatoria.split("-").pop()) || 0,
        aprobados: plazas,
        orderScale: plazas / Math.max(1, latest.assignments.length),
      },
      latest,
      projectionPositions,
      prediction.p_pass,
      prediction.p_pass > 0 ? observedGrade : null,
      preferred,
    ),
  );
  for (const call of data) {
    const positions: Weighted[] = [];
    let pass = 0;
    for (const [d, w] of OFFSETS) {
      const g = observedGrade + d;
      if (g < 50) continue;
      pass += w;
      const rank = call.grades.filter((x) => x > g).length + 1;
      if (rank <= call.grades.length) positions.push({ order: rank, weight: w });
    }
    scenarios.push(
      scenario(
        { id: call.id, kind: "historical", label: call.label, year: call.year, aprobados: call.grades.length, orderScale: 1 },
        call,
        positions,
        pass,
        pass > 0 ? Math.max(50, observedGrade) : null,
        preferred,
      ),
    );
  }
  return {
    observed_grade: observedGrade,
    target_convocatoria: prediction.target_convocatoria,
    target_label: prediction.target_label,
    scenarios,
    neighbour_window: Math.max(2, Math.round(latest.assignments.length * 0.01)),
    assumptions: [
      "Los destinos se adjudican según el orden obtenido en el proceso selectivo (art. 26 del RD 364/1995).",
      calls.length
        ? "Modo demo: cálculo simplificado con los datos reales del repositorio."
        : "Modo demo: reparto sintético de ejemplo. La app de escritorio usa los datos reales del BOE.",
    ],
    data_quality: calls.length ? "partial" : "synthetic",
  };
}
