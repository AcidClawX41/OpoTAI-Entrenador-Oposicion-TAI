// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Imagen de perfil propia: lectura del fichero, encuadre opcional y recodificación.
 *
 * - Fichero de origen de hasta 30 MB en cualquier formato raster que el WebView sepa leer
 *   (PNG, JPEG, WebP, GIF, BMP, AVIF…). Nunca SVG.
 * - Por defecto se conserva la imagen entera con su proporción; solo se reduce si el lado mayor
 *   pasa de 1024 px. El encuadre (libre, cuadrado, 3:4 o 4:3, con zoom y giro) es opcional.
 * - Se recodifica en WebP 0,9 (o JPEG 0,9, o PNG si hay transparencia, si el motor no codifica
 *   WebP): así se eliminan los metadatos EXIF (GPS, cámara…). Resultado ≤ 2 MB.
 * - Un GIF de hasta 2 MB se guarda tal cual (conserva la animación; no lleva EXIF).
 * Todo ocurre en este equipo: la imagen no sale de él.
 */

export const MAX_SOURCE_BYTES = 30 * 1024 * 1024;
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export const MAX_SIDE = 1024;

/** Tipos que se ofrecen en el selector de ficheros (sin SVG). */
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif,image/bmp,image/avif";

const AVATAR_DATA_URL = /^data:image\/(png|jpeg|webp|gif);base64,/;

export type Rotation = 0 | 90 | 180 | 270;

export interface Size {
  w: number;
  h: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** ¿Es el avatar una imagen (data URL) y no un emoji? */
export function isImageAvatar(avatar: string | null | undefined): boolean {
  return typeof avatar === "string" && AVATAR_DATA_URL.test(avatar);
}

export class AvatarImageError extends Error {}

/** Comprueba el fichero elegido antes de leerlo (tipo raster y tamaño ≤ 30 MB). */
export function checkSourceFile(file: { name: string; type: string; size: number }): void {
  const type = (file.type || "").toLowerCase();
  const name = (file.name || "").toLowerCase();
  if (type === "image/svg+xml" || name.endsWith(".svg") || name.endsWith(".svgz"))
    throw new AvatarImageError("Las imágenes SVG no se admiten: elige una foto o un dibujo en PNG, JPEG, WebP, GIF…");
  if (type && !type.startsWith("image/")) throw new AvatarImageError("Ese fichero no es una imagen. Elige una en PNG, JPEG, WebP, GIF, BMP o AVIF.");
  if (file.size > MAX_SOURCE_BYTES) throw new AvatarImageError("La imagen ocupa más de 30 MB. Elige otra más ligera.");
}

/** Bytes que ocupa el contenido de una data URL en base64 (sin la cabecera). */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  const padding = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - padding);
}

/** Tamaño de la imagen tras girarla. */
export function rotatedSize(size: Size, rotation: Rotation): Size {
  return rotation % 180 === 0 ? { w: size.w, h: size.h } : { w: size.h, h: size.w };
}

/** Factor para que el lado mayor no pase de `max` (nunca amplía). */
export function fitScale(size: Size, max = MAX_SIDE): number {
  const side = Math.max(size.w, size.h);
  return side > max ? max / side : 1;
}

/**
 * Rectángulo de origen del encuadre, en píxeles de la imagen ya girada.
 * - `aspect`: ancho/alto del marco; null = la proporción de la propia imagen («libre»).
 * - `zoom`: 1 (el marco más grande que cabe) a 4.
 * - `offset`: desplazamiento normalizado del centro, de −1 a 1 en cada eje (0 = centrado).
 */
export function cropRect(image: Size, rotation: Rotation, aspect: number | null, zoom: number, offset: { x: number; y: number }): Rect {
  const { w: rw, h: rh } = rotatedSize(image, rotation);
  const a = aspect && aspect > 0 ? aspect : rw / rh;
  let w = rw / rh > a ? rh * a : rw;
  let h = rw / rh > a ? rh : rw / a;
  const z = Math.min(4, Math.max(1, zoom));
  w /= z;
  h /= z;
  const ox = Math.min(1, Math.max(-1, offset.x));
  const oy = Math.min(1, Math.max(-1, offset.y));
  const cx = rw / 2 + (ox * (rw - w)) / 2;
  const cy = rh / 2 + (oy * (rh - h)) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h };
}

/** Codificador inyectable (en la app, `canvas.toDataURL` sobre un lienzo reescalado). */
export type Encoder = (type: "image/webp" | "image/jpeg" | "image/png", quality: number, scale: number) => string;

/**
 * Elige el formato y la calidad: WebP 0,9; si el motor no codifica WebP, PNG con transparencia
 * o JPEG 0,9 sin ella. Si pasa de 2 MB, baja la calidad y después el tamaño.
 */
export function encodeAvatar(encode: Encoder, hasAlpha: boolean, maxBytes = MAX_AVATAR_BYTES): string {
  const probe = encode("image/webp", 0.9, 1);
  const webp = probe.startsWith("data:image/webp");
  const type = webp ? "image/webp" : hasAlpha ? "image/png" : "image/jpeg";
  const lossy = type !== "image/png";
  let best = webp ? probe : encode(type, 0.9, 1);
  if (dataUrlBytes(best) <= maxBytes) return best;
  for (const quality of lossy ? [0.8, 0.7, 0.6] : []) {
    best = encode(type, quality, 1);
    if (dataUrlBytes(best) <= maxBytes) return best;
  }
  let scale = 1;
  for (let i = 0; i < 8; i++) {
    scale *= 0.8;
    best = encode(type, lossy ? 0.75 : 0.9, scale);
    if (dataUrlBytes(best) <= maxBytes) return best;
  }
  throw new AvatarImageError("No se ha podido reducir la imagen por debajo de 2 MB. Prueba con otra.");
}

// ───────────────────────────── Navegador (canvas) ─────────────────────────────

export function readFileAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new AvatarImageError("No se ha podido leer el fichero."));
    reader.readAsDataURL(file);
  });
}

/** Decodifica la imagen con el motor del WebView. */
export function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (!img.naturalWidth || !img.naturalHeight) reject(new AvatarImageError("No se ha podido leer la imagen."));
      else resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new AvatarImageError("No se ha podido leer la imagen: puede que el formato no sea compatible o que el fichero esté dañado."));
    };
    img.src = url;
  });
}

/** Dibuja la imagen girada en un lienzo del tamaño girado. */
export function drawRotated(img: CanvasImageSource & { naturalWidth?: number; naturalHeight?: number; width: number; height: number }, rotation: Rotation): HTMLCanvasElement {
  const size = { w: img.naturalWidth || img.width, h: img.naturalHeight || img.height };
  const r = rotatedSize(size, rotation);
  const canvas = document.createElement("canvas");
  canvas.width = r.w;
  canvas.height = r.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new AvatarImageError("Este equipo no puede procesar imágenes.");
  ctx.translate(r.w / 2, r.h / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -size.w / 2, -size.h / 2, size.w, size.h);
  return canvas;
}

function hasTransparency(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  try {
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const step = Math.max(1, Math.floor(data.length / 4 / 250_000)) * 4;
    for (let i = 3; i < data.length; i += step) if (data[i]! < 255) return true;
  } catch {
    return false;
  }
  return false;
}

/** Recorta (opcional), reduce a 1024 px como mucho y recodifica sin metadatos. */
export function renderAvatar(img: HTMLImageElement, rotation: Rotation, crop: Rect | null): string {
  const rotated = drawRotated(img, rotation);
  const area = crop ?? { x: 0, y: 0, w: rotated.width, h: rotated.height };
  const base = fitScale({ w: area.w, h: area.h });
  const sized = (scale: number) => {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(area.w * base * scale));
    canvas.height = Math.max(1, Math.round(area.h * base * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new AvatarImageError("Este equipo no puede procesar imágenes.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(rotated, area.x, area.y, area.w, area.h, 0, 0, canvas.width, canvas.height);
    return canvas;
  };
  const full = sized(1);
  const alpha = hasTransparency(full);
  const cache = new Map<number, HTMLCanvasElement>([[1, full]]);
  return encodeAvatar((type, quality, scale) => {
    let canvas = cache.get(scale);
    if (!canvas) {
      canvas = sized(scale);
      cache.set(scale, canvas);
    }
    // Sin transparencia en JPEG: fondo blanco en lugar de negro.
    if (type === "image/jpeg" && alpha) {
      const flat = document.createElement("canvas");
      flat.width = canvas.width;
      flat.height = canvas.height;
      const ctx = flat.getContext("2d")!;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, flat.width, flat.height);
      ctx.drawImage(canvas, 0, 0);
      return flat.toDataURL(type, quality);
    }
    return canvas.toDataURL(type, quality);
  }, alpha);
}
