# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Colocación de las figuras de los cuadernillos en el banco (contrato de datos, «Imágenes»).

El lector de cuadernillos (``booklet``) deja cada figura en su sitio según el orden de lectura,
con un marcador ``⟦FIG:i⟧`` en el punto exacto del texto cuando procede. Aquí se recortan a PNG y
se sustituyen los marcadores por imágenes Markdown, con nombres estables (relativos a
``data/banks/assets/<bank-id>/``):

* ``<sección>-statement-<k>.png``: k-ésima figura del enunciado de un supuesto, en línea en el
  punto del ``statement`` donde aparece. Si ese punto no existe (p. ej. un parche sustituye el
  enunciado), va a ``media`` de la sección.
* ``<sección>-q<NNN>.png`` (reserva: ``<sección>-r<k>.png``): figura de una pregunta, en línea en
  ``text`` si le sigue más texto o en ``media`` de la pregunta si está al final; con varias
  figuras en la misma pregunta se numeran ``-1``, ``-2``…
* ``<sección>-q<NNN>-opt-<letra>.png``: figura dentro de una opción (en línea en esa opción).

Metadatos por nombre de figura en ``figures`` de ``exam_configs/<bank-id>.json``:

* ``alt`` (obligatorio): texto alternativo descriptivo en castellano, sin corchetes.
* ``transcription``: reconstrucción en Markdown (texto o lista de líneas) del contenido de la
  figura (tablas, código, atributos de un modelo de datos) que se inserta tras la imagen.
* ``image``: ``false`` para no conservar la imagen cuando la transcripción la sustituye del todo
  (tablas o código sin disposición visual relevante).
* ``dpi``: resolución de renderizado (por defecto 200 ppp; mínimo 144, es decir, ≥ 2×).
* ``redraw``: reconstrucción vectorial dibujada a mano (SVG) de la figura, con su fuente en
  ``tools/sources/redraws/<bank-id>/<fichero>.svg`` (o ``<otro-banco>/<fichero>.svg`` para
  compartirla entre bancos). Se copia a ``assets/<bank-id>/<nombre>-redibujo.svg`` y se inserta
  **antes** del original: ``![Reconstrucción de OpoTAI: <alt>](…-redibujo.svg)``, la línea
  ``*Original escaneado del cuadernillo:*`` (``*Original del cuadernillo:*`` si la página tiene
  capa de texto, es decir, no es un escaneo), la imagen original y la transcripción. El SVG debe
  ser autónomo y seguro (ver :func:`check_svg`). Sin ``redraw`` la salida no cambia.
* ``enhance``: figura escaneada; ``true`` (o un objeto con ``white``, ``gamma``, ``sharpen`` y
  ``despeckle``) recorta a la **resolución nativa** del escaneo (la imagen incrustada, sin
  remuestrear) y aplica una limpieza fiel: niveles (papel a blanco, tinta a negro), gamma que
  oscurece los trazos, quitar motas aisladas y enfoque suave. No umbraliza ni inventa nada; no
  se combina con ``dpi``.
* ``erase``: con ``enhance``, rectángulos ``[x0, y0, x1, y1]`` (puntos de la página) que se
  pintan de blanco antes del recorte ajustado (restos del texto vecino que invaden el recorte).
"""

from __future__ import annotations

import io
import math
import re
import xml.etree.ElementTree as ET
from dataclasses import dataclass, field
from pathlib import Path

from .paths import SOURCES_DIR
from .pdfdoc import MAX_FIGURE_BYTES, MIN_DPI, Figure, RenderInfo, render_figure
from .textutil import FIGURE_PLACEHOLDER_RE

LETTERS = "abcd"
ASSET_SUFFIXES = {".png", ".jpg", ".jpeg", ".svg"}
REDRAWS_DIR = SOURCES_DIR / "redraws"
REDRAW_SUFFIX = "-redibujo.svg"
REDRAW_ALT_PREFIX = "Reconstrucción de OpoTAI: "
ORIGINAL_SCAN_LABEL = "*Original escaneado del cuadernillo:*"
ORIGINAL_LABEL = "*Original del cuadernillo:*"
META_KEYS = {"alt", "transcription", "image", "dpi", "redraw", "enhance", "erase"}
ENHANCE_DEFAULTS: dict = {"white": 250, "gamma": 1.5, "sharpen": 50, "despeckle": True}
MAX_SVG_BYTES = 300_000
MIN_SVG_FONT_PX = 13.0


class FigureError(RuntimeError):
    pass


@dataclass
class FigureSource:
    fig: Figure
    doc: object  # pymupdf.Document


@dataclass
class QuestionFigures:
    section: str
    number: int
    reserve: bool
    figures: list[FigureSource] = field(default_factory=list)  # índice = marcador ⟦FIG:i⟧ del texto
    options: list[list[FigureSource]] = field(default_factory=list)  # por opción (A–D)
    targeted: list[FigureSource] = field(default_factory=list)  # «attach» explícito en la config


@dataclass
class PlacedFigure:
    name: str
    path: str | None  # assets/<bank-id>/<name>.png (None si solo se conserva la transcripción)
    target: str  # id de sección o de pregunta
    where: str  # descripción de la colocación (para el informe)
    transcription: bool
    info: RenderInfo | None = None
    redraw: str | None = None  # assets/<bank-id>/<name>-redibujo.svg (reconstrucción vectorial)
    enhanced: bool = False  # escaneo recortado a resolución nativa y limpiado


@dataclass
class FigurePlacement:
    placed: list[PlacedFigure] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    missing_assets: list[str] = field(default_factory=list)  # en modo comprobación (sin escribir)


def question_stem(section: str, number: int, reserve: bool) -> str:
    return f"{section}-r{number}" if reserve else f"{section}-q{number:03d}"


def _transcription(meta: dict) -> str | None:
    t = meta.get("transcription")
    if t is None:
        return None
    if isinstance(t, list):
        t = "\n".join(t)
    t = str(t).strip()
    return t or None


def check_figure_meta(meta: dict[str, dict]) -> None:
    for name, m in meta.items():
        alt = m.get("alt")
        if not isinstance(alt, str) or not alt.strip():
            raise FigureError(f"figura {name}: falta «alt» (texto alternativo descriptivo)")
        if any(ch in alt for ch in "[]\n"):
            raise FigureError(f"figura {name}: «alt» no puede contener corchetes ni saltos de línea")
        if m.get("image") is False and not _transcription(m):
            raise FigureError(f"figura {name}: «image»: false exige una transcripción")
        unknown = set(m) - META_KEYS
        if unknown:
            raise FigureError(f"figura {name}: claves desconocidas {sorted(unknown)}")
        if "redraw" in m:
            _redraw_rel(name, m["redraw"])
        if "enhance" in m:
            _enhance_options(name, m["enhance"])
            if "dpi" in m:
                raise FigureError(
                    f"figura {name}: «enhance» usa la resolución nativa del escaneo; quita «dpi»"
                )
        if "erase" in m:
            if not _enhance_options(name, m.get("enhance")):
                raise FigureError(f"figura {name}: «erase» solo se aplica con «enhance»")
            _erase_rects(name, m["erase"])


def _redraw_rel(name: str, value: object) -> str:
    """Ruta del SVG relativa a ``REDRAWS_DIR``: ``<fichero>.svg`` o ``<banco>/<fichero>.svg``."""
    if not isinstance(value, str) or not re.fullmatch(r"(?:[a-z0-9-]+/)?[A-Za-z0-9._-]+\.svg", value):
        raise FigureError(
            f"figura {name}: «redraw» debe ser «<fichero>.svg» o «<banco>/<fichero>.svg» "
            f"(en tools/sources/redraws/): {value!r}"
        )
    if ".." in value.split("/"):
        raise FigureError(f"figura {name}: «redraw» no puede salir de tools/sources/redraws/")
    return value


def _enhance_options(name: str, value: object) -> dict | None:
    if value is None or value is False:
        return None
    if value is True:
        return dict(ENHANCE_DEFAULTS)
    if not isinstance(value, dict):
        raise FigureError(f"figura {name}: «enhance» debe ser true/false o un objeto de parámetros")
    unknown = set(value) - set(ENHANCE_DEFAULTS)
    if unknown:
        raise FigureError(f"figura {name}: «enhance» con claves desconocidas {sorted(unknown)}")
    opts = {**ENHANCE_DEFAULTS, **value}
    ok = (
        isinstance(opts["white"], int)
        and 200 <= opts["white"] <= 255
        and isinstance(opts["gamma"], (int, float))
        and 0.5 <= opts["gamma"] <= 3.0
        and isinstance(opts["sharpen"], int)
        and 0 <= opts["sharpen"] <= 150
        and isinstance(opts["despeckle"], bool)
    )
    if not ok:
        raise FigureError(
            f"figura {name}: «enhance» fuera de rango (white 200–255, gamma 0,5–3, sharpen 0–150, "
            f"despeckle true/false): {value!r}"
        )
    return opts


def _erase_rects(name: str, value: object) -> list[tuple[float, float, float, float]]:
    rects = []
    for r in value if isinstance(value, list) else [None]:
        if (
            not isinstance(r, list)
            or len(r) != 4
            or not all(isinstance(v, (int, float)) for v in r)
            or not (r[0] < r[2] and r[1] < r[3])
        ):
            raise FigureError(f"figura {name}: «erase» debe ser una lista de [x0, y0, x1, y1]: {value!r}")
        rects.append((float(r[0]), float(r[1]), float(r[2]), float(r[3])))
    return rects


# --- Reconstrucciones vectoriales (SVG) ---------------------------------------------------------

_SVG_NS = "http://www.w3.org/2000/svg"
_SVG_FORBIDDEN = {
    "script", "foreignObject", "iframe", "object", "embed", "image", "feImage", "a", "audio", "video",
    "canvas", "animate", "animateMotion", "animateTransform", "set", "discard", "handler",
}  # fmt: skip
_NUM = r"[0-9]+(?:\.[0-9]+)?"


def _font_sizes(text: str) -> list[float]:
    return [float(m) for m in re.findall(r"font-size\s*:\s*(" + _NUM + r")\s*(?:px)?\s*(?:;|$|\})", text)]


def check_svg(data: bytes, where: str) -> None:
    """SVG autónomo y seguro para mostrarse como ``<img>`` (``data:image/svg+xml``) en la app.

    Sin ``<script>``, ``<foreignObject>``, imágenes, enlaces, animaciones, manejadores ``on…``,
    DOCTYPE/entidades, ``@import``/``@font-face``, ``data:`` ni referencias fuera del propio
    fichero (``href``/``url()`` solo a ``#id``); raíz ``<svg>`` con ``viewBox`` y con ``width`` y
    ``height`` iguales a su tamaño (tamaño intrínseco: la interfaz lo escala con ``max-width``; sin
    él la imagen colapsa dentro de un contenedor ajustado al contenido); tamaños de letra
    explícitos ≥ 13 px.
    """
    if len(data) > MAX_SVG_BYTES:
        raise FigureError(f"{where}: SVG de {len(data) // 1024} KB (máximo {MAX_SVG_BYTES // 1000} KB)")
    try:
        text = data.decode("utf-8")
    except UnicodeDecodeError as exc:
        raise FigureError(f"{where}: el SVG no está en UTF-8") from exc
    bad = re.search(r"<!DOCTYPE|<!ENTITY|@import|@font-face|javascript:|data:", text, re.I)
    if bad:
        raise FigureError(f"{where}: el SVG contiene «{bad.group(0)}» (no permitido)")
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        raise FigureError(f"{where}: SVG mal formado ({exc})") from exc
    if root.tag != f"{{{_SVG_NS}}}svg":
        raise FigureError(f'{where}: la raíz debe ser <svg xmlns="{_SVG_NS}">')
    vb = (root.get("viewBox") or "").replace(",", " ").split()
    if (
        len(vb) != 4
        or not all(re.fullmatch(r"-?" + _NUM, v) for v in vb)
        or float(vb[2]) <= 0
        or float(vb[3]) <= 0
    ):
        raise FigureError(f"{where}: falta un viewBox válido en <svg>")
    for attr, expected in (("width", vb[2]), ("height", vb[3])):
        got = root.get(attr) or ""
        if not re.fullmatch(_NUM + r"(?:px)?", got) or float(got.removesuffix("px")) != float(expected):
            raise FigureError(
                f"{where}: <svg {attr}> debe ser {expected} (el tamaño del viewBox), no {got!r}"
            )
    sizes: list[float] = []
    for el in root.iter():
        if not isinstance(el.tag, str) or not el.tag.startswith(f"{{{_SVG_NS}}}"):
            raise FigureError(f"{where}: elemento fuera del espacio de nombres SVG: {el.tag!r}")
        tag = el.tag.split("}", 1)[1]
        if tag in _SVG_FORBIDDEN:
            raise FigureError(f"{where}: elemento <{tag}> no permitido")
        values = list(el.attrib.items())
        if tag == "style":
            values.append(("style", el.text or ""))
        for key, value in values:
            local = key.rsplit("}", 1)[-1].lower()
            if local.startswith("on"):
                raise FigureError(f"{where}: atributo {local} no permitido")
            if local == "href" and not value.startswith("#"):
                raise FigureError(f"{where}: referencia externa no permitida ({value!r})")
            for target in re.findall(r"url\(\s*['\"]?([^'\")\s]*)", value):
                if not target.startswith("#"):
                    raise FigureError(f"{where}: url() externa no permitida ({target!r})")
            if local == "font-size":
                if not re.fullmatch(_NUM + r"(?:px)?", value.strip()):
                    raise FigureError(f"{where}: font-size en px sin unidades relativas: {value!r}")
                sizes.append(float(value.strip().removesuffix("px")))
            elif local == "style":
                sizes += _font_sizes(value)
    small = [s for s in sizes if s < MIN_SVG_FONT_PX]
    if small:
        raise FigureError(f"{where}: tamaño de letra {min(small):g} px < {MIN_SVG_FONT_PX:g} px")


def _is_scanned(src: FigureSource) -> bool:
    """La página de la figura es un escaneo: sin capa de texto y con alguna imagen."""
    page = src.doc[src.fig.page]
    return not page.get_text("text").strip() and bool(page.get_images())


# --- Escaneos: recorte a resolución nativa y limpieza fiel --------------------------------------


def _scan_images(page, clip) -> list[tuple[dict, object, float, float]]:
    """Imágenes no giradas que tocan el recorte: (info, bbox, px por pt en x, px por pt en y)."""
    import pymupdf

    hits = []
    for info in page.get_image_info(xrefs=True):
        bbox = pymupdf.Rect(info["bbox"])
        a, b, c, d, _e, _f = info["transform"]
        if bbox.is_empty or not bbox.intersects(clip) or info["width"] <= 0 or info["height"] <= 0:
            continue
        if abs(b) > 1e-6 or abs(c) > 1e-6 or a <= 0 or d <= 0:
            continue  # girada o volteada: no define una rejilla alineada con la página
        hits.append((info, bbox, info["width"] / bbox.width, info["height"] / bbox.height))
    return hits


def _is_colorful(img) -> bool:
    """Color con significado (p. ej. cardinalidades en azul), no solo el tinte del escáner."""
    from PIL import ImageChops

    if img.mode != "RGB":
        return False
    r, g, b = img.split()
    chroma = ImageChops.subtract(
        ImageChops.lighter(ImageChops.lighter(r, g), b), ImageChops.darker(ImageChops.darker(r, g), b)
    )
    hist = chroma.histogram()
    return sum(hist[41:]) >= 0.001 * img.width * img.height


def _native_crop(doc, fig: Figure, padding: float = 2.0):
    """Recorte de la figura a la resolución de la imagen escaneada, sin remuestrear.

    Si una sola imagen cubre el recorte, se recortan directamente sus píxeles (salvo que el PDF
    la transforme, p. ej. con /Decode, y no coincida con lo que se ve en la página). Si hay varias
    capas (escaneo comprimido por capas: fondo JPEG y máscaras de texto de 1 bit), se renderiza
    la página alineando la rejilla de píxeles con la de la imagen de mayor resolución, a 1:1.
    Devuelve (imagen PIL, origen x, origen y del recorte en pt, px/pt en x, px/pt en y).
    """
    import pymupdf
    from PIL import Image, ImageChops, ImageStat

    page = doc[fig.page]
    clip = pymupdf.Rect(fig.x0 - padding, fig.y0 - padding, fig.x1 + padding, fig.y1 + padding) & page.rect
    hits = _scan_images(page, clip)
    if not hits:
        raise FigureError(f"«enhance»: no hay ninguna imagen escaneada bajo la figura (p{fig.page + 1})")
    best = max(h[2] * h[3] for h in hits)
    info, bbox, sx, sy = max(
        (h for h in hits if h[2] * h[3] >= 0.98 * best), key=lambda h: (h[1] & clip).get_area()
    )
    low = max(sx, sy) * 72 < MIN_DPI
    if low:  # escaneo de menos de 144 ppp: se amplía a 2× (contrato de datos)
        sx = sy = MIN_DPI / 72
    ix0, iy0 = math.floor((clip.x0 - bbox.x0) * sx), math.floor((clip.y0 - bbox.y0) * sy)
    ix1, iy1 = math.ceil((clip.x1 - bbox.x0) * sx), math.ceil((clip.y1 - bbox.y0) * sy)
    grid = pymupdf.Rect(bbox.x0 + ix0 / sx, bbox.y0 + iy0 / sy, bbox.x0 + ix1 / sx, bbox.y0 + iy1 / sy)
    # Rejilla de la página alineada con la de la imagen (traslación subpíxel) para dibujarla 1:1.
    tx = -((bbox.x0 * sx) % 1.0)
    ty = -((bbox.y0 * sy) % 1.0)
    pix = page.get_pixmap(matrix=pymupdf.Matrix(sx, 0, 0, sy, tx, ty), clip=grid, alpha=False)
    rendered = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
    img = rendered
    if (
        len(hits) == 1
        and bbox.contains(clip)
        and not low
        and info.get("colorspace") in (1, 3)
        and not info.get("has-mask")
    ):
        try:
            raw = doc.extract_image(info["xref"])
            full = Image.open(io.BytesIO(raw["image"]))
            full.load()
        except Exception:  # noqa: BLE001 - formato raro: se queda el renderizado
            full = None
        if full is not None and full.size == (info["width"], info["height"]):
            direct = full.convert("RGB" if full.mode not in ("L", "RGB") else full.mode).crop(
                (ix0, iy0, ix1, iy1)
            )
            same = (
                direct.convert("RGB").resize(rendered.size)
                if direct.size != rendered.size
                else direct.convert("RGB")
            )
            if ImageStat.Stat(ImageChops.difference(same, rendered).convert("L")).mean[0] < 8:
                img = direct
    if img.mode == "RGB" and not _is_colorful(img):
        img = img.convert("L")
    return img, grid.x0, grid.y0, sx, sy


def _percentile(hist: list[int], q: float) -> int:
    total = sum(hist)
    acc = 0
    for v, n in enumerate(hist):
        acc += n
        if acc >= q * total:
            return v
    return len(hist) - 1


def enhance_scan(img, opts: dict):
    """Limpieza fiel de un escaneo (PIL ``L`` o ``RGB``), sin umbralizar.

    1. Niveles: el papel (el tono claro más frecuente, menos 5) y lo más claro que él (velo del
       escáner) pasan a blanco, sin superar ``white``; la tinta más oscura (percentil 0,5, como
       mucho 160) pasa a negro, con una curva ``gamma`` que oscurece los trazos grises sin
       romper las líneas finas (la gradación se conserva).
    2. Motas: se blanquean los píxeles de tinta sin ningún vecino de tinta (punteado del escáner).
    3. Enfoque suave (máscara de enfoque de radio 1).
    """
    from PIL import Image, ImageChops, ImageFilter

    color = img.mode == "RGB"
    hist = img.convert("L").histogram()
    paper = 128 + max(range(128), key=lambda i: hist[128 + i])
    white = min(opts["white"], paper - 5)
    black = min(_percentile(hist, 0.005), 160)
    black = min(black, white - 40)
    lut = [
        round(255 * min(1.0, max(0.0, (v - black) / (white - black))) ** opts["gamma"]) for v in range(256)
    ]
    out = img.point(lut * (3 if color else 1))
    if opts["despeckle"]:
        ink = out.convert("L").point(lambda v: 255 if v < 200 else 0)
        neighbours = ink.filter(ImageFilter.Kernel((3, 3), [1, 1, 1, 1, 0, 1, 1, 1, 1], scale=8))
        lonely = ImageChops.multiply(ink, neighbours.point(lambda v: 255 if v == 0 else 0))
        out = Image.composite(Image.new(out.mode, out.size, (255, 255, 255) if color else 255), out, lonely)
    if opts["sharpen"]:
        out = out.filter(ImageFilter.UnsharpMask(radius=1.0, percent=opts["sharpen"], threshold=2))
    return out


def _trim(img, margin: int, threshold: int = 16):
    """Recorte ajustado al contenido (conservando el modo de la imagen)."""
    bbox = img.convert("L").point(lambda v: 255 if 255 - v > threshold else 0).getbbox()
    if not bbox:
        return img
    x0, y0, x1, y1 = bbox
    return img.crop(
        (max(0, x0 - margin), max(0, y0 - margin), min(img.width, x1 + margin), min(img.height, y1 + margin))
    )


def render_scan(
    doc, fig: Figure, dest: Path, opts: dict, erase=(), max_bytes: int = MAX_FIGURE_BYTES
) -> RenderInfo:
    """Recorta una figura escaneada a su resolución nativa, la limpia y la guarda en PNG."""
    from PIL import Image, ImageDraw

    img, ox, oy, sx, sy = _native_crop(doc, fig)
    if erase:
        draw = ImageDraw.Draw(img)
        fill = (255, 255, 255) if img.mode == "RGB" else 255
        for x0, y0, x1, y1 in erase:
            draw.rectangle(
                (
                    math.floor((x0 - ox) * sx),
                    math.floor((y0 - oy) * sy),
                    math.ceil((x1 - ox) * sx) - 1,
                    math.ceil((y1 - oy) * sy) - 1,
                ),
                fill=fill,
            )
    img = _trim(enhance_scan(img, opts), margin=round(4.0 * sx))
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    data = buf.getvalue()
    quantized = False
    if len(data) > max_bytes and img.mode == "RGB":
        pal = img.quantize(colors=256, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        pbuf = io.BytesIO()
        pal.save(pbuf, format="PNG", optimize=True)
        if len(pbuf.getvalue()) < len(data):
            data, quantized = pbuf.getvalue(), True
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return RenderInfo(
        path=dest,
        dpi=round(sx * 72),
        width=img.width,
        height=img.height,
        bytes=len(data),
        quantized=quantized,
    )


class _Placer:
    def __init__(
        self,
        bank_id: str,
        meta: dict[str, dict],
        assets_dir: Path,
        write_assets: bool,
        redraws_dir: Path = REDRAWS_DIR,
    ):
        self.bank_id = bank_id
        self.meta = meta
        self.assets_dir = assets_dir
        self.write_assets = write_assets
        self.redraws_dir = redraws_dir
        self.out = FigurePlacement()
        self.used: set[str] = set()

    def _redraw(self, name: str, value: str) -> str:
        """Copia (o comprueba, sin escribir) el SVG de la reconstrucción y devuelve su ruta."""
        rel = _redraw_rel(name, value)
        source = self.redraws_dir / (rel if "/" in rel else f"{self.bank_id}/{rel}")
        if not source.is_file():
            raise FigureError(f"figura {name}: no existe la reconstrucción {source}")
        data = source.read_bytes()
        check_svg(data, f"figura {name} ({source.name})")
        fname = f"{name}{REDRAW_SUFFIX}"
        path = f"assets/{self.bank_id}/{fname}"
        dest = self.assets_dir / self.bank_id / fname
        if self.write_assets:
            if not dest.is_file() or dest.read_bytes() != data:
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(data)
        elif not dest.is_file() or dest.read_bytes() != data:
            self.out.missing_assets.append(path)
        return path

    def _render(self, name: str, src: FigureSource, target: str, where: str) -> tuple[str, PlacedFigure]:
        """Devuelve el Markdown de la figura (imagen y/o transcripción) y su registro."""
        if name in self.used:
            raise FigureError(f"nombre de figura repetido: {name}")
        self.used.add(name)
        meta = self.meta.get(name)
        if meta is None:
            raise FigureError(
                f"figura {name} ({where}, p{src.fig.page + 1}) sin metadatos: añade "
                f'"figures": {{"{name}": {{"alt": "…"}}}} a la configuración'
            )
        trans = _transcription(meta)
        keep_image = meta.get("image", True) is not False
        enhance = _enhance_options(name, meta.get("enhance"))
        path = None
        info = None
        if keep_image:
            fname = f"{name}.png"
            path = f"assets/{self.bank_id}/{fname}"
            dest = self.assets_dir / self.bank_id / fname
            if self.write_assets:
                if enhance:
                    erase = _erase_rects(name, meta.get("erase", []))
                    info = render_scan(src.doc, src.fig, dest, enhance, erase=erase)
                else:
                    info = render_figure(src.doc, src.fig, dest, dpi=meta.get("dpi"))
            elif not dest.is_file():
                self.out.missing_assets.append(path)
        redraw = self._redraw(name, meta["redraw"]) if meta.get("redraw") else None
        placed = PlacedFigure(name, path, target, where, trans is not None, info, redraw, bool(enhance))
        self.out.placed.append(placed)
        alt = meta["alt"].strip()
        parts = []
        if redraw:
            parts.append(f"![{REDRAW_ALT_PREFIX}{alt}]({redraw})")
            if path:
                parts.append(ORIGINAL_SCAN_LABEL if _is_scanned(src) else ORIGINAL_LABEL)
        if path:
            parts.append(f"![{alt}]({path})")
        if trans:
            parts.append(trans)
        return "\n\n".join(parts), placed

    def _media(self, name: str, src: FigureSource, target: str, where: str) -> tuple[list[dict], str | None]:
        """Entradas de ``media`` (reconstrucción primero, después el original) y transcripción."""
        md, placed = self._render(name, src, target, where)
        trans = _transcription(self.meta[name])
        alt = self.meta[name]["alt"].strip()
        media = []
        if placed.redraw:
            media.append({"path": placed.redraw, "alt": f"{REDRAW_ALT_PREFIX}{alt}"})
        if placed.path:
            media.append({"path": placed.path, "alt": alt})
        return media, trans


def _replace_placeholders(text: str, resolve) -> tuple[str, set[int]]:
    seen: set[int] = set()

    def repl(m) -> str:
        i = int(m.group(1))
        if i in seen:
            raise FigureError(f"marcador de figura repetido: {m.group(0)}")
        seen.add(i)
        return resolve(i)

    return FIGURE_PLACEHOLDER_RE.sub(repl, text), seen


def place_figures(
    bank: dict,
    meta: dict[str, dict],
    section_figs: dict[str, list[FigureSource]],
    question_figs: dict[str, QuestionFigures],
    assets_dir: Path,
    write_assets: bool,
    redraws_dir: Path = REDRAWS_DIR,
) -> FigurePlacement:
    """Recorta las figuras y las coloca en ``bank`` (lo modifica). Ver la documentación del módulo."""
    check_figure_meta(meta)
    bank_id = bank["id"]
    pl = _Placer(bank_id, meta, assets_dir, write_assets, redraws_dir)
    for sec in bank["sections"]:
        sid = sec["id"]
        figs = section_figs.get(sid, [])
        # 1) Enunciado del supuesto: marcadores en orden de aparición.
        counter = 0
        in_statement: set[int] = set()
        if sec.get("statement"):

            def resolve_stmt(i: int, sid=sid, figs=figs) -> str:
                nonlocal counter
                if i >= len(figs):
                    raise FigureError(f"{sid}: marcador de figura {i} sin figura")
                counter += 1
                md, _ = pl._render(f"{sid}-statement-{counter}", figs[i], sid, "enunciado (en línea)")
                return md

            sec["statement"], in_statement = _replace_placeholders(sec["statement"], resolve_stmt)
        for i, src in enumerate(figs):
            if i in in_statement:
                continue
            counter += 1
            name = f"{sid}-statement-{counter}"
            media, trans = pl._media(name, src, sid, "media de la sección")
            if media:
                sec["media"].extend(media)
            if trans:
                if not sec.get("statement"):
                    raise FigureError(f"{name}: transcripción sin enunciado donde insertarla")
                sec["statement"] += "\n\n" + trans
            pl.out.warnings.append(
                f"{name}: el enunciado no tiene el punto de la figura; se adjunta como media de la sección"
            )
        # 2) Preguntas
        for q in sec["questions"] + sec["reserve"]:
            qf = question_figs.get(q["id"])
            if qf is None:
                continue
            stem = question_stem(qf.section, qf.number, qf.reserve)
            total = len(qf.figures) + len(qf.targeted)

            def qname(k: int, stem=stem, total=total) -> str:
                return stem if total == 1 else f"{stem}-{k}"

            k = 0
            names: dict[int, str] = {}
            for i in range(len(qf.figures)):
                k += 1
                names[i] = qname(k)

            def resolve_q(i: int, qf=qf, names=names, q=q) -> str:
                if i >= len(qf.figures):
                    raise FigureError(f"{q['id']}: marcador de figura {i} sin figura")
                md, _ = pl._render(names[i], qf.figures[i], q["id"], "texto de la pregunta (en línea)")
                return md

            q["text"], inline = _replace_placeholders(q["text"], resolve_q)
            extra = [(names[i], src) for i, src in enumerate(qf.figures) if i not in inline]
            for src in qf.targeted:
                k += 1
                extra.append((qname(k), src))
            for name, src in extra:
                media, trans = pl._media(name, src, q["id"], "media de la pregunta")
                if media:
                    q["media"].extend(media)
                if trans:
                    q["text"] = (q["text"] + "\n\n" + trans).strip()
            # 3) Opciones
            for j, ofigs in enumerate(qf.options):
                for n, src in enumerate(ofigs, 1):
                    name = f"{stem}-opt-{LETTERS[j]}" + (f"-{n}" if len(ofigs) > 1 else "")
                    md, _ = pl._render(name, src, q["id"], f"opción {LETTERS[j].upper()} (en línea)")
                    q["options"][j] = (q["options"][j] + "\n\n" + md).strip()
    unused = set(meta) - pl.used
    if unused:
        raise FigureError(f"metadatos de figuras sin figura: {sorted(unused)}")
    return pl.out


def stale_assets(bank_id: str, assets_dir: Path, placement: FigurePlacement) -> list[Path]:
    """Ficheros de imagen de ``assets/<bank-id>/`` que ya no produce el banco."""
    d = assets_dir / bank_id
    if not d.is_dir():
        return []
    keep = {p.path.rsplit("/", 1)[-1] for p in placement.placed if p.path}
    keep |= {p.redraw.rsplit("/", 1)[-1] for p in placement.placed if p.redraw}
    return sorted(f for f in d.iterdir() if f.suffix.lower() in ASSET_SUFFIXES and f.name not in keep)
