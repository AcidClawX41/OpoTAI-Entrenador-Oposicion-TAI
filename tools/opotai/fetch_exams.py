# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Descarga los PDFs de exámenes oficiales listados en ``tools/sources/examenes.json``.

Cada documento se guarda en ``data/raw/<bank_id>/<file>`` (directorio no versionado) y se
verifica su SHA-256 contra el manifiesto. Uso::

    cd tools
    uv run python -m opotai.fetch_exams                  # descarga lo que falte y verifica todo
    uv run python -m opotai.fetch_exams --bank tai-li-2024
    uv run python -m opotai.fetch_exams --record         # rellena sha256/bytes de entradas nuevas
    uv run python -m opotai.fetch_exams --force          # vuelve a descargar aunque exista

Los PDFs son datos no confiables: solo se escriben en ``data/raw/`` y nunca se ejecutan.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import httpx

from .paths import EXAMS_MANIFEST, RAW_DIR, rel

USER_AGENT = "OpoTAI-tools/0.1 (descarga de examenes oficiales publicos del INAP)"
DOC_KINDS = {"cuadernillo", "plantilla_provisional", "plantilla_definitiva", "criterios", "otro"}


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def load_manifest(path: Path = EXAMS_MANIFEST) -> dict:
    with path.open(encoding="utf-8") as fh:
        manifest = json.load(fh)
    docs = manifest.get("documents")
    if not isinstance(docs, list):
        raise SystemExit(f"{rel(path)}: falta la lista 'documents'")
    seen: set[tuple[str, str]] = set()
    for i, doc in enumerate(docs):
        for key in ("bank_id", "kind", "title", "url", "file"):
            if not doc.get(key):
                raise SystemExit(f"{rel(path)}: documento #{i} sin '{key}'")
        if doc["kind"] not in DOC_KINDS:
            raise SystemExit(f"{rel(path)}: documento #{i} con kind desconocido {doc['kind']!r}")
        if "/" in doc["file"] or doc["file"].startswith("."):
            raise SystemExit(f"{rel(path)}: nombre de fichero no válido {doc['file']!r}")
        key = (doc["bank_id"], doc["file"])
        if key in seen:
            raise SystemExit(f"{rel(path)}: fichero duplicado {key}")
        seen.add(key)
    return manifest


def save_manifest(manifest: dict, path: Path = EXAMS_MANIFEST) -> None:
    text = json.dumps(manifest, ensure_ascii=False, indent=2) + "\n"
    path.write_text(text, encoding="utf-8")


def local_path(doc: dict, raw_dir: Path = RAW_DIR) -> Path:
    return raw_dir / doc["bank_id"] / doc["file"]


def download(client: httpx.Client, url: str, dest: Path, retries: int = 3) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_name(dest.name + ".part")
    last_exc: Exception | None = None
    for attempt in range(1, retries + 1):
        try:
            with client.stream("GET", url) as resp:
                resp.raise_for_status()
                with tmp.open("wb") as fh:
                    for chunk in resp.iter_bytes():
                        fh.write(chunk)
            head = tmp.read_bytes()[:5]
            if head != b"%PDF-":
                raise ValueError(f"la respuesta no es un PDF (empieza por {head!r})")
            tmp.replace(dest)
            return
        except (httpx.HTTPError, ValueError) as exc:  # pragma: no cover - red
            last_exc = exc
            time.sleep(2 * attempt)
    if tmp.exists():
        tmp.unlink()
    raise RuntimeError(f"no se pudo descargar {url}: {last_exc}")


def fetch(
    bank: str | None = None,
    force: bool = False,
    record: bool = False,
    manifest_path: Path = EXAMS_MANIFEST,
    raw_dir: Path = RAW_DIR,
) -> int:
    manifest = load_manifest(manifest_path)
    errors = 0
    changed = False
    headers = {"User-Agent": USER_AGENT}
    with httpx.Client(follow_redirects=True, timeout=120, headers=headers) as client:
        for doc in manifest["documents"]:
            if bank and doc["bank_id"] != bank:
                continue
            dest = local_path(doc, raw_dir)
            label = f"{doc['bank_id']}/{doc['file']}"
            if force or not dest.exists():
                print(f"descargando {label} ← {doc['url']}")
                try:
                    download(client, doc["url"], dest)
                except RuntimeError as exc:
                    print(f"  ERROR {exc}", file=sys.stderr)
                    errors += 1
                    continue
            digest = sha256_file(dest)
            size = dest.stat().st_size
            expected = doc.get("sha256")
            if expected:
                if digest != expected:
                    print(
                        f"  ERROR {label}: sha256 {digest} ≠ manifiesto {expected} "
                        "(¿documento actualizado en origen?)",
                        file=sys.stderr,
                    )
                    errors += 1
                    continue
                if doc.get("bytes") not in (None, size):
                    print(f"  ERROR {label}: tamaño {size} ≠ manifiesto {doc['bytes']}", file=sys.stderr)
                    errors += 1
                    continue
                print(f"ok {label} ({size} bytes)")
            elif record:
                doc["sha256"] = digest
                doc["bytes"] = size
                changed = True
                print(f"registrado {label} sha256={digest} ({size} bytes)")
            else:
                print(f"  AVISO {label}: sin sha256 en el manifiesto (usa --record)", file=sys.stderr)
    if changed:
        save_manifest(manifest, manifest_path)
        print(f"manifiesto actualizado: {rel(manifest_path)}")
    return 1 if errors else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--bank", help="solo los documentos de este banco (p. ej. tai-li-2024)")
    ap.add_argument("--force", action="store_true", help="descargar aunque el fichero ya exista")
    ap.add_argument("--record", action="store_true", help="anotar sha256/bytes de entradas sin hash")
    args = ap.parse_args(argv)
    return fetch(bank=args.bank, force=args.force, record=args.record)


if __name__ == "__main__":
    raise SystemExit(main())
