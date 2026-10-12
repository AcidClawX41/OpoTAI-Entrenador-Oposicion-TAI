# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Diagramas de la teoría: fuentes Mermaid o SVG a mano → SVG estáticos y seguros.

Uso::

    cd tools
    uv run python -m opotai.diagrams                 # genera los que han cambiado
    uv run python -m opotai.diagrams IV.7 II.1       # solo esos temas (o «IV.7/osi-tcpip»)
    uv run python -m opotai.diagrams --force         # regenera todos
    uv run python -m opotai.diagrams --check         # no escribe; sin node ni Chromium (CI)

Fuentes en ``tools/sources/diagramas/<tema>/<nombre>.mmd`` (Mermaid; se pueden pegar tal cual en
https://mermaid.live) o ``<nombre>.svg`` (dibujados a mano). Salida en
``data/teoria/diagramas/<tema>-<nombre>.svg`` (versionada) y referencia en el Markdown del tema con
``![Texto alternativo](diagramas/<tema>-<nombre>.svg)``. El núcleo la sirve como
``data:image/svg+xml;base64,…`` y la interfaz la muestra sobre una hoja blanca con zoom.

* Mermaid se renderiza **en tiempo de compilación** con ``@mermaid-js/mermaid-cli`` (versión fijada
  en :data:`MERMAID_CLI`) y el Chromium preinstalado (``PUPPETEER_EXECUTABLE_PATH`` o el primero de
  ``/opt/pw-browsers``; nunca se descarga un navegador). Configuración propia (:data:`MERMAID_CONFIG`):
  tema ``base`` con la paleta de la app, fuente Inter y ``htmlLabels: false`` (sin ``foreignObject``).
* El SVG resultante se normaliza: ``viewBox`` entero, ``width``/``height`` iguales a él (tamaño
  intrínseco), sin ``style`` de anchura máxima ni fondo, id propio y comentario de procedencia con
  el hash de la fuente.
* Cada salida pasa :func:`opotai.figures.check_svg` (sin ``<script>``, ``on…=``, ``foreignObject``,
  ``href`` externos, ``@import``, ``data:``…; letra ≥ 13 px; ≤ 150 KB aquí).
* ``--check`` comprueba que cada fuente tiene su salida al día (por el hash del comentario), que
  cada salida es segura, que no hay salidas huérfanas y que cada imagen ``diagramas/…`` citada en
  ``data/teoria/*.md`` existe y lleva texto alternativo.

Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import glob
import hashlib
import json
import math
import os
import re
import shutil
import subprocess
import sys
import tempfile
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from pathlib import Path

from .paths import DATA_DIR, SOURCES_DIR, rel

SRC_DIR = SOURCES_DIR / "diagramas"
THEORY_DIR = DATA_DIR / "teoria"
OUT_DIR = THEORY_DIR / "diagramas"

#: Versión exacta de mermaid-cli (se ejecuta con ``npx --yes``).
MERMAID_CLI = "@mermaid-js/mermaid-cli@11.17.0"
#: Súbelo al cambiar :func:`_normalize_mermaid` (invalida las salidas Mermaid).
NORMALIZE_VERSION = "2"
#: Ancho a partir del cual la letra mínima (13 px) baja de 12 px al verse a 900 px.
MAX_COMFORT_WIDTH = 975
#: Tamaño máximo de un diagrama de la teoría.
MAX_DIAGRAM_BYTES = 150_000

TOPIC_RE = re.compile(r"^(?:I|II|III|IV)\.[1-9][0-9]?$")
NAME_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")
DIAGRAM_REF_RE = re.compile(r"^diagramas/((?:I|II|III|IV)\.[0-9]+-[a-z0-9][a-z0-9-]*\.svg)$")
STAMP_RE = re.compile(r"<!-- opotai\.diagrams: (\S+) sha256=([0-9a-f]{16}) -->")

SVG_NS = "http://www.w3.org/2000/svg"
FONT = "Inter, system-ui, sans-serif"

#: Paleta común (hoja blanca). Gama por nivel: ver tools/README.md («Diagramas de la teoría»).
PALETTE = {
    "ink": "#1f2937",
    "muted": "#475569",
    "line": "#64748b",
    "accent": "#7c3aed",
    "accent_soft": "#ede9fe",
    "accent_line": "#8b5cf6",
    "note": "#fef9c3",
    "note_line": "#ca8a04",
    "surface": "#f8fafc",
}

MERMAID_CONFIG: dict = {
    "theme": "base",
    "fontFamily": FONT,
    "htmlLabels": False,
    "themeVariables": {
        "fontFamily": FONT,
        "fontSize": "15px",
        "background": "#ffffff",
        "primaryColor": PALETTE["accent_soft"],
        "primaryBorderColor": PALETTE["accent_line"],
        "primaryTextColor": PALETTE["ink"],
        "secondaryColor": "#e0f2fe",
        "secondaryBorderColor": "#0284c7",
        "secondaryTextColor": PALETTE["ink"],
        "tertiaryColor": PALETTE["surface"],
        "tertiaryBorderColor": "#94a3b8",
        "tertiaryTextColor": PALETTE["ink"],
        "lineColor": PALETTE["line"],
        "textColor": PALETTE["ink"],
        "mainBkg": PALETTE["accent_soft"],
        "nodeBorder": PALETTE["accent_line"],
        "clusterBkg": PALETTE["surface"],
        "clusterBorder": "#cbd5e1",
        "titleColor": PALETTE["ink"],
        "edgeLabelBackground": "#ffffff",
        "noteBkgColor": PALETTE["note"],
        "noteBorderColor": PALETTE["note_line"],
        "noteTextColor": PALETTE["ink"],
        "actorBkg": PALETTE["accent_soft"],
        "actorBorder": PALETTE["accent_line"],
        "actorTextColor": PALETTE["ink"],
        "actorLineColor": "#94a3b8",
        "signalColor": PALETTE["ink"],
        "signalTextColor": PALETTE["ink"],
        "labelBoxBkgColor": PALETTE["accent_soft"],
        "labelBoxBorderColor": PALETTE["accent_line"],
        "labelTextColor": PALETTE["ink"],
        "loopTextColor": PALETTE["ink"],
        "activationBkgColor": "#ddd6fe",
        "activationBorderColor": PALETTE["accent"],
        "sequenceNumberColor": "#ffffff",
        "stateBkg": PALETTE["accent_soft"],
        "stateBorder": PALETTE["accent_line"],
        "transitionColor": PALETTE["line"],
        "transitionLabelColor": PALETTE["ink"],
        "stateLabelColor": PALETTE["ink"],
        "compositeBackground": PALETTE["surface"],
        "compositeTitleBackground": "#ede9fe",
        "altBackground": "#f1f5f9",
        "classText": PALETTE["ink"],
    },
    "markdownAutoWrap": False,
    "flowchart": {
        "htmlLabels": False,
        "useMaxWidth": False,
        "curve": "basis",
        "padding": 12,
        "wrappingWidth": 300,
        "nodeSpacing": 36,
        "rankSpacing": 44,
        "diagramPadding": 8,
    },
    "sequence": {
        "useMaxWidth": False,
        "mirrorActors": False,
        "actorFontSize": 15,
        "messageFontSize": 15,
        "noteFontSize": 14,
        "actorFontFamily": FONT,
        "messageFontFamily": FONT,
        "noteFontFamily": FONT,
        "boxMargin": 8,
        "messageMargin": 34,
        "width": 120,
        "actorMargin": 30,
        "noteMargin": 8,
    },
    "state": {"useMaxWidth": False},
    "class": {"useMaxWidth": False, "htmlLabels": False, "nodeSpacing": 30, "rankSpacing": 40},
    "er": {"useMaxWidth": False, "fontSize": 14, "nodeSpacing": 50, "rankSpacing": 50},
    "gantt": {"useMaxWidth": False, "fontSize": 14, "sectionFontSize": 14},
    "timeline": {"useMaxWidth": False},
    "mindmap": {"useMaxWidth": False},
}

#: CSS añadido a cada diagrama Mermaid (letra mínima legible y fuente común).
MERMAID_CSS = f"""
svg {{ font-family: {FONT}; }}
.edgeLabel, .messageText, .noteText, .labelText, .loopText {{ font-size: 14px; }}
"""


class DiagramError(Exception):
    """Fuente o salida no válida."""


@dataclass(frozen=True)
class Source:
    topic: str
    name: str
    path: Path

    @property
    def kind(self) -> str:
        return "mermaid" if self.path.suffix == ".mmd" else "svg"

    @property
    def out_name(self) -> str:
        return f"{self.topic}-{self.name}.svg"

    @property
    def out_path(self) -> Path:
        return OUT_DIR / self.out_name

    @property
    def key(self) -> str:
        return f"{self.topic}/{self.name}"

    def digest(self) -> str:
        h = hashlib.sha256(self.path.read_bytes())
        if self.kind == "mermaid":
            h.update(MERMAID_CLI.encode())
            h.update(json.dumps(MERMAID_CONFIG, sort_keys=True).encode())
            h.update(MERMAID_CSS.encode())
            h.update(NORMALIZE_VERSION.encode())
        return h.hexdigest()[:16]


def discover(src_dir: Path = SRC_DIR) -> list[Source]:
    """Fuentes ``<tema>/<nombre>.mmd|svg`` (error si el nombre no sigue la convención)."""
    out: list[Source] = []
    seen: dict[str, Path] = {}
    if not src_dir.is_dir():
        return out
    for path in sorted(src_dir.rglob("*")):
        if not path.is_file() or path.name.startswith(".") or path.suffix not in (".mmd", ".svg"):
            continue
        relp = path.relative_to(src_dir)
        if len(relp.parts) != 2 or not TOPIC_RE.match(relp.parts[0]) or not NAME_RE.match(path.stem):
            raise DiagramError(
                f"{rel(path)}: usa tools/sources/diagramas/<tema>/<nombre>.mmd|svg "
                "(tema como «IV.7»; nombre en minúsculas, cifras y guiones)"
            )
        src = Source(relp.parts[0], path.stem, path)
        if src.key in seen:
            raise DiagramError(f"{rel(path)}: ya existe {rel(seen[src.key])} con el mismo nombre")
        seen[src.key] = path
        out.append(src)
    return out


# --- Comprobaciones ------------------------------------------------------------------------------


def check_diagram_svg(data: bytes, where: str) -> None:
    """Salida segura (:func:`opotai.figures.check_svg`) y de tamaño razonable."""
    from .figures import FigureError, check_svg

    if len(data) > MAX_DIAGRAM_BYTES:
        raise DiagramError(f"{where}: {len(data) // 1024} KB (máximo {MAX_DIAGRAM_BYTES // 1000} KB)")
    text = data.decode("utf-8", errors="replace")
    if "foreignObject" in text:
        raise DiagramError(f"{where}: contiene foreignObject (usa htmlLabels: false)")
    tag = re.search(r"&lt;/?[A-Za-z][^&]{0,20}&gt;", text)
    if tag:
        raise DiagramError(
            f"{where}: etiqueta HTML como texto ({tag.group(0)}); en Mermaid usa "
            '"`**negrita**`" y saltos de línea reales o <br/>'
        )
    try:
        check_svg(data, where)
    except FigureError as exc:
        raise DiagramError(str(exc)) from exc


def _svg_width(data: bytes) -> float | None:
    m = re.search(rb'<svg[^>]*?\swidth="([0-9.]+)', data)
    return float(m.group(1)) if m else None


def stamp_of(data: bytes) -> tuple[str, str] | None:
    m = STAMP_RE.search(data[:600].decode("utf-8", errors="replace"))
    return (m.group(1), m.group(2)) if m else None


def theory_diagram_refs(theory_dir: Path = THEORY_DIR) -> list[tuple[str, str, str]]:
    """Imágenes en línea de la teoría: ``(fichero .md, alt, ruta)`` (fuera de bloques de código)."""
    from .textutil import IMAGE_MD_RE, split_code

    refs = []
    for md in sorted(theory_dir.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        prose = "".join(chunk for chunk, is_code in split_code(text) if not is_code)
        for m in IMAGE_MD_RE.finditer(prose):
            refs.append((md.name, m.group(1), m.group(2)))
    return refs


def check_theory_images(theory_dir: Path = THEORY_DIR) -> tuple[list[str], list[str], set[str]]:
    """Referencias de imagen de la teoría: errores, avisos y ficheros ``diagramas/`` citados."""
    errors: list[str] = []
    warnings: list[str] = []
    used: set[str] = set()
    for md, alt, url in theory_diagram_refs(theory_dir):
        where = f"teoria/{md}"
        m = DIAGRAM_REF_RE.match(url)
        if not m:
            errors.append(f"{where}: imagen fuera de diagramas/<tema>-<nombre>.svg: {url!r}")
            continue
        used.add(m.group(1))
        target = theory_dir / url
        if not target.is_file():
            errors.append(f"{where}: no existe teoria/{url}")
        if len(alt.strip()) < 12:
            errors.append(f"{where}: {url} necesita un texto alternativo descriptivo")
        if not m.group(1).startswith(md.removesuffix(".md") + "-"):
            warnings.append(f"{where}: cita un diagrama de otro tema ({url})")
    return errors, warnings, used


def check_all(sources: list[Source] | None = None, *, full: bool = True) -> tuple[list[str], list[str]]:
    """Comprobación sin node ni Chromium (``full=False``: solo las salidas de ``sources``)."""
    errors: list[str] = []
    warnings: list[str] = []
    try:
        sources = discover() if sources is None else sources
    except DiagramError as exc:
        return [str(exc)], []
    expected = {s.out_name: s for s in sources}
    for s in sources:
        where = rel(s.out_path)
        if not s.out_path.is_file():
            errors.append(f"{where}: falta (genera con «uv run python -m opotai.diagrams {s.key}»)")
            continue
        data = s.out_path.read_bytes()
        try:
            check_diagram_svg(data, where)
        except DiagramError as exc:
            errors.append(str(exc))
        width = _svg_width(data)
        if width and width > MAX_COMFORT_WIDTH:
            warnings.append(
                f"{where}: {width:g} px de ancho; a 900 px la letra de 13 px queda en "
                f"{13 * 900 / width:.1f} px (compacta el diagrama o pártelo)"
            )
        st = stamp_of(data)
        if st is None or st[1] != s.digest():
            errors.append(f"{where}: no está al día con {rel(s.path)} (vuelve a generarlo)")
    if not full:
        return errors, warnings
    if OUT_DIR.is_dir():
        for out in sorted(OUT_DIR.glob("*")):
            if out.name not in expected and not out.name.startswith("."):
                errors.append(f"{rel(out)}: no tiene fuente en tools/sources/diagramas/")
    ref_errors, ref_warnings, used = check_theory_images()
    errors += ref_errors
    warnings += ref_warnings
    for name in sorted(set(expected) - used):
        warnings.append(f"teoria/diagramas/{name}: ningún tema lo cita")
    return errors, warnings


# --- Generación ----------------------------------------------------------------------------------


def find_chromium() -> str | None:
    env = os.environ.get("PUPPETEER_EXECUTABLE_PATH")
    if env and Path(env).is_file():
        return env
    for pattern in (
        "/opt/pw-browsers/chromium-*/chrome-linux/chrome",
        "/opt/pw-browsers/chromium-*/chrome-linux64/chrome",
    ):
        hits = sorted(glob.glob(pattern), reverse=True)
        if hits:
            return hits[0]
    for name in ("chromium", "chromium-browser", "google-chrome"):
        found = shutil.which(name)
        if found:
            return found
    return None


def _normalize_mermaid(raw: bytes, svg_id: str) -> bytes:
    """Tamaño intrínseco entero, sin estilos de anchura ni fondo, sin espacios de nombres ajenos."""
    ET.register_namespace("", SVG_NS)
    root = ET.fromstring(raw)
    vb = [float(v) for v in (root.get("viewBox") or "").replace(",", " ").split()]
    if len(vb) != 4:
        raise DiagramError("Mermaid no ha generado viewBox")
    x, y = math.floor(vb[0]), math.floor(vb[1])
    w = math.ceil(vb[0] + vb[2]) - x
    h = math.ceil(vb[1] + vb[3]) - y
    root.set("viewBox", f"{x} {y} {w} {h}")
    root.set("width", str(w))
    root.set("height", str(h))
    for attr in ("style", "class"):
        root.attrib.pop(attr, None)
    root.set("id", svg_id)
    root.set("role", "img")
    _raise_small_fonts(root)
    text = ET.tostring(root, encoding="unicode")
    # Mermaid declara xlink aunque no lo use; los href internos (#…) se conservan.
    text = text.replace(' xmlns:xlink="http://www.w3.org/1999/xlink"', "")
    text = re.sub(r"\s+\n", "\n", text)
    return text.encode("utf-8")


def _raise_small_fonts(root: ET.Element) -> None:
    """Sube a 13 px (mínimo de :func:`opotai.figures.check_svg`) toda letra menor de Mermaid.

    Afecta a las reglas de ``<style>`` (``div.mermaidTooltip`` 12 px en los flujos,
    ``g.classGroup text`` 10 px y ``.edgeTerminals`` 11 px en las clases), a los atributos
    ``font-size`` (números de ``autonumber`` en las secuencias, 12 px) y a los ``style`` en línea.
    """

    def css(text: str) -> str:
        return re.sub(
            r"font-size:\s*([0-9]*\.?[0-9]+)px",
            lambda m: m.group(0) if float(m.group(1)) >= 13 else "font-size:13px",
            text,
        )

    for el in root.iter():
        if el.tag == f"{{{SVG_NS}}}style" and el.text:
            el.text = css(el.text)
        if "style" in el.attrib:
            el.set("style", css(el.get("style", "")))
        size = el.get("font-size")
        if size:
            m = re.fullmatch(r"\s*([0-9]*\.?[0-9]+)(px)?\s*", size)
            if m and float(m.group(1)) < 13:
                el.set("font-size", "13px" if m.group(2) else "13")


def _with_stamp(body: bytes, src: Source) -> bytes:
    text = body.decode("utf-8").lstrip()
    text = re.sub(r"^<\?xml[^>]*\?>\s*", "", text)
    text = STAMP_RE.sub("", text).lstrip()
    stamp = f"<!-- opotai.diagrams: {rel(src.path)} sha256={src.digest()} -->\n"
    return (stamp + text.rstrip() + "\n").encode("utf-8")


def render_mermaid(src: Source, workdir: Path, chromium: str) -> bytes:
    cfg = workdir / "mermaid-config.json"
    css = workdir / "mermaid.css"
    pup = workdir / "puppeteer.json"
    if not cfg.exists():
        cfg.write_text(json.dumps(MERMAID_CONFIG), encoding="utf-8")
        css.write_text(MERMAID_CSS, encoding="utf-8")
        pup.write_text(json.dumps({"args": ["--no-sandbox", "--disable-gpu"]}), encoding="utf-8")
    out = workdir / f"{src.topic}-{src.name}.svg"
    svg_id = "d-" + re.sub(r"[^A-Za-z0-9-]", "-", f"{src.topic}-{src.name}")
    env = dict(os.environ, PUPPETEER_EXECUTABLE_PATH=chromium, PUPPETEER_SKIP_DOWNLOAD="1")
    cmd = [
        "npx", "--yes", MERMAID_CLI,
        "-i", str(src.path), "-o", str(out),
        "-c", str(cfg), "-C", str(css), "-p", str(pup),
        "-b", "transparent", "-I", svg_id, "-q",
    ]  # fmt: skip
    proc = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0 or not out.is_file():
        msg = (proc.stderr or proc.stdout).strip().splitlines()
        raise DiagramError(f"{rel(src.path)}: mermaid-cli ha fallado: {' / '.join(msg[-6:])}")
    return _normalize_mermaid(out.read_bytes(), svg_id)


def build_one(src: Source, workdir: Path, chromium: str | None) -> str:
    if src.kind == "mermaid":
        if chromium is None:
            raise DiagramError("no encuentro Chromium (define PUPPETEER_EXECUTABLE_PATH)")
        body = render_mermaid(src, workdir, chromium)
    else:
        body = src.path.read_bytes()
    data = _with_stamp(body, src)
    check_diagram_svg(data, rel(src.path))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    tmp = src.out_path.with_suffix(".svg.tmp")
    tmp.write_bytes(data)
    tmp.replace(src.out_path)
    return f"{rel(src.out_path)} ({len(data) // 1024 or 1} KB)"


def _selected(sources: list[Source], only: list[str]) -> list[Source]:
    if not only:
        return sources
    picked = [s for s in sources if s.topic in only or s.key in only]
    missing = [o for o in only if not any(o in (s.topic, s.key) for s in sources)]
    if missing:
        raise DiagramError(f"sin fuentes para: {', '.join(missing)}")
    return picked


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("only", nargs="*", help="temas («IV.7») o diagramas («IV.7/osi-tcpip»)")
    ap.add_argument("--check", action="store_true", help="solo comprobar (sin node ni Chromium)")
    ap.add_argument("--force", action="store_true", help="regenerar aunque estén al día")
    ap.add_argument("-j", "--jobs", type=int, default=4, help="renders de Mermaid en paralelo")
    args = ap.parse_args(argv)

    if args.check:
        errors, warnings = check_all()
        for w in warnings:
            print(f"AVISO  {w}")
        for e in errors:
            print(f"ERROR  {e}")
        print(f"Diagramas: {len(errors)} errores, {len(warnings)} avisos.")
        return 1 if errors else 0

    try:
        sources = _selected(discover(), args.only)
    except DiagramError as exc:
        print(f"ERROR  {exc}")
        return 1
    todo = []
    for s in sources:
        st = stamp_of(s.out_path.read_bytes()) if s.out_path.is_file() else None
        if args.force or st is None or st[1] != s.digest():
            todo.append(s)
    chromium = find_chromium() if any(s.kind == "mermaid" for s in todo) else None
    failed = 0
    with tempfile.TemporaryDirectory(prefix="opotai-diagramas-") as tmp:
        work = Path(tmp)
        # Prepara la configuración antes de lanzar los hilos.
        if chromium:
            render_cfg = work / "mermaid-config.json"
            render_cfg.write_text(json.dumps(MERMAID_CONFIG), encoding="utf-8")
            (work / "mermaid.css").write_text(MERMAID_CSS, encoding="utf-8")
            (work / "puppeteer.json").write_text(
                json.dumps({"args": ["--no-sandbox", "--disable-gpu"]}), encoding="utf-8"
            )

        def job(s: Source) -> tuple[Source, str | None, str | None]:
            try:
                return s, build_one(s, work, chromium), None
            except (DiagramError, subprocess.TimeoutExpired) as exc:
                return s, None, str(exc)

        with ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
            for _src, ok, err in pool.map(job, todo):
                if err:
                    failed += 1
                    print(f"ERROR  {err}")
                else:
                    print(f"generado  {ok}")
    print(f"Diagramas: {len(sources)} fuentes, {len(todo)} generados, {failed} errores.")
    if failed:
        return 1
    errors, warnings = check_all(sources, full=not args.only)
    for w in warnings:
        print(f"AVISO  {w}")
    for e in errors:
        print(f"ERROR  {e}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
