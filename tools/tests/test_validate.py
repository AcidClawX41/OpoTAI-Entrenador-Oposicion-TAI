# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
from __future__ import annotations

import json
from pathlib import Path

from conftest import make_bank

from opotai.validate import validate_data


def _write(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2), encoding="utf-8")


def _scoring(questions: int = 3, reserve: int = 1) -> dict:
    return {
        "schema_version": 1,
        "default_scheme": "tai-li-2099",
        "schemes": [
            {
                "id": "tai-li-2099",
                "title": "Prueba",
                "access": "libre",
                "convocatoria": None,
                "sources": [],
                "duration_minutes": 120,
                "parts": [
                    {
                        "part": 1,
                        "title": "Cuestionario",
                        "kind": "theory",
                        "questions": questions,
                        "reserve": reserve,
                        "value": 1.0,
                        "penalty_divisor": 3,
                        "cases_offered": None,
                        "cases_to_choose": None,
                    }
                ],
                "grading": {
                    "units": [{"parts": [1], "max_grade": 100, "pass_grade": 50, "min_direct_ratio": 0.3}]
                },
                "notes": None,
            }
        ],
    }


def test_valid_bank_passes(data_dir: Path):
    _write(data_dir / "banks/oficiales/tai-li-2099.json", make_bank())
    res = validate_data(data_dir)
    assert res.errors == []
    assert res.checked["preguntas"] == 4


def test_detects_errors(data_dir: Path):
    bank = make_bank()
    qs = bank["sections"][0]["questions"]
    qs[0]["answer"] = None  # sin respuesta y no anulada
    qs[1]["id"] = "tai-li-2099-p1-007"  # id incoherente con number
    qs[2]["options"][1] = "b) Opción con prefijo"
    qs[2]["text"] = "Texto con resto Página 3 de 14 y infor- mática"
    qs[2]["media"] = [{"path": "assets/tai-li-2099/no-existe.png", "alt": "x"}]
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    # un segundo banco con un id de pregunta repetido
    other = make_bank("tai-pi-2099", nq=1, nr=0)
    other["sections"][0]["questions"][0]["id"] = "tai-li-2099-p1-003"
    _write(data_dir / "banks/oficiales/tai-pi-2099.json", other)
    res = validate_data(data_dir)
    text = "\n".join(res.errors)
    assert "answer nulo" in text
    assert "no sigue el patrón" in text
    assert "media inexistente" in text
    assert "repetido" in text
    warns = "\n".join(res.warnings)
    assert "prefijo" in warns
    assert "numeración de página" in warns
    assert "guion de partición" in warns


def test_schema_error_and_scoring_counts(data_dir: Path):
    bank = make_bank()
    bank["scoring_scheme"] = "tai-li-2099"
    bank["unexpected"] = True  # additionalProperties: false
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    _write(data_dir / "meta/scoring.json", _scoring(questions=80, reserve=5))
    res = validate_data(data_dir)
    text = "\n".join(res.errors)
    assert "esquema bank.schema.json" in text
    assert "3 preguntas; el esquema tai-li-2099 indica 80" in text


def test_topic_checked_against_temario(data_dir: Path):
    bank = make_bank()
    bank["sections"][0]["questions"][0]["topic"] = "IV.99"
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    _write(
        data_dir / "meta/temario.json",
        {
            "schema_version": 1,
            "convocatoria": "li-2099",
            "source": {"title": "t", "url": "u"},
            "blocks": [{"id": "IV", "title": "B4", "topics": [{"id": "IV.1", "number": 1, "title": "T"}]}],
        },
    )
    res = validate_data(data_dir)
    assert any("topic IV.99 no existe" in e for e in res.errors)


def test_inline_images_and_orphans(data_dir: Path):
    bank = make_bank()
    qs = bank["sections"][0]["questions"]
    assets = data_dir / "banks/assets/tai-li-2099"
    assets.mkdir(parents=True)
    (assets / "p1-q001.png").write_bytes(b"\x89PNG")
    (assets / "p1-q002-opt-b.png").write_bytes(b"\x89PNG")
    (assets / "huerfana.png").write_bytes(b"\x89PNG")
    qs[0]["text"] = "Observe la figura:\n\n![Esquema de red](assets/tai-li-2099/p1-q001.png)\n\n¿Qué falla?"
    qs[1]["options"][1] = "![Opción B en imagen](assets/tai-li-2099/p1-q002-opt-b.png)"
    qs[1]["explanation"] = "Véase ![](assets/tai-li-2099/no-existe.png)"
    qs[2]["text"] = "Según el diagrama siguiente, ¿qué ocurre?"  # sin imagen: aviso
    bank["sections"][0]["reserve"][0]["options"][0] = "Resto ⟦FIG:0⟧ sin resolver"
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    res = validate_data(data_dir)
    errors = "\n".join(res.errors)
    warns = "\n".join(res.warnings)
    assert "explicación: imagen en línea inexistente: assets/tai-li-2099/no-existe.png" in errors
    assert "marcador de figura sin resolver" in errors
    assert "p1-q001.png" not in errors + warns  # referenciada en línea: ni error ni huérfana
    assert "p1-q002-opt-b.png" not in errors + warns
    assert "banks/assets/tai-li-2099/huerfana.png: fichero de media no referenciado" in warns
    assert "menciona «diagrama siguiente»" in warns
    assert "tai-li-2099-p1-001: la pregunta menciona" not in warns  # tiene imagen en línea


def test_case_questions_can_rely_on_statement_images(data_dir: Path):
    bank = make_bank()
    sec = bank["sections"][0]
    sec.update(kind="case", part=2, statement="Se muestra un diagrama:\n\n| A | B |\n|---|---|\n| 1 | 2 |")
    sec["questions"][0]["text"] = "En la tabla anterior, ¿cuál es el valor de A?"
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    res = validate_data(data_dir)
    assert not [w for w in res.warnings if "menciona" in w]


def test_duplicate_question_and_markdown_warnings(data_dir: Path):
    bank = make_bank()
    qs = bank["sections"][0]["questions"]
    qs[1]["text"] = qs[0]["text"]
    qs[1]["options"] = list(qs[0]["options"])
    qs[2]["text"] = "¿Qué hace la etiqueta <head> en HTML?"
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    res = validate_data(data_dir)
    assert any("pregunta duplicada" in e for e in res.errors)
    assert any("etiqueta HTML" in w for w in res.warnings)


def test_optional_theory_blocks_sum_with_common_section(data_dir: Path):
    """Cuestionario con bloques a elegir: comunes (block null) + cada bloque alternativo."""
    from conftest import make_question

    bank = make_bank(nq=2, nr=1)
    bank["scoring_scheme"] = "tai-li-2099"
    for sid, block, nq in (("p1-b3", "III", 1), ("p1-b4", "IV", 2)):
        bank["sections"].append(
            {
                "id": sid,
                "part": 1,
                "kind": "theory",
                "title": f"Bloque {block}",
                "block": block,
                "statement": None,
                "media": [],
                "questions": [make_question("tai-li-2099", sid, i) for i in range(1, nq + 1)],
                "reserve": [],
            }
        )
    _write(data_dir / "banks/oficiales/tai-li-2099.json", bank)
    _write(data_dir / "meta/scoring.json", _scoring(questions=3, reserve=1))
    res = validate_data(data_dir)
    text = "\n".join(res.errors)
    assert "p1-b3" not in text  # 2 comunes + 1 = 3
    assert "comunes + bloque IV: 4 preguntas; el esquema tai-li-2099 indica 3" in text
    assert "#p1:" not in text  # la sección común no se compara sola con el esquema
