// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookMarked, CirclePlay, Clock, ExternalLink, FileQuestion, Hourglass, Landmark, Lightbulb, ListTree } from "lucide-react";
import { api } from "@/api/client";
import { formatDate, formatInt } from "@/lib/format";
import { topicTitle } from "@/lib/labels";
import { openExternal } from "@/lib/platform";
import { practiceSpec } from "@/lib/specs";
import { useApi } from "@/hooks/useApi";
import { useExamLauncher } from "@/hooks/useExamLauncher";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState, ErrorState } from "@/components/ui/display";
import { Markdown, slugify } from "@/components/ui/Markdown";
import { Skeleton } from "@/components/ui/misc";

/** Títulos de nivel 2 del Markdown para el índice lateral. */
function outline(md: string): { id: string; text: string }[] {
  const out: { id: string; text: string }[] = [];
  let fenced = false;
  for (const line of md.split("\n")) {
    if (line.startsWith("```")) fenced = !fenced;
    const m = !fenced ? /^##\s+(.+?)\s*#*$/.exec(line) : null;
    if (m?.[1]) {
      const text = m[1].replace(/[*_`]/g, "");
      out.push({ id: slugify(text), text });
    }
  }
  return out;
}

export default function TheoryTopicPage() {
  const { topicId = "" } = useParams();
  const catalog = useSession((s) => s.catalog);
  const settings = useSession((s) => s.settings);
  const navigate = useNavigate();
  const { launch, busy, dialog } = useExamLauncher();
  const topic = useApi(() => api.getTheory(topicId), [topicId]);
  const t = topic.data;
  const title = t?.title ?? topicTitle(catalog?.temario, topicId) ?? `Tema ${topicId}`;
  const toc = useMemo(() => (t ? outline(t.content) : []), [t]);
  const officialIds = (catalog?.banks ?? []).filter((b) => b.kind === "official").map((b) => b.id);
  const practice = () => void launch(practiceSpec({ topics: [topicId], count: 15, feedback: settings?.default_feedback ?? "immediate" }));

  const back = (
    <Link to="/teoria" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-fg-muted hover:text-fg">
      <ArrowLeft className="size-4" aria-hidden /> Teoría
    </Link>
  );

  if (topic.error && !t) {
    const missing = topic.error.code === "not_found";
    return (
      <div>
        {back}
        <h1 className="text-[26px] font-semibold leading-tight tracking-tight text-fg text-balance">{title}</h1>
        <Card className="mt-6">
          {missing ? (
            <EmptyState
              icon={<Hourglass />}
              title="La teoría se está preparando"
              description="Este tema todavía no tiene resumen. Puedes practicarlo ya con las preguntas del banco."
              action={
                <Button variant="primary" loading={busy} leftIcon={<CirclePlay className="size-4" />} onClick={practice}>
                  Practicar este tema
                </Button>
              }
            />
          ) : (
            <ErrorState message={topic.error.message} onRetry={topic.reload} />
          )}
        </Card>
        {dialog}
      </div>
    );
  }

  return (
    <div className="@container">
      {back}
      {!t ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-96" />
        </div>
      ) : (
        <>
          <header className="mb-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">Tema {t.topic}</Badge>
              <Badge tone="neutral">Bloque {t.block}</Badge>
              <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                <Clock className="size-3.5" aria-hidden /> {formatInt(t.reading_minutes)} min de lectura
              </span>
              <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                <FileQuestion className="size-3.5" aria-hidden /> {formatInt(t.question_count)} preguntas en el banco
              </span>
              {t.updated ? <span className="text-xs text-fg-subtle">· actualizado el {formatDate(t.updated)}</span> : null}
            </div>
            <h1 className="mt-3 max-w-4xl text-[26px] font-semibold leading-tight tracking-tight text-fg text-balance">{t.title}</h1>
            <p className="mt-2 max-w-3xl text-[15px] leading-6 text-fg-muted">{t.summary}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="primary" loading={busy} leftIcon={<CirclePlay className="size-4" />} onClick={practice}>
                Practicar este tema
              </Button>
              {officialIds.length > 0 ? (
                <ButtonLink to={`/temas?temas=${encodeURIComponent(t.topic)}&bancos=oficiales`} leftIcon={<Landmark className="size-4" />}>
                  Ver preguntas oficiales
                </ButtonLink>
              ) : null}
            </div>
          </header>

          <div className="grid items-start gap-6 @5xl:grid-cols-[minmax(0,1fr)_19rem]">
            <article className="min-w-0 rounded-2xl border border-border bg-surface p-6 shadow-card @3xl:p-8">
              <Markdown headingIds className="max-w-none text-[15.5px] leading-7 text-fg [&_h2]:mt-8 [&_h2]:scroll-mt-6 [&_h2]:text-[1.25em]">
                {t.content}
              </Markdown>
            </article>
            <aside className="space-y-4 @5xl:sticky @5xl:top-6">
              {t.key_points.length > 0 ? (
                <Card className="border-warning/30 bg-warning-soft/50 p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <Lightbulb className="size-4 text-warning-text" aria-hidden /> Ideas clave
                  </h2>
                  <ul className="mt-3 space-y-2 text-[13.5px] leading-5 text-fg">
                    {t.key_points.map((k) => (
                      <li key={k} className="flex gap-2">
                        <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warning" aria-hidden />
                        <Markdown inline className="text-[13.5px] leading-5">
                          {k}
                        </Markdown>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {toc.length > 1 ? (
                <Card className="p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <ListTree className="size-4 text-fg-subtle" aria-hidden /> En este tema
                  </h2>
                  <ul className="mt-3 space-y-1.5 text-[13px]">
                    {toc.map((h) => (
                      <li key={h.id}>
                        <button
                          type="button"
                          onClick={() => document.getElementById(h.id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                          className="text-left text-fg-muted hover:text-accent-text"
                        >
                          {h.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {t.sources.length > 0 ? (
                <Card className="p-5">
                  <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
                    <BookMarked className="size-4 text-fg-subtle" aria-hidden /> Fuentes
                  </h2>
                  <ul className="mt-3 space-y-2 text-[13px]">
                    {t.sources.map((s) => (
                      <li key={s.url}>
                        <button type="button" onClick={() => void openExternal(s.url)} className="flex items-start gap-1.5 text-left text-fg-muted hover:text-accent-text">
                          <ExternalLink className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {s.title}
                        </button>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="size-3.5" />} onClick={() => navigate("/teoria")}>
                Volver al índice
              </Button>
            </aside>
          </div>
        </>
      )}
      {dialog}
    </div>
  );
}
