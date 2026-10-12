// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useId, useRef, useState, type ClipboardEvent } from "react";
import { Check, ImagePlus, Trash2 } from "lucide-react";
import { ACCEPTED_IMAGE_TYPES, AvatarImageError, checkSourceFile, isImageAvatar } from "@/lib/avatarImage";
import { cn } from "@/lib/cn";
import { PROFILE_COLORS, PROFILE_EMOJIS } from "@/lib/color";
import { initials } from "@/lib/text";
import { TextInput } from "@/components/ui/controls";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { ProfileAvatar } from "./ProfileAvatar";

/** Longitud máxima del nombre o alias del perfil. */
export const PROFILE_NAME_MAX = 30;

export interface ProfileDraft {
  name: string;
  color: string;
  /** Emoji, imagen propia (data URL) o null (iniciales). */
  avatar: string | null;
}

interface ProfileFormProps {
  value: ProfileDraft;
  onChange: (value: ProfileDraft) => void;
  error?: string | null;
  autoFocus?: boolean;
  onSubmit?: () => void;
}

export function ProfileForm({ value, onChange, error, autoFocus, onSubmit }: ProfileFormProps) {
  const nameId = useId();
  const helpId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const image = isImageAvatar(value.avatar);

  const pick = (file: File | null | undefined) => {
    if (!file) return;
    try {
      checkSourceFile(file);
      setUploadError(null);
      setPending(file);
    } catch (e) {
      setUploadError(e instanceof AvatarImageError ? e.message : "No se ha podido leer la imagen.");
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLFormElement>) => {
    const item = [...event.clipboardData.items].find((i) => i.kind === "file" && i.type.startsWith("image/"));
    const file = item?.getAsFile();
    if (!file) return;
    event.preventDefault();
    pick(file);
  };

  return (
    <form
      className="space-y-5"
      onPaste={onPaste}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <div className="flex items-start gap-4">
        <ProfileAvatar profile={{ name: value.name || "?", color: value.color, avatar: value.avatar }} size="xl" shape="full" />
        <div className="min-w-0 flex-1">
          <div className="mb-1.5 flex items-baseline justify-between gap-2">
            <label htmlFor={nameId} className="block text-[13px] font-medium text-fg">
              Nombre o alias
            </label>
            <span className="text-[11px] tabular-nums text-fg-subtle" aria-hidden>
              {value.name.length}/{PROFILE_NAME_MAX}
            </span>
          </div>
          <TextInput
            id={nameId}
            value={value.name}
            maxLength={PROFILE_NAME_MAX}
            autoFocus={autoFocus}
            autoComplete="off"
            data-autofocus={autoFocus ? "" : undefined}
            placeholder="Tu nombre o un alias"
            aria-invalid={Boolean(error) || undefined}
            aria-describedby={helpId}
            onChange={(e) => onChange({ ...value, name: e.target.value.slice(0, PROFILE_NAME_MAX) })}
          />
          {error ? <p className="mt-1.5 text-xs text-danger-text">{error}</p> : null}
          <p id={helpId} className="mt-1.5 text-xs leading-5 text-fg-muted">
            Solo sirve para saludarte y distinguir perfiles en este equipo. Puedes usar un alias; no escribas datos personales sensibles.
          </p>
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-fg">Color</legend>
        <div className="flex flex-wrap gap-2">
          {PROFILE_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              aria-label={`Color ${c}`}
              aria-pressed={value.color === c}
              onClick={() => onChange({ ...value, color: c })}
              className={cn(
                "grid size-8 place-items-center rounded-full transition-transform hover:scale-110",
                value.color === c && "ring-2 ring-fg ring-offset-2 ring-offset-surface",
              )}
              style={{ background: c }}
            >
              {value.color === c ? <Check className="size-4 text-white" aria-hidden /> : null}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-[13px] font-medium text-fg">Avatar</legend>
        <div className="grid grid-cols-9 gap-1.5 sm:grid-cols-[repeat(13,minmax(0,1fr))]">
          <button
            type="button"
            aria-pressed={image}
            aria-label={image ? "Cambiar la imagen propia" : "Subir una imagen desde el equipo"}
            title="Subir imagen (también puedes pegarla con Ctrl+V)"
            onClick={() => fileRef.current?.click()}
            className={cn(
              "relative grid aspect-square place-items-center overflow-hidden rounded-lg border text-fg-muted transition-colors",
              image ? "border-accent bg-accent-soft text-accent-text" : "border-dashed border-border-strong bg-surface-2 hover:border-accent hover:text-accent-text",
            )}
          >
            {image ? <img src={value.avatar!} alt="" draggable={false} className="size-full object-cover" /> : <ImagePlus className="size-4.5" aria-hidden />}
          </button>
          <button
            type="button"
            aria-pressed={value.avatar === null}
            onClick={() => onChange({ ...value, avatar: null })}
            className={cn(
              "grid aspect-square place-items-center rounded-lg border text-[11px] font-semibold transition-colors",
              value.avatar === null ? "border-accent bg-accent-soft text-accent-text" : "border-border bg-surface-2 text-fg-muted hover:border-border-strong",
            )}
            title="Iniciales"
            aria-label="Usar las iniciales"
          >
            {initials(value.name || "?")}
          </button>
          {PROFILE_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              aria-label={`Avatar ${e}`}
              aria-pressed={value.avatar === e}
              onClick={() => onChange({ ...value, avatar: e })}
              className={cn(
                "grid aspect-square place-items-center rounded-lg border text-lg transition-all hover:scale-105",
                value.avatar === e ? "border-accent bg-accent-soft" : "border-border bg-surface-2 hover:border-border-strong",
              )}
            >
              {e}
            </button>
          ))}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES}
          className="hidden"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <div className="mt-2.5 flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <p className="max-w-xl text-xs leading-5 text-fg-muted">
            Puedes usar tu foto, un personaje anime o lo que quieras (hasta 30 MB; se guarda optimizada, sin metadatos y solo en este equipo). También
            puedes pegarla con Ctrl+V.
          </p>
          {image ? (
            <button
              type="button"
              onClick={() => onChange({ ...value, avatar: null })}
              className="inline-flex items-center gap-1.5 rounded-md text-xs font-medium text-danger-text hover:underline"
            >
              <Trash2 className="size-3.5" aria-hidden />
              Quitar la imagen
            </button>
          ) : null}
        </div>
        {uploadError ? (
          <p role="alert" className="mt-2 text-xs font-medium text-danger-text">
            {uploadError}
          </p>
        ) : null}
      </fieldset>
      <button type="submit" hidden aria-hidden tabIndex={-1} />

      <AvatarCropDialog
        file={pending}
        onClose={() => setPending(null)}
        onDone={(dataUrl) => {
          setPending(null);
          onChange({ ...value, avatar: dataUrl });
        }}
      />
    </form>
  );
}
