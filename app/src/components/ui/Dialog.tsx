// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUi } from "@/store/ui";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  /** Sobrelínea pequeña encima del título. */
  eyebrow?: ReactNode;
  icon?: ReactNode;
  iconTone?: "accent" | "danger" | "warning" | "success" | "info";
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Si es false, ni Escape ni clic fuera cierran. */
  dismissible?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  className?: string;
}

const SIZES = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" } as const;
const ICON_TONES = {
  accent: "bg-accent-soft text-accent-text",
  danger: "bg-danger-soft text-danger-text",
  warning: "bg-warning-soft text-warning-text",
  success: "bg-success-soft text-success-text",
  info: "bg-info-soft text-info-text",
} as const;

export function Dialog(props: DialogProps) {
  if (typeof document === "undefined") return null;
  return createPortal(<AnimatePresence>{props.open ? <DialogPanel {...props} /> : null}</AnimatePresence>, document.body);
}

function DialogPanel({
  onClose,
  title,
  description,
  eyebrow,
  icon,
  iconTone = "accent",
  children,
  footer,
  size = "md",
  dismissible = true,
  initialFocus,
  className,
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    useUi.getState().pushDialog();
    // Profundidad de este diálogo: con diálogos anidados, solo el de arriba atiende el teclado.
    const depth = useUi.getState().dialogs;
    const panel = panelRef.current;
    const first = initialFocus?.current ?? panel?.querySelector<HTMLElement>("[data-autofocus]") ?? panel?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? panel)?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (useUi.getState().dialogs > depth) return;
      if (event.key === "Escape" && dismissible) {
        event.stopPropagation();
        event.preventDefault();
        closeRef.current();
      } else if (event.key === "Tab" && panel) {
        const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement);
        if (items.length === 0) return;
        const firstEl = items[0]!;
        const lastEl = items[items.length - 1]!;
        if (event.shiftKey && document.activeElement === firstEl) {
          event.preventDefault();
          lastEl.focus();
        } else if (!event.shiftKey && document.activeElement === lastEl) {
          event.preventDefault();
          firstEl.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey, true);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = overflow;
      useUi.getState().popDialog();
      previous?.focus?.();
    };
  }, [dismissible, initialFocus]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <motion.div
        aria-hidden
        className="fixed inset-0 bg-black/55 backdrop-blur-[3px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={dismissible ? onClose : undefined}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        initial={{ opacity: 0, y: 10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.985 }}
        transition={{ duration: 0.18, ease: [0.2, 0.8, 0.2, 1] }}
        className={cn(
          "relative flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-2xl border border-border bg-surface shadow-pop outline-none",
          SIZES[size],
          className,
        )}
      >
        <div className="flex shrink-0 items-start gap-3.5 px-6 pt-6">
          {icon ? (
            <div className={cn("grid size-10 shrink-0 place-items-center rounded-xl [&_svg]:size-5", ICON_TONES[iconTone])}>{icon}</div>
          ) : null}
          <div className="min-w-0 flex-1 pt-0.5">
            {eyebrow ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">{eyebrow}</p> : null}
            <h2 id={titleId} className="text-lg font-semibold leading-6 tracking-tight text-fg">
              {title}
            </h2>
            {description ? (
              <p id={descId} className="mt-1.5 text-sm leading-6 text-fg-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onClose}
              className="-mr-2 -mt-1 grid size-8 place-items-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-2 hover:text-fg"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>
        {children ? <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-5">{children}</div> : null}
        {footer ? (
          <div className="mt-6 flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-border px-6 py-4">{footer}</div>
        ) : (
          <div className="h-6 shrink-0" />
        )}
      </motion.div>
    </div>
  );
}
