// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { create } from "zustand";

interface LightboxImage {
  src: string;
  alt: string;
}

interface UiState {
  /** Preferencia manual de barra lateral plegada (null = automática según el ancho). */
  sidebarCollapsed: boolean | null;
  setSidebarCollapsed: (value: boolean | null) => void;
  lightbox: LightboxImage | null;
  openLightbox: (image: LightboxImage) => void;
  closeLightbox: () => void;
  /** Diálogo «Invítame a un café o haz una donación». */
  supportOpen: boolean;
  setSupportOpen: (open: boolean) => void;
  /** Diálogos abiertos (los atajos del examen se desactivan mientras haya alguno). */
  dialogs: number;
  pushDialog: () => void;
  popDialog: () => void;
}

export const useUi = create<UiState>((set, get) => ({
  sidebarCollapsed: null,
  setSidebarCollapsed: (value) => set({ sidebarCollapsed: value }),
  lightbox: null,
  openLightbox: (image) => set({ lightbox: image }),
  closeLightbox: () => set({ lightbox: null }),
  supportOpen: false,
  setSupportOpen: (open) => set({ supportOpen: open }),
  dialogs: 0,
  pushDialog: () => set({ dialogs: get().dialogs + 1 }),
  popDialog: () => set({ dialogs: Math.max(0, get().dialogs - 1) }),
}));
