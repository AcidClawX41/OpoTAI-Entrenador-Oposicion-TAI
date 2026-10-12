// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { BarChart3, CalendarDays, CirclePlay, Clock, Eye, Gauge, Grid3x3, Inbox, LineChart, Target, Timer } from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import { cn } from "@/lib/cn";
import { formatGrade, formatInt, formatPercent, plural } from "@/lib/format";
import { blockTitle, shortTitle } from "@/lib/labels";
import { formatDuration } from "@/lib/time";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/controls";
import { EmptyState, ErrorState, PageHeader, Stat } from "@/components/ui/display";
import { Skeleton } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/overlays";
import { GradeChart } from "@/components/charts/GradeChart";
import { ActivityCalendar } from "@/components/charts/ActivityCalendar";
import { StackedBar, StackedLegend } from "@/components/results/BlockBreakdown";
import { TopicHeatmap, TopicTable } from "@/components/stats/TopicPerformance";
import { AttemptHistory } from "@/components/stats/AttemptHistory";

const rise = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.32, delay: 0.04 * i, ease: [0.2, 0.8, 0.2, 1] as const },
});

export default function StatsPage() {
  const profile = useSession((s) => s.profile)!;
  const catalog = useSession((s) => s.catalog);
  const refreshReviewDue = useSession((s) => s.refreshReviewDue);
  const navigate = useNavigate();
  const stats = useApi(() => api.getStats(profile.id), [profile.id]);
  const attempts = useApi(() => api.listAttempts(profile.id, 500), [profile.id]);
  const [gradeScope, setGradeScope] = useState<"full" | "all">("full");
  const [topicView, setTopicView] = useState<"map" | "table">("map");
  const s = stats.data;

  const remove = async (attemptId: string) => {
    try {
      await api.deleteAttempt(attemptId);
      toast.success("Intento eliminado");
      attempts.reload();
      stats.reload();
      void refreshReviewDue();
    } catch (e) {
      toast.error("No se ha podido eliminar", errorMessage(e));
      throw e;
    }
  };

  if (stats.error && !s) {
    return (
      <>
        <PageHeader title="Estadísticas" />
        <ErrorState message={stats.error.message} onRetry={stats.reload} />
      </>
    );
  }
  if (!s) {
    return (
      <div aria-busy="true">
        <PageHeader title="Estadísticas" />
        <div className="grid grid-cols-2 gap-4 @3xl:grid-cols-3 @5xl:grid-cols-6">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-5 h-80" />
      </div>
    );
  }

  if (s.attempts_finished === 0) {
    return (
      <>
        <PageHeader title="Estadísticas" description="Tu progreso con todos los intentos de este perfil." />
        <Card>
          <EmptyState
            icon={<BarChart3 />}
            title="Aún no hay estadísticas"
            description="Termina tu primer simulacro o test de práctica y aquí verás tu evolución, tus temas fuertes y débiles y tu actividad."
            action={
              <ButtonLink to="/simulacro" variant="primary" leftIcon={<CirclePlay className="size-4" />}>
                Hacer un simulacro
              </ButtonLink>
            }
          />
        </Card>
      </>
    );
  }

  const history = gradeScope === "full" ? s.grade_history.filter((g) => g.mode === "simulacro" || g.mode === "official") : s.grade_history;
  const temario = catalog?.temario ?? null;

  return (
    <div className="@container">
      <PageHeader title="Estadísticas" description="Tu progreso con todos los intentos de este perfil." />

      <motion.div {...rise(0)} className="grid grid-cols-2 gap-4 @3xl:grid-cols-3 @5xl:grid-cols-6">
        <Stat label="Simulacros" value={formatInt(s.simulacros_finished)} icon={<Timer />} hint={`${plural(s.attempts_finished, "intento")} en total`} />
        <Stat
          label="Nota media"
          value={s.average_grade !== null ? formatGrade(s.average_grade) : "—"}
          icon={<Gauge />}
          hint={s.best_grade !== null ? `Mejor nota: ${formatGrade(s.best_grade)}` : "Simulacros y oficiales"}
        />
        <Stat label="Precisión" value={formatPercent(s.accuracy)} icon={<Target />} tone="info" hint={`${plural(s.correct, "acierto")} · ${plural(s.wrong, "fallo")}`} />
        <Stat
          label="Preguntas"
          value={formatInt(s.distinct_questions_seen)}
          icon={<Eye />}
          tone="success"
          hint={`${formatInt(s.questions_answered)} respuestas`}
        />
        <Stat label="Tiempo total" value={formatDuration(s.study_seconds)} icon={<Clock />} tone="warning" hint="estudiando en OpoTAI" />
        <Stat label="Para repasar" value={formatInt(s.review_due)} icon={<Inbox />} tone="danger" hint="pendientes hoy" />
      </motion.div>

      <div className="mt-5 grid gap-5 @5xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <motion.div {...rise(1)}>
          <Card className="h-full">
            <CardHeader
              title="Evolución de la nota"
              description="Sobre 100 · la línea discontinua marca el aprobado"
              icon={<LineChart />}
              action={
                <Segmented
                  size="sm"
                  label="Intentos en la gráfica"
                  value={gradeScope}
                  onChange={setGradeScope}
                  options={[
                    { value: "full", label: "Simulacros y oficiales" },
                    { value: "all", label: "Todos" },
                  ]}
                />
              }
            />
            <div className="px-3 pb-4 pt-5">
              {history.length > 0 ? (
                <GradeChart points={history} />
              ) : (
                <p className="py-20 text-center text-sm text-fg-muted">Todavía no hay notas de este tipo.</p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div {...rise(2)}>
          <Card className="flex h-full flex-col">
            <CardHeader title="Acierto por bloques" description="Todas tus respuestas" icon={<BarChart3 />} />
            <ul className="flex-1 space-y-4 px-5 pb-2 pt-5">
              {s.by_block.map((b) => {
                const title = b.block ? blockTitle(temario, b.block) : null;
                return (
                  <li key={b.key}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                      <Tooltip content={title ?? b.label} className="min-w-0" disabled={!title}>
                        <p className="truncate text-[13px]">
                          <span className="font-semibold text-fg">{b.block ? `Bloque ${b.block}` : "Sin clasificar"}</span>
                          {title ? <span className="text-fg-muted"> · {shortTitle(title, 40)}</span> : null}
                        </p>
                      </Tooltip>
                      <span className="shrink-0 text-xs tabular-nums text-fg-muted">
                        <span
                          className={cn(
                            "font-semibold",
                            b.accuracy >= 0.6 ? "text-success-text" : b.accuracy >= 0.4 ? "text-warning-text" : "text-danger-text",
                          )}
                        >
                          {formatPercent(b.accuracy)}
                        </span>{" "}
                        · {formatInt(b.total)}
                      </span>
                    </div>
                    <StackedBar stat={b} />
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-border px-5 py-3.5">
              <StackedLegend />
            </div>
          </Card>
        </motion.div>
      </div>

      <div className="mt-5 grid gap-5 @5xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <motion.div {...rise(3)}>
          <Card className="h-full">
            <CardHeader
              title="Temas"
              description="Pulsa un tema para practicarlo"
              icon={<Grid3x3 />}
              action={
                <Segmented
                  size="sm"
                  label="Vista de temas"
                  value={topicView}
                  onChange={setTopicView}
                  options={[
                    { value: "map", label: "Mapa" },
                    { value: "table", label: "Tabla" },
                  ]}
                />
              }
            />
            <div className="p-5">
              {temario ? (
                topicView === "map" ? (
                  <TopicHeatmap temario={temario} byTopic={s.by_topic} onSelect={(t) => navigate(`/temas?temas=${encodeURIComponent(t)}`)} />
                ) : (
                  <TopicTable temario={temario} byTopic={s.by_topic} onSelect={(t) => navigate(`/temas?temas=${encodeURIComponent(t)}`)} />
                )
              ) : (
                <p className="py-8 text-center text-sm text-fg-muted">El temario no está disponible.</p>
              )}
            </div>
          </Card>
        </motion.div>

        <motion.div {...rise(4)}>
          <Card className="h-full">
            <CardHeader title="Actividad" description="Preguntas respondidas cada día · últimos 120 días" icon={<CalendarDays />} />
            <div className="p-5">
              <ActivityCalendar activity={s.activity} streakDays={s.streak_days} />
            </div>
          </Card>
        </motion.div>
      </div>

      <motion.div {...rise(5)} className="mt-5">
        {attempts.data ? (
          <AttemptHistory attempts={attempts.data} onDelete={remove} />
        ) : attempts.error ? (
          <ErrorState message={attempts.error.message} onRetry={attempts.reload} />
        ) : (
          <Skeleton className="h-64" />
        )}
      </motion.div>
    </div>
  );
}
