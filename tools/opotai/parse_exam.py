# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Genera ``data/banks/oficiales/<bank-id>.json`` a partir de cuadernillo(s) y plantilla(s) en PDF.

Uso::

    cd tools
    uv run python -m opotai.parse_exam                 # todos los exámenes configurados
    uv run python -m opotai.parse_exam tai-li-2024     # uno o varios
    uv run python -m opotai.parse_exam --check         # no escribe; falla si la salida cambiaría
    uv run python -m opotai.parse_exam tai-li-2024 --dump   # vuelca el texto extraído para revisión

Entrada por examen:

* ``tools/opotai/exam_configs/<bank-id>.json``: metadatos, maquetación y cabeceras (ver
  ``booklet.py``/``answer_key.py``).
* ``tools/opotai/fixes/<bank-id>.json``: correcciones manuales reproducibles (ver ``fixes.py``).
* PDFs en ``data/raw/<bank-id>/`` (``uv run python -m opotai.fetch_exams``).

Al regenerar un banco existente se **conservan** por id de pregunta los campos de autor
(``explanation``, ``option_notes``, ``topic``, ``references``, ``tags``, ``outdated``,
``outdated_note``, ``needs_review``); si cambia el texto u opciones de una pregunta con contenido
de autor se emite un aviso, y si desaparece una pregunta con contenido de autor se aborta salvo
``--force``.
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

from .answer_key import AnswerKey, Entry, compile_markers, read_answer_key
from .bankio import (
    AUTHOR_DEFAULTS,
    AUTHOR_FIELDS,
    dump_json,
    load_json,
    order_question,
    schema_errors,
    write_json,
)
from .booklet import BookletConfig, ParsedBooklet, ParsedQuestion, parse_booklet
from .crosscheck import run_crosscheck
from .fetch_exams import load_manifest, sha256_file
from .figures import (
    FigureError,
    FigureSource,
    PlacedFigure,
    QuestionFigures,
    place_figures,
    stale_assets,
)
from .fixes import apply_fixes, load_fixes
from .paths import ASSETS_DIR, EXAM_CONFIGS_DIR, OFFICIAL_BANKS_DIR, RAW_DIR, rel
from .textutil import normalize_for_match, protect_markdown
from .verify import independent_text_check, pdftotext_available

LETTERS = "ABCD"


class BuildError(RuntimeError):
    pass


@dataclass
class BuildReport:
    bank_id: str
    counts: dict[str, tuple[int, int]] = field(default_factory=dict)
    annulled: list[str] = field(default_factory=list)
    figures: list[PlacedFigure] = field(default_factory=list)
    missing_assets: list[str] = field(default_factory=list)
    stale_assets: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    key_diffs: list[str] = field(default_factory=list)
    crosscheck: str | None = None
    spot_checks: int = 0
    text_check: int = 0
    changed: bool = False


def load_config(bank_id: str, configs_dir: Path = EXAM_CONFIGS_DIR) -> dict:
    path = configs_dir / f"{bank_id}.json"
    if not path.exists():
        raise BuildError(f"no existe la configuración {rel(path)}")
    cfg = load_json(path)
    if cfg.get("bank_id") != bank_id:
        raise BuildError(f"{rel(path)}: bank_id no coincide")
    return cfg  # type: ignore[return-value]


def all_bank_ids(configs_dir: Path = EXAM_CONFIGS_DIR) -> list[str]:
    return sorted(p.stem for p in configs_dir.glob("*.json"))


def qid(bank_id: str, section_id: str, number: int, reserve: bool) -> str:
    return f"{bank_id}-{section_id}-r{number}" if reserve else f"{bank_id}-{section_id}-{number:03d}"


def _new_question(id_: str, pq: ParsedQuestion) -> dict:
    return {
        "id": id_,
        "number": pq.number,
        "text": pq.text,
        "options": list(pq.options),
        "answer": None,
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


def own_answer_key(cfg: dict) -> AnswerKey:
    """``own_answer_key``: {"p2-s1": {"questions": "ABCD…", "reserve": "ABC"}, …} (espacios ignorados)."""
    key = AnswerKey()
    for sid, parts in cfg["own_answer_key"].items():
        key.sections[sid] = {"questions": {}, "reserve": {}}
        key.order.append(sid)
        for name in ("questions", "reserve"):
            letters = re.sub(r"\s+", "", parts.get(name, ""))
            for i, ch in enumerate(letters, 1):
                if ch not in "ABCD":
                    raise BuildError(f"own_answer_key {sid}/{name} #{i}: {ch!r} no es A-D")
                key.sections[sid][name][i] = Entry(number=i, answer=ch, raw=ch)
    return key


def build_bank(
    cfg: dict,
    raw_dir: Path = RAW_DIR,
    assets_dir: Path = ASSETS_DIR,
    existing: dict | None = None,
    write_assets: bool = True,
    crosscheck: bool = True,
    force: bool = False,
) -> tuple[dict, BuildReport]:
    bank_id = cfg["bank_id"]
    rep = BuildReport(bank_id=bank_id)
    bank_raw = raw_dir / bank_id
    manifest = load_manifest()
    mdocs = {d["file"]: d for d in manifest["documents"] if d["bank_id"] == bank_id}

    def raw_path(fname: str) -> Path:
        p = bank_raw / fname
        if not p.exists():
            raise BuildError(
                f"falta {rel(p)}: ejecuta `uv run python -m opotai.fetch_exams --bank {bank_id}`"
            )
        doc = mdocs.get(fname)
        if doc and doc.get("sha256") and sha256_file(p) != doc["sha256"]:
            raise BuildError(f"{rel(p)}: sha256 distinto del manifiesto")
        return p

    sections_cfg = cfg["sections"]
    kinds = {s["id"]: s["kind"] for s in sections_cfg}

    # 1) Cuadernillo(s)
    parsed: list[ParsedBooklet] = []
    for bdict in cfg["booklets"]:
        bc = BookletConfig.from_dict(bdict)
        pb = parse_booklet(bc, kinds, raw_path(bc.file))
        parsed.append(pb)
        rep.warnings.extend(f"{bc.file}: {w}" for w in pb.warnings)
    psections = {}
    pbook_of = {}
    for pb in parsed:
        for sid, sec in pb.sections.items():
            if sid in psections:
                raise BuildError(f"la sección {sid} aparece en más de un cuadernillo")
            psections[sid] = sec
            pbook_of[sid] = pb
    unknown = set(psections) - set(kinds)
    if unknown:
        raise BuildError(f"secciones no configuradas en el cuadernillo: {sorted(unknown)}")

    # 2) Plantillas. Puede haber varias principales si cubren secciones distintas (un examen con
    #    dos ejercicios y una plantilla por ejercicio); las de comparación se agrupan por estado.
    primary: tuple[dict, AnswerKey] | None = None
    compare_by_status: dict[str, tuple[dict, AnswerKey]] = {}
    for kd in cfg["answer_keys"]:
        key = read_answer_key(
            raw_path(kd["file"]),
            compile_markers(kd["markers"]),
            column_gap=kd.get("column_gap", 60.0),
            segment_gap=kd.get("segment_gap", 25.0),
        )
        try:
            if kd.get("compare_only"):
                if kd["status"] in compare_by_status:
                    compare_by_status[kd["status"]][1].merge(key, kd["file"])
                else:
                    compare_by_status[kd["status"]] = (dict(kd), key)
            elif primary is None:
                primary = (dict(kd), key)
            else:
                if kd["status"] != primary[0]["status"]:
                    raise BuildError("las plantillas principales deben tener el mismo estado")
                primary[1].merge(key, kd["file"])
                primary[0]["file"] += f" + {kd['file']}"
        except ValueError as exc:
            raise BuildError(str(exc)) from exc
    if cfg.get("own_answer_key"):
        # Ejercicio sin plantilla oficial publicada: respuestas propuestas por OpoTAI, escritas
        # en la configuración (una letra por pregunta) y declaradas con source.answer_key "propia".
        if primary is not None or cfg["source"].get("answer_key") != "propia":
            raise BuildError("own_answer_key exige source.answer_key «propia» y ninguna plantilla principal")
        primary = ({"file": "respuestas propias (configuración)", "status": "propia"}, own_answer_key(cfg))
    if primary is None:
        raise BuildError("falta la plantilla principal")
    pkey_cfg, pkey = primary
    compare = list(compare_by_status.values())

    # 3) Construcción de secciones
    raw_rows: dict[str, dict] = {}
    out_sections = []
    section_figs: dict[str, list[FigureSource]] = {}
    question_figs: dict[str, QuestionFigures] = {}
    for scfg in sections_cfg:
        sid = scfg["id"]
        psec = psections.get(sid)
        if psec is None:
            raise BuildError(f"la sección {sid} no aparece en el cuadernillo")
        nq, nr = len(psec.questions), len(psec.reserve)
        rep.counts[sid] = (nq, nr)
        if nq != scfg["questions"] or nr != scfg.get("reserve", 0):
            raise BuildError(
                f"{sid}: extraídas {nq}+{nr} preguntas; "
                f"esperadas {scfg['questions']}+{scfg.get('reserve', 0)}"
            )
        sec_json = {
            "id": sid,
            "part": scfg["part"],
            "kind": scfg["kind"],
            "title": scfg["title"],
            "block": scfg.get("block"),
            "statement": pbook_of[sid].statement_markdown(sid) if scfg["kind"] == "case" else None,
            "media": [],
            "questions": [],
            "reserve": [],
        }
        if scfg.get("statement_from_config"):
            sec_json["statement"] = scfg["statement_from_config"]
        if scfg["kind"] == "case" and not sec_json["statement"]:
            rep.warnings.append(f"{sid}: supuesto sin enunciado")
        doc = pbook_of[sid].doc
        for reserve, lst in ((False, psec.questions), (True, psec.reserve)):
            for pq in lst:
                if len(pq.options) != 4:
                    raise BuildError(
                        f"{sid}{' reserva' if reserve else ''} {pq.number}: {len(pq.options)} opciones "
                        f"(texto: {pq.text[:80]!r})"
                    )
                ofigs = pq.option_figures or [[] for _ in pq.options]
                if not (pq.text or pq.figures) or any(
                    not o and not f for o, f in zip(pq.options, ofigs, strict=True)
                ):
                    raise BuildError(f"{sid} {pq.number}: enunciado u opción vacíos")
                q = _new_question(qid(bank_id, sid, pq.number, reserve), pq)
                raw_rows[q["id"]] = {"text_rows": pq.text_rows, "option_rows": pq.option_rows}
                entry = pkey.get(sid, reserve, pq.number)
                if entry is None:
                    raise BuildError(f"{q['id']}: no figura en la plantilla {pkey_cfg['file']}")
                q["annulled"] = entry.annulled
                q["answer"] = None if entry.annulled else entry.answer
                if entry.annulled:
                    rep.annulled.append(q["id"])
                if pq.figures or any(ofigs):
                    question_figs[q["id"]] = QuestionFigures(
                        section=sid,
                        number=pq.number,
                        reserve=reserve,
                        figures=[FigureSource(f, doc) for f in pq.figures],
                        options=[[FigureSource(f, doc) for f in fl] for fl in ofigs],
                    )
                sec_json["reserve" if reserve else "questions"].append(q)
        # comprobar que la plantilla no tiene más entradas que el cuadernillo
        ksec = pkey.sections.get(sid, {})
        for part, lst in (("questions", sec_json["questions"]), ("reserve", sec_json["reserve"])):
            extra = set(ksec.get(part, {})) - {q["number"] for q in lst}
            if extra:
                raise BuildError(f"{sid}/{part}: la plantilla tiene números sin pregunta: {sorted(extra)}")
        # Figuras de la sección: los índices coinciden con los marcadores ⟦FIG:i⟧ del enunciado;
        # las que tienen destino explícito («attach» en la config) van a esa pregunta.
        section_figs[sid] = [FigureSource(f, doc) for f in psec.figures if not f.extra.get("target")]
        for fig in psec.figures:
            target = fig.extra.get("target")
            if not target:
                continue
            tq = next((q for q in sec_json["questions"] + sec_json["reserve"] if q["id"] == target), None)
            if tq is None:
                raise BuildError(f"figura con «attach» a una pregunta inexistente en {sid}: {target}")
            qf = question_figs.setdefault(
                target,
                QuestionFigures(
                    section=sid,
                    number=tq["number"],
                    reserve=target.removeprefix(f"{bank_id}-{sid}-").startswith("r"),
                    options=[[] for _ in range(4)],
                ),
            )
            qf.targeted.append(FigureSource(fig, doc))
        out_sections.append(sec_json)
    extra_sections = set(pkey.sections) - set(kinds)
    if extra_sections:
        raise BuildError(f"la plantilla tiene secciones desconocidas: {sorted(extra_sections)}")
    # Si un marcador de figura quedara dentro de un enunciado de sección «theory» se perdería.
    for sid, figs in section_figs.items():
        if figs and kinds[sid] != "case":
            rep.warnings.append(
                f"{sid}: {len(figs)} figura(s) fuera de pregunta en una sección sin enunciado"
            )

    # 5) Banco
    src = cfg["source"]
    documents = []
    for fname in src["documents"]:
        d = mdocs.get(fname)
        if d is None:
            raise BuildError(f"{fname} no está en tools/sources/examenes.json para {bank_id}")
        documents.append({"kind": d["kind"], "title": d["title"], "url": d["url"], "sha256": d["sha256"]})
    bank = {
        "schema_version": 1,
        "id": bank_id,
        "kind": "official",
        "title": cfg["title"],
        "description": cfg.get("description"),
        "access": cfg["access"],
        "year": cfg["year"],
        "convocatoria": cfg.get("convocatoria"),
        "exam_date": cfg.get("exam_date"),
        "model": cfg.get("model"),
        "duration_minutes": cfg.get("duration_minutes"),
        "scoring_scheme": cfg.get("scoring_scheme"),
        "source": {
            "publisher": src["publisher"],
            "documents": documents,
            "answer_key": src["answer_key"],
            "retrieved": src.get("retrieved"),
            "notes": None,
        },
        "sections": out_sections,
    }

    # 6) Parches manuales
    fixes = load_fixes(bank_id)
    apply_fixes(bank, fixes, raw_rows)

    # 7) Markdown seguro (etiquetas HTML literales → código en línea)
    for sec in bank["sections"]:
        if sec["statement"]:
            sec["statement"] = protect_markdown(sec["statement"])
        for q in sec["questions"] + sec["reserve"]:
            q["text"] = protect_markdown(q["text"])
            q["options"] = [protect_markdown(o) for o in q["options"]]

    # 8) Diferencias entre plantillas y notas
    for kd, key in compare:
        for sec in bank["sections"]:
            for reserve, lst in ((False, sec["questions"]), (True, sec["reserve"])):
                for q in lst:
                    e = key.get(sec["id"], reserve, q["number"])
                    if e is None:
                        rep.key_diffs.append(f"{q['id']}: ausente en {kd['file']}")
                        continue
                    old = "ANULADA" if e.annulled else e.answer
                    new = "ANULADA" if q["annulled"] else q["answer"]
                    if old != new:
                        rep.key_diffs.append(f"{q['id']}: {kd['status']} {old} → {pkey_cfg['status']} {new}")
    bank["source"]["notes"] = _notes(src.get("notes"), bank, rep, pkey_cfg, compare)

    # 8b) Comprobaciones puntuales: preguntas de respuesta obvia (anotadas a mano en la config)
    #     para detectar desfases entre cuadernillo y plantilla.
    by_suffix = {
        q["id"].removeprefix(bank_id + "-"): q
        for s in bank["sections"]
        for q in s["questions"] + s["reserve"]
    }
    for suffix, expected in cfg.get("spot_checks", {}).items():
        q = by_suffix.get(suffix)
        if q is None:
            raise BuildError(f"spot_checks: no existe la pregunta {suffix}")
        if q["answer"] != expected:
            raise BuildError(f"spot_checks: {suffix} tiene respuesta {q['answer']} y se esperaba {expected}")
    rep.spot_checks = len(cfg.get("spot_checks", {}))

    # 9) Verificación cruzada con el otro modelo (antes de colocar las figuras: los marcadores
    #    ⟦FIG:i⟧ se ignoran al comparar)
    if crosscheck and cfg.get("crosscheck"):
        cr = run_crosscheck(cfg, bank, bank_raw)
        rep.warnings.extend(f"crosscheck: {w}" for w in cr.warnings)
        if cr.errors:
            raise BuildError("verificación cruzada A/B fallida:\n  " + "\n  ".join(cr.errors[:30]))
        rep.crosscheck = f"{cr.checked} preguntas coinciden con el otro modelo"

    # 10) Comprobación independiente del texto con pdftotext (poppler). Se excluyen las
    #     preguntas/secciones con texto sustituido a mano (``set``) en los parches.
    if cfg.get("verify_text", True) and pdftotext_available():
        skip = {k for k, fx in fixes["questions"].items() if {"text", "options"} & set(fx.get("set", {}))}
        skip |= {k for k, fx in fixes["sections"].items() if "statement" in fx.get("set", {})}
        skip |= set(cfg.get("verify_text_skip", []))
        pdfs = [raw_path(b["file"]) for b in cfg["booklets"]]
        checked, missing = independent_text_check(bank, pdfs, skip)
        if missing:
            raise BuildError(
                "textos no encontrados en la extracción independiente (pdftotext):\n  "
                + "\n  ".join(missing[:30])
            )
        rep.text_check = checked

    # 11) Figuras → PNG en su sitio (enunciado, texto, media u opción) con su transcripción
    try:
        placement = place_figures(
            bank, cfg.get("figures", {}), section_figs, question_figs, assets_dir, write_assets
        )
    except FigureError as exc:
        raise BuildError(str(exc)) from exc
    rep.figures = placement.placed
    rep.missing_assets = placement.missing_assets
    rep.warnings.extend(placement.warnings)
    for f in placement.placed:
        if f.info and f.info.bytes > 300_000:
            rep.warnings.append(f"{f.path}: {f.info.bytes // 1024} KB (> 300 KB) incluso a {f.info.dpi} ppp")
    stale = stale_assets(bank_id, assets_dir, placement)
    rep.stale_assets = [rel(p) for p in stale]
    if write_assets:
        for p in stale:
            p.unlink()

    # 12) Conservar contenido de autor del fichero existente
    _preserve_author_fields(bank, existing, rep, force)

    # 13) Comprobaciones finales
    for sec in bank["sections"]:
        sec["questions"] = [order_question(q) for q in sec["questions"]]
        sec["reserve"] = [order_question(q) for q in sec["reserve"]]
    errs = schema_errors(bank, "bank.schema.json")
    if errs:
        raise BuildError("el banco no cumple el esquema:\n  " + "\n  ".join(errs[:20]))
    return bank, rep


def _notes(base: str | None, bank: dict, rep: BuildReport, pkey_cfg: dict, compare) -> str | None:
    parts = [base] if base else []
    ann = [
        q["id"].removeprefix(bank["id"] + "-")
        for s in bank["sections"]
        for q in s["questions"] + s["reserve"]
        if q["annulled"]
    ]
    if ann:
        parts.append(f"Anuladas en la plantilla {pkey_cfg['status']}: {', '.join(ann)}.")
    else:
        parts.append(f"Ninguna pregunta anulada en la plantilla {pkey_cfg['status']}.")
    for kd, _ in compare:
        diffs = [d for d in rep.key_diffs if kd["status"] in d]
        if diffs:
            short = [d.removeprefix(bank["id"] + "-") for d in diffs]
            parts.append(f"Cambios respecto a la plantilla {kd['status']}: {'; '.join(short)}.")
        else:
            parts.append(f"Sin cambios respecto a la plantilla {kd['status']}.")
    return " ".join(parts) if parts else None


def _content_sig(q: dict) -> str:
    return (
        normalize_for_match(q.get("text", ""))
        + "|"
        + "|".join(normalize_for_match(o) for o in q.get("options", []))
    )


def _has_author_content(q: dict) -> bool:
    return any(q.get(f, AUTHOR_DEFAULTS[f]) != AUTHOR_DEFAULTS[f] for f in AUTHOR_FIELDS)


def _preserve_author_fields(bank: dict, existing: dict | None, rep: BuildReport, force: bool) -> None:
    if not existing:
        return
    old = {}
    for sec in existing.get("sections", []):
        for q in sec.get("questions", []) + sec.get("reserve", []):
            old[q.get("id")] = q
    seen = set()
    for sec in bank["sections"]:
        for q in sec["questions"] + sec["reserve"]:
            prev = old.get(q["id"])
            if prev is None:
                continue
            seen.add(q["id"])
            if not _has_author_content(prev):
                continue
            for f in AUTHOR_FIELDS:
                if f not in prev:
                    continue
                if f == "needs_review":
                    q[f] = bool(prev[f]) or bool(q.get(f))
                elif prev[f] != AUTHOR_DEFAULTS[f]:
                    q[f] = prev[f]
            if _content_sig(prev) != _content_sig(q):
                rep.warnings.append(
                    f"{q['id']}: el texto/opciones han cambiado respecto al banco existente; "
                    "se conservan sus campos de autor (revisa que sigan siendo válidos)"
                )
            elif prev.get("answer") != q.get("answer") or prev.get("annulled") != q.get("annulled"):
                rep.warnings.append(f"{q['id']}: la respuesta ha cambiado; se conservan los campos de autor")
    lost = [i for i, q in old.items() if i not in seen and _has_author_content(q)]
    if lost:
        msg = f"desaparecen preguntas con contenido de autor: {lost[:10]}{'…' if len(lost) > 10 else ''}"
        if not force:
            raise BuildError(msg + " (usa --force para continuar)")
        rep.warnings.append(msg)


def dump_bank(bank: dict) -> str:
    lines = []
    for sec in bank["sections"]:
        lines.append(f"## {sec['id']} · {sec['title']}")
        if sec.get("statement"):
            lines.append(sec["statement"])
        for m in sec.get("media", []):
            lines.append(f"[media] {m['path']}")
        for q in sec["questions"] + sec["reserve"]:
            flag = " (ANULADA)" if q["annulled"] else ""
            lines.append(f"\n{q['id']}{flag}: {q['text']}")
            for i, o in enumerate(q["options"]):
                mark = "*" if q["answer"] == LETTERS[i] else " "
                lines.append(f"  {mark}{LETTERS[i]}) {o}")
            for m in q.get("media", []):
                lines.append(f"  [media] {m['path']}")
        lines.append("")
    return "\n".join(lines)


def run(bank_ids: list[str], check: bool, dump: bool, crosscheck: bool, force: bool) -> int:
    failures = 0
    for bank_id in bank_ids:
        out = OFFICIAL_BANKS_DIR / f"{bank_id}.json"
        existing = load_json(out) if out.exists() else None
        try:
            cfg = load_config(bank_id)
            bank, rep = build_bank(
                cfg, existing=existing, write_assets=not check, crosscheck=crosscheck, force=force
            )
        except Exception as exc:  # noqa: BLE001 - informar y seguir con los demás
            print(f"✗ {bank_id}: {exc}", file=sys.stderr)
            failures += 1
            continue
        new_text = dump_json(bank)
        old_text = out.read_text(encoding="utf-8") if out.exists() else None
        rep.changed = new_text != old_text
        counts = ", ".join(f"{k} {a}+{b}" for k, (a, b) in rep.counts.items())
        status = "sin cambios" if not rep.changed else ("cambiaría" if check else "escrito")
        print(f"✓ {bank_id}: {counts}; anuladas {len(rep.annulled)}; figuras {len(rep.figures)} — {status}")
        for f in rep.figures:
            size = (
                f" · {f.info.width}×{f.info.height} px, {f.info.dpi} ppp, {f.info.bytes // 1024} KB"
                if f.info
                else ""
            )
            extra = " + transcripción" if f.transcription else ""
            print(f"    figura {f.name}: {f.target} · {f.where}{extra}{size}")
        for p in rep.missing_assets:
            print(f"    falta la imagen {p} (ejecuta sin --check)")
        for p in rep.stale_assets:
            print(f"    imagen obsoleta {'(se borraría)' if check else 'borrada'}: {p}")
        if rep.crosscheck:
            print(f"    verificación A/B: {rep.crosscheck}")
        if rep.spot_checks:
            print(f"    comprobaciones puntuales de respuesta: {rep.spot_checks} correctas")
        if rep.text_check:
            print(f"    texto verificado con pdftotext: {rep.text_check} fragmentos")
        for d in rep.key_diffs:
            print(f"    plantilla: {d}")
        for w in rep.warnings:
            print(f"    aviso: {w}")
        if dump:
            print(dump_bank(bank))
        if check:
            if rep.changed or rep.missing_assets or rep.stale_assets:
                failures += 1
            continue
        if rep.changed:
            write_json(out, bank)
    return 1 if failures else 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("banks", nargs="*", help="ids de banco (por defecto, todos los configurados)")
    ap.add_argument("--check", action="store_true", help="no escribir; error si la salida cambiaría")
    ap.add_argument("--dump", action="store_true", help="volcar el banco en texto para revisión")
    ap.add_argument("--no-crosscheck", action="store_true", help="omitir la verificación con el modelo B")
    ap.add_argument("--force", action="store_true", help="permitir perder preguntas con contenido de autor")
    args = ap.parse_args(argv)
    ids = args.banks or all_bank_ids()
    return run(ids, args.check, args.dump, not args.no_crosscheck, args.force)


if __name__ == "__main__":
    raise SystemExit(main())
