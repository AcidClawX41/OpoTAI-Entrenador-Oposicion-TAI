// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Evolución de la nota (0–100) intento a intento: una sola serie en el acento,
 * área suave y el aprobado (50) como línea discontinua de referencia.
 */
import { useId } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipContentProps } from "recharts";
import type { GradePoint } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDate, formatDayMonth, formatGrade } from "@/lib/format";
import { MODE_LABEL } from "@/lib/labels";
import { useThemeColors } from "@/hooks/useThemeColors";

interface Datum {
  i: number;
  date: string;
  grade: number;
  title: string;
  mode: GradePoint["mode"];
  passed: boolean;
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const d = (payload?.[0] as { payload?: Datum } | undefined)?.payload;
  if (!active || !d) return null;
  return (
    <div className="max-w-64 rounded-xl border border-border-strong bg-surface px-3 py-2.5 text-xs shadow-pop">
      <p className="font-semibold text-fg">{d.title}</p>
      <p className="mt-0.5 text-fg-subtle">
        {MODE_LABEL[d.mode]} · {formatDate(d.date)}
      </p>
      <p className="mt-2 flex items-center gap-2">
        <span className="text-lg font-semibold tabular-nums text-fg">{formatGrade(d.grade)}</span>
        <span
          className={cn(
            "rounded-full px-1.5 py-px text-[10.5px] font-bold",
            d.passed ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text",
          )}
        >
          {d.passed ? "APTO" : "NO APTO"}
        </span>
      </p>
    </div>
  );
}

export function GradeChart({ points, height = 260, className }: { points: GradePoint[]; height?: number; className?: string }) {
  const c = useThemeColors();
  const gradientId = useId().replace(/:/g, "");
  const data: Datum[] = points.map((p, i) => ({
    i: i + 1,
    date: p.date,
    grade: p.max_grade > 0 ? (p.grade / p.max_grade) * 100 : 0,
    title: p.title,
    mode: p.mode,
    passed: p.passed,
  }));
  const summary =
    data.length > 0
      ? `Evolución de ${data.length} notas: de ${formatGrade(data[0]?.grade, 1)} a ${formatGrade(data.at(-1)?.grade, 1)}; el aprobado está en 50.`
      : "Sin notas todavía";
  return (
    <div className={cn("w-full", className)} style={{ height }} role="img" aria-label={summary}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={c.accent} stopOpacity={0.28} />
              <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={c.border} strokeDasharray="0" />
          <XAxis
            dataKey="i"
            tickLine={false}
            axisLine={{ stroke: c.border }}
            tick={{ fill: c.fgSubtle, fontSize: 11 }}
            tickFormatter={(i: number) => formatDayMonth(data[i - 1]?.date)}
            interval="preserveStartEnd"
            minTickGap={28}
            padding={{ left: 8, right: 8 }}
          />
          <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickLine={false} axisLine={false} tick={{ fill: c.fgSubtle, fontSize: 11 }} width={40} />
          <ReferenceLine
            y={50}
            stroke={c.fgSubtle}
            strokeDasharray="5 5"
            label={{ value: "Aprobado · 50", position: "insideTopLeft", fill: c.fgSubtle, fontSize: 11, offset: 8 }}
          />
          <Tooltip content={ChartTooltip} cursor={{ stroke: c.border, strokeWidth: 1 }} isAnimationActive={false} />
          <Area type="monotone" dataKey="grade" stroke="none" fill={`url(#${gradientId})`} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="grade"
            stroke={c.accent}
            strokeWidth={2.25}
            dot={{ r: 3.5, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: c.accent, stroke: c.surface, strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
