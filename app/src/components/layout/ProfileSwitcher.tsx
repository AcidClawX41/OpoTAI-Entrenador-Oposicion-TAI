// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronsUpDown, Users } from "lucide-react";
import { errorMessage } from "@/api/errors";
import { cn } from "@/lib/cn";
import { playSfx } from "@/lib/sfx";
import { useSession } from "@/store/session";
import { toast } from "@/store/toast";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { Popover, Tooltip } from "@/components/ui/overlays";

export function ProfileSwitcher({ collapsed }: { collapsed: boolean }) {
  const profile = useSession((s) => s.profile);
  const profiles = useSession((s) => s.profiles);
  const selectProfile = useSession((s) => s.selectProfile);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const anchor = useRef<HTMLButtonElement>(null);
  if (!profile) return null;

  const choose = async (id: string) => {
    setOpen(false);
    if (id === profile.id) return;
    try {
      const route = await selectProfile(id);
      playSfx("nav");
      navigate(route);
    } catch (e) {
      toast.error("No se ha podido cambiar de perfil", errorMessage(e));
    }
  };

  const button = (
    <button
      ref={anchor}
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => setOpen((o) => !o)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-xl border border-transparent p-1.5 text-left transition-colors hover:border-border hover:bg-surface-2",
        open && "border-border bg-surface-2",
        collapsed && "justify-center",
      )}
    >
      <ProfileAvatar profile={profile} size="sm" />
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-semibold text-fg">{profile.name}</span>
            <span className="block truncate text-[11px] text-fg-subtle">Cambiar de perfil</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-fg-subtle" aria-hidden />
        </>
      ) : null}
    </button>
  );

  return (
    <>
      {collapsed ? (
        <Tooltip content={`${profile.name} · cambiar de perfil`} side="right" className="w-full">
          {button}
        </Tooltip>
      ) : (
        button
      )}
      <Popover open={open} onClose={() => setOpen(false)} anchorRef={anchor} side={collapsed ? "right" : "top"} label="Cambiar de perfil">
        <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">Perfiles</p>
        <ul className="max-h-72 overflow-y-auto">
          {profiles.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void choose(p.id)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-surface-2"
              >
                <ProfileAvatar profile={p} size="xs" />
                <span className="min-w-0 flex-1 truncate font-medium text-fg">{p.name}</span>
                {p.id === profile.id ? <Check className="size-4 text-accent-text" aria-label="Perfil activo" /> : null}
              </button>
            </li>
          ))}
        </ul>
        <div className="my-1 h-px bg-border" />
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            playSfx("nav");
            navigate("/perfiles");
          }}
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-fg-muted hover:bg-surface-2 hover:text-fg"
        >
          <Users className="size-4" aria-hidden />
          Gestionar perfiles
        </button>
      </Popover>
    </>
  );
}
