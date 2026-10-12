// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone = "neutral" | "accent" | "success" | "danger" | "warning" | "info";

const SOFT: Record<BadgeTone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-border",
  accent: "bg-accent-soft text-accent-text border-transparent",
  success: "bg-success-soft text-success-text border-transparent",
  danger: "bg-danger-soft text-danger-text border-transparent",
  warning: "bg-warning-soft text-warning-text border-transparent",
  info: "bg-info-soft text-info-text border-transparent",
};

const SOLID: Record<BadgeTone, string> = {
  neutral: "bg-fg text-bg border-transparent",
  accent: "bg-accent text-accent-fg border-transparent",
  success: "bg-success text-white border-transparent",
  danger: "bg-danger text-white border-transparent",
  warning: "bg-warning text-white border-transparent",
  info: "bg-info text-white border-transparent",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  variant?: "soft" | "solid" | "outline";
  size?: "sm" | "md";
  icon?: ReactNode;
}

export function Badge({ tone = "neutral", variant = "soft", size = "sm", icon, className, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full border font-medium [&_svg]:shrink-0",
        size === "sm" ? "h-5.5 px-2 text-[11px] [&_svg]:size-3" : "h-6.5 px-2.5 text-xs [&_svg]:size-3.5",
        variant === "solid" ? SOLID[tone] : variant === "outline" ? cn("bg-transparent", SOFT[tone], "border-current/25") : SOFT[tone],
        className,
      )}
      {...props}
    >
      {icon}
      <span className="truncate">{children}</span>
    </span>
  );
}
