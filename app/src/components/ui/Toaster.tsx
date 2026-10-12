// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToasts, type ToastTone } from "@/store/toast";

const ICONS: Record<ToastTone, typeof Info> = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
  warning: TriangleAlert,
};

const TONES: Record<ToastTone, string> = {
  success: "text-success-text",
  error: "text-danger-text",
  info: "text-info-text",
  warning: "text-warning-text",
};

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(380px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => {
          const Icon = ICONS[t.tone];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.18 }}
              role={t.tone === "error" ? "alert" : "status"}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border border-border bg-surface p-3.5 shadow-pop"
            >
              <Icon className={cn("mt-0.5 size-4.5 shrink-0", TONES[t.tone])} aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{t.title}</p>
                {t.description ? <p className="mt-0.5 text-[13px] leading-5 text-fg-muted">{t.description}</p> : null}
              </div>
              <button
                type="button"
                aria-label="Cerrar aviso"
                onClick={() => dismiss(t.id)}
                className="-m-1 grid size-7 shrink-0 place-items-center rounded-md text-fg-subtle hover:bg-surface-2 hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
