// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useLayoutEffect } from "react";
import { usePrefersDark } from "@/hooks/useMediaQuery";
import { isHexColor, readableTextOn } from "@/lib/color";
import { configureSfx } from "@/lib/sfx";
import { useSession } from "@/store/session";

export const DEFAULT_ACCENT = "#7c3aed";

/** Aplica tema (sistema/claro/oscuro), color de acento y ajustes de sonido del perfil activo. */
export function ThemeController() {
  const theme = useSession((s) => s.settings?.theme ?? "system");
  const accentSetting = useSession((s) => s.settings?.accent ?? null);
  const soundEnabled = useSession((s) => s.settings?.sound_enabled ?? true);
  const soundVolume = useSession((s) => s.settings?.sound_volume ?? 0.6);
  const prefersDark = usePrefersDark();
  const resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
  const accent = accentSetting && isHexColor(accentSetting) ? accentSetting : DEFAULT_ACCENT;

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolved;
  }, [resolved]);

  useLayoutEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--app-accent", accent);
    root.setProperty("--app-accent-fg", readableTextOn(accent));
  }, [accent]);

  useEffect(() => {
    configureSfx({ enabled: soundEnabled, volume: soundVolume });
  }, [soundEnabled, soundVolume]);

  return null;
}
