// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Utilidades de tiempo: reloj del examen, avisos y duraciones legibles. */

export type TimerTone = "normal" | "warning" | "danger";

/** Umbrales de aviso del cronómetro (segundos restantes): a 10 minutos y a 1 minuto del final. */
export const WARNING_SECONDS = 10 * 60;
export const DANGER_SECONDS = 60;

/** «59:59» o «1:59:59» (las horas solo aparecen si hacen falta). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(sec).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Segundos restantes; `null` si el examen no tiene límite. */
export function remainingSeconds(durationMinutes: number | null, elapsedSeconds: number): number | null {
  if (!durationMinutes || durationMinutes <= 0) return null;
  return Math.max(0, durationMinutes * 60 - elapsedSeconds);
}

/** Tono del temporizador: ámbar con 10 min o menos, rojo con 1 min o menos. */
export function timerTone(remaining: number | null): TimerTone {
  if (remaining === null) return "normal";
  if (remaining <= DANGER_SECONDS) return "danger";
  if (remaining <= WARNING_SECONDS) return "warning";
  return "normal";
}

/** «1 h 52 min», «45 min», «30 s». */
export function formatDuration(totalSeconds: number | null | undefined): string {
  if (totalSeconds === null || totalSeconds === undefined || !Number.isFinite(totalSeconds)) return "—";
  const s = Math.max(0, Math.round(totalSeconds));
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** «120 min» para duraciones de examen expresadas en minutos. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes) return "Sin límite";
  return `${minutes} min`;
}
