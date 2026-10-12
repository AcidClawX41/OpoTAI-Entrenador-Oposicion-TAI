// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Botones que abren el diálogo de apoyo («☕ Invítame a un café o dona»):
 *  - `SupportCorner`: pastilla flotante compacta para las pantallas sin barra lateral (perfiles).
 *  - `SupportSidebarButton`: la misma pastilla en el pie de la barra lateral, donde no tapa nada.
 *  - `SupportNavItem`: entrada «Apoyar el proyecto» (corazón) de la sección App.
 */
import { Heart } from "lucide-react";
import { SUPPORT_CORNER_ARIA, SUPPORT_NAV_LABEL, SUPPORT_PILL_EMOJI, SUPPORT_PILL_LABEL } from "@/content/support";
import { cn } from "@/lib/cn";
import { playSfx } from "@/lib/sfx";
import { useUi } from "@/store/ui";
import { Tooltip } from "@/components/ui/overlays";

function useOpenSupport() {
  const setOpen = useUi((s) => s.setSupportOpen);
  return () => {
    playSfx("nav");
    setOpen(true);
  };
}

function PillContent() {
  return (
    <>
      <span className="support-pill__emoji" aria-hidden>
        {SUPPORT_PILL_EMOJI}
      </span>
      <span className="support-pill__label">{SUPPORT_PILL_LABEL}</span>
    </>
  );
}

/** Pastilla flotante en la esquina inferior derecha (solo en pantallas sin barra lateral). */
export function SupportCorner() {
  const open = useOpenSupport();
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-40">
      <button type="button" aria-label={SUPPORT_CORNER_ARIA} onClick={open} className="support-pill pointer-events-auto">
        <PillContent />
      </button>
    </div>
  );
}

/** Pastilla del pie de la barra lateral; plegada, solo el emoji con su descripción emergente. */
export function SupportSidebarButton({ collapsed }: { collapsed: boolean }) {
  const open = useOpenSupport();
  if (collapsed)
    return (
      <Tooltip content={`${SUPPORT_PILL_EMOJI} ${SUPPORT_PILL_LABEL}`} side="right" className="w-full justify-center">
        <button type="button" aria-label={SUPPORT_CORNER_ARIA} onClick={open} className="support-pill support-pill--icon mx-auto">
          <span className="support-pill__emoji" aria-hidden>
            {SUPPORT_PILL_EMOJI}
          </span>
        </button>
      </Tooltip>
    );
  return (
    <button type="button" aria-label={SUPPORT_CORNER_ARIA} onClick={open} className="support-pill w-full justify-center">
      <PillContent />
    </button>
  );
}

/** Entrada «Apoyar el proyecto» de la barra lateral (abre el diálogo de donaciones). */
export function SupportNavItem({ collapsed }: { collapsed: boolean }) {
  const open = useOpenSupport();
  const supportOpen = useUi((s) => s.supportOpen);
  const button = (
    <button
      type="button"
      onClick={open}
      aria-haspopup="dialog"
      aria-expanded={supportOpen}
      className={cn(
        "group relative flex h-9 w-full items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors duration-150",
        collapsed ? "w-10 justify-center" : "px-3",
        supportOpen ? "bg-surface-2 text-fg ring-1 ring-border" : "text-fg-muted hover:bg-surface-2/70 hover:text-fg",
      )}
    >
      <span className="text-[#db2777] transition-transform duration-200 group-hover:scale-110 dark:text-[#f472b6] [&_svg]:size-[18px]">
        <Heart className="fill-[#db2777]/15 dark:fill-[#f472b6]/20" />
      </span>
      {!collapsed ? <span className="min-w-0 flex-1 truncate text-left">{SUPPORT_NAV_LABEL}</span> : <span className="sr-only">{SUPPORT_NAV_LABEL}</span>}
    </button>
  );
  return collapsed ? (
    <Tooltip content={SUPPORT_NAV_LABEL} side="right">
      {button}
    </Tooltip>
  ) : (
    button
  );
}
