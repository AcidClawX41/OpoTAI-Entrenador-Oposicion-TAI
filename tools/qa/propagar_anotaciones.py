# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Propaga las anotaciones de autor entre preguntas oficiales idénticas de distintos exámenes.

Promoción interna y libre comparten muchas preguntas en la misma convocatoria. Si una copia ya
tiene explicación, tema, referencias… y otra idéntica no, se copian a la que falta (mediante
``opotai.annotate``, que valida y nunca toca enunciado, opciones ni respuesta). Solo se propaga
entre preguntas con el mismo enunciado, las mismas opciones y la misma respuesta oficial; si las
respuestas difieren se informa y no se propaga.

Uso: ``cd tools && uv run python qa/propagar_anotaciones.py [--dry-run] [--banks tai-pi-2024 …]``
Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import collections
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
BANKS = ROOT / "data" / "banks"
FIELDS = ("explanation", "option_notes", "topic", "references", "tags", "outdated", "outdated_note")


def norm(text: str) -> str:
    text = unicodedata.normalize("NFKD", text.lower())
    text = "".join(c for c in text if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]", "", text)


def questions():
    for path in sorted(BANKS.glob("**/*.json")):
        bank = json.loads(path.read_text(encoding="utf-8"))
        for sec in bank.get("sections", []):
            yield from sec["questions"] + sec.get("reserve", [])


def plan() -> tuple[list[dict], list[str]]:
    groups: dict[str, list[dict]] = collections.defaultdict(list)
    for q in questions():
        key = norm(q["text"]) + "|" + "|".join(norm(o) for o in q["options"])
        groups[key].append(q)
    annotations, conflicts = [], []
    for qs in groups.values():
        if len(qs) < 2:
            continue
        if len({q.get("answer") for q in qs}) > 1:
            conflicts.append(" / ".join(f"{q['id']}={q.get('answer')}" for q in qs))
            continue
        donors = [q for q in qs if q.get("explanation")]
        if not donors:
            continue
        donor = donors[0]
        for q in qs:
            if q is donor or q.get("explanation"):
                continue
            ann = {"id": q["id"]}
            for f in FIELDS:
                if donor.get(f) not in (None, [], ""):
                    ann[f] = donor[f]
            annotations.append(ann)
    return annotations, conflicts


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument(
        "--banks",
        nargs="+",
        metavar="BANCO",
        help="solo escribe en estos bancos destino (p. ej. mientras otros bancos se están editando)",
    )
    args = ap.parse_args()
    annotations, conflicts = plan()
    if args.banks:
        annotations = [a for a in annotations if any(a["id"].startswith(b + "-") for b in args.banks)]
    for c in conflicts:
        print(f"AVISO: misma pregunta con respuestas distintas, no se propaga: {c}")
    print(f"Anotaciones a propagar: {len(annotations)}")
    if not annotations or args.dry_run:
        return 0
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as fh:
        json.dump(annotations, fh, ensure_ascii=False)
        tmp = fh.name
    try:
        cmd = [sys.executable, "-m", "opotai.annotate", "--input", tmp]
        return subprocess.call(cmd, cwd=ROOT / "tools")
    finally:
        Path(tmp).unlink(missing_ok=True)


if __name__ == "__main__":
    sys.exit(main())
