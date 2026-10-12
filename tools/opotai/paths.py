# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Rutas del repositorio usadas por las herramientas."""

from __future__ import annotations

from pathlib import Path

TOOLS_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = TOOLS_DIR.parent
DATA_DIR = REPO_ROOT / "data"
SCHEMA_DIR = DATA_DIR / "schema"
BANKS_DIR = DATA_DIR / "banks"
OFFICIAL_BANKS_DIR = BANKS_DIR / "oficiales"
ASSETS_DIR = BANKS_DIR / "assets"
META_DIR = DATA_DIR / "meta"
RAW_DIR = DATA_DIR / "raw"

PACKAGE_DIR = TOOLS_DIR / "opotai"
EXAM_CONFIGS_DIR = PACKAGE_DIR / "exam_configs"
FIXES_DIR = PACKAGE_DIR / "fixes"
SOURCES_DIR = TOOLS_DIR / "sources"
EXAMS_MANIFEST = SOURCES_DIR / "examenes.json"


def rel(path: Path) -> str:
    """Ruta relativa a la raíz del repo (para mensajes)."""
    try:
        return str(Path(path).resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path)
