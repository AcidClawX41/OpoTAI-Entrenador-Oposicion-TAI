// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { create } from "zustand";

export type ToastTone = "success" | "error" | "info" | "warning";

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (toast: Omit<Toast, "id">, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

export const useToasts = create<ToastState>((set, get) => ({
  toasts: [],
  push: (toast, durationMs = 4200) => {
    const id = nextId++;
    set({ toasts: [...get().toasts.slice(-3), { ...toast, id }] });
    if (durationMs > 0) setTimeout(() => get().dismiss(id), durationMs);
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

export const toast = {
  success: (title: string, description?: string) => useToasts.getState().push({ tone: "success", title, description }),
  error: (title: string, description?: string) => useToasts.getState().push({ tone: "error", title, description }, 6500),
  info: (title: string, description?: string) => useToasts.getState().push({ tone: "info", title, description }),
  warning: (title: string, description?: string) => useToasts.getState().push({ tone: "warning", title, description }, 6000),
};
