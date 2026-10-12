// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Piezas pequeñas del sistema de diseño: Kbd, Spinner, Skeleton, Progress, Divider. */
import type { HTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Kbd({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border border-border-strong bg-surface-2 px-1 font-sans text-[10.5px] font-semibold text-fg-muted shadow-[inset_0_-1px_0_var(--app-border-strong)]",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function Spinner({ className, label = "Cargando…" }: { className?: string; label?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-fg-muted", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("skeleton rounded-lg", className)} {...props} />;
}

export type ProgressTone = "accent" | "success" | "danger" | "warning" | "info" | "neutral";

const FILL: Record<ProgressTone, string> = {
  accent: "bg-accent",
  success: "bg-success",
  danger: "bg-danger",
  warning: "bg-warning",
  info: "bg-info",
  neutral: "bg-fg-subtle",
};

const TRACK: Record<ProgressTone, string> = {
  accent: "bg-accent/15",
  success: "bg-success/15",
  danger: "bg-danger/15",
  warning: "bg-warning/18",
  info: "bg-info/15",
  neutral: "bg-surface-3",
};

interface ProgressProps {
  value: number;
  max?: number;
  tone?: ProgressTone;
  size?: "xs" | "sm" | "md";
  className?: string;
  label?: string;
  /** Marca vertical (p. ej. el corte) en la misma escala que `value`. */
  marker?: number | null;
}

export function Progress({ value, max = 1, tone = "accent", size = "sm", className, label, marker = null }: ProgressProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0;
  const markerPct = marker !== null && max > 0 ? Math.min(100, Math.max(0, (marker / max) * 100)) : null;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value * 100) / 100}
      className={cn(
        "relative w-full overflow-hidden rounded-full",
        size === "xs" ? "h-1" : size === "sm" ? "h-1.5" : "h-2.5",
        TRACK[tone],
        className,
      )}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-500 ease-out", FILL[tone])}
        style={{ width: `${pct}%` }}
      />
      {markerPct !== null ? (
        <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-fg/70" style={{ left: `${markerPct}%` }} aria-hidden />
      ) : null}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div role="separator" className={cn("h-px w-full bg-border", className)} />;
}

/** Sobrelínea pequeña en mayúsculas para títulos de sección. */
export function Eyebrow({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn("text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle", className)}>{children}</p>;
}
