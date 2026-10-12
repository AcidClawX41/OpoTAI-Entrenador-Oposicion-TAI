// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Escalas de color para mapas de calor (puras y testeables).
 * - Acierto por tema: divergente rosa ↔ azul cielo (legible con daltonismo rojo-verde),
 *   con el 50 % en neutro.
 * - Actividad diaria: 5 niveles del color de acento según el máximo del periodo.
 */
import { toLocalDateKey } from "./format";

export const HEAT_LOW = "#e11d48"; // rosa (acierto bajo)
export const HEAT_HIGH = "#0284c7"; // azul cielo (acierto alto)

/** Intensidad 0–1 de la escala divergente (0 en el 50 %). */
export function heatIntensity(accuracy: number): number {
  const v = Math.min(1, Math.max(0, accuracy));
  return Math.abs(v - 0.5) * 2;
}

/** Color CSS (color-mix) para un acierto 0–1. */
export function heatColor(accuracy: number): string {
  const v = Math.min(1, Math.max(0, accuracy));
  const pct = Math.round(heatIntensity(v) * 100);
  const hue = v < 0.5 ? HEAT_LOW : HEAT_HIGH;
  return `color-mix(in oklab, ${hue} ${pct}%, var(--app-surface-3))`;
}

/** ¿Texto claro sobre la celda? (a partir de ~55 % de intensidad). */
export function heatTextIsLight(accuracy: number): boolean {
  return heatIntensity(accuracy) >= 0.55;
}

export interface CalendarCell {
  date: string; // YYYY-MM-DD
  answered: number;
  level: 0 | 1 | 2 | 3 | 4;
  inRange: boolean;
}

export interface CalendarGrid {
  weeks: CalendarCell[][]; // columnas (semanas de lunes a domingo)
  months: { index: number; label: string }[]; // primera semana de cada mes
  total: number;
  activeDays: number;
  max: number;
}

/** Nivel 0–4 relativo al máximo del periodo. */
export function activityLevel(answered: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (answered <= 0 || max <= 0) return 0;
  const r = answered / max;
  if (r > 0.75) return 4;
  if (r > 0.5) return 3;
  if (r > 0.25) return 2;
  return 1;
}

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sept", "oct", "nov", "dic"];

/** Calendario de actividad de `days` días hasta `today` (incluido), en semanas de lunes a domingo. */
export function buildCalendar(activity: { date: string; answered: number }[], days = 120, today: Date = new Date()): CalendarGrid {
  const counts = new Map(activity.map((a) => [a.date, a.answered]));
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  // Retrocede hasta el lunes de la primera semana.
  const first = new Date(start);
  const dow = (first.getDay() + 6) % 7; // 0 = lunes
  first.setDate(first.getDate() - dow);

  let max = 0;
  let total = 0;
  let activeDays = 0;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const n = counts.get(toLocalDateKey(d)) ?? 0;
    max = Math.max(max, n);
    total += n;
    if (n > 0) activeDays++;
  }

  const weeks: CalendarCell[][] = [];
  const months: { index: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = new Date(first); w <= end; w.setDate(w.getDate() + 7)) {
    const week: CalendarCell[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(w);
      d.setDate(d.getDate() + i);
      const key = toLocalDateKey(d);
      const inRange = d >= start && d <= end;
      const answered = inRange ? (counts.get(key) ?? 0) : 0;
      week.push({ date: key, answered, level: inRange ? activityLevel(answered, max) : 0, inRange });
    }
    const firstInRange = week.find((c) => c.inRange);
    if (firstInRange) {
      const month = Number(firstInRange.date.slice(5, 7)) - 1;
      if (month !== lastMonth) {
        months.push({ index: weeks.length, label: MONTHS[month] ?? "" });
        lastMonth = month;
      }
    }
    weeks.push(week);
  }
  return { weeks, months, total, activeDays, max };
}
