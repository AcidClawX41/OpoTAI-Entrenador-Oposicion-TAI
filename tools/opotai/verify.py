# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Comprobación independiente de la transcripción con ``pdftotext`` (poppler).

El banco se extrae con PyMuPDF; aquí se comprueba que cada enunciado, opción y párrafo de
supuesto aparece (ignorando espacios, puntuación, mayúsculas y marcas Markdown) en el texto que
obtiene un motor distinto (``pdftotext -raw``). Detecta pérdidas, duplicados o mezclas de texto.
Si ``pdftotext`` no está instalado, la comprobación se omite.
"""

from __future__ import annotations

import re
import shutil
import subprocess
from pathlib import Path

from .textutil import normalize_for_match, plain_text

# Marcas estructurales añadidas por el parser (no están en el PDF).
INTERLUDE_MARK_RE = re.compile(r"^\*Texto que precede a la pregunta (de reserva )?\d+:\*$")


def pdftotext_available() -> bool:
    return shutil.which("pdftotext") is not None


def independent_text_check(bank: dict, pdfs: list[Path], skip_ids: set[str]) -> tuple[int, list[str]]:
    """Devuelve (nº de textos comprobados, lista de textos no encontrados)."""
    full = []
    for p in pdfs:
        out = subprocess.run(["pdftotext", "-raw", str(p), "-"], capture_output=True, text=True, check=True)
        full.append(out.stdout)
    haystack = normalize_for_match("\n".join(full)).replace(" ", "")
    checked = 0
    missing: list[str] = []
    for sec in bank["sections"]:
        items: list[tuple[str, str]] = []
        if sec.get("statement") and sec["id"] not in skip_ids:
            items += [
                (f"{sec['id']}/enunciado", par)
                for par in sec["statement"].split("\n\n")
                if not INTERLUDE_MARK_RE.match(par.strip())
            ]
        for q in sec["questions"] + sec["reserve"]:
            if q["id"] in skip_ids:
                continue
            items.append((q["id"], q["text"]))
            items += [(f"{q['id']}/{'ABCD'[i]}", o) for i, o in enumerate(q["options"])]
        for label, text in items:
            needle = normalize_for_match(plain_text(text)).replace(" ", "")
            if not needle:
                continue
            checked += 1
            if needle not in haystack:
                missing.append(f"{label}: {text[:90]!r}")
    return checked, missing
