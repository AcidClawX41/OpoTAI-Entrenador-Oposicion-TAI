// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { isRouteErrorResponse, useRouteError } from "react-router-dom";
import { CircleAlert, House } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Pantalla de error de ruta (excepciones de renderizado). */
export function RouteError() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error)
    ? `${error.status} · ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "Error inesperado.";
  return (
    <div className="app-backdrop grid h-full place-items-center p-6">
      <div className="max-w-lg rounded-2xl border border-border bg-surface p-8 text-center shadow-pop">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-text">
          <CircleAlert className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-fg">Algo ha fallado en esta pantalla</h1>
        <p className="mt-2 break-words text-sm leading-6 text-fg-muted">{message}</p>
        <Button
          className="mt-6"
          variant="primary"
          leftIcon={<House className="size-4" />}
          onClick={() => {
            window.location.hash = "#/inicio";
            window.location.reload();
          }}
        >
          Volver al inicio
        </Button>
      </div>
    </div>
  );
}
