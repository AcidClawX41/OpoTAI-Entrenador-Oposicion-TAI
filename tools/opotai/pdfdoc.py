# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Extracción de texto con posiciones a partir de PDFs (PyMuPDF).

Convierte cada página en una secuencia de *elementos* ordenados por posición vertical:

* :class:`Row`: una línea visual (spans con la misma línea base), con sus spans ordenados por x.
* :class:`Figure`: una imagen incrustada (o una región configurada) que puede recortarse a PNG.

El resto del parser (``parse_exam``) trabaja sobre estos elementos sin depender de PyMuPDF.
"""

from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass, field
from pathlib import Path

import pymupdf

# Fuentes monoespaciadas habituales en los cuadernillos (para detectar código).
MONO_FONT_RE = re.compile(r"courier|consol|mono|lucida ?console|menlo", re.I)
BOLD_FONT_RE = re.compile(r"bold|black|heavy|semibold|demi", re.I)
ITALIC_FONT_RE = re.compile(r"italic|oblique", re.I)


@dataclass
class Span:
    text: str
    x0: float
    y0: float
    x1: float
    y1: float
    baseline: float
    font: str
    size: float
    bold: bool
    italic: bool
    mono: bool
    color: int = 0
    ref: int | None = None  # OCR: índice de la palabra en la página de la caché

    @property
    def is_blank(self) -> bool:
        return not self.text.strip()


@dataclass
class Row:
    page: int  # 0-based
    spans: list[Span]

    @property
    def y0(self) -> float:
        return min(s.y0 for s in self.spans)

    @property
    def y1(self) -> float:
        return max(s.y1 for s in self.spans)

    @property
    def baseline(self) -> float:
        return sorted(s.baseline for s in self.spans)[len(self.spans) // 2]

    @property
    def x0(self) -> float:
        return min(s.x0 for s in self.visible_spans) if self.visible_spans else self.spans[0].x0

    @property
    def x1(self) -> float:
        return max(s.x1 for s in self.spans)

    @property
    def visible_spans(self) -> list[Span]:
        return [s for s in self.spans if not s.is_blank]

    @property
    def text(self) -> str:
        return join_spans(self.visible_spans)

    @property
    def size(self) -> float:
        vs = self.visible_spans or self.spans
        return max(s.size for s in vs)

    @property
    def all_bold(self) -> bool:
        vs = self.visible_spans
        return bool(vs) and all(s.bold for s in vs)

    def __repr__(self) -> str:  # pragma: no cover - depuración
        return f"Row(p{self.page + 1} y={self.y0:.1f} x={self.x0:.1f} {self.text!r})"


@dataclass
class Figure:
    page: int
    x0: float
    y0: float
    x1: float
    y1: float
    xref: int | None = None  # imagen incrustada (None = región vectorial configurada)
    name: str | None = None
    alt: str = ""
    attach: str | None = None  # "section" | id de pregunta | None (automático)
    extra: dict = field(default_factory=dict)

    @property
    def rect(self) -> pymupdf.Rect:
        return pymupdf.Rect(self.x0, self.y0, self.x1, self.y1)

    @property
    def width(self) -> float:
        return self.x1 - self.x0

    @property
    def height(self) -> float:
        return self.y1 - self.y0


Element = Row | Figure


def join_spans(spans: Iterable[Span], gap_space: float = 1.2) -> str:
    """Une spans de una misma fila insertando un espacio cuando hay hueco horizontal."""
    out: list[str] = []
    prev: Span | None = None
    for s in spans:
        if prev is not None:
            gap = s.x0 - prev.x1
            if gap > gap_space and not out[-1].endswith(" ") and not s.text.startswith(" "):
                out.append(" ")
        out.append(s.text)
        prev = s
    return "".join(out)


def _span_from_dict(s: dict) -> Span:
    font = s.get("font", "")
    flags = s.get("flags", 0)
    bold = bool(flags & 16) or bool(BOLD_FONT_RE.search(font))
    italic = bool(flags & 2) or bool(ITALIC_FONT_RE.search(font))
    mono = bool(flags & 8) or bool(MONO_FONT_RE.search(font))
    x0, y0, x1, y1 = s["bbox"]
    origin = s.get("origin", (x0, y1))
    return Span(
        text=s["text"],
        x0=x0,
        y0=y0,
        x1=x1,
        y1=y1,
        baseline=origin[1],
        font=font,
        size=round(s.get("size", 0.0), 2),
        bold=bold,
        italic=italic,
        mono=mono,
        color=s.get("color", 0),
    )


def page_spans(page: pymupdf.Page) -> list[Span]:
    flags = pymupdf.TEXT_PRESERVE_WHITESPACE | pymupdf.TEXT_MEDIABOX_CLIP
    d = page.get_text("dict", flags=flags)
    spans: list[Span] = []
    for block in d["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block["lines"]:
            # Ignorar texto rotado (marcas laterales, sellos…)
            dx, dy = line.get("dir", (1, 0))
            if abs(dy) > 0.01:
                continue
            for s in line["spans"]:
                if s["text"]:
                    spans.append(_span_from_dict(s))
    return spans


def group_rows(spans: list[Span], page: int, tolerance: float = 2.5) -> list[Row]:
    """Agrupa spans en filas visuales por línea base (con tolerancia)."""
    rows: list[list[Span]] = []
    for s in sorted(spans, key=lambda s: (s.baseline, s.x0)):
        if rows:
            ref = rows[-1]
            base = sorted(x.baseline for x in ref)[len(ref) // 2]
            if abs(s.baseline - base) <= tolerance:
                ref.append(s)
                continue
        rows.append([s])
    out = []
    for r in rows:
        r.sort(key=lambda s: s.x0)
        out.append(Row(page=page, spans=r))
    return out


def page_figures(doc: pymupdf.Document, page: pymupdf.Page, pno: int, min_size: float = 24.0) -> list[Figure]:
    figs: list[Figure] = []
    seen: set[tuple[int, int, int, int, int]] = set()
    for img in page.get_images(full=True):
        xref = img[0]
        try:
            rects = page.get_image_rects(xref)
        except Exception:  # pragma: no cover - PDFs raros
            rects = []
        for r in rects:
            if r.width < min_size or r.height < min_size:
                continue
            key = (xref, round(r.x0), round(r.y0), round(r.x1), round(r.y1))
            if key in seen:
                continue
            seen.add(key)
            figs.append(Figure(page=pno, x0=r.x0, y0=r.y0, x1=r.x1, y1=r.y1, xref=xref))
    return figs


def inside(span: Span, rect: tuple[float, float, float, float], margin: float = 1.0) -> bool:
    x0, y0, x1, y1 = rect
    cx = (span.x0 + span.x1) / 2
    cy = (span.y0 + span.y1) / 2
    return x0 - margin <= cx <= x1 + margin and y0 - margin <= cy <= y1 + margin


@dataclass
class PageFilter:
    """Qué descartar de cada página (cabeceras, pies, regiones)."""

    top: float | None = None  # descartar spans cuyo y1 < top
    bottom: float | None = None  # descartar spans cuyo y0 > bottom
    ignore_patterns: list[re.Pattern] = field(default_factory=list)  # filas completas a descartar
    exclude_rects: dict[int, list[tuple[float, float, float, float]]] = field(default_factory=dict)
    skip_pages: set[int] = field(default_factory=set)  # 0-based


def extract_elements(
    pdf_path: Path,
    flt: PageFilter | None = None,
    extra_figures: list[Figure] | None = None,
    detect_images: bool = True,
    ignore_image_xrefs: Iterable[int] = (),
    spans_override: dict[int, list[Span]] | None = None,
    row_tolerance: float = 2.5,
) -> tuple[pymupdf.Document, list[Element], list[str]]:
    """Devuelve el documento, los elementos (filas y figuras) en orden de lectura y las filas
    descartadas por posición que no coinciden con ningún patrón ``ignore`` (para avisar).

    ``spans_override`` sustituye la capa de texto del PDF por spans externos (OCR) por página.
    """
    flt = flt or PageFilter()
    doc = pymupdf.open(pdf_path)
    elements: list[Element] = []
    dropped: list[str] = []
    extra_by_page: dict[int, list[Figure]] = {}
    for f in extra_figures or []:
        extra_by_page.setdefault(f.page, []).append(f)
    ignore_xrefs = set(ignore_image_xrefs)
    for pno in range(len(doc)):
        if pno in flt.skip_pages:
            continue
        page = doc[pno]
        figs = list(extra_by_page.get(pno, []))
        if detect_images:
            for f in page_figures(doc, page, pno):
                if f.xref in ignore_xrefs:
                    continue
                # Si una figura configurada cubre la imagen, prevalece la configurada.
                if any(_overlap(f, g) > 0.5 for g in figs):
                    continue
                figs.append(f)
        excl = list(flt.exclude_rects.get(pno, [])) + [(f.x0, f.y0, f.x1, f.y1) for f in figs]
        spans = []
        outside: list[Span] = []
        source = spans_override.get(pno, []) if spans_override is not None else page_spans(page)
        for s in source:
            if (flt.top is not None and s.y1 < flt.top) or (flt.bottom is not None and s.y0 > flt.bottom):
                outside.append(s)
                continue
            if any(inside(s, r) for r in excl):
                continue
            spans.append(s)
        rows = group_rows(spans, pno, row_tolerance)
        if flt.ignore_patterns:
            rows = [r for r in rows if not row_ignored(r, flt.ignore_patterns)]
        # Filas descartadas por posición (cabecera/pie) que no son cabeceras/pies conocidos:
        # se avisa para no perder contenido en silencio.
        for r in group_rows(outside, pno, row_tolerance):
            t = r.text.strip()
            if t and not row_ignored(r, flt.ignore_patterns):
                dropped.append(f"p{pno + 1} y={r.y0:.0f}: {t[:80]!r}")
        items: list[tuple[float, int, Element]] = [(r.y0, 1, r) for r in rows if r.visible_spans]
        items += [(f.y0, 0, f) for f in figs]
        items.sort(key=lambda t: (t[0], t[1]))
        elements.extend(e for _, _, e in items)
    return doc, elements, dropped


def row_segments(row: Row, gap: float = 15.0) -> list[str]:
    """Textos de la fila separados por huecos horizontales grandes (p. ej. pie con dos columnas)."""
    segs: list[list[Span]] = []
    for s in row.visible_spans:
        if segs and s.x0 - segs[-1][-1].x1 < gap:
            segs[-1].append(s)
        else:
            segs.append([s])
    return [join_spans(sg).strip() for sg in segs]


def row_ignored(row: Row, patterns: list[re.Pattern]) -> bool:
    """La fila se descarta si coincide entera con un patrón, o si lo hacen todos sus segmentos."""
    if not patterns:
        return False
    text = row.text.strip()
    if any(p.search(text) for p in patterns):
        return True
    segs = [t for t in row_segments(row) if t]
    return bool(segs) and all(any(p.search(t) for p in patterns) for t in segs)


def _overlap(a: Figure, b: Figure) -> float:
    ix = max(0.0, min(a.x1, b.x1) - max(a.x0, b.x0))
    iy = max(0.0, min(a.y1, b.y1) - max(a.y0, b.y0))
    inter = ix * iy
    area = max(1e-6, a.width * a.height)
    return inter / area


MIN_DPI = 144  # ≥ 2× la resolución nominal del PDF (72 ppp)
DEFAULT_DPI = 200
MAX_DPI = 300
MAX_FIGURE_BYTES = 300_000


@dataclass
class RenderInfo:
    path: Path
    dpi: int
    width: int
    height: int
    bytes: int
    quantized: bool = False


def trim_whitespace(img, threshold: int = 16, margin: int = 8):
    """Recorta los márgenes blancos de una imagen PIL (recorte ajustado al contenido)."""
    from PIL import Image, ImageChops

    rgb = img.convert("RGB")
    diff = ImageChops.difference(rgb, Image.new("RGB", rgb.size, (255, 255, 255)))
    r, g, b = diff.split()
    strongest = ImageChops.lighter(ImageChops.lighter(r, g), b)
    bbox = strongest.point(lambda v: 255 if v > threshold else 0).getbbox()
    if not bbox:
        return rgb
    x0, y0, x1, y1 = bbox
    box = (
        max(0, x0 - margin),
        max(0, y0 - margin),
        min(rgb.width, x1 + margin),
        min(rgb.height, y1 + margin),
    )
    return rgb.crop(box)


def _png_bytes(img) -> bytes:
    import io

    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    return buf.getvalue()


def render_figure(
    doc: pymupdf.Document,
    fig: Figure,
    dest: Path,
    dpi: int | None = None,
    max_bytes: int = MAX_FIGURE_BYTES,
    padding: float = 2.0,
    trim: bool = True,
) -> RenderInfo:
    """Recorta la región de la figura a PNG rasterizando la página a ≥ 2× (≥ 144 ppp).

    Por defecto se usa 200 ppp (o la resolución nativa de la imagen incrustada si es mayor, hasta
    300), se recortan los márgenes blancos y, si el PNG supera ``max_bytes``, se baja la resolución
    (nunca por debajo de 144 ppp) y, como último recurso, se reduce a una paleta de 256 colores.
    """
    from PIL import Image

    page = doc[fig.page]
    clip = pymupdf.Rect(fig.x0 - padding, fig.y0 - padding, fig.x1 + padding, fig.y1 + padding) & page.rect
    if dpi is None:
        dpi = DEFAULT_DPI
        if fig.xref:
            try:
                info = doc.extract_image(fig.xref)
                native = info["width"] / max(1.0, fig.width / 72.0)
                dpi = int(min(MAX_DPI, max(DEFAULT_DPI, native)))
            except Exception:  # pragma: no cover
                pass
    cur = max(MIN_DPI, int(dpi))
    margin_pt = 4.0
    while True:
        pix = page.get_pixmap(clip=clip, dpi=cur, alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        if trim:
            img = trim_whitespace(img, margin=round(margin_pt * cur / 72))
        data = _png_bytes(img)
        if len(data) <= max_bytes or cur <= MIN_DPI:
            break
        cur = max(MIN_DPI, int(cur * 0.85))
    quantized = False
    if len(data) > max_bytes:
        pal = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pdata = _png_bytes(pal)
        if len(pdata) < len(data):
            data, quantized = pdata, True
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return RenderInfo(
        path=dest, dpi=cur, width=img.width, height=img.height, bytes=len(data), quantized=quantized
    )
