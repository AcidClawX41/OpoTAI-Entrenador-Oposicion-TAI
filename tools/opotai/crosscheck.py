# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Verificación cruzada entre modelos de cuadernillo (A/B).

El modelo B contiene las mismas preguntas que el A en otro orden. Para cada pregunta del banco
(modelo A) se busca la del modelo B con el mismo enunciado y se comprueba que la opción correcta
según la plantilla B tiene el mismo texto que la correcta según la plantilla A (y que coinciden
las anulaciones). Detecta desfases en el mapeo de respuestas y errores de extracción.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

from .answer_key import AnswerKey, compile_markers, read_answer_key
from .booklet import BookletConfig, ParsedBooklet, parse_booklet
from .textutil import normalize_for_match, plain_text


@dataclass
class CrossReport:
    checked: int = 0
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _norm(s: str) -> str:
    return normalize_for_match(plain_text(s))


def _key_of(text: str, options: list[str]) -> str:
    return _norm(text) + " || " + " | ".join(sorted(_norm(o) for o in options))


def run_crosscheck(cfg: dict, bank: dict, raw_dir: Path) -> CrossReport:
    cc = cfg["crosscheck"]
    kinds = {s["id"]: s["kind"] for s in cfg["sections"]}
    rep = CrossReport()
    parsed: list[ParsedBooklet] = []
    for bdict in cc["booklets"]:
        bc = BookletConfig.from_dict(bdict)
        parsed.append(parse_booklet(bc, kinds, raw_dir / bc.file))
    key: AnswerKey = read_answer_key(
        raw_dir / cc["answer_key"]["file"], compile_markers(cc["answer_key"]["markers"])
    )
    # Erratas de maquetación propias del modelo B (documentadas en la config): se normalizan
    # antes de comparar. Cada sustitución debe aplicarse al menos una vez.
    for rule in cc.get("b_replace", []):
        hits = 0
        for pb in parsed:
            for sec in pb.sections.values():
                for q in sec.questions + sec.reserve:
                    if rule["old"] in q.text:
                        q.text = q.text.replace(rule["old"], rule["new"])
                        hits += 1
                    for i, o in enumerate(q.options):
                        if rule["old"] in o:
                            q.options[i] = o.replace(rule["old"], rule["new"])
                            hits += 1
        if not hits:
            rep.errors.append(f"b_replace {rule['old']!r} no se aplica (¿obsoleto?)")
    # Índice B: (sección, reserva) -> lista de (clave, texto norm, opciones, respuesta, anulada)
    index: dict[tuple[str, bool], list[tuple[str, str, list[str], str | None, bool]]] = {}
    for pb in parsed:
        for sid, sec in pb.sections.items():
            for reserve, lst in ((False, sec.questions), (True, sec.reserve)):
                for q in lst:
                    e = key.get(sid, reserve, q.number)
                    if e is None:
                        rep.errors.append(
                            f"modelo B: {sid}{' reserva' if reserve else ''} {q.number} sin respuesta"
                        )
                        continue
                    index.setdefault((sid, reserve), []).append(
                        (
                            _key_of(q.text, q.options),
                            _norm(q.text),
                            q.options,
                            e.answer,
                            e.annulled,
                        )
                    )
    for sec in bank["sections"]:
        for reserve, lst in ((False, sec["questions"]), (True, sec.get("reserve", []))):
            pool = index.get((sec["id"], reserve), [])
            if len(pool) != len(lst):
                rep.errors.append(
                    f"{sec['id']}{' reserva' if reserve else ''}: "
                    f"{len(lst)} preguntas en A y {len(pool)} en B"
                )
            for q in lst:
                k = _key_of(q["text"], q["options"])
                matches = [p for p in pool if p[0] == k]
                if not matches:
                    tnorm = _norm(q["text"])
                    matches = [p for p in pool if p[1] == tnorm]
                    if matches:
                        rep.warnings.append(f"{q['id']}: enunciado igual en B pero opciones distintas")
                if len(matches) != 1:
                    rep.errors.append(f"{q['id']}: {len(matches)} coincidencias en el modelo B")
                    continue
                _, _, b_opts, b_ans, b_ann = matches[0]
                rep.checked += 1
                if bool(q.get("annulled")) != b_ann:
                    rep.errors.append(f"{q['id']}: anulada en A={q.get('annulled')} pero en B={b_ann}")
                    continue
                if q.get("annulled"):
                    continue
                a_ans = q["answer"]
                a_txt = _norm(q["options"]["ABCD".index(a_ans)])
                b_txt = _norm(b_opts["ABCD".index(b_ans)]) if b_ans else None
                if a_txt != b_txt:
                    rep.errors.append(
                        f"{q['id']}: la correcta en A ({a_ans}: {q['options']['ABCD'.index(a_ans)][:60]!r}) "
                        f"≠ correcta en B ({b_ans}: "
                        f"{(b_opts['ABCD'.index(b_ans)][:60] if b_ans else None)!r})"
                    )
        # enunciado del supuesto
        if sec.get("statement"):
            bst = None
            for pb in parsed:
                if sec["id"] in pb.sections:
                    bst = pb.statement_markdown(sec["id"])
            if bst is None or _norm(bst) != _norm(sec["statement"]):
                rep.warnings.append(f"{sec['id']}: el enunciado del supuesto difiere entre modelos A y B")
    return rep
