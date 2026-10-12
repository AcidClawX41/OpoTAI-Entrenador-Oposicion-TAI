// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Avatar de un perfil, el mismo en toda la app (barra lateral, selector, perfiles, inicio, ajustes):
 * imagen propia (data URL), emoji o, si no hay, iniciales; con el color del perfil.
 * - `shape="circle"`: círculo con la imagen recortada al centro (`object-cover`).
 * - `shape="full"`: rectángulo redondeado con la imagen completa (`object-contain`), para ver
 *   sus proporciones en la página de perfiles y en el formulario.
 */
import type { CSSProperties } from "react";
import type { Profile } from "@/api/types";
import { isImageAvatar } from "@/lib/avatarImage";
import { cn } from "@/lib/cn";
import { readableTextOn } from "@/lib/color";
import { initials } from "@/lib/text";

export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZES: Record<AvatarSize, string> = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
  "2xl": "size-28 text-3xl",
};

const EMOJI_SIZES: Record<AvatarSize, string> = { xs: "text-sm", sm: "text-base", md: "text-xl", lg: "text-3xl", xl: "text-4xl", "2xl": "text-5xl" };

/** Grosor del borde con el color del perfil alrededor de una imagen. */
const RING: Record<AvatarSize, number> = { xs: 1.5, sm: 1.5, md: 2, lg: 2, xl: 2.5, "2xl": 3 };

interface ProfileAvatarProps {
  profile: Pick<Profile, "name" | "color" | "avatar">;
  size?: AvatarSize;
  shape?: "circle" | "full";
  ring?: boolean;
  className?: string;
}

export function ProfileAvatar({ profile, size = "md", shape = "circle", ring, className }: ProfileAvatarProps) {
  const avatar = profile.avatar;
  if (avatar && isImageAvatar(avatar)) {
    const style: CSSProperties = { boxShadow: `0 0 0 ${RING[size]}px ${profile.color}` };
    return (
      <span
        aria-hidden
        data-avatar="image"
        className={cn(
          "relative inline-grid shrink-0 select-none place-items-center overflow-hidden",
          SIZES[size],
          shape === "full" ? "rounded-2xl bg-surface-2" : "rounded-full bg-surface-2",
          ring && "outline outline-2 outline-offset-2 outline-surface",
          className,
        )}
        style={style}
      >
        <img
          src={avatar}
          alt=""
          draggable={false}
          className={cn("size-full", shape === "full" ? "object-contain" : "object-cover object-center")}
        />
      </span>
    );
  }
  const emoji = avatar && avatar.trim() ? avatar : null;
  return (
    <span
      aria-hidden
      data-avatar={emoji ? "emoji" : "initials"}
      className={cn(
        "relative inline-grid shrink-0 select-none place-items-center rounded-full font-semibold",
        SIZES[size],
        ring && "ring-2 ring-surface",
        className,
      )}
      style={
        emoji
          ? { background: `color-mix(in oklab, ${profile.color} 22%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklab, ${profile.color} 45%, transparent)` }
          : { background: `linear-gradient(140deg, ${profile.color}, color-mix(in oklab, ${profile.color} 70%, black))`, color: readableTextOn(profile.color) }
      }
    >
      {emoji ? <span className={cn("leading-none", EMOJI_SIZES[size])}>{emoji}</span> : initials(profile.name)}
    </span>
  );
}
