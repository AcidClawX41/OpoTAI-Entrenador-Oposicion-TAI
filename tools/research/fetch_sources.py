# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Descarga las fuentes oficiales del manifiesto ``research/sources.py`` a ``data/raw/research/``.

Uso (desde ``tools/``)::

    uv run python research/fetch_sources.py                 # descarga lo que falte
    uv run python research/fetch_sources.py --conv li-2024  # solo una convocatoria
    uv run python research/fetch_sources.py --force         # vuelve a descargar todo

Escribe ``data/raw/research/manifest.json`` con sha256, tamaño y fecha de cada descarga. Además
descomprime el ZIP del INE (padrón municipal) en ``data/raw/research/ine/pobmun/``. Los
ficheros descargados son datos no confiables: nunca se ejecutan.
"""

from __future__ import annotations

import argparse
import sys
import time
import zipfile
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import httpx  # noqa: E402
from common import RAW_DIR, USER_AGENT, rel, sha256_file, write_json  # noqa: E402

from sources import SOURCES  # noqa: E402

MAGIC = {"boe": b"<?xml", "inap": b"%PDF-", "ine": b"PK"}


def download(client: httpx.Client, url: str, dest: Path, magic: bytes | None, retries: int = 3) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    last: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with client.stream("GET", url) as resp:
                resp.raise_for_status()
                with tmp.open("wb") as fh:
                    for chunk in resp.iter_bytes():
                        fh.write(chunk)
            head = tmp.read_bytes()[:8]
            if magic and not head.startswith(magic):
                raise ValueError(f"contenido inesperado (empieza por {head!r})")
            tmp.replace(dest)
            return
        except (httpx.HTTPError, ValueError) as exc:
            last = exc
            time.sleep(2 * attempt)
    if tmp.exists():
        tmp.unlink()
    raise RuntimeError(f"no se pudo descargar {url}: {last}")


def unzip_ine(zip_path: Path) -> None:
    out = zip_path.parent / "pobmun"
    out.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as zf:
        for info in zf.infolist():
            name = Path(info.filename).name
            # solo hojas de cálculo con nombre esperado; se ignoran rutas y otros ficheros
            low = name.lower()
            if info.is_dir() or not low.startswith("pobmun") or not low.endswith((".xlsx", ".xls")):
                continue
            (out / name).write_bytes(zf.read(info))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--conv", help="filtra por convocatoria (p. ej. li-2024) o 'general'")
    ap.add_argument("--force", action="store_true", help="vuelve a descargar aunque exista")
    args = ap.parse_args(argv)

    manifest_path = RAW_DIR / "manifest.json"
    previous: dict[str, dict] = {}
    if manifest_path.exists():
        import json

        old_docs = json.loads(manifest_path.read_text(encoding="utf-8")).get("documents", [])
        previous = {d["key"]: d for d in old_docs}
    entries = []
    errors = 0
    with httpx.Client(follow_redirects=True, timeout=180, headers={"User-Agent": USER_AGENT}) as client:
        for src in SOURCES:
            if args.conv and src["conv"] != args.conv:
                continue
            dest = RAW_DIR / src["path"]
            if args.force or not dest.exists():
                print(f"descargando {src['key']} ← {src['url']}")
                try:
                    download(client, src["url"], dest, MAGIC.get(src["kind"]))
                except RuntimeError as exc:
                    print(f"  ERROR {exc}", file=sys.stderr)
                    errors += 1
                    continue
                time.sleep(0.3)
            if src["kind"] == "ine":
                unzip_ine(dest)
            entries.append(
                {
                    "key": src["key"],
                    "conv": src["conv"],
                    "url": src["url"],
                    "path": rel(dest),
                    "bytes": dest.stat().st_size,
                    "sha256": sha256_file(dest),
                    "personal": src["personal"],
                }
            )
    # conserva las entradas de otras convocatorias cuando se filtra con --conv
    merged = {**previous, **{e["key"]: e for e in entries}}
    order = {s["key"]: i for i, s in enumerate(SOURCES)}
    docs = sorted(merged.values(), key=lambda e: order.get(e["key"], len(order)))
    write_json(manifest_path, {"retrieved": date.today().isoformat(), "documents": docs})
    print(f"{len(entries)} documentos procesados; {len(docs)} en {rel(manifest_path)}; errores: {errors}")
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
