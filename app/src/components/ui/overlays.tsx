// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Tooltip, Popover y Collapsible. */
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

// ───────────────────────────── Tooltip ─────────────────────────────

type Side = "top" | "bottom" | "left" | "right";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: Side;
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export function Tooltip({ content, children, side = "top", delay = 250, disabled, className }: TooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const id = useId();

  const show = () => {
    if (disabled) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const r = ref.current?.getBoundingClientRect();
      if (!r) return;
      const gap = 8;
      const p =
        side === "top"
          ? { x: r.left + r.width / 2, y: r.top - gap }
          : side === "bottom"
            ? { x: r.left + r.width / 2, y: r.bottom + gap }
            : side === "left"
              ? { x: r.left - gap, y: r.top + r.height / 2 }
              : { x: r.right + gap, y: r.top + r.height / 2 };
      setPos(p);
    }, delay);
  };
  const hide = () => {
    window.clearTimeout(timer.current);
    setPos(null);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const transform =
    side === "top"
      ? "translate(-50%, -100%)"
      : side === "bottom"
        ? "translate(-50%, 0)"
        : side === "left"
          ? "translate(-100%, -50%)"
          : "translate(0, -50%)";

  return (
    <span
      ref={ref}
      className={cn("inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      aria-describedby={pos ? id : undefined}
    >
      {children}
      {pos && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              id={id}
              className="pointer-events-none fixed z-[70] max-w-xs animate-fade-in rounded-lg border border-border-strong bg-fg px-2.5 py-1.5 text-xs font-medium leading-5 text-bg shadow-pop"
              style={{ left: pos.x, top: pos.y, transform }}
            >
              {content}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}

// ───────────────────────────── Popover ─────────────────────────────

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  anchorRef: RefObject<HTMLElement | null>;
  children: ReactNode;
  side?: "top" | "bottom" | "right";
  className?: string;
  label: string;
}

export function Popover({ open, onClose, anchorRef, children, side = "top", className, label }: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<CSSProperties>({});

  useLayoutEffect(() => {
    if (!open) return;
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    if (side === "top") setStyle({ left: r.left, bottom: window.innerHeight - r.top + 8, minWidth: Math.max(240, r.width) });
    else if (side === "right") setStyle({ left: r.right + 10, bottom: Math.max(8, window.innerHeight - r.bottom), minWidth: 260 });
    else setStyle({ left: r.left, top: r.bottom + 8, minWidth: Math.max(240, r.width) });
  }, [open, side, anchorRef]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open, onClose, anchorRef]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          ref={panelRef}
          role="dialog"
          aria-label={label}
          initial={{ opacity: 0, y: side === "top" ? 6 : -6, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: side === "top" ? 4 : -4, scale: 0.98 }}
          transition={{ duration: 0.14 }}
          className={cn("fixed z-[60] rounded-xl border border-border bg-surface p-1.5 shadow-pop", className)}
          style={style}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

// ───────────────────────────── Collapsible ─────────────────────────────

interface CollapsibleProps {
  title: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}

export function Collapsible({ title, icon, children, defaultOpen = false, className }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn("rounded-xl border border-border bg-surface-2/60", className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-xl px-4 py-3 text-left text-sm font-medium text-fg transition-colors hover:bg-surface-2 [&>svg]:size-4"
      >
        {icon}
        <span className="flex-1">{title}</span>
        <ChevronDown className={cn("text-fg-subtle transition-transform duration-200", open && "rotate-180")} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={id}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1">{children}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
