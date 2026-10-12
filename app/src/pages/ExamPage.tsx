// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  CloudAlert,
  CloudCheck,
  Dices,
  GraduationCap,
  House,
  LayoutGrid,
  Loader2,
  Pause,
  Play,
  Send,
  Timer,
  TriangleAlert,
  X,
} from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { Letter } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { LETTERS } from "@/lib/exam/model";
import { caseSections, currentEntry, currentList, sectionOfQuestion, showsOneCase, tabsOf, theorySections } from "@/lib/exam/navigation";
import { toProgress } from "@/lib/exam/reducer";
import { summarize } from "@/lib/exam/summary";
import { soundForFeedback, soundForResult, soundForSelection } from "@/lib/examSounds";
import { playSfx } from "@/lib/sfx";
import { remainingSeconds, timerTone, type TimerTone } from "@/lib/time";
import { MODE_LABEL } from "@/lib/labels";
import { paperMode } from "@/lib/examMode";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useExam } from "@/store/exam";
import { useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Kbd, Progress } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/overlays";
import { CaseChoice, CaseStrip, SplitView, StatementPanel, sectionHasFigures } from "@/components/exam/CasePanels";
import { PartStepper } from "@/components/exam/PartStepper";
import { ExitDialog, SubmitDialog } from "@/components/exam/ExamDialogs";
import { QuestionCard } from "@/components/exam/QuestionCard";
import { QuestionNavigator } from "@/components/exam/QuestionNavigator";
import { TimerPill } from "@/components/exam/TimerPill";

function CenteredMessage({ icon, title, text, action }: { icon: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="app-backdrop grid h-full place-items-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-surface-2 text-fg-muted [&_svg]:size-6">{icon}</div>
        <h1 className="text-lg font-semibold text-fg">{title}</h1>
        {text ? <p className="mt-2 text-sm leading-6 text-fg-muted">{text}</p> : null}
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </div>
  );
}

export default function ExamPage() {
  const { attemptId = "" } = useParams();
  const navigate = useNavigate();
  const profile = useSession((s) => s.profile);
  const settings = useSession((s) => s.settings);
  const catalog = useSession((s) => s.catalog);
  const refreshReviewDue = useSession((s) => s.refreshReviewDue);
  const paper = useExam((s) => s.paper);
  const state = useExam((s) => s.state);
  const dispatch = useExam((s) => s.dispatch);
  const load = useExam((s) => s.load);
  const markSaved = useExam((s) => s.markSaved);
  const markSaveError = useExam((s) => s.markSaveError);
  const lastSavedAt = useExam((s) => s.lastSavedAt);
  const saveError = useExam((s) => s.saveError);
  const cacheResult = useExam((s) => s.cacheResult);

  const ready = Boolean(paper && state && paper.attempt_id === attemptId);
  const [loadState, setLoadState] = useState<"loading" | "missing" | "error">("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [exitOpen, setExitOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [paused, setPaused] = useState(false);
  const [navOpen, setNavOpen] = useState(() => (typeof window !== "undefined" ? window.innerWidth >= 1200 : true));
  const [statementCollapsed, setStatementCollapsed] = useState(false);
  /** 2.ª parte con supuestos a elegir: se pasa de la pantalla de elección a ver uno sin elegirlo. */
  const [browsingCases, setBrowsingCases] = useState(false);
  const [pendingCheck, setPendingCheck] = useState<{ qid: string; letter: Letter | null } | null>(null);
  const submittingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastIndex = useRef(0);

  // ── Carga / reanudación ──
  useEffect(() => {
    if (ready || !profile) return;
    let alive = true;
    setLoadState("loading");
    api
      .getActiveAttempt(profile.id)
      .then((active) => {
        if (!alive) return;
        if (active && active.paper.attempt_id === attemptId) load(active.paper, active.progress);
        else setLoadState("missing");
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setLoadError(errorMessage(e));
        setLoadState("error");
      });
    return () => {
      alive = false;
    };
  }, [attemptId, ready, profile, load]);

  // ── Guardado ──
  const save = useCallback(async () => {
    const { state: current, paper: p } = useExam.getState();
    if (!current || !p || submittingRef.current || current.attemptId !== attemptId) return;
    try {
      await api.saveProgress(toProgress(current));
      markSaved(Date.now());
    } catch (e) {
      markSaveError(errorMessage(e));
    }
  }, [attemptId, markSaved, markSaveError]);

  useEffect(() => {
    if (!ready) return;
    // Guardado casi inmediato: si se cierra la ventana justo después de responder, no se pierde
    // la última respuesta (el cierre de la ventana no da tiempo a guardar en `beforeunload`).
    const t = window.setTimeout(() => void save(), 250);
    return () => window.clearTimeout(t);
  }, [state?.revision, ready, save]);

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => void save(), 10_000);
    const onHide = () => {
      if (document.visibilityState === "hidden") void save();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onHide);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onHide);
      void save();
    };
  }, [ready, save]);

  // ── Temporizador (sin deriva: suma el tiempo real transcurrido) ──
  useEffect(() => {
    if (!ready || paused || submitting) return;
    let last = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      dispatch({ type: "tick", seconds: (now - last) / 1000 });
      last = now;
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready, paused, submitting, dispatch]);

  const summary = useMemo(() => (paper && state ? summarize(paper, state) : null), [paper, state]);
  const remaining = paper && state ? remainingSeconds(paper.duration_minutes, state.elapsed) : null;

  // ── Entrega ──
  const submit = useCallback(
    async (auto = false) => {
      const { state: current } = useExam.getState();
      if (!current || submittingRef.current) return;
      submittingRef.current = true;
      setSubmitting(true);
      try {
        const result = await api.submitExam(toProgress(current));
        cacheResult(result);
        playSfx(soundForResult(result.grade.passed));
        void refreshReviewDue();
        if (auto) toast.info("Se acabó el tiempo", "El examen se ha entregado automáticamente.");
        navigate(`/resultados/${result.attempt_id}`, { replace: true });
      } catch (e) {
        submittingRef.current = false;
        setSubmitting(false);
        toast.error("No se ha podido entregar el examen", errorMessage(e));
      }
    },
    [cacheResult, navigate, refreshReviewDue],
  );

  useEffect(() => {
    if (ready && remaining !== null && remaining <= 0 && !submittingRef.current) void submit(true);
  }, [ready, remaining, submit]);

  // ── Avisos del cronómetro a 10 minutos y a 1 minuto del final (sonido + aviso visual) ──
  const lastTone = useRef<TimerTone | null>(null);
  useEffect(() => {
    if (!ready) return;
    const tone = timerTone(remaining);
    const prev = lastTone.current;
    lastTone.current = tone;
    // Sin aviso al abrir o reanudar: solo al cruzar el umbral durante el examen.
    if (prev === null || remaining === null || remaining <= 0 || tone === prev) return;
    if (tone === "warning") {
      playSfx("alert");
      toast.warning("Quedan 10 minutos", "Repasa las dudosas y las preguntas en blanco.");
    } else if (tone === "danger") {
      playSfx("alert");
      toast.warning("Queda 1 minuto", "Al llegar a cero, el examen se entrega solo.");
    }
  }, [ready, remaining]);

  const requestSubmit = () => {
    if (submittingRef.current) return;
    if (settings?.confirm_before_submit === false) void submit();
    else setSubmitOpen(true);
  };

  const entry = paper && state ? currentEntry(paper, state) : undefined;
  const list = paper && state ? currentList(paper, state) : [];

  // ── Modo inmediato: comprobar respuesta ──
  const check = useCallback(
    async (qid: string, letter: Letter | null) => {
      const { paper: p } = useExam.getState();
      if (!p) return;
      setPendingCheck({ qid, letter });
      try {
        const fb = await api.checkAnswer(p.attempt_id, qid, letter);
        dispatch({ type: "feedback", feedback: fb });
        const sound = soundForFeedback(fb);
        if (sound) playSfx(sound);
      } catch (e) {
        toast.error("No se ha podido comprobar la respuesta", errorMessage(e));
      } finally {
        setPendingCheck(null);
      }
    },
    [dispatch],
  );

  // Al reanudar en modo inmediato, recupera la explicación de lo ya respondido.
  const entryId = entry?.question.id;
  useEffect(() => {
    if (!ready || !paper || paper.feedback !== "immediate" || !entryId) return;
    const st = useExam.getState().state;
    if (!st?.locked[entryId] || st.feedback[entryId]) return;
    let alive = true;
    api
      .checkAnswer(paper.attempt_id, entryId, st.answers[entryId]?.choice ?? null)
      .then((fb) => alive && dispatch({ type: "feedback", feedback: fb }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [ready, paper, entryId, dispatch]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [entryId]);

  // Al volver a la 1.ª parte sin haber elegido supuesto, la 2.ª vuelve a mostrar la pantalla de elección.
  const currentTab = state?.tab;
  useEffect(() => {
    if (currentTab === "theory") setBrowsingCases(false);
  }, [currentTab]);

  const select = (letter: Letter) => {
    if (!paper || !state || !entry || paused) return;
    const qid = entry.question.id;
    if (paper.feedback === "immediate") {
      if (!state.locked[qid] && !pendingCheck) void check(qid, letter);
      return;
    }
    const prev = state.answers[qid]?.choice ?? null;
    const next = prev === letter ? null : letter;
    dispatch({ type: "answer", questionId: qid, choice: letter });
    const sound = soundForSelection(paper.feedback, next);
    if (sound) playSfx(sound);
  };
  const clear = () => {
    if (!entry || !paper || paper.feedback === "immediate") return;
    dispatch({ type: "clear", questionId: entry.question.id });
  };
  const flag = () => entry && dispatch({ type: "flag", questionId: entry.question.id });
  const go = (questionId: string) => {
    if (paper && sectionOfQuestion(paper, questionId)?.kind === "case") setBrowsingCases(true);
    dispatch({ type: "gotoQuestion", questionId });
    setSubmitOpen(false);
  };
  // Pantalla de elección del supuesto: 2.ª parte con supuestos a elegir y ninguno elegido ni abierto.
  const choosingCase = Boolean(paper && state && state.tab === "case" && showsOneCase(paper) && !state.chosenCase && !browsingCases);

  useHotkeys(
    (e) => {
      if (submittingRef.current || paused) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        requestSubmit();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || choosingCase) return;
      const k = e.key.toLowerCase();
      const num = ["1", "2", "3", "4"].indexOf(k);
      const let_ = ["a", "b", "c", "d"].indexOf(k);
      const idx = num >= 0 ? num : let_;
      if (idx >= 0) {
        e.preventDefault();
        const letter = LETTERS[idx];
        if (letter && entry && idx < entry.question.options.length) select(letter);
        return;
      }
      if (k === "0" || e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        clear();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        dispatch({ type: "next" });
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        dispatch({ type: "prev" });
      } else if (k === "f") {
        e.preventDefault();
        flag();
      }
    },
    ready && settings?.keyboard_shortcuts !== false,
  );

  if (!profile) return null;
  if (!ready || !paper || !state || !summary) {
    if (loadState === "missing")
      return (
        <CenteredMessage
          icon={<TriangleAlert />}
          title="Este examen ya no está en curso"
          text="Puede que se entregara o se abandonara. Puedes ver tus resultados en Estadísticas."
          action={
            <Button variant="primary" leftIcon={<House className="size-4" />} onClick={() => navigate("/inicio")}>
              Ir al inicio
            </Button>
          }
        />
      );
    if (loadState === "error")
      return (
        <CenteredMessage
          icon={<TriangleAlert />}
          title="No se ha podido abrir el examen"
          text={loadError ?? undefined}
          action={<Button onClick={() => navigate("/inicio")}>Ir al inicio</Button>}
        />
      );
    return <CenteredMessage icon={<Loader2 className="animate-spin" />} title="Preparando el examen…" />;
  }

  const tabs = tabsOf(paper);
  const oneCase = showsOneCase(paper);
  const modeInfo = paperMode(paper);
  // Modos «Aprendizaje» y «Examen real»: exámenes completos y supuestos.
  const runModeShown = paper.mode === "official" || paper.mode === "simulacro" || paper.mode === "case";
  const canPause = paper.mode === "practice" || paper.mode === "review" || paper.mode === "case";
  const index = Math.min(state.cursor[state.tab], Math.max(0, list.length - 1));
  const direction = index >= lastIndex.current ? 1 : -1;
  lastIndex.current = index;
  const answeredTotal = summary.answered;
  const isLast = index >= list.length - 1;
  const goCases = state.tab === "theory" && tabs.includes("case") && isLast;
  const section = entry?.section;
  const viewingUnchosen = oneCase && state.tab === "case" && state.chosenCase !== null && state.viewedCase !== state.chosenCase;
  const shortcuts = settings?.keyboard_shortcuts !== false;

  const questionArea = (
    <div className="@container relative flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-[880px] px-6 py-6">
          {viewingUnchosen ? (
            <div className="mb-4 flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-2.5 text-sm text-fg">
              <TriangleAlert className="size-4 shrink-0 text-warning-text" aria-hidden />
              <span className="flex-1">Estás viendo un supuesto que no has elegido: estas respuestas no puntuarán.</span>
              <Button size="xs" variant="secondary" onClick={() => state.viewedCase && dispatch({ type: "chooseCase", sectionId: state.viewedCase })}>
                Elegir este
              </Button>
            </div>
          ) : null}
          {entry ? (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={entry.question.id}
                initial={{ opacity: 0, x: 14 * direction }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 * direction }}
                transition={{ duration: 0.16, ease: "easeOut" }}
              >
                <QuestionCard
                  question={entry.question}
                  position={{ index, total: list.length }}
                  choice={state.answers[entry.question.id]?.choice ?? null}
                  flagged={state.answers[entry.question.id]?.flagged ?? false}
                  onSelect={select}
                  onToggleFlag={flag}
                  feedbackMode={paper.feedback}
                  feedback={state.feedback[entry.question.id] ?? null}
                  locked={Boolean(state.locked[entry.question.id])}
                  pending={pendingCheck?.qid === entry.question.id ? pendingCheck.letter : null}
                  onReveal={() => void check(entry.question.id, null)}
                  temario={catalog?.temario ?? null}
                  shortcuts={shortcuts}
                />
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="py-20 text-center text-sm text-fg-muted">Elige un supuesto para empezar.</p>
          )}
        </div>
      </div>
      <footer className="shrink-0 border-t border-border bg-panel/90 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex min-w-0 max-w-[880px] items-center justify-between gap-3">
          <Button leftIcon={<ChevronLeft className="size-4" />} disabled={index === 0} onClick={() => dispatch({ type: "prev" })}>
            Anterior
          </Button>
          {shortcuts ? (
            <p
              className={cn(
                "hidden min-w-0 items-center gap-1.5 overflow-hidden whitespace-nowrap text-[11.5px] text-fg-subtle",
                // Con el botón ancho «Ir a la parte 2» las pistas solo caben en ventanas grandes.
                goCases ? "@6xl:flex" : "@3xl:flex",
              )}
            >
              <Kbd>1</Kbd>–<Kbd>4</Kbd> responder
              <span className="mx-1">·</span>
              <Kbd>0</Kbd> en blanco
              <span className="mx-1">·</span>
              <Kbd>←</Kbd>
              <Kbd>→</Kbd> navegar
              <span className="mx-1">·</span>
              <Kbd>Ctrl</Kbd>+<Kbd>↵</Kbd> entregar
            </p>
          ) : null}
          {goCases ? (
            <Button variant="primary" rightIcon={<ChevronRight className="size-4" />} onClick={() => dispatch({ type: "setTab", tab: "case" })}>
              Ir a la parte 2 · Supuesto práctico
            </Button>
          ) : (
            <Button rightIcon={<ChevronRight className="size-4" />} disabled={isLast} onClick={() => dispatch({ type: "next" })}>
              Siguiente
            </Button>
          )}
        </div>
      </footer>
      {paused ? (
        <div className="absolute inset-0 z-10 grid place-items-center bg-bg/70 backdrop-blur-md">
          <div className="text-center">
            <Pause className="mx-auto size-8 text-fg-muted" aria-hidden />
            <p className="mt-3 text-lg font-semibold text-fg">En pausa</p>
            <Button className="mt-4" variant="primary" leftIcon={<Play className="size-4" />} onClick={() => setPaused(false)}>
              Reanudar
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-full flex-col bg-bg">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-panel px-3 xl:gap-4 xl:px-4">
        <Tooltip content="Salir del examen" side="bottom">
          <Button variant="ghost" size="icon" aria-label="Salir del examen" onClick={() => setExitOpen(true)}>
            <X className="size-4.5" />
          </Button>
        </Tooltip>
        <div className="min-w-0 max-w-[300px] shrink">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-semibold text-fg" title={paper.title}>
              {paper.title}
            </h1>
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 overflow-hidden">
            {modeInfo.learning && runModeShown ? (
              <Badge tone="info" icon={<GraduationCap />} title="Sin límite de tiempo y corrección con explicación en cada pregunta">
                Aprendizaje · sin límite
              </Badge>
            ) : modeInfo.real && runModeShown ? (
              <Badge tone="accent" icon={<Timer />} title="Cronómetro oficial y corrección al entregar, como el tribunal">
                Examen real
              </Badge>
            ) : modeInfo.immediate ? (
              <Badge tone="info" icon={<GraduationCap />}>
                Modo estudio
              </Badge>
            ) : null}
            {paper.drawn ? (
              <Badge tone="warning" icon={<Dices />}>
                Simulacro sorpresa
              </Badge>
            ) : null}
            {paper.title !== MODE_LABEL[paper.mode] ? <Badge tone="neutral">{MODE_LABEL[paper.mode]}</Badge> : null}
            {paper.subtitle && !paper.drawn ? <span className="truncate text-xs text-fg-muted">{paper.subtitle}</span> : null}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-center">
          {tabs.length > 1 ? (
            <PartStepper
              steps={tabs.map((t) => ({
                id: t,
                part: (t === "theory" ? theorySections(paper)[0]?.part : caseSections(paper)[0]?.part) ?? (t === "theory" ? 1 : 2),
                name: t === "theory" ? "Cuestionario" : "Supuesto práctico",
                answered: summary.perTab[t].answered,
                total: summary.perTab[t].total,
                hint: t === "case" && oneCase && !state.chosenCase ? `elige 1 de ${caseSections(paper).length}` : undefined,
              }))}
              value={state.tab}
              onChange={(tab) => dispatch({ type: "setTab", tab })}
            />
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Tooltip
            content={saveError ? `No se ha podido guardar: ${saveError}` : lastSavedAt ? "Progreso guardado" : "Se guarda automáticamente"}
            side="bottom"
          >
            <span className={cn("grid size-8 place-items-center", saveError ? "text-danger-text" : "text-fg-subtle")} aria-label={saveError ? "Error al guardar" : "Guardado automático"}>
              {saveError ? <CloudAlert className="size-4.5" /> : <CloudCheck className="size-4.5" />}
            </span>
          </Tooltip>
          {canPause ? (
            <Button variant="ghost" size="icon" aria-label={paused ? "Reanudar" : "Pausar"} onClick={() => setPaused((p) => !p)}>
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </Button>
          ) : null}
          <TimerPill remaining={remaining} elapsed={state.elapsed} hidden={settings?.show_timer === false} />
          {tabs.length <= 1 ? (
            <div className="hidden w-28 xl:block" aria-label={`${answeredTotal} de ${summary.total} respondidas`}>
              <Progress value={answeredTotal} max={Math.max(1, summary.total)} size="sm" />
              <p className="mt-1 text-[11px] tabular-nums text-fg-muted">
                {formatInt(answeredTotal)}/{formatInt(summary.total)} respondidas
              </p>
            </div>
          ) : null}
          <Tooltip content={navOpen ? "Ocultar el navegador" : "Mostrar el navegador"} side="bottom">
            <Button variant={navOpen ? "secondary" : "ghost"} size="icon" aria-pressed={navOpen} aria-label="Navegador de preguntas" onClick={() => setNavOpen((o) => !o)}>
              <LayoutGrid className="size-4" />
            </Button>
          </Tooltip>
          <Button variant="primary" leftIcon={<Send className="size-4" />} loading={submitting} onClick={requestSubmit}>
            Entregar
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          {state.tab === "case" && oneCase && !choosingCase ? (
            <CaseStrip
              paper={paper}
              state={state}
              onView={(id) => dispatch({ type: "viewCase", sectionId: id })}
              onChoose={(id) => dispatch({ type: "chooseCase", sectionId: id })}
            />
          ) : null}
          <div className="min-h-0 flex-1">
            {choosingCase ? (
              <CaseChoice
                paper={paper}
                onPreview={(id) => {
                  setBrowsingCases(true);
                  dispatch({ type: "viewCase", sectionId: id });
                }}
                onChoose={(id) => {
                  setBrowsingCases(true);
                  dispatch({ type: "chooseCase", sectionId: id });
                }}
              />
            ) : state.tab === "case" && section?.kind === "case" && section.statement ? (
              <SplitView
                collapsed={statementCollapsed}
                onExpand={() => setStatementCollapsed(false)}
                wide={sectionHasFigures(section)}
                left={<StatementPanel section={section} onCollapse={() => setStatementCollapsed(true)} />}
                right={questionArea}
              />
            ) : (
              questionArea
            )}
          </div>
        </div>
        {navOpen ? (
          <aside aria-label="Navegador de preguntas" className="w-[296px] shrink-0 border-l border-border bg-panel">
            <QuestionNavigator paper={paper} state={state} summary={summary} onGo={go} onTab={(tab) => dispatch({ type: "setTab", tab })} />
          </aside>
        ) : null}
      </div>

      <SubmitDialog
        open={submitOpen}
        onClose={() => setSubmitOpen(false)}
        onConfirm={() => void submit()}
        onGo={go}
        paper={paper}
        summary={summary}
        submitting={submitting}
      />
      <ExitDialog
        open={exitOpen}
        onClose={() => setExitOpen(false)}
        busy={leaving}
        onSaveExit={async () => {
          setLeaving(true);
          await save();
          setLeaving(false);
          setExitOpen(false);
          navigate("/inicio");
        }}
        onAbandon={async () => {
          setLeaving(true);
          try {
            submittingRef.current = true;
            await api.abandonExam(paper.attempt_id);
            useExam.getState().reset();
            toast.info("Examen abandonado");
            navigate("/inicio");
          } catch (e) {
            submittingRef.current = false;
            toast.error("No se ha podido abandonar", errorMessage(e));
          } finally {
            setLeaving(false);
          }
        }}
      />
    </div>
  );
}
