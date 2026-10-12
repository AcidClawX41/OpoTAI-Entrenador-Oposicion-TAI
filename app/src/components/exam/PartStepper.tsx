// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Cabecera del examen en dos partes: «Parte 1 · Cuestionario → Parte 2 · Supuesto práctico»,
 * con el progreso de cada parte. Es una lista de pestañas accesible (flechas, Inicio y Fin).
 */
import { Fragment, useRef, type KeyboardEvent } from "react";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { playSfx } from "@/lib/sfx";
import type { TabKey } from "@/lib/exam/model";

export interface PartStep {
  id: TabKey;
  part: number;
  name: string;
  answered: number;
  total: number;
  /** Texto breve bajo la barra (p. ej. «elige 1 de 2»). */
  hint?: string;
}

interface PartStepperProps {
  steps: PartStep[];
  value: TabKey;
  onChange: (id: TabKey) => void;
  className?: string;
}

export function PartStepper({ steps, value, onChange, className }: PartStepperProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const idx = steps.findIndex((s) => s.id === value);
    let next = -1;
    if (event.key === "ArrowRight") next = (idx + 1) % steps.length;
    else if (event.key === "ArrowLeft") next = (idx - 1 + steps.length) % steps.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = steps.length - 1;
    if (next < 0) return;
    event.preventDefault();
    event.stopPropagation();
    const step = steps[next];
    if (!step) return;
    onChange(step.id);
    refs.current[next]?.focus();
  };

  return (
    <div role="tablist" aria-label="Partes del examen" onKeyDown={onKeyDown} className={cn("flex min-w-0 items-center gap-1.5", className)}>
      {steps.map((step, i) => {
        const active = step.id === value;
        const ratio = step.total > 0 ? Math.min(1, step.answered / step.total) : 0;
        const complete = step.total > 0 && step.answered >= step.total;
        return (
          <Fragment key={step.id}>
            {i > 0 ? <ChevronRight className="size-4 shrink-0 text-fg-subtle" aria-hidden /> : null}
            <button
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              aria-label={`Parte ${step.part} · ${step.name}: ${step.answered} de ${step.total} respondidas${step.hint ? ` (${step.hint})` : ""}`}
              onClick={(event) => {
                if (!active) playSfx("nav");
                onChange(step.id);
                if (event.detail > 0) event.currentTarget.blur();
              }}
              className={cn(
                "group flex min-w-0 items-center gap-2.5 rounded-xl border px-2.5 py-1.5 text-left transition-colors",
                active ? "border-accent/45 bg-accent-soft" : "border-transparent hover:border-border hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-full text-[12.5px] font-bold tabular-nums transition-colors",
                  complete ? "bg-success text-white" : active ? "bg-accent text-accent-fg" : "bg-surface-3 text-fg-muted group-hover:text-fg",
                )}
                aria-hidden
              >
                {complete ? <Check className="size-3.5" strokeWidth={3} /> : step.part}
              </span>
              <span className="min-w-0">
                <span className={cn("block truncate text-[12.5px] font-semibold leading-4", active ? "text-fg" : "text-fg-muted group-hover:text-fg")}>
                  Parte {step.part} · {step.name}
                </span>
                <span className="mt-1 flex items-center gap-2" aria-hidden>
                  <span className={cn("h-1 w-16 overflow-hidden rounded-full xl:w-20", active ? "bg-accent/20" : "bg-surface-3")}>
                    <span
                      className={cn("block h-full rounded-full transition-[width] duration-300", complete ? "bg-success" : "bg-accent")}
                      style={{ width: `${ratio * 100}%` }}
                    />
                  </span>
                  <span className="whitespace-nowrap text-[11px] font-medium tabular-nums text-fg-muted">
                    {formatInt(step.answered)}/{formatInt(step.total)}
                    {step.hint ? <span className="hidden text-fg-subtle 2xl:inline"> · {step.hint}</span> : null}
                  </span>
                </span>
              </span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
