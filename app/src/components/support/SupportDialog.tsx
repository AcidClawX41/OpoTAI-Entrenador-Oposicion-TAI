// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Diálogo «Invítame a un café o haz una donación» (contenido en `content/support.ts`).
 * Primero, los tres botones de donación grandes y con los colores de cada marca; después, el
 * texto en secciones plegables y la tarjeta del autor. Los enlaces se abren en el navegador.
 */
import type { CSSProperties, MouseEvent } from "react";
import { ArrowUpRight, Check, Github, Info } from "./icons";
import {
  AUTHOR_PROFILE,
  DONATION_PLATFORMS,
  SUPPORT_AUTHOR,
  SUPPORT_EYEBROW,
  SUPPORT_LEAD,
  SUPPORT_OTHER_WAYS,
  SUPPORT_REPO_URL,
  SUPPORT_SECTIONS,
  SUPPORT_THANKS,
  SUPPORT_TITLE,
  type DonationPlatform,
  type SupportSection,
} from "@/content/support";
import { cn } from "@/lib/cn";
import { openExternal } from "@/lib/platform";
import { playSfx } from "@/lib/sfx";
import { useUi } from "@/store/ui";
import { Dialog } from "@/components/ui/Dialog";
import { Collapsible } from "@/components/ui/overlays";

function openLink(url: string) {
  return (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    playSfx("nav");
    void openExternal(url);
  };
}

/** Monograma «in» propio (no es el logotipo oficial de LinkedIn). */
function InMonogram({ color, className = "size-11" }: { color: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("shrink-0", className)} aria-hidden>
      <rect width="24" height="24" rx="5.5" fill={color} />
      <circle cx="7.3" cy="6.9" r="1.7" fill="#ffffff" />
      <path d="M7.3 10.3v7.3M11.7 17.6v-7.3M11.7 13.5c0-2 1.25-3.35 3.05-3.35 1.95 0 2.95 1.25 2.95 3.45v4" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Enlace al perfil de LinkedIn del autor, para poner justo debajo de su nombre. */
export function AuthorLinkedIn({ className }: { className?: string }) {
  const a = AUTHOR_PROFILE;
  return (
    <a
      href={a.linkedin.url}
      target="_blank"
      rel="noreferrer noopener"
      data-platform="linkedin"
      aria-label={`Perfil de LinkedIn de ${a.name} (se abre en el navegador)`}
      onClick={openLink(a.linkedin.url)}
      className={cn("linkedin-link", className)}
      style={{ "--brand": a.linkedin.brandColor } as CSSProperties}
    >
      <InMonogram color={a.linkedin.brandColor} className="size-4.5" />
      <span className="truncate">{a.linkedin.display}</span>
      <ArrowUpRight className="size-3.5 shrink-0 opacity-70" aria-hidden />
    </a>
  );
}

function AuthorCard() {
  const a = AUTHOR_PROFILE;
  return (
    <section aria-labelledby="sobre-el-autor" className="mt-7 rounded-2xl border border-border bg-surface-2/50 p-6">
      <div className="flex items-center gap-4">
        <span
          className="grid size-14 shrink-0 place-items-center rounded-full text-lg font-bold text-white shadow-glow brand-gradient"
          aria-hidden
        >
          {a.initials}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent-text">{a.eyebrow}</p>
          <h3 id="sobre-el-autor" className="mt-0.5 text-[17px] font-semibold tracking-tight text-fg">
            {a.name}
          </h3>
          <AuthorLinkedIn className="mt-0.5" />
          <p className="mt-1 text-[13px] leading-5 text-fg-muted">{a.headline}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {a.bio.map((p) => (
          <p key={p.slice(0, 32)} className="text-sm leading-6 text-fg-muted">
            {p}
          </p>
        ))}
      </div>

      <h4 className="mt-5 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Aptitudes</h4>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Aptitudes">
        {a.skills.map((s) => (
          <li key={s} className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-medium text-fg-muted">
            {s}
          </li>
        ))}
      </ul>
      <h4 className="mt-4 text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Competencias personales</h4>
      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Competencias personales">
        {a.softSkills.map((s) => (
          <li key={s} className="rounded-full border border-accent/25 bg-accent-soft px-2.5 py-1 text-xs font-medium text-accent-text">
            {s}
          </li>
        ))}
      </ul>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Formación</h4>
          <ol className="relative mt-3 space-y-3 border-l border-border pl-4">
            {a.education.map((e) => (
              <li key={e.title} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-info" aria-hidden />
                <p className="text-[13px] font-semibold leading-5 text-fg">{e.title}</p>
                <p className="text-[12.5px] leading-5 text-fg-muted">
                  {e.school} <span className="tabular-nums text-fg-subtle">· {e.period}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">Licencias y certificaciones</h4>
          <ol className="relative mt-3 space-y-3 border-l border-border pl-4">
            {a.certifications.map((c) => (
              <li key={c.name} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full border-2 border-surface bg-success" aria-hidden />
                <p className="text-[13px] font-semibold leading-5 text-fg">{c.name}</p>
                <p className="text-[12.5px] leading-5 text-fg-muted">
                  {c.issuer} <span className="tabular-nums text-fg-subtle">· {c.year}</span>
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <a
        href={a.linkedin.url}
        target="_blank"
        rel="noreferrer noopener"
        data-platform="linkedin"
        onClick={openLink(a.linkedin.url)}
        className="donate-card group mt-6 items-center sm:max-w-md"
        style={{ "--brand": a.linkedin.brandColor } as CSSProperties}
      >
        <InMonogram color={a.linkedin.brandColor} />
        <span className="min-w-0">
          <span className="block text-[15px] font-semibold tracking-tight text-fg">{a.linkedin.label}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-muted">{a.linkedin.display}</span>
        </span>
        <ArrowUpRight className="donate-card__arrow" aria-hidden />
        <span className="sr-only">(se abre en el navegador)</span>
      </a>
    </section>
  );
}

/** Botón grande de donación con el color y el logotipo de la plataforma. */
function DonationButton({ platform }: { platform: DonationPlatform }) {
  const [from, to] = platform.buttonColors;
  return (
    <a
      href={platform.url}
      target="_blank"
      rel="noreferrer noopener"
      data-platform={platform.id}
      aria-label={`${platform.cta}: ${platform.display} (se abre en el navegador)`}
      onClick={openLink(platform.url)}
      className="donate-btn group"
      style={{ "--from": from, "--to": to, "--brand": platform.brandColor } as CSSProperties}
    >
      <span className="flex items-center gap-2.5 pr-6">
        <span className="donate-btn__logo" aria-hidden>
          <svg viewBox="0 0 24 24" className="size-5.5">
            <path d={platform.iconPath} />
          </svg>
        </span>
        <span className="min-w-0 truncate text-[12px] font-semibold uppercase tracking-[0.1em] text-white">{platform.name}</span>
      </span>
      <span className="mt-3 block text-[18px] font-bold leading-6 tracking-tight text-white">{platform.cta}</span>
      <span className="mt-0.5 block text-[12.5px] font-medium text-white [overflow-wrap:anywhere]">{platform.display}</span>
      <ArrowUpRight className="donate-btn__arrow" aria-hidden />
    </a>
  );
}

function SectionBody({ section }: { section: SupportSection }) {
  return (
    <>
      {section.paragraphs?.map((p) => (
        <p key={p.slice(0, 32)} className="mt-1 text-sm leading-6 text-fg-muted first:mt-0">
          {p}
        </p>
      ))}
      {section.bullets ? (
        <ul className="space-y-2">
          {section.bullets.map((b) => (
            <li key={b.slice(0, 32)} className="flex gap-2.5 text-sm leading-6 text-fg-muted">
              <span className="mt-1 grid size-4 shrink-0 place-items-center rounded-full bg-accent-soft text-accent-text">
                <Check className="size-2.5" strokeWidth={3} aria-hidden />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {section.note ? (
        <p className="mt-3 flex gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-[12.5px] leading-5 text-fg-subtle">
          <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span>{section.note}</span>
        </p>
      ) : null}
    </>
  );
}

export function SupportDialog() {
  const open = useUi((s) => s.supportOpen);
  const setOpen = useUi((s) => s.setSupportOpen);
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      size="xl"
      eyebrow={SUPPORT_EYEBROW}
      title={<span className="text-[22px] leading-8">{SUPPORT_TITLE}</span>}
      description={<span className="block max-w-3xl text-[14.5px] leading-6">{SUPPORT_LEAD}</span>}
      footer={
        <div className="flex w-full flex-wrap items-end justify-between gap-x-6 gap-y-3">
          <div className="min-w-0">
            <p className="text-sm text-fg-muted">{SUPPORT_THANKS}</p>
            <p className="mt-0.5 text-sm font-semibold text-fg">— {SUPPORT_AUTHOR}</p>
            <AuthorLinkedIn className="mt-0.5" />
          </div>
          <a
            href={SUPPORT_REPO_URL}
            onClick={openLink(SUPPORT_REPO_URL)}
            className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-accent-text hover:underline"
          >
            <Github className="size-4" aria-hidden />
            Ver el proyecto en GitHub
          </a>
        </div>
      }
    >
      <section aria-label="Plataformas de donación" className="donate-panel">
        <div className="grid gap-3 md:grid-cols-3">
          {DONATION_PLATFORMS.map((p) => (
            <DonationButton key={p.id} platform={p} />
          ))}
        </div>
        <p className="mt-3 px-1 text-[13px] leading-5 text-fg-muted">{SUPPORT_OTHER_WAYS}</p>
      </section>

      <div className="mt-6 grid items-start gap-2.5 lg:grid-cols-2">
        {SUPPORT_SECTIONS.map((section) => (
          <Collapsible key={section.title} title={section.title}>
            <SectionBody section={section} />
          </Collapsible>
        ))}
      </div>

      <AuthorCard />
    </Dialog>
  );
}
