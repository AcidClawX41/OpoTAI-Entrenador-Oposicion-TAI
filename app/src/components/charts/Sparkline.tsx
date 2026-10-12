// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Mini gráfico de evolución (notas 0–100): línea de 2 px en tono de énfasis
 * suave, último punto en el acento y la referencia del aprobado discontinua.
 */
import { useId } from "react";

interface SparklineProps {
  values: number[];
  min?: number;
  max?: number;
  threshold?: number | null;
  width?: number;
  height?: number;
  label: string;
  className?: string;
}

export function Sparkline({ values, min = 0, max = 100, threshold = 50, width = 280, height = 72, label, className }: SparklineProps) {
  const gradientId = useId();
  const pad = 6;
  if (values.length === 0) return null;
  const xs = values.map((_, i) => (values.length === 1 ? width / 2 : pad + (i * (width - 2 * pad)) / (values.length - 1)));
  const y = (v: number) => pad + (1 - (Math.min(max, Math.max(min, v)) - min) / (max - min)) * (height - 2 * pad);
  const points = values.map((v, i) => `${xs[i]},${y(v)}`).join(" ");
  const area = `M ${xs[0]},${height - pad} L ${points.replace(/ /g, " L ")} L ${xs[xs.length - 1]},${height - pad} Z`;
  const lastX = xs[xs.length - 1] ?? 0;
  const lastY = y(values[values.length - 1] ?? 0);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-label={label} className={className}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--app-accent)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--app-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {threshold !== null ? (
        <line x1={0} x2={width} y1={y(threshold)} y2={y(threshold)} stroke="var(--app-fg-subtle)" strokeWidth={1} strokeDasharray="4 4" opacity={0.6} vectorEffect="non-scaling-stroke" />
      ) : null}
      <path d={area} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke="var(--app-accent)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r={4.5} fill="var(--app-accent)" stroke="var(--app-surface)" strokeWidth={2} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
