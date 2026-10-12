// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Controles de formulario accesibles: Switch, Select, NumberField, Slider, Segmented y Field. */
import { useId, useRef, type InputHTMLAttributes, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { Check, ChevronDown, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { playSfx } from "@/lib/sfx";

// ───────────────────────────── Switch ─────────────────────────────

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, id, className }: SwitchProps) {
  const autoId = useId();
  const switchId = id ?? autoId;
  const descId = description ? `${switchId}-desc` : undefined;
  const control = (
    <button
      id={switchId}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-describedby={descId}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5.5 w-9.5 shrink-0 items-center rounded-full border transition-colors duration-200 disabled:opacity-50",
        checked ? "border-transparent bg-accent" : "border-border-strong bg-surface-3",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute left-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
  if (!label) return <span className={className}>{control}</span>;
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <label htmlFor={switchId} className="block cursor-pointer text-sm font-medium text-fg">
          {label}
        </label>
        {description ? (
          <p id={descId} className="mt-0.5 text-[13px] leading-5 text-fg-muted">
            {description}
          </p>
        ) : null}
      </div>
      <div className="pt-0.5">{control}</div>
    </div>
  );
}

// ───────────────────────────── Checkbox ─────────────────────────────

interface CheckboxProps {
  checked: boolean | "mixed";
  onChange: (checked: boolean) => void;
  label: ReactNode;
  /** Oculta la etiqueta visualmente (sigue siendo accesible). */
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

/** Casilla accesible con estado intermedio («mixed») para selecciones jerárquicas. */
export function Checkbox({ checked, onChange, label, hideLabel, disabled, className }: CheckboxProps) {
  const on = checked === true;
  const mixed = checked === "mixed";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={mixed ? "mixed" : on}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={cn("group inline-flex min-w-0 items-center gap-2.5 text-left disabled:opacity-50", className)}
    >
      <span
        aria-hidden
        className={cn(
          "grid size-4.5 shrink-0 place-items-center rounded-[5px] border transition-colors duration-150",
          on || mixed ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface-2 group-hover:border-fg-subtle",
        )}
      >
        {on ? <Check className="size-3.5" strokeWidth={3} /> : mixed ? <Minus className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span className={cn("min-w-0", hideLabel && "sr-only")}>{label}</span>
    </button>
  );
}

// ───────────────────────────── Select ─────────────────────────────

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className="h-9.5 w-full appearance-none rounded-lg border border-border bg-surface-2 py-0 pl-3 pr-9 text-sm text-fg transition-colors hover:border-border-strong focus-visible:border-accent"
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
    </div>
  );
}

// ───────────────────────────── NumberField ─────────────────────────────

interface NumberFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
  hideLabel?: boolean;
}

export function NumberField({ value, onChange, min = 0, max = 999, step = 1, label, invalid, disabled, className, hideLabel }: NumberFieldProps) {
  const id = useId();
  const clamp = (n: number) => Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className={cn("mb-1.5 block text-xs font-medium text-fg-muted", hideLabel && "sr-only")}>
        {label}
      </label>
      <div
        className={cn(
          "flex h-10 items-center rounded-lg border bg-surface-2 transition-colors focus-within:border-accent",
          invalid ? "border-danger" : "border-border hover:border-border-strong",
          disabled && "opacity-50",
        )}
      >
        <button
          type="button"
          aria-label={`Restar ${step} a ${label}`}
          disabled={disabled || value <= min}
          onClick={() => onChange(clamp(value - step))}
          className="grid h-full w-9 shrink-0 place-items-center rounded-l-lg text-fg-muted hover:text-fg disabled:opacity-40"
        >
          <Minus className="size-3.5" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          value={Number.isFinite(value) ? value : ""}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={(e) => onChange(e.target.value === "" ? min : clamp(Math.round(Number(e.target.value))))}
          className="h-full w-full min-w-0 bg-transparent text-center text-[15px] font-semibold tabular-nums text-fg outline-none"
        />
        <button
          type="button"
          aria-label={`Sumar ${step} a ${label}`}
          disabled={disabled || value >= max}
          onClick={() => onChange(clamp(value + step))}
          className="grid h-full w-9 shrink-0 place-items-center rounded-r-lg text-fg-muted hover:text-fg disabled:opacity-40"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Slider ─────────────────────────────

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  valueText?: string;
  disabled?: boolean;
  className?: string;
}

export function Slider({ value, onChange, min, max, step = 1, label, valueText, disabled, className }: SliderProps) {
  const pct = ((value - min) / Math.max(1e-9, max - min)) * 100;
  return (
    <input
      type="range"
      aria-label={label}
      aria-valuetext={valueText}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value))}
      className={cn("opo-range w-full disabled:opacity-50", className)}
      style={{ ["--fill" as string]: `${pct}%` }}
    />
  );
}

// ───────────────────────────── Segmented ─────────────────────────────

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
}

interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  label: string;
  size?: "sm" | "md";
  className?: string;
  fullWidth?: boolean;
}

export function Segmented<T extends string>({ options, value, onChange, label, size = "md", className, fullWidth }: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const enabled = options.filter((o) => !o.disabled);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    event.stopPropagation();
    const idx = enabled.findIndex((o) => o.value === value);
    let next = idx;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (idx + 1) % enabled.length;
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (idx - 1 + enabled.length) % enabled.length;
    else if (event.key === "Home") next = 0;
    else next = enabled.length - 1;
    const opt = enabled[next];
    if (opt) {
      onChange(opt.value);
      refs.current[options.indexOf(opt)]?.focus();
    }
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className={cn("inline-flex rounded-xl border border-border bg-surface-2 p-1", fullWidth && "flex w-full", className)}
    >
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            disabled={opt.disabled}
            onClick={() => {
              if (!active) playSfx("nav");
              onChange(opt.value);
            }}
            className={cn(
              "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-lg font-medium transition-all duration-150 disabled:opacity-40 [&_svg]:size-4",
              size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-[13px]",
              fullWidth && "flex-1",
              active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted hover:text-fg",
            )}
          >
            {opt.icon}
            <span className="truncate">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ───────────────────────────── Field ─────────────────────────────

export function Field({ label, hint, children, className, htmlFor }: { label: ReactNode; hint?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-fg">
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-xs leading-5 text-fg-muted">{hint}</p> : null}
    </div>
  );
}

export function TextInput({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "h-9.5 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm text-fg placeholder:text-fg-subtle transition-colors hover:border-border-strong focus-visible:border-accent",
        className,
      )}
      {...props}
    />
  );
}
