# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
from __future__ import annotations

import shutil
import sys
from pathlib import Path

import pytest

TOOLS = Path(__file__).resolve().parent.parent
if str(TOOLS) not in sys.path:
    sys.path.insert(0, str(TOOLS))

from opotai.paths import SCHEMA_DIR  # noqa: E402


def make_question(bank_id: str, sid: str, n: int, reserve: bool = False, **over) -> dict:
    qid = f"{bank_id}-{sid}-r{n}" if reserve else f"{bank_id}-{sid}-{n:03d}"
    q = {
        "id": qid,
        "number": n,
        "text": f"Pregunta número {n} de {sid}{' (reserva)' if reserve else ''}?",
        "options": [f"Opción A{n}", f"Opción B{n}", f"Opción C{n}", f"Opción D{n}"],
        "answer": "A",
        "annulled": False,
        "topic": None,
        "explanation": None,
        "option_notes": None,
        "references": [],
        "tags": [],
        "media": [],
        "outdated": False,
        "outdated_note": None,
        "needs_review": False,
    }
    q.update(over)
    return q


def make_bank(bank_id: str = "tai-li-2099", nq: int = 3, nr: int = 1) -> dict:
    return {
        "schema_version": 1,
        "id": bank_id,
        "kind": "official",
        "title": "Banco de prueba",
        "description": None,
        "access": "libre",
        "year": 2099,
        "convocatoria": "li-2099",
        "exam_date": "2099-01-01",
        "model": "A",
        "duration_minutes": 120,
        "scoring_scheme": None,
        "source": {
            "publisher": "Pruebas",
            "documents": [
                {"kind": "cuadernillo", "title": "x", "url": "https://example.org/x.pdf", "sha256": None}
            ],
            "answer_key": "definitiva",
            "retrieved": "2099-01-01",
            "notes": None,
        },
        "sections": [
            {
                "id": "p1",
                "part": 1,
                "kind": "theory",
                "title": "Primera parte",
                "block": None,
                "statement": None,
                "media": [],
                "questions": [make_question(bank_id, "p1", i) for i in range(1, nq + 1)],
                "reserve": [make_question(bank_id, "p1", i, reserve=True) for i in range(1, nr + 1)],
            }
        ],
    }


@pytest.fixture
def data_dir(tmp_path: Path) -> Path:
    """Directorio data/ temporal con los esquemas reales."""
    d = tmp_path / "data"
    shutil.copytree(SCHEMA_DIR, d / "schema")
    (d / "banks" / "oficiales").mkdir(parents=True)
    (d / "banks" / "assets").mkdir(parents=True)
    (d / "meta").mkdir(parents=True)
    return d
