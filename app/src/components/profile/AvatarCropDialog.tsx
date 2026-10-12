// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Diálogo de la imagen de perfil propia: vista previa de la imagen entera (con su proporción) y,
 * si se quiere, «Ajustar encuadre» (libre, cuadrado, 3:4 o 4:3; zoom 1×–4× con deslizador o rueda;
 * arrastrar para encuadrar; girar 90°). Al aceptar se recodifica sin metadatos (ver avatarImage.ts).
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { Crop, ImageIcon, RotateCw, TriangleAlert } from "lucide-react";
import {
  MAX_AVATAR_BYTES,
  cropRect,
  fitScale,
  loadImage,
  readFileAsDataUrl,
  renderAvatar,
  rotatedSize,
  type Rotation,
} from "@/lib/avatarImage";
import { cn } from "@/lib/cn";
import { formatInt } from "@/lib/format";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Segmented, Slider } from "@/components/ui/controls";

type AspectKey = "free" | "square" | "3:4" | "4:3";
const ASPECTS: Record<AspectKey, number | null> = { free: null, square: 1, "3:4": 3 / 4, "4:3": 4 / 3 };
const PREVIEW_MAX_SIDE = 1600;

interface AvatarCropDialogProps {
  /** Fichero elegido; con null el diálogo está cerrado. */
  file: File | null;
  onClose: () => void;
  onDone: (dataUrl: string) => void;
}

/** Copia reducida y girada para la vista previa (la salida final usa la imagen original). */
function previewCanvas(img: HTMLImageElement, rotation: Rotation): HTMLCanvasElement {
  const size = { w: img.naturalWidth, h: img.naturalHeight };
  const scale = Math.min(1, PREVIEW_MAX_SIDE / Math.max(size.w, size.h));
  const r = rotatedSize({ w: size.w * scale, h: size.h * scale }, rotation);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(r.w));
  canvas.height = Math.max(1, Math.round(r.h));
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.drawImage(img, (-size.w * scale) / 2, (-size.h * scale) / 2, size.w * scale, size.h * scale);
  }
  return canvas;
}

export function AvatarCropDialog({ file, onClose, onDone }: AvatarCropDialogProps) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rotation, setRotation] = useState<Rotation>(0);
  const [cropping, setCropping] = useState(false);
  const [aspect, setAspect] = useState<AspectKey>("free");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const stageRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const layout = useRef({ k: 1, rw: 1, rh: 1 });

  useEffect(() => {
    setImg(null);
    setError(null);
    setRotation(0);
    setCropping(false);
    setAspect("free");
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    if (!file) return;
    let alive = true;
    loadImage(file)
      .then((loaded) => alive && setImg(loaded))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : "No se ha podido leer la imagen."));
    return () => {
      alive = false;
    };
  }, [file]);

  const preview = useMemo(() => (img ? previewCanvas(img, rotation) : null), [img, rotation]);
  const natural = img ? { w: img.naturalWidth, h: img.naturalHeight } : null;
  const rect = natural && cropping ? cropRect(natural, rotation, ASPECTS[aspect], zoom, offset) : null;
  const area = natural ? (rect ?? rotatedSize(natural, rotation)) : null;
  const outScale = area ? fitScale({ w: area.w, h: area.h }) : 1;
  const out = area ? { w: Math.round(area.w * outScale), h: Math.round(area.h * outScale) } : null;
  const isGif = file?.type === "image/gif";
  const keepGif = isGif && !cropping && rotation === 0 && (file?.size ?? Infinity) <= MAX_AVATAR_BYTES;

  // Dibuja la vista previa y, al encuadrar, oscurece lo que queda fuera del marco.
  useEffect(() => {
    const canvas = stageRef.current;
    if (!canvas || !preview || !natural) return;
    const W = canvas.clientWidth || 560;
    const H = canvas.clientHeight || 340;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    const r = rotatedSize(natural, rotation);
    const k = Math.min((W - 24) / r.w, (H - 24) / r.h);
    const dw = r.w * k;
    const dh = r.h * k;
    const dx = (W - dw) / 2;
    const dy = (H - dh) / 2;
    layout.current = { k, rw: r.w, rh: r.h };
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(preview, dx, dy, dw, dh);
    if (rect) {
      const sx = dx + rect.x * k;
      const sy = dy + rect.y * k;
      const sw = rect.w * k;
      const sh = rect.h * k;
      ctx.fillStyle = "rgba(9, 9, 11, 0.62)";
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.rect(sx, sy, sw, sh);
      ctx.fill("evenodd");
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (const f of [1 / 3, 2 / 3]) {
        ctx.moveTo(sx + sw * f, sy);
        ctx.lineTo(sx + sw * f, sy + sh);
        ctx.moveTo(sx, sy + sh * f);
        ctx.lineTo(sx + sw, sy + sh * f);
      }
      ctx.stroke();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.strokeRect(sx, sy, sw, sh);
    }
  }, [preview, natural, rotation, rect]);

  // Rueda para el zoom (oyente no pasivo para que no desplace el diálogo).
  useEffect(() => {
    const canvas = stageRef.current;
    if (!canvas || !cropping) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((z) => Math.min(4, Math.max(1, z - Math.sign(event.deltaY) * 0.15)));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [cropping, img]);

  const panBy = (pxX: number, pxY: number, from = offset) => {
    if (!rect) return;
    const { k, rw, rh } = layout.current;
    const freeX = (rw - rect.w) / 2;
    const freeY = (rh - rect.h) / 2;
    setOffset({
      x: freeX > 0.5 ? Math.min(1, Math.max(-1, from.x + pxX / k / freeX)) : 0,
      y: freeY > 0.5 ? Math.min(1, Math.max(-1, from.y + pxY / k / freeY)) : 0,
    });
  };

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!cropping) return;
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (!d) return;
    panBy(event.clientX - d.x, event.clientY - d.y, { x: d.ox, y: d.oy });
  };
  const onPointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLCanvasElement>) => {
    if (!cropping) return;
    const step = 12;
    if (event.key === "ArrowLeft") panBy(-step, 0);
    else if (event.key === "ArrowRight") panBy(step, 0);
    else if (event.key === "ArrowUp") panBy(0, -step);
    else if (event.key === "ArrowDown") panBy(0, step);
    else if (event.key === "+" || event.key === "=") setZoom((z) => Math.min(4, z + 0.1));
    else if (event.key === "-") setZoom((z) => Math.max(1, z - 0.1));
    else return;
    event.preventDefault();
    event.stopPropagation();
  };

  const accept = async () => {
    if (!img || !file) return;
    setBusy(true);
    try {
      // Pausa breve para que se pinte el indicador de carga antes de recodificar.
      await new Promise((r) => window.setTimeout(r, 30));
      if (keepGif) {
        const raw = await readFileAsDataUrl(file);
        if (raw.startsWith("data:image/gif;base64,")) {
          onDone(raw);
          return;
        }
      }
      onDone(renderAvatar(img, rotation, rect));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se ha podido procesar la imagen.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={file !== null}
      onClose={onClose}
      size="lg"
      icon={<ImageIcon />}
      title="Tu imagen de perfil"
      description="Se guarda optimizada, sin metadatos (EXIF, ubicación…) y solo en este equipo."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" loading={busy} disabled={!img || Boolean(error)} onClick={() => void accept()}>
            Usar imagen
          </Button>
        </>
      }
    >
      {error ? (
        <p role="alert" className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm text-fg">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-danger-text" aria-hidden />
          {error}
        </p>
      ) : (
        <div className="space-y-4">
          <div className="avatar-stage relative overflow-hidden rounded-2xl border border-border">
            <canvas
              ref={stageRef}
              role="img"
              aria-label={cropping ? "Vista previa del encuadre: arrastra o usa las flechas para moverlo y + o − para el zoom" : "Vista previa de la imagen completa"}
              tabIndex={cropping ? 0 : -1}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
              className={cn("block h-[300px] w-full touch-none sm:h-[340px]", cropping ? "cursor-grab active:cursor-grabbing" : "cursor-default")}
            />
            {!img ? <p className="absolute inset-0 grid place-items-center text-sm text-fg-muted">Cargando la imagen…</p> : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={cropping ? "soft" : "secondary"}
              size="sm"
              aria-pressed={cropping}
              leftIcon={<Crop className="size-3.5" />}
              disabled={!img}
              onClick={() => {
                setCropping((c) => !c);
                setZoom(1);
                setOffset({ x: 0, y: 0 });
              }}
            >
              {cropping ? "Usar la imagen entera" : "Ajustar encuadre"}
            </Button>
            <Button
              size="sm"
              leftIcon={<RotateCw className="size-3.5" />}
              disabled={!img}
              onClick={() => {
                setRotation((r) => ((r + 90) % 360) as Rotation);
                setOffset({ x: 0, y: 0 });
              }}
            >
              Girar 90°
            </Button>
            {out ? (
              <span className="ml-auto text-xs tabular-nums text-fg-muted">
                {keepGif ? "GIF original, con su animación" : `Se guardará a ${formatInt(out.w)} × ${formatInt(out.h)} px`}
              </span>
            ) : null}
          </div>

          {cropping ? (
            <div className="grid gap-4 rounded-xl border border-border bg-surface-2/50 p-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
              <Segmented
                label="Proporción del encuadre"
                size="sm"
                value={aspect}
                onChange={(a) => {
                  setAspect(a);
                  setOffset({ x: 0, y: 0 });
                }}
                options={[
                  { value: "free", label: "Libre" },
                  { value: "square", label: "Cuadrado" },
                  { value: "3:4", label: "3:4" },
                  { value: "4:3", label: "4:3" },
                ]}
              />
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-fg-muted">Zoom</span>
                <Slider label="Zoom" min={1} max={4} step={0.05} value={zoom} onChange={setZoom} valueText={`${zoom.toFixed(1)}×`} />
                <span className="w-9 text-right text-xs font-semibold tabular-nums text-fg">{zoom.toFixed(1)}×</span>
              </div>
            </div>
          ) : null}

          {isGif ? (
            <p className="text-xs leading-5 text-fg-muted">
              {keepGif
                ? "Los GIF de hasta 2 MB se guardan tal cual, con su animación."
                : (file?.size ?? 0) > MAX_AVATAR_BYTES
                  ? "Este GIF ocupa más de 2 MB: se guardará su primer fotograma."
                  : "Al girar o ajustar el encuadre, el GIF se guarda como imagen fija."}
            </p>
          ) : null}
        </div>
      )}
    </Dialog>
  );
}
