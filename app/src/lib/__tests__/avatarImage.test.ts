// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import {
  AvatarImageError,
  MAX_AVATAR_BYTES,
  checkSourceFile,
  cropRect,
  dataUrlBytes,
  encodeAvatar,
  fitScale,
  isImageAvatar,
  rotatedSize,
  type Encoder,
} from "@/lib/avatarImage";

/** data URL cuyo contenido decodificado ocupa `bytes` bytes. */
function fakeDataUrl(type: string, bytes: number): string {
  const b64 = "A".repeat(Math.ceil(bytes / 3) * 4);
  return `data:${type};base64,${b64}`;
}

describe("imagen de perfil · encuadre", () => {
  it("sin zoom ni desplazamiento, el marco libre es la imagen entera", () => {
    expect(cropRect({ w: 1200, h: 800 }, 0, null, 1, { x: 0, y: 0 })).toEqual({ x: 0, y: 0, w: 1200, h: 800 });
  });

  it("cuadrado centrado y con zoom 2× en una imagen apaisada", () => {
    expect(cropRect({ w: 1200, h: 800 }, 0, 1, 1, { x: 0, y: 0 })).toEqual({ x: 200, y: 0, w: 800, h: 800 });
    expect(cropRect({ w: 1200, h: 800 }, 0, 1, 2, { x: 0, y: 0 })).toEqual({ x: 400, y: 200, w: 400, h: 400 });
  });

  it("el desplazamiento lleva el marco hasta el borde sin salirse", () => {
    expect(cropRect({ w: 1200, h: 800 }, 0, 1, 1, { x: -1, y: 0 })).toEqual({ x: 0, y: 0, w: 800, h: 800 });
    expect(cropRect({ w: 1200, h: 800 }, 0, 1, 1, { x: 5, y: 0 })).toEqual({ x: 400, y: 0, w: 800, h: 800 });
    const r = cropRect({ w: 1200, h: 800 }, 0, 1, 2, { x: 1, y: 1 });
    expect(r.x + r.w).toBe(1200);
    expect(r.y + r.h).toBe(800);
  });

  it("al girar 90° se encuadra sobre la imagen girada (3:4 en vertical)", () => {
    expect(rotatedSize({ w: 1200, h: 800 }, 90)).toEqual({ w: 800, h: 1200 });
    const r = cropRect({ w: 1200, h: 800 }, 90, 3 / 4, 1, { x: 0, y: 0 });
    expect(r.w).toBeCloseTo(800);
    expect(r.h).toBeCloseTo(1066.67, 1);
    expect(r.y).toBeCloseTo((1200 - 1066.67) / 2, 1);
  });

  it("solo reduce si el lado mayor pasa de 1024 px y conserva la proporción", () => {
    expect(fitScale({ w: 800, h: 600 })).toBe(1);
    expect(fitScale({ w: 4096, h: 1024 })).toBe(0.25);
    expect(fitScale({ w: 1000, h: 3000 })).toBeCloseTo(1024 / 3000);
  });
});

describe("imagen de perfil · fichero y salida", () => {
  it("acepta formatos raster hasta 30 MB y rechaza SVG", () => {
    expect(() => checkSourceFile({ name: "cara.jpg", type: "image/jpeg", size: 12 * 1024 * 1024 })).not.toThrow();
    expect(() => checkSourceFile({ name: "anime.avif", type: "image/avif", size: 1000 })).not.toThrow();
    expect(() => checkSourceFile({ name: "logo.svg", type: "image/svg+xml", size: 1000 })).toThrow(AvatarImageError);
    expect(() => checkSourceFile({ name: "notas.pdf", type: "application/pdf", size: 1000 })).toThrow(/no es una imagen/);
    expect(() => checkSourceFile({ name: "enorme.png", type: "image/png", size: 31 * 1024 * 1024 })).toThrow(/30 MB/);
  });

  it("calcula el tamaño decodificado de una data URL", () => {
    expect(dataUrlBytes("data:image/png;base64,QUJD")).toBe(3);
    expect(dataUrlBytes("data:image/png;base64,QUI=")).toBe(2);
    expect(dataUrlBytes(fakeDataUrl("image/webp", 3000))).toBe(3000);
  });

  it("reconoce las imágenes guardadas como avatar (no los emojis)", () => {
    expect(isImageAvatar("data:image/webp;base64,AAAA")).toBe(true);
    expect(isImageAvatar("data:image/gif;base64,AAAA")).toBe(true);
    expect(isImageAvatar("data:image/svg+xml;base64,AAAA")).toBe(false);
    expect(isImageAvatar("🚀")).toBe(false);
    expect(isImageAvatar(null)).toBe(false);
  });

  it("WebP 0,9 si el motor lo codifica", () => {
    const calls: string[] = [];
    const enc: Encoder = (type, quality, scale) => {
      calls.push(`${type}@${quality}x${scale}`);
      return fakeDataUrl(type, 50_000);
    };
    const out = encodeAvatar(enc, false);
    expect(out.startsWith("data:image/webp;base64,")).toBe(true);
    expect(calls).toEqual(["image/webp@0.9x1"]);
  });

  it("sin WebP: JPEG 0,9, o PNG si la imagen tiene transparencia", () => {
    const noWebp: Encoder = (type) => fakeDataUrl(type === "image/webp" ? "image/png" : type, 40_000);
    expect(encodeAvatar(noWebp, false).startsWith("data:image/jpeg;base64,")).toBe(true);
    expect(encodeAvatar(noWebp, true).startsWith("data:image/png;base64,")).toBe(true);
  });

  it("si pasa de 2 MB baja la calidad y después el tamaño hasta caber", () => {
    const calls: string[] = [];
    const enc: Encoder = (type, quality, scale) => {
      calls.push(`${quality}x${scale.toFixed(2)}`);
      // Tamaño simulado: proporcional al área y a la calidad.
      return fakeDataUrl(type, Math.round(6 * 1024 * 1024 * quality * scale * scale));
    };
    const out = encodeAvatar(enc, false);
    expect(out.startsWith("data:image/webp;base64,")).toBe(true);
    expect(dataUrlBytes(out)).toBeLessThanOrEqual(MAX_AVATAR_BYTES);
    expect(calls[0]).toBe("0.9x1.00");
    expect(calls.some((c) => !c.endsWith("x1.00"))).toBe(true);
  });
});
