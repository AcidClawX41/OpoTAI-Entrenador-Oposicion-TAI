// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-border bg-surface shadow-card", className)} {...props} />;
}

interface CardHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, description, icon, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-4 px-5 pt-5", className)} {...props}>
      <div className="flex min-w-0 items-start gap-3">
        {icon ? (
          <div className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent-text [&_svg]:size-4">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-6 tracking-tight text-fg">{title}</h3>
          {description ? <p className="mt-0.5 text-[13px] leading-5 text-fg-muted">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex items-center gap-2 border-t border-border px-5 py-3.5", className)} {...props} />;
}
