// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Calculator,
  CalendarClock,
  Check,
  CirclePlay,
  Dices,
  Flame,
  Gauge,
  History,
  Landmark,
  Layers,
  MapPinned,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { ProfileStats } from "@/api/types";
import { cn } from "@/lib/cn";
import {
  daysUntil,
  formatDate,
  formatGrade,
  formatInt,
  formatPercent,
  formatProbability,
  formatSigned,
  formatWeekdayLong,
  greeting,
  plural,
} from "@/lib/format";
import { shortTitle, topicTitle } from "@/lib/labels";
import { practiceSpec } from "@/lib/specs";
import { RUN_MODE_LABEL, runModeFromSettings, withRunMode } from "@/lib/examMode";
import { firstName } from "@/lib/text";
import { formatClock, remainingSeconds } from "@/lib/time";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useExam } from "@/store/exam";
import { usePendingDraw, useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorState, Stat } from "@/components/ui/display";
import { Progress, Skeleton } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/overlays";
import { Sparkline } from "@/components/charts/Sparkline";
import { RankRange } from "@/components/prediction/parts";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";

const fade = (i: number) => ({
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.35, delay: 0.04 * i, ease: [0.2, 0.8, 0.2, 1] as const },
});

function Readiness({ stats }: { stats: ProfileStats }) {
  const r = stats.readiness;
  const navigate = useNavigate();
  if (!r) {
    return (
      <Card className="relative flex h-full flex-col justify-between overflow-hidden p-7">
        <div aria-hidden className="absolute -right-16 -top-16 size-64 bg-accent/15 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
        <div className="relative">
          <Badge tone="accent" icon={<Target />}>
            Tu probabilidad de plaza
          </Badge>
          <h2 className="mt-4 max-w-md text-2xl font-semibold tracking-tight text-fg">Haz tu primer simulacro para estimar tus posibilidades</h2>
          <p className="mt-2 max-w-md text-sm leading-6 text-fg-muted">
            Con tus resultados calcularemos tu nota real, tu probabilidad de aprobar y de obtener plaza, y dónde podrías elegir destino.
          </p>
        </div>
        <div className="relative mt-6">
          <Button variant="primary" size="lg" sound="nav" leftIcon={<CirclePlay className="size-4.5" />} onClick={() => navigate("/simulacro")}>
            Empezar un simulacro
          </Button>
        </div>
      </Card>
    );
  }
  const last = stats.grade_history.filter((g) => g.mode === "simulacro" || g.mode === "official").at(-1);
  return (
    <Card className="relative h-full overflow-hidden">
      <div aria-hidden className="pointer-events-none absolute -left-24 -top-24 size-72 bg-accent/15 [mask-image:radial-gradient(closest-side,#000,transparent)]" />
      <div className="relative grid gap-7 p-6 @2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <Badge tone="accent" icon={<Target />}>
              Tu probabilidad de plaza
            </Badge>
          </div>
          <p className="mt-5 text-[64px] font-semibold leading-none tracking-tight text-fg tabular-nums">
            {formatProbability(r.p_plaza)}
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            con tu nivel actual · <span className="text-fg">{r.target_label}</span>
          </p>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-surface-2/70 p-3">
              <dt className="text-xs text-fg-muted">Probabilidad de aprobar</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{formatProbability(r.p_pass)}</dd>
            </div>
            <div className="rounded-xl border border-border bg-surface-2/70 p-3">
              <dt className="text-xs text-fg-muted">Puesto estimado</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{r.estimated_rank ? `≈ ${formatInt(r.estimated_rank.p50)}` : "—"}</dd>
            </div>
          </dl>
          <RankRange prediction={r} className="mt-4" />
          <p className="mt-auto flex items-start gap-2 pt-5 text-[13px] leading-5 text-fg-muted">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-text" aria-hidden />
            <span>{r.verdict}</span>
          </p>
        </div>
        <div className="flex flex-col rounded-2xl border border-border bg-surface-2/50 p-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-accent-soft text-accent-text" aria-hidden>
              <MapPinned className="size-4.5" />
            </span>
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Simulador de destinos</p>
          </div>
          <h3 className="mt-3 text-[18px] font-semibold leading-snug tracking-tight text-fg">¿Qué destino podrías elegir con tu nota?</h3>
          <p className="mt-2 text-[13.5px] leading-6 text-fg-muted">
            Reproduce la elección de destinos de convocatorias reales: qué plazas seguirían libres al llegar tu turno y dónde acabaron opositores con un
            número de orden parecido al tuyo, provincia a provincia en el mapa.
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] text-fg-muted">
            <li className="flex items-center gap-2">
              <Check className="size-3.5 shrink-0 text-accent-text" aria-hidden /> Con la nota de tu último simulacro u oficial
            </li>
            <li className="flex items-center gap-2">
              <Check className="size-3.5 shrink-0 text-accent-text" aria-hidden /> O con cualquier nota, desde la calculadora
            </li>
          </ul>
          <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
            {last ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<MapPinned className="size-3.5" />}
                onClick={() => navigate(`/resultados/${last.attempt_id}`, { state: { scrollTo: "destinos" } })}
              >
                Ver mis destinos
              </Button>
            ) : null}
            <Button variant={last ? "secondary" : "primary"} size="sm" leftIcon={<Calculator className="size-3.5" />} onClick={() => navigate("/calculadora", { state: { simulate: true } })}>
              Probar con otra nota
            </Button>
          </div>
          <p className="mt-3 text-xs text-fg-subtle">Estimación orientativa con datos de convocatorias anteriores.</p>
        </div>
      </div>
    </Card>
  );
}

function Evolution({ stats }: { stats: ProfileStats }) {
  const full = stats.grade_history.filter((g) => g.mode === "simulacro" || g.mode === "official");
  const values = full.slice(-12).map((g) => (g.max_grade > 0 ? (g.grade / g.max_grade) * 100 : 0));
  const last = values.at(-1);
  const prev = values.at(-2);
  const delta = last !== undefined && prev !== undefined ? last - prev : null;
  return (
    <Card className="flex h-full flex-col">
      <CardHeader title="Evolución de tu nota" description="Simulacros y exámenes oficiales (0–100)" icon={<TrendingUp />} />
      <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
        {values.length === 0 ? (
          <p className="my-auto text-sm text-fg-muted">Aquí verás cómo evoluciona tu nota simulacro a simulacro.</p>
        ) : (
          <>
            <div className="flex items-end gap-3">
              <p className="text-4xl font-semibold tracking-tight tabular-nums text-fg">{formatGrade(last ?? 0)}</p>
              {delta !== null ? (
                <span
                  className={cn(
                    "mb-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
                    delta >= 0 ? "bg-success-soft text-success-text" : "bg-danger-soft text-danger-text",
                  )}
                >
                  {delta >= 0 ? <TrendingUp className="size-3.5" aria-hidden /> : <TrendingDown className="size-3.5" aria-hidden />}
                  {formatSigned(delta, 1)}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-fg-subtle">Última nota · la línea discontinua marca el aprobado (50)</p>
            <div className="mt-auto pt-4">
              <Sparkline values={values} height={84} label={`Últimas ${values.length} notas: ${values.map((v) => formatGrade(v, 1)).join(", ")}`} />
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

function QuickAction({ to, icon, title, text, tone }: { to: string; icon: ReactNode; title: string; text: string; tone: string }) {
  return (
    <Link
      to={to}
      className="group flex items-start gap-3 rounded-xl border border-border bg-surface-2/50 p-3.5 transition-all duration-150 hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-2 hover:shadow-card"
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-4.5", tone)}>{icon}</span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-sm font-semibold text-fg">
          {title}
          <ArrowRight className="size-3.5 -translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" aria-hidden />
        </span>
        <span className="mt-0.5 block text-xs leading-5 text-fg-muted">{text}</span>
      </span>
    </Link>
  );
}

export default function HomePage() {
  const profile = useSession((s) => s.profile)!;
  const settings = useSession((s) => s.settings);
  const catalog = useSession((s) => s.catalog);
  const pending = usePendingDraw();
  const reviewDue = useSession((s) => s.reviewDue);
  const loadExam = useExam((s) => s.load);
  const navigate = useNavigate();
  const { launch, busy, dialog } = useExamLauncher();
  const stats = useApi(() => api.getStats(profile.id), [profile.id]);
  const active = useApi(() => api.getActiveAttempt(profile.id), [profile.id]);

  const now = new Date();
  const days = daysUntil(settings?.exam_date ?? null);
  const s = stats.data;

  const resume = () => {
    if (!active.data) return;
    loadExam(active.data.paper, active.data.progress);
    navigate(`/examen/${active.data.paper.attempt_id}`);
  };
  const discard = async () => {
    if (!active.data) return;
    try {
      await api.abandonExam(active.data.paper.attempt_id);
      active.setData(null);
      toast.info("Examen descartado");
    } catch (e) {
      toast.error("No se ha podido descartar", errorMessage(e));
    }
  };

  const activeAnswered = active.data?.progress.answers.filter((a) => a.choice !== null).length ?? 0;
  const activeRemaining = active.data ? remainingSeconds(active.data.paper.duration_minutes, active.data.progress.elapsed_seconds) : null;

  return (
    <div className="@container">
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4">
          <ProfileAvatar profile={profile} size="lg" />
          <div>
            <p className="text-sm text-fg-muted first-letter:uppercase">{formatWeekdayLong(now)}</p>
            <h1 className="mt-0.5 text-[28px] font-semibold tracking-tight text-fg">
              {greeting(now)}, {firstName(profile.name)} <span aria-hidden>👋</span>
            </h1>
          </div>
        </div>
        {days !== null && days >= 0 ? (
          <Tooltip content={`Examen previsto el ${formatDate(settings?.exam_date)}`}>
            <span className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-3.5 py-2 shadow-card">
              <CalendarClock className="size-4 text-accent-text" aria-hidden />
              <span className="text-sm text-fg-muted">
                {days === 0 ? (
                  <strong className="text-fg">¡El examen es hoy!</strong>
                ) : (
                  <>
                    Faltan <strong className="text-lg tabular-nums text-fg">{formatInt(days)}</strong> días para el examen
                  </>
                )}
              </span>
            </span>
          </Tooltip>
        ) : (
          <ButtonLink to="/ajustes" variant="ghost" size="sm" leftIcon={<CalendarClock className="size-4" />}>
            Añade la fecha de tu examen
          </ButtonLink>
        )}
      </header>

      <div className="space-y-5">
        {active.data ? (
          <motion.div {...fade(0)} className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/35 bg-accent-soft p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-accent text-accent-fg">
              <History className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Tienes un examen sin terminar</p>
              <p className="truncate text-[13px] text-fg-muted">
                {active.data.paper.title} · {plural(activeAnswered, "respondida")}
                {activeRemaining !== null ? ` · quedan ${formatClock(activeRemaining)}` : ""}
              </p>
            </div>
            <Button variant="ghost" size="sm" leftIcon={<X className="size-3.5" />} onClick={() => void discard()}>
              Descartar
            </Button>
            <Button variant="primary" size="sm" sound="nav" leftIcon={<CirclePlay className="size-4" />} onClick={resume}>
              Continuar examen
            </Button>
          </motion.div>
        ) : null}

        {pending && settings ? (
          <motion.div {...fade(1)} className="relative flex flex-wrap items-center gap-4 overflow-hidden rounded-2xl border border-warning/35 bg-warning-soft p-4">
            <span className="grid size-10 place-items-center rounded-xl bg-warning text-white">
              <Dices className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-fg">Simulacro pendiente: {pending.draw.title}</p>
              <p className="truncate text-[13px] text-fg-muted">
                {pending.draw.subtitle ?? "Sorteado al abrir la app"} · modo {RUN_MODE_LABEL[runModeFromSettings(settings)].toLowerCase()} · se mantiene
                hasta que vuelvas a abrir OpoTAI
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate("/sorteo")}>
              Ver presentación
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={busy}
              leftIcon={<CirclePlay className="size-4" />}
              onClick={() =>
                void launch(withRunMode(pending.draw.spec, runModeFromSettings(settings)), {
                  onStarted: () => useSession.getState().markDrawStarted(profile.id),
                })
              }
            >
              Comenzar
            </Button>
          </motion.div>
        ) : null}

        {stats.error && !s ? <ErrorState message={stats.error.message} onRetry={stats.reload} /> : null}

        {!s && !stats.error ? (
          <div className="grid gap-5 @5xl:grid-cols-3">
            <Skeleton className="h-80 @5xl:col-span-2" />
            <Skeleton className="h-80" />
          </div>
        ) : null}

        {s ? (
          <>
            <div className="grid gap-5 @5xl:grid-cols-3">
              <motion.div {...fade(2)} className="@container @5xl:col-span-2">
                <Readiness stats={s} />
              </motion.div>
              <motion.div {...fade(3)}>
                <Evolution stats={s} />
              </motion.div>
            </div>

            <motion.div {...fade(4)} className="grid grid-cols-2 gap-4 @3xl:grid-cols-3 @5xl:grid-cols-5">
              <Stat label="Simulacros" value={formatInt(s.simulacros_finished)} icon={<Timer />} hint={`${plural(s.attempts_finished, "intento")} en total`} />
              <Stat label="Nota media" value={s.average_grade !== null ? formatGrade(s.average_grade) : "—"} icon={<Gauge />} hint="Simulacros y oficiales" />
              <Stat label="Mejor nota" value={s.best_grade !== null ? formatGrade(s.best_grade) : "—"} icon={<Trophy />} tone="success" hint="Sobre 100" />
              <Stat
                label="Precisión"
                value={formatPercent(s.accuracy)}
                icon={<Target />}
                tone="info"
                hint={`${plural(s.correct, "acierto")} · ${plural(s.wrong, "fallo")}`}
              />
              <Stat label="Racha" value={`${formatInt(s.streak_days)} ${s.streak_days === 1 ? "día" : "días"}`} icon={<Flame />} tone="warning" hint="Días seguidos estudiando" />
            </motion.div>

            <div className="grid gap-5 @5xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
              <motion.div {...fade(5)}>
                <Card className="h-full">
                  <CardHeader
                    title="Tus temas más débiles"
                    description="Según tu acierto neto (los fallos restan un tercio)"
                    icon={<TrendingDown />}
                    action={
                      s.weakest_topics.length > 1 && settings ? (
                        <Button
                          size="sm"
                          variant="soft"
                          loading={busy}
                          onClick={() =>
                            void launch(
                              practiceSpec({
                                topics: s.weakest_topics.map((t) => t.topic ?? t.key),
                                count: 20,
                                feedback: settings.default_feedback,
                              }),
                            )
                          }
                        >
                          Practicar todos
                        </Button>
                      ) : undefined
                    }
                  />
                  <div className="p-5 pt-3">
                    {s.weakest_topics.length === 0 ? (
                      <p className="py-6 text-center text-sm text-fg-muted">Responde algunas preguntas más y te diremos qué temas reforzar.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {s.weakest_topics.map((t) => {
                          const title = topicTitle(catalog?.temario, t.topic) ?? t.label;
                          return (
                            <li key={t.key} className="flex items-center gap-4 py-3">
                              <Badge tone="neutral" className="w-12 justify-center font-semibold tabular-nums">
                                {t.topic ?? t.key}
                              </Badge>
                              <div className="min-w-0 flex-1">
                                <Tooltip content={title} className="block min-w-0 max-w-full" side="top">
                                  <p className="truncate text-sm font-medium text-fg">{shortTitle(title, 80)}</p>
                                </Tooltip>
                                <div className="mt-1.5 flex items-center gap-2.5">
                                  <Progress value={t.accuracy} tone={t.accuracy < 0.4 ? "danger" : t.accuracy < 0.6 ? "warning" : "success"} className="max-w-48" />
                                  <span className="text-xs tabular-nums text-fg-muted">
                                    {formatPercent(t.accuracy)} · {formatInt(t.total)} resp.
                                  </span>
                                </div>
                              </div>
                              {settings ? (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={busy}
                                  onClick={() => void launch(practiceSpec({ topics: [t.topic ?? t.key], count: 15, feedback: settings.default_feedback }))}
                                >
                                  Practicar
                                </Button>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </Card>
              </motion.div>

              <motion.div {...fade(6)}>
                <Card className="@container h-full">
                  <CardHeader title="Accesos rápidos" icon={<Sparkles />} />
                  <div className="grid gap-2.5 p-5 pt-4 @md:grid-cols-2">
                    <QuickAction to="/simulacro" icon={<Timer />} title="Simulacro" text="Formato oficial completo" tone="bg-accent-soft text-accent-text" />
                    <QuickAction to="/oficiales" icon={<Landmark />} title="Examen oficial" text="Convocatorias anteriores" tone="bg-info-soft text-info-text" />
                    <QuickAction
                      to="/repaso"
                      icon={<RotateCcw />}
                      title="Repaso de fallos"
                      text={reviewDue ? `${formatInt(reviewDue)} pendientes hoy` : "Sistema de cajas"}
                      tone="bg-warning-soft text-warning-text"
                    />
                    <QuickAction to="/supuestos" icon={<Briefcase />} title="Supuesto práctico" text="Bloques III y IV" tone="bg-success-soft text-success-text" />
                    <QuickAction to="/temas" icon={<Layers />} title="Practicar por temas" text="Elige bloques y temas" tone="bg-accent-soft text-accent-text" />
                    <QuickAction to="/teoria" icon={<BookOpen />} title="Teoría" text="Resúmenes por tema" tone="bg-info-soft text-info-text" />
                    <QuickAction to="/calculadora" icon={<Calculator />} title="Calculadora" text="Tu nota con aciertos y fallos" tone="bg-surface-3 text-fg-muted" />
                  </div>
                </Card>
              </motion.div>
            </div>
          </>
        ) : null}
      </div>
      {dialog}
    </div>
  );
}
