// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Estado de sesión: arranque, perfiles, perfil activo, ajustes, catálogo y el
 * simulacro sorpresa (un sorteo por perfil y por arranque de la app).
 */
import { create } from "zustand";
import { api, detectBackend, type BackendKind } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { AppInfo, CatalogInfo, Profile, RandomDraw, Settings } from "@/api/types";
import { toast } from "./toast";

export type DrawStatus = "pending" | "started";

export interface DrawEntry {
  draw: RandomDraw;
  status: DrawStatus;
}

interface SessionState {
  status: "idle" | "booting" | "ready" | "error";
  error: string | null;
  backend: BackendKind;
  appInfo: AppInfo | null;
  catalog: CatalogInfo | null;
  profiles: Profile[];
  profile: Profile | null;
  settings: Settings | null;
  /** Sorteo del simulacro sorpresa por perfil (se mantiene toda la sesión). */
  draws: Record<string, DrawEntry>;
  /** Perfiles a los que ya se mostró la presentación del sorteo en esta sesión. */
  drawOffered: Record<string, true>;
  /** Ya se eligió un perfil en esta sesión: no se vuelve a autoseleccionar (p. ej. al borrar el activo). */
  profileChosen: boolean;
  /** Preguntas de repaso pendientes hoy (insignia de la barra lateral). */
  reviewDue: number | null;

  boot: () => Promise<void>;
  refreshProfiles: () => Promise<Profile[]>;
  /** Activa un perfil y devuelve la ruta a la que ir («/sorteo» o «/inicio»). */
  selectProfile: (id: string) => Promise<string>;
  signOut: () => void;
  createProfile: (name: string, color: string, avatar: string | null) => Promise<Profile>;
  updateProfile: (id: string, name: string, color: string, avatar: string | null) => Promise<Profile>;
  deleteProfile: (id: string) => Promise<void>;
  saveSettings: (patch: Partial<Settings>) => Promise<boolean>;
  ensureDraw: (profileId: string) => Promise<RandomDraw>;
  markDrawStarted: (profileId: string) => void;
  refreshReviewDue: () => Promise<void>;
}

const inflightDraws = new Map<string, Promise<RandomDraw>>();

function sortProfiles(list: Profile[]): Profile[] {
  return [...list].sort((a, b) => (b.last_active_at ?? b.created_at).localeCompare(a.last_active_at ?? a.created_at));
}

export const useSession = create<SessionState>((set, get) => ({
  status: "idle",
  error: null,
  backend: detectBackend(),
  appInfo: null,
  catalog: null,
  profiles: [],
  profile: null,
  settings: null,
  draws: {},
  drawOffered: {},
  profileChosen: false,
  reviewDue: null,

  boot: async () => {
    if (get().status === "booting") return;
    set({ status: "booting", error: null });
    const [profiles, appInfo, catalog] = await Promise.allSettled([api.listProfiles(), api.getAppInfo(), api.getCatalog()]);
    if (profiles.status === "rejected") {
      set({ status: "error", error: errorMessage(profiles.reason) });
      return;
    }
    if (catalog.status === "rejected") toast.warning("No se ha podido cargar el catálogo", errorMessage(catalog.reason));
    set({
      status: "ready",
      profiles: profiles.value,
      appInfo: appInfo.status === "fulfilled" ? appInfo.value : null,
      catalog: catalog.status === "fulfilled" ? catalog.value : null,
    });
  },

  refreshProfiles: async () => {
    const profiles = await api.listProfiles();
    set({ profiles });
    return profiles;
  },

  selectProfile: async (id) => {
    const [profile, settings] = await Promise.all([api.touchProfile(id), api.getSettings(id)]);
    const others = get().profiles.filter((p) => p.id !== id);
    const offer = settings.random_exam_on_startup && !get().drawOffered[id];
    set({
      profile,
      settings,
      profiles: sortProfiles([profile, ...others]),
      drawOffered: offer ? { ...get().drawOffered, [id]: true } : get().drawOffered,
      profileChosen: true,
      reviewDue: null,
    });
    void get().refreshReviewDue();
    return offer ? "/sorteo" : "/inicio";
  },

  signOut: () => set({ profile: null, settings: null, reviewDue: null }),

  createProfile: async (name, color, avatar) => {
    const created = await api.createProfile(name, color, avatar);
    set({ profiles: sortProfiles([created, ...get().profiles]) });
    return created;
  },

  updateProfile: async (id, name, color, avatar) => {
    const updated = await api.updateProfile(id, name, color, avatar);
    set({
      profiles: get().profiles.map((p) => (p.id === id ? updated : p)),
      profile: get().profile?.id === id ? updated : get().profile,
    });
    return updated;
  },

  deleteProfile: async (id) => {
    await api.deleteProfile(id);
    const { [id]: _removed, ...draws } = get().draws;
    set({
      profiles: get().profiles.filter((p) => p.id !== id),
      profile: get().profile?.id === id ? null : get().profile,
      settings: get().profile?.id === id ? null : get().settings,
      draws,
    });
  },

  saveSettings: async (patch) => {
    const { profile, settings } = get();
    if (!profile || !settings) return false;
    const next = { ...settings, ...patch };
    set({ settings: next });
    try {
      const saved = await api.updateSettings(profile.id, next);
      if (get().profile?.id === profile.id) set({ settings: saved });
      return true;
    } catch (error) {
      if (get().profile?.id === profile.id) set({ settings });
      toast.error("No se han podido guardar los ajustes", errorMessage(error));
      return false;
    }
  },

  ensureDraw: async (profileId) => {
    const existing = get().draws[profileId];
    if (existing) return existing.draw;
    let pending = inflightDraws.get(profileId);
    if (!pending) {
      pending = api
        .drawRandomExam(profileId)
        .then((draw) => {
          set({ draws: { ...get().draws, [profileId]: { draw, status: "pending" } } });
          return draw;
        })
        .finally(() => inflightDraws.delete(profileId));
      inflightDraws.set(profileId, pending);
    }
    return pending;
  },

  markDrawStarted: (profileId) => {
    const entry = get().draws[profileId];
    if (entry) set({ draws: { ...get().draws, [profileId]: { ...entry, status: "started" } } });
  },

  refreshReviewDue: async () => {
    const id = get().profile?.id;
    if (!id) return;
    try {
      const summary = await api.getReviewSummary(id);
      if (get().profile?.id === id) set({ reviewDue: summary.due });
    } catch {
      // la insignia es informativa: si falla, no se muestra
    }
  },
}));

/** Selector del sorteo pendiente del perfil activo. */
export function usePendingDraw(): DrawEntry | null {
  return useSession((s) => {
    const id = s.profile?.id;
    const entry = id ? s.draws[id] : undefined;
    return entry && entry.status === "pending" ? entry : null;
  });
}
