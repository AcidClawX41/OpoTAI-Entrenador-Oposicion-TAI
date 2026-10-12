// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Geometría del mapa de destinos: provincias y comunidades autónomas de España ya proyectadas
 * (cónica conforme, con Canarias en un recuadro compacto abajo a la izquierda), capitales de
 * provincia y sedes autonómicas, la transformación «2.5D» (giro + aplastamiento vertical) con la
 * que se dibuja el tablero inclinado, el encuadre en el panel y la colocación de etiquetas sin
 * solapes. Datos: IGN (CC BY 4.0) vía es-atlas; ver `scripts/build-geo.mjs`.
 */
import raw from "@/content/geo/spain-map.json";

export interface GeoProvince {
  code: string;
  name: string;
  /** Comunidad o ciudad autónoma (código INE 01–19). */
  region_code: string;
  aliases: string[];
  d: string;
  cx: number;
  cy: number;
  bbox: [number, number, number, number];
}

/** Sede (capital) de una comunidad autónoma. */
export interface GeoSeat {
  name: string;
  ine: string;
  x: number;
  y: number;
}

export interface GeoRegion {
  code: string;
  name: string;
  provinces: string[];
  d: string;
  /** Punto de etiqueta (interior de la comunidad; en Canarias, arriba del recuadro). */
  label: [number, number];
  /** Otros puntos interiores por si en el principal no cabe el nombre. */
  label_alts: [number, number][];
  capital: GeoSeat;
  /** Capitalidad compartida (Canarias: Las Palmas de Gran Canaria). */
  co_capital?: GeoSeat;
}

export interface GeoCapital {
  name: string;
  ine: string;
  province_code: string;
  region_code: string;
  province_capital: boolean;
  region_capital: boolean;
  x: number;
  y: number;
}

export interface GeoLocality {
  locality: string;
  province: string;
  code: string;
  ine: string;
  x: number;
  y: number;
}

export interface GeoData {
  view_box: [number, number, number, number];
  attribution: string;
  outline: string;
  /** Fronteras entre comunidades autónomas (sin costa). */
  region_borders: string;
  /** Recuadro de Canarias [x0, y0, x1, y1]. */
  inset_box: [number, number, number, number];
  inset_frame: string;
  regions: GeoRegion[];
  provinces: GeoProvince[];
  capitals: GeoCapital[];
  localities: GeoLocality[];
}

export const GEO = raw as unknown as GeoData;

export const normKey = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const byAlias = new Map<string, GeoProvince>();
for (const p of GEO.provinces) for (const a of p.aliases) byAlias.set(a, p);

/** Provincia del mapa para un nombre de provincia tal y como viene del BOE. */
export function findProvince(name: string): GeoProvince | null {
  const key = normKey(name);
  return byAlias.get(key) ?? byAlias.get(key.replace(/^(la|las|el|los|a|o) /, "")) ?? null;
}

const localityIndex = new Map(GEO.localities.map((l) => [`${normKey(l.locality)}|${l.code}`, l]));

/** Posición (sin transformar) de una localidad, si está en el mapa. */
export function findLocality(locality: string, province: string): GeoLocality | null {
  const p = findProvince(province);
  if (!p) return null;
  return localityIndex.get(`${normKey(locality)}|${p.code}`) ?? null;
}

const regionByCode = new Map(GEO.regions.map((r) => [r.code, r]));
const provinceByCode = new Map(GEO.provinces.map((p) => [p.code, p]));
const capitalByProvince = new Map(GEO.capitals.filter((c) => c.province_capital).map((c) => [c.province_code, c]));

/** Comunidad autónoma a la que pertenece una provincia (código INE de provincia). */
export function regionOfProvince(code: string): GeoRegion | null {
  const p = provinceByCode.get(code);
  return (p && regionByCode.get(p.region_code)) ?? null;
}

/** Capital de una provincia (código INE de provincia). */
export function provinceCapital(code: string): GeoCapital | null {
  return capitalByProvince.get(code) ?? null;
}

/** «Alacant/Alicante» → «Alacant / Alicante» (nombres bilingües del IGN, más legibles). */
export const displayName = (name: string) => name.replace(/\s*\/\s*/g, " / ");

// ───────────────────────────── Tablero 2.5D ─────────────────────────────

/** Transformación afín del tablero 2.5D: giro `angle` (grados) y aplastamiento vertical `squash`. */
export interface Tilt {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
  width: number;
  height: number;
}

let boardCache: [number, number][] | null = null;

/** Vértices de todas las provincias y esquinas del recuadro de Canarias (para encuadrar el tablero). */
function boardPoints(): [number, number][] {
  if (boardCache) return boardCache;
  const out: [number, number][] = [];
  for (const p of GEO.provinces) {
    const nums = p.d.match(/-?\d+(?:\.\d+)?/g) ?? [];
    for (let i = 0; i + 1 < nums.length; i += 2) out.push([Number(nums[i]), Number(nums[i + 1])]);
  }
  const [x0, y0, x1, y1] = GEO.inset_box;
  out.push([x0, y0], [x1, y0], [x1, y1], [x0, y1]);
  boardCache = out;
  return out;
}

/**
 * Tablero girado `angle` grados y aplastado `squash` en vertical (0°/1 = mapa plano). El
 * resultado empieza en (margin.x, margin.top) y mide `width` × `height` unidades del mapa.
 */
export function makeTilt(angle = -8, squash = 0.6, margin = { x: 0, top: 0, bottom: 0 }): Tilt {
  const t = (angle * Math.PI) / 180;
  const a = Math.cos(t);
  const b = squash * Math.sin(t);
  const c = -Math.sin(t);
  const d = squash * Math.cos(t);
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const [x, y] of boardPoints()) {
    const u = a * x + c * y;
    const v = b * x + d * y;
    if (u < minX) minX = u;
    if (u > maxX) maxX = u;
    if (v < minY) minY = v;
    if (v > maxY) maxY = v;
  }
  return {
    a,
    b,
    c,
    d,
    e: margin.x - minX,
    f: margin.top - minY,
    width: maxX - minX + 2 * margin.x,
    height: maxY - minY + margin.top + margin.bottom,
  };
}

/** Recuadro de Canarias (coordenadas proyectadas), ampliado `pad` unidades por cada lado. */
export function canaryBox(pad = 0): [number, number, number, number] | null {
  const box = GEO.inset_box;
  if (!box || box.length !== 4) return null;
  return [box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad];
}

/** Punto del mapa (coordenadas proyectadas) en coordenadas del tablero. */
export function tiltPoint(t: Tilt, x: number, y: number): [number, number] {
  return [t.a * x + t.c * y + t.e, t.b * x + t.d * y + t.f];
}

export const tiltMatrix = (t: Tilt) => `matrix(${t.a} ${t.b} ${t.c} ${t.d} ${t.e} ${t.f})`;

/** Encuadre del tablero en un panel: escala `s` y desplazamiento (ox, oy), en píxeles. */
export interface Fit {
  s: number;
  ox: number;
  oy: number;
}

export interface Padding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** Encaja el tablero completo en `width` × `height` píxeles dejando `pad` libre y lo centra. */
export function fitTilt(t: Tilt, width: number, height: number, pad: Padding): Fit {
  const w = Math.max(1, width - pad.left - pad.right);
  const h = Math.max(1, height - pad.top - pad.bottom);
  const s = Math.max(1e-6, Math.min(w / t.width, h / t.height));
  return { s, ox: pad.left + (w - s * t.width) / 2, oy: pad.top + (h - s * t.height) / 2 };
}

// ───────────────────────────── Etiquetas sin solapes ─────────────────────────────

/** Rectángulo [x0, y0, x1, y1] (y hacia abajo). */
export type Rect = [number, number, number, number];

export const rectsOverlap = (a: Rect, b: Rect, gap = 0) =>
  a[0] < b[2] + gap && a[2] + gap > b[0] && a[1] < b[3] + gap && a[3] + gap > b[1];

export interface LabelSpec {
  id: string;
  /** Punto de anclaje. */
  x: number;
  y: number;
  /** Cajas candidatas relativas al ancla, por orden de preferencia. */
  options: Rect[];
  /** Se coloca siempre (en su primera opción libre o, si no hay, en la primera). */
  required?: boolean;
  /** Condición extra de cada opción, evaluada solo cuando se prueba (p. ej. caber dentro de una región). */
  valid?: (option: number) => boolean;
}

/** Zona que ninguna etiqueta puede tapar (p. ej. el símbolo de otra capital). */
export interface Obstacle {
  rect: Rect;
  /** Etiqueta(s) a la(s) que pertenece (su propio símbolo no les estorba). */
  owner?: string | string[];
}

export interface PlacedLabel {
  id: string;
  /** Índice de la opción elegida en `options`. */
  option: number;
  /** Caja absoluta ocupada. */
  rect: Rect;
}

export interface PlaceOptions {
  obstacles?: Obstacle[];
  /** Zona visible: las etiquetas no pueden salirse. */
  bounds?: Rect;
  /** Separación mínima entre etiquetas. */
  gap?: number;
}

/**
 * Colocación voraz por prioridad (el orden de `specs`): cada etiqueta prueba sus posiciones
 * candidatas y toma la primera que no se sale de `bounds`, no tapa un obstáculo ajeno y no
 * solapa ninguna etiqueta ya colocada. Las que no caben se omiten (salvo `required`).
 * Usa una rejilla para que el coste sea casi lineal con cientos de etiquetas.
 */
export function placeLabels(specs: LabelSpec[], { obstacles = [], bounds, gap = 1 }: PlaceOptions = {}): Map<string, PlacedLabel> {
  const CELL = 64;
  const grid = new Map<string, { rect: Rect; owner?: string | string[]; label: boolean }[]>();
  const cells = (r: Rect, g: number) => {
    const out: string[] = [];
    for (let i = Math.floor((r[0] - g) / CELL); i <= Math.floor((r[2] + g) / CELL); i++)
      for (let j = Math.floor((r[1] - g) / CELL); j <= Math.floor((r[3] + g) / CELL); j++) out.push(`${i}:${j}`);
    return out;
  };
  const add = (item: { rect: Rect; owner?: string | string[]; label: boolean }) => {
    for (const c of cells(item.rect, 0)) {
      const list = grid.get(c);
      if (list) list.push(item);
      else grid.set(c, [item]);
    }
  };
  for (const o of obstacles) add({ rect: o.rect, owner: o.owner, label: false });

  const free = (id: string, r: Rect) => {
    if (bounds && (r[0] < bounds[0] || r[1] < bounds[1] || r[2] > bounds[2] || r[3] > bounds[3])) return false;
    for (const c of cells(r, gap)) {
      for (const item of grid.get(c) ?? []) {
        if (!item.label && (item.owner === id || (Array.isArray(item.owner) && item.owner.includes(id)))) continue;
        if (rectsOverlap(r, item.rect, item.label ? gap : 0)) return false;
      }
    }
    return true;
  };

  const placed = new Map<string, PlacedLabel>();
  for (const spec of specs) {
    if (placed.has(spec.id) || !spec.options.length) continue;
    let chosen = -1;
    let rect: Rect | null = null;
    for (let i = 0; i < spec.options.length; i++) {
      const o = spec.options[i]!;
      const r: Rect = [spec.x + o[0], spec.y + o[1], spec.x + o[2], spec.y + o[3]];
      if (free(spec.id, r) && (!spec.valid || spec.valid(i))) {
        chosen = i;
        rect = r;
        break;
      }
    }
    if (!rect && spec.required) {
      const o = spec.options[0]!;
      chosen = 0;
      rect = [spec.x + o[0], spec.y + o[1], spec.x + o[2], spec.y + o[3]];
    }
    if (!rect) continue;
    placed.set(spec.id, { id: spec.id, option: chosen, rect });
    add({ rect, owner: spec.id, label: true });
  }
  return placed;
}

/**
 * Corte de un nombre en dos líneas lo más equilibradas posible (por espacios o tras un guion):
 * «COMUNIDAD FORAL DE NAVARRA» → ["COMUNIDAD FORAL", "DE NAVARRA"], «CASTILLA-LA MANCHA» →
 * ["CASTILLA-", "LA MANCHA"]. Devuelve null si no hay por dónde cortar.
 */
export function splitBalanced(text: string): [string, string] | null {
  const tokens: string[] = [];
  for (const word of text.split(/\s+/)) {
    const parts = word.split("-");
    parts.forEach((p, i) => {
      if (p || i < parts.length - 1) tokens.push(i < parts.length - 1 ? `${p}-` : p);
    });
  }
  const words = tokens.filter(Boolean);
  if (words.length < 2) return null;
  const join = (ts: string[]) => ts.reduce((acc, t) => (!acc ? t : acc.endsWith("-") ? acc + t : `${acc} ${t}`), "");
  let best: [string, string] | null = null;
  let bestScore = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = join(words.slice(0, i));
    const b = join(words.slice(i));
    const score = Math.max(a.length, b.length);
    if (score < bestScore) {
      best = [a, b];
      bestScore = score;
    }
  }
  return best;
}

/** ¿Está (x, y) dentro de los anillos (regla par-impar)? */
export function pointInRings(x: number, y: number, rings: [number, number][][]): boolean {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i]!;
      const [xj, yj] = r[j]!;
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}

/** Anillos de un trazado SVG de solo M/L/Z (como los de `spain-map.json`). */
export function pathRings(d: string): [number, number][][] {
  const rings: [number, number][][] = [];
  for (const part of d.split("M")) {
    const nums = part.match(/-?\d+(?:\.\d+)?/g);
    if (!nums || nums.length < 6) continue;
    const ring: [number, number][] = [];
    for (let i = 0; i + 1 < nums.length; i += 2) ring.push([Number(nums[i]), Number(nums[i + 1])]);
    rings.push(ring);
  }
  return rings;
}

/**
 * Anchura aproximada de un texto en Inter (para cuando no hay lienzo con el que medir, como en
 * los tests). Sobreestima un poco a propósito: mejor un hueco de más que dos nombres pisados.
 */
export function estimateTextWidth(text: string, fontSize: number, weight = 500, letterSpacing = 0): number {
  let em = 0;
  for (const ch of text) {
    if (ch === " ") em += 0.28;
    else if (/[.,:;'·|!ilj]/.test(ch)) em += 0.3;
    else if (/[/()\-–—]/.test(ch)) em += 0.42;
    else if (/[0-9]/.test(ch)) em += 0.62;
    else if (/[mwMW]/.test(ch)) em += 0.86;
    else if (ch === ch.toUpperCase() && ch !== ch.toLowerCase()) em += 0.7;
    else em += 0.56;
  }
  const boldness = 1 + Math.max(0, weight - 400) / 2500;
  return em * fontSize * boldness + letterSpacing * Math.max(0, [...text].length - 1);
}
