// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Formateo de números, notas y fechas en castellano (es-ES) con Intl.
 * Todas las funciones son puras y aceptan `null`/`undefined` devolviendo «—».
 */

export const LOCALE = "es-ES";
export const DASH = "—";

type Num = number | null | undefined;

const nfCache = new Map<string, Intl.NumberFormat>();

function nf(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let f = nfCache.get(key);
  if (!f) {
    try {
      f = new Intl.NumberFormat(LOCALE, options);
    } catch {
      // Motores antiguos sin `useGrouping: "always"`.
      const { useGrouping: _ignored, ...rest } = options;
      f = new Intl.NumberFormat(LOCALE, rest);
    }
    nfCache.set(key, f);
  }
  return f;
}

function valid(n: Num): n is number {
  return typeof n === "number" && Number.isFinite(n);
}

/** Entero con separador de miles siempre («1.030», como en el BOE). */
export function formatInt(n: Num): string {
  if (!valid(n)) return DASH;
  return nf({ maximumFractionDigits: 0, useGrouping: "always" }).format(n);
}

/** Número con decimales fijos o máximos («67,45»). */
export function formatNumber(n: Num, maxDecimals = 2, minDecimals = 0): string {
  if (!valid(n)) return DASH;
  return nf({
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
    useGrouping: "always",
  }).format(n);
}

/** Nota con dos decimales fijos («67,45»). */
export function formatGrade(n: Num, decimals = 2): string {
  if (!valid(n)) return DASH;
  return formatNumber(n, decimals, decimals);
}

/** Puntuación directa: hasta dos decimales («96,33», «48»). */
export function formatDirect(n: Num): string {
  if (!valid(n)) return DASH;
  return formatNumber(n, 2, 0);
}

/** Porcentaje a partir de una fracción 0–1 («73 %»). */
export function formatPercent(ratio: Num, decimals = 0): string {
  if (!valid(ratio)) return DASH;
  return nf({
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(ratio);
}

/** Cuota pequeña con un decimal si hace falta («0,4 %», «16 %»). */
export function formatShare(ratio: Num): string {
  if (!valid(ratio)) return DASH;
  if (ratio > 0 && ratio < 0.1) return formatPercent(ratio, 1);
  return formatPercent(ratio);
}

/** Probabilidad legible: evita «0 %» y «100 %» engañosos en los extremos. */
export function formatProbability(p: Num): string {
  if (!valid(p)) return DASH;
  if (p > 0 && p < 0.01) return "< 1 %";
  if (p < 1 && p > 0.99) return "> 99 %";
  return formatPercent(p);
}

/** Percentil «mejor que el X %»: nunca muestra «100 %» ni «0 %» (99,9 % como máximo). */
export function formatPercentile(p: Num): string {
  if (!valid(p)) return DASH;
  const clamped = Math.min(0.999, Math.max(0.001, p));
  return clamped > 0.99 || clamped < 0.01 ? formatPercent(clamped, 1) : formatPercent(clamped);
}

/** Número con signo explícito («+3,2», «−1,33»). */
export function formatSigned(n: Num, maxDecimals = 2): string {
  if (!valid(n)) return DASH;
  const abs = formatNumber(Math.abs(n), maxDecimals, 0);
  if (Math.abs(n) < 1e-9) return abs;
  return n > 0 ? `+${abs}` : `−${abs}`;
}

/** Número compacto («3,4 M», «12,9 mil»). */
export function formatCompact(n: Num): string {
  if (!valid(n)) return DASH;
  return nf({ notation: "compact", maximumFractionDigits: 1 }).format(n);
}

/** Puntos que resta cada error, como fracción legible («−1/3», «−4/3»). */
export function formatPenalty(value: number, divisor: number | null): string {
  if (!divisor) return "sin penalización";
  if (Number.isInteger(value) && Number.isInteger(divisor)) return `−${value}/${divisor}`;
  return `−${formatNumber(value / divisor, 3)}`;
}

/** Ordinal femenino para partes del examen: 1 → «1.ª». */
export function ordinalFem(n: number): string {
  return `${n}.ª`;
}

// ───────────────────────────── Fechas ─────────────────────────────

const dfCache = new Map<string, Intl.DateTimeFormat>();
function df(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = JSON.stringify(options);
  let f = dfCache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE, options);
    dfCache.set(key, f);
  }
  return f;
}

/** Interpreta ISO completo o fecha «YYYY-MM-DD» (como fecha local). */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** «11 oct 2026». */
export function formatDate(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return DASH;
  return df({ day: "numeric", month: "short", year: "numeric" }).format(d).replace(".", "");
}

/** «11 de octubre de 2026». */
export function formatDateLong(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return DASH;
  return df({ day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** «11 oct 2026, 08:30». */
export function formatDateTime(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return DASH;
  return df({ day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    .format(d)
    .replace(".", "");
}

/** «11 oct». */
export function formatDayMonth(value: string | null | undefined): string {
  const d = parseDate(value);
  if (!d) return DASH;
  return df({ day: "numeric", month: "short" }).format(d).replace(".", "");
}

/** «domingo, 11 de octubre». */
export function formatWeekdayLong(d: Date): string {
  return df({ weekday: "long", day: "numeric", month: "long" }).format(d);
}

/** Fecha local en formato «YYYY-MM-DD». */
export function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_MS = 86_400_000;

/** Días naturales entre hoy y `date` (positivo si es futura). */
export function daysUntil(date: string | null | undefined, now: Date = new Date()): number | null {
  const d = parseDate(date);
  if (!d) return null;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((b - a) / DAY_MS);
}

/** «hoy», «ayer», «hace 3 días», «hace 2 meses»… */
export function formatRelative(value: string | null | undefined, now: Date = new Date()): string {
  const d = parseDate(value);
  if (!d) return DASH;
  const days = daysUntil(value, now);
  if (days === null) return DASH;
  if (days === 0) return "hoy";
  if (days === -1) return "ayer";
  if (days === 1) return "mañana";
  const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });
  const abs = Math.abs(days);
  if (abs < 14) return rtf.format(days, "day");
  if (abs < 60) return rtf.format(Math.round(days / 7), "week");
  if (abs < 365) return rtf.format(Math.round(days / 30), "month");
  return rtf.format(Math.round(days / 365), "year");
}

/** Saludo según la hora local. */
export function greeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 6 && h < 14) return "Buenos días";
  if (h >= 14 && h < 21) return "Buenas tardes";
  return "Buenas noches";
}

/** Plural simple: plural(3, "pregunta") → «3 preguntas». */
export function plural(n: number, singular: string, pluralForm?: string): string {
  const word = n === 1 ? singular : (pluralForm ?? `${singular}s`);
  return `${formatInt(n)} ${word}`;
}
