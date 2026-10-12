// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { CircleAlert, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Splash({ label = "Cargando OpoTAI…" }: { label?: string }) {
  return (
    <div className="app-backdrop grid h-full place-items-center">
      <div className="flex flex-col items-center gap-5" role="status">
        <img src="/opotai.svg" alt="" width={72} height={72} className="animate-pulse-soft drop-shadow-[0_10px_30px_rgba(124,58,237,0.45)]" />
        <p className="text-sm text-fg-muted">{label}</p>
      </div>
    </div>
  );
}

export function BootError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="app-backdrop grid h-full place-items-center p-6">
      <div className="max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-pop">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-danger-soft text-danger-text">
          <CircleAlert className="size-6" />
        </div>
        <h1 className="text-lg font-semibold text-fg">No se ha podido iniciar OpoTAI</h1>
        <p className="mt-2 text-sm leading-6 text-fg-muted">{message ?? "Error desconocido."}</p>
        <Button className="mt-6" variant="primary" leftIcon={<RotateCw className="size-4" />} onClick={onRetry}>
          Reintentar
        </Button>
      </div>
    </div>
  );
}
