# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
from __future__ import annotations

import copy

import pytest
from conftest import make_bank

from opotai.fixes import FixError, apply_fixes
from opotai.parse_exam import BuildError, BuildReport, _preserve_author_fields


def test_apply_fixes_replace_set_and_code():
    bank = make_bank()
    q = bank["sections"][0]["questions"][0]
    q["text"] = "Suponga el programa: x=1; print x"
    q["options"] = ["a ''b''", "c", "d", "e"]
    fixes = {
        "questions": {
            q["id"]: {
                "note": "prueba",
                "replace": [{"old": "''", "new": '"', "fields": ["options"], "count": 2}],
                "options_code": True,
                "text_code": {"from": "Suponga el programa:", "lang": "", "lines": ["x=1; print x"]},
            }
        },
        "sections": {},
    }
    apply_fixes(bank, fixes)
    assert q["options"][0] == '`a "b"`'
    assert q["text"] == "Suponga el programa:\n\n```\nx=1; print x\n```"


def test_apply_fixes_detects_stale_patch():
    bank = make_bank()
    qid = bank["sections"][0]["questions"][0]["id"]
    with pytest.raises(FixError):
        apply_fixes(bank, {"questions": {qid: {"note": "x", "replace": [{"old": "no está", "new": "y"}]}}})
    with pytest.raises(FixError):
        apply_fixes(bank, {"questions": {"tai-li-2099-p1-999": {"note": "x", "set": {"text": "y"}}}})
    with pytest.raises(FixError):
        apply_fixes(bank, {"questions": {qid: {"note": "x", "set": {"answer": "B"}}}})


def test_preserve_author_fields_keeps_content_and_warns():
    old = make_bank()
    q_old = old["sections"][0]["questions"][0]
    q_old.update(explanation="Porque sí.", topic="I.1", tags=["ce"], needs_review=True)
    new = copy.deepcopy(make_bank())
    new["sections"][0]["questions"][0]["text"] = "Texto corregido?"
    rep = BuildReport(bank_id=new["id"])
    _preserve_author_fields(new, old, rep, force=False)
    q_new = new["sections"][0]["questions"][0]
    assert q_new["explanation"] == "Porque sí."
    assert q_new["topic"] == "I.1"
    assert q_new["tags"] == ["ce"]
    assert q_new["needs_review"] is True
    assert q_new["text"] == "Texto corregido?"  # el texto nuevo manda
    assert any("han cambiado" in w for w in rep.warnings)


def test_preserve_author_fields_refuses_to_drop_annotated_question():
    old = make_bank(nq=3)
    old["sections"][0]["questions"][2]["explanation"] = "Contenido de autor"
    new = make_bank(nq=2)
    with pytest.raises(BuildError):
        _preserve_author_fields(new, old, BuildReport(bank_id=new["id"]), force=False)
    rep = BuildReport(bank_id=new["id"])
    _preserve_author_fields(new, old, rep, force=True)
    assert any("desaparecen" in w for w in rep.warnings)
