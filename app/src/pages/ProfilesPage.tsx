// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { COPYRIGHT_LINE, LICENSE_SHORT } from "@/content/legal";
import { APP_VERSION } from "@/lib/version";
import { motion } from "motion/react";
import { ArrowRight, Landmark, Pencil, Plus, ShieldCheck, Sparkles, Target, Timer, Trash2, Users } from "lucide-react";
import { demo } from "@/api/client";
import { errorMessage } from "@/api/errors";
import type { Profile } from "@/api/types";
import { cn } from "@/lib/cn";
import { formatRelative } from "@/lib/format";
import { PROFILE_COLORS } from "@/lib/color";
import { playSfx } from "@/lib/sfx";
import { useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Logo } from "@/components/ui/display";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PROFILE_NAME_MAX, ProfileForm, type ProfileDraft } from "@/components/profile/ProfileForm";

const FEATURES = [
  { icon: <Landmark />, title: "Exámenes oficiales reales", text: "Convocatorias anteriores con su plantilla y reservas." },
  { icon: <Timer />, title: "Corrección como el tribunal", text: "−1/3 por error, blancos sin penalizar y nota 0–100." },
  { icon: <Target />, title: "Tu probabilidad de plaza", text: "Y de destino por tamaño de ciudad, con datos oficiales." },
];

function newDraft(index: number): ProfileDraft {
  return { name: "", color: PROFILE_COLORS[index % PROFILE_COLORS.length] ?? "#7c3aed", avatar: null };
}

export default function ProfilesPage() {
  const profiles = useSession((s) => s.profiles);
  const current = useSession((s) => s.profile);
  const selectProfile = useSession((s) => s.selectProfile);
  const createProfile = useSession((s) => s.createProfile);
  const updateProfile = useSession((s) => s.updateProfile);
  const deleteProfile = useSession((s) => s.deleteProfile);
  const refreshProfiles = useSession((s) => s.refreshProfiles);
  const backend = useSession((s) => s.backend);
  const version = useSession((s) => s.appInfo?.version ?? APP_VERSION);
  const navigate = useNavigate();

  const [managing, setManaging] = useState(false);
  const [editing, setEditing] = useState<{ id: string | null; draft: ProfileDraft } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<Profile | null>(null);
  const [seeding, setSeeding] = useState(false);
  const [welcome, setWelcome] = useState<ProfileDraft>(() => newDraft(0));

  const enter = async (id: string) => {
    try {
      const route = await selectProfile(id);
      playSfx("nav");
      navigate(route);
    } catch (e) {
      toast.error("No se ha podido abrir el perfil", errorMessage(e));
    }
  };

  const save = async (draft: ProfileDraft, id: string | null) => {
    if (!draft.name.trim()) {
      setFormError("Escribe tu nombre o un alias.");
      return;
    }
    if (draft.name.trim().length > PROFILE_NAME_MAX) {
      setFormError(`Usa como mucho ${PROFILE_NAME_MAX} caracteres.`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (id) {
        await updateProfile(id, draft.name.trim(), draft.color, draft.avatar);
        setEditing(null);
        toast.success("Perfil actualizado");
      } else {
        const created = await createProfile(draft.name.trim(), draft.color, draft.avatar);
        setEditing(null);
        await enter(created.id);
      }
    } catch (e) {
      setFormError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const seed = async () => {
    setSeeding(true);
    try {
      const id = await demo.seed();
      await refreshProfiles();
      await enter(id);
    } catch (e) {
      toast.error("No se han podido crear los datos de ejemplo", errorMessage(e));
    } finally {
      setSeeding(false);
    }
  };

  const first = profiles.length === 0;

  return (
    <div className="app-backdrop h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-5xl flex-col px-6 pb-36 pt-8">
        <header className="flex items-center justify-between">
          <Logo />
          {!first && current ? (
            <Button variant="ghost" size="sm" onClick={() => navigate("/inicio")}>
              Volver
            </Button>
          ) : null}
        </header>

        {first ? (
          <div className="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[1.1fr_1fr]">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1 text-xs font-medium text-fg-muted">
                <Sparkles className="size-3.5 text-accent-text" aria-hidden /> Técnicos Auxiliares de Informática · AGE
              </span>
              <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-fg text-balance xl:text-5xl">
                Prepara el TAI <span className="brand-text">como el día del examen</span>
              </h1>
              <p className="mt-4 max-w-lg text-[17px] leading-7 text-fg-muted">
                Exámenes oficiales, simulacros corregidos igual que el tribunal, una explicación para cada fallo y tu probabilidad real
                de conseguir plaza.
              </p>
              <ul className="mt-8 space-y-4">
                {FEATURES.map((f) => (
                  <li key={f.title} className="flex items-start gap-3.5">
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent-text [&_svg]:size-4.5">
                      {f.icon}
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-fg">{f.title}</span>
                      <span className="block text-sm text-fg-muted">{f.text}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="rounded-3xl border border-border bg-surface p-7 shadow-pop"
            >
              <h2 className="text-xl font-semibold tracking-tight text-fg">Crea tu perfil</h2>
              <p className="mt-1 text-sm text-fg-muted">Cada persona con su propio progreso: podrás añadir más perfiles cuando quieras.</p>
              <div className="mt-6">
                <ProfileForm value={welcome} onChange={setWelcome} error={formError} autoFocus onSubmit={() => void save(welcome, null)} />
              </div>
              <Button
                variant="primary"
                size="lg"
                className="mt-7 w-full"
                loading={saving}
                rightIcon={<ArrowRight className="size-4" />}
                onClick={() => void save(welcome, null)}
              >
                Empezar a entrenar
              </Button>
              <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-border bg-surface-2/60 px-3.5 py-3 text-[12.5px] leading-5 text-fg-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success-text" aria-hidden />
                <span>
                  <strong className="font-semibold text-fg">Tu privacidad, primero.</strong> Todo se guarda solo en este equipo: sin cuentas, sin
                  servidores y sin analítica. Basta con un alias; no escribas datos personales sensibles.
                </span>
              </p>
              {backend === "mock" && demo.available() ? (
                <div className="mt-5 rounded-xl border border-dashed border-border-strong p-4 text-center">
                  <p className="text-[13px] text-fg-muted">¿Solo quieres echar un vistazo?</p>
                  <Button variant="soft" size="sm" className="mt-2.5" loading={seeding} leftIcon={<Users className="size-3.5" />} onClick={() => void seed()}>
                    Explorar con datos de ejemplo
                  </Button>
                </div>
              ) : null}
            </motion.div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center py-12">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <h1 className="text-4xl font-semibold tracking-tight text-fg">¿Quién estudia hoy?</h1>
              <p className="mt-3 text-[17px] text-fg-muted">Cada perfil con su propio progreso, estadísticas y repaso de fallos, guardados solo en este equipo.</p>
            </motion.div>
            <ul className="mt-12 flex max-w-4xl flex-wrap justify-center gap-5">
              {profiles.map((p, i) => (
                <motion.li
                  key={p.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i, duration: 0.3 }}
                  className="relative"
                >
                  <button
                    type="button"
                    onClick={() => (managing ? setEditing({ id: p.id, draft: { name: p.name, color: p.color, avatar: p.avatar } }) : void enter(p.id))}
                    className={cn(
                      "group flex w-44 flex-col items-center rounded-3xl border border-border bg-surface px-4 pb-5 pt-7 text-center shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-border-strong hover:shadow-pop",
                      current?.id === p.id && "ring-2 ring-accent",
                    )}
                  >
                    <span className="transition-transform duration-200 group-hover:scale-105">
                      <ProfileAvatar profile={p} size="xl" shape="full" />
                    </span>
                    <span className="mt-4 w-full truncate text-[15px] font-semibold text-fg">{p.name}</span>
                    <span className="mt-1 text-xs text-fg-subtle">
                      {p.last_active_at ? `Activo ${formatRelative(p.last_active_at)}` : "Nuevo"}
                    </span>
                  </button>
                  {managing ? (
                    <div className="absolute -right-2 -top-2 flex gap-1">
                      <button
                        type="button"
                        aria-label={`Editar ${p.name}`}
                        onClick={() => setEditing({ id: p.id, draft: { name: p.name, color: p.color, avatar: p.avatar } })}
                        className="grid size-8 place-items-center rounded-full border border-border bg-surface text-fg-muted shadow-card hover:text-fg"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Borrar ${p.name}`}
                        onClick={() => setToDelete(p)}
                        className="grid size-8 place-items-center rounded-full border border-border bg-surface text-danger-text shadow-card hover:bg-danger-soft"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ) : null}
                </motion.li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    setFormError(null);
                    setEditing({ id: null, draft: newDraft(profiles.length) });
                  }}
                  className="flex h-full min-h-[212px] w-44 flex-col items-center justify-center rounded-3xl border-2 border-dashed border-border-strong text-fg-muted transition-colors hover:border-accent hover:text-accent-text"
                >
                  <span className="grid size-14 place-items-center rounded-full bg-surface-2">
                    <Plus className="size-6" />
                  </span>
                  <span className="mt-4 text-sm font-semibold">Nuevo perfil</span>
                </button>
              </li>
            </ul>
            <Button variant="ghost" size="sm" className="mt-10" leftIcon={<Pencil className="size-3.5" />} onClick={() => setManaging((m) => !m)}>
              {managing ? "Hecho" : "Gestionar perfiles"}
            </Button>
          </div>
        )}
        <footer className="mt-auto pt-10 text-center text-xs text-fg-subtle" data-testid="profiles-footer">
          v{version} · {LICENSE_SHORT} · {COPYRIGHT_LINE}
        </footer>
      </div>

      <Dialog
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Editar perfil" : "Nuevo perfil"}
        description={editing?.id ? undefined : "Cada perfil guarda su propio progreso, estadísticas y ajustes."}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button variant="primary" loading={saving} onClick={() => editing && void save(editing.draft, editing.id)}>
              {editing?.id ? "Guardar" : "Crear perfil"}
            </Button>
          </>
        }
      >
        {editing ? (
          <ProfileForm
            value={editing.draft}
            onChange={(draft) => setEditing({ ...editing, draft })}
            error={formError}
            autoFocus
            onSubmit={() => void save(editing.draft, editing.id)}
          />
        ) : null}
      </Dialog>

      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        icon={<Trash2 />}
        iconTone="danger"
        title={`¿Borrar el perfil «${toDelete?.name ?? ""}»?`}
        description="Se eliminarán todos sus intentos, estadísticas y repasos. Esta acción no se puede deshacer."
        footer={
          <>
            <Button variant="ghost" onClick={() => setToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                if (!toDelete) return;
                try {
                  await deleteProfile(toDelete.id);
                  toast.success("Perfil borrado");
                } catch (e) {
                  toast.error("No se ha podido borrar", errorMessage(e));
                }
                setToDelete(null);
              }}
            >
              Borrar perfil
            </Button>
          </>
        }
      />
    </div>
  );
}
