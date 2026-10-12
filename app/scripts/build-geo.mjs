// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
// Genera src/content/geo/spain-map.json: provincias y comunidades autónomas de España ya
// proyectadas (cónica conforme de d3-composite-projections, con Canarias en un recuadro compacto
// abajo a la izquierda), las 52 capitales de provincia y las sedes autonómicas, y la posición de
// cada localidad con destinos.
//
// Datos: límites del Instituto Geográfico Nacional (CC BY 4.0) vía es-atlas (MIT).
// Uso: pnpm geo   (se ejecuta solo al cambiar los datos; el resultado se versiona).
// Autor: Eric Valls Gramunt.

import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { geoCentroid, geoContains, geoPath } from "d3-geo";
// El índice ESM del paquete usa imports sin extensión: se importa el módulo de España directamente.
import geoConicConformalSpain from "d3-composite-projections/src/conicConformalSpain.js";
import { feature, merge, mesh } from "topojson-client";
import { presimplify, quantile, simplify } from "topojson-simplify";

const here = dirname(fileURLToPath(import.meta.url));
const app = join(here, "..");
const repo = join(app, "..");
const atlasDir = join(app, "node_modules", "es-atlas", "es");
const OUT = join(app, "src", "content", "geo", "spain-map.json");

const WIDTH = 1000;
const HEIGHT = 520;
const PAD = 12;
/** Escala del recuadro de Canarias respecto a la península (recuadro compacto). */
const CANARY_SCALE = 0.8;
/** Margen interior del recuadro de Canarias y separación mínima con la península (unidades del mapa). */
const CANARY_PAD = 8;
const CANARY_GAP = 6;
/** Fracción de vértices del IGN (es-atlas) que se conserva al simplificar. */
const SIMPLIFY_KEEP = 0.5;

/** Clave normalizada: minúsculas, sin acentos ni signos. */
const norm = (s) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Variantes de un nombre oficial bilingüe o con artículo pospuesto («Coruña, A»). */
function variants(name) {
  const out = new Set();
  for (const part of name.split("/")) {
    const p = part.trim();
    out.add(norm(p));
    const m = p.match(/^(.*),\s*(A|As|O|Os|El|La|Las|Los|L'|Les|Es|Sa|Ses)$/i);
    if (m) out.add(norm(`${m[2]} ${m[1]}`));
  }
  out.add(norm(name));
  return [...out].filter(Boolean);
}

// Alias de provincias tal y como aparecen en el BOE / en los datos de destinos.
const PROVINCE_ALIASES = {
  "01": ["alava", "araba"],
  "03": ["alicante", "alacant"],
  "07": ["baleares", "illes balears", "islas baleares"],
  "12": ["castellon", "castello"],
  "15": ["la coruna", "coruna"],
  "20": ["guipuzcoa"],
  "26": ["rioja"],
  "31": ["navarra", "nafarroa"],
  "33": ["asturias", "principado de asturias"],
  "46": ["valencia"],
  "48": ["vizcaya"],
};

// Municipios cuyo nombre en los datos no coincide con el del IGN (clave: "localidad|código").
const LOCALITY_OVERRIDES = {
  "palma de mallorca|07": "07040",
  "san sebastian|20": "20069",
  "donostia|20": "20069",
  "vitoria|01": "01059",
  "elche|03": "03065",
  "castellon de la plana|12": "12040",
  "gijon|33": "33024",
  "oviedo|33": "33044",
  "pamplona|31": "31201",
  "iruna|31": "31201",
};

// Comunidades y ciudades autónomas (código INE) con su nombre oficial corto en castellano.
const REGION_NAMES = {
  "01": "Andalucía",
  "02": "Aragón",
  "03": "Principado de Asturias",
  "04": "Illes Balears",
  "05": "Canarias",
  "06": "Cantabria",
  "07": "Castilla y León",
  "08": "Castilla-La Mancha",
  "09": "Cataluña",
  "10": "Comunitat Valenciana",
  "11": "Extremadura",
  "12": "Galicia",
  "13": "Comunidad de Madrid",
  "14": "Región de Murcia",
  "15": "Comunidad Foral de Navarra",
  "16": "País Vasco",
  "17": "La Rioja",
  "18": "Ceuta",
  "19": "Melilla",
};

// Provincia → comunidad autónoma (códigos INE). Se comprueba geométricamente más abajo.
const PROVINCE_REGION = {
  "01": "16", "02": "08", "03": "10", "04": "01", "05": "07", "06": "11", "07": "04", "08": "09", "09": "07",
  "10": "11", "11": "01", "12": "10", "13": "08", "14": "01", "15": "12", "16": "08", "17": "09", "18": "01",
  "19": "08", "20": "16", "21": "01", "22": "02", "23": "01", "24": "07", "25": "09", "26": "17", "27": "12",
  "28": "13", "29": "01", "30": "14", "31": "15", "32": "12", "33": "03", "34": "07", "35": "05", "36": "12",
  "37": "07", "38": "05", "39": "06", "40": "07", "41": "01", "42": "07", "43": "09", "44": "02", "45": "08",
  "46": "10", "47": "07", "48": "16", "49": "07", "50": "02", "51": "18", "52": "19",
};

// Capitales de provincia y sedes de las instituciones autonómicas (forma oficial corta del nombre).
// [provincia, nombre, sede autonómica, capital de provincia]. Canarias tiene capitalidad compartida
// (art. 5 del Estatuto): se listan Santa Cruz de Tenerife y Las Palmas de Gran Canaria, en ese orden.
const CAPITALS = [
  ["01", "Vitoria-Gasteiz", true],
  ["02", "Albacete"],
  ["03", "Alacant / Alicante"],
  ["04", "Almería"],
  ["05", "Ávila"],
  ["06", "Badajoz"],
  ["06", "Mérida", true, false],
  ["07", "Palma", true],
  ["08", "Barcelona", true],
  ["09", "Burgos"],
  ["10", "Cáceres"],
  ["11", "Cádiz"],
  ["12", "Castelló de la Plana"],
  ["13", "Ciudad Real"],
  ["14", "Córdoba"],
  ["15", "A Coruña"],
  ["15", "Santiago de Compostela", true, false],
  ["16", "Cuenca"],
  ["17", "Girona"],
  ["18", "Granada"],
  ["19", "Guadalajara"],
  ["20", "Donostia / San Sebastián"],
  ["21", "Huelva"],
  ["22", "Huesca"],
  ["23", "Jaén"],
  ["24", "León"],
  ["25", "Lleida"],
  ["26", "Logroño", true],
  ["27", "Lugo"],
  ["28", "Madrid", true],
  ["29", "Málaga"],
  ["30", "Murcia", true],
  ["31", "Pamplona / Iruña", true],
  ["32", "Ourense"],
  ["33", "Oviedo", true],
  ["34", "Palencia"],
  ["38", "Santa Cruz de Tenerife", true],
  ["35", "Las Palmas de Gran Canaria", true],
  ["36", "Pontevedra"],
  ["37", "Salamanca"],
  ["39", "Santander", true],
  ["40", "Segovia"],
  ["41", "Sevilla", true],
  ["42", "Soria"],
  ["43", "Tarragona"],
  ["44", "Teruel"],
  ["45", "Toledo", true],
  ["46", "València", true],
  ["47", "Valladolid", true],
  ["48", "Bilbao"],
  ["49", "Zamora"],
  ["50", "Zaragoza", true],
  ["51", "Ceuta", true],
  ["52", "Melilla", true],
];

const errors = [];
const fail = (msg) => errors.push(msg);

const provincesTopo = JSON.parse(readFileSync(join(atlasDir, "provinces.json"), "utf8"));
const muniTopo = JSON.parse(readFileSync(join(atlasDir, "municipalities.json"), "utf8"));

// Simplificación topológica de provincias y comunidades a la vez (conserva fronteras compartidas).
// Se conserva la mitad de los vértices: el mapa ocupa todo el ancho del panel y admite zoom.
const pre = presimplify(provincesTopo);
const minWeight = quantile(pre, SIMPLIFY_KEEP);
// Islas pequeñas, Ceuta y Melilla (anillos de un solo arco) quedarían degenerados: se conservan enteros.
for (const arc of pre.arcs) {
  const first = arc[0];
  const last = arc[arc.length - 1];
  const closed = first[0] === last[0] && first[1] === last[1];
  if (closed && arc.filter((p) => p[2] >= minWeight).length < 8) for (const p of arc) p[2] = Infinity;
}
const simplified = simplify(pre, minWeight);
const provinceGeoms = simplified.objects.provinces.geometries.filter((g) => g.id !== "54"); // Gibraltar
simplified.objects.provinces.geometries = provinceGeoms;
const regionGeoms = simplified.objects.autonomous_regions.geometries.filter((g) => g.id !== "20"); // Gibraltar
simplified.objects.autonomous_regions.geometries = regionGeoms;
const provincesFc = feature(simplified, simplified.objects.provinces);
const regionsFc = feature(simplified, simplified.objects.autonomous_regions);

// ─────────────── Proyección: península + Canarias recolocada ───────────────
// fitExtent de la proyección compuesta recorta Canarias: se usa la escala por defecto ampliada
// (la de 960×500 del paquete) y se encuadra después con el viewBox calculado sobre los datos.
const SCALE = 2700 * (WIDTH / 960);
const base = geoConicConformalSpain()
  .scale(SCALE)
  .translate([WIDTH / 2, (HEIGHT * 250) / 500]);
// Zona del plano en la que la proyección compuesta dibuja Canarias (su clipExtent).
const [tx, ty] = base.translate();
const CANARY_CLIP = [tx - 0.1331 * SCALE, ty + 0.053457 * SCALE, tx - 0.0354 * SCALE, ty + 0.08969 * SCALE];
const inCanaryClip = (x, y) => x >= CANARY_CLIP[0] && x <= CANARY_CLIP[2] && y >= CANARY_CLIP[1] && y <= CANARY_CLIP[3];

/** Recolocación de Canarias: escala `s` respecto a (cx, cy) y traslado a (ox, oy). */
const canary = { s: 1, cx: 0, cy: 0, ox: 0, oy: 0 };
const moveCanary = (x, y) =>
  inCanaryClip(x, y) ? [canary.ox + canary.s * (x - canary.cx), canary.oy + canary.s * (y - canary.cy)] : [x, y];
const projection = {
  stream: (out) =>
    base.stream({
      point: (x, y) => {
        const [a, b] = moveCanary(x, y);
        out.point(a, b);
      },
      lineStart: () => out.lineStart(),
      lineEnd: () => out.lineEnd(),
      polygonStart: () => out.polygonStart(),
      polygonEnd: () => out.polygonEnd(),
      sphere: () => out.sphere?.(),
    }),
};
const project = (lonLat) => {
  const p = base(lonLat);
  return p ? moveCanary(p[0], p[1]) : null;
};
const path = geoPath(projection).digits(1);

/** Anillos proyectados de una geometría (para cálculos geométricos en el plano). */
function ringsOf(geo) {
  const out = [];
  let ring = null;
  geoPath(projection, {
    moveTo(x, y) {
      ring = [[x, y]];
      out.push(ring);
    },
    lineTo(x, y) {
      ring?.push([x, y]);
    },
    closePath() {
      ring = null;
    },
    arc() {},
  })(geo);
  return out;
}

const isCanaryCode = (code) => code === "35" || code === "38";
const peninsula = { type: "FeatureCollection", features: provincesFc.features.filter((f) => !isCanaryCode(f.id)) };
const islands = { type: "FeatureCollection", features: provincesFc.features.filter((f) => isCanaryCode(f.id)) };

// Ningún punto de la península puede caer en la zona de Canarias (si no, se movería con ella).
for (const ring of ringsOf(peninsula)) {
  if (ring.some(([x, y]) => inCanaryClip(x, y))) fail("La península invade la zona de Canarias de la proyección.");
}

/** ¿Corta el segmento ab el rectángulo r? (Liang–Barsky) */
function segmentHitsRect([ax, ay], [bx, by], [x0, y0, x1, y1]) {
  let t0 = 0;
  let t1 = 1;
  const dx = bx - ax;
  const dy = by - ay;
  for (const [p, q] of [
    [-dx, ax - x0],
    [dx, x1 - ax],
    [-dy, ay - y0],
    [dy, y1 - ay],
  ]) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return true;
}

// Recuadro compacto: Canarias a escala CANARY_SCALE, alineada con el borde oeste de la península y
// subida todo lo posible bajo el golfo de Cádiz sin acercarse a menos de CANARY_GAP de tierra.
const [[px0, py0], [, py1]] = path.bounds(peninsula);
const [[cx0, cy0], [cx1, cy1]] = path.bounds(islands);
const boxW = (cx1 - cx0) * CANARY_SCALE + 2 * CANARY_PAD;
const boxH = (cy1 - cy0) * CANARY_SCALE + 2 * CANARY_PAD;
const peninsulaRings = ringsOf(peninsula);
const clashes = (top) => {
  const r = [px0 - CANARY_GAP, top - CANARY_GAP, px0 + boxW + CANARY_GAP, top + boxH + CANARY_GAP];
  return peninsulaRings.some((ring) => ring.some((p, i) => i > 0 && segmentHitsRect(ring[i - 1], p, r)));
};
let boxTop = py1 + CANARY_GAP;
while (boxTop > py0 && !clashes(boxTop - 0.5)) boxTop -= 0.5;
Object.assign(canary, { s: CANARY_SCALE, cx: cx0, cy: cy0, ox: px0 + CANARY_PAD, oy: boxTop + CANARY_PAD });
const round = (n) => Math.round(n * 10) / 10;
const insetBox = [px0, boxTop, px0 + boxW, boxTop + boxH].map(round);

const [[bx0, by0], [bx1, by1]] = path.bounds(provincesFc);
const viewBox = [bx0 - PAD, by0 - PAD, bx1 - bx0 + 2 * PAD, by1 - by0 + 2 * PAD].map((n) => Math.round(n));

// ─────────────── Provincias ───────────────
const provinces = provincesFc.features
  .map((f) => {
    const code = String(f.id).padStart(2, "0");
    const [cx, cy] = path.centroid(f);
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const aliases = new Set([...variants(f.properties.name), ...(PROVINCE_ALIASES[code] ?? [])]);
    const regionCode = PROVINCE_REGION[code];
    if (!regionCode) fail(`Provincia ${code} sin comunidad autónoma`);
    return {
      code,
      name: f.properties.name,
      region_code: regionCode,
      aliases: [...aliases].sort(),
      d: path(f),
      cx: round(cx),
      cy: round(cy),
      bbox: [round(x0), round(y0), round(x1), round(y1)],
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

const outline = path(merge(simplified, provinceGeoms));
// Fronteras entre comunidades (sin costa): se dibujan más marcadas que las provinciales.
const regionBorders = path(mesh(simplified, simplified.objects.autonomous_regions, (a, b) => a !== b));

// ─────────────── Capitales ───────────────
const munis = feature(muniTopo, muniTopo.objects.municipalities).features;
const muniIndex = new Map(); // "código|nombre" -> municipios
for (const m of munis) {
  const prov = String(m.id).slice(0, 2);
  for (const v of variants(m.properties.name)) {
    const key = `${prov}|${v}`;
    muniIndex.set(key, [...(muniIndex.get(key) ?? []), m]);
  }
}
const muniById = new Map(munis.map((m) => [String(m.id), m]));
const regionFeature = new Map(regionsFc.features.map((f) => [String(f.id).padStart(2, "0"), f]));

const capitals = [];
for (const [province, name, regionCapital = false, provinceCapital = true] of CAPITALS) {
  // Búsqueda por nombre dentro del prefijo INE de la provincia (nunca por código escrito a mano).
  const found = new Map();
  for (const v of variants(name)) for (const m of muniIndex.get(`${province}|${v}`) ?? []) found.set(String(m.id), m);
  if (found.size !== 1) {
    fail(`Capital «${name}» (${province}): ${found.size ? `ambigua (${[...found.keys()].join(", ")})` : "no está en municipalities.json"}`);
    continue;
  }
  const [muni] = found.values();
  const regionCode = PROVINCE_REGION[province];
  const region = regionFeature.get(regionCode);
  const centroid = geoCentroid(muni);
  if (!region || !geoContains(region, centroid)) fail(`Capital «${name}»: fuera de la comunidad ${regionCode}`);
  const [x, y] = project(centroid) ?? [NaN, NaN];
  if (!Number.isFinite(x)) fail(`Capital «${name}»: fuera de la proyección`);
  capitals.push({
    name,
    ine: String(muni.id),
    province_code: province,
    region_code: regionCode,
    province_capital: provinceCapital,
    region_capital: regionCapital,
    x: round(x),
    y: round(y),
  });
}

// ─────────────── Comunidades autónomas ───────────────
function pointInRings(x, y, rings) {
  let inside = false;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [xi, yi] = r[i];
      const [xj, yj] = r[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
  }
  return inside;
}
function edgeDistance(x, y, rings) {
  let best = Infinity;
  for (const r of rings) {
    for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
      const [ax, ay] = r[j];
      const [bx, by] = r[i];
      const dx = bx - ax;
      const dy = by - ay;
      const len = dx * dx + dy * dy;
      const t = len ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len)) : 0;
      const ex = ax + t * dx - x;
      const ey = ay + t * dy - y;
      best = Math.min(best, ex * ex + ey * ey);
    }
  }
  return Math.sqrt(best);
}
/** Punto interior más alejado del borde cerca de (x, y) (refinado por rejillas sucesivas). */
function refine(rings, start, step) {
  let best = start;
  for (let iter = 0; iter < 4; iter++) {
    const c = best;
    for (let x = c.x - 2 * step; x <= c.x + 2 * step; x += step / 2) {
      for (let y = c.y - 2 * step; y <= c.y + 2 * step; y += step / 2) {
        if (!pointInRings(x, y, rings)) continue;
        const d = edgeDistance(x, y, rings);
        if (d > best.d) best = { x, y, d };
      }
    }
    step /= 4;
  }
  return best;
}

/**
 * Puntos de etiqueta de una región: el polo de inaccesibilidad (el interior más alejado del borde)
 * y hasta `extra` alternativas bien dentro y separadas entre sí, por si la principal está ocupada.
 */
function labelPoints(rings, extra = 4) {
  const pts = rings.flat();
  const x0 = Math.min(...pts.map((p) => p[0]));
  const x1 = Math.max(...pts.map((p) => p[0]));
  const y0 = Math.min(...pts.map((p) => p[1]));
  const y1 = Math.max(...pts.map((p) => p[1]));
  const step = Math.max(x1 - x0, y1 - y0, 0.4) / 40;
  const cells = [];
  for (let x = x0; x <= x1; x += step) {
    for (let y = y0; y <= y1; y += step) {
      if (pointInRings(x, y, rings)) cells.push({ x, y, d: edgeDistance(x, y, rings) });
    }
  }
  if (!cells.length) return [[round((x0 + x1) / 2), round((y0 + y1) / 2)]];
  cells.sort((a, b) => b.d - a.d);
  const best = refine(rings, cells[0], step);
  const out = [best];
  const sep = Math.max(x1 - x0, y1 - y0) / 5;
  for (const c of cells) {
    if (out.length > extra || c.d < best.d * 0.45) break;
    if (out.every((o) => Math.hypot(o.x - c.x, o.y - c.y) >= sep)) out.push(refine(rings, c, step));
  }
  return out.map((p) => [round(p.x), round(p.y)]);
}

const regions = [...regionFeature.entries()]
  .map(([code, f]) => {
    const name = REGION_NAMES[code];
    if (!name) fail(`Comunidad ${code} (${f.properties.name}) sin nombre`);
    const seats = capitals.filter((c) => c.region_code === code && c.region_capital);
    if (!seats.length) fail(`Comunidad ${name}: sin sede autonómica`);
    const seat = (c) => (c ? { name: c.name, ine: c.ine, x: c.x, y: c.y } : undefined);
    // Canarias: el nombre va arriba, en el centro del recuadro; el resto, en su polo de inaccesibilidad
    // (con alternativas dentro de la comunidad por si ahí no cabe).
    const [label, ...alts] =
      code === "05" ? [[round((insetBox[0] + insetBox[2]) / 2), round(insetBox[1] + CANARY_PAD * 0.9)]] : labelPoints(ringsOf(f));
    return {
      code,
      name,
      provinces: provinces.filter((p) => p.region_code === code).map((p) => p.code),
      d: path(f),
      label,
      label_alts: alts,
      capital: seat(seats[0]),
      ...(seats.length > 1 ? { co_capital: seat(seats[1]) } : {}),
    };
  })
  .sort((a, b) => a.code.localeCompare(b.code));

// ─────────────── Localidades con destinos ───────────────
const provinceByAlias = new Map();
for (const p of provinces) for (const a of p.aliases) provinceByAlias.set(a, p.code);

const wanted = new Map(); // "locality|province" -> {locality, province}
const destinosDir = join(repo, "data", "meta", "destinos");
for (const file of readdirSync(destinosDir).filter((f) => f.endsWith(".json"))) {
  const data = JSON.parse(readFileSync(join(destinosDir, file), "utf8"));
  for (const a of data.assignments ?? []) {
    wanted.set(`${a.locality}|${a.province}`, { locality: a.locality, province: a.province });
  }
}
const localidades = JSON.parse(readFileSync(join(repo, "data", "meta", "localidades.json"), "utf8"));
for (const l of localidades.localities ?? []) {
  wanted.set(`${l.name}|${l.province}`, { locality: l.name, province: l.province });
}

const localities = [];
const missing = [];
for (const { locality, province } of wanted.values()) {
  const code = provinceByAlias.get(norm(province));
  if (!code) {
    missing.push(`${locality} (${province}): provincia desconocida`);
    continue;
  }
  let muni = null;
  for (const v of variants(locality)) {
    // (con nombres repetidos en la provincia gana el último, como en versiones anteriores)
    muni = muniIndex.get(`${code}|${v}`)?.at(-1) ?? muniById.get(LOCALITY_OVERRIDES[`${v}|${code}`] ?? "");
    if (muni) break;
  }
  if (!muni) {
    missing.push(`${locality} (${province})`);
    continue;
  }
  const [x, y] = project(geoCentroid(muni)) ?? [null, null];
  if (x == null) {
    missing.push(`${locality} (${province}): fuera de la proyección`);
    continue;
  }
  localities.push({ locality, province, code, ine: String(muni.id), x: round(x), y: round(y) });
}
localities.sort((a, b) => a.code.localeCompare(b.code) || a.locality.localeCompare(b.locality));

// ─────────────── Comprobaciones ───────────────
if (provinces.length !== 52) fail(`Se esperaban 52 provincias y hay ${provinces.length}`);
if (regions.length !== 19) fail(`Se esperaban 19 comunidades y ciudades autónomas y hay ${regions.length}`);
if (capitals.length !== CAPITALS.length) fail(`Faltan capitales: ${capitals.length} de ${CAPITALS.length}`);
for (const p of provinces) {
  if (capitals.filter((c) => c.province_code === p.code && c.province_capital).length !== 1) fail(`Provincia ${p.name}: sin capital única`);
}
const inBox = (x, y) => x >= insetBox[0] && x <= insetBox[2] && y >= insetBox[1] && y <= insetBox[3];
for (const c of capitals) {
  if (isCanaryCode(c.province_code) !== inBox(c.x, c.y)) fail(`Capital «${c.name}»: posición incoherente con el recuadro de Canarias`);
}

const out = {
  view_box: viewBox,
  attribution: "Límites: © Instituto Geográfico Nacional de España (CC BY 4.0), vía es-atlas.",
  outline,
  region_borders: regionBorders,
  inset_box: insetBox,
  inset_frame: `M${insetBox[0]},${insetBox[1]}H${insetBox[2]}V${insetBox[3]}H${insetBox[0]}Z`,
  regions,
  provinces,
  capitals,
  localities,
};
if (errors.length) {
  console.error(`spain-map.json NO generado (${errors.length} errores):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(out) + "\n");
const kb = (JSON.stringify(out).length / 1024).toFixed(0);
console.log(
  `${provinces.length} provincias, ${regions.length} comunidades, ${capitals.length} capitales ` +
    `(${capitals.filter((c) => c.region_capital).length} sedes autonómicas), ${localities.length} localidades → ${OUT} (${kb} KB)`,
);
if (missing.length) {
  console.error(`Sin localizar (${missing.length}):\n  ${missing.join("\n  ")}`);
  process.exitCode = 1;
}
