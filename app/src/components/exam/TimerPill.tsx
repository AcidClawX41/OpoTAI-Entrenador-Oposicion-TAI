// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useRef, useState } from "react";
import { Hourglass, Timer } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatClock, timerTone } from "@/lib/time";

interface TimerPillProps {
  remaining: number | null;
  elapsed: number;
  hidden?: boolean;
}

/**
 * Cronómetro del examen: tiempo restante (ámbar con 10 min o menos y rojo con 1 min o menos)
 * o, sin límite de tiempo, el tiempo transcurrido con la etiqueta «sin límite».
 */
export function TimerPill({ remaining, elapsed, hidden = false }: TimerPillProps) {
  const tone = timerTone(remaining);
  const [announce, setAnnounce] = useState("");
  const last = useRef(tone);
  useEffect(() => {
    if (tone !== last.current) {
      last.current = tone;
      if (tone === "warning") setAnnounce("Quedan 10 minutos.");
      if (tone === "danger") setAnnounce("Queda 1 minuto. Al llegar a cero, el examen se entrega solo.");
    }
  }, [tone]);
  if (hidden) return null;
  const untimed = remaining === null;
  return (
    <div
      className={cn(
        "inline-flex h-9.5 items-center gap-2 rounded-xl border px-3 text-[15px] font-semibold tabular-nums transition-colors",
        tone === "normal" && "border-border bg-surface-2 text-fg",
        tone === "warning" && "border-warning/50 bg-warning-soft text-warning-text",
        tone === "danger" && "animate-pulse-soft border-danger/60 bg-danger-soft text-danger-text",
      )}
      title={untimed ? "Tiempo transcurrido (sin límite de tiempo)" : "Tiempo restante: al llegar a cero, el examen se entrega solo"}
    >
      {untimed ? <Hourglass className="size-4 opacity-70" aria-hidden /> : <Timer className="size-4" aria-hidden />}
      <span className="sr-only">{untimed ? "Tiempo transcurrido" : "Tiempo restante"}: </span>
      {formatClock(untimed ? elapsed : remaining)}
      {untimed ? <span className="hidden text-[11px] font-medium text-fg-subtle xl:inline">sin límite</span> : null}
      <span className="sr-only" aria-live="assertive">
        {announce}
      </span>
    </div>
  );
}
