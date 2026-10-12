// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Mapa de España del simulador de destinos: tablero 2.5D (o plano) con las provincias coloreadas
 * según la métrica y las fronteras autonómicas marcadas, una columna por provincia que sale de su
 * capital (en «Libres a tu turno», de «cristal» con las plazas que hubo y rellena con las que
 * seguían libres al llegar tu número de orden; en la vista plana, círculos), los nombres de las
 * capitales de provincia y de las sedes autonómicas sin solaparse y a tamaño constante con el
 * zoom, zoom y desplazamiento, y una ficha con los datos de la provincia bajo el cursor.
 * SVG puro (sin WebGL): funciona igual en todas las plataformas y con cualquier escala.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Maximize2, Minus, Plus } from "lucide-react";
import type { ProvinceAvailability } from "@/api/types";
import { Segmented } from "@/components/ui/controls";
import { cn } from "@/lib/cn";
import { formatInt, formatPercent } from "@/lib/format";
import {
  GEO,
  displayName,
  findLocality,
  findProvince,
  fitTilt,
  makeTilt,
  pathRings,
  pointInRings,
  provinceCapital,
  regionOfProvince,
  tiltMatrix,
  tiltPoint,
  type Padding,
  type Tilt,
} from "./geo";
import {
  DOT_R,
  FONTS,
  FONT_STACK,
  PIN_R,
  PRISM_HALF,
  REGION_LINE,
  SQUASH,
  STAR_R,
  computeLayout,
  zoomStep,
  type LabelKind,
  type MapMode,
  type MapNames,
  type PlacedItem,
  type Sym,
} from "./mapLabels";
import { useMapViewport } from "./useMapViewport";

export type MapMetric = "available" | "likely" | "posts";
export type { MapMode, MapNames } from "./mapLabels";

export interface MapPin {
  locality: string;
  province: string;
  label: string;
}

interface SpainMap25DProps {
  provinces: ProvinceAvailability[];
  metric: MapMetric;
  pin?: MapPin | null;
  /** Provincias de las localidades preferidas (se resaltan). */
  preferred?: string[];
  /** Cambia para reanimar las columnas (p. ej. id del escenario). */
  animationKey?: string;
  /** Aviso superpuesto arriba del mapa (p. ej. «sin plaza en este escenario»). */
  notice?: ReactNode;
  className?: string;
}

// ───────────────────────────── Constantes de dibujo ─────────────────────────────

const TILTS: Record<MapMode, Tilt> = { tilt: makeTilt(-7, SQUASH), flat: makeTilt(0, 1) };
const PADS: Record<MapMode, Padding> = {
  tilt: { top: 46, right: 16, bottom: 14, left: 16 },
  flat: { top: 16, right: 16, bottom: 14, left: 16 },
};
const MIN_HEIGHT = 360;
const MAX_ZOOM = 8;
const SLAB_LAYERS = 6;
const SLAB_PX = 13;
/** Opacidad de las columnas que pasan por detrás de algún rótulo. */
const COVERED_OPACITY = 0.62;

function starPath(outer: number, inner: number): string {
  let d = "";
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? inner : outer;
    d += `${i ? "L" : "M"}${(r * Math.cos(a)).toFixed(2)},${(r * Math.sin(a)).toFixed(2)}`;
  }
  return `${d}Z`;
}
const STAR = starPath(STAR_R, STAR_R * 0.46);

// Recuerda la vista y los nombres elegidos mientras la app siga abierta.
const prefs: { mode: MapMode; names: MapNames } = { mode: "tilt", names: "all" };

// ───────────────────────────── Datos por provincia ─────────────────────────────

const rootScale = (v: number, max: number) => (v <= 0 || max <= 0 ? 0 : Math.sqrt(v / max));

function scoreOf(metric: MapMetric, d: ProvinceAvailability): number {
  return metric === "likely" ? d.p_likely : metric === "available" ? d.available_posts : d.posts;
}

function valueText(metric: MapMetric, d: ProvinceAvailability): string {
  if (metric === "likely") return formatPercent(d.p_likely, d.p_likely < 0.1 ? 1 : 0);
  if (metric === "available") return `${formatInt(Math.round(d.available_posts))}/${formatInt(d.posts)}`;
  return formatInt(d.posts);
}

const METRIC_TEXT: Record<MapMetric, string> = {
  available: "plazas libres al llegar tu turno",
  likely: "probabilidad de acabar en cada provincia",
  posts: "plazas adjudicadas",
};

// ───────────────────────────── Columnas ─────────────────────────────

function prismFaces(x: number, y: number, h: number, half: number) {
  const k = half * SQUASH;
  const top = y - h;
  return {
    top: `${x},${top - k} ${x + half},${top} ${x},${top + k} ${x - half},${top}`,
    left: `${x - half},${top} ${x},${top + k} ${x},${y + k} ${x - half},${y}`,
    right: `${x},${top + k} ${x + half},${top} ${x + half},${y} ${x},${y + k}`,
  };
}

function Prism({ x, y, ghost, fill, active }: { x: number; y: number; ghost: number; fill: number; active?: boolean }) {
  const g = ghost > 0 ? prismFaces(x, y, ghost, PRISM_HALF) : null;
  const f = fill > 0 ? prismFaces(x, y, fill, PRISM_HALF) : null;
  return (
    <>
      <ellipse cx={x} cy={y + PRISM_HALF * SQUASH * 0.5} rx={PRISM_HALF * 1.5} ry={PRISM_HALF * 0.7} fill="black" opacity={0.16} />
      {g ? (
        <g opacity={active ? 0.85 : 0.6}>
          <polygon points={g.left} style={{ fill: "color-mix(in oklab, var(--app-fg) 12%, transparent)" }} />
          <polygon points={g.right} style={{ fill: "color-mix(in oklab, var(--app-fg) 7%, transparent)" }} />
          <polygon
            points={g.top}
            style={{
              fill: "color-mix(in oklab, var(--app-fg) 16%, transparent)",
              stroke: "color-mix(in oklab, var(--app-fg) 40%, transparent)",
              strokeWidth: 0.7,
            }}
          />
        </g>
      ) : null}
      {f ? (
        <g style={{ stroke: "color-mix(in oklab, var(--app-accent) 45%, white)", strokeWidth: 0.6, strokeLinejoin: "round" }}>
          <polygon points={f.left} style={{ fill: "color-mix(in oklab, var(--app-accent) 80%, black)" }} />
          <polygon points={f.right} style={{ fill: "color-mix(in oklab, var(--app-accent) 94%, white)" }} />
          <polygon
            points={f.top}
            style={{ fill: active ? "color-mix(in oklab, var(--app-accent) 40%, white)" : "color-mix(in oklab, var(--app-accent) 58%, white)" }}
          />
        </g>
      ) : null}
    </>
  );
}

function Bubble({ x, y, ghost, fill, active }: { x: number; y: number; ghost: number; fill: number; active?: boolean }) {
  return (
    <>
      {ghost > 0 ? (
        <circle
          cx={x}
          cy={y}
          r={ghost}
          style={{
            fill: "color-mix(in oklab, var(--app-fg) 7%, transparent)",
            stroke: "color-mix(in oklab, var(--app-fg) 42%, transparent)",
            strokeWidth: active ? 1.4 : 1,
          }}
        />
      ) : null}
      {fill > 0 ? (
        <circle
          cx={x}
          cy={y}
          r={fill}
          style={{
            fill: "color-mix(in oklab, var(--app-accent) 82%, transparent)",
            stroke: active ? "var(--app-fg)" : "color-mix(in oklab, var(--app-accent) 60%, white)",
            strokeWidth: active ? 1.5 : 1,
          }}
        />
      ) : null}
    </>
  );
}

// ───────────────────────────── Tamaño del panel ─────────────────────────────

/** Anchura o altura de un elemento (0 si no existe), actualizada al cambiar de tamaño. */
function useElementSize(ref: React.RefObject<HTMLElement | null>, axis: "width" | "height", active = true): number {
  const [size, setSize] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !active) {
      setSize(0);
      return;
    }
    const measure = () => setSize(Math.round(el.getBoundingClientRect()[axis]));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, axis, active]);
  return size;
}

function useWindowHeight(): number {
  const [h, setH] = useState(() => (typeof window === "undefined" ? 900 : window.innerHeight || 900));
  useEffect(() => {
    const onResize = () => setH(window.innerHeight || 900);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return h;
}

// ───────────────────────────── Componente ─────────────────────────────

export function SpainMap25D({ provinces, metric, pin, preferred = [], animationKey, notice, className }: SpainMap25DProps) {
  const uid = useId();
  const reduced = useReducedMotion() ?? false;
  const [mode, setModeState] = useState<MapMode>(prefs.mode);
  const [names, setNamesState] = useState<MapNames>(prefs.names);
  const [hover, setHover] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const noticeRef = useRef<HTMLDivElement>(null);

  const setMode = (m: MapMode) => {
    prefs.mode = m;
    setModeState(m);
  };
  const setNames = (n: MapNames) => {
    prefs.names = n;
    setNamesState(n);
  };

  // ── Encaje en el panel: todo el ancho, alto según la forma del tablero (sin pasarse de la ventana).
  const measured = useElementSize(wrapRef, "width");
  const noticeHeight = useElementSize(noticeRef, "height", Boolean(notice));
  const windowHeight = useWindowHeight();
  const width = measured || 960;
  const tilt = TILTS[mode];
  // El aviso (si lo hay) ocupa la parte de arriba: el mapa empieza debajo.
  const pad = useMemo(() => {
    const base = PADS[mode];
    return noticeHeight ? { ...base, top: Math.max(base.top, noticeHeight + 20) } : base;
  }, [mode, noticeHeight]);
  const natural = (width - pad.left - pad.right) * (tilt.height / tilt.width) + pad.top + pad.bottom;
  const height = Math.round(Math.max(MIN_HEIGHT, Math.min(natural, Math.max(MIN_HEIGHT, windowHeight * 0.88))));
  const fit = useMemo(() => fitTilt(tilt, width, height, pad), [tilt, width, height, pad]);
  const toContent = useMemo(
    () =>
      (x: number, y: number): [number, number] => {
        const [u, v] = tiltPoint(tilt, x, y);
        return [fit.ox + fit.s * u, fit.oy + fit.s * v];
      },
    [tilt, fit],
  );

  const { view, dragging, hint, zoomBy, reset, handlers } = useMapViewport(viewportRef, width, height, { maxZoom: MAX_ZOOM, reducedMotion: reduced });
  useEffect(() => {
    reset(true);
  }, [mode, width, height, reset]);

  // ── Datos por provincia.
  const { byCode, syms } = useMemo(() => {
    const byCode = new Map<string, ProvinceAvailability>();
    for (const d of provinces) {
      const g = findProvince(d.province);
      if (!g) continue;
      const prev = byCode.get(g.code);
      byCode.set(
        g.code,
        prev
          ? {
              ...prev,
              posts: prev.posts + d.posts,
              available_posts: prev.available_posts + d.available_posts,
              p_available: Math.max(prev.p_available, d.p_available),
              p_likely: prev.p_likely + d.p_likely,
              last_order: Math.max(prev.last_order, d.last_order),
            }
          : d,
      );
    }
    const list = [...byCode.values()];
    const maxPosts = Math.max(1, ...list.map((d) => d.posts));
    const maxLikely = Math.max(1e-9, ...list.map((d) => d.p_likely));
    const syms: Sym[] = [];
    for (const geo of GEO.provinces) {
      const datum = byCode.get(geo.code);
      if (!datum) continue;
      const capital = provinceCapital(geo.code);
      let ghost = 0;
      let fill = 0;
      let intensity = 0;
      if (metric === "available") {
        ghost = rootScale(datum.posts, maxPosts);
        fill = datum.available_posts > 0 ? rootScale(datum.available_posts, maxPosts) : 0;
        intensity = datum.p_available;
      } else if (metric === "likely") {
        fill = rootScale(datum.p_likely, maxLikely);
        intensity = datum.p_likely / maxLikely;
      } else {
        fill = rootScale(datum.posts, maxPosts);
        intensity = Math.sqrt(datum.posts / maxPosts);
      }
      syms.push({
        code: geo.code,
        geo,
        datum,
        capital,
        px: capital?.x ?? geo.cx,
        py: capital?.y ?? geo.cy,
        ghost,
        fill,
        intensity,
        score: scoreOf(metric, datum),
        value: valueText(metric, datum),
      });
    }
    return { byCode, syms };
  }, [provinces, metric]);
  const symByCode = useMemo(() => new Map(syms.map((s) => [s.code, s])), [syms]);

  // ── Tamaño de los símbolos (constante en pantalla).
  const hMax = Math.max(60, Math.min(140, height * 0.2));
  const rMax = Math.max(14, Math.min(34, width * 0.03));
  const symbolSize = useMemo(() => {
    const m = new Map<string, { ghost: number; fill: number; top: number; column: boolean }>();
    for (const s of syms) {
      if (mode === "tilt") {
        const ghost = s.ghost > 0 ? Math.max(3, hMax * s.ghost) : 0;
        const fill = s.fill > 0 ? Math.max(3, hMax * s.fill) : 0;
        const top = Math.max(ghost, fill);
        m.set(s.code, { ghost, fill, top: top + PRISM_HALF * SQUASH, column: top >= 8 });
      } else {
        // Mínimo: que asome alrededor de la estrella de las sedes y sustituya al punto de las capitales.
        const min = s.capital?.region_capital ? STAR_R + 2.5 : 4;
        const ghost = s.ghost > 0 ? Math.max(min, rMax * s.ghost) : 0;
        const fill = s.fill > 0 ? Math.max(min, rMax * s.fill) : 0;
        m.set(s.code, { ghost, fill, top: Math.max(ghost, fill), column: false });
      }
    }
    return m;
  }, [syms, mode, hMax, rMax]);

  const preferredCodes = useMemo(
    () => new Set(preferred.map((p) => findProvince(p)?.code).filter((c): c is string => Boolean(c))),
    [preferred],
  );

  // ── Anclas en coordenadas de contenido (zoom 1).
  const capitals = useMemo(
    () =>
      GEO.capitals.map((cap) => {
        const [ax, ay] = toContent(cap.x, cap.y);
        return { cap, ax, ay };
      }),
    [toContent],
  );
  const capitalAnchor = useMemo(() => {
    const m = new Map<string, [number, number]>();
    for (const c of capitals) if (c.cap.province_capital) m.set(c.cap.province_code, [c.ax, c.ay]);
    return m;
  }, [capitals]);
  const regionLabels = useMemo(
    () =>
      GEO.regions
        // Ceuta y Melilla: el nombre de la ciudad ya lo dice todo.
        .filter((r) => r.name !== r.capital.name)
        .map((r) => {
          // Canarias se rotula sobre el mar, arriba del recuadro: sin comprobación de interior.
          const rings = r.code === "05" ? null : pathRings(r.d).map((ring) => ring.map(([x, y]) => toContent(x, y)));
          const flat = rings?.flat() ?? [];
          const [x0, x1] = [Math.min(...flat.map((p) => p[0])), Math.max(...flat.map((p) => p[0]))];
          const [y0, y1] = [Math.min(...flat.map((p) => p[1])), Math.max(...flat.map((p) => p[1]))];
          return {
            code: r.code,
            name: r.name,
            points: [r.label, ...(r.label_alts ?? [])].map(([x, y]) => toContent(x, y)),
            size: r.provinces.length,
            inside: rings ? (x: number, y: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1 && pointInRings(x, y, rings) : null,
          };
        })
        .sort((a, b) => b.size - a.size),
    [toContent],
  );
  const pinPoint = useMemo(() => {
    if (!pin) return null;
    const loc = findLocality(pin.locality, pin.province);
    const geo = loc ? null : findProvince(pin.province);
    const p = loc ? toContent(loc.x, loc.y) : geo ? toContent(geo.cx, geo.cy) : null;
    return p ? { ax: p[0], ay: p[1], label: pin.label } : null;
  }, [pin, toContent]);

  // ── Rótulos: se recolocan al cruzar cada escalón de zoom.
  const k = view.k;
  const kStep = zoomStep(k);
  const layout = useMemo(
    () =>
      computeLayout({
        k: kStep,
        width,
        height,
        names,
        mode,
        syms,
        heights: symbolSize,
        capitals,
        regionLabels,
        pin: pinPoint,
        // A zoom 1, los botones de zoom y la atribución (abajo a la derecha) también estorban.
        uiObstacles:
          kStep === 1
            ? [
                [width - 52, height - 132, width, height],
                [width - 160, height - 18, width, height],
              ]
            : [],
      }),
    [kStep, width, height, names, mode, syms, symbolSize, capitals, regionLabels, pinPoint],
  );

  // ── Relieve del tablero 2.5D: grosor casi constante en pantalla (crece con la raíz del zoom).
  const matrix = tiltMatrix(tilt);
  const slabLayer = useMemo(() => {
    if (mode !== "tilt") return null;
    const thickness = (SLAB_PX * Math.sqrt(kStep)) / (fit.s * kStep);
    const step = thickness / SLAB_LAYERS;
    return (
      <>
        <path d={GEO.outline} transform={`translate(0 ${thickness + 5 / (fit.s * kStep)}) ${matrix}`} style={{ fill: "black", opacity: 0.16 }} />
        {Array.from({ length: SLAB_LAYERS }, (_, i) => SLAB_LAYERS - i).map((i) => (
          <path
            key={i}
            d={GEO.outline}
            transform={`translate(0 ${i * step}) ${matrix}`}
            style={{
              fill: `color-mix(in oklab, var(--app-accent) ${Math.round(24 + (18 * (SLAB_LAYERS - i)) / SLAB_LAYERS)}%, color-mix(in oklab, var(--app-surface-3) ${Math.round(40 + (34 * (SLAB_LAYERS - i)) / SLAB_LAYERS)}%, black))`,
            }}
          />
        ))}
      </>
    );
  }, [mode, fit.s, kStep, matrix]);

  // ── Provincias y fronteras (no dependen del zoom ni del cursor).
  const baseLayer = useMemo(() => {
    const [bx0, by0, bx1, by1] = GEO.inset_box;
    return (
      <>
        <g transform={matrix}>
          {GEO.provinces.map((g) => {
            const s = symByCode.get(g.code);
            return (
              <path
                key={g.code}
                data-code={g.code}
                d={g.d}
                className="cursor-pointer transition-[fill] duration-300"
                style={{
                  fill: s
                    ? `color-mix(in oklab, var(--app-accent) ${Math.round(10 + s.intensity * 32)}%, var(--app-surface-3))`
                    : "color-mix(in oklab, var(--app-surface-3) 92%, var(--app-fg))",
                  stroke: "color-mix(in oklab, var(--app-fg) 17%, transparent)",
                  strokeWidth: 0.6,
                  strokeLinejoin: "round",
                  vectorEffect: "non-scaling-stroke",
                }}
              />
            );
          })}
          <path
            d={GEO.region_borders}
            fill="none"
            pointerEvents="none"
            style={{
              stroke: "color-mix(in oklab, var(--app-fg) 46%, transparent)",
              strokeWidth: 1.5,
              strokeLinejoin: "round",
              strokeLinecap: "round",
              vectorEffect: "non-scaling-stroke",
            }}
          />
          <path
            d={GEO.outline}
            fill="none"
            pointerEvents="none"
            style={{ stroke: "color-mix(in oklab, var(--app-fg) 30%, transparent)", strokeWidth: 0.9, vectorEffect: "non-scaling-stroke" }}
          />
          {GEO.provinces
            .filter((g) => preferredCodes.has(g.code))
            .map((g) => (
              <path
                key={`pref-${g.code}`}
                d={g.d}
                fill="none"
                pointerEvents="none"
                style={{ stroke: "var(--app-warning)", strokeWidth: 2.2, strokeLinejoin: "round", vectorEffect: "non-scaling-stroke" }}
              />
            ))}
          <rect
            x={bx0}
            y={by0}
            width={bx1 - bx0}
            height={by1 - by0}
            rx={7}
            fill="none"
            pointerEvents="none"
            style={{ stroke: "var(--app-fg-subtle)", strokeDasharray: "5 4", strokeWidth: 1, vectorEffect: "non-scaling-stroke", opacity: 0.6 }}
          />
        </g>
      </>
    );
  }, [matrix, symByCode, preferredCodes]);

  // ── Columnas o círculos (tamaño constante en pantalla). Cada uno se dibuja en coordenadas
  // locales (memorizado) y en cada fotograma de zoom solo cambia el `translate` que lo envuelve.
  const symbolItems = useMemo(() => {
    const order = [...syms].sort((a, b) =>
      mode === "tilt" ? (capitalAnchor.get(a.code)?.[1] ?? 0) - (capitalAnchor.get(b.code)?.[1] ?? 0) : (symbolSize.get(b.code)?.top ?? 0) - (symbolSize.get(a.code)?.top ?? 0),
    );
    return order.flatMap((s, i) => {
      const size = symbolSize.get(s.code);
      if (!size) return [];
      const anchor = capitalAnchor.get(s.code) ?? toContent(s.px, s.py);
      const el = (
        <motion.g
          key={`${animationKey ?? ""}-${metric}-${mode}`}
          initial={reduced ? false : { scaleY: 0, opacity: 0 }}
          animate={{ scaleY: 1, opacity: layout.covered.has(s.code) ? COVERED_OPACITY : 1 }}
          transition={{ duration: 0.55, delay: reduced ? 0 : 0.12 + Math.min(i, 30) * 0.012, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformBox: "fill-box", transformOrigin: mode === "tilt" ? "50% 100%" : "50% 50%" }}
        >
          {mode === "tilt" ? <Prism x={0} y={0} ghost={size.ghost} fill={size.fill} /> : <Bubble x={0} y={0} ghost={size.ghost} fill={size.fill} />}
        </motion.g>
      );
      return [{ code: s.code, anchor, el }];
    });
  }, [syms, symbolSize, capitalAnchor, toContent, layout.covered, animationKey, metric, mode, reduced]);
  const symbolLayer = useMemo(
    () =>
      symbolItems.map((it) => (
        <g key={it.code} data-code={it.code} className="cursor-pointer" transform={`translate(${it.anchor[0] * k} ${it.anchor[1] * k})`}>
          {it.el}
        </g>
      )),
    [symbolItems, k],
  );

  // ── Rótulos (memorizados por escalón de zoom, en coordenadas relativas a su ancla).
  const labelItems = useMemo(() => {
    const halo = (w: number) => ({
      paintOrder: "stroke" as const,
      stroke: "var(--app-surface)",
      strokeWidth: w,
      strokeLinejoin: "round" as const,
      strokeOpacity: 0.92,
    });
    const textX = (item: PlacedItem) => {
      const f = FONTS[item.kind];
      return item.align === "start" ? item.rel[0] + f.padX : item.align === "end" ? item.rel[2] - f.padX : (item.rel[0] + item.rel[2]) / 2;
    };
    const midY = (item: PlacedItem) => (item.rel[1] + item.rel[3]) / 2;
    const box = (item: PlacedItem, rx: number, style: React.CSSProperties) => (
      <rect x={item.rel[0]} y={item.rel[1]} width={item.rel[2] - item.rel[0]} height={item.rel[3] - item.rel[1]} rx={rx} style={style} />
    );
    return layout.items.map((item) => {
      let el: ReactNode;
      if (item.kind === "regionName") {
        const tx = textX(item);
        el = (
          <text
            x={tx}
            y={midY(item)}
            textAnchor="middle"
            dominantBaseline="central"
            style={{
              ...halo(2.6),
              fill: "var(--app-fg-subtle)",
              fontSize: FONTS.regionName.size,
              fontWeight: FONTS.regionName.weight,
              letterSpacing: `${FONTS.regionName.spacing}px`,
              opacity: 0.9,
            }}
          >
            {item.lines.length > 1
              ? item.lines.map((line, i) => (
                  <tspan key={i} x={tx} dy={i === 0 ? -((item.lines.length - 1) * REGION_LINE) / 2 : REGION_LINE}>
                    {line}
                  </tspan>
                ))
              : item.text}
          </text>
        );
      } else if (item.kind === "pill") {
        el = (
          <>
            {box(item, 5, { fill: "var(--app-surface)", fillOpacity: 0.9, stroke: "var(--app-border-strong)", strokeWidth: 0.8 })}
            <text
              x={textX(item)}
              y={midY(item) + 0.5}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fill: "var(--app-accent-text)", fontSize: FONTS.pill.size, fontWeight: FONTS.pill.weight, fontVariantNumeric: "tabular-nums" }}
            >
              {item.text}
            </text>
          </>
        );
      } else if (item.kind === "pin") {
        el = (
          <>
            {box(item, 6, { fill: "var(--app-warning)" })}
            <text x={textX(item)} y={midY(item) + 0.5} textAnchor={item.align} dominantBaseline="central" style={{ fill: "black", fontSize: FONTS.pin.size, fontWeight: FONTS.pin.weight }}>
              {item.text}
            </text>
          </>
        );
      } else {
        const f = FONTS[item.kind];
        el = (
          <text
            x={textX(item)}
            y={midY(item)}
            textAnchor={item.align}
            dominantBaseline="central"
            style={{
              ...halo(item.kind === "regionCapital" ? 3.2 : 2.8),
              fill: item.kind === "regionCapital" ? "var(--app-fg)" : "color-mix(in oklab, var(--app-fg) 86%, var(--app-surface))",
              fontSize: f.size,
              fontWeight: f.weight,
            }}
          >
            {item.text}
          </text>
        );
      }
      return { item, el };
    });
  }, [layout]);

  // Solo cambia con el zoom (al desplazar, la capa entera se traslada).
  const labelLayer = useMemo(() => {
    const labelsOf = (...kinds: LabelKind[]) =>
      labelItems
        .filter(({ item }) => kinds.includes(item.kind))
        .map(({ item, el }) => (
          <g key={item.id} transform={`translate(${item.ax * k} ${item.ay * k - item.lift})`}>
            {el}
          </g>
        ));
    return (
    <g pointerEvents="none" style={{ fontFamily: FONT_STACK }}>
      {/* Nombres de las comunidades: debajo de todo, tenues. */}
      {labelsOf("regionName")}
      {/* Símbolos: punto (capital de provincia) y estrella (sede autonómica). */}
      {layout.markers
        .filter((m) => m.dot)
        .map((m) => (
          <circle key={m.id} cx={m.ax * k} cy={m.ay * k} r={DOT_R} style={{ fill: "var(--app-fg)", stroke: "var(--app-surface)", strokeWidth: 1.3, opacity: 0.85 }} />
        ))}
      {layout.markers
        .filter((m) => m.region)
        .map((m) => (
          <path
            key={m.id}
            d={STAR}
            transform={`translate(${m.ax * k} ${m.ay * k})`}
            style={{ fill: "var(--app-fg)", stroke: "var(--app-surface)", strokeWidth: 1.4, strokeLinejoin: "round" }}
          />
        ))}
      {labelsOf("capital", "regionCapital")}
      {/* Cifras sobre las columnas. */}
      {labelsOf("pill")}
      {/* Pin: lo más probable. */}
      {pinPoint ? (
        <g>
          <circle
            cx={pinPoint.ax * k}
            cy={pinPoint.ay * k}
            r={PIN_R * 1.9}
            className="motion-safe:animate-ping"
            // Tres latidos y queda fijo: un latido infinito repinta el mapa en cada fotograma, caro
            // sin aceleración gráfica (WebKitGTK por software).
            style={{ fill: "color-mix(in oklab, var(--app-warning) 40%, transparent)", transformBox: "fill-box", transformOrigin: "center", animationIterationCount: 3 }}
          />
          <circle
            cx={pinPoint.ax * k}
            cy={pinPoint.ay * k}
            r={PIN_R - 1}
            style={{ fill: "var(--app-warning)", stroke: "white", strokeWidth: 2, filter: "drop-shadow(0 0 5px var(--app-warning))" }}
          />
          {labelsOf("pin")}
        </g>
      ) : null}
    </g>
    );
  }, [labelItems, layout.markers, k, pinPoint]);

  // ── Resaltado y ficha de la provincia bajo el cursor.
  const hovered = hover && !dragging ? GEO.provinces.find((g) => g.code === hover) ?? null : null;
  const hoveredRegion = hovered ? regionOfProvince(hovered.code) : null;
  const hoveredSym = hovered ? symByCode.get(hovered.code) ?? null : null;
  const hoverLayer = hovered ? (
    <g transform={matrix} pointerEvents="none">
      {hoveredRegion ? (
        <path
          d={hoveredRegion.d}
          fill="none"
          style={{ stroke: "color-mix(in oklab, var(--app-accent) 70%, var(--app-fg))", strokeWidth: 1.8, strokeDasharray: "4 3", vectorEffect: "non-scaling-stroke" }}
        />
      ) : null}
      <path
        d={hovered.d}
        style={{
          fill: "color-mix(in oklab, var(--app-accent) 22%, transparent)",
          stroke: "var(--app-accent)",
          strokeWidth: 2,
          strokeLinejoin: "round",
          vectorEffect: "non-scaling-stroke",
        }}
      />
    </g>
  ) : null;
  const hoverSymbol = (() => {
    if (!hoveredSym) return null;
    const size = symbolSize.get(hoveredSym.code);
    const anchor = capitalAnchor.get(hoveredSym.code);
    if (!size || !anchor) return null;
    const x = anchor[0] * k;
    const y = anchor[1] * k;
    return (
      <g pointerEvents="none">
        {mode === "tilt" ? <Prism x={x} y={y} ghost={size.ghost} fill={size.fill} active /> : <Bubble x={x} y={y} ghost={size.ghost} fill={size.fill} active />}
      </g>
    );
  })();

  const tooltip = (() => {
    if (!hovered) return null;
    const anchor = capitalAnchor.get(hovered.code) ?? toContent(hovered.cx, hovered.cy);
    const top = hoveredSym ? (symbolSize.get(hovered.code)?.top ?? 0) : 0;
    const x = anchor[0] * k + view.x;
    const y = anchor[1] * k + view.y - top - 12;
    const below = y < 190;
    const capital = provinceCapital(hovered.code);
    const d = byCode.get(hovered.code);
    const rows: [string, string, MapMetric | null][] = d
      ? [
          ["Plazas adjudicadas", formatInt(d.posts), "posts"],
          ["Libres a tu turno", `≈ ${formatInt(Math.round(d.available_posts))}`, "available"],
          ["Quedará alguna", formatPercent(d.p_available), null],
          ["Acabar aquí", formatPercent(d.p_likely, d.p_likely < 0.1 ? 1 : 0), "likely"],
          ["Último n.º con plaza", formatInt(d.last_order), null],
        ]
      : [];
    return (
      <div
        className="pointer-events-none absolute z-20 w-64 rounded-xl border border-border bg-surface/95 p-3 text-[12px] leading-5 shadow-pop backdrop-blur"
        style={{
          left: Math.min(Math.max(x, 136), width - 136),
          top: below ? anchor[1] * k + view.y + 16 : y,
          transform: below ? "translateX(-50%)" : "translate(-50%, -100%)",
        }}
      >
        <p className="font-semibold text-fg">{d?.province ?? displayName(hovered.name)}</p>
        <p className="text-[11.5px] text-fg-muted">
          {hoveredRegion?.name}
          {capital ? <> · capital: {capital.name}</> : null}
        </p>
        {d ? (
          <dl className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-3 border-t border-border pt-1.5 text-fg-muted">
            {rows.map(([label, value, m]) => (
              <div key={label} className="contents">
                <dt className={cn(m === metric && "font-medium text-fg")}>{label}</dt>
                <dd className={cn("text-right tabular-nums text-fg", m === metric && "font-semibold text-accent-text")}>{value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="mt-1.5 border-t border-border pt-1.5 text-fg-muted">Sin plazas adjudicadas en esta convocatoria.</p>
        )}
      </div>
    );
  })();

  // ── Descripción accesible del mapa.
  const description = useMemo(() => {
    const top = [...syms].filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    const list = top.map((s) => `${s.datum.province} (${s.value})`).join(", ");
    return (
      `Mapa ${mode === "tilt" ? "en 2.5D" : "plano"} de las provincias de España según ${METRIC_TEXT[metric]}` +
      (list ? `; destacan ${list}` : "") +
      (pin ? `. ${pin.label}.` : ".") +
      " Las sedes autonómicas se marcan con una estrella y las capitales de provincia con un punto."
    );
  }, [syms, mode, metric, pin]);

  const onPointerOver = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) return;
    const el = e.target instanceof Element ? e.target.closest("[data-code]") : null;
    const code = el?.getAttribute("data-code") ?? null;
    if (code !== hover) setHover(code);
  };

  const transform = `translate(${view.x} ${view.y}) scale(${view.k})`;
  return (
    <div ref={wrapRef} className={cn("relative", className)}>
      {/* Barra del mapa. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-fg-subtle">Vista</span>
          <Segmented<MapMode>
            label="Vista del mapa"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: "tilt", label: "2.5D" },
              { value: "flat", label: "Plano" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11.5px] font-medium text-fg-subtle">Nombres</span>
          <Segmented<MapNames>
            label="Nombres en el mapa"
            size="sm"
            value={names}
            onChange={setNames}
            options={[
              { value: "all", label: "Todas las capitales" },
              { value: "regions", label: "Solo autonómicas" },
              { value: "none", label: "Ninguno" },
            ]}
          />
        </div>
        <p className="ml-auto hidden text-[11px] text-fg-subtle @4xl:block">Arrastra para mover · Ctrl + rueda o doble clic para acercar</p>
      </div>

      {/* Mapa. */}
      <div
        ref={viewportRef}
        tabIndex={0}
        role="group"
        aria-roledescription="mapa"
        aria-label="Mapa de destinos. Teclas: + y − para acercar o alejar, flechas para desplazarte y 0 para restablecer."
        className={cn(
          "relative select-none overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent",
          k > 1.001 ? (dragging ? "cursor-grabbing" : "cursor-grab") : null,
        )}
        style={{ height, touchAction: k > 1.001 ? "none" : "pan-y" }}
        {...handlers}
        onPointerLeave={() => {
          handlers.onPointerLeave();
          setHover(null);
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          className="block"
          role="img"
          aria-labelledby={`${uid}-title`}
          aria-describedby={`${uid}-desc`}
          onPointerOver={onPointerOver}
        >
          <title id={`${uid}-title`}>Mapa de España con las plazas por provincia</title>
          <desc id={`${uid}-desc`}>{description}</desc>
          <g transform={transform}>
            <g transform={`translate(${fit.ox} ${fit.oy}) scale(${fit.s})`}>
              {slabLayer}
              {baseLayer}
              {hoverLayer}
            </g>
          </g>
          <g transform={`translate(${view.x} ${view.y})`}>
            <g style={{ opacity: hovered ? 0.32 : 1, transition: "opacity 160ms" }}>{symbolLayer}</g>
            {hoverSymbol}
            {labelLayer}
          </g>
        </svg>

        {notice ? (
          <div ref={noticeRef} className="pointer-events-none absolute inset-x-4 top-3 z-10">
            {notice}
          </div>
        ) : null}
        {tooltip}

        {hint ? (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 z-30 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fg/85 px-3.5 py-1.5 text-[12px] font-medium text-surface shadow-pop motion-safe:animate-fade-in"
          >
            Ctrl + rueda (o haz clic en el mapa) para acercar
          </div>
        ) : null}

        {/* Zoom. */}
        <div
          data-map-control
          className="absolute bottom-7 right-2.5 z-10 flex flex-col overflow-hidden rounded-lg border border-border bg-surface/90 shadow-card backdrop-blur"
        >
          <ZoomButton label="Acercar" shortcut="+" onClick={() => zoomBy(1.6)} disabled={k >= MAX_ZOOM - 1e-3}>
            <Plus />
          </ZoomButton>
          <ZoomButton label="Alejar" shortcut="−" onClick={() => zoomBy(1 / 1.6)} disabled={k <= 1.001}>
            <Minus />
          </ZoomButton>
          <ZoomButton label="Restablecer vista" shortcut="0" onClick={() => reset()} disabled={k <= 1.001 && view.x === 0 && view.y === 0}>
            <Maximize2 />
          </ZoomButton>
        </div>
        <p
          className="pointer-events-none absolute bottom-1.5 right-2.5 z-10 text-[10px] leading-none text-fg-subtle"
          title={GEO.attribution}
        >
          Límites: © IGN (CC BY 4.0)
        </p>
      </div>
    </div>
  );
}

function ZoomButton({ label, shortcut, onClick, disabled, children }: { label: string; shortcut: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={`${label} (${shortcut})`}
      onClick={onClick}
      disabled={disabled}
      className="grid size-8 place-items-center text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:relative focus-visible:z-10 focus-visible:outline-offset-[-2px] disabled:opacity-40 [&+&]:border-t [&+&]:border-border [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
