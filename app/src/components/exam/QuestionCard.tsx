// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { Flag, Eye } from "lucide-react";
import type { AnswerFeedback, Letter, PaperQuestion, Temario } from "@/api/types";
import { cn } from "@/lib/cn";
import { shortTitle, topicTitle } from "@/lib/labels";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/misc";
import { Markdown } from "@/components/ui/Markdown";
import { ZoomableImage } from "@/components/ui/ImageLightbox";
import { Tooltip } from "@/components/ui/overlays";
import { Explanation } from "./Explanation";
import { OptionList } from "./OptionList";

interface QuestionCardProps {
  question: PaperQuestion;
  position: { index: number; total: number };
  choice: Letter | null;
  flagged: boolean;
  onSelect: (letter: Letter) => void;
  onToggleFlag: () => void;
  feedbackMode: "immediate" | "end";
  feedback: AnswerFeedback | null;
  locked: boolean;
  pending: Letter | null;
  onReveal?: () => void;
  temario: Temario | null;
  shortcuts: boolean;
}

export function QuestionCard({
  question,
  position,
  choice,
  flagged,
  onSelect,
  onToggleFlag,
  feedbackMode,
  feedback,
  locked,
  pending,
  onReveal,
  temario,
  shortcuts,
}: QuestionCardProps) {
  const fullTopic = topicTitle(temario, question.topic);
  const media = question.media.filter((m) => m.data_url && !question.text.includes(m.data_url));
  return (
    <article aria-labelledby={`q-${question.id}`} className="rounded-2xl border border-border bg-surface shadow-card">
      <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`q-${question.id}`} className="text-[15px] font-semibold text-fg">
              {question.is_reserve ? `Reserva ${question.display_number}` : `Pregunta ${question.display_number}`}
              <span className="font-normal text-fg-subtle"> · {position.index + 1} de {position.total}</span>
            </h2>
            {question.block ? <Badge tone={question.block === "I" ? "info" : question.block === "II" ? "success" : question.block === "III" ? "accent" : "warning"}>Bloque {question.block}</Badge> : null}
            {question.topic ? (
              <Tooltip content={fullTopic ?? question.topic} className="max-w-[340px] min-w-0">
                <Badge tone="neutral" className="max-w-full">
                  {question.topic}
                  {fullTopic ? ` · ${shortTitle(fullTopic, 44)}` : ""}
                </Badge>
              </Tooltip>
            ) : null}
            {question.is_reserve ? <Badge tone="warning">Reserva</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-fg-subtle">{question.source_label}</p>
        </div>
        <button
          type="button"
          onClick={onToggleFlag}
          aria-pressed={flagged}
          className={cn(
            "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-medium transition-colors",
            flagged ? "border-warning/50 bg-warning-soft text-warning-text" : "border-border text-fg-muted hover:border-border-strong hover:text-fg",
          )}
        >
          <Flag className={cn("size-3.5", flagged && "fill-current")} aria-hidden />
          {flagged ? "Dudosa" : (
            <>
              <span className="hidden xl:inline">Marcar como dudosa</span>
              <span className="xl:hidden">Dudosa</span>
            </>
          )}
          {shortcuts ? <Kbd className="ml-0.5">F</Kbd> : null}
        </button>
      </header>

      <div className="px-6 py-5">
        <Markdown className="text-[17px] leading-[1.7] text-fg [&_strong]:text-fg">{question.text}</Markdown>
        {media.map((m) => (m.data_url ? <ZoomableImage key={m.path} src={m.data_url} alt={m.alt} className="mt-2" /> : null))}
        <div className="mt-5">
          <OptionList
            questionId={question.id}
            options={question.options}
            choice={choice}
            onSelect={onSelect}
            feedback={feedback}
            locked={locked}
            pending={pending}
          />
        </div>
        {feedbackMode === "immediate" && !feedback && !locked && onReveal ? (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" leftIcon={<Eye className="size-3.5" />} onClick={onReveal}>
              No lo sé · ver la solución
            </Button>
          </div>
        ) : null}
        {feedback ? (
          <Explanation
            className="mt-5 animate-fade-in"
            showVerdict
            chosen={feedback.chosen}
            correct={feedback.correct}
            annulled={feedback.annulled}
            explanation={feedback.explanation}
            optionNotes={feedback.option_notes}
            references={feedback.references}
          />
        ) : locked && feedbackMode === "immediate" ? (
          <p className="mt-4 rounded-xl border border-border bg-surface-2/70 px-4 py-3 text-sm text-fg-muted">Respuesta registrada.</p>
        ) : null}
      </div>
    </article>
  );
}
