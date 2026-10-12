// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Imágenes de preguntas, enunciados y explicaciones: adaptadas al ancho, con
 * fondo claro (diagramas legibles también en modo oscuro), `alt` accesible y
 * zoom en un visor a pantalla completa.
 */
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Maximize2, Minimize2, X, ZoomIn } from "lucide-react";
import { cn } from "@/lib/cn";
import { useUi } from "@/store/ui";

interface ZoomableImageProps {
  src: string;
  alt: string;
  className?: string;
  /**
   * `zoomable`: la imagen es un botón que abre el visor.
   * `static`: imagen sin interacción (p. ej. dentro de una opción pulsable; el zoom va en un botón aparte).
   */
  mode?: "zoomable" | "static";
}

export function ZoomableImage({ src, alt, className, mode = "zoomable" }: ZoomableImageProps) {
  const open = useUi((s) => s.openLightbox);
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className={cn("my-2 flex items-center gap-2 rounded-lg border border-dashed border-border-strong px-3 py-2 text-[13px] text-fg-muted", className)}>
        Imagen no disponible: {alt || "sin descripción"}
      </span>
    );
  }
  const img = (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setFailed(true)}
      className="block h-auto max-w-full rounded-md"
    />
  );
  const frame = "inline-block max-w-full rounded-xl border border-border bg-white p-2 align-middle shadow-card";
  if (mode === "static") return <span className={cn(frame, "my-1", className)}>{img}</span>;
  return (
    <button
      type="button"
      onClick={() => open({ src, alt })}
      className={cn(frame, "group relative my-2 cursor-zoom-in transition-shadow hover:shadow-pop", className)}
      aria-label={`Ampliar imagen: ${alt || "sin descripción"}`}
    >
      {img}
      <span className="pointer-events-none absolute right-2 top-2 grid size-7 place-items-center rounded-lg bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
        <ZoomIn className="size-4" aria-hidden />
      </span>
    </button>
  );
}

/** Visor global (se monta una vez en la raíz). */
export function LightboxRoot() {
  const image = useUi((s) => s.lightbox);
  const close = useUi((s) => s.closeLightbox);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!image) return;
    setZoomed(false);
    useUi.getState().pushDialog();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      useUi.getState().popDialog();
    };
  }, [image, close]);

  if (typeof document === "undefined") return null;
  return createPortal(
    <AnimatePresence>
      {image ? (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={image.alt || "Imagen ampliada"}
          className="fixed inset-0 z-[90] flex flex-col bg-black/85 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-3 text-white/90">
            <p className="min-w-0 truncate text-sm">{image.alt}</p>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setZoomed((z) => !z)}
                className="grid size-9 place-items-center rounded-lg hover:bg-white/10"
                aria-label={zoomed ? "Ajustar a la pantalla" : "Ver a tamaño ampliado"}
              >
                {zoomed ? <Minimize2 className="size-4.5" /> : <Maximize2 className="size-4.5" />}
              </button>
              <button
                type="button"
                autoFocus
                onClick={close}
                className="grid size-9 place-items-center rounded-lg hover:bg-white/10"
                aria-label="Cerrar visor"
              >
                <X className="size-5" />
              </button>
            </div>
          </div>
          <div
            className={cn("min-h-0 flex-1 overflow-auto px-6 pb-6", zoomed ? "" : "grid place-items-center")}
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <motion.img
              key={image.src}
              src={image.src}
              alt={image.alt}
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.18 }}
              onClick={() => setZoomed((z) => !z)}
              className={cn(
                "rounded-lg bg-white p-3 shadow-2xl",
                zoomed ? "mx-auto max-w-none cursor-zoom-out" : "max-h-[82vh] max-w-[92vw] cursor-zoom-in object-contain",
              )}
              style={zoomed ? { width: "min(2400px, 180vw)" } : undefined}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
