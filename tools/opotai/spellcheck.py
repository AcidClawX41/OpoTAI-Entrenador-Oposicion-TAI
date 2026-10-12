# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Pasada ortográfica de un banco generado (sobre todo, de los transcritos por OCR).

Lista las palabras que no reconoce el diccionario español (``aspell -l es``) ni aparecen en el
resto de bancos oficiales (siglas y términos técnicos ya vistos), con las preguntas donde salen.
El código (bloques y código en línea) se ignora. Las correcciones se escriben a mano en
``fixes/<banco>.json`` (``global`` para errores recurrentes); los casos dudosos se comprueban
contra la imagen de la página. Herramienta de autoría: regenerar los bancos no la necesita.

Uso::

    cd tools
    uv run python -m opotai.spellcheck tai-pi-2018 [--min-count 1]
"""

from __future__ import annotations

import argparse
import re
from collections import defaultdict

from .bankio import load_json
from .ocr_review import WORD_RE, aspell_unknown, known_vocabulary
from .paths import OFFICIAL_BANKS_DIR
from .textutil import split_code, strip_figure_refs

URL_RE = re.compile(r"\S+(?:://|@|\.(?:es|com|org|net|gob|html?|php|jsp|conf|exe|txt|xml|json))\S*", re.I)


def bank_texts(bank: dict) -> list[tuple[str, str]]:
    """(referencia, texto sin código) de enunciados, preguntas y opciones."""
    out = []
    for s in bank["sections"]:
        if s.get("statement"):
            out.append((f"{s['id']} (enunciado)", s["statement"]))
        for q in s["questions"] + s["reserve"]:
            out.append((q["id"], q["text"]))
            for i, o in enumerate(q["options"]):
                out.append((f"{q['id']} {'ABCD'[i]})", o))
    clean = []
    for ref, text in out:
        prose = "".join(chunk for chunk, is_code in split_code(strip_figure_refs(text)) if not is_code)
        clean.append((ref, URL_RE.sub(" ", prose)))
    return clean


def unknown_words(bank_id: str) -> dict[str, list[str]]:
    bank = load_json(OFFICIAL_BANKS_DIR / f"{bank_id}.json")
    where: dict[str, list[str]] = defaultdict(list)
    for ref, text in bank_texts(bank):
        for w in WORD_RE.findall(text):
            w = w.strip(".-'’")
            if len(w) < 2 or any(c.isdigit() for c in w):
                continue
            where[w].append(ref)
    vocab = known_vocabulary(bank_id)
    unknown = aspell_unknown(set(where))
    return {w: refs for w, refs in sorted(where.items()) if w in unknown and w.lower() not in vocab}


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("bank")
    args = ap.parse_args(argv)
    found = unknown_words(args.bank)
    for w, refs in found.items():
        shown = ", ".join(dict.fromkeys(refs[:4]))
        more = f" (+{len(refs) - 4})" if len(refs) > 4 else ""
        print(f"{w}\t{shown}{more}")
    print(f"# {len(found)} palabras desconocidas")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
