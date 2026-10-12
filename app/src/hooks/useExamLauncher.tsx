// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { CirclePlay, History } from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { ActiveAttempt, ExamPaper, ExamSpec } from "@/api/types";
import { playSfx } from "@/lib/sfx";
import { useExam } from "@/store/exam";
import { useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface Pending {
  spec: ExamSpec;
  active: ActiveAttempt;
  onStarted?: (paper: ExamPaper) => void;
}

/**
 * Empieza un examen (`start_exam`) y abre la pantalla inmersiva. Si el perfil
 * tiene otro examen en curso, pregunta antes (el núcleo lo marcaría como abandonado).
 */
export function useExamLauncher(): {
  launch: (spec: ExamSpec, options?: { onStarted?: (paper: ExamPaper) => void }) => Promise<void>;
  busy: boolean;
  dialog: ReactNode;
} {
  const profile = useSession((s) => s.profile);
  const load = useExam((s) => s.load);
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  const start = async (spec: ExamSpec, onStarted?: (paper: ExamPaper) => void) => {
    if (!profile) return;
    setBusy(true);
    try {
      const paper = await api.startExam(profile.id, spec);
      load(paper, null);
      onStarted?.(paper);
      playSfx("nav");
      navigate(`/examen/${paper.attempt_id}`);
    } catch (error) {
      toast.error("No se ha podido empezar", errorMessage(error));
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const launch = async (spec: ExamSpec, options?: { onStarted?: (paper: ExamPaper) => void }) => {
    if (!profile || busy) return;
    setBusy(true);
    let active: ActiveAttempt | null = null;
    try {
      active = await api.getActiveAttempt(profile.id);
    } catch {
      active = null;
    }
    setBusy(false);
    if (active) {
      setPending({ spec, active, onStarted: options?.onStarted });
      return;
    }
    await start(spec, options?.onStarted);
  };

  const resume = () => {
    if (!pending) return;
    load(pending.active.paper, pending.active.progress);
    navigate(`/examen/${pending.active.paper.attempt_id}`);
    setPending(null);
  };

  const answered = pending?.active.progress.answers.filter((a) => a.choice !== null).length ?? 0;
  const dialog = (
    <Dialog
      open={pending !== null}
      onClose={() => setPending(null)}
      icon={<History />}
      iconTone="warning"
      title="Tienes un examen sin terminar"
      description={
        pending
          ? `«${pending.active.paper.title}» lleva ${answered} ${answered === 1 ? "respuesta" : "respuestas"}. Si empiezas otro, el que tenías se abandonará y no contará en tus estadísticas.`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" onClick={() => setPending(null)}>
            Cancelar
          </Button>
          <Button onClick={resume} leftIcon={<History className="size-4" />}>
            Continuar el que tenía
          </Button>
          <Button variant="primary" loading={busy} leftIcon={<CirclePlay className="size-4" />} onClick={() => pending && void start(pending.spec, pending.onStarted)}>
            Empezar el nuevo
          </Button>
        </>
      }
    />
  );

  return { launch, busy, dialog };
}
