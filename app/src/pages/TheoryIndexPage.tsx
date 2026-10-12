// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Clock, FileQuestion, Hourglass, Search } from "lucide-react";
import { api } from "@/api/client";
import type { TheorySummary } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { shortTitle } from "@/lib/labels";
import { normalizeSearch } from "@/lib/text";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/store/session";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TextInput } from "@/components/ui/controls";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui/display";
import { Skeleton } from "@/components/ui/misc";

const BLOCK_TONE = { I: "info", II: "success", III: "accent", IV: "warning" } as const;

export default function TheoryIndexPage() {
  const catalog = useSession((s) => s.catalog);
  const index = useApi(() => api.getTheoryIndex(), []);
  const [query, setQuery] = useState("");
  const byTopic = useMemo(() => new Map((index.data ?? []).map((t) => [t.topic, t])), [index.data]);
  const temario = catalog?.temario ?? null;
  const q = normalizeSearch(query);

  if (index.error && !index.data) {
    return (
      <>
        <PageHeader title="Teoría" />
        <ErrorState message={index.error.message} onRetry={index.reload} />
      </>
    );
  }

  const available = index.data?.length ?? 0;
  return (
    <div className="@container">
      <PageHeader
        title="Teoría"
        description="Resúmenes del temario oficial con las ideas clave de cada tema, enlazados con sus preguntas."
        actions={
          <div className="relative w-72 max-w-full">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <TextInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar en el temario…" aria-label="Buscar temas" className="pl-9" />
          </div>
        }
      />
      {!index.data ? (
        <div className="grid gap-4 @3xl:grid-cols-2 @6xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : available === 0 || !temario ? (
        <Card>
          <EmptyState
            icon={<Hourglass />}
            title="La teoría se está preparando"
            description="Los resúmenes de cada tema llegarán en próximas versiones. Mientras tanto, practica por temas con las preguntas oficiales."
          />
        </Card>
      ) : (
        <div className="space-y-8">
          <p className="text-xs text-fg-muted">
            {formatInt(available)} de {formatInt(temario.blocks.reduce((n, b) => n + b.topics.length, 0))} temas con teoría
          </p>
          {temario.blocks.map((b) => {
            const topics = b.topics.filter((t) => !q || normalizeSearch(`${t.id} ${t.title} ${byTopic.get(t.id)?.summary ?? ""}`).includes(q));
            if (topics.length === 0) return null;
            return (
              <section key={b.id} aria-labelledby={`bloque-${b.id}`}>
                <h2 id={`bloque-${b.id}`} className="mb-3 flex items-center gap-2.5 text-[15px] font-semibold text-fg">
                  <Badge tone={BLOCK_TONE[b.id]}>Bloque {b.id}</Badge>
                  {b.title}
                </h2>
                <div className="grid gap-3 @3xl:grid-cols-2 @6xl:grid-cols-3">
                  {topics.map((t) => {
                    const th: TheorySummary | undefined = byTopic.get(t.id);
                    const body = (
                      <>
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold tabular-nums text-accent-text">Tema {t.id}</span>
                          {th ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-fg-subtle">
                              <Clock className="size-3" aria-hidden /> {formatInt(th.reading_minutes)} min
                            </span>
                          ) : (
                            <span className="text-[11px] text-fg-subtle">Próximamente</span>
                          )}
                        </div>
                        <h3 className="mt-1.5 line-clamp-2 text-[14.5px] font-semibold leading-5 text-fg" title={t.title}>
                          {shortTitle(t.title, 120)}
                        </h3>
                        {th ? <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-fg-muted">{th.summary}</p> : null}
                        {th ? (
                          <p className="mt-auto flex items-center gap-3 pt-3 text-[11.5px] text-fg-subtle">
                            <span className="inline-flex items-center gap-1">
                              <BookOpen className="size-3" aria-hidden /> {formatInt(th.key_points.length)} ideas clave
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <FileQuestion className="size-3" aria-hidden /> {formatInt(th.question_count)} preguntas
                            </span>
                          </p>
                        ) : null}
                      </>
                    );
                    return th ? (
                      <Link
                        key={t.id}
                        to={`/teoria/${encodeURIComponent(t.id)}`}
                        className="flex min-h-36 flex-col rounded-2xl border border-border bg-surface p-4 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-pop"
                      >
                        {body}
                      </Link>
                    ) : (
                      <div key={t.id} className={cn("flex min-h-36 flex-col rounded-2xl border border-dashed border-border-strong bg-surface-2/30 p-4 opacity-75")}>
                        {body}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
