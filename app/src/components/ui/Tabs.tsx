// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { playSfx } from "@/lib/sfx";

export interface TabItem<T extends string> {
  id: T;
  label: ReactNode;
  icon?: ReactNode;
  count?: ReactNode;
  disabled?: boolean;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T, via: "pointer" | "keyboard") => void;
  label: string;
  variant?: "pills" | "underline";
  className?: string;
  /** id base para enlazar con los paneles (aria-controls). */
  idBase?: string;
}

export function Tabs<T extends string>({ items, value, onChange, label, variant = "pills", className, idBase }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent) => {
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.id === value);
    let next = -1;
    if (event.key === "ArrowRight") next = (idx + 1) % enabled.length;
    else if (event.key === "ArrowLeft") next = (idx - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    if (next < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const item = enabled[next];
    if (!item) return;
    onChange(item.id, "keyboard");
    refs.current[items.indexOf(item)]?.focus();
  };
  return (
    <div
      role="tablist"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn(
        "flex items-center",
        variant === "pills" ? "gap-1 rounded-xl border border-border bg-surface-2 p-1" : "gap-5 border-b border-border",
        className,
      )}
    >
      {items.map((item, i) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            id={idBase ? `${idBase}-tab-${item.id}` : undefined}
            aria-controls={idBase ? `${idBase}-panel-${item.id}` : undefined}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            disabled={item.disabled}
            onClick={(event) => {
              if (!active) playSfx("nav");
              onChange(item.id, event.detail === 0 ? "keyboard" : "pointer");
              if (event.detail > 0) event.currentTarget.blur();
            }}
            className={cn(
              "relative inline-flex items-center gap-2 whitespace-nowrap text-[13px] font-medium transition-colors disabled:opacity-40 [&_svg]:size-4",
              variant === "pills"
                ? cn("h-8 rounded-lg px-3", active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted hover:text-fg")
                : cn("h-10 px-0.5", active ? "text-fg" : "text-fg-muted hover:text-fg"),
            )}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums",
                  active ? "bg-accent-soft text-accent-text" : "bg-surface-3 text-fg-muted",
                )}
              >
                {item.count}
              </span>
            ) : null}
            {variant === "underline" && active ? (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-accent" aria-hidden />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
