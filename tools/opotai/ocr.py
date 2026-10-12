# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""OCR de cuadernillos escaneados (sin capa de texto) con Tesseract, con caché versionada.

Algunos cuadernillos del INAP son imágenes escaneadas. Este módulo rasteriza cada página
(PyMuPDF), la pasa por Tesseract (``spa``, una sola columna de texto: ``--psm 6``) y guarda las
**palabras con su posición** (en puntos PDF), su confianza y la línea de Tesseract a la que
pertenecen en ``tools/sources/ocr/<banco>/<fichero>.json``. Por defecto se hacen dos pasadas a
resoluciones distintas (300 y 400 ppp): la primera es la que se transcribe y la segunda sirve para
señalar palabras dudosas en la revisión (``opotai.ocr_review``). Con ``--single-pass`` solo se hace
la primera (extracción rápida; la revisión se apoya entonces en la confianza y el diccionario).

La caché se versiona: ``parse_exam`` la usa como si fuera la capa de texto del PDF (cuadernillos
con ``"ocr": true`` en la configuración), de modo que regenerar los bancos no requiere Tesseract y
el resultado es estable. Las correcciones de la revisión manual van en ``fixes/<banco>.json``.

Uso (requiere ``tesseract-ocr`` y ``tesseract-ocr-spa`` instalados en el sistema)::

    cd tools
    uv run python -m opotai.ocr tai-li-2019            # crea la caché si no existe
    uv run python -m opotai.ocr tai-li-2019 --force    # la rehace
    uv run python -m opotai.ocr tai-li-2016 --single-pass --file cuadernillo-1.pdf
"""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import tempfile
from collections import defaultdict
from pathlib import Path

import pymupdf

from .fetch_exams import sha256_file
from .paths import EXAM_CONFIGS_DIR, RAW_DIR, SOURCES_DIR, rel
from .pdfdoc import Span

OCR_DIR = SOURCES_DIR / "ocr"
TESSDATA_CANDIDATES = [
    Path("/usr/share/tesseract-ocr/5/tessdata"),
    Path("/usr/share/tesseract-ocr/4.00/tessdata"),
    Path("/usr/share/tessdata"),
    Path("/usr/local/share/tessdata"),
]
MAIN_DPI = 300
ALT_DPI = 400
PSM = 6
# Palabras formadas solo por signos: suelen ser manchas del escaneo cuando están en los márgenes
# o tienen poca confianza.
NOISE_RE = re.compile(r"^[|¦'‘’`´\"“”~_\-–—.,:;!¡°\[\]{}]+$")


class OcrError(RuntimeError):
    pass


def cache_path(bank_id: str, file: str) -> Path:
    return OCR_DIR / bank_id / (Path(file).stem + ".json")


def tesseract_version() -> str | None:
    exe = shutil.which("tesseract")
    if not exe:
        return None
    out = subprocess.run([exe, "--version"], capture_output=True, text=True)
    first = (out.stdout or out.stderr).splitlines()
    return first[0].strip() if first else "tesseract"


def find_tessdata(lang: str) -> Path:
    for d in TESSDATA_CANDIDATES:
        if (d / f"{lang}.traineddata").exists():
            return d
    raise OcrError(
        f"no se encuentran los datos de Tesseract para '{lang}'. Instala p. ej. "
        "`apt-get install tesseract-ocr tesseract-ocr-spa`."
    )


def _tesseract_words(png: Path, dpi: int, lang: str, psm: int, tessdata: Path) -> list[list]:
    """Palabras ``[x0, y0, x1, y1, texto, confianza, "bloque.párrafo.línea"]`` en puntos PDF."""
    cmd = [
        "tesseract",
        str(png),
        "stdout",
        "-l",
        lang,
        "--dpi",
        str(dpi),
        "--psm",
        str(psm),
        "--tessdata-dir",
        str(tessdata),
        "tsv",
    ]
    # Un hilo por proceso: con varios cuadernillos en paralelo (o la máquina cargada), los hilos
    # OpenMP de Tesseract compiten entre sí y una página pasa de ~1 s a varios minutos.
    env = {**os.environ, "OMP_THREAD_LIMIT": os.environ.get("OMP_THREAD_LIMIT", "1")}
    out = subprocess.run(cmd, capture_output=True, text=True, check=True, env=env).stdout
    scale = 72.0 / dpi
    words = []
    for line in out.splitlines()[1:]:
        cols = line.split("\t")
        if len(cols) < 12 or cols[0] != "5" or not cols[11].strip():
            continue
        left, top, width, height = (int(v) for v in cols[6:10])
        words.append(
            [
                round(left * scale, 1),
                round(top * scale, 1),
                round((left + width) * scale, 1),
                round((top + height) * scale, 1),
                cols[11],
                round(float(cols[10])),
                f"{cols[2]}.{cols[3]}.{cols[4]}",
            ]
        )
    return words


def ocr_pdf(
    pdf_path: Path,
    lang: str = "spa",
    dpis: tuple[int, ...] = (MAIN_DPI, ALT_DPI),
    skip_pages: frozenset[int] | set[int] = frozenset(),
) -> dict:
    """OCR de todas las páginas a cada resolución de ``dpis`` (la primera es la principal).

    Las páginas de ``skip_pages`` (1-based; portadas, páginas en blanco o contraportadas que el
    lector descarta) no pasan por Tesseract y quedan en la caché sin palabras (las portadas con
    trama de fondo son las páginas más lentas y no aportan nada al banco).
    """
    version = tesseract_version()
    if version is None:
        raise OcrError("Tesseract no está instalado (apt-get install tesseract-ocr tesseract-ocr-spa)")
    tessdata = find_tessdata(lang)
    doc = pymupdf.open(pdf_path)
    passes = []
    with tempfile.TemporaryDirectory(prefix="opotai-ocr-") as tmp:
        for dpi in dpis:
            pages = []
            for pno, page in enumerate(doc):
                words: list[list] = []
                if pno + 1 not in skip_pages:
                    png = Path(tmp) / f"p{pno + 1}-{dpi}.png"
                    page.get_pixmap(dpi=dpi, colorspace=pymupdf.csGRAY).save(png)
                    words = _tesseract_words(png, dpi, lang, PSM, tessdata)
                pages.append(
                    {
                        "page": pno + 1,
                        "width": round(page.rect.width, 1),
                        "height": round(page.rect.height, 1),
                        "words": words,
                    }
                )
            passes.append({"dpi": dpi, "psm": PSM, "pages": pages})
    data = {
        "source_file": pdf_path.name,
        "source_sha256": sha256_file(pdf_path),
        "engine": version,
        "lang": lang,
    }
    if skip_pages:
        data["skipped_pages"] = sorted(skip_pages)
    data["passes"] = passes
    return data


def load_cache(bank_id: str, file: str, pdf_path: Path | None = None) -> dict:
    path = cache_path(bank_id, file)
    if not path.exists():
        raise OcrError(f"falta la caché OCR {rel(path)}: ejecuta `uv run python -m opotai.ocr {bank_id}`")
    with path.open(encoding="utf-8") as fh:
        cache = json.load(fh)
    if pdf_path is not None and pdf_path.exists() and cache.get("source_sha256") != sha256_file(pdf_path):
        raise OcrError(f"{rel(path)}: la caché OCR no corresponde al PDF actual (sha256 distinto)")
    return cache


def page_skew(words: list[list]) -> float:
    """Pendiente (dy/dx) de las líneas de la página: mediana de las regresiones de las líneas
    largas de Tesseract (≥ 6 palabras y ≥ 200 pt de ancho). 0 si no hay datos suficientes."""
    lines: dict[str, list[list]] = defaultdict(list)
    for w in words:
        lines[w[6]].append(w)
    slopes = []
    for ws in lines.values():
        if len(ws) < 6:
            continue
        xs = [(w[0] + w[2]) / 2 for w in ws]
        ys = [w[3] for w in ws]
        if max(xs) - min(xs) < 200:
            continue
        mx, my = sum(xs) / len(xs), sum(ys) / len(ys)
        sxx = sum((x - mx) ** 2 for x in xs)
        if sxx:
            slopes.append(sum((x - mx) * (y - my) for x, y in zip(xs, ys, strict=True)) / sxx)
    if len(slopes) < 3:
        return 0.0
    slopes.sort()
    return slopes[len(slopes) // 2]


def page_spans_from_words(words: list[list], page_width: float, margin: float = 40.0) -> list[Span]:
    """Convierte las palabras de una página en ``Span`` (una por palabra).

    Todas las palabras de una misma línea de Tesseract comparten línea base (la mediana de sus
    bordes inferiores) para que ``group_rows`` las agrupe en la misma fila. Se descartan las
    palabras formadas solo por signos que están en los márgenes o tienen poca confianza.
    """
    # Enderezado: el escaneo suele estar algo girado (1° desplaza ~5 pt la columna derecha de las
    # opciones a dos columnas). Se corrige la y de cada palabra con la pendiente de la página.
    slope = page_skew(words)
    mid = page_width / 2
    words = [
        [
            w[0],
            w[1] - slope * ((w[0] + w[2]) / 2 - mid),
            w[2],
            w[3] - slope * ((w[0] + w[2]) / 2 - mid),
            *w[4:7],
            i,
        ]
        for i, w in enumerate(words)
    ]
    lines: dict[str, list[list]] = defaultdict(list)
    for w in words:
        lines[w[6]].append(w)
    groups: list[list[list]] = []
    for ws in lines.values():
        # Tesseract a veces junta en una «línea» palabras de dos filas visuales: se separan por
        # saltos de más de 5 pt en el centro vertical de las palabras.
        ws = sorted(ws, key=lambda w: (w[1] + w[3]) / 2)
        cur = [ws[0]]
        for w in ws[1:]:
            if (w[1] + w[3]) / 2 - (cur[-1][1] + cur[-1][3]) / 2 > 5.0:
                groups.append(cur)
                cur = []
            cur.append(w)
        groups.append(cur)
    spans: list[Span] = []
    for ws in groups:
        bottoms = sorted(w[3] for w in ws)
        base = bottoms[len(bottoms) // 2]
        heights = sorted(w[3] - w[1] for w in ws)
        size = round(heights[len(heights) // 2], 1)
        for x0, y0, x1, y1, text, conf, _, idx in ws:
            if NOISE_RE.match(text) and (conf < 50 or x0 < margin or x1 > page_width - margin):
                continue
            if x0 >= page_width - 20:  # borde derecho del escaneo (sombra del papel)
                continue
            spans.append(
                Span(
                    text=text,
                    x0=x0,
                    y0=y0,
                    x1=x1,
                    y1=y1,
                    baseline=base,
                    font="OCR",
                    size=size,
                    bold=False,
                    italic=False,
                    mono=False,
                    ref=idx,
                )
            )
    return spans


def load_spans(
    bank_id: str, file: str, pdf_path: Path | None = None, pass_index: int = 0
) -> dict[int, list[Span]]:
    """Spans por página (0-based) de la pasada ``pass_index`` de la caché."""
    cache = load_cache(bank_id, file, pdf_path)
    passes = cache.get("passes") or []
    if pass_index >= len(passes):
        raise OcrError(f"la caché OCR de {file} no tiene la pasada {pass_index}")
    return {p["page"] - 1: page_spans_from_words(p["words"], p["width"]) for p in passes[pass_index]["pages"]}


def build_cache(
    bank_id: str,
    force: bool = False,
    dpis: tuple[int, ...] = (MAIN_DPI, ALT_DPI),
    only_file: str | None = None,
) -> list[Path]:
    cfg_path = EXAM_CONFIGS_DIR / f"{bank_id}.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
    written = []
    files = [b["file"] for b in cfg["booklets"] if b.get("ocr")]
    files += [b["file"] for b in (cfg.get("crosscheck") or {}).get("booklets", []) if b.get("ocr")]
    if only_file:
        if only_file not in files:
            raise OcrError(f"{only_file} no es un cuadernillo OCR de {bank_id}")
        files = [only_file]
    for file in files:
        pdf = RAW_DIR / bank_id / file
        if not pdf.exists():
            raise OcrError(
                f"falta {rel(pdf)}: ejecuta `uv run python -m opotai.fetch_exams --bank {bank_id}`"
            )
        out = cache_path(bank_id, file)
        if out.exists() and not force:
            print(f"ya existe {rel(out)} (usa --force para rehacerla)")
            continue
        print(f"OCR de {rel(pdf)} …")
        # «ocr_skip_pages» (opcional, por cuadernillo): páginas que no se pasan por Tesseract.
        bcfg = next((b for b in cfg["booklets"] if b.get("file") == file), {})
        skip = frozenset(bcfg.get("ocr_skip_pages", []))
        data = ocr_pdf(pdf, dpis=dpis, skip_pages=skip)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(_dump_cache(data), encoding="utf-8")
        written.append(out)
        print(f"escrito {rel(out)}")
    return written


def _dump_cache(data: dict) -> str:
    """JSON legible y compacto: una palabra por línea."""
    head = {k: v for k, v in data.items() if k != "passes"}
    lines = ["{"]
    for k, v in head.items():
        lines.append(f"  {json.dumps(k)}: {json.dumps(v, ensure_ascii=False)},")
    lines.append('  "passes": [')
    for i, ps in enumerate(data["passes"]):
        lines.append(f'    {{"dpi": {ps["dpi"]}, "psm": {ps["psm"]}, "pages": [')
        for j, pg in enumerate(ps["pages"]):
            lines.append(
                f'      {{"page": {pg["page"]}, "width": {pg["width"]}, "height": {pg["height"]}, "words": ['
            )
            ws = [f"        {json.dumps(w, ensure_ascii=False)}" for w in pg["words"]]
            lines.append(",\n".join(ws))
            lines.append("      ]}" + ("," if j < len(ps["pages"]) - 1 else ""))
        lines.append("    ]}" + ("," if i < len(data["passes"]) - 1 else ""))
    lines.append("  ]")
    lines.append("}")
    text = "\n".join(lines) + "\n"
    json.loads(text)  # comprobación de formato
    return text


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("banks", nargs="+", help='ids de banco con cuadernillos marcados "ocr": true')
    ap.add_argument("--force", action="store_true", help="rehacer la caché aunque exista")
    ap.add_argument(
        "--single-pass",
        action="store_true",
        help=f"una sola pasada a {MAIN_DPI} ppp (más rápido; la revisión solo marca confianza baja)",
    )
    ap.add_argument("--file", help="solo este cuadernillo (permite lanzar varios en paralelo)")
    args = ap.parse_args(argv)
    dpis = (MAIN_DPI,) if args.single_pass else (MAIN_DPI, ALT_DPI)
    for bank in args.banks:
        build_cache(bank, force=args.force, dpis=dpis, only_file=args.file)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
