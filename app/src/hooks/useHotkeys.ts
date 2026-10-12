// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useRef } from "react";
import { useUi } from "@/store/ui";

/** ¿El foco está en un campo de texto (donde las teclas no deben actuar como atajos)? */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable;
}

/**
 * Atajos de teclado globales. Se ignoran mientras se escribe en un campo o hay
 * un diálogo abierto.
 */
export function useHotkeys(handler: (event: KeyboardEvent) => void, enabled = true): void {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || isTypingTarget(event.target)) return;
      if (useUi.getState().dialogs > 0) return;
      ref.current(event);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
