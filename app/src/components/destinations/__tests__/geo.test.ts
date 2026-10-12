// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import {
  GEO,
  canaryBox,
  findProvince,
  fitTilt,
  makeTilt,
  pathRings,
  placeLabels,
  pointInRings,
  provinceCapital,
  rectsOverlap,
  regionOfProvince,
  splitBalanced,
  tiltPoint,
  type LabelSpec,
  type Obstacle,
  type Rect,
} from "../geo";

const isCanary = (code: string) => code === "35" || code === "38";

describe("datos del mapa (spain-map.json)", () => {
  it("tiene las 52 provincias, las 19 comunidades y ciudades autónomas y 54 capitales", () => {
    expect(GEO.provinces).toHaveLength(52);
    expect(GEO.regions).toHaveLength(19);
    expect(GEO.capitals).toHaveLength(54);
    expect(GEO.regions.map((r) => r.code)).toEqual(Array.from({ length: 19 }, (_, i) => String(i + 1).padStart(2, "0")));
  });

  it("usa los nombres oficiales cortos de las comunidades", () => {
    const names = Object.fromEntries(GEO.regions.map((r) => [r.code, r.name]));
    expect(names["03"]).toBe("Principado de Asturias");
    expect(names["04"]).toBe("Illes Balears");
    expect(names["10"]).toBe("Comunitat Valenciana");
    expect(names["15"]).toBe("Comunidad Foral de Navarra");
    expect(names["18"]).toBe("Ceuta");
  });

  it("cada provincia tiene una comunidad que la incluye y una única capital de provincia", () => {
    for (const p of GEO.provinces) {
      const region = regionOfProvince(p.code);
      expect(region, p.name).not.toBeNull();
      expect(region!.provinces).toContain(p.code);
      expect(GEO.capitals.filter((c) => c.province_code === p.code && c.province_capital)).toHaveLength(1);
      expect(provinceCapital(p.code)?.region_code).toBe(p.region_code);
    }
    expect(GEO.capitals.filter((c) => c.province_capital)).toHaveLength(52);
  });

  it("marca las 20 sedes autonómicas: una por comunidad y dos en Canarias", () => {
    const seats = GEO.capitals.filter((c) => c.region_capital);
    expect(seats).toHaveLength(20);
    for (const r of GEO.regions) {
      const own = seats.filter((c) => c.region_code === r.code).map((c) => c.name);
      expect(own, r.name).toHaveLength(r.code === "05" ? 2 : 1);
      expect(own).toContain(r.capital.name);
    }
    const canarias = GEO.regions.find((r) => r.code === "05")!;
    expect([canarias.capital.name, canarias.co_capital?.name].sort()).toEqual(["Las Palmas de Gran Canaria", "Santa Cruz de Tenerife"]);
  });

  it("Santiago de Compostela y Mérida son sedes autonómicas pero no capitales de provincia", () => {
    const only = GEO.capitals.filter((c) => c.region_capital && !c.province_capital).map((c) => c.name).sort();
    expect(only).toEqual(["Mérida", "Santiago de Compostela"]);
    expect(GEO.capitals.find((c) => c.name === "Mérida")?.ine).toBe("06083");
    expect(GEO.capitals.find((c) => c.name === "Santiago de Compostela")?.ine).toBe("15078");
  });

  it("usa la forma oficial o bilingüe de los nombres y códigos INE de su provincia", () => {
    const names = GEO.capitals.map((c) => c.name);
    for (const n of ["Vitoria-Gasteiz", "Donostia / San Sebastián", "A Coruña", "Ourense", "Girona", "Lleida", "València", "Alacant / Alicante", "Castelló de la Plana", "Palma", "Pamplona / Iruña", "Bilbao"]) {
      expect(names).toContain(n);
    }
    for (const c of GEO.capitals) {
      expect(c.ine).toMatch(/^\d{5}$/);
      expect(c.ine.startsWith(c.province_code), c.name).toBe(true);
    }
  });

  it("las capitales de Canarias caen dentro del recuadro y las demás fuera", () => {
    const box = canaryBox()!;
    const inside = (x: number, y: number) => x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3];
    for (const c of GEO.capitals) expect(inside(c.x, c.y), c.name).toBe(isCanary(c.province_code));
    for (const l of GEO.localities) expect(inside(l.x, l.y), l.locality).toBe(isCanary(l.code));
  });

  it("el recuadro de Canarias no tapa la península y queda abajo a la izquierda", () => {
    const box = canaryBox()!;
    const peninsula = GEO.provinces.filter((p) => !isCanary(p.code));
    for (const p of peninsula) {
      for (const ring of pathRings(p.d)) {
        for (const [x, y] of ring) expect(x >= box[0] && x <= box[2] && y >= box[1] && y <= box[3], p.name).toBe(false);
      }
    }
    const minX = Math.min(...peninsula.map((p) => p.bbox[0]));
    const maxX = Math.max(...peninsula.map((p) => p.bbox[2]));
    const maxY = Math.max(...peninsula.map((p) => p.bbox[3]));
    expect(box[0]).toBeLessThanOrEqual(minX + 1);
    expect(box[2]).toBeLessThan((minX + maxX) / 2);
    expect(box[3]).toBeGreaterThan(maxY);
  });

  it("cada capital está en su provincia y el punto de etiqueta de cada comunidad, dentro de ella", () => {
    for (const c of GEO.capitals) {
      const p = GEO.provinces.find((x) => x.code === c.province_code)!;
      const rings = pathRings(p.d);
      // Las ciudades costeras pueden quedar a un paso del contorno simplificado.
      const near = [0, 1.5, -1.5].some((dx) => [0, 1.5, -1.5].some((dy) => pointInRings(c.x + dx, c.y + dy, rings)));
      expect(near, c.name).toBe(true);
    }
    for (const r of GEO.regions.filter((r) => r.code !== "05")) {
      const rings = pathRings(r.d);
      for (const [x, y] of [r.label, ...r.label_alts]) expect(pointInRings(x, y, rings), r.name).toBe(true);
    }
  });

  it("Ceuta y Melilla tienen contorno (no se pierden al simplificar)", () => {
    for (const code of ["51", "52"]) {
      const p = GEO.provinces.find((x) => x.code === code)!;
      expect(p.bbox[2] - p.bbox[0]).toBeGreaterThan(1);
      expect(pathRings(p.d)[0]!.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("encuentra provincias por sus nombres del BOE", () => {
    expect(findProvince("Illes Balears")?.code).toBe("07");
    expect(findProvince("Bizkaia")?.region_code).toBe("16");
    expect(findProvince("Valencia")?.code).toBe("46");
    expect(findProvince("La Coruña")?.code).toBe("15");
  });
});

describe("tablero y encuadre", () => {
  it("la vista plana no gira ni aplasta", () => {
    const t = makeTilt(0, 1);
    expect(t.a).toBeCloseTo(1);
    expect(t.d).toBeCloseTo(1);
    expect(t.b).toBeCloseTo(0);
    expect(t.c).toBeCloseTo(0);
    const [x, y] = tiltPoint(t, 500, 200);
    const [x2, y2] = tiltPoint(t, 510, 230);
    expect(x2 - x).toBeCloseTo(10);
    expect(y2 - y).toBeCloseTo(30);
  });

  it("el tablero 2.5D es más ancho que alto y todo cabe en él (Canarias incluida)", () => {
    const t = makeTilt(-7, 0.66);
    expect(t.width).toBeGreaterThan(t.height);
    const [x0, y0, x1, y1] = canaryBox()!;
    for (const [x, y] of [
      [x0, y0],
      [x1, y1],
      ...GEO.capitals.map((c) => [c.x, c.y] as const),
    ]) {
      const [u, v] = tiltPoint(t, x!, y!);
      expect(u).toBeGreaterThanOrEqual(-0.01);
      expect(v).toBeGreaterThanOrEqual(-0.01);
      expect(u).toBeLessThanOrEqual(t.width + 0.01);
      expect(v).toBeLessThanOrEqual(t.height + 0.01);
    }
  });

  it("fitTilt encaja el tablero en el panel respetando los márgenes y centrándolo", () => {
    const t = makeTilt(-7, 0.66);
    const pad = { top: 40, right: 10, bottom: 10, left: 10 };
    const f = fitTilt(t, 1000, 600, pad);
    expect(f.ox).toBeGreaterThanOrEqual(10 - 1e-9);
    expect(f.oy).toBeGreaterThanOrEqual(40 - 1e-9);
    expect(f.ox + f.s * t.width).toBeLessThanOrEqual(990 + 1e-9);
    expect(f.oy + f.s * t.height).toBeLessThanOrEqual(590 + 1e-9);
    // Una de las dos dimensiones queda justa.
    const wFull = Math.abs(f.s * t.width - 980) < 1e-6;
    const hFull = Math.abs(f.s * t.height - 550) < 1e-6;
    expect(wFull || hFull).toBe(true);
  });
});

/** Generador pseudoaleatorio determinista (mulberry32). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pointLabel(id: string, x: number, y: number, w: number, h = 14): LabelSpec {
  return {
    id,
    x,
    y,
    options: [
      [6, -h / 2, 6 + w, h / 2],
      [-6 - w, -h / 2, -6, h / 2],
      [-w / 2, 6, w / 2, 6 + h],
      [-w / 2, -6 - h, w / 2, -6],
    ],
  };
}

describe("placeLabels (anticolisión)", () => {
  it("no deja solapes entre etiquetas ni con obstáculos ajenos, ni se sale de los límites", () => {
    for (const seed of [1, 2, 3, 42]) {
      const random = rng(seed);
      const specs: LabelSpec[] = [];
      const obstacles: Obstacle[] = [];
      for (let i = 0; i < 160; i++) {
        const x = 20 + random() * 760;
        const y = 20 + random() * 460;
        specs.push(pointLabel(`l${i}`, x, y, 30 + random() * 90));
        obstacles.push({ rect: [x - 3, y - 3, x + 3, y + 3], owner: `l${i}` });
      }
      const bounds: Rect = [0, 0, 800, 500];
      const placed = [...placeLabels(specs, { obstacles, bounds, gap: 2 }).values()];
      expect(placed.length).toBeGreaterThan(20);
      for (let i = 0; i < placed.length; i++) {
        const a = placed[i]!;
        expect(a.rect[0]).toBeGreaterThanOrEqual(0);
        expect(a.rect[1]).toBeGreaterThanOrEqual(0);
        expect(a.rect[2]).toBeLessThanOrEqual(800);
        expect(a.rect[3]).toBeLessThanOrEqual(500);
        for (let j = i + 1; j < placed.length; j++) expect(rectsOverlap(a.rect, placed[j]!.rect), `${a.id} × ${placed[j]!.id}`).toBe(false);
        for (const o of obstacles) if (o.owner !== a.id) expect(rectsOverlap(a.rect, o.rect), `${a.id} tapa ${String(o.owner)}`).toBe(false);
      }
    }
  });

  it("respeta la prioridad: la primera etiqueta conserva su posición preferida", () => {
    const a = pointLabel("a", 100, 100, 80);
    const b = pointLabel("b", 100, 112, 80);
    const placed = placeLabels([a, b], {});
    expect(placed.get("a")?.option).toBe(0);
    expect(placed.get("b")?.option).toBe(1);
    expect(rectsOverlap(placed.get("a")!.rect, placed.get("b")!.rect)).toBe(false);
    // Con el orden invertido, la que gana es b.
    expect(placeLabels([b, a], {}).get("b")?.option).toBe(0);
  });

  it("omite las que no caben y coloca siempre las obligatorias", () => {
    const blocker: Obstacle = { rect: [0, 0, 400, 400] };
    const placed = placeLabels([pointLabel("libre", 200, 200, 40), { ...pointLabel("pin", 200, 200, 40), required: true }], { obstacles: [blocker] });
    expect(placed.has("libre")).toBe(false);
    expect(placed.get("pin")?.option).toBe(0);
  });

  it("solo evalúa la condición extra de las opciones que llega a probar", () => {
    const tried: number[] = [];
    const spec: LabelSpec = {
      id: "x",
      x: 100,
      y: 100,
      options: [
        [0, 0, 10, 10],
        [20, 0, 30, 10],
        [40, 0, 50, 10],
      ],
      valid: (i) => {
        tried.push(i);
        return i === 1;
      },
    };
    expect(placeLabels([spec], {}).get("x")?.option).toBe(1);
    expect(tried).toEqual([0, 1]);
  });

  it("el símbolo propio no estorba (también si es compartido)", () => {
    const shared: Obstacle = { rect: [90, 90, 110, 110], owner: ["pin", "madrid"] };
    const spec: LabelSpec = { id: "madrid", x: 100, y: 100, options: [[-5, -5, 40, 5]] };
    expect(placeLabels([spec], { obstacles: [shared] }).has("madrid")).toBe(true);
    expect(placeLabels([{ ...spec, id: "otra" }], { obstacles: [shared] }).has("otra")).toBe(false);
  });
});

describe("splitBalanced", () => {
  it("parte los nombres largos en dos líneas equilibradas", () => {
    expect(splitBalanced("COMUNIDAD FORAL DE NAVARRA")).toEqual(["COMUNIDAD FORAL", "DE NAVARRA"]);
    expect(splitBalanced("CASTILLA-LA MANCHA")).toEqual(["CASTILLA-", "LA MANCHA"]);
    expect(splitBalanced("COMUNITAT VALENCIANA")).toEqual(["COMUNITAT", "VALENCIANA"]);
    expect(splitBalanced("ANDALUCÍA")).toBeNull();
  });
});
