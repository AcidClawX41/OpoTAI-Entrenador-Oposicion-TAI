# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Genera ``data/teoria/index.json`` a partir de ``data/teoria/meta/*.json`` y ``data/teoria/*.md``.

Uso::

    cd tools
    uv run python -m opotai.build_theory            # valida y escribe el índice (errores → salida 1)
    uv run python -m opotai.build_theory --check    # no escribe; salida 1 si hay errores o no está al día
    uv run python -m opotai.build_theory --data ruta/a/data   # otro directorio data/ (tests)

Reglas (``docs/CONTRATO-DATOS.md`` §7):

* Un fichero de metadatos de autor por tema, ``data/teoria/meta/<id>.json``, con
  ``{"topic", "summary", "key_points", "sources", "updated"}``; el nombre del fichero es el ``topic``.
* El tema debe existir en ``data/meta/temario.json``, de donde sale el **título oficial**.
* ``data/teoria/<id>.md`` debe existir y no estar vacío; ``file`` = ``<id>.md``.
* ``reading_minutes`` = palabras / 170 redondeado hacia arriba (mínimo 1).
* Orden: bloque (I, II, III, IV) y número de tema, según el temario.
* El ``updated`` del índice es la fecha más reciente de los temas, de modo que el resultado solo
  depende de los ficheros de entrada (idempotente).
* Se leen siempre todos los ficheros y el índice completo se escribe de forma atómica (fichero
  temporal + rename), así que varios autores pueden ejecutarlo a la vez. Si hay errores no se
  escribe nada y se conserva el índice anterior.
* El resultado se valida contra ``data/schema/teoria.schema.json``.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .bankio import dump_json, schema_errors, write_json
from .paths import DATA_DIR, rel

WORDS_PER_MINUTE = 170
TOPIC_RE = re.compile(r"^(I|II|III|IV)\.[0-9]{1,2}$")
DATE_RE = re.compile(r"^[0-9]{4}-[0-9]{2}-[0-9]{2}$")
META_KEYS = ("topic", "summary", "key_points", "sources", "updated")
META_REQUIRED = ("topic", "summary", "key_points", "sources")
BLOCK_ORDER = {"I": 1, "II": 2, "III": 3, "IV": 4}


@dataclass
class BuildResult:
    index: dict | None = None
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    words: dict[str, int] = field(default_factory=dict)


def count_words(markdown: str) -> int:
    """Palabras de un texto Markdown: fragmentos separados por espacios con alguna letra o cifra.

    Así no cuentan los separadores de tablas (``|---|``), las barras ``|`` ni los ``#`` sueltos.
    """
    return sum(1 for tok in markdown.split() if any(ch.isalnum() for ch in tok))


def reading_minutes(words: int) -> int:
    return max(1, math.ceil(words / WORDS_PER_MINUTE))


def _valid_date(value: str) -> bool:
    if not DATE_RE.match(value):
        return False
    try:
        dt.date.fromisoformat(value)
    except ValueError:
        return False
    return True


def load_temario(data_dir: Path) -> tuple[dict[str, dict], list[str]]:
    """Temas del temario: id → {"title", "order"}; ``order`` = (bloque, número)."""
    path = data_dir / "meta" / "temario.json"
    try:
        temario = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}, [f"{rel(path)}: no existe (hace falta para los títulos oficiales)"]
    except (OSError, json.JSONDecodeError) as exc:
        return {}, [f"{rel(path)}: no se puede leer: {exc}"]
    topics: dict[str, dict] = {}
    for block in temario.get("blocks", []) if isinstance(temario, dict) else []:
        bid = block.get("id")
        for t in block.get("topics", []) or []:
            tid = t.get("id")
            if isinstance(tid, str):
                topics[tid] = {
                    "title": t.get("title"),
                    "order": (BLOCK_ORDER.get(bid, 99), int(t.get("number") or 0), tid),
                }
    return topics, []


def _check_meta(meta: object, stem: str, temario: dict[str, dict], where: str) -> list[str]:
    errors: list[str] = []
    if not isinstance(meta, dict):
        return [f"{where}: debe ser un objeto JSON"]
    unknown = sorted(set(meta) - set(META_KEYS))
    if unknown:
        errors.append(f"{where}: claves desconocidas {unknown} (permitidas: {list(META_KEYS)})")
    missing = [k for k in META_REQUIRED if k not in meta]
    if missing:
        errors.append(f"{where}: faltan claves {missing}")
    topic = meta.get("topic")
    if not isinstance(topic, str) or not TOPIC_RE.match(topic):
        errors.append(f"{where}: «topic» inválido: {topic!r}")
    else:
        if topic != stem:
            errors.append(f"{where}: «topic» ({topic}) no coincide con el nombre del fichero ({stem})")
        if topic not in temario:
            errors.append(f"{where}: el tema {topic} no existe en data/meta/temario.json")
    summary = meta.get("summary")
    if "summary" in meta and (not isinstance(summary, str) or not summary.strip()):
        errors.append(f"{where}: «summary» debe ser un texto no vacío")
    kps = meta.get("key_points")
    if "key_points" in meta and (
        not isinstance(kps, list) or any(not isinstance(k, str) or not k.strip() for k in kps)
    ):
        errors.append(f"{where}: «key_points» debe ser una lista de textos no vacíos")
    sources = meta.get("sources")
    if "sources" in meta:
        if not isinstance(sources, list):
            errors.append(f"{where}: «sources» debe ser una lista")
        else:
            for i, s in enumerate(sources):
                ok = (
                    isinstance(s, dict)
                    and set(s) == {"title", "url"}
                    and isinstance(s.get("title"), str)
                    and s["title"].strip()
                    and isinstance(s.get("url"), str)
                    and s["url"].startswith(("https://", "http://"))
                )
                if not ok:
                    errors.append(f"{where}: sources[{i}] debe tener «title» y «url» (http/https): {s!r}")
    updated = meta.get("updated")
    if updated is not None and (not isinstance(updated, str) or not _valid_date(updated)):
        errors.append(f"{where}: «updated» debe ser una fecha AAAA-MM-DD o null: {updated!r}")
    return errors


def build_index(data_dir: Path = DATA_DIR) -> BuildResult:
    """Lee temario, metadatos y Markdown; devuelve el índice (o ``None`` si hay errores)."""
    res = BuildResult()
    teoria = data_dir / "teoria"
    meta_dir = teoria / "meta"
    temario, errs = load_temario(data_dir)
    res.errors.extend(errs)

    entries: list[tuple[tuple, dict]] = []
    meta_files = sorted(meta_dir.glob("*.json")) if meta_dir.is_dir() else []
    seen: set[str] = set()
    for path in meta_files:
        stem = path.name[: -len(".json")]
        where = rel(path)
        try:
            meta = json.loads(path.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError) as exc:
            res.errors.append(f"{where}: JSON inválido: {exc}")
            continue
        errs = _check_meta(meta, stem, temario, where)
        if errs:
            res.errors.extend(errs)
            continue
        topic = meta["topic"]
        seen.add(topic)
        md_path = teoria / f"{topic}.md"
        try:
            text = md_path.read_text(encoding="utf-8")
        except FileNotFoundError:
            res.errors.append(f"{rel(md_path)}: no existe (lo exige {where})")
            continue
        except (OSError, UnicodeDecodeError) as exc:
            res.errors.append(f"{rel(md_path)}: no se puede leer: {exc}")
            continue
        if not text.strip():
            res.errors.append(f"{rel(md_path)}: está vacío")
            continue
        first = next((ln for ln in text.splitlines() if ln.strip()), "")
        if not first.startswith("# "):
            res.warnings.append(f"{rel(md_path)}: la primera línea debería ser el título («# …»)")
        words = count_words(text)
        res.words[topic] = words
        if not meta["key_points"]:
            res.warnings.append(f"{where}: «key_points» está vacío")
        if not meta["sources"]:
            res.warnings.append(f"{where}: «sources» está vacío")
        entry = {
            "topic": topic,
            "file": f"{topic}.md",
            "title": temario[topic]["title"],
            "summary": meta["summary"].strip(),
            "reading_minutes": reading_minutes(words),
            "key_points": [k.strip() for k in meta["key_points"]],
            "sources": [{"title": s["title"].strip(), "url": s["url"].strip()} for s in meta["sources"]],
            "updated": meta.get("updated"),
        }
        entries.append((temario[topic]["order"], entry))

    if teoria.is_dir():
        for md in sorted(teoria.glob("*.md")):
            stem = md.name[: -len(".md")]
            if stem not in seen and TOPIC_RE.match(stem):
                res.warnings.append(f"{rel(md)}: sin metadatos en {rel(meta_dir)}/{stem}.json (no se indexa)")

    if res.errors:
        return res

    entries.sort(key=lambda e: e[0])
    dates = [e["updated"] for _, e in entries if e["updated"]]
    index = {
        "schema_version": 1,
        "updated": max(dates) if dates else dt.date.today().isoformat(),
        "topics": [e for _, e in entries],
    }
    errs = schema_errors(index, "teoria.schema.json", data_dir / "schema")
    if errs:
        res.errors.extend(f"índice generado: {e}" for e in errs)
        return res
    res.index = index
    return res


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--data", type=Path, default=DATA_DIR, help="directorio data/ (por defecto, el del repo)")
    ap.add_argument("--check", action="store_true", help="no escribir; fallar si el índice no está al día")
    args = ap.parse_args(argv)
    data_dir: Path = args.data
    res = build_index(data_dir)
    for w in res.warnings:
        print(f"AVISO  {w}")
    for e in res.errors:
        print(f"ERROR  {e}")
    if res.errors or res.index is None:
        print(f"Índice de teoría NO generado: {len(res.errors)} errores.")
        return 1

    out = data_dir / "teoria" / "index.json"
    new_text = dump_json(res.index)
    try:
        old_text = out.read_text(encoding="utf-8")
    except (FileNotFoundError, UnicodeDecodeError):
        old_text = None
    topics = res.index["topics"]
    per_block: dict[str, int] = {}
    for t in topics:
        b = t["topic"].split(".")[0]
        per_block[b] = per_block.get(b, 0) + 1
    blocks = ", ".join(f"{b}: {n}" for b, n in sorted(per_block.items(), key=lambda kv: BLOCK_ORDER[kv[0]]))
    summary = f"{len(topics)} temas ({blocks or '—'}), {sum(res.words.values())} palabras"
    if args.check:
        if old_text != new_text:
            print(f"{rel(out)} no está al día ({summary}); ejecuta: uv run python -m opotai.build_theory")
            return 1
        print(f"{rel(out)} al día: {summary}.")
        return 0
    if old_text == new_text:
        print(f"{rel(out)} sin cambios: {summary}.")
    else:
        write_json(out, res.index)
        print(f"{rel(out)} escrito: {summary}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
