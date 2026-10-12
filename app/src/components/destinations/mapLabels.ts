// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Rotulación del mapa de destinos: qué nombres (sedes autonómicas, capitales de provincia y
 * comunidades), cifras de las columnas y pin caben a cada zoom y dónde, sin solaparse. Los rótulos
 * tienen tamaño constante en pantalla: se colocan en «coordenadas de contenido» (el mapa encajado
 * a zoom 1) multiplicadas por el zoom. Prioridad: pin > sedes > cifras > capitales con datos en la
 * métrica actual > nombres de comunidad > resto de capitales.
 */
import type { ProvinceAvailability } from "@/api/types";
import { estimateTextWidth, placeLabels, splitBalanced, type GeoCapital, type GeoProvince, type LabelSpec, type Obstacle, type Rect } from "./geo";

/** Vista del mapa: tablero inclinado con relieve o plano. */
export type MapMode = "tilt" | "flat";
/** Nombres que se rotulan. */
export type MapNames = "all" | "regions" | "none";

/** Aplastamiento vertical del tablero 2.5D (también el de la cara superior de las columnas). */
export const SQUASH = 0.66;
/** Media anchura de las columnas, en píxeles. */
export const PRISM_HALF = 6;
/** Radio de la estrella de las sedes autonómicas, del punto de las capitales y del pin. */
export const STAR_R = 6.5;
export const DOT_R = 3;
export const PIN_R = 6;
/** Interlineado de los nombres de comunidad en dos líneas. */
export const REGION_LINE = 11;
export const FONT_STACK = '"Inter Variable", Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif';

export type LabelKind = "pin" | "regionCapital" | "capital" | "pill" | "regionName";

export const FONTS: Record<LabelKind, { size: number; weight: number; spacing: number; padX: number; height: number }> = {
  pin: { size: 11, weight: 650, spacing: 0, padX: 6, height: 19 },
  regionCapital: { size: 12.5, weight: 650, spacing: 0, padX: 1.5, height: 16 },
  capital: { size: 11, weight: 500, spacing: 0, padX: 1.5, height: 14 },
  pill: { size: 10.5, weight: 600, spacing: 0, padX: 5, height: 17 },
  regionName: { size: 9.5, weight: 600, spacing: 1.3, padX: 1, height: 12 },
};

// ───────────────────────────── Medida de textos ─────────────────────────────

const widthCache = new Map<string, number>();
let measureCtx: CanvasRenderingContext2D | null | undefined;

export function textWidth(text: string, kind: LabelKind): number {
  const f = FONTS[kind];
  const key = `${kind}|${text}`;
  const hit = widthCache.get(key);
  if (hit !== undefined) return hit;
  if (measureCtx === undefined) {
    measureCtx = null;
    if (typeof document !== "undefined" && !/jsdom/i.test(navigator.userAgent)) {
      try {
        measureCtx = document.createElement("canvas").getContext("2d");
      } catch {
        measureCtx = null;
      }
    }
  }
  let w: number;
  if (measureCtx) {
    measureCtx.font = `${f.weight} ${f.size}px ${FONT_STACK}`;
    w = measureCtx.measureText(text).width + f.spacing * Math.max(0, [...text].length - 1);
  } else w = estimateTextWidth(text, f.size, f.weight, f.spacing);
  // Con la fuente aún cargando se mide con la de reserva: no se guarda.
  if (typeof document === "undefined" || !document.fonts || document.fonts.status === "loaded") widthCache.set(key, w);
  return w;
}

// ───────────────────────────── Datos por provincia ─────────────────────────────

/** Provincia con datos: ancla, alturas normalizadas, puntuación en la métrica y cifra. */
export interface Sym {
  code: string;
  geo: GeoProvince;
  datum: ProvinceAvailability;
  capital: GeoCapital | null;
  /** Ancla (coordenadas proyectadas): la capital de la provincia. */
  px: number;
  py: number;
  /** Alturas normalizadas (escala raíz, 0–1). */
  ghost: number;
  fill: number;
  intensity: number;
  score: number;
  value: string;
}

// ───────────────────────────── Rotulación ─────────────────────────────

export type Align = "start" | "middle" | "end";

export interface LabelOption {
  rel: Rect;
  align: Align;
  /** Ancla propia de esta opción (coordenadas de contenido), si no es la del rótulo. */
  at?: [number, number];
  /** Texto partido en líneas (nombres de comunidad largos). */
  lines?: string[];
}

interface Candidate {
  id: string;
  kind: LabelKind;
  text: string;
  /** Ancla en coordenadas de contenido (zoom 1). */
  ax: number;
  ay: number;
  /** Desplazamiento vertical fijo en píxeles (altura de la columna para las cifras). */
  lift: number;
  options: LabelOption[];
  required?: boolean;
  /** Condición adicional de cada opción (se evalúa solo al probarla). */
  valid?: (option: number) => boolean;
}

export interface PlacedItem {
  id: string;
  kind: LabelKind;
  text: string;
  lines: string[];
  ax: number;
  ay: number;
  lift: number;
  rel: Rect;
  align: Align;
}

export interface Marker {
  id: string;
  region: boolean;
  /** Dibujar el punto (en la vista plana, el círculo de datos ya marca la capital). */
  dot: boolean;
  ax: number;
  ay: number;
}

export interface Layout {
  items: PlacedItem[];
  markers: Marker[];
  /** Provincias cuya columna tapa algún rótulo (se dibuja semitransparente). */
  covered: Set<string>;
}

/** Posiciones candidatas alrededor de un punto de radio `r` (las de arriba, al final si hay columna). */
function pointOptions(w: number, h: number, r: number, column: boolean, extra = false): LabelOption[] {
  const g = 2.5;
  const E: LabelOption = { rel: [r + g, -h / 2, r + g + w, h / 2], align: "start" };
  const W: LabelOption = { rel: [-(r + g) - w, -h / 2, -(r + g), h / 2], align: "end" };
  const NE: LabelOption = { rel: [r - 1, -h - r + 2, r - 1 + w, -r + 2], align: "start" };
  const SE: LabelOption = { rel: [r - 1, r - 2, r - 1 + w, r - 2 + h], align: "start" };
  const NW: LabelOption = { rel: [1 - r - w, -h - r + 2, 1 - r, -r + 2], align: "end" };
  const SW: LabelOption = { rel: [1 - r - w, r - 2, 1 - r, r - 2 + h], align: "end" };
  const S: LabelOption = { rel: [-w / 2, r + g, w / 2, r + g + h], align: "middle" };
  const N: LabelOption = { rel: [-w / 2, -h - r - g, w / 2, -r - g], align: "middle" };
  const base = column ? [E, W, SE, SW, S, NE, NW] : [E, W, NE, SE, NW, SW, S, N];
  if (!extra) return base;
  // Sedes autonómicas: también a los lados pero algo más arriba o abajo, y más lejos por debajo.
  const shift = (o: LabelOption, dx: number, dy: number): LabelOption => ({ ...o, rel: [o.rel[0] + dx, o.rel[1] + dy, o.rel[2] + dx, o.rel[3] + dy] });
  return [...base, shift(E, 0, -h / 2 - 1), shift(E, 0, h / 2 + 1), shift(W, 0, -h / 2 - 1), shift(W, 0, h / 2 + 1), shift(S, 0, h / 2 + 2), shift(SE, 4, h / 2), shift(SW, -4, h / 2)];
}

export interface LayoutInput {
  k: number;
  width: number;
  height: number;
  names: MapNames;
  mode: MapMode;
  syms: Sym[];
  heights: Map<string, { top: number; column: boolean }>;
  capitals: { cap: GeoCapital; ax: number; ay: number }[];
  regionLabels: { code: string; name: string; points: [number, number][]; size: number; inside: ((x: number, y: number) => boolean) | null }[];
  pin: { ax: number; ay: number; label: string } | null;
  uiObstacles: Rect[];
}

/** Elige qué rótulos caben a este zoom y dónde (prioridad: pin > sedes > cifras > capitales > comunidades). */
export function computeLayout(input: LayoutInput): Layout {
  const { k, width, height, names, syms, heights, capitals, regionLabels, pin, uiObstacles } = input;
  const scoreByProvince = new Map(syms.map((s) => [s.code, s.score]));
  const candidates: Candidate[] = [];
  const obstacles: Obstacle[] = uiObstacles.map((rect) => ({ rect }));
  const markers: Marker[] = [];

  const visible = names === "none" ? [] : capitals.filter((c) => names === "all" || c.cap.region_capital);
  // En la vista plana el círculo de datos marca la capital: los rótulos se apartan de su borde.
  const bubble = (cap: GeoCapital) => (input.mode === "flat" && cap.province_capital ? (heights.get(cap.province_code)?.top ?? 0) : 0);
  const markerRadius = (cap: GeoCapital) => Math.max(cap.region_capital ? STAR_R : DOT_R, bubble(cap));
  // Los círculos grandes (Madrid) no apartan a los rótulos vecinos: se leen encima, con su halo.
  const obstacleRadius = (cap: GeoCapital) => Math.max(cap.region_capital ? STAR_R : DOT_R, Math.min(bubble(cap), 7));
  for (const c of visible) {
    const id = `cap:${c.cap.ine}`;
    const r = obstacleRadius(c.cap);
    markers.push({ id, region: c.cap.region_capital, dot: !c.cap.region_capital && bubble(c.cap) <= 0, ax: c.ax, ay: c.ay });
    const x = c.ax * k;
    const y = c.ay * k;
    obstacles.push({ rect: [x - r - 0.5, y - r - 0.5, x + r + 0.5, y + r + 0.5], owner: id });
  }

  if (pin) {
    const f = FONTS.pin;
    const w = textWidth(pin.label, "pin") + 2 * f.padX;
    const h = f.height;
    const x = pin.ax * k;
    const y = pin.ay * k;
    // Si el pin cae sobre una capital (lo normal), su símbolo no aparta al nombre de esa capital.
    const under = visible.filter((c) => Math.hypot(c.ax - pin.ax, c.ay - pin.ay) * k < 4).map((c) => `cap:${c.cap.ine}`);
    obstacles.push({ rect: [x - PIN_R, y - PIN_R, x + PIN_R, y + PIN_R], owner: ["pin", ...under] });
    candidates.push({
      id: "pin",
      kind: "pin",
      text: pin.label,
      ax: pin.ax,
      ay: pin.ay,
      lift: 0,
      required: true,
      options: [
        { rel: [PIN_R + 4, -h / 2, PIN_R + 4 + w, h / 2], align: "start" },
        { rel: [-PIN_R - 4 - w, -h / 2, -PIN_R - 4, h / 2], align: "end" },
        { rel: [-w / 2, PIN_R + 4, w / 2, PIN_R + 4 + h], align: "middle" },
        { rel: [-w / 2, -PIN_R - 4 - h, w / 2, -PIN_R - 4], align: "middle" },
      ],
    });
  }

  const byScore = (a: { cap: GeoCapital }, b: { cap: GeoCapital }) =>
    (scoreByProvince.get(b.cap.province_code) ?? 0) - (scoreByProvince.get(a.cap.province_code) ?? 0) || a.cap.name.localeCompare(b.cap.name, "es");
  const capitalCandidate = (c: { cap: GeoCapital; ax: number; ay: number }): Candidate => {
    const kind: LabelKind = c.cap.region_capital ? "regionCapital" : "capital";
    const f = FONTS[kind];
    const w = textWidth(c.cap.name, kind) + 2 * f.padX;
    const column = c.cap.province_capital && (heights.get(c.cap.province_code)?.column ?? false);
    return {
      id: `cap:${c.cap.ine}`,
      kind,
      text: c.cap.name,
      ax: c.ax,
      ay: c.ay,
      lift: 0,
      options: pointOptions(w, f.height, markerRadius(c.cap), column, c.cap.region_capital),
    };
  };

  // Cifras sobre las columnas de las provincias más relevantes.
  const topK = Math.round(6 * k);
  const pills: Candidate[] = [];
  for (const s of [...syms].filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, topK)) {
    const f = FONTS.pill;
    const w = textWidth(s.value, "pill") + 2 * f.padX;
    const h = f.height;
    const anchor = capitals.find((c) => c.cap.province_capital && c.cap.province_code === s.code);
    const side = PRISM_HALF + 3;
    const lift = (heights.get(s.code)?.top ?? 0) + 3;
    const options: LabelOption[] = [
      { rel: [-w / 2, -h, w / 2, 0], align: "middle" },
      { rel: [2, -h + 4, 2 + w, 4], align: "middle" },
      { rel: [-2 - w, -h + 4, -2, 4], align: "middle" },
      { rel: [side, 2, side + w, 2 + h], align: "middle" },
      { rel: [-side - w, 2, -side, 2 + h], align: "middle" },
    ];
    // Columnas altas: también a un lado, a media altura.
    for (const f of lift > 4 * h ? [0.3, 0.55] : []) {
      const dy = lift * f;
      options.push({ rel: [side, dy - h / 2, side + w, dy + h / 2], align: "middle" }, { rel: [-side - w, dy - h / 2, -side, dy + h / 2], align: "middle" });
    }
    pills.push({ id: `pill:${s.code}`, kind: "pill", text: s.value, ax: anchor?.ax ?? s.px, ay: anchor?.ay ?? s.py, lift, options });
  }
  // 1. Sedes autonómicas (todas a zoom 1); 2. cifras.
  candidates.push(...visible.filter((c) => c.cap.region_capital).sort(byScore).map(capitalCandidate));
  candidates.push(...pills);

  // 3. Capitales de provincia: primero las de provincias con datos en la métrica actual.
  const provincial = visible.filter((c) => !c.cap.region_capital).sort(byScore);
  const withData = provincial.filter((c) => (scoreByProvince.get(c.cap.province_code) ?? 0) > 0);
  const rest = provincial.filter((c) => (scoreByProvince.get(c.cap.province_code) ?? 0) <= 0);
  candidates.push(...withData.map(capitalCandidate));

  // 4. Nombres de las comunidades (tenues), dentro de su comunidad y donde quede sitio; 5. resto de capitales.
  if (names !== "none") {
    for (const r of regionLabels) {
      const [main] = r.points;
      if (!main) continue;
      const f = FONTS.regionName;
      const text = r.name.toLocaleUpperCase("es-ES");
      const split = text.length > 12 ? splitBalanced(text) : null;
      const options: LabelOption[] = [];
      for (const lines of split ? [[text], split] : [[text]]) {
        const w = Math.max(...lines.map((l) => textWidth(l, "regionName"))) + 2 * f.padX;
        const h = lines.length > 1 ? lines.length * REGION_LINE + 1 : f.height;
        // En cada punto interior (el mejor primero), centrado o un poco por encima o por debajo,
        // siempre que el rótulo quepa dentro de la comunidad (sus extremos también).
        for (const dy of [0, h / 2 + 2, -h / 2 - 2]) {
          for (const p of r.points) options.push({ rel: [-w / 2, dy - h / 2, w / 2, dy + h / 2], align: "middle", at: p, lines });
        }
      }
      // Solo se comprueba (al probar cada opción) que el rótulo quepa dentro de la comunidad.
      const inside = r.inside;
      const valid = inside
        ? (i: number) => {
            const o = options[i]!;
            const [px, py] = o.at!;
            const cy = py + (o.rel[1] + o.rel[3]) / 2 / k;
            const half = (0.42 * (o.rel[2] - o.rel[0])) / k;
            return inside(px, cy) && inside(px - half, cy) && inside(px + half, cy);
          }
        : undefined;
      candidates.push({ id: `reg:${r.code}`, kind: "regionName", text, ax: main[0], ay: main[1], lift: 0, options, valid });
    }
  }
  candidates.push(...rest.map(capitalCandidate));

  const specs: LabelSpec[] = candidates.map((c) => ({
    id: c.id,
    x: c.ax * k,
    y: c.ay * k - c.lift,
    options: c.options.map((o): Rect => {
      if (!o.at) return o.rel;
      const dx = (o.at[0] - c.ax) * k;
      const dy = (o.at[1] - c.ay) * k;
      return [o.rel[0] + dx, o.rel[1] + dy, o.rel[2] + dx, o.rel[3] + dy];
    }),
    required: c.required,
    valid: c.valid,
  }));
  const placed = placeLabels(specs, { obstacles, bounds: [3, 3, width * k - 3, height * k - 3], gap: 2 });

  const items: PlacedItem[] = [];
  for (const c of candidates) {
    const p = placed.get(c.id);
    const o = p ? c.options[p.option] : undefined;
    if (p && o)
      items.push({
        id: c.id,
        kind: c.kind,
        text: c.text,
        lines: o.lines ?? [c.text],
        ax: o.at?.[0] ?? c.ax,
        ay: o.at?.[1] ?? c.ay,
        lift: c.lift,
        rel: o.rel,
        align: o.align,
      });
  }

  // Columnas que pisan un rótulo ajeno: semitransparentes.
  const covered = new Set<string>();
  if (input.mode === "tilt") {
    const rects = [...placed.values()];
    for (const s of syms) {
      const hgt = heights.get(s.code);
      if (!hgt?.column) continue;
      const anchor = capitals.find((c) => c.cap.province_capital && c.cap.province_code === s.code);
      const x = (anchor?.ax ?? 0) * k;
      const y = (anchor?.ay ?? 0) * k;
      const r: Rect = [x - PRISM_HALF, y - hgt.top, x + PRISM_HALF, y + PRISM_HALF * SQUASH];
      const own = new Set([`pill:${s.code}`, s.capital ? `cap:${s.capital.ine}` : ""]);
      if (rects.some((p) => !own.has(p.id) && p.rect[0] < r[2] && p.rect[2] > r[0] && p.rect[1] < r[3] && p.rect[3] > r[1])) covered.add(s.code);
    }
  }
  return { items, markers, covered };
}

/** Zoom «escalonado» para recolocar rótulos solo al cruzar cada cuarto de octava. */
export const zoomStep = (k: number) => 2 ** (Math.floor(Math.log2(Math.max(1, k)) * 4 + 1e-6) / 4);

