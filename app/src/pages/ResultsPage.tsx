// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { lazy, Suspense, useEffect, useMemo } from "react";
import { useLocation, useParams } from "react-router-dom";
import { motion } from "motion/react";
import { CalendarDays, CirclePlay, House, MapPin, Repeat, RotateCcw, Table2 } from "lucide-react";
import { api } from "@/api/client";
import { formatDateTime, formatInt } from "@/lib/format";
import { MODE_LABEL } from "@/lib/labels";
import { practiceSpec } from "@/lib/specs";
import { formatDuration } from "@/lib/time";
import { partName } from "@/lib/exam/structure";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useExam } from "@/store/exam";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, PageHeader } from "@/components/ui/display";
import { Skeleton } from "@/components/ui/misc";
import { GradeSummary } from "@/components/results/GradeSummary";
import { PartsTable } from "@/components/results/PartsTable";
import { BlockBreakdown } from "@/components/results/BlockBreakdown";
import { ReviewList, type CaseStatement } from "@/components/results/ReviewList";
import { PredictionPanel } from "@/components/prediction/PredictionPanel";

// El simulador (mapa y geometría de España) va en su propio fragmento.
const DestinationSimulator = lazy(() =>
  import("@/components/destinations/DestinationSimulator").then((m) => ({ default: m.DestinationSimulator })),
);

function scrollToDestinations() {
  document.getElementById("destinos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

const rise = (i: number) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: 0.05 * i, ease: [0.2, 0.8, 0.2, 1] as const },
});

export default function ResultsPage() {
  const { attemptId = "" } = useParams();
  const cached = useExam((s) => s.results[attemptId]);
  const paper = useExam((s) => s.paper);
  const catalog = useSession((s) => s.catalog);
  const settings = useSession((s) => s.settings);
  const { launch, busy, dialog } = useExamLauncher();
  const remote = useApi(() => api.getAttemptResult(attemptId), [attemptId], !cached);
  const result = cached ?? remote.data;
  const location = useLocation();
  const wantsDestinations = (location.state as { scrollTo?: string } | null)?.scrollTo === "destinos";
  const hasResult = Boolean(result);

  // «Ver destinos» desde Inicio: baja al simulador cuando ya está pintado.
  useEffect(() => {
    if (!wantsDestinations || !hasResult) return;
    const first = window.setTimeout(() => scrollToDestinations(), 600);
    // El simulador se carga aparte y cambia de altura: si el desplazamiento suave se quedó corto, se corrige.
    const fix = window.setTimeout(() => {
      const el = document.getElementById("destinos");
      if (el && Math.abs(el.getBoundingClientRect().top) > 80) el.scrollIntoView({ block: "start" });
    }, 1900);
    return () => {
      window.clearTimeout(first);
      window.clearTimeout(fix);
    };
  }, [wantsDestinations, hasResult]);

  const statements = useMemo(() => {
    const map: Record<string, CaseStatement> = {};
    if (paper && paper.attempt_id === attemptId) {
      for (const s of paper.sections) if (s.kind === "case" && s.statement) map[s.id] = { title: s.title, statement: s.statement, media: s.media };
    } else {
      // Resultado abierto desde el historial: el núcleo envía los enunciados de los supuestos.
      for (const c of (cached ?? remote.data)?.cases ?? []) map[c.section_id] = { title: c.title, statement: c.statement, media: c.media };
    }
    return Object.keys(map).length ? map : undefined;
  }, [paper, attemptId, cached, remote.data]);

  if (!result) {
    if (remote.error)
      return (
        <>
          <PageHeader title="Resultados" />
          <ErrorState message={remote.error.message} onRetry={remote.reload} />
        </>
      );
    return (
      <div className="space-y-5" aria-busy="true">
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-72" />
        <Skeleton className="h-56" />
      </div>
    );
  }

  const scheme =
    catalog?.schemes.find((s) => s.id === result.grade.scheme_id) ?? (paper && paper.attempt_id === result.attempt_id ? paper.scheme : null);
  const full = result.mode === "official" || result.mode === "simulacro";
  const wrong = result.review.filter((i) => i.status === "wrong").length;
  const feedback = settings?.default_feedback ?? "immediate";
  const twoParts = result.grade.parts.length > 1;
  const partNames = scheme ? Object.fromEntries(scheme.parts.map((p) => [p.part, partName(p.kind)])) : undefined;

  return (
    <div className="@container">
      <PageHeader
        eyebrow={
          <div className="flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            <Badge tone="accent">{MODE_LABEL[result.mode]}</Badge>
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" aria-hidden />
              {formatDateTime(result.finished_at)}
            </span>
            <span aria-hidden>·</span>
            <span>
              {formatDuration(result.elapsed_seconds)}
              {result.duration_minutes ? ` de ${formatInt(result.duration_minutes)} min` : ""}
            </span>
          </div>
        }
        title={result.title}
        actions={
          <>
            <ButtonLink to="/inicio" variant="ghost" leftIcon={<House className="size-4" />}>
              Inicio
            </ButtonLink>
            {full ? (
              <Button variant="ghost" leftIcon={<MapPin className="size-4" />} onClick={scrollToDestinations}>
                Ver destinos
              </Button>
            ) : null}
            {wrong > 0 ? (
              <Button
                variant="secondary"
                loading={busy}
                leftIcon={<RotateCcw className="size-4" />}
                onClick={() => void launch({ type: "review", count: Math.min(30, Math.max(10, wrong)), feedback })}
              >
                Repasar mis fallos
              </Button>
            ) : null}
            {result.spec && result.spec.type !== "review" ? (
              <Button variant="secondary" loading={busy} leftIcon={<Repeat className="size-4" />} onClick={() => void launch(result.spec!)}>
                Repetir este examen
              </Button>
            ) : null}
            <ButtonLink to={full ? "/simulacro" : "/temas"} variant="primary" leftIcon={<CirclePlay className="size-4" />}>
              {full ? "Nuevo simulacro" : "Seguir practicando"}
            </ButtonLink>
          </>
        }
      />

      <div className="space-y-5">
        <motion.div {...rise(0)}>
          <GradeSummary
            grade={result.grade}
            scheme={scheme}
            verdictStyle={full ? "exam" : "practice"}
            elapsedSeconds={result.elapsed_seconds}
            durationMinutes={result.duration_minutes}
          />
        </motion.div>

        <motion.div {...rise(1)}>
          <Card>
            <CardHeader
              title={twoParts ? "Puntuación de cada parte" : "Desglose de la puntuación"}
              description={
                twoParts
                  ? "El supuesto práctico es la 2.ª parte de este mismo examen: cada parte tiene su puntuación, su escala y su mínimo, y la nota final las combina."
                  : "Cómo se llega a tu puntuación directa"
              }
              icon={<Table2 />}
            />
            <PartsTable grade={result.grade} scheme={scheme} className="mt-4" />
          </Card>
        </motion.div>

        {result.prediction ? (
          <motion.div {...rise(2)}>
            <PredictionPanel prediction={result.prediction} />
          </motion.div>
        ) : null}

        {full ? (
          <motion.div {...rise(3)} id="destinos" className="scroll-mt-6">
            <Suspense fallback={<Skeleton className="h-[520px] rounded-2xl" />}>
              <DestinationSimulator source={{ attempt_id: result.attempt_id }} />
            </Suspense>
          </motion.div>
        ) : null}

        {result.by_block.length > 0 ? (
          <motion.div {...rise(3)}>
            <BlockBreakdown
              byBlock={result.by_block}
              byTopic={result.by_topic}
              temario={catalog?.temario ?? null}
              busy={busy}
              onPractice={(topics) => void launch(practiceSpec({ topics, count: 20, feedback }))}
            />
          </motion.div>
        ) : null}

        <div className="pt-4">
          <ReviewList items={result.review} temario={catalog?.temario ?? null} statements={statements} partNames={partNames} />
        </div>
      </div>
      {dialog}
    </div>
  );
}
