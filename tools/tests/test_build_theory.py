# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
from __future__ import annotations

import json
from pathlib import Path

import pytest

from opotai.build_theory import build_index, count_words, main, reading_minutes


def _write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def _temario(data_dir: Path) -> None:
    _write_json(
        data_dir / "meta" / "temario.json",
        {
            "schema_version": 1,
            "convocatoria": "li-2099",
            "source": {"title": "Prueba", "url": "https://example.org/temario"},
            "blocks": [
                {
                    "id": "I",
                    "title": "Bloque I",
                    "topics": [
                        {"id": "I.1", "number": 1, "title": "La Constitución (título oficial)"},
                        {"id": "I.2", "number": 2, "title": "Las Cortes Generales"},
                        {"id": "I.10", "number": 10, "title": "Tema diez"},
                    ],
                },
                {
                    "id": "II",
                    "title": "Bloque II",
                    "topics": [{"id": "II.1", "number": 1, "title": "Informática básica"}],
                },
            ],
        },
    )


def _topic(data_dir: Path, tid: str, words: int = 10, **meta_over) -> None:
    """Tema de prueba con exactamente ``words`` palabras (el título «# I.1 · Tema» cuenta 2)."""
    teoria = data_dir / "teoria"
    teoria.mkdir(parents=True, exist_ok=True)
    body = " ".join(["palabra"] * max(0, words - 2))
    (teoria / f"{tid}.md").write_text(f"# {tid} · Tema\n\n{body}\n", encoding="utf-8")
    meta = {
        "topic": tid,
        "summary": f"Resumen de {tid}.",
        "key_points": ["Idea 1", "Idea 2"],
        "sources": [{"title": "BOE", "url": "https://www.boe.es/"}],
        "updated": "2099-01-01",
    }
    meta.update(meta_over)
    _write_json(teoria / "meta" / f"{tid}.json", meta)


@pytest.fixture
def theory_dir(data_dir: Path) -> Path:
    _temario(data_dir)
    return data_dir


def test_count_words_and_minutes():
    md = "# Título\n\n| Norma | Qué |\n|---|---|\n| Ley 39/2015 | procedimiento |\n\n- art. 9.3 CE\n"
    # Título, Norma, Qué, Ley, 39/2015, procedimiento, art., 9.3, CE
    assert count_words(md) == 9
    assert reading_minutes(0) == 1
    assert reading_minutes(170) == 1
    assert reading_minutes(171) == 2
    assert reading_minutes(3400) == 20


def test_builds_sorted_index_with_official_titles(theory_dir: Path):
    _topic(theory_dir, "II.1", words=400, updated="2099-02-03")
    _topic(theory_dir, "I.10", words=50)
    _topic(theory_dir, "I.2", words=171)
    _topic(theory_dir, "I.1", words=1700)
    res = build_index(theory_dir)
    assert res.errors == []
    idx = res.index
    assert [t["topic"] for t in idx["topics"]] == ["I.1", "I.2", "I.10", "II.1"]
    first = idx["topics"][0]
    assert first["file"] == "I.1.md"
    assert first["title"] == "La Constitución (título oficial)"
    assert first["reading_minutes"] == 10
    assert idx["topics"][1]["reading_minutes"] == 2
    assert idx["topics"][2]["reading_minutes"] == 1
    assert idx["updated"] == "2099-02-03"  # la fecha más reciente de los temas


def test_main_writes_atomically_and_is_idempotent(theory_dir: Path):
    _topic(theory_dir, "I.1", words=300)
    assert main(["--data", str(theory_dir)]) == 0
    out = theory_dir / "teoria" / "index.json"
    first = out.read_bytes()
    assert json.loads(first)["topics"][0]["topic"] == "I.1"
    assert main(["--data", str(theory_dir)]) == 0
    assert out.read_bytes() == first
    assert not list((theory_dir / "teoria").glob(".index.json.*"))  # sin temporales huérfanos
    assert main(["--data", str(theory_dir), "--check"]) == 0
    _topic(theory_dir, "I.2", words=300)
    assert main(["--data", str(theory_dir), "--check"]) == 1  # índice desfasado
    assert main(["--data", str(theory_dir)]) == 0
    assert [t["topic"] for t in json.loads(out.read_text("utf-8"))["topics"]] == ["I.1", "I.2"]


@pytest.mark.parametrize(
    ("setup", "fragment"),
    [
        (lambda d: _topic(d, "I.9"), "no existe en data/meta/temario.json"),
        (lambda d: _topic(d, "I.1", topic="I.2"), "no coincide con el nombre del fichero"),
        (lambda d: _topic(d, "I.1", autor="x"), "claves desconocidas"),
        (lambda d: _topic(d, "I.1", summary=""), "«summary»"),
        (lambda d: _topic(d, "I.1", key_points="uno"), "«key_points»"),
        (lambda d: _topic(d, "I.1", sources=[{"title": "x"}]), "sources[0]"),
        (lambda d: _topic(d, "I.1", updated="11/10/2026"), "«updated»"),
    ],
)
def test_meta_errors(theory_dir: Path, setup, fragment: str):
    setup(theory_dir)
    res = build_index(theory_dir)
    assert res.index is None
    assert any(fragment in e for e in res.errors), res.errors


def test_missing_or_empty_markdown_fails_without_writing(theory_dir: Path):
    _topic(theory_dir, "I.1")
    _topic(theory_dir, "I.2")
    (theory_dir / "teoria" / "I.1.md").unlink()
    (theory_dir / "teoria" / "I.2.md").write_text("  \n", encoding="utf-8")
    res = build_index(theory_dir)
    assert any("I.1.md: no existe" in e for e in res.errors)
    assert any("I.2.md: está vacío" in e for e in res.errors)
    assert main(["--data", str(theory_dir)]) == 1
    assert not (theory_dir / "teoria" / "index.json").exists()


def test_invalid_json_and_orphan_markdown(theory_dir: Path):
    _topic(theory_dir, "I.1")
    (theory_dir / "teoria" / "II.1.md").write_text("# II.1 · Borrador\n", encoding="utf-8")
    res = build_index(theory_dir)
    assert res.errors == []
    assert any("II.1.md: sin metadatos" in w for w in res.warnings)
    (theory_dir / "teoria" / "meta" / "I.2.json").write_text("{ no es json", encoding="utf-8")
    res = build_index(theory_dir)
    assert any("JSON inválido" in e for e in res.errors)
