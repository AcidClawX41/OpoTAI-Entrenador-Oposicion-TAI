// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { playSfx, type SfxName } from "@/lib/sfx";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "soft" | "success";
export type ButtonSize = "xs" | "sm" | "md" | "lg" | "icon" | "icon-sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-fg shadow-glow inset-shadow-[0_1px_0_rgb(255_255_255/0.16)] hover:bg-accent-hover active:translate-y-px",
  secondary: "border border-border bg-surface-2 text-fg hover:bg-surface-3 hover:border-border-strong",
  ghost: "text-fg-muted hover:bg-surface-2 hover:text-fg",
  outline: "border border-border-strong bg-transparent text-fg hover:bg-surface-2",
  danger: "bg-danger text-white hover:brightness-110 inset-shadow-[0_1px_0_rgb(255_255_255/0.14)]",
  soft: "bg-accent-soft text-accent-text hover:bg-accent/20",
  success: "bg-success text-white hover:brightness-110",
};

const SIZES: Record<ButtonSize, string> = {
  xs: "h-7 gap-1.5 rounded-md px-2.5 text-xs",
  sm: "h-8 gap-1.5 rounded-lg px-3 text-[13px]",
  md: "h-9.5 gap-2 rounded-lg px-4 text-sm",
  lg: "h-11 gap-2 rounded-xl px-5 text-[15px]",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-lg",
};

export function buttonClasses(variant: ButtonVariant = "secondary", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  /** Efecto de sonido al pulsar (respeta los ajustes de sonido). */
  sound?: SfxName;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", loading = false, leftIcon, rightIcon, sound, className, children, onClick, disabled, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? "button"}
      className={buttonClasses(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      onClick={(event) => {
        if (sound) playSfx(sound);
        onClick?.(event);
      }}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {rightIcon}
    </button>
  );
});

export interface ButtonLinkProps extends LinkProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  sound?: SfxName;
}

export function ButtonLink({ variant = "secondary", size = "md", leftIcon, rightIcon, sound, className, children, onClick, ...rest }: ButtonLinkProps) {
  return (
    <Link
      className={buttonClasses(variant, size, typeof className === "string" ? className : undefined)}
      onClick={(event) => {
        if (sound) playSfx(sound);
        onClick?.(event);
      }}
      {...rest}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </Link>
  );
}
