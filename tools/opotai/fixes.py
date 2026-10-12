# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Correcciones manuales reproducibles (``tools/opotai/fixes/<bank-id>.json``).

Formato::

    {
      "bank_id": "tai-li-2024",
      "questions": {
        "tai-li-2024-p2-s1-001": {
          "note": "motivo (obligatorio)",
          "replace": [{"old": "''", "new": "\\"", "fields": ["options"], "count": 8}],
          "set": {"text": "…", "options": ["…", "…", "…", "…"], "needs_review": true},
          "options_code": true,
          "text_code": {"lang": "sql", "from": "Dada la consulta:"}
        }
      },
      "sections": {
        "p2-s1": {"note": "…", "replace": [...], "set": {"statement": "…"}}
      }
    }

* ``replace``: sustituciones literales; cada una DEBE aplicarse al menos una vez (si ``count``
  está, exactamente ese número de veces). Así un parche obsoleto se detecta al regenerar.
* ``set``: sustituye campos completos (``text``, ``options``, ``statement``, ``needs_review``…).
  Con ``"same_text": true`` se comprueba que el nuevo texto solo cambia el formato (Markdown,
  viñetas, saltos de línea) y no las palabras.
* ``options_code``: envuelve cada opción en código en línea (`` `…` ``).
* ``text_code``: convierte en bloque de código la parte del enunciado que sigue a ``from``.
* ``text_block``: ``{"start": "<línea exacta>", "lines": N, "lang": "java"}`` convierte N filas
  del enunciado original (desde la que coincide con ``start``) en un bloque de código,
  conservando los saltos de línea y la sangría (niveles deducidos de la posición x).
* ``options_block``: ``"java"`` convierte cada opción en un bloque de código con sus filas
  originales (opciones de código multilínea).
* ``global`` (nivel superior): ``{"note": "…", "replace": [{"old": "Elderecho", "new": "El
  derecho", "word": true, "count": 2}]}`` aplica sustituciones a todos los enunciados, opciones y
  ``statement`` del banco antes que los parches por pregunta (útil para errores recurrentes de
  OCR). ``word`` exige límites de palabra; cada regla debe aplicarse al menos una vez.

Las operaciones de código comprueban que no se pierde ni se añade texto.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path

from .paths import FIXES_DIR
from .textutil import clean_inline, join_lines, normalize_chars, normalize_for_match, plain_text

Rows = list[tuple[float, str]]

QUESTION_SET_FIELDS = {"text", "options", "needs_review", "media", "outdated", "outdated_note", "tags"}
SECTION_SET_FIELDS = {"statement", "title", "block", "media"}


class FixError(ValueError):
    pass


@dataclass
class FixReport:
    applied: list[str] = field(default_factory=list)
    unused: list[str] = field(default_factory=list)


def load_fixes(bank_id: str, fixes_dir: Path = FIXES_DIR) -> dict:
    path = fixes_dir / f"{bank_id}.json"
    if not path.exists():
        return {"bank_id": bank_id, "questions": {}, "sections": {}}
    with path.open(encoding="utf-8") as fh:
        data = json.load(fh)
    if data.get("bank_id") != bank_id:
        raise FixError(f"{path.name}: bank_id {data.get('bank_id')!r} ≠ {bank_id!r}")
    data.setdefault("questions", {})
    data.setdefault("sections", {})
    for key, fx in list(data["questions"].items()) + list(data["sections"].items()):
        if not fx.get("note"):
            raise FixError(f"{path.name}: el parche {key} necesita un 'note' que lo justifique")
    if data.get("global") and not data["global"].get("note"):
        raise FixError(f"{path.name}: el bloque 'global' necesita un 'note' que lo justifique")
    return data


def _global_sub(text: str, old: str, new: str, pat: re.Pattern | None) -> tuple[str, int]:
    if pat is None:
        return text.replace(old, new), text.count(old)
    return pat.subn(lambda _m: new, text)


def apply_global_replace(bank: dict, rules: list[dict], label: str = "global") -> None:
    """Sustituciones en todos los textos visibles del banco (enunciados, opciones, ``statement``)."""
    for rule in rules:
        old, new = rule["old"], rule["new"]
        pat = re.compile(r"(?<!\w)" + re.escape(old) + r"(?!\w)") if rule.get("word") else None
        total = 0
        for sec in bank["sections"]:
            if isinstance(sec.get("statement"), str):
                sec["statement"], n = _global_sub(sec["statement"], old, new, pat)
                total += n
            for q in sec.get("questions", []) + sec.get("reserve", []):
                q["text"], n = _global_sub(q["text"], old, new, pat)
                total += n
                opts = []
                for o in q["options"]:
                    o, n = _global_sub(o, old, new, pat)
                    total += n
                    opts.append(o)
                q["options"] = opts
        expected = rule.get("count")
        if total == 0:
            raise FixError(f"{label}: la sustitución {old!r} no se aplica (¿parche obsoleto?)")
        if expected is not None and total != expected:
            raise FixError(f"{label}: la sustitución {old!r} se aplicó {total} veces (esperadas {expected})")


def _apply_replace(obj: dict, fields: list[str], rules: list[dict], label: str) -> None:
    for rule in rules:
        old, new = rule["old"], rule["new"]
        targets = rule.get("fields", fields)
        total = 0
        for f in targets:
            val = obj.get(f)
            if isinstance(val, str):
                total += val.count(old)
                obj[f] = val.replace(old, new)
            elif isinstance(val, list):
                out = []
                for item in val:
                    if isinstance(item, str):
                        total += item.count(old)
                        item = item.replace(old, new)
                    out.append(item)
                obj[f] = out
        expected = rule.get("count")
        if total == 0:
            raise FixError(f"{label}: la sustitución {old!r} no se aplica (¿parche obsoleto?)")
        if expected is not None and total != expected:
            raise FixError(f"{label}: la sustitución {old!r} se aplicó {total} veces (esperadas {expected})")


def code_inline(text: str) -> str:
    t = text.strip()
    if t.startswith("`") and t.endswith("`"):
        return t
    fence = "``" if "`" in t else "`"
    pad = " " if fence == "``" else ""
    return f"{fence}{pad}{t}{pad}{fence}"


def code_block(rows: Rows, lang: str = "", indent: str = "    ", use_x: bool = True) -> str:
    """Bloque de código a partir de filas (x0, texto).

    La sangría se reconstruye a partir de la posición x (cada x distinta, con tolerancia de 3 pt,
    es un nivel de anidamiento ordinal) y se conservan los espacios iniciales del propio texto.
    """
    levels: list[float] = []
    for x in sorted(x for x, _ in rows):
        if not levels or x - levels[-1] > 3.0:
            levels.append(x)

    def level(x: float) -> int:
        return max(i for i, lx in enumerate(levels) if x >= lx - 3.0)

    lines = [indent * (level(x) if use_x else 0) + normalize_chars(t).rstrip() for x, t in rows]
    return f"```{lang}\n" + "\n".join(lines) + "\n```"


def _prose(rows: Rows) -> str:
    return clean_inline(join_lines([t for _, t in rows]))


def apply_text_block(q: dict, rows: Rows, spec: dict | list[dict], label: str) -> None:
    """Convierte uno o varios tramos de filas del enunciado en bloques de código."""
    specs = spec if isinstance(spec, list) else [spec]
    ranges: list[tuple[int, int, str]] = []
    pos = 0
    for sp in specs:
        starts = [i for i, (_, t) in enumerate(rows) if i >= pos and t.strip() == sp["start"].strip()]
        if not starts:
            raise FixError(f"{label}: text_block: no hay ninguna fila igual a {sp['start']!r}")
        i, n = starts[0], sp["lines"]
        if i + n > len(rows):
            raise FixError(f"{label}: text_block: el bloque excede el enunciado ({len(rows)} filas)")
        ranges.append((i, i + n, sp.get("lang", "")))
        pos = i + n
    parts = []
    prev = 0
    for i, j, lang in ranges:
        if rows[prev:i]:
            parts.append(_prose(rows[prev:i]))
        parts.append(code_block(rows[i:j], lang))
        prev = j
    if rows[prev:]:
        parts.append(_prose(rows[prev:]))
    new = "\n\n".join(parts)
    if _squash(_unfence(new)) != _squash(q["text"]):
        raise FixError(f"{label}: text_block alteraría el texto del enunciado")
    q["text"] = new


def _unfence(s: str) -> str:
    return re.sub(r"```[A-Za-z0-9+#-]*", "", s)


def apply_options_block(q: dict, option_rows: list[Rows], spec: str | dict, label: str) -> None:
    """Cada opción pasa a ser un bloque de código con sus filas originales.

    ``spec`` es el lenguaje (``"java"``) o ``{"lang": "java", "indent": true}``; por defecto no se
    deduce sangría de la x (en las opciones suele haber sangría francesa del propio cuadernillo).
    """
    if len(option_rows) != 4:
        raise FixError(f"{label}: options_block: se esperaban 4 opciones con filas")
    lang = spec if isinstance(spec, str) else spec.get("lang", "")
    use_x = False if isinstance(spec, str) else bool(spec.get("indent", False))
    new = [code_block(rows, lang, use_x=use_x) for rows in option_rows]
    for old, nw in zip(q["options"], new, strict=True):
        if _squash(old) != _squash(_unfence(nw)):
            raise FixError(f"{label}: options_block alteraría el texto de una opción")
    q["options"] = new


def apply_question_fix(q: dict, fx: dict, label: str, raw: dict | None = None) -> None:
    if fx.get("text_block") or fx.get("options_block"):
        if raw is None:
            raise FixError(f"{label}: text_block/options_block necesitan las filas originales")
        if fx.get("text_block"):
            apply_text_block(q, raw["text_rows"], fx["text_block"], label)
        if fx.get("options_block"):
            apply_options_block(q, raw["option_rows"], fx["options_block"], label)
    if "replace" in fx:
        _apply_replace(q, ["text", "options"], fx["replace"], label)
    for k, v in fx.get("set", {}).items():
        if k not in QUESTION_SET_FIELDS:
            raise FixError(f"{label}: campo no modificable por parche: {k}")
        if k == "options" and (not isinstance(v, list) or len(v) != 4):
            raise FixError(f"{label}: 'options' debe tener 4 elementos")
        if fx.get("same_text") and k in ("text", "options"):
            # El nuevo valor solo puede cambiar el formato (Markdown, saltos de línea, viñetas).
            old_v = q[k] if isinstance(q[k], list) else [q[k]]
            new_v = v if isinstance(v, list) else [v]
            if [normalize_for_match(plain_text(x)) for x in old_v] != [
                normalize_for_match(plain_text(x)) for x in new_v
            ]:
                raise FixError(f"{label}: 'set' de {k} con same_text cambia el contenido, no solo el formato")
        q[k] = v
    if fx.get("options_code"):
        q["options"] = [code_inline(o) for o in q["options"]]
    tc = fx.get("text_code")
    if tc:
        marker = tc["from"]
        text = q["text"]
        idx = text.find(marker)
        if idx < 0:
            raise FixError(f"{label}: text_code: no se encuentra {marker!r} en el enunciado")
        head = text[: idx + len(marker)].rstrip()
        code = text[idx + len(marker) :].strip()
        lines = tc.get("lines")
        body = "\n".join(lines) if lines else code
        if lines and _squash(code) != _squash(body):
            raise FixError(f"{label}: text_code: las líneas dadas no coinciden con el texto extraído")
        q["text"] = f"{head}\n\n```{tc.get('lang', '')}\n{body}\n```"


def _squash(s: str) -> str:
    return "".join(s.split())


def apply_section_fix(sec: dict, fx: dict, label: str) -> None:
    if "replace" in fx:
        _apply_replace(sec, ["statement"], fx["replace"], label)
    for k, v in fx.get("set", {}).items():
        if k not in SECTION_SET_FIELDS:
            raise FixError(f"{label}: campo de sección no modificable por parche: {k}")
        sec[k] = v


def apply_fixes(bank: dict, fixes: dict, raw_rows: dict[str, dict] | None = None) -> FixReport:
    report = FixReport()
    if fixes.get("global"):
        apply_global_replace(bank, fixes["global"].get("replace", []), f"{bank['id']}:global")
    qfixes = dict(fixes.get("questions", {}))
    sfixes = dict(fixes.get("sections", {}))
    for sec in bank["sections"]:
        if sec["id"] in sfixes:
            apply_section_fix(sec, sfixes.pop(sec["id"]), f"{bank['id']}:{sec['id']}")
            report.applied.append(sec["id"])
        for list_name in ("questions", "reserve"):
            for q in sec.get(list_name, []):
                if q["id"] in qfixes:
                    raw = (raw_rows or {}).get(q["id"])
                    apply_question_fix(q, qfixes.pop(q["id"]), q["id"], raw)
                    report.applied.append(q["id"])
    report.unused = list(qfixes) + list(sfixes)
    if report.unused:
        raise FixError(f"parches para ids inexistentes: {report.unused}")
    return report
