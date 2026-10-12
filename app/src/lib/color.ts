// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Utilidades de color (contraste WCAG, mezclas) para acentos y gráficos. */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m || !m[1]) return null;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const n = Number.parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const to = (v: number) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
}

export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Texto legible (blanco o casi negro) sobre un fondo dado. */
export function readableTextOn(bg: string): string {
  return contrastRatio(bg, "#ffffff") >= 3.2 ? "#ffffff" : "#111116";
}

/** Mezcla lineal en sRGB: t = 0 → a, t = 1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const x = hexToRgb(a);
  const y = hexToRgb(b);
  if (!x || !y) return a;
  return rgbToHex({ r: x.r + (y.r - x.r) * t, g: x.g + (y.g - x.g) * t, b: x.b + (y.b - x.b) * t });
}

export function withAlpha(hex: string, alpha: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function isHexColor(value: string): boolean {
  return hexToRgb(value) !== null;
}

/** Colores de acento predefinidos (todos con contraste ≥ 4,5:1 con texto blanco). */
export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: "Violeta", hex: "#7c3aed" },
  { name: "Índigo", hex: "#4f46e5" },
  { name: "Azul", hex: "#2563eb" },
  { name: "Cian", hex: "#0e7490" },
  { name: "Turquesa", hex: "#0f766e" },
  { name: "Fucsia", hex: "#c026d3" },
  { name: "Rosa", hex: "#db2777" },
  { name: "Naranja", hex: "#c2410c" },
];

/** Colores para perfiles. */
export const PROFILE_COLORS: string[] = [
  "#7c3aed",
  "#4f46e5",
  "#2563eb",
  "#0891b2",
  "#059669",
  "#ca8a04",
  "#ea580c",
  "#e11d48",
  "#db2777",
  "#475569",
];

/** Emojis para avatares de perfil. */
export const PROFILE_EMOJIS: string[] = [
  "🚀", "🎯", "📚", "💻", "🧠", "⭐", "🔥", "⚡", "🦉", "🦊", "🐼", "🐧",
  "🐱", "🦁", "🐯", "🐨", "🌟", "🍀", "🎧", "☕", "🏆", "💡", "🛡️", "🌈",
];
