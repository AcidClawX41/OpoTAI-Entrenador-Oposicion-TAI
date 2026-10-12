// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Renderizador Markdown (CommonMark + tablas GFM) de enunciados, opciones,
 * supuestos, explicaciones y teoría.
 *
 * Seguridad: sin HTML crudo; URLs con el filtro por defecto de react-markdown
 * salvo imágenes `data:image/*` (las que envía el núcleo con las imágenes
 * embebidas). Cualquier otro `data:`/`javascript:` queda bloqueado.
 */
import { memo, type ReactNode } from "react";
import ReactMarkdown, { defaultUrlTransform, type Components, type UrlTransform } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/cn";
import { openExternal } from "@/lib/platform";
import { tokenize } from "@/lib/highlight";
import { ZoomableImage } from "./ImageLightbox";

const SAFE_DATA_IMAGE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|svg\+xml)[;,]/i;

/** Permite `data:image/*` solo como origen de imágenes; el resto pasa por el filtro estándar. */
export const markdownUrlTransform: UrlTransform = (url, key) => {
  if (key === "src" && SAFE_DATA_IMAGE.test(url.trim())) return url.trim();
  return defaultUrlTransform(url);
};

/** Extrae las URLs de imagen de un texto Markdown (para botones de zoom aparte). */
export function markdownImages(md: string): { src: string; alt: string }[] {
  const out: { src: string; alt: string }[] = [];
  const re = /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md)) !== null) {
    const src = markdownUrlTransform(m[2] ?? "", "src", undefined as never);
    if (src) out.push({ src, alt: m[1] ?? "" });
  }
  return out;
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function textOf(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { type?: string; value?: string; children?: unknown[] };
  if (n.type === "text") return n.value ?? "";
  return (n.children ?? []).map(textOf).join("");
}

function childText(children: ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(childText).join("");
  if (children && typeof children === "object" && "props" in children)
    return childText((children as { props: { children?: ReactNode } }).props.children);
  return "";
}

export function CodeBlock({ code, lang }: { code: string; lang?: string | null }) {
  const language = (lang ?? "").toLowerCase();
  const tokens = language ? tokenize(code.replace(/\n$/, ""), language) : null;
  return (
    <div className="relative">
      {language ? (
        <span className="absolute right-2.5 top-2 select-none rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-fg-subtle">
          {language}
        </span>
      ) : null}
      <pre>
        <code>
          {tokens
            ? tokens.map((t, i) =>
                t.kind === "t" ? (
                  <span key={i}>{t.text}</span>
                ) : (
                  <span key={i} className={`tok-${t.kind}`}>
                    {t.text}
                  </span>
                ),
              )
            : code.replace(/\n$/, "")}
        </code>
      </pre>
    </div>
  );
}

interface MarkdownProps {
  children: string;
  className?: string;
  /** Sin márgenes de párrafo (opciones de respuesta). */
  inline?: boolean;
  /** `static`: imágenes sin botón de zoom (dentro de elementos pulsables). */
  imageMode?: "zoomable" | "static";
  /** Añade ids a los títulos (índice de la teoría). */
  headingIds?: boolean;
}

function buildComponents(inline: boolean, imageMode: "zoomable" | "static", headingIds: boolean): Components {
  const heading = (Tag: "h1" | "h2" | "h3" | "h4") =>
    function Heading({ children }: { children?: ReactNode }) {
      const id = headingIds ? slugify(childText(children)) : undefined;
      return <Tag id={id}>{children}</Tag>;
    };
  return {
    p: ({ children }) => (inline ? <span className="block [&+&]:mt-2">{children}</span> : <p>{children}</p>),
    img: ({ src, alt }) =>
      typeof src === "string" && src ? <ZoomableImage src={src} alt={alt ?? ""} mode={imageMode} /> : null,
    pre: ({ node, children }) => {
      const code = (node as { children?: { type?: string; tagName?: string; properties?: { className?: unknown } }[] } | undefined)
        ?.children?.[0];
      if (code && code.type === "element" && code.tagName === "code") {
        const classes = Array.isArray(code.properties?.className) ? (code.properties?.className as string[]) : [];
        const lang = classes.find((c) => c.startsWith("language-"))?.slice("language-".length) ?? null;
        return <CodeBlock code={textOf(code)} lang={lang} />;
      }
      return <pre>{children}</pre>;
    },
    table: ({ children }) => (
      <div className="table-wrap" role="region" aria-label="Tabla" tabIndex={0}>
        <table>{children}</table>
      </div>
    ),
    a: ({ href, children }) => (
      <a
        href={href}
        onClick={(e) => {
          e.preventDefault();
          if (href) void openExternal(href);
        }}
        rel="noreferrer"
      >
        {children}
      </a>
    ),
    h1: heading("h1"),
    h2: heading("h2"),
    h3: heading("h3"),
    h4: heading("h4"),
  };
}

const COMPONENTS = {
  block: buildComponents(false, "zoomable", false),
  blockIds: buildComponents(false, "zoomable", true),
  inline: buildComponents(true, "static", false),
  inlineZoom: buildComponents(true, "zoomable", false),
  blockStatic: buildComponents(false, "static", false),
};

export const Markdown = memo(function Markdown({ children, className, inline = false, imageMode, headingIds = false }: MarkdownProps) {
  const mode = imageMode ?? (inline ? "static" : "zoomable");
  const components = inline
    ? mode === "static"
      ? COMPONENTS.inline
      : COMPONENTS.inlineZoom
    : headingIds
      ? COMPONENTS.blockIds
      : mode === "static"
        ? COMPONENTS.blockStatic
        : COMPONENTS.block;
  return (
    <div className={cn("prose-opo", inline && "inline-prose", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} urlTransform={markdownUrlTransform} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
});
