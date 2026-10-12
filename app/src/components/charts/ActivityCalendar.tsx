// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Calendario de actividad de los últimos 120 días (semanas de lunes a domingo). */
import { useMemo } from "react";
import type { ActivityDay } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDateLong, formatInt } from "@/lib/format";
import { buildCalendar } from "@/lib/heat";
import { Tooltip } from "@/components/ui/overlays";

const LEVEL_CLASS = [
  "bg-surface-3",
  "bg-[color-mix(in_oklab,var(--app-accent)_28%,var(--app-surface-3))]",
  "bg-[color-mix(in_oklab,var(--app-accent)_50%,var(--app-surface-3))]",
  "bg-[color-mix(in_oklab,var(--app-accent)_75%,var(--app-surface-3))]",
  "bg-accent",
] as const;

const WEEKDAYS = ["L", "", "X", "", "V", "", ""];

interface ActivityCalendarProps {
  activity: ActivityDay[];
  days?: number;
  /** Racha actual (días seguidos), si se conoce. */
  streakDays?: number | null;
  className?: string;
}

export function ActivityCalendar({ activity, days = 120, streakDays = null, className }: ActivityCalendarProps) {
  const grid = useMemo(() => buildCalendar(activity, days), [activity, days]);
  return (
    <div className={cn("w-full", className)}>
      <div className="overflow-x-auto pb-1">
        <div
          className="inline-grid gap-1"
          style={{ gridTemplateColumns: `1.25rem repeat(${grid.weeks.length}, 1rem)` }}
          role="img"
          aria-label={`${formatInt(grid.total)} preguntas respondidas en los últimos ${days} días; ${formatInt(grid.activeDays)} días con actividad.`}
        >
          <span aria-hidden />
          {grid.weeks.map((_, w) => {
            const month = grid.months.find((m) => m.index === w);
            return (
              <span key={`m-${w}`} className="relative h-4" aria-hidden>
                {month ? <span className="absolute left-0 top-0 whitespace-nowrap text-[10.5px] leading-4 text-fg-subtle">{month.label}</span> : null}
              </span>
            );
          })}
          {Array.from({ length: 7 }, (_, row) => (
            <Row key={row} row={row} grid={grid} />
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-3 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5" aria-hidden>
          Menos
          {LEVEL_CLASS.map((cls, i) => (
            <span key={i} className={cn("size-3 rounded-[3px]", cls)} />
          ))}
          Más
        </span>
      </div>
      <dl className="mt-5 grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Respuestas</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{formatInt(grid.total)}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
          <dt className="text-xs text-fg-muted">Días activos</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{formatInt(grid.activeDays)}</dd>
        </div>
        <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
          <dt className="text-xs text-fg-muted">{streakDays !== null ? "Racha actual" : "Media por día"}</dt>
          <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">
            {streakDays !== null
              ? `${formatInt(streakDays)} ${streakDays === 1 ? "día" : "días"}`
              : formatInt(grid.activeDays ? Math.round(grid.total / grid.activeDays) : 0)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ row, grid }: { row: number; grid: ReturnType<typeof buildCalendar> }) {
  return (
    <>
      <span className="pr-1 text-right text-[10.5px] leading-4 text-fg-subtle" aria-hidden>
        {WEEKDAYS[row]}
      </span>
      {grid.weeks.map((week, w) => {
        const cell = week[row];
        if (!cell || !cell.inRange) return <span key={`${w}-${row}`} className="size-4" aria-hidden />;
        return (
          <Tooltip
            key={cell.date}
            delay={80}
            content={
              <>
                <span className="font-semibold">{cell.answered > 0 ? `${formatInt(cell.answered)} respuestas` : "Sin actividad"}</span>
                <span className="block opacity-80">{formatDateLong(cell.date)}</span>
              </>
            }
          >
            <span className={cn("block size-4 rounded-[4px] transition-transform hover:scale-125", LEVEL_CLASS[cell.level])} />
          </Tooltip>
        );
      })}
    </>
  );
}
