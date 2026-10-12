# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Versión única de OpoTAI: comprueba o actualiza la versión en todos los manifiestos.

La versión vive en tres sitios que deben coincidir:

- ``Cargo.toml`` (``[workspace.package] version``): la lee el núcleo Rust (``AppInfo.version``).
- ``app/src-tauri/tauri.conf.json``: versión de los instaladores (Windows, macOS, Linux).
- ``app/package.json``: versión del paquete de la interfaz.

Uso::

    cd tools
    uv run python qa/version.py check          # falla si no coinciden (se ejecuta en CI)
    uv run python qa/version.py set 0.2.0      # actualiza las tres

Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CARGO = ROOT / "Cargo.toml"
TAURI = ROOT / "app" / "src-tauri" / "tauri.conf.json"
PACKAGE = ROOT / "app" / "package.json"
SEMVER = re.compile(r"^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$")
JSON_VERSION = re.compile(r'("version"\s*:\s*")([^"]+)(")')


def read_versions() -> dict[str, str]:
    cargo = tomllib.loads(CARGO.read_text(encoding="utf-8"))["workspace"]["package"]["version"]
    tauri = json.loads(TAURI.read_text(encoding="utf-8")).get("version", "(Cargo.toml)")
    package = json.loads(PACKAGE.read_text(encoding="utf-8"))["version"]
    return {"Cargo.toml": cargo, "tauri.conf.json": tauri, "package.json": package}


def check() -> int:
    versions = read_versions()
    for name, value in versions.items():
        print(f"{name:16} {value}")
    distinct = {v for v in versions.values() if v != "(Cargo.toml)"}
    if len(distinct) != 1:
        print("ERROR: las versiones no coinciden; usa `qa/version.py set X.Y.Z`.", file=sys.stderr)
        return 1
    print(f"Versión única: {distinct.pop()}")
    return 0


def set_version(new: str) -> int:
    if not SEMVER.match(new):
        print(f"ERROR: «{new}» no es una versión semántica (X.Y.Z).", file=sys.stderr)
        return 2
    # Cargo.toml: solo la clave version de [workspace.package], conservando el formato.
    text = CARGO.read_text(encoding="utf-8")
    section = re.search(r"^\[workspace\.package\]\s*$(.*?)(?=^\[|\Z)", text, re.MULTILINE | re.DOTALL)
    if not section:
        print("ERROR: no se encuentra [workspace.package] en Cargo.toml.", file=sys.stderr)
        return 1
    body = re.sub(r'^(version\s*=\s*")[^"]+(")', rf"\g<1>{new}\g<2>", section.group(1), count=1, flags=re.M)
    CARGO.write_text(text[: section.start(1)] + body + text[section.end(1) :], encoding="utf-8")
    # JSON: primera clave "version" (la de nivel superior), conservando el formato.
    for path in (TAURI, PACKAGE):
        raw = path.read_text(encoding="utf-8")
        if JSON_VERSION.search(raw):
            path.write_text(JSON_VERSION.sub(rf"\g<1>{new}\g<3>", raw, count=1), encoding="utf-8")
    print(f"Versión actualizada a {new}. Recuerda añadir la entrada en CHANGELOG.md y `cargo update -w`.")
    return check()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check")
    s = sub.add_parser("set")
    s.add_argument("version")
    args = ap.parse_args()
    return check() if args.cmd == "check" else set_version(args.version)


if __name__ == "__main__":
    sys.exit(main())
