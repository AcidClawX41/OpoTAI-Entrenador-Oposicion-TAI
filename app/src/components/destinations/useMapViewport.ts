// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Zoom y desplazamiento del mapa de destinos: botones, Ctrl/⌘ + rueda (o rueda tras hacer clic en
 * el mapa), doble clic (Mayús para alejar), arrastre y teclado (+, −, 0 y flechas).
 *
 * La vista es `pantalla = k · contenido + (x, y)`, con k ∈ [1, maxZoom] y el contenido (el mapa
 * encajado en el panel a k = 1) siempre cubriendo el panel. Los cambios continuos (rueda,
 * arrastre) se agrupan por fotograma y las animaciones se omiten con `prefers-reduced-motion`.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from "react";

export interface MapView {
  k: number;
  x: number;
  y: number;
}

export const IDENTITY: MapView = { k: 1, x: 0, y: 0 };

/** Limita la vista para que el contenido (width × height a k = 1) siga cubriendo el panel. */
export function clampView(v: MapView, width: number, height: number, maxZoom: number): MapView {
  const k = Math.min(maxZoom, Math.max(1, Number.isFinite(v.k) ? v.k : 1));
  return {
    k,
    x: Math.min(0, Math.max(width - k * width, v.x)),
    y: Math.min(0, Math.max(height - k * height, v.y)),
  };
}

/** Vista con zoom `k` que deja fijo el punto de pantalla (px, py). */
export function zoomAround(v: MapView, k: number, px: number, py: number): MapView {
  const cx = (px - v.x) / v.k;
  const cy = (py - v.y) / v.k;
  return { k, x: px - k * cx, y: py - k * cy };
}

interface Options {
  maxZoom?: number;
  reducedMotion?: boolean;
}

interface Drag {
  id: number;
  sx: number;
  sy: number;
  vx: number;
  vy: number;
  moved: boolean;
}

const isControl = (target: EventTarget | null) => target instanceof Element && Boolean(target.closest("[data-map-control]"));

export function useMapViewport(ref: RefObject<HTMLDivElement | null>, width: number, height: number, { maxZoom = 8, reducedMotion = false }: Options = {}) {
  const [view, setView] = useState<MapView>(IDENTITY);
  const [dragging, setDragging] = useState(false);
  const [hint, setHint] = useState(false);
  const viewRef = useRef<MapView>(IDENTITY);
  const engaged = useRef(false);
  const drag = useRef<Drag | null>(null);
  const anim = useRef(0);
  const frame = useRef(0);
  const hintTimer = useRef(0);
  const size = useRef({ width, height, maxZoom, reducedMotion });
  useLayoutEffect(() => {
    size.current = { width, height, maxZoom, reducedMotion };
  }, [width, height, maxZoom, reducedMotion]);

  const clamp = useCallback((v: MapView) => clampView(v, size.current.width, size.current.height, size.current.maxZoom), []);

  /** Aplica una vista en el siguiente fotograma (agrupa eventos de rueda y arrastre). */
  const schedule = useCallback((v: MapView) => {
    viewRef.current = v;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      setView(viewRef.current);
    });
  }, []);

  const stop = useCallback(() => {
    cancelAnimationFrame(anim.current);
    anim.current = 0;
  }, []);

  /** Lleva la vista a `target` (animada salvo movimiento reducido o `instant`). */
  const goTo = useCallback(
    (target: MapView, instant = false) => {
      stop();
      const to = clamp(target);
      const from = viewRef.current;
      if (instant || size.current.reducedMotion || (from.k === to.k && from.x === to.x && from.y === to.y)) {
        viewRef.current = to;
        setView(to);
        return;
      }
      // Escalado puro alrededor del punto fijo de las dos vistas (si cambia el zoom).
      const dk = from.k - to.k;
      const cx = Math.abs(dk) > 1e-9 ? (to.x - from.x) / dk : 0;
      const cy = Math.abs(dk) > 1e-9 ? (to.y - from.y) / dk : 0;
      const px = from.k * cx + from.x;
      const py = from.k * cy + from.y;
      const t0 = performance.now();
      // Se mide con performance.now(): la marca de tiempo de rAF puede ser anterior a t0.
      const step = () => {
        const p = Math.min(1, Math.max(0, (performance.now() - t0) / 260));
        const e = 1 - (1 - p) ** 3;
        let v: MapView;
        if (p >= 1) v = to;
        else if (Math.abs(dk) > 1e-9) {
          const k = from.k * (to.k / from.k) ** e;
          v = { k, x: px - k * cx, y: py - k * cy };
        } else v = { k: to.k, x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * e };
        viewRef.current = v;
        setView(v);
        anim.current = p < 1 ? requestAnimationFrame(step) : 0;
      };
      anim.current = requestAnimationFrame(step);
    },
    [clamp, stop],
  );

  const zoomBy = useCallback(
    (factor: number, at?: { x: number; y: number }) => {
      engaged.current = true;
      const v = viewRef.current;
      const px = at?.x ?? size.current.width / 2;
      const py = at?.y ?? size.current.height / 2;
      goTo(zoomAround(v, Math.min(size.current.maxZoom, Math.max(1, v.k * factor)), px, py));
    },
    [goTo],
  );

  const reset = useCallback((instant = false) => goTo(IDENTITY, instant), [goTo]);

  const panBy = useCallback((dx: number, dy: number) => {
    const v = viewRef.current;
    goTo({ k: v.k, x: v.x + dx, y: v.y + dy });
  }, [goTo]);

  const flashHint = useCallback(() => {
    window.clearTimeout(hintTimer.current);
    setHint(true);
    hintTimer.current = window.setTimeout(() => setHint(false), 1600);
  }, []);

  // Rueda: listener nativo (los de React son pasivos y no pueden evitar el desplazamiento de la página).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const modifier = e.ctrlKey || e.metaKey;
      if (!modifier && !engaged.current) {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) flashHint();
        return; // la página se desplaza con normalidad
      }
      const rect = el.getBoundingClientRect();
      const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * rect.height : e.deltaY;
      const v = viewRef.current;
      // Alejado del todo y sin modificador: la rueda hacia abajo vuelve a desplazar la página.
      if (!modifier && delta > 0 && v.k <= 1.0001) return;
      e.preventDefault();
      stop();
      const k = Math.min(size.current.maxZoom, Math.max(1, v.k * Math.exp(-Math.max(-60, Math.min(60, delta)) * 0.004)));
      schedule(clamp(zoomAround(v, k, e.clientX - rect.left, e.clientY - rect.top)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, clamp, schedule, stop, flashHint]);

  useEffect(
    () => () => {
      cancelAnimationFrame(anim.current);
      cancelAnimationFrame(frame.current);
      window.clearTimeout(hintTimer.current);
    },
    [],
  );

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 || isControl(e.target)) return;
      engaged.current = true;
      const v = viewRef.current;
      drag.current = { id: e.pointerId, sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: false };
    },
    [],
  );

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLDivElement>) => {
      const d = drag.current;
      if (!d || d.id !== e.pointerId) return;
      const dx = e.clientX - d.sx;
      const dy = e.clientY - d.sy;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < 4 || viewRef.current.k <= 1.0001) return;
        d.moved = true;
        stop();
        setDragging(true);
        e.currentTarget.setPointerCapture?.(e.pointerId);
      }
      schedule(clamp({ k: viewRef.current.k, x: d.vx + dx, y: d.vy + dy }));
    },
    [clamp, schedule, stop],
  );

  const onPointerUp = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    if (d.moved) {
      setDragging(false);
      if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    if (!drag.current) engaged.current = false;
  }, []);

  const onDoubleClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (isControl(e.target)) return;
      const rect = e.currentTarget.getBoundingClientRect();
      zoomBy(e.shiftKey ? 0.5 : 2, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    },
    [zoomBy],
  );

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.target !== e.currentTarget || e.altKey || e.ctrlKey || e.metaKey) return;
      const step = 90;
      switch (e.key) {
        case "+":
        case "=":
          zoomBy(1.5);
          break;
        case "-":
        case "_":
          zoomBy(1 / 1.5);
          break;
        case "0":
          reset();
          break;
        case "ArrowLeft":
          panBy(step, 0);
          break;
        case "ArrowRight":
          panBy(-step, 0);
          break;
        case "ArrowUp":
          panBy(0, step);
          break;
        case "ArrowDown":
          panBy(0, -step);
          break;
        default:
          return;
      }
      e.preventDefault();
    },
    [zoomBy, reset, panBy],
  );

  return {
    view,
    dragging,
    hint,
    zoomBy,
    reset,
    handlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onPointerLeave, onDoubleClick, onKeyDown },
  };
}
