// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Colores concretos del tema activo (leídos de las variables CSS) para librerías
 * de gráficos que necesitan valores literales. Se actualizan al cambiar el tema,
 * el acento o la preferencia del sistema.
 */
import { useEffect, useState } from "react";

export interface ThemeColors {
  accent: string;
  success: string;
  danger: string;
  warning: string;
  info: string;
  fg: string;
  fgMuted: string;
  fgSubtle: string;
  border: string;
  surface: string;
  surface2: string;
  surface3: string;
}

const VARS: Record<keyof ThemeColors, string> = {
  accent: "--app-accent",
  success: "--app-success",
  danger: "--app-danger",
  warning: "--app-warning",
  info: "--app-info",
  fg: "--app-fg",
  fgMuted: "--app-fg-muted",
  fgSubtle: "--app-fg-subtle",
  border: "--app-border",
  surface: "--app-surface",
  surface2: "--app-surface-2",
  surface3: "--app-surface-3",
};

const FALLBACK: ThemeColors = {
  accent: "#7c3aed",
  success: "#10b981",
  danger: "#f43f5e",
  warning: "#f59e0b",
  info: "#0ea5e9",
  fg: "#f4f4f6",
  fgMuted: "#a3a3ae",
  fgSubtle: "#80808c",
  border: "#222229",
  surface: "#111115",
  surface2: "#18181d",
  surface3: "#222229",
};

function read(): ThemeColors {
  if (typeof window === "undefined" || typeof getComputedStyle !== "function") return FALLBACK;
  const style = getComputedStyle(document.documentElement);
  const out = { ...FALLBACK };
  for (const key of Object.keys(VARS) as (keyof ThemeColors)[]) {
    const value = style.getPropertyValue(VARS[key]).trim();
    if (value) out[key] = value;
  }
  return out;
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(read);
  useEffect(() => {
    const update = () => setColors(read());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style", "class"] });
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    media?.addEventListener?.("change", update);
    return () => {
      observer.disconnect();
      media?.removeEventListener?.("change", update);
    };
  }, []);
  return colors;
}
