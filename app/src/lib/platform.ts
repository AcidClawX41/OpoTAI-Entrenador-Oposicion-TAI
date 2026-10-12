// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Detección de entorno (Tauri o navegador) y apertura de enlaces externos. */

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown;
  }
}

/** `true` si la interfaz corre dentro de la app de escritorio (Tauri 2). */
export function isTauri(): boolean {
  return typeof window !== "undefined" && window.__TAURI_INTERNALS__ !== undefined;
}

/** Abre una URL en el navegador del sistema (plugin opener en Tauri). */
export async function openExternal(url: string): Promise<void> {
  if (!/^https?:\/\//i.test(url)) return;
  if (isTauri()) {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

/** Dominio legible de una URL («sede.inap.gob.es»). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
