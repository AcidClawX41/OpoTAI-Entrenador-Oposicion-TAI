// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { CirclePlay, Dices, History, House, Repeat, TriangleAlert } from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { CatalogInfo, RandomDraw } from "@/api/types";
import { formatInt } from "@/lib/format";
import { RUN_MODE_FEEDBACK, runModeFromSettings, withRunMode, type ExamRunMode } from "@/lib/examMode";
import { bankStructure, structureFromScheme, type ExamStructureInfo } from "@/lib/exam/structure";
import { playSfx } from "@/lib/sfx";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Logo } from "@/components/ui/display";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ExamModeChooser } from "@/components/exam/ExamModeChooser";
import { ExamStructure } from "@/components/exam/ExamStructure";

/** Estructura del examen sorteado: la réplica oficial del banco o el formato vigente (numerados, sin reservas). */
function drawStructure(catalog: CatalogInfo | null, draw: RandomDraw): ExamStructureInfo | null {
  if (!catalog) return null;
  const spec = draw.spec;
  if (spec.type === "official") {
    const bank = catalog.banks.find((b) => b.id === spec.bank_id);
    const info = bank ? bankStructure(catalog, bank) : null;
    return info ? { ...info, durationMinutes: draw.duration_minutes ?? info.durationMinutes } : null;
  }
  const scheme = catalog.schemes.find((s) => s.id === catalog.default_scheme);
  if (!scheme) return null;
  return structureFromScheme(scheme, {
    questions1: draw.question_count || undefined,
    reserve1: 0,
    caseReserve: 0,
    casesOffered: draw.case_count || null,
    includeCase: draw.case_count > 0,
    durationMinutes: draw.duration_minutes,
  });
}

/** Presentación del simulacro sorpresa: lo sortea el núcleo al abrir la app; no se puede elegir ni volver a sortear. */
export default function SurprisePage() {
  const profile = useSession((s) => s.profile);
  const settings = useSession((s) => s.settings);
  const catalog = useSession((s) => s.catalog);
  const saveSettings = useSession((s) => s.saveSettings);
  const entry = useSession((s) => (s.profile ? s.draws[s.profile.id] : undefined));
  const ensureDraw = useSession((s) => s.ensureDraw);
  const markDrawStarted = useSession((s) => s.markDrawStarted);
  const navigate = useNavigate();
  const { launch, busy, dialog } = useExamLauncher();
  const [error, setError] = useState<string | null>(null);
  const profileId = profile?.id ?? "";
  const active = useApi(() => api.getActiveAttempt(profileId), [profileId], Boolean(profileId));
  const draw = entry?.draw;
  const structure = useMemo(() => (draw ? drawStructure(catalog, draw) : null), [catalog, draw]);

  useEffect(() => {
    if (!profileId || entry) return;
    ensureDraw(profileId).catch((e: unknown) => setError(errorMessage(e)));
  }, [profileId, entry, ensureDraw]);

  if (!profile || !settings) return null;
  if (!entry && !settings.random_exam_on_startup) return <Navigate to="/inicio" replace />;

  const mode = runModeFromSettings(settings);
  const setMode = (next: ExamRunMode) => void saveSettings({ exam_feedback: RUN_MODE_FEEDBACK[next] });
  const later = () => {
    playSfx("nav");
    navigate("/inicio");
  };

  return (
    <div className="app-backdrop relative h-full overflow-y-auto">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-accent/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[520px] rounded-full bg-[#06b6d4]/10 blur-[110px]" />
      </div>
      <div className="relative mx-auto flex min-h-full max-w-[1120px] flex-col px-6 pb-24 pt-6">
        <header className="flex items-center justify-between">
          <Logo />
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 py-1 pl-1 pr-3 text-sm font-medium text-fg">
            <ProfileAvatar profile={profile} size="xs" />
            {profile.name}
          </span>
        </header>

        <main className="flex flex-1 items-center justify-center py-6">
          {error ? (
            <div className="max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-pop">
              <TriangleAlert className="mx-auto size-8 text-warning-text" />
              <h1 className="mt-3 text-lg font-semibold text-fg">No se ha podido sortear el simulacro</h1>
              <p className="mt-2 text-sm text-fg-muted">{error}</p>
              <Button className="mt-6" variant="primary" leftIcon={<House className="size-4" />} onClick={later}>
                Ir al inicio
              </Button>
            </div>
          ) : !draw ? (
            <div className="flex flex-col items-center gap-5 text-center" role="status">
              <motion.div
                animate={{ rotate: [0, 90, 180, 270, 360], y: [0, -10, 0, -6, 0] }}
                transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                className="grid size-20 place-items-center rounded-3xl bg-accent text-accent-fg shadow-glow"
              >
                <Dices className="size-10" />
              </motion.div>
              <p className="text-lg font-medium text-fg">Sorteando tu simulacro de hoy…</p>
            </div>
          ) : entry?.status === "started" ? (
            <div className="max-w-md rounded-3xl border border-border bg-surface p-8 text-center shadow-pop">
              <Dices className="mx-auto size-8 text-accent-text" />
              <h1 className="mt-3 text-lg font-semibold text-fg">Ya has empezado el simulacro de hoy</h1>
              <p className="mt-2 text-sm text-fg-muted">El próximo sorteo será la próxima vez que abras OpoTAI.</p>
              <Button className="mt-6" variant="primary" leftIcon={<House className="size-4" />} onClick={later}>
                Ir al inicio
              </Button>
            </div>
          ) : (
            <motion.section
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative w-full overflow-hidden rounded-[28px] border border-border bg-surface/95 shadow-pop"
              aria-labelledby="titulo-sorteo"
            >
              <div className="h-1.5 w-full brand-gradient" aria-hidden />
              <div className="grid lg:grid-cols-[minmax(0,1.32fr)_minmax(0,1fr)]">
                <div className="min-w-0 p-7 sm:p-8">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Badge tone="warning" variant="solid" size="md" icon={<Dices />}>
                      Simulacro sorpresa
                    </Badge>
                    <span className="text-[13px] text-fg-muted">
                      {formatInt(draw.pool_size)} {draw.pool_size === 1 ? "examen" : "exámenes"} en el sorteo
                    </span>
                  </div>
                  <p className="mt-6 text-[12.5px] font-semibold uppercase tracking-[0.14em] text-accent-text">Tu simulacro de hoy</p>
                  <h1 id="titulo-sorteo" className="mt-1.5 text-[27px] font-semibold leading-[1.18] tracking-tight text-fg text-balance">
                    {draw.title}
                  </h1>
                  <p className="mt-3 max-w-2xl text-[14.5px] leading-6 text-fg-muted">{draw.description}</p>
                  {structure ? (
                    <ExamStructure info={structure} compact className="mt-6" />
                  ) : draw.subtitle ? (
                    <p className="mt-4 text-[15px] font-medium text-fg">{draw.subtitle}</p>
                  ) : null}
                  {draw.already_done ? (
                    <p className="mt-4 flex items-center gap-2 text-[13px] text-fg-muted">
                      <Repeat className="size-4 text-info-text" aria-hidden />
                      Ya los has hecho todos: te toca repetir uno de los que hiciste hace más tiempo.
                    </p>
                  ) : null}
                </div>

                <div className="flex min-w-0 flex-col border-t border-border bg-surface-2/40 p-7 sm:p-8 lg:border-l lg:border-t-0">
                  <ExamModeChooser value={mode} onChange={setMode} durationMinutes={draw.duration_minutes} layout="stack" heading="¿Cómo quieres hacerlo?" />
                  {active.data ? (
                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2 text-[13px] text-fg">
                      <History className="mt-0.5 size-4 shrink-0 text-warning-text" aria-hidden />
                      Tienes «{active.data.paper.title}» sin terminar. Si comienzas el simulacro sorpresa, se abandonará.
                    </p>
                  ) : null}
                  <div className="mt-auto pt-6">
                    <Button
                      variant="primary"
                      size="lg"
                      className="w-full"
                      loading={busy}
                      leftIcon={<CirclePlay className="size-5" />}
                      onClick={() => void launch(withRunMode(draw.spec, mode), { onStarted: () => markDrawStarted(profile.id) })}
                    >
                      Comenzar simulacro
                    </Button>
                    <Button variant="ghost" size="md" className="mt-2 w-full" onClick={later}>
                      Ahora no
                    </Button>
                    <p className="mt-4 text-xs leading-5 text-fg-subtle">
                      OpoTAI sortea un examen cada vez que abres la app: no se puede elegir ni volver a sortear. Si lo dejas para luego, lo
                      tendrás pendiente en Inicio.
                    </p>
                  </div>
                </div>
              </div>
            </motion.section>
          )}
        </main>
      </div>
      {dialog}
    </div>
  );
}
