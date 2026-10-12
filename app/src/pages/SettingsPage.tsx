// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { NavLink, useNavigate, useParams } from "react-router-dom";
import {
  Check,
  CloudOff,
  Database,
  ExternalLink,
  HardDrive,
  ImageIcon,
  Info,
  MapPin,
  Monitor,
  Moon,
  Palette,
  Search,
  ShieldCheck,
  Sun,
  Target,
  Timer,
  Trash2,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { api } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { LocalityInfo, Profile, Settings } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatDate, formatInt, formatPercent, formatShare } from "@/lib/format";
import { openExternal } from "@/lib/platform";
import { playSfx } from "@/lib/sfx";
import { normalizeSearch } from "@/lib/text";
import { useApi } from "@/hooks/useApi";
import { useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Field, Segmented, Select, Slider, Switch, TextInput } from "@/components/ui/controls";
import { Dialog } from "@/components/ui/Dialog";
import { PageHeader } from "@/components/ui/display";
import { Kbd } from "@/components/ui/misc";
import { ExamModeChooser } from "@/components/exam/ExamModeChooser";
import { ProfileForm, type ProfileDraft } from "@/components/profile/ProfileForm";
import { RUN_MODE_FEEDBACK, runModeFromSettings } from "@/lib/examMode";
import { AboutSection } from "@/components/settings/AboutSection";

const SECTIONS = [
  { id: "apariencia", label: "Apariencia", icon: <Palette /> },
  { id: "examen", label: "Examen y sonido", icon: <Timer /> },
  { id: "objetivo", label: "Objetivo", icon: <Target /> },
  { id: "perfil", label: "Perfil", icon: <UserRound /> },
  { id: "privacidad", label: "Privacidad y datos", icon: <ShieldCheck /> },
  { id: "datos", label: "Contenido y fuentes", icon: <Database /> },
  { id: "acerca-de", label: "Acerca de", icon: <Info /> },
] as const;
type SectionId = (typeof SECTIONS)[number]["id"];

const ACCENTS = [
  { value: "#7c3aed", label: "Violeta" },
  { value: "#4f46e5", label: "Índigo" },
  { value: "#2563eb", label: "Azul" },
  { value: "#0d9488", label: "Verde azulado" },
  { value: "#db2777", label: "Rosa" },
  { value: "#ea580c", label: "Naranja" },
];

const SHORTCUTS: [string[], string][] = [
  [["1", "4"], "Responder A–D (también A–D)"],
  [["0"], "Dejar en blanco"],
  [["←", "→"], "Pregunta anterior / siguiente"],
  [["F"], "Marcar como dudosa"],
  [["Ctrl", "↵"], "Entregar"],
];

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader title={title} description={description} />
      <div className="space-y-5 p-5">{children}</div>
    </Card>
  );
}

function Appearance({ settings, save }: { settings: Settings; save: (p: Partial<Settings>) => void }) {
  return (
    <Section title="Apariencia" description="Tema y color de acento de este perfil">
      <Field label="Tema">
        <Segmented
          label="Tema"
          value={settings.theme}
          onChange={(theme) => save({ theme })}
          options={[
            { value: "system", label: "Sistema", icon: <Monitor /> },
            { value: "light", label: "Claro", icon: <Sun /> },
            { value: "dark", label: "Oscuro", icon: <Moon /> },
          ]}
        />
      </Field>
      <Field label="Color de acento">
        <div className="flex flex-wrap items-center gap-2.5" role="radiogroup" aria-label="Color de acento">
          {ACCENTS.map((a) => {
            const active = settings.accent.toLowerCase() === a.value;
            return (
              <button
                key={a.value}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={a.label}
                title={a.label}
                onClick={() => save({ accent: a.value })}
                className={cn("grid size-9 place-items-center rounded-full ring-offset-2 ring-offset-surface transition-transform hover:scale-110", active && "ring-2 ring-fg")}
                style={{ background: a.value }}
              >
                {active ? <Check className="size-4 text-white" strokeWidth={3} /> : null}
              </button>
            );
          })}
          <label className="ml-1 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-2.5 py-1.5 text-[13px] text-fg-muted hover:border-border-strong">
            <input type="color" value={settings.accent} onChange={(e) => save({ accent: e.target.value })} className="size-5 cursor-pointer rounded border-0 bg-transparent p-0" />
            Personalizado
          </label>
        </div>
      </Field>
    </Section>
  );
}

function ExamAndSound({ settings, save }: { settings: Settings; save: (p: Partial<Settings>) => void }) {
  return (
    <>
      <Section title="Examen" description="Cómo se comportan los simulacros y los tests">
        <ExamModeChooser
          value={runModeFromSettings(settings)}
          onChange={(mode) => save({ exam_feedback: RUN_MODE_FEEDBACK[mode] })}
          durationMinutes={null}
          heading="Modo de los simulacros y exámenes oficiales (se recuerda la última elección)"
        />
        <Field label="Corrección en los tests de práctica">
          <Segmented
            label="Corrección en los tests de práctica"
            fullWidth
            value={settings.default_feedback}
            onChange={(default_feedback) => save({ default_feedback })}
            options={[
              { value: "immediate", label: "Inmediata (modo estudio)" },
              { value: "end", label: "Al final" },
            ]}
          />
        </Field>
        <Switch
          checked={settings.random_exam_on_startup}
          onChange={(random_exam_on_startup) => save({ random_exam_on_startup })}
          label="Simulacro sorpresa al abrir la app"
          description="OpoTAI sortea un examen oficial o un simulacro numerado; no se puede elegir"
        />
        <Switch
          checked={settings.show_timer}
          onChange={(show_timer) => save({ show_timer })}
          label="Mostrar el cronómetro"
          description="En el modo examen real avisa a 10 minutos y a 1 minuto del final, y entrega solo al llegar a cero"
        />
        <Switch
          checked={settings.confirm_before_submit}
          onChange={(confirm_before_submit) => save({ confirm_before_submit })}
          label="Confirmar antes de entregar"
          description="Resumen de respondidas, en blanco y dudosas antes de entregar"
        />
        <Switch checked={settings.keyboard_shortcuts} onChange={(keyboard_shortcuts) => save({ keyboard_shortcuts })} label="Atajos de teclado" />
        {settings.keyboard_shortcuts ? (
          <ul className="grid gap-2 rounded-xl border border-border bg-surface-2/50 p-4 text-[13px] text-fg-muted sm:grid-cols-2">
            {SHORTCUTS.map(([keys, text]) => (
              <li key={text} className="flex items-center gap-2">
                <span className="flex items-center gap-1">
                  {keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
                {text}
              </li>
            ))}
          </ul>
        ) : null}
      </Section>
      <Section title="Sonido" description="Efectos breves al acertar, fallar y navegar. Nunca suena al dejar una pregunta en blanco.">
        <Switch checked={settings.sound_enabled} onChange={(sound_enabled) => save({ sound_enabled })} label="Efectos de sonido" />
        <div className="flex items-center gap-4">
          <Volume2 className="size-4 shrink-0 text-fg-subtle" aria-hidden />
          <Slider
            label="Volumen"
            min={0}
            max={1}
            step={0.05}
            value={settings.sound_volume}
            onChange={(sound_volume) => save({ sound_volume })}
            valueText={formatPercent(settings.sound_volume)}
            disabled={!settings.sound_enabled}
          />
          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-fg">{formatPercent(settings.sound_volume)}</span>
          <Button size="sm" disabled={!settings.sound_enabled} onClick={() => playSfx("correct", { ignoreEnabled: true })}>
            Probar
          </Button>
        </div>
      </Section>
    </>
  );
}

function Goal({ settings, save }: { settings: Settings; save: (p: Partial<Settings>) => void }) {
  const catalog = useSession((s) => s.catalog);
  const localities = useApi(() => api.listLocalities(), []);
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const q = normalizeSearch(query);
    if (q.length < 2) return [];
    return (localities.data ?? [])
      .filter((l: LocalityInfo) => normalizeSearch(`${l.name} ${l.province}`).includes(q))
      .sort((a, b) => (b.share_of_plazas ?? 0) - (a.share_of_plazas ?? 0))
      .slice(0, 8);
  }, [query, localities.data]);
  const preferred = settings.preferred_localities;
  const custom = settings.cutoff_override_ratio !== null;
  return (
    <Section title="Objetivo" description="Datos que usa la estimación de tus posibilidades">
      <Field label="Convocatoria objetivo" htmlFor="conv">
        <Select id="conv" value={settings.target_convocatoria ?? ""} onChange={(e) => save({ target_convocatoria: e.target.value || null })}>
          <option value="">Automática ({catalog?.convocatorias.find((c) => c.id === catalog.target_convocatoria)?.title ?? "la más reciente"})</option>
          {(catalog?.convocatorias ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
              {c.plazas_total ? ` · ${formatInt(c.plazas_total)} plazas` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Fecha prevista del examen" htmlFor="fecha" hint="Para la cuenta atrás del inicio">
        <TextInput id="fecha" type="date" value={settings.exam_date ?? ""} onChange={(e) => save({ exam_date: e.target.value || null })} className="max-w-56" />
      </Field>
      <div>
        <Switch
          checked={custom}
          onChange={(on) => save({ cutoff_override_ratio: on ? 0.5 : null })}
          label="Nota de corte personalizada"
          description={custom ? `${formatPercent(settings.cutoff_override_ratio ?? 0.5)} de la puntuación directa máxima` : "Automática: oficial si se conoce o estimada"}
        />
        {custom ? (
          <Slider
            className="mt-3"
            label="Corte personalizado"
            // Mínimo reglamentario (30 % de la directa máxima): el núcleo nunca aplica menos.
            min={0.3}
            max={0.8}
            step={0.01}
            value={settings.cutoff_override_ratio ?? 0.5}
            onChange={(v) => save({ cutoff_override_ratio: v })}
            valueText={formatPercent(settings.cutoff_override_ratio ?? 0.5)}
          />
        ) : null}
      </div>
      <Field label="Localidades preferidas (hasta 3)">
        <div className="flex flex-wrap gap-1.5">
          {preferred.length === 0 ? <span className="text-[13px] text-fg-subtle">Ninguna todavía.</span> : null}
          {preferred.map((name) => (
            <span key={name} className="inline-flex h-7 items-center gap-1 rounded-full border border-accent/30 bg-accent-soft pl-2.5 pr-1 text-xs font-medium text-accent-text">
              <MapPin className="size-3" aria-hidden />
              {name}
              <button
                type="button"
                aria-label={`Quitar ${name}`}
                onClick={() => save({ preferred_localities: preferred.filter((p) => p !== name) })}
                className="grid size-5 place-items-center rounded-full hover:bg-accent/20"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
        {preferred.length < 3 ? (
          <div className="relative mt-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca un municipio: «Zaragoza», «Valencia»…" aria-label="Buscar localidad" className="pl-9" />
            {results.length > 0 ? (
              <ul className="mt-2 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                {results.map((l) => (
                  <li key={`${l.name}-${l.province}`}>
                    <button
                      type="button"
                      disabled={preferred.includes(l.name)}
                      onClick={() => {
                        save({ preferred_localities: [...preferred, l.name].slice(0, 3) });
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-surface-2 disabled:opacity-50"
                    >
                      <span>
                        <span className="font-medium text-fg">{l.name}</span> <span className="text-xs text-fg-subtle">{l.province}</span>
                      </span>
                      <span className="text-xs text-fg-muted">{l.share_of_plazas ? `${formatShare(l.share_of_plazas)} de las plazas` : ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </Field>
    </Section>
  );
}

/** Tras borrar el perfil activo, la sección se desmonta sin pintar nada antes de ir a Perfiles. */
function ProfileSection() {
  const profile = useSession((s) => s.profile);
  return profile ? <ProfileSectionFor profile={profile} /> : null;
}

function ProfileSectionFor({ profile }: { profile: Profile }) {
  const updateProfile = useSession((s) => s.updateProfile);
  const deleteProfile = useSession((s) => s.deleteProfile);
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProfileDraft>({ name: profile.name, color: profile.color, avatar: profile.avatar });
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setDraft({ name: profile.name, color: profile.color, avatar: profile.avatar }), [profile]);
  const dirty = draft.name !== profile.name || draft.color !== profile.color || draft.avatar !== profile.avatar;
  const saveProfile = async () => {
    if (!draft.name.trim()) return;
    setBusy(true);
    try {
      await updateProfile(profile.id, draft.name.trim(), draft.color, draft.avatar);
      toast.success("Perfil actualizado");
    } catch (e) {
      toast.error("No se ha podido guardar", errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title="Perfil" description={`Creado el ${formatDate(profile.created_at)}`}>
      <ProfileForm value={draft} onChange={setDraft} onSubmit={() => void saveProfile()} />
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <Button variant="ghost" className="text-danger-text hover:bg-danger-soft hover:text-danger-text" leftIcon={<Trash2 className="size-4" />} onClick={() => setConfirm(true)}>
          Eliminar perfil
        </Button>
        <Button variant="primary" disabled={!dirty || !draft.name.trim()} loading={busy} onClick={() => void saveProfile()}>
          Guardar cambios
        </Button>
      </div>
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        icon={<Trash2 />}
        iconTone="danger"
        title={`¿Eliminar el perfil «${profile.name}»?`}
        description="Se borrarán sus intentos, estadísticas y ajustes. No se puede deshacer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await deleteProfile(profile.id);
                  navigate("/perfiles", { replace: true });
                } catch (e) {
                  toast.error("No se ha podido eliminar", errorMessage(e));
                  setBusy(false);
                }
              }}
            >
              Eliminar
            </Button>
          </>
        }
      />
    </Section>
  );
}

const PRIVACY_POINTS: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <HardDrive />,
    title: "Todo se guarda solo en este equipo",
    text: "Tu alias, tus ajustes, tus intentos, respuestas y estadísticas se guardan en una base de datos local de este ordenador.",
  },
  {
    icon: <CloudOff />,
    title: "Sin cuentas, servidores, analítica ni telemetría",
    text: "No tienes que registrarte y OpoTAI no envía tus datos a ningún sitio: funciona sin conexión.",
  },
  {
    icon: <UserRound />,
    title: "Solo un nombre o alias",
    text: "Sirve para saludarte y distinguir perfiles. No escribas datos personales sensibles: salud, discapacidad, DNI, correo, teléfono…",
  },
  {
    icon: <ImageIcon />,
    title: "Tu imagen, si decides poner una",
    text: "Se guarda optimizada y sin metadatos (ubicación, cámara…) en la misma base de datos local.",
  },
  {
    icon: <ExternalLink />,
    title: "Enlaces externos",
    text: "Las donaciones (PayPal, Ko-fi, GitHub Sponsors), LinkedIn, GitHub y las fuentes oficiales se abren en tu navegador y se rigen por la política de privacidad de cada servicio.",
  },
];

function PrivacySection() {
  const profile = useSession((s) => s.profile);
  return profile ? <PrivacySectionFor profile={profile} /> : null;
}

function PrivacySectionFor({ profile }: { profile: Profile }) {
  const appInfo = useSession((s) => s.appInfo);
  const deleteProfile = useSession((s) => s.deleteProfile);
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <Section title="Privacidad y datos" description="OpoTAI no recoge datos personales: lo que guardas se queda en este equipo.">
        <ul className="space-y-4">
          {PRIVACY_POINTS.map((p) => (
            <li key={p.title} className="flex items-start gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-success-soft text-success-text [&_svg]:size-4" aria-hidden>
                {p.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-fg">{p.title}</span>
                <span className="mt-0.5 block text-[13px] leading-5 text-fg-muted">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>
        {appInfo ? (
          <div className="rounded-xl border border-border bg-surface-2/60 px-4 py-3">
            <p className="text-xs font-medium text-fg-muted">Ubicación de tus datos en este equipo</p>
            <p className="mt-1 break-all font-mono text-[12.5px] text-fg" data-testid="db-path">
              {appInfo.db_path}
            </p>
          </div>
        ) : null}
        <p className="text-xs leading-5 text-fg-subtle">
          Pensado para cumplir el RGPD desde el diseño: solo los datos imprescindibles, guardados en tu equipo y que puedes borrar por completo cuando
          quieras.
        </p>
      </Section>

      <Section title="Borrar tus datos" description="Derecho de supresión: elimina este perfil y todo lo que guarda.">
        <p className="text-sm leading-6 text-fg-muted">
          Se borrarán de este equipo el perfil «{profile.name}» y todos sus datos: intentos, respuestas, estadísticas, repasos, imagen y ajustes. Los
          demás perfiles no se tocan. No se puede deshacer.
        </p>
        <Button variant="danger" leftIcon={<Trash2 className="size-4" />} onClick={() => setConfirm(true)}>
          Borrar este perfil y todos sus datos
        </Button>
        <Dialog
          open={confirm}
          onClose={() => setConfirm(false)}
          icon={<Trash2 />}
          iconTone="danger"
          title={`¿Borrar «${profile.name}» y todos sus datos?`}
          description="Se eliminarán sus intentos, respuestas, estadísticas, repasos, imagen y ajustes de este equipo. No se puede deshacer."
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirm(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                loading={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await deleteProfile(profile.id);
                    toast.success("Perfil y datos borrados de este equipo");
                    navigate("/perfiles", { replace: true });
                  } catch (e) {
                    toast.error("No se ha podido borrar", errorMessage(e));
                    setBusy(false);
                  }
                }}
              >
                Borrar definitivamente
              </Button>
            </>
          }
        />
      </Section>
    </>
  );
}

function DataSection() {
  const appInfo = useSession((s) => s.appInfo);
  const catalog = useSession((s) => s.catalog);
  const sources = useMemo(() => {
    const map = new Map<string, string>();
    if (catalog?.temario) map.set(catalog.temario.source_url, catalog.temario.source_title);
    for (const c of catalog?.convocatorias ?? []) for (const s of c.sources) if (s.url) map.set(s.url, s.title);
    return [...map.entries()].slice(0, 30);
  }, [catalog]);
  const rows: [string, string][] = appInfo
    ? [
        ["Exámenes oficiales", formatInt(appInfo.official_exams)],
        ["Bancos de preguntas", formatInt(appInfo.banks)],
        ["Preguntas", formatInt(appInfo.questions)],
        ["Con explicación", formatInt(appInfo.questions_with_explanation)],
        ["Temas con teoría", formatInt(appInfo.theory_topics)],
        ["Datos actualizados", appInfo.data_updated ? formatDate(appInfo.data_updated) : "—"],
      ]
    : [];
  return (
    <>
      <Section title="Datos" description="Contenido incluido en esta versión">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {rows.map(([k, v]) => (
            <div key={k} className="rounded-xl border border-border bg-surface-2/60 px-3.5 py-3">
              <dt className="text-xs text-fg-muted">{k}</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
      <Section title="Fuentes oficiales" description="Cuestionarios, plantillas y resoluciones de las que salen los datos">
        <ul className="divide-y divide-border">
          {sources.map(([url, title]) => (
            <li key={url}>
              <button type="button" onClick={() => void openExternal(url)} className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-[13px] text-fg-muted hover:text-fg">
                <span className="min-w-0 truncate">{title}</span>
                <ExternalLink className="size-3.5 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}

export default function SettingsPage() {
  const { section: param } = useParams();
  const section: SectionId = SECTIONS.some((s) => s.id === param) ? (param as SectionId) : "apariencia";
  const settings = useSession((s) => s.settings);
  const appInfo = useSession((s) => s.appInfo);
  const saveSettings = useSession((s) => s.saveSettings);
  const save = (patch: Partial<Settings>) => void saveSettings(patch);

  return (
    <div className="@container">
      <PageHeader title="Ajustes" description="Se guardan por perfil y se aplican al momento." />
      <div className="grid items-start gap-6 @4xl:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Secciones de ajustes" className="flex gap-1 overflow-x-auto @4xl:sticky @4xl:top-6 @4xl:flex-col">
          {SECTIONS.map((s) => (
            <NavLink
              key={s.id}
              to={`/ajustes/${s.id}`}
              className={() =>
                cn(
                  "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors [&_svg]:size-4",
                  section === s.id ? "bg-surface-2 text-fg ring-1 ring-border" : "text-fg-muted hover:bg-surface-2/60 hover:text-fg",
                )
              }
            >
              {s.icon}
              {s.label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0 max-w-3xl space-y-5">
          {section === "acerca-de" ? (
            <AboutSection appInfo={appInfo} />
          ) : section === "perfil" ? (
            <ProfileSection />
          ) : section === "privacidad" ? (
            <PrivacySection />
          ) : section === "datos" ? (
            <DataSection />
          ) : !settings ? null : section === "examen" ? (
            <ExamAndSound settings={settings} save={save} />
          ) : section === "objetivo" ? (
            <Goal settings={settings} save={save} />
          ) : (
            <Appearance settings={settings} save={save} />
          )}
        </div>
      </div>
    </div>
  );
}
