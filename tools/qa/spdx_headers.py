# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Cabeceras de licencia y copyright (SPDX) en el código fuente de OpoTAI.

Añade (``--apply``) o comprueba (``--check``, para CI) que cada fichero de código propio empieza
con:

    SPDX-License-Identifier: GPL-3.0-or-later
    Copyright (C) 2026 Eric Valls Gramunt

en el comentario de línea de su lenguaje. No toca datos (JSON), dependencias ni ficheros generados.

Uso: ``cd tools && uv run python qa/spdx_headers.py --check|--apply``
Autor: Eric Valls Gramunt.
"""

from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SPDX = "SPDX-License-Identifier: GPL-3.0-or-later"
COPYRIGHT = "Copyright (C) 2026 Eric Valls Gramunt"

# Extensión → prefijo de comentario de línea.
COMMENT = {".rs": "//", ".ts": "//", ".tsx": "//", ".mjs": "//", ".js": "//", ".py": "#", ".css": None}
SKIP_PARTS = {"node_modules", "target", "dist", "gen", ".venv", "__pycache__"}


def tracked_files() -> list[Path]:
    out = subprocess.run(["git", "ls-files"], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    files = []
    for rel in out.splitlines():
        path = ROOT / rel
        if path.suffix not in COMMENT or SKIP_PARTS & set(path.parts):
            continue
        if path.name.endswith((".d.ts", ".config.ts")) or "fixtures" in path.parts:
            continue
        files.append(path)
    return files


def header_for(path: Path) -> str:
    prefix = COMMENT[path.suffix]
    if prefix is None:  # CSS
        return f"/* {SPDX}\n * {COPYRIGHT} */\n"
    return f"{prefix} {SPDX}\n{prefix} {COPYRIGHT}\n"


def has_header(text: str) -> bool:
    return SPDX in "\n".join(text.splitlines()[:5])


def apply(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if has_header(text):
        return False
    lines = text.splitlines(keepends=True)
    head = ""
    # Respeta el shebang y la codificación de Python.
    while lines and (lines[0].startswith("#!") or lines[0].startswith("# -*-")):
        head += lines.pop(0)
    path.write_text(head + header_for(path) + "".join(lines), encoding="utf-8")
    return True


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = ap.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    args = ap.parse_args()
    files = tracked_files()
    if args.apply:
        changed = [p for p in files if apply(p)]
        print(f"{len(changed)} ficheros actualizados de {len(files)}.")
        return 0
    missing = [p.relative_to(ROOT) for p in files if not has_header(p.read_text(encoding="utf-8"))]
    for p in missing:
        print(f"sin cabecera SPDX: {p}")
    print(f"{len(files) - len(missing)}/{len(files)} ficheros con cabecera SPDX.")
    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
