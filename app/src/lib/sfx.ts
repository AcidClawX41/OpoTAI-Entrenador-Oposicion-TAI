// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Efectos de sonido minimalistas sintetizados con Web Audio (sin ficheros).
 *
 * - El `AudioContext` se crea de forma perezosa y solo después de la primera
 *   interacción del usuario (requisito de los navegadores y WebViews).
 * - Respeta `sound_enabled` y `sound_volume` de los ajustes (`configureSfx`).
 * - Sonidos: acierto (dos notas ascendentes), fallo (tono grave corto),
 *   navegación (clic muy breve y bajo), «tic» neutro al marcar en exámenes
 *   corregidos al final, apto / no apto al entregar y aviso del cronómetro (10 y 1 min).
 *   Nunca debe sonar al dejar una pregunta en blanco: ver `examSounds.ts`.
 */

export type SfxName = "correct" | "wrong" | "nav" | "tick" | "pass" | "fail" | "alert";

interface SfxConfig {
  enabled: boolean;
  volume: number;
}

type AudioContextCtor = new () => AudioContext;

let config: SfxConfig = { enabled: true, volume: 0.6 };
let context: AudioContext | null = null;
let unlocked = false;
let installed = false;

export function configureSfx(next: Partial<SfxConfig>): void {
  config = {
    enabled: next.enabled ?? config.enabled,
    volume: Math.min(1, Math.max(0, next.volume ?? config.volume)),
  };
}

export function sfxConfig(): Readonly<SfxConfig> {
  return config;
}

function contextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { AudioContext?: AudioContextCtor; webkitAudioContext?: AudioContextCtor };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

function ensureContext(): AudioContext | null {
  if (!unlocked) return null;
  if (!context) {
    const Ctor = contextCtor();
    if (!Ctor) return null;
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") void context.resume().catch(() => undefined);
  return context;
}

/** Marca que ya hubo interacción (y crea el contexto). Se llama sola tras el primer clic o tecla. */
export function unlockSfx(): void {
  unlocked = true;
  ensureContext();
}

/** Escucha la primera interacción (en fase de captura, antes que los manejadores de React). */
export function installSfxUnlock(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;
  const handler = () => {
    unlockSfx();
    window.removeEventListener("pointerdown", handler, true);
    window.removeEventListener("keydown", handler, true);
  };
  window.addEventListener("pointerdown", handler, true);
  window.addEventListener("keydown", handler, true);
}

interface Tone {
  freq: number;
  at?: number;
  dur: number;
  type?: OscillatorType;
  gain: number;
  glideTo?: number;
}

function play(ac: AudioContext, tones: Tone[], volume: number): void {
  const t0 = ac.currentTime + 0.005;
  for (const t of tones) {
    const start = t0 + (t.at ?? 0);
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = t.type ?? "sine";
    osc.frequency.setValueAtTime(t.freq, start);
    if (t.glideTo) osc.frequency.exponentialRampToValueAtTime(t.glideTo, start + t.dur);
    const peak = Math.max(0.0002, t.gain * volume);
    amp.gain.setValueAtTime(0.0001, start);
    amp.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.012, t.dur / 4));
    amp.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
    osc.connect(amp);
    amp.connect(ac.destination);
    osc.start(start);
    osc.stop(start + t.dur + 0.03);
  }
}

const SOUNDS: Record<SfxName, Tone[]> = {
  // Dos notas suaves ascendentes (~120 ms en total).
  correct: [
    { freq: 784, dur: 0.09, gain: 0.16 },
    { freq: 1175, at: 0.055, dur: 0.12, gain: 0.14 },
  ],
  // Tono grave breve y suave, con ligera caída.
  wrong: [{ freq: 196, glideTo: 156, dur: 0.17, type: "triangle", gain: 0.2 }],
  // Clic muy corto y bajo.
  nav: [{ freq: 300, glideTo: 240, dur: 0.035, gain: 0.07 }],
  // «Tic» neutro: no revela si la respuesta es correcta.
  tick: [{ freq: 1250, dur: 0.028, type: "triangle", gain: 0.045 }],
  // Resultado: apto (arpegio ascendente corto) / no apto (dos notas descendentes).
  pass: [
    { freq: 523.25, dur: 0.1, gain: 0.14 },
    { freq: 659.25, at: 0.08, dur: 0.1, gain: 0.14 },
    { freq: 783.99, at: 0.16, dur: 0.22, gain: 0.15 },
  ],
  fail: [
    { freq: 392, dur: 0.13, type: "triangle", gain: 0.17 },
    { freq: 293.66, at: 0.11, dur: 0.24, type: "triangle", gain: 0.17 },
  ],
  // Aviso del cronómetro (quedan 10 min / 1 min): dos campanadas suaves iguales.
  alert: [
    { freq: 880, dur: 0.16, gain: 0.15 },
    { freq: 880, at: 0.22, dur: 0.22, gain: 0.15 },
  ],
};

/**
 * Reproduce un efecto si el sonido está activado y ya hubo interacción.
 * Devuelve `true` si ha sonado.
 */
export function playSfx(name: SfxName, options: { ignoreEnabled?: boolean } = {}): boolean {
  if (!options.ignoreEnabled && !config.enabled) return false;
  if (config.volume <= 0) return false;
  const ac = ensureContext();
  if (!ac) return false;
  try {
    play(ac, SOUNDS[name], config.volume);
    return true;
  } catch {
    return false;
  }
}

/** Solo para tests. */
export function resetSfxForTests(): void {
  context = null;
  unlocked = false;
  installed = false;
  config = { enabled: true, volume: 0.6 };
}
