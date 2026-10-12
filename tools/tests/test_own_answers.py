# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Respuestas propias (``own_answer_key``) para ejercicios sin plantilla oficial publicada."""

from __future__ import annotations

import pytest

from opotai.parse_exam import BuildError, own_answer_key


def test_own_answer_key_builds_entries_ignoring_spaces():
    key = own_answer_key({"own_answer_key": {"p2-s1": {"questions": "AB CD", "reserve": "D"}}})
    assert key.order == ["p2-s1"]
    assert [key.get("p2-s1", False, n).answer for n in range(1, 5)] == ["A", "B", "C", "D"]
    assert key.get("p2-s1", True, 1).answer == "D"
    assert key.counts() == {"p2-s1": (4, 1)}


def test_own_answer_key_rejects_non_letters():
    with pytest.raises(BuildError, match="no es A-D"):
        own_answer_key({"own_answer_key": {"p1": {"questions": "AXB"}}})
