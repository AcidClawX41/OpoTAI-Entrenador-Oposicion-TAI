# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
from __future__ import annotations

import json
from pathlib import Path

import pytest
from conftest import make_bank

from opotai.annotate import AnnotateError, annotate, load_annotations, main


def _setup(data_dir: Path) -> Path:
    path = data_dir / "banks/oficiales/tai-li-2099.json"
    path.write_text(json.dumps(make_bank(), ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return path


def test_annotate_applies_only_author_fields(data_dir: Path):
    path = _setup(data_dir)
    anns = [
        {
            "id": "tai-li-2099-p1-002",
            "explanation": "Explicación con tildes: «árbol».",
            "option_notes": ["ok", None, "no", "no"],
            "tags": ["redes"],
            "needs_review": True,
        },
        {"id": "tai-li-2099-p1-r1", "references": ["Ley 39/2015, art. 30"]},
    ]
    touched = annotate(anns, banks_dir=data_dir / "banks", meta_dir=data_dir / "meta")
    assert touched == {path: 2}
    raw = path.read_text(encoding="utf-8")
    assert "«árbol»" in raw  # sin escapar acentos
    bank = json.loads(raw)
    q = bank["sections"][0]["questions"][1]
    assert q["explanation"].startswith("Explicación")
    assert q["option_notes"][1] is None
    assert q["text"] == make_bank()["sections"][0]["questions"][1]["text"]
    assert bank["sections"][0]["reserve"][0]["references"] == ["Ley 39/2015, art. 30"]


def test_annotate_rejects_bad_input(data_dir: Path, tmp_path: Path):
    _setup(data_dir)
    with pytest.raises(AnnotateError):
        annotate(
            [{"id": "tai-li-2099-p1-999", "topic": "I.1"}],
            banks_dir=data_dir / "banks",
            meta_dir=data_dir / "meta",
        )
    bad = tmp_path / "bad.json"
    bad.write_text(json.dumps([{"id": "tai-li-2099-p1-001", "answer": "B"}]), encoding="utf-8")
    with pytest.raises(AnnotateError):
        load_annotations(bad)
    dup = tmp_path / "dup.json"
    dup.write_text(json.dumps([{"id": "x"}, {"id": "x"}]), encoding="utf-8")
    with pytest.raises(AnnotateError):
        load_annotations(dup)
    # option_notes con longitud incorrecta → no cumple el esquema
    with pytest.raises(AnnotateError):
        annotate(
            [{"id": "tai-li-2099-p1-001", "option_notes": ["solo una"]}],
            banks_dir=data_dir / "banks",
            meta_dir=data_dir / "meta",
        )


def test_annotate_topic_and_dry_run(data_dir: Path, tmp_path: Path):
    path = _setup(data_dir)
    (data_dir / "meta/temario.json").write_text(
        json.dumps(
            {
                "schema_version": 1,
                "convocatoria": "li-2099",
                "source": {"title": "t", "url": "u"},
                "blocks": [{"id": "I", "title": "B1", "topics": [{"id": "I.1", "number": 1, "title": "T"}]}],
            }
        ),
        encoding="utf-8",
    )
    with pytest.raises(AnnotateError):
        annotate(
            [{"id": "tai-li-2099-p1-001", "topic": "I.9"}],
            banks_dir=data_dir / "banks",
            meta_dir=data_dir / "meta",
        )
    before = path.read_text(encoding="utf-8")
    inp = tmp_path / "ann.json"
    inp.write_text(
        json.dumps({"annotations": [{"id": "tai-li-2099-p1-001", "topic": "I.1"}]}), encoding="utf-8"
    )
    rc = main(
        [
            "--input",
            str(inp),
            "--dry-run",
            "--banks",
            str(data_dir / "banks"),
            "--meta",
            str(data_dir / "meta"),
        ]
    )
    assert rc == 0
    assert path.read_text(encoding="utf-8") == before
    rc = main(["--input", str(inp), "--banks", str(data_dir / "banks"), "--meta", str(data_dir / "meta")])
    assert rc == 0
    assert json.loads(path.read_text(encoding="utf-8"))["sections"][0]["questions"][0]["topic"] == "I.1"
