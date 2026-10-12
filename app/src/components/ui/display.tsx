// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Componentes de presentación: EmptyState, ErrorState, PageHeader, Stat, Meter, Avatar y Logo. */
import type { ReactNode } from "react";
import { CircleAlert, RotateCw } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "./Button";
import { Progress, type ProgressTone } from "./misc";

// ───────────────────────────── EmptyState / ErrorState ─────────────────────────────

interface EmptyStateProps {
  icon: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({ icon, title, description, action, className, compact }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-2xl bg-accent/25 blur-xl" aria-hidden />
        <div className="relative grid size-12 place-items-center rounded-2xl border border-border bg-surface-2 text-accent-text [&_svg]:size-5.5">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-semibold tracking-tight text-fg">{title}</h3>
      {description ? <p className="mt-1.5 max-w-md text-sm leading-6 text-fg-muted">{description}</p> : null}
      {action ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className }: { message: string; onRetry?: () => void; className?: string }) {
  return (
    <EmptyState
      className={className}
      icon={<CircleAlert />}
      title="No se ha podido cargar"
      description={message}
      action={
        onRetry ? (
          <Button size="sm" leftIcon={<RotateCw className="size-3.5" />} onClick={onRetry}>
            Reintentar
          </Button>
        ) : undefined
      }
    />
  );
}

// ───────────────────────────── PageHeader ─────────────────────────────

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("mb-7 flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <div className="mb-2">{eyebrow}</div> : null}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg text-balance">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-[15px] leading-6 text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

// ───────────────────────────── Stat ─────────────────────────────

interface StatProps {
  label: ReactNode;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
  tone?: "accent" | "success" | "warning" | "danger" | "info";
  className?: string;
}

const STAT_TONES = {
  accent: "bg-accent-soft text-accent-text",
  success: "bg-success-soft text-success-text",
  warning: "bg-warning-soft text-warning-text",
  danger: "bg-danger-soft text-danger-text",
  info: "bg-info-soft text-info-text",
} as const;

export function Stat({ label, value, icon, hint, tone = "accent", className }: StatProps) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface p-4 shadow-card", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13px] font-medium text-fg-muted">{label}</p>
        {icon ? <span className={cn("grid size-7 place-items-center rounded-lg [&_svg]:size-3.5", STAT_TONES[tone])}>{icon}</span> : null}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-fg">{value}</p>
      {hint ? <p className="mt-1 truncate text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

// ───────────────────────────── Meter ─────────────────────────────

interface MeterProps {
  label: ReactNode;
  value: number; // 0–1
  valueText: string;
  tone?: ProgressTone;
  sublabel?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function Meter({ label, value, valueText, tone = "accent", sublabel, icon, className }: MeterProps) {
  return (
    <div className={className}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-fg">
          {icon ? <span className="text-fg-subtle [&_svg]:size-3.5">{icon}</span> : null}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-[13px] font-semibold tabular-nums text-fg">{valueText}</span>
      </div>
      <Progress value={value} max={1} tone={tone} size="md" label={typeof label === "string" ? label : undefined} />
      {sublabel ? <p className="mt-1 text-xs text-fg-subtle">{sublabel}</p> : null}
    </div>
  );
}

// ───────────────────────────── Avatar ─────────────────────────────

/** Alias histórico: el avatar de perfil es `ProfileAvatar` (imagen propia, emoji o iniciales). */
export { ProfileAvatar as Avatar } from "@/components/profile/ProfileAvatar";

// ───────────────────────────── Logo ─────────────────────────────

export function Logo({ className, withText = true, size = 32 }: { className?: string; withText?: boolean; size?: number }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img src="/opotai.svg" alt="" width={size} height={size} className="shrink-0 drop-shadow-[0_4px_14px_rgba(124,58,237,0.35)]" />
      {withText ? (
        <span className="leading-none">
          <span className="block text-[17px] font-bold tracking-tight text-fg">
            Opo<span className="brand-text">TAI</span>
          </span>
          <span className="mt-1 block text-[10.5px] font-medium uppercase tracking-[0.12em] text-fg-subtle">Oposición TAI · AGE</span>
        </span>
      ) : null}
    </span>
  );
}
