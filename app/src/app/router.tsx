// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import type { ComponentType } from "react";
import { createHashRouter, Navigate, type RouteObject } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Splash } from "@/components/layout/Splash";
import { RequireProfile, Root } from "./Root";
import { RouteError } from "./RouteError";
import ProfilesPage from "@/pages/ProfilesPage";

/** Página con carga diferida: cada pantalla va en su propio fragmento (el inicial pesa menos). */
function page(load: () => Promise<{ default: ComponentType }>): Pick<RouteObject, "lazy"> {
  return { lazy: () => load().then((m) => ({ Component: m.default })) };
}

/** Rutas de la app (hash router: funciona igual en Tauri y en el navegador). */
export const router = createHashRouter([
  {
    element: <Root />,
    errorElement: <RouteError />,
    hydrateFallbackElement: <Splash />,
    children: [
      { path: "/perfiles", element: <ProfilesPage /> },
      {
        element: <RequireProfile />,
        children: [
          { path: "/sorteo", ...page(() => import("@/pages/SurprisePage")) },
          { path: "/examen/:attemptId", ...page(() => import("@/pages/ExamPage")) },
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/inicio" replace /> },
              { path: "/inicio", ...page(() => import("@/pages/HomePage")) },
              { path: "/teoria", ...page(() => import("@/pages/TheoryIndexPage")) },
              { path: "/teoria/:topicId", ...page(() => import("@/pages/TheoryTopicPage")) },
              { path: "/simulacro", ...page(() => import("@/pages/SimulacroPage")) },
              { path: "/oficiales", ...page(() => import("@/pages/OfficialExamsPage")) },
              { path: "/temas", ...page(() => import("@/pages/PracticePage")) },
              { path: "/supuestos", ...page(() => import("@/pages/CasesPage")) },
              { path: "/repaso", ...page(() => import("@/pages/ReviewPage")) },
              { path: "/estadisticas", ...page(() => import("@/pages/StatsPage")) },
              { path: "/calculadora", ...page(() => import("@/pages/CalculatorPage")) },
              { path: "/ajustes", ...page(() => import("@/pages/SettingsPage")) },
              { path: "/ajustes/:section", ...page(() => import("@/pages/SettingsPage")) },
              { path: "/resultados/:attemptId", ...page(() => import("@/pages/ResultsPage")) },
              { path: "*", ...page(() => import("@/pages/NotFoundPage")) },
            ],
          },
        ],
      },
    ],
  },
]);
