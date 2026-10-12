# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Aplica anotaciones de autor (explicaciones, tema, referencias…) a los bancos de preguntas.

Uso::

    cd tools
    uv run python -m opotai.annotate --input anotaciones.json            # aplica y escribe
    uv run python -m opotai.annotate --input anotaciones.json --dry-run  # solo comprueba

El fichero de entrada es una lista JSON (o un objeto ``{"annotations": [...]}``) de objetos::

    {
      "id": "tai-li-2024-p1-001",              # obligatorio
      "explanation": "…",                      # opcionales: solo se tocan los presentes
      "option_notes": ["…", null, "…", "…"],
      "topic": "I.1",
      "references": ["CE, art. 33"],
      "tags": ["constitución"],
      "outdated": false,
      "outdated_note": null,
      "needs_review": false
    }

Cada id se localiza en el banco que lo contiene (índice de todos los ``data/banks/**/*.json``).
Nunca se modifican el texto, las opciones ni la respuesta. Se rechazan ids inexistentes o
repetidos y campos desconocidos; el banco resultante se valida contra ``bank.schema.json``
(y ``topic`` contra ``meta/temario.json`` si existe) antes de escribirse (UTF-8, indentación 2,
sin escapar acentos). Si algo falla, no se escribe ningún fichero.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .bankio import AUTHOR_FIELDS, iter_questions, load_json, order_question, schema_errors, write_json
from .paths import BANKS_DIR, META_DIR, rel

ALLOWED = set(AUTHOR_FIELDS)


class AnnotateError(ValueError):
    pass


def load_annotations(path: Path) -> list[dict]:
    data = load_json(path)
    if isinstance(data, dict) and "annotations" in data:
        data = data["annotations"]
    if not isinstance(data, list):
        raise AnnotateError(f"{path}: se esperaba una lista de anotaciones")
    seen: set[str] = set()
    for i, ann in enumerate(data):
        if not isinstance(ann, dict) or not isinstance(ann.get("id"), str):
            raise AnnotateError(f"anotación #{i}: falta 'id'")
        unknown = set(ann) - ALLOWED - {"id"}
        if unknown:
            raise AnnotateError(
                f"{ann['id']}: campos no permitidos {sorted(unknown)} (solo {sorted(ALLOWED)})"
            )
        if ann["id"] in seen:
            raise AnnotateError(f"{ann['id']}: id repetido en el fichero de anotaciones")
        seen.add(ann["id"])
    return data


def _topics(meta_dir: Path) -> set[str] | None:
    p = meta_dir / "temario.json"
    if not p.exists():
        return None
    t = load_json(p)
    return {topic["id"] for b in t.get("blocks", []) for topic in b.get("topics", [])}


def annotate(
    annotations: list[dict],
    banks_dir: Path = BANKS_DIR,
    meta_dir: Path = META_DIR,
    dry_run: bool = False,
) -> dict[Path, int]:
    """Aplica las anotaciones. Devuelve {fichero: nº de preguntas modificadas}."""
    # Índice id → (fichero, banco cargado)
    banks: dict[Path, dict] = {}
    index: dict[str, tuple[Path, dict]] = {}
    assets = (banks_dir / "assets").resolve()
    for path in sorted(banks_dir.rglob("*.json")):
        if assets in path.resolve().parents:
            continue
        bank = load_json(path)
        if not isinstance(bank, dict):
            continue
        banks[path] = bank
        for _s, _l, _i, q in iter_questions(bank):
            if isinstance(q.get("id"), str):
                index.setdefault(q["id"], (path, q))
    missing = [a["id"] for a in annotations if a["id"] not in index]
    if missing:
        raise AnnotateError(f"ids inexistentes: {missing[:20]}{'…' if len(missing) > 20 else ''}")
    topics = _topics(meta_dir)
    touched: dict[Path, int] = {}
    for ann in annotations:
        path, q = index[ann["id"]]
        before = {k: q.get(k) for k in ("text", "options", "answer", "annulled")}
        changed = False
        for k, v in ann.items():
            if k == "id":
                continue
            if k == "topic" and v is not None and topics is not None and v not in topics:
                raise AnnotateError(f"{ann['id']}: topic {v} no existe en meta/temario.json")
            if q.get(k) != v:
                q[k] = v
                changed = True
        assert before == {k: q.get(k) for k in before}, "annotate no debe tocar texto/opciones/respuesta"
        if changed:
            touched[path] = touched.get(path, 0) + 1
    # Validar todos los bancos modificados antes de escribir nada
    problems = []
    for path in touched:
        bank = banks[path]
        for sec in bank.get("sections", []):
            for list_name in ("questions", "reserve"):
                if list_name in sec:
                    sec[list_name] = [order_question(q) for q in sec[list_name]]
        errs = schema_errors(bank, "bank.schema.json")
        problems.extend(f"{rel(path)}: {e}" for e in errs)
    if problems:
        raise AnnotateError("el resultado no cumple el esquema:\n  " + "\n  ".join(problems[:30]))
    if not dry_run:
        for path in touched:
            write_json(path, banks[path])
    return touched


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--input", required=True, type=Path, help="fichero JSON de anotaciones")
    ap.add_argument("--dry-run", action="store_true", help="comprobar sin escribir")
    ap.add_argument("--banks", type=Path, default=BANKS_DIR, help=argparse.SUPPRESS)
    ap.add_argument("--meta", type=Path, default=META_DIR, help=argparse.SUPPRESS)
    args = ap.parse_args(argv)
    try:
        anns = load_annotations(args.input)
        touched = annotate(anns, banks_dir=args.banks, meta_dir=args.meta, dry_run=args.dry_run)
    except (AnnotateError, OSError, json.JSONDecodeError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    verb = "se modificarían" if args.dry_run else "modificadas"
    total = sum(touched.values())
    for path, n in touched.items():
        print(f"{rel(path)}: {n} preguntas {verb}")
    print(f"{len(anns)} anotaciones leídas; {total} preguntas {verb} en {len(touched)} bancos.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
