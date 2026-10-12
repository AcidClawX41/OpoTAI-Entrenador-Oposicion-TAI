# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Ayuda a revisar a mano un banco transcrito por OCR (cuadernillos escaneados).

Vuelca cada pregunta (con su página) marcando **cada aparición** dudosa:

* ``⟪palabra|alternativa⟫``: las dos pasadas de OCR (300 y 400 ppp) leen cosas distintas;
* ``⟪palabra?⟫``: confianza baja en la pasada principal, o palabra desconocida para el
  diccionario (``aspell -l es``, si está instalado) y para el vocabulario del resto de bancos.

Con ``--pages`` genera además recortes PNG legibles de cada página (mitad superior e inferior)
para compararlos con el volcado. La revisión se plasma en ``fixes/<banco>.json`` (y en
``ocr_word_fixes`` de la configuración si el error rompe la estructura). Herramienta de autoría:
regenerar los bancos no la necesita.

Uso::

    cd tools
    uv run python -m opotai.ocr_review tai-li-2019 [--file cuadernillo-1.pdf] [--section p1] \\
        [--pages DIR] > revision.txt
"""

from __future__ import annotations

import argparse
import difflib
import re
import shutil
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

import pymupdf

from .bankio import load_json
from .booklet import BookletConfig, apply_ocr_word_fixes, parse_booklet
from .ocr import load_cache, load_spans
from .parse_exam import load_config
from .paths import OFFICIAL_BANKS_DIR, RAW_DIR

WORD_RE = re.compile(r"[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9][A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9'’.-]*")
MARKED_RE = re.compile(r"⟪[^⟫]*⟫")
# Tokens estructurales (números de pregunta, etiquetas): no se anotan para no romper el lector.
STRUCT_RE = re.compile(r"^\W?\w{0,3}[.):,}\]]$")
PUNCT = ".,;:¿?¡!()«»\"'“”‘’[]{}"


def _cmp(w: str) -> str:
    return w.lower().strip(PUNCT)


def known_vocabulary(exclude: str) -> set[str]:
    """Palabras de los demás bancos oficiales (términos técnicos que el diccionario no conoce)."""
    vocab: set[str] = set()
    for p in OFFICIAL_BANKS_DIR.glob("*.json"):
        if p.stem == exclude:
            continue
        bank = load_json(p)
        for s in bank["sections"]:
            texts = [s.get("statement") or ""]
            for q in s["questions"] + s["reserve"]:
                texts += [q["text"], *q["options"]]
            for t in texts:
                vocab.update(w.lower() for w in WORD_RE.findall(t))
    return vocab


def aspell_unknown(words: set[str]) -> set[str]:
    if not shutil.which("aspell"):
        return set()
    out = subprocess.run(
        ["aspell", "-l", "es", "list"], input="\n".join(sorted(words)), capture_output=True, text=True
    )
    return set(out.stdout.split())


def annotations(cache: dict, threshold: int = 80) -> dict[int, dict[int, str]]:
    """Por página (1-based): índice de palabra de la pasada principal → texto anotado."""
    out: dict[int, dict[int, str]] = defaultdict(dict)
    passes = cache.get("passes", [])
    alt_pages = {p["page"]: p for p in passes[1]["pages"]} if len(passes) > 1 else {}
    for main in passes[0]["pages"]:
        words = main["words"]
        alt = alt_pages.get(main["page"])
        if alt is not None:
            a = [_cmp(w[4]) for w in words]
            b = [_cmp(w[4]) for w in alt["words"]]
            sm = difflib.SequenceMatcher(a=a, b=b, autojunk=False)
            for op, i1, i2, j1, j2 in sm.get_opcodes():
                if op == "equal":
                    continue
                alt_text = " ".join(w[4] for w in alt["words"][j1:j2]) or "∅"
                for i in range(i1, i2):
                    out[main["page"]][i] = f"⟪{words[i][4]}|{alt_text}⟫"
        for i, w in enumerate(words):
            if i not in out[main["page"]] and w[5] < threshold:
                out[main["page"]][i] = f"⟪{w[4]}?⟫"
    return out


def annotate_spans(spans_by_page, notes: dict[int, dict[int, str]]) -> None:
    for pno, spans in spans_by_page.items():
        page_notes = notes.get(pno + 1, {})
        for s in spans:
            note = page_notes.get(s.ref) if s.ref is not None else None
            # no se anotan los números de pregunta (columna izquierda) ni las etiquetas
            if note and s.x0 >= 50 and not STRUCT_RE.match(s.text.strip()):
                s.text = note


def mark_unknown(text: str, unknown: set[str]) -> str:
    out = []
    pos = 0
    for m in MARKED_RE.finditer(text):
        out.append(_mark_plain(text[pos : m.start()], unknown))
        out.append(m.group(0))
        pos = m.end()
    out.append(_mark_plain(text[pos:], unknown))
    return "".join(out)


def _mark_plain(text: str, unknown: set[str]) -> str:
    return WORD_RE.sub(lambda m: f"⟪{m.group(0)}?⟫" if m.group(0).lower() in unknown else m.group(0), text)


def render_pages(pdf: Path, out_dir: Path, dpi: int = 110) -> list[Path]:
    """Recortes de cada página (mitad superior e inferior, con solape) para leerlos con nitidez."""
    out_dir.mkdir(parents=True, exist_ok=True)
    doc = pymupdf.open(pdf)
    paths = []
    for pno, page in enumerate(doc, 1):
        r = page.rect
        for half, (y0, y1) in (("a", (0, r.height * 0.55)), ("b", (r.height * 0.45, r.height))):
            clip = pymupdf.Rect(0, y0, r.width, y1)
            p = out_dir / f"{pdf.stem}-p{pno:02d}{half}.png"
            page.get_pixmap(clip=clip, dpi=dpi, colorspace=pymupdf.csGRAY).save(p)
            paths.append(p)
    return paths


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("bank")
    ap.add_argument("--file", help="solo este cuadernillo")
    ap.add_argument("--section", help="solo esta sección")
    ap.add_argument("--pages", type=Path, help="directorio donde generar recortes PNG de las páginas")
    args = ap.parse_args(argv)
    cfg = load_config(args.bank)
    kinds = {s["id"]: s["kind"] for s in cfg["sections"]}
    vocab = known_vocabulary(args.bank)
    for b in cfg["booklets"]:
        if not b.get("ocr") or (args.file and b["file"] != args.file):
            continue
        pdf = RAW_DIR / args.bank / b["file"]
        cache = load_cache(args.bank, b["file"], pdf)
        spans = load_spans(args.bank, b["file"], pdf)
        apply_ocr_word_fixes(spans, b.get("ocr_word_fixes", []))
        annotate_spans(spans, annotations(cache))
        pb = parse_booklet(BookletConfig.from_dict(b), kinds, pdf, spans_override=spans)
        texts: list[str] = []
        for sec in pb.sections.values():
            for q in sec.questions + sec.reserve:
                texts += [q.text, *q.options]
        for sid in pb.sections:
            texts.append(pb.statement_markdown(sid) or "")
        words = {w for t in texts for w in WORD_RE.findall(MARKED_RE.sub(" ", t))}
        unknown = {w.lower() for w in aspell_unknown(words)} - vocab
        print(f"# {b['file']}")
        for w in pb.warnings:
            print(f"aviso: {w}")
        for sid in pb.order:
            if args.section and sid != args.section:
                continue
            sec = pb.sections[sid]
            print(f"\n## {sid}")
            st = pb.statement_markdown(sid)
            if st:
                print(mark_unknown(st, unknown))
            for q in sec.questions + sec.reserve:
                qid = f"{args.bank}-{sid}-" + (f"r{q.number}" if q.reserve else f"{q.number:03d}")
                print(f"\n[{qid} · p{q.page + 1}] {mark_unknown(q.text, unknown)}")
                for i, o in enumerate(q.options):
                    print(f"  {'ABCD'[i]}) {mark_unknown(o, unknown)}")
        if args.pages:
            for p in render_pages(pdf, args.pages):
                print(f"recorte: {p}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
