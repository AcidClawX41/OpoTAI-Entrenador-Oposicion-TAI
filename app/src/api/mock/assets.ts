// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Reescritura de imágenes en Markdown, como hace el núcleo: las referencias
 * `![alt](assets/…)` (rutas relativas a data/banks/) y, en la teoría,
 * `![alt](diagramas/…)` (relativas a data/teoria/) se sustituyen por una URL
 * que el navegador pueda cargar (data URI en el núcleo y en las preguntas de
 * ejemplo; endpoint de desarrollo para los datos reales en `pnpm dev`).
 */

const ASSET_REF = /(!\[[^\]]*\]\()\s*<?(assets\/[^)\s>]+)>?((?:\s+"[^"]*")?\s*\))/g;

export function rewriteAssetRefs(markdown: string, resolve: (path: string) => string | null): string {
  if (!markdown || !markdown.includes("assets/")) return markdown;
  return markdown.replace(ASSET_REF, (match, pre: string, path: string, post: string) => {
    const url = resolve(path);
    return url ? `${pre}${url}${post}` : match;
  });
}

const DIAGRAM_REF = /(!\[[^\]]*\]\()\s*<?(diagramas\/[\w.-]+\.svg)>?((?:\s+"[^"]*")?\s*\))/g;

/** Diagramas de la teoría (`![alt](diagramas/IV.7-osi-tcpip.svg)`). */
export function rewriteDiagramRefs(markdown: string, resolve: (path: string) => string | null): string {
  if (!markdown || !markdown.includes("diagramas/")) return markdown;
  return markdown.replace(DIAGRAM_REF, (match, pre: string, path: string, post: string) => {
    const url = resolve(path);
    return url ? `${pre}${url}${post}` : match;
  });
}
