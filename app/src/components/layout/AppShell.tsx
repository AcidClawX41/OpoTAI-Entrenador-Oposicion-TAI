// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { useUi } from "@/store/ui";
import { Sidebar } from "./Sidebar";

/** Armazón con barra lateral (plegada a iconos por debajo de 1200 px) y contenido desplazable. */
export function AppShell() {
  const narrow = useMediaQuery("(max-width: 1199px)");
  const manual = useUi((s) => s.sidebarCollapsed);
  const setCollapsed = useUi((s) => s.setSidebarCollapsed);
  const collapsed = manual ?? narrow;
  const mainRef = useRef<HTMLElement>(null);
  const { pathname } = useLocation();

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div className="flex h-full">
      <a
        href="#contenido"
        onClick={(e) => {
          e.preventDefault();
          mainRef.current?.focus();
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
      >
        Saltar al contenido
      </a>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
      <main ref={mainRef} id="contenido" tabIndex={-1} className="app-backdrop min-w-0 flex-1 overflow-y-auto outline-none">
        <div className="mx-auto w-full max-w-[1280px] px-6 pb-36 pt-8 xl:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
