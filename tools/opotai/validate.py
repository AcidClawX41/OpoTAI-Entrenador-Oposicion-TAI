# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Valida todo ``data/`` contra ``data/schema/*.schema.json`` y reglas de calidad adicionales.

Uso::

    cd tools
    uv run python -m opotai.validate            # errores → código de salida 1; avisos aparte
    uv run python -m opotai.validate --strict   # los avisos también cuentan como errores
    uv run python -m opotai.validate --data ruta/a/data   # otro directorio (tests)

Comprueba:

* Esquemas: bancos (``data/banks/**``), ``meta/scoring.json``, ``meta/convocatorias.json``,
  ``meta/temario.json``, ``meta/localidades.json``, ``meta/destinos/*.json`` y
  ``teoria/index.json`` (si existen).
* Bancos: id = nombre de fichero; ids de banco/sección/pregunta únicos y con el patrón
  ``<bank-id>-<sección>-<NNN>`` / ``-r<k>`` coherente con ``number``; 4 opciones no vacías y
  distintas; ``answer`` no nulo salvo anuladas; nº de preguntas por sección frente al esquema de
  puntuación (si existe); restos de PDF (paginación, cabeceras, guiones de partición, prefijos
  ``a)``, espacios dobles, caracteres de control…); peligros de Markdown (HTML literal,
  comillas invertidas desparejadas); textos duplicados; ``topic`` presente en ``meta/temario.json``.
* Imágenes: ficheros de ``media`` y referencias en línea ``![alt](assets/…)`` de cualquier campo
  Markdown (enunciado, opciones, ``statement``, explicación, notas) existentes bajo
  ``data/banks/``, con texto alternativo y tamaño razonable; ficheros de ``assets/`` sin
  referencias; y aviso si una pregunta o supuesto menciona una figura/tabla/esquema/captura sin
  imagen, tabla Markdown ni bloque de código que lo acompañe.
* Teoría: ``teoria/index.json`` (esquema, ficheros ``.md`` existentes, temas del temario) e
  imágenes de los temas (solo ``diagramas/<tema>-<nombre>.svg``, existentes, seguros y con alt).
* Referencias cruzadas entre ficheros de ``meta/``.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from pathlib import Path

from .bankio import iter_questions, schema_errors
from .paths import DATA_DIR
from .textutil import FIGURE_PLACEHOLDER_RE, HTML_TAG_RE, IMAGE_MD_RE, normalize_for_match, split_code

SLUG_RE = re.compile(r"^[a-z0-9]+(-[a-z0-9]+)*$")
MAX_MEDIA_BYTES = 320_000  # contrato: ≤ ~300 KB por imagen; aviso por encima de esto

# Menciones explícitas a un elemento visual en el texto de una pregunta o supuesto.
_VISUAL = (
    r"(?:figura|imagen|ilustración|diagrama|esquema|captura|pantallazo|gráfico|gráfica|"
    r"tabla|cuadro|modelo de datos|diagrama de clases)\b"
)
# Solo en singular: «¿cuál de los siguientes diagramas…?» enumera opciones, no remite a una figura.
FIGURE_MENTION_RE = re.compile(
    rf"(?:\b(?:la|el)\s+siguiente\s+{_VISUAL}"
    rf"|\b{_VISUAL}\s+(?:siguiente|adjunt[ao]|anterior|superior|inferior)\b"
    rf"|\bse\s+muestra[n]?\s+(?:a\s+continuación\s+)?(?:en\s+)?(?:un|una|el|la|los|las)\s+(?:\w+\s+)?{_VISUAL}"
    rf"|\b(?:observe|observa|fíjese\s+en|véase)\s+(?:la|el|las|los)\s+{_VISUAL}"
    rf"|\bfigura\s+\d+\b)",
    re.I,
)
MD_TABLE_RE = re.compile(r"(?m)^\s*\|.*\|\s*$\n^\s*\|?\s*:?-{3,}")

# Restos típicos de la extracción de PDF.
ARTIFACT_PATTERNS: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bP[áa]gina\s+\d+\s+(de|/)\s+\d+\b", re.I), "numeración de página"),
    (re.compile(r"\bMODELO\s+[AB]\b"), "cabecera de modelo"),
    (re.compile(r"\b(TAI-[LP]I?|TAI\s*[–-]\s*[LP]I?)\b\s*[–-]"), "cabecera del cuadernillo"),
    (re.compile(r"[a-záéíóúñ]{2,}- [a-záéíóúñ]{2,}"), "posible guion de partición («infor- mática»)"),
    (re.compile(r"  +"), "espacios dobles"),
    (re.compile(r"[­�]"), "guion blando o carácter de reemplazo"),
    (re.compile(r"[-]"), "carácter de uso privado (viñeta de fuente Symbol)"),
    (re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]"), "carácter de control"),
    (re.compile(r"[ﬀ-ﬆ]"), "ligadura tipográfica"),
    (re.compile(r"\t"), "tabulador"),
]
OPTION_PREFIX_RE = re.compile(r"^\(?[a-dA-D]\)\s")
LIST_START_RE = re.compile(r"^(\d{1,9}[.)]|[-+*])(\s|$)")


@dataclass
class Result:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    checked: Counter = field(default_factory=Counter)

    def error(self, where: str, msg: str) -> None:
        self.errors.append(f"{where}: {msg}")

    def warn(self, where: str, msg: str) -> None:
        self.warnings.append(f"{where}: {msg}")


def _load(path: Path, res: Result) -> object | None:
    try:
        with path.open(encoding="utf-8") as fh:
            return json.load(fh)
    except json.JSONDecodeError as exc:
        res.error(str(path), f"JSON no válido: {exc}")
    except OSError as exc:
        res.error(str(path), f"no se puede leer: {exc}")
    return None


def _schema(obj: object, schema: str, where: str, res: Result, schema_dir: Path) -> bool:
    errs = schema_errors(obj, schema, schema_dir)
    for e in errs[:50]:
        res.error(where, f"esquema {schema}: {e}")
    if len(errs) > 50:
        res.error(where, f"… y {len(errs) - 50} errores de esquema más")
    return not errs


def check_text(text: str, where: str, res: Result, kind: str) -> None:
    """Restos de PDF y peligros de Markdown en un texto visible."""
    if text != text.strip():
        res.warn(where, f"{kind}: espacios al principio o al final")
    # Texto sin código (el código se sustituye por un marcador para no crear espacios dobles).
    prose = "".join("·" if is_code else chunk for chunk, is_code in split_code(text))
    for pat, label in ARTIFACT_PATTERNS:
        target = prose if label in ("espacios dobles",) else text
        if label == "espacios dobles":
            # dentro de párrafos (no cuenta la sangría de listas/código)
            target = "\n".join(line.strip() for line in prose.splitlines())
        m = pat.search(target)
        if m:
            res.warn(where, f"{kind}: {label}: …{target[max(0, m.start() - 20) : m.end() + 20]!r}…")
    tag = HTML_TAG_RE.search(prose)
    if tag:
        res.warn(
            where, f"{kind}: etiqueta HTML fuera de código (se interpretaría como HTML): {tag.group(0)!r}"
        )
    if prose.count("`") % 2:
        res.warn(where, f"{kind}: comillas invertidas (`) desparejadas")
    if prose.count("**") % 2:
        res.warn(where, f"{kind}: negrita (**) desparejada")
    if text.count("```") % 2:
        res.error(where, f"{kind}: bloque de código (```) sin cerrar")


def validate_bank(
    path: Path,
    bank: dict,
    res: Result,
    data_dir: Path,
    scoring: dict | None,
    topics: set[str] | None,
    convocatorias: set[str] | None,
    seen_qids: dict[str, str],
    seen_banks: dict[str, str],
) -> None:
    where = str(path.relative_to(data_dir.parent)) if data_dir.parent in path.parents else str(path)
    bid = bank.get("id", "?")
    if path.stem != bid:
        res.error(where, f"el id del banco ({bid}) no coincide con el nombre del fichero")
    if bid in seen_banks:
        res.error(where, f"id de banco repetido (también en {seen_banks[bid]})")
    seen_banks[bid] = where
    if bank.get("kind") == "official":
        if not re.match(r"^tai-(li|pi)-\d{4}(-[a-z0-9]+)*$", bid):
            res.warn(where, f"id de banco oficial fuera de la convención tai-<li|pi>-<año>[-sufijo]: {bid}")
        if not (bank.get("source") or {}).get("documents"):
            res.warn(where, "banco oficial sin documentos de origen")
    scheme = None
    if bank.get("scoring_scheme"):
        if scoring is None:
            res.warn(
                where, f"no existe meta/scoring.json: no se comprueba el esquema {bank['scoring_scheme']}"
            )
        else:
            scheme = next(
                (s for s in scoring.get("schemes", []) if s.get("id") == bank["scoring_scheme"]), None
            )
            if scheme is None:
                res.warn(
                    where, f"el esquema de puntuación {bank['scoring_scheme']} no está en meta/scoring.json"
                )
    if bank.get("convocatoria") and convocatorias is not None and bank["convocatoria"] not in convocatorias:
        res.warn(where, f"la convocatoria {bank['convocatoria']} no está en meta/convocatorias.json")

    sec_ids = Counter(s.get("id") for s in bank.get("sections", []))
    for sid, n in sec_ids.items():
        if n > 1:
            res.error(where, f"sección repetida: {sid}")
    sigs: dict[str, str] = {}
    case_sections = Counter()
    # Cuestionario con bloques a elegir (p. ej. OEP 2015-2016: bloques I y II comunes + bloque III
    # o IV): varias secciones «theory» en la misma parte, las comunes con block null y las
    # alternativas con block. Cada alternativa + las comunes debe sumar lo que indica el esquema.
    theory_parts: dict[object, list[dict]] = {}
    for sec in bank.get("sections", []):
        if sec.get("kind") == "theory":
            theory_parts.setdefault(sec.get("part"), []).append(sec)
    optional_parts = {
        p for p, secs in theory_parts.items() if len(secs) > 1 and any(s.get("block") for s in secs)
    }
    for sec in bank.get("sections", []):
        sid = sec.get("id", "?")
        swhere = f"{where}#{sid}"
        if sec.get("kind") == "case":
            case_sections[sec.get("part")] += 1
            if not sec.get("statement"):
                res.warn(swhere, "supuesto sin enunciado (statement)")
        if sec.get("statement"):
            check_text(sec["statement"], swhere, res, "enunciado del supuesto")
            _check_markdown_images(sec["statement"], swhere, res, data_dir, "enunciado del supuesto")
        for m in sec.get("media", []) or []:
            _check_media(m, swhere, res, data_dir)
        section_visual = bool(sec.get("media")) or _has_visual(sec.get("statement") or "")
        if sec.get("statement") and not section_visual:
            _warn_visual_mention(sec["statement"], swhere, res, "el enunciado del supuesto")
        if scheme is not None:
            part = next((p for p in scheme.get("parts", []) if p.get("part") == sec.get("part")), None)
            if part is None:
                res.error(swhere, f"la parte {sec.get('part')} no existe en el esquema {scheme['id']}")
            else:
                nq = len(sec.get("questions", []))
                nr = len(sec.get("reserve", []) or [])
                if sec.get("part") in optional_parts and sec.get("kind") == "theory":
                    pass  # se comprueba por grupos (comunes + cada bloque a elegir) más abajo
                elif nq != part.get("questions"):
                    res.error(
                        swhere, f"{nq} preguntas; el esquema {scheme['id']} indica {part.get('questions')}"
                    )
                elif part.get("reserve") is not None and nr != part["reserve"]:
                    res.warn(swhere, f"{nr} de reserva; el esquema {scheme['id']} indica {part['reserve']}")
                if part.get("kind") and part["kind"] != sec.get("kind"):
                    res.error(swhere, f"kind {sec.get('kind')} ≠ {part['kind']} en el esquema")
        numbers = {"questions": [], "reserve": []}
        for _s, list_name, _i, q in iter_questions({"sections": [sec]}):
            qid = q.get("id", "?")
            qwhere = f"{where}#{qid}"
            res.checked["preguntas"] += 1
            numbers[list_name].append(q.get("number"))
            expected = f"{bid}-{sid}-" + (
                f"r{q.get('number')}" if list_name == "reserve" else f"{q.get('number', 0):03d}"
            )
            if qid != expected:
                res.error(qwhere, f"id no sigue el patrón (esperado {expected})")
            if not SLUG_RE.match(str(qid)):
                res.error(qwhere, "id con caracteres no válidos")
            if qid in seen_qids:
                res.error(qwhere, f"id de pregunta repetido (también en {seen_qids[qid]})")
            seen_qids[qid] = where
            text = q.get("text", "")
            opts = q.get("options", [])
            if not str(text).strip():
                res.error(qwhere, "enunciado vacío")
            else:
                check_text(text, qwhere, res, "enunciado")
                if LIST_START_RE.match(text):
                    res.warn(qwhere, "el enunciado empieza como una lista Markdown")
            if len(opts) != 4:
                res.error(qwhere, f"{len(opts)} opciones (deben ser 4)")
            for i, o in enumerate(opts):
                label = f"opción {'ABCD'[i] if i < 4 else i}"
                if not isinstance(o, str) or not o.strip():
                    res.error(qwhere, f"{label} vacía")
                    continue
                if OPTION_PREFIX_RE.match(o):
                    res.warn(qwhere, f"{label} conserva el prefijo «a)»: {o[:30]!r}")
                if LIST_START_RE.match(o):
                    res.warn(qwhere, f"{label} empieza como una lista Markdown: {o[:30]!r}")
                check_text(o, qwhere, res, label)
            norm_opts = [normalize_for_match(o) for o in opts if isinstance(o, str)]
            exact_opts = [" ".join(o.split()) for o in opts if isinstance(o, str)]
            if len(set(exact_opts)) != len(exact_opts):
                res.warn(qwhere, "opciones repetidas")
            if q.get("answer") is None and not q.get("annulled"):
                res.error(qwhere, "answer nulo en una pregunta no anulada")
            if q.get("option_notes") is not None and len(q["option_notes"]) != 4:
                res.error(qwhere, "option_notes debe tener 4 elementos")
            topic = q.get("topic")
            if topic is not None:
                if topics is None:
                    res.warn(qwhere, f"topic {topic} sin meta/temario.json para comprobarlo")
                elif topic not in topics:
                    res.error(qwhere, f"topic {topic} no existe en meta/temario.json")
            if q.get("outdated") and not q.get("outdated_note"):
                res.warn(qwhere, "outdated sin outdated_note")
            for m in q.get("media", []) or []:
                _check_media(m, qwhere, res, data_dir)
            md_fields = [("enunciado", text)] + [
                (f"opción {'ABCD'[i] if i < 4 else i}", o) for i, o in enumerate(opts) if isinstance(o, str)
            ]
            md_fields.append(("explicación", q.get("explanation")))
            md_fields += [
                (f"nota de la opción {'ABCD'[i] if i < 4 else i}", n)
                for i, n in enumerate(q.get("option_notes") or [])
            ]
            md_fields.append(("outdated_note", q.get("outdated_note")))
            for label, value in md_fields:
                if isinstance(value, str) and value:
                    _check_markdown_images(value, qwhere, res, data_dir, label)
            q_visual = (
                bool(q.get("media"))
                or section_visual
                or any(_has_visual(o) for o in [text, *opts] if isinstance(o, str))
            )
            if not q_visual:
                _warn_visual_mention(
                    "\n".join(o for o in [text, *opts] if isinstance(o, str)), qwhere, res, "la pregunta"
                )
            sig = normalize_for_match(str(text)) + "||" + "|".join(norm_opts)
            if sig in sigs:
                res.error(qwhere, f"pregunta duplicada (mismo enunciado y opciones que {sigs[sig]})")
            else:
                sigs[sig] = qid
        for list_name, nums in numbers.items():
            if nums and sorted(nums) != list(range(1, len(nums) + 1)):
                res.warn(f"{where}#{sid}", f"numeración de {list_name} no es 1..N: {nums}")
    if scheme is not None:
        for pnum in sorted(optional_parts, key=str):
            part = next((p for p in scheme.get("parts", []) if p.get("part") == pnum), None)
            if part is None:
                continue
            common = [s for s in theory_parts[pnum] if not s.get("block")]
            nq_common = sum(len(s.get("questions", [])) for s in common)
            nr_common = sum(len(s.get("reserve", []) or []) for s in common)
            for alt in (s for s in theory_parts[pnum] if s.get("block")):
                awhere = f"{where}#{alt.get('id')}"
                nq = nq_common + len(alt.get("questions", []))
                nr = nr_common + len(alt.get("reserve", []) or [])
                if nq != part.get("questions"):
                    res.error(
                        awhere,
                        f"comunes + bloque {alt.get('block')}: {nq} preguntas; "
                        f"el esquema {scheme['id']} indica {part.get('questions')}",
                    )
                if part.get("reserve") is not None and nr != part["reserve"]:
                    res.warn(
                        awhere,
                        f"comunes + bloque {alt.get('block')}: {nr} de reserva; "
                        f"el esquema {scheme['id']} indica {part['reserve']}",
                    )
        for p in scheme.get("parts", []):
            if p.get("kind") == "case" and p.get("cases_offered"):
                n = case_sections.get(p["part"], 0)
                if n != p["cases_offered"]:
                    res.warn(
                        where, f"parte {p['part']}: {n} supuestos; el esquema ofrece {p['cases_offered']}"
                    )


def _check_image_file(path: str, alt: str, where: str, res: Result, data_dir: Path, what: str) -> None:
    """Ruta relativa a ``data/banks/`` bajo ``assets/``, existente, con alt y tamaño razonable."""
    if not path.startswith("assets/") or ".." in Path(path).parts:
        res.error(where, f"{what} fuera de assets/ (rutas relativas a data/banks/): {path!r}")
        return
    p = data_dir / "banks" / path
    if not p.is_file():
        res.error(where, f"{what} inexistente: {path}")
        return
    size = p.stat().st_size
    if size > MAX_MEDIA_BYTES:
        res.warn(where, f"{what} de {size // 1024} KB (recomendado ≤ 300 KB): {path}")
    if not str(alt or "").strip():
        res.warn(where, f"{what} sin texto alternativo: {path}")


def _check_media(m: dict, where: str, res: Result, data_dir: Path) -> None:
    _check_image_file(str(m.get("path", "")), str(m.get("alt", "")), where, res, data_dir, "media")


def _prose(text: str) -> str:
    """Texto fuera de bloques y fragmentos de código."""
    return "".join(chunk for chunk, is_code in split_code(text) if not is_code)


def inline_images(text: str) -> list[tuple[str, str]]:
    """Imágenes en línea ``(alt, ruta)`` de un texto Markdown (fuera de código)."""
    return [(m.group(1), m.group(2)) for m in IMAGE_MD_RE.finditer(_prose(text))]


def _check_markdown_images(text: str, where: str, res: Result, data_dir: Path, kind: str) -> None:
    imgs = inline_images(text)
    for alt, url in imgs:
        _check_image_file(url, alt, where, res, data_dir, f"{kind}: imagen en línea")
    if _prose(text).count("![") > len(imgs):
        res.error(where, f"{kind}: imagen Markdown mal formada (usa ![texto alternativo](assets/…))")
    if FIGURE_PLACEHOLDER_RE.search(text):
        res.error(where, f"{kind}: marcador de figura sin resolver ({FIGURE_PLACEHOLDER_RE.search(text)[0]})")


def _has_visual(text: str) -> bool:
    """Imagen en línea, tabla Markdown o bloque de código."""
    return bool(inline_images(text)) or bool(MD_TABLE_RE.search(text)) or "```" in text


def _warn_visual_mention(text: str, where: str, res: Result, what: str) -> None:
    m = FIGURE_MENTION_RE.search(_prose(text))
    if m:
        res.warn(
            where,
            f"{what} menciona «{m.group(0)}» pero no tiene imagen, tabla ni bloque de código "
            "(¿falta una figura?)",
        )


def validate_data(data_dir: Path = DATA_DIR) -> Result:
    res = Result()
    schema_dir = data_dir / "schema"
    meta = data_dir / "meta"
    banks_dir = data_dir / "banks"

    def load_meta(name: str, schema: str) -> dict | None:
        p = meta / name
        if not p.exists():
            return None
        obj = _load(p, res)
        if obj is None:
            return None
        res.checked["meta"] += 1
        ok = _schema(obj, schema, f"meta/{name}", res, schema_dir)
        return obj if ok or isinstance(obj, dict) else None

    scoring = load_meta("scoring.json", "scoring.schema.json")
    convs = load_meta("convocatorias.json", "convocatorias.schema.json")
    temario = load_meta("temario.json", "temario.schema.json")
    localidades = load_meta("localidades.json", "localidades.schema.json")
    destinos = {}
    if (meta / "destinos").is_dir():
        for p in sorted((meta / "destinos").glob("*.json")):
            obj = _load(p, res)
            if obj is None:
                continue
            res.checked["meta"] += 1
            _schema(obj, "destinos.schema.json", f"meta/destinos/{p.name}", res, schema_dir)
            destinos[p.name] = obj

    topics = None
    if isinstance(temario, dict):
        topics = set()
        for b in temario.get("blocks", []):
            nums = Counter()
            for t in b.get("topics", []):
                tid = t.get("id", "")
                if not tid.startswith(f"{b.get('id')}."):
                    res.error("meta/temario.json", f"tema {tid} fuera de su bloque {b.get('id')}")
                if tid in topics:
                    res.error("meta/temario.json", f"tema repetido {tid}")
                topics.add(tid)
                nums[t.get("number")] += 1
            for n, c in nums.items():
                if c > 1:
                    res.error("meta/temario.json", f"bloque {b.get('id')}: número de tema {n} repetido")
    conv_ids = None
    if isinstance(convs, dict):
        conv_ids = {c.get("id") for c in convs.get("convocatorias", [])}
        dup = [k for k, v in Counter(c.get("id") for c in convs.get("convocatorias", [])).items() if v > 1]
        if dup:
            res.error("meta/convocatorias.json", f"ids repetidos: {dup}")
        if convs.get("target_convocatoria") not in conv_ids:
            res.error("meta/convocatorias.json", "target_convocatoria no existe")
        scheme_ids = {s.get("id") for s in (scoring or {}).get("schemes", [])} if scoring else None
        for c in convs.get("convocatorias", []):
            if c.get("scoring_scheme") and scheme_ids is not None and c["scoring_scheme"] not in scheme_ids:
                res.warn(
                    "meta/convocatorias.json",
                    f"{c.get('id')}: esquema {c['scoring_scheme']} no está en scoring.json",
                )
            ds = c.get("destinations_dataset")
            if ds and not (meta / ds).is_file():
                res.warn("meta/convocatorias.json", f"{c.get('id')}: no existe meta/{ds}")
    if isinstance(scoring, dict):
        ids = [s.get("id") for s in scoring.get("schemes", [])]
        dup = [k for k, v in Counter(ids).items() if v > 1]
        if dup:
            res.error("meta/scoring.json", f"esquemas repetidos: {dup}")
        if scoring.get("default_scheme") not in ids:
            res.error("meta/scoring.json", "default_scheme no existe")
        for s in scoring.get("schemes", []):
            parts = {p.get("part") for p in s.get("parts", [])}
            for u in s.get("grading", {}).get("units", []):
                missing = set(u.get("parts", [])) - parts
                if missing:
                    res.error(
                        "meta/scoring.json",
                        f"{s.get('id')}: unidad con partes inexistentes {sorted(missing)}",
                    )
            if conv_ids is not None and s.get("convocatoria") and s["convocatoria"] not in conv_ids:
                res.warn(
                    "meta/scoring.json",
                    f"{s.get('id')}: convocatoria {s['convocatoria']} no está en convocatorias.json",
                )
    if isinstance(localidades, dict):
        tiers = {t.get("id") for t in localidades.get("tiers", [])}
        for loc in localidades.get("localities", []):
            if loc.get("tier") not in tiers:
                res.error("meta/localidades.json", f"{loc.get('name')}: tier {loc.get('tier')} no definido")
    for name, d in destinos.items():
        if conv_ids is not None and d.get("convocatoria") not in conv_ids:
            res.warn(
                f"meta/destinos/{name}", f"convocatoria {d.get('convocatoria')} no está en convocatorias.json"
            )
        orders = [a.get("order") for a in d.get("assignments", [])]
        dup = [k for k, v in Counter(orders).items() if v > 1]
        if dup:
            res.error(f"meta/destinos/{name}", f"números de orden repetidos: {dup[:10]}")

    seen_qids: dict[str, str] = {}
    seen_banks: dict[str, str] = {}
    if banks_dir.is_dir():
        assets = (banks_dir / "assets").resolve()
        for p in sorted(banks_dir.rglob("*.json")):
            if assets in p.resolve().parents:
                continue
            bank = _load(p, res)
            if bank is None:
                continue
            res.checked["bancos"] += 1
            rel_where = str(p.relative_to(data_dir))
            _schema(bank, "bank.schema.json", rel_where, res, schema_dir)
            if isinstance(bank, dict):
                validate_bank(p, bank, res, data_dir, scoring, topics, conv_ids, seen_qids, seen_banks)
        _orphan_assets(banks_dir, res)
    validate_theory(data_dir, res, topics)
    return res


def _orphan_assets(banks_dir: Path, res: Result) -> None:
    assets = banks_dir / "assets"
    if not assets.is_dir():
        return
    referenced: set[str] = set()
    for p in banks_dir.rglob("*.json"):
        if assets.resolve() in p.resolve().parents:
            continue
        try:
            bank = json.loads(p.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            continue
        for path in _bank_image_refs(bank):
            referenced.add(path.removeprefix("./"))
    for f in sorted(assets.rglob("*")):
        if f.is_file() and not f.name.startswith("."):
            relp = "assets/" + str(f.relative_to(assets)).replace("\\", "/")
            if relp not in referenced:
                res.warn(f"banks/{relp}", "fichero de media no referenciado por ningún banco")


def _bank_image_refs(bank: object) -> list[str]:
    """Rutas de imagen de un banco: ``media`` y referencias en línea de todos sus textos."""
    out: list[str] = []

    def walk(node: object, key: str | None = None) -> None:
        if isinstance(node, dict):
            if key == "media" or ("path" in node and "alt" in node):
                if isinstance(node.get("path"), str):
                    out.append(node["path"])
            for k, v in node.items():
                walk(v, k)
        elif isinstance(node, list):
            for v in node:
                walk(v, key)
        elif isinstance(node, str) and "![" in node:
            out.extend(url for _, url in inline_images(node))

    walk(bank)
    return out


def validate_theory(data_dir: Path, res: Result, topics: set[str] | None) -> None:
    """``teoria/index.json``: esquema, ficheros existentes, temas del temario y sin repetir."""
    tdir = data_dir / "teoria"
    index_path = tdir / "index.json"
    if not index_path.exists():
        return
    index = _load(index_path, res)
    if index is None:
        return
    res.checked["índices de teoría"] += 1
    where = "teoria/index.json"
    _schema(index, "teoria.schema.json", where, res, data_dir / "schema")
    if not isinstance(index, dict):
        return
    seen: set[str] = set()
    for t in index.get("topics", []) or []:
        if not isinstance(t, dict):
            continue
        tid = t.get("topic")
        if tid in seen:
            res.error(where, f"tema repetido: {tid}")
        seen.add(tid)
        if topics is not None and tid not in topics:
            res.error(where, f"el tema {tid} no existe en meta/temario.json")
        f = t.get("file")
        if isinstance(f, str) and not (tdir / f).is_file():
            res.error(where, f"{tid}: no existe teoria/{f}")
    _validate_theory_images(tdir, res)


def _validate_theory_images(tdir: Path, res: Result) -> None:
    """Imágenes de la teoría: solo ``diagramas/<tema>-<nombre>.svg`` existentes, seguros y con alt."""
    from .diagrams import DiagramError, check_diagram_svg, check_theory_images

    errors, warnings, used = check_theory_images(tdir)
    for e in errors:
        where, _, msg = e.partition(": ")
        res.error(where, msg)
    for w in warnings:
        where, _, msg = w.partition(": ")
        res.warn(where, msg)
    for name in sorted(used):
        path = tdir / "diagramas" / name
        if not path.is_file():
            continue
        res.checked["diagramas de teoría"] += 1
        try:
            check_diagram_svg(path.read_bytes(), f"teoria/diagramas/{name}")
        except DiagramError as exc:
            res.error(f"teoria/diagramas/{name}", str(exc))


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--strict", action="store_true", help="tratar los avisos como errores")
    ap.add_argument("--data", type=Path, default=DATA_DIR, help="directorio data/ a validar")
    ap.add_argument("--quiet", action="store_true", help="no listar avisos (solo el recuento)")
    args = ap.parse_args(argv)
    res = validate_data(args.data)
    by_kind = defaultdict(int)
    for k, v in res.checked.items():
        by_kind[k] = v
    summary = ", ".join(f"{v} {k}" for k, v in sorted(by_kind.items())) or "nada que validar"
    for e in res.errors:
        print(f"ERROR  {e}")
    if not args.quiet:
        for w in res.warnings:
            print(f"AVISO  {w}")
    print(f"Validado: {summary}. {len(res.errors)} errores, {len(res.warnings)} avisos.")
    if res.errors or (args.strict and res.warnings):
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
