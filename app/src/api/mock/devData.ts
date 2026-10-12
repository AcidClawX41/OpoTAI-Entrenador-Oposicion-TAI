// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * SOLO EN DESARROLLO (`pnpm dev`): pide al servidor de Vite los datos reales del
 * repositorio (bancos de `data/banks/oficiales`, `data/meta/*` y `data/teoria`)
 * para que el modo demo sea realista. El plugin `opotai-dev-data` de
 * `vite.config.ts` solo existe en el servidor de desarrollo: el build de
 * producción no contiene ningún `import` de esos ficheros.
 *
 * Añade `?datos=ejemplo` a la URL para forzar los datos de ejemplo.
 */
import type {
  BlockId,
  ConvocatoriaSummary,
  LocalityInfo,
  ScoringScheme,
  Temario,
  TierId,
  TierInfo,
} from "../types";
import { rewriteDiagramRefs } from "./assets";
import type { BankFile, DestinationAvailability } from "./bankTypes";

export const DEV_DATA_ENDPOINT = "/__opotai/dev-data";

export interface DevDestinations {
  availability: DestinationAvailability[];
  /** Cuota de plazas por localidad (nombre → 0–1). */
  share: Record<string, number>;
}

export interface DevAssignment {
  order: number;
  province: string;
  locality: string;
  organism: string | null;
  unit: string | null;
}

export interface DevTheory {
  topic: string;
  block: BlockId;
  title: string | null;
  summary: string;
  reading_minutes: number | null;
  key_points: string[];
  sources: { title: string; url: string }[];
  updated: string | null;
  content: string;
}

export interface DevData {
  banks: BankFile[];
  temario: Temario | null;
  schemes: ScoringScheme[];
  default_scheme: string | null;
  convocatorias: ConvocatoriaSummary[];
  target_convocatoria: string | null;
  updated: string | null;
  /** Notas finales (0–100) de los aptos por convocatoria. */
  grades: Record<string, number[]>;
  destinations: Record<string, DevDestinations>;
  /** Adjudicaciones por número de orden (anonimizadas) por convocatoria. */
  assignments: Record<string, DevAssignment[]>;
  tiers: TierInfo[];
  localities: LocalityInfo[];
  theory: DevTheory[];
  /** Texto del fichero LICENSE del repositorio. */
  license: string | null;
}

type Json = Record<string, unknown>;

function looksLikeBank(value: unknown): value is BankFile {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<BankFile>;
  return typeof v.id === "string" && Array.isArray(v.sections) && typeof v.title === "string";
}

function toTemario(raw: unknown): Temario | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as { convocatoria?: string; source?: { title?: string; url?: string }; blocks?: Temario["blocks"] };
  if (!Array.isArray(r.blocks)) return null;
  return {
    convocatoria: r.convocatoria ?? "",
    source_title: r.source?.title ?? "Temario oficial",
    source_url: r.source?.url ?? "",
    blocks: r.blocks.map((b) => ({
      ...b,
      topics: (b.topics ?? []).map((tp) => ({ ...tp, block: b.id, keywords: tp.keywords ?? [] })),
    })),
  };
}

function toConvocatoria(raw: Json): ConvocatoriaSummary {
  const plazas = raw.plazas as { total?: number } | null;
  const cutoff = raw.cutoff as { direct?: number | null; max_direct?: number | null; basis?: ConvocatoriaSummary["cutoff_basis"] } | null;
  return {
    id: String(raw.id),
    access: raw.access as ConvocatoriaSummary["access"],
    year: Number(raw.year),
    title: String(raw.title ?? raw.id),
    exam_date: (raw.exam_date as string | null) ?? null,
    status: raw.status as ConvocatoriaSummary["status"],
    scoring_scheme: (raw.scoring_scheme as string | null) ?? null,
    plazas_total: plazas?.total ?? null,
    presentados: (raw.presentados as number | null) ?? null,
    aptos: (raw.aptos as number | null) ?? null,
    cutoff_direct: cutoff?.direct ?? null,
    cutoff_max_direct: cutoff?.max_direct ?? null,
    cutoff_basis: cutoff?.basis ?? null,
    has_grades: Boolean(raw.grades_of_aptos),
    has_destinations: Boolean(raw.destinations_dataset),
    sources: Array.isArray(raw.sources) ? (raw.sources as { title: string; url: string }[]) : [],
  };
}

function toDestinations(raw: Json | undefined): DevDestinations | null {
  const list = raw?.assignments as { order: number; locality: string }[] | undefined;
  if (!Array.isArray(list) || list.length === 0) return null;
  const maxOrder = list.reduce((m, a) => Math.max(m, a.order), 1);
  const last = new Map<string, number>();
  const count = new Map<string, number>();
  for (const a of list) {
    last.set(a.locality, Math.max(last.get(a.locality) ?? 0, a.order));
    count.set(a.locality, (count.get(a.locality) ?? 0) + 1);
  }
  return {
    availability: [...last.entries()].map(([locality, order]) => ({ locality, last_order_ratio: order / maxOrder })),
    share: Object.fromEntries([...count.entries()].map(([k, n]) => [k, n / list.length])),
  };
}

export function wantsExampleData(): boolean {
  try {
    return new URLSearchParams(window.location.search).get("datos") === "ejemplo";
  } catch {
    return false;
  }
}

export async function loadDevData(): Promise<DevData | null> {
  if (!import.meta.env.DEV || import.meta.env.MODE === "test" || wantsExampleData()) return null;
  try {
    const res = await fetch(`${DEV_DATA_ENDPOINT}/index.json`);
    if (!res.ok) return null;
    const json = (await res.json()) as {
      banks?: unknown[];
      temario?: unknown;
      scoring?: { schemes?: ScoringScheme[]; default_scheme?: string } | null;
      convocatorias?: { convocatorias?: Json[]; target_convocatoria?: string; updated?: string } | null;
      localidades?: { tiers?: TierInfo[]; localities?: Omit<LocalityInfo, "share_of_plazas">[] } | null;
      destinos?: Record<string, Json>;
      teoria?: { index?: { topics?: Json[] } | null; contents?: Record<string, string> } | null;
      license?: string | null;
    };
    const rawConvs = json.convocatorias?.convocatorias ?? [];
    const grades: Record<string, number[]> = {};
    const destinations: Record<string, DevDestinations> = {};
    const assignments: Record<string, DevAssignment[]> = {};
    for (const c of rawConvs) {
      const g = (c.grades_of_aptos as { values?: number[] } | null)?.values;
      if (Array.isArray(g) && g.length) grades[String(c.id)] = g;
      const ds = c.destinations_dataset as string | null;
      const parsed = ds ? toDestinations(json.destinos?.[ds]) : null;
      if (parsed) destinations[String(c.id)] = parsed;
      const raw = ds ? (json.destinos?.[ds]?.assignments as DevAssignment[] | undefined) : undefined;
      if (Array.isArray(raw) && raw.length) assignments[String(c.id)] = raw;
    }
    const theory: DevTheory[] = (json.teoria?.index?.topics ?? [])
      .map((t) => {
        const topic = String(t.topic ?? "");
        const content = json.teoria?.contents?.[topic];
        if (!topic || !content) return null;
        return {
          topic,
          block: topic.split(".")[0] as BlockId,
          title: (t.title as string | null) ?? null,
          summary: String(t.summary ?? ""),
          reading_minutes: (t.reading_minutes as number | null) ?? null,
          key_points: Array.isArray(t.key_points) ? (t.key_points as string[]) : [],
          sources: Array.isArray(t.sources) ? (t.sources as { title: string; url: string }[]) : [],
          updated: (t.updated as string | null) ?? null,
          // Diagramas `![alt](diagramas/…)`: el servidor de desarrollo sirve data/teoria/diagramas/.
          content: rewriteDiagramRefs(content, (p) => `${DEV_DATA_ENDPOINT}/teoria/${p}`),
        };
      })
      .filter((t): t is DevTheory => t !== null);
    return {
      banks: (json.banks ?? []).filter(looksLikeBank),
      temario: toTemario(json.temario),
      schemes: (json.scoring?.schemes ?? []).filter((s) => s && typeof s.id === "string"),
      default_scheme: json.scoring?.default_scheme ?? null,
      convocatorias: rawConvs.map(toConvocatoria),
      target_convocatoria: json.convocatorias?.target_convocatoria ?? null,
      updated: json.convocatorias?.updated ?? null,
      grades,
      destinations,
      assignments,
      tiers: json.localidades?.tiers ?? [],
      localities: (json.localidades?.localities ?? []).map((l) => ({ ...l, tier: l.tier as TierId, share_of_plazas: null })),
      theory,
      license: typeof json.license === "string" ? json.license : null,
    };
  } catch {
    return null;
  }
}
