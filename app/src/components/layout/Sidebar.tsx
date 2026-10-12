// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import type { ReactNode } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
  BookOpen,
  Briefcase,
  Calculator,
  ChartLine,
  Dices,
  House,
  Landmark,
  Layers,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Settings,
  Timer,
} from "lucide-react";
import { COPYRIGHT_LINE } from "@/content/legal";
import { cn } from "@/lib/cn";
import { playSfx } from "@/lib/sfx";
import { APP_VERSION } from "@/lib/version";
import { usePendingDraw, useSession } from "@/store/session";
import { Logo } from "@/components/ui/display";
import { Tooltip } from "@/components/ui/overlays";
import { SupportNavItem, SupportSidebarButton } from "@/components/support/SupportCorner";
import { ProfileSwitcher } from "./ProfileSwitcher";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  badge?: number | null;
}

function SideLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const link = (
    <NavLink
      to={item.to}
      onClick={() => playSfx("nav")}
      className={({ isActive }) =>
        cn(
          "group relative flex h-9 items-center gap-3 rounded-lg text-[13.5px] font-medium transition-colors duration-150",
          collapsed ? "w-10 justify-center" : "px-3",
          isActive ? "bg-surface-2 text-fg ring-1 ring-border" : "text-fg-muted hover:bg-surface-2/70 hover:text-fg",
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive ? <span className="absolute -left-3 top-2 h-5 w-[3px] rounded-r-full bg-accent" aria-hidden /> : null}
          <span className={cn("[&_svg]:size-[18px]", isActive ? "text-accent-text" : "text-fg-subtle group-hover:text-fg-muted")}>
            {item.icon}
          </span>
          {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : <span className="sr-only">{item.label}</span>}
          {item.badge ? (
            <span
              className={cn(
                "grid min-w-5 place-items-center rounded-full bg-accent px-1.5 text-[10.5px] font-semibold leading-5 text-accent-fg tabular-nums",
                collapsed && "absolute -right-1 -top-1 min-w-4 px-1 text-[9px] leading-4",
              )}
              aria-label={`${item.badge} pendientes`}
            >
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  );
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  );
}

function Group({ label, collapsed, children }: { label?: string; collapsed: boolean; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      {label && !collapsed ? (
        <p className="px-3 pb-1.5 pt-4 text-[10.5px] font-semibold uppercase tracking-[0.1em] text-fg-subtle">{label}</p>
      ) : label ? (
        <div className="mx-auto my-3 h-px w-6 bg-border" aria-hidden />
      ) : null}
      {children}
    </div>
  );
}

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const reviewDue = useSession((s) => s.reviewDue);
  const backend = useSession((s) => s.backend);
  const version = useSession((s) => s.appInfo?.version ?? APP_VERSION);
  const pending = usePendingDraw();
  const navigate = useNavigate();

  const main: NavItem[] = [
    { to: "/inicio", label: "Inicio", icon: <House /> },
    { to: "/teoria", label: "Teoría", icon: <BookOpen /> },
  ];
  const train: NavItem[] = [
    { to: "/simulacro", label: "Simulacro", icon: <Timer /> },
    { to: "/oficiales", label: "Exámenes oficiales", icon: <Landmark /> },
    { to: "/temas", label: "Practicar por temas", icon: <Layers /> },
    { to: "/supuestos", label: "Supuestos prácticos", icon: <Briefcase /> },
    { to: "/repaso", label: "Repaso de fallos", icon: <RotateCcw />, badge: reviewDue },
  ];
  const analyze: NavItem[] = [
    { to: "/estadisticas", label: "Estadísticas", icon: <ChartLine /> },
    { to: "/calculadora", label: "Calculadora de nota", icon: <Calculator /> },
  ];

  return (
    <aside
      aria-label="Navegación principal"
      className={cn(
        "relative flex h-full shrink-0 flex-col border-r border-border bg-panel transition-[width] duration-200",
        collapsed ? "w-[72px] items-center" : "w-[252px]",
      )}
    >
      <div className={cn("flex h-16 shrink-0 items-center", collapsed ? "justify-center" : "justify-between pl-5 pr-3")}>
        <button type="button" onClick={() => navigate("/inicio")} className="rounded-lg" aria-label="OpoTAI · Inicio">
          <Logo withText={!collapsed} size={collapsed ? 34 : 32} />
        </button>
        {!collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label="Plegar la barra lateral"
            className="grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
          >
            <PanelLeftClose className="size-4" />
          </button>
        ) : null}
      </div>

      <nav className={cn("min-h-0 flex-1 overflow-y-auto pb-3", collapsed ? "px-2" : "px-3")}>
        <Group collapsed={collapsed}>
          {main.map((i) => (
            <SideLink key={i.to} item={i} collapsed={collapsed} />
          ))}
        </Group>
        <Group label="Entrenar" collapsed={collapsed}>
          {train.map((i) => (
            <SideLink key={i.to} item={i} collapsed={collapsed} />
          ))}
        </Group>
        <Group label="Analizar" collapsed={collapsed}>
          {analyze.map((i) => (
            <SideLink key={i.to} item={i} collapsed={collapsed} />
          ))}
        </Group>
        <Group label="App" collapsed={collapsed}>
          <SideLink item={{ to: "/ajustes", label: "Ajustes", icon: <Settings /> }} collapsed={collapsed} />
          <SupportNavItem collapsed={collapsed} />
        </Group>
      </nav>

      <div className={cn("shrink-0 space-y-2 border-t border-border pb-3 pt-3", collapsed ? "w-full px-2" : "px-3")}>
        {pending ? (
          collapsed ? (
            <Tooltip content={`Simulacro sorpresa pendiente: ${pending.draw.title}`} side="right" className="w-full justify-center">
              <button
                type="button"
                onClick={() => {
                  playSfx("nav");
                  navigate("/sorteo");
                }}
                className="mx-auto grid size-10 place-items-center rounded-lg bg-warning-soft text-warning-text"
                aria-label={`Simulacro sorpresa pendiente: ${pending.draw.title}`}
              >
                <Dices className="size-[18px]" />
              </button>
            </Tooltip>
          ) : (
            <button
              type="button"
              onClick={() => {
                playSfx("nav");
                navigate("/sorteo");
              }}
              className="flex w-full items-center gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-left transition-colors hover:border-warning/60"
            >
              <Dices className="size-4 shrink-0 text-warning-text" aria-hidden />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wider text-warning-text">Simulacro pendiente</span>
                <span className="block truncate text-[12.5px] font-medium text-fg">{pending.draw.title}</span>
              </span>
            </button>
          )
        ) : null}

        <SupportSidebarButton collapsed={collapsed} />

        {backend === "mock" ? (
          collapsed ? (
            <Tooltip content="Modo demo · navegador: datos guardados en este navegador" side="right" className="w-full justify-center">
              <span className="mx-auto block size-2.5 rounded-full bg-warning ring-4 ring-warning/20" aria-label="Modo demo" />
            </Tooltip>
          ) : (
            <Tooltip content="Backend simulado: preguntas de ejemplo y datos guardados solo en este navegador" side="top">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-fg-muted">
                <span className="size-1.5 rounded-full bg-warning" aria-hidden />
                Modo demo · navegador
              </span>
            </Tooltip>
          )
        ) : null}

        <ProfileSwitcher collapsed={collapsed} />

        {collapsed ? (
          <>
            <Tooltip content="Desplegar la barra lateral" side="right" className="w-full justify-center">
              <button
                type="button"
                onClick={onToggle}
                aria-label="Desplegar la barra lateral"
                className="mx-auto grid size-9 place-items-center rounded-lg text-fg-subtle hover:bg-surface-2 hover:text-fg"
              >
                <PanelLeftOpen className="size-4" />
              </button>
            </Tooltip>
            <Tooltip content={`OpoTAI v${version} · ${COPYRIGHT_LINE} · Acerca de`} side="right" className="w-full justify-center">
              <button
                type="button"
                onClick={() => navigate("/ajustes/acerca-de")}
                className="mx-auto block rounded-md px-1 text-[10.5px] font-medium tabular-nums text-fg-subtle hover:text-fg"
              >
                v{version}
              </button>
            </Tooltip>
          </>
        ) : (
          <button
            type="button"
            onClick={() => navigate("/ajustes/acerca-de")}
            className="block w-full rounded-md px-1 text-left text-[11px] leading-4 text-fg-subtle transition-colors hover:text-fg"
            aria-label={`OpoTAI v${version}, ${COPYRIGHT_LINE}. Acerca de`}
          >
            OpoTAI v{version} · {COPYRIGHT_LINE}
          </button>
        )}
      </div>
    </aside>
  );
}
