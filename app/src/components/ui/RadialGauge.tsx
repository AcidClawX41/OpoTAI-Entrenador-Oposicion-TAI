// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Indicador radial (arco de 270°) para notas y probabilidades: el relleno lleva
 * el tono del estado y una marca indica el aprobado/corte.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "accent" | "success" | "danger" | "warning";

const STROKE: Record<Tone, string> = {
  accent: "var(--app-accent)",
  success: "var(--app-success)",
  danger: "var(--app-danger)",
  warning: "var(--app-warning)",
};

interface RadialGaugeProps {
  value: number;
  max: number;
  size?: number;
  thickness?: number;
  tone?: Tone;
  /** Valor en la misma escala que `value` donde dibujar la marca (p. ej. 50). */
  marker?: number | null;
  label: string;
  children?: ReactNode;
  className?: string;
}

const SWEEP = 270;
const START = 135; // grados desde el eje X (abajo a la izquierda)

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(cx: number, cy: number, r: number, from: number, to: number) {
  const a = polar(cx, cy, r, from);
  const b = polar(cx, cy, r, to);
  const large = to - from > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

export function RadialGauge({ value, max, size = 200, thickness = 14, tone = "accent", marker = null, label, children, className }: RadialGaugeProps) {
  const r = (size - thickness) / 2 - 4;
  const c = size / 2;
  const frac = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const end = START + SWEEP * frac;
  const markerAngle = marker !== null && max > 0 ? START + SWEEP * Math.min(1, Math.max(0, marker / max)) : null;
  const m1 = markerAngle !== null ? polar(c, c, r - thickness / 2 - 3, markerAngle) : null;
  const m2 = markerAngle !== null ? polar(c, c, r + thickness / 2 + 3, markerAngle) : null;

  return (
    <div className={cn("relative inline-grid place-items-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} className="overflow-visible">
        <path d={arc(c, c, r, START, START + SWEEP)} fill="none" stroke="var(--app-surface-3)" strokeWidth={thickness} strokeLinecap="round" />
        {frac > 0.001 ? (
          <path
            d={arc(c, c, r, START, Math.max(START + 0.5, end))}
            fill="none"
            stroke={STROKE[tone]}
            strokeWidth={thickness}
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 10px color-mix(in oklab, ${STROKE[tone]} 45%, transparent))` }}
          />
        ) : null}
        {m1 && m2 ? <line x1={m1.x} y1={m1.y} x2={m2.x} y2={m2.y} stroke="var(--app-fg)" strokeWidth={2.5} strokeLinecap="round" opacity={0.85} /> : null}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
