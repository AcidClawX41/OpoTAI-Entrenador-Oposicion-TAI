// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Antes de empezar un examen completo: su estructura en dos partes y el modo (aprendizaje o examen real). */
import type { ReactNode } from "react";
import { CirclePlay, ClipboardList } from "lucide-react";
import type { ExamRunMode } from "@/lib/examMode";
import type { ExamStructureInfo } from "@/lib/exam/structure";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ExamModeChooser } from "./ExamModeChooser";
import { ExamStructure } from "./ExamStructure";

interface ExamLaunchDialogProps {
  open: boolean;
  onClose: () => void;
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  structure: ExamStructureInfo | null;
  mode: ExamRunMode;
  onModeChange: (mode: ExamRunMode) => void;
  durationMinutes: number | null;
  timerLabel?: string;
  busy: boolean;
  onStart: () => void;
  /** Opciones propias del examen (p. ej. bloque de la 1.ª parte). */
  extra?: ReactNode;
  startLabel?: string;
}

export function ExamLaunchDialog({
  open,
  onClose,
  eyebrow,
  title,
  description,
  structure,
  mode,
  onModeChange,
  durationMinutes,
  timerLabel,
  busy,
  onStart,
  extra,
  startLabel = "Empezar examen",
}: ExamLaunchDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      icon={<ClipboardList />}
      eyebrow={eyebrow}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} leftIcon={<CirclePlay className="size-4" />} onClick={onStart} data-autofocus="">
            {startLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {structure ? <ExamStructure info={structure} compact /> : null}
        {extra}
        <ExamModeChooser value={mode} onChange={onModeChange} durationMinutes={durationMinutes} timerLabel={timerLabel} heading="¿Cómo quieres hacerlo?" />
      </div>
    </Dialog>
  );
}
