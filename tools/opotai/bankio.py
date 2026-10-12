# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Lectura/escritura de bancos de preguntas y validación contra JSON Schema."""

from __future__ import annotations

import json
import os
import tempfile
from collections.abc import Iterator
from functools import cache
from pathlib import Path

from jsonschema import Draft202012Validator

from .paths import ASSETS_DIR, BANKS_DIR, SCHEMA_DIR

# Campos de autor (explicaciones, clasificación…): parse_exam los conserva al regenerar y
# annotate.py es la única vía para modificarlos.
AUTHOR_FIELDS = (
    "explanation",
    "option_notes",
    "topic",
    "references",
    "tags",
    "outdated",
    "outdated_note",
    "needs_review",
)
AUTHOR_DEFAULTS = {
    "explanation": None,
    "option_notes": None,
    "topic": None,
    "references": [],
    "tags": [],
    "outdated": False,
    "outdated_note": None,
    "needs_review": False,
}

QUESTION_KEY_ORDER = (
    "id",
    "number",
    "text",
    "options",
    "answer",
    "annulled",
    "topic",
    "explanation",
    "option_notes",
    "references",
    "tags",
    "media",
    "outdated",
    "outdated_note",
    "needs_review",
)


def dump_json(obj: object) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=2) + "\n"


def write_json(path: Path, obj: object) -> None:
    """Escritura atómica (fichero temporal + rename) con UTF-8 e indentación 2."""
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="\n") as fh:
            fh.write(dump_json(obj))
        os.replace(tmp, path)
    except BaseException:
        if os.path.exists(tmp):
            os.unlink(tmp)
        raise


def load_json(path: Path) -> object:
    with Path(path).open(encoding="utf-8") as fh:
        return json.load(fh)


def iter_bank_files(banks_dir: Path = BANKS_DIR) -> Iterator[Path]:
    """Todos los bancos ``data/banks/**/*.json`` (excluye ``assets/``)."""
    if not banks_dir.exists():
        return
    assets = ASSETS_DIR.resolve() if banks_dir == BANKS_DIR else (banks_dir / "assets").resolve()
    for p in sorted(banks_dir.rglob("*.json")):
        rp = p.resolve()
        if assets in rp.parents:
            continue
        yield p


def iter_questions(bank: dict) -> Iterator[tuple[dict, str, int, dict]]:
    """Itera (sección, "questions"|"reserve", índice, pregunta) de un banco."""
    for section in bank.get("sections", []) or []:
        for list_name in ("questions", "reserve"):
            for i, q in enumerate(section.get(list_name, []) or []):
                yield section, list_name, i, q


def order_question(q: dict) -> dict:
    ordered = {k: q[k] for k in QUESTION_KEY_ORDER if k in q}
    for k, v in q.items():
        if k not in ordered:
            ordered[k] = v
    return ordered


@cache
def load_schema(name: str, schema_dir: str | None = None) -> dict:
    base = Path(schema_dir) if schema_dir else SCHEMA_DIR
    return load_json(base / name)  # type: ignore[return-value]


def schema_errors(obj: object, schema_name: str, schema_dir: Path | None = None) -> list[str]:
    schema = load_schema(schema_name, str(schema_dir) if schema_dir else None)
    validator = Draft202012Validator(schema)
    errors = []
    for err in sorted(validator.iter_errors(obj), key=lambda e: list(e.absolute_path)):
        loc = "/".join(str(p) for p in err.absolute_path) or "(raíz)"
        errors.append(f"{loc}: {err.message}")
    return errors


def index_question_ids(banks_dir: Path = BANKS_DIR) -> dict[str, Path]:
    """Índice id de pregunta → fichero de banco (para annotate)."""
    index: dict[str, Path] = {}
    for path in iter_bank_files(banks_dir):
        try:
            bank = load_json(path)
        except (OSError, json.JSONDecodeError):
            continue
        if not isinstance(bank, dict):
            continue
        for _s, _l, _i, q in iter_questions(bank):
            qid = q.get("id")
            if isinstance(qid, str):
                index.setdefault(qid, path)
    return index
