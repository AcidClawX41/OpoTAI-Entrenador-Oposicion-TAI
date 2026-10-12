// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, CalendarCheck, CircleCheck, CirclePlay, Inbox, Layers, PartyPopper, RotateCcw, Sprout, Trophy } from "lucide-react";
import { api } from "@/api/client";
import type { FeedbackMode } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { blockTitle, shortTitle } from "@/lib/labels";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/controls";
import { ErrorState, PageHeader } from "@/components/ui/display";
import { Progress, Skeleton } from "@/components/ui/misc";
import { FeedbackChooser } from "@/components/exam/FeedbackChooser";

/** Cajas del repaso espaciado (docs/CONTRATO-API.md): un fallo vuelve a la caja 1; cada acierto la sube. */
const BOXES = [
  { box: 1, when: "Hoy", text: "Recién fallada" },
  { box: 2, when: "1 día", text: "Primer acierto" },
  { box: 3, when: "3 días", text: "Segundo acierto" },
  { box: 4, when: "7 días", text: "Tercer acierto" },
  { box: 5, when: "15 días", text: "Dominada" },
];

export default function ReviewPage() {
  const profile = useSession((s) => s.profile)!;
  const settings = useSession((s) => s.settings);
  const catalog = useSession((s) => s.catalog);
  const summary = useApi(() => api.getReviewSummary(profile.id), [profile.id]);
  const { launch, busy, dialog } = useExamLauncher();
  const [count, setCount] = useState<"10" | "20" | "30" | "all">("20");
  const [feedback, setFeedback] = useState<FeedbackMode | null>(null);
  const fb = feedback ?? settings?.default_feedback ?? "immediate";
  const s = summary.data;

  const start = () => {
    if (!s) return;
    const n = count === "all" ? Math.max(1, s.due) : Number(count);
    void launch({ type: "review", count: n, feedback: fb });
  };

  return (
    <div className="@container">
      <PageHeader
        title="Repaso de fallos"
        description="Las preguntas que fallas vuelven justo cuando toca: cada acierto las aleja en el tiempo y un fallo las devuelve al principio."
      />

      {summary.error && !s ? <ErrorState message={summary.error.message} onRetry={summary.reload} /> : null}
      {!s && !summary.error ? (
        <div className="grid gap-5 @5xl:grid-cols-[1.1fr_1fr]">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : null}

      {s ? (
        <div className="space-y-5">
          <div className="grid items-start gap-5 @5xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
              <Card className="relative overflow-hidden">
                <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-72 bg-warning/12 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
                {s.due > 0 ? (
                  <div className="relative p-6">
                    <p className="inline-flex items-center gap-2 rounded-full bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-text">
                      <CalendarCheck className="size-3.5" aria-hidden /> Para hoy
                    </p>
                    <p className="mt-4 text-[64px] font-semibold leading-none tracking-tight text-fg tabular-nums">{formatInt(s.due)}</p>
                    <p className="mt-2 text-sm text-fg-muted">{s.due === 1 ? "pregunta pendiente de repaso" : "preguntas pendientes de repaso"}</p>

                    <div className="mt-6 space-y-5">
                      <div>
                        <p className="mb-1.5 text-[13px] font-medium text-fg">Cuántas repasar ahora</p>
                        <Segmented
                          label="Cuántas repasar ahora"
                          fullWidth
                          value={count}
                          onChange={setCount}
                          options={[
                            { value: "10", label: "10" },
                            { value: "20", label: "20" },
                            { value: "30", label: "30" },
                            { value: "all", label: `Todas (${formatInt(s.due)})` },
                          ]}
                        />
                      </div>
                      <FeedbackChooser value={fb} onChange={setFeedback} context="practice" />
                      <Button variant="primary" size="lg" className="w-full" loading={busy} leftIcon={<CirclePlay className="size-4.5" />} onClick={start}>
                        Empezar repaso
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="relative flex flex-col items-start p-7">
                    <span className="grid size-12 place-items-center rounded-2xl bg-success-soft text-success-text">
                      <PartyPopper className="size-6" aria-hidden />
                    </span>
                    <h2 className="mt-4 text-2xl font-semibold tracking-tight text-fg">¡Estás al día!</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-fg-muted">
                      {s.total_failed > 0
                        ? "No tienes repasos pendientes hoy. Las preguntas en seguimiento volverán cuando les toque."
                        : "Todavía no has fallado ninguna pregunta. Cuando falles alguna, aparecerá aquí para repasarla."}
                    </p>
                    <div className="mt-6 flex flex-wrap gap-2">
                      <ButtonLink to="/temas" variant="primary" leftIcon={<Layers className="size-4" />}>
                        Practicar por temas
                      </ButtonLink>
                      <ButtonLink to="/simulacro" variant="ghost" rightIcon={<ArrowRight className="size-4" />}>
                        Hacer un simulacro
                      </ButtonLink>
                    </div>
                  </div>
                )}
              </Card>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }} className="space-y-5">
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Inbox className="size-3.5 text-warning-text" aria-hidden /> Pendientes
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{formatInt(s.due)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Sprout className="size-3.5 text-info-text" aria-hidden /> En seguimiento
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{formatInt(s.learning)}</p>
                </div>
                <div className="rounded-2xl border border-border bg-surface p-4 shadow-card">
                  <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                    <Trophy className="size-3.5 text-success-text" aria-hidden /> Dominadas
                  </p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums text-fg">{formatInt(s.mastered)}</p>
                </div>
              </div>

              <Card>
                <CardHeader title="Cómo funciona" description="Repetición espaciada por cajas (sistema Leitner)" icon={<RotateCcw />} />
                <div className="p-5 pt-4">
                  <ol className="grid grid-cols-5 gap-2" aria-label="Cajas del repaso">
                    {BOXES.map((b, i) => (
                      <li key={b.box} className="relative">
                        <div
                          className={cn(
                            "flex h-full flex-col items-center rounded-xl border px-1.5 py-3 text-center",
                            b.box === 5 ? "border-success/35 bg-success-soft" : b.box === 1 ? "border-warning/35 bg-warning-soft" : "border-border bg-surface-2/60",
                          )}
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-fg-subtle">Caja {b.box}</span>
                          <span className="mt-1 text-[15px] font-semibold text-fg">{b.when}</span>
                          <span className="mt-0.5 text-[11px] leading-4 text-fg-muted">{b.text}</span>
                        </div>
                        {i < BOXES.length - 1 ? (
                          <ArrowRight className="absolute -right-2.5 top-1/2 z-10 size-3 -translate-y-1/2 text-fg-subtle" aria-hidden />
                        ) : null}
                      </li>
                    ))}
                  </ol>
                  <ul className="mt-4 space-y-2 text-[13px] leading-5 text-fg-muted">
                    <li className="flex gap-2">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden />
                      Cada acierto la sube una caja y espera más días antes de volver.
                    </li>
                    <li className="flex gap-2">
                      <RotateCcw className="mt-0.5 size-4 shrink-0 text-danger-text" aria-hidden />
                      Un fallo la devuelve a la caja 1: vuelve a estar pendiente desde ya.
                    </li>
                  </ul>
                </div>
              </Card>
            </motion.div>
          </div>

          {s.by_block.length > 0 ? (
            <Card>
              <CardHeader title="Por bloques" description="Pendientes hoy y preguntas en seguimiento" icon={<Layers />} />
              <ul className="grid gap-x-8 gap-y-4 p-5 @3xl:grid-cols-2">
                {s.by_block.map((b) => {
                  const total = Math.max(1, b.learning);
                  const title = b.block ? (blockTitle(catalog?.temario, b.block) ?? "") : "";
                  return (
                    <li key={b.block ?? "none"}>
                      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate">
                          <span className="font-semibold text-fg">{b.block ? `Bloque ${b.block}` : "Sin clasificar"}</span>
                          {title ? <span className="text-fg-muted"> · {shortTitle(title, 48)}</span> : null}
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                          <strong className="font-semibold text-warning-text">{formatInt(b.due)}</strong> hoy · {formatInt(b.learning)} en seguimiento
                        </span>
                      </div>
                      <Progress value={b.due} max={total} tone="warning" label={`Bloque ${b.block ?? "sin clasificar"}: ${b.due} pendientes de ${b.learning}`} />
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </div>
      ) : null}
      {dialog}
    </div>
  );
}
