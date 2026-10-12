# SPDX-License-Identifier: GPL-3.0-or-later
# Copyright (C) 2026 Eric Valls Gramunt
"""Cifras derivadas para la documentación y el modelo de predicción.

Uso (desde ``tools/``, después de ``extract_aprobados.py`` y ``extract_destinos.py``)::

    uv run python research/analyze.py

Escribe ``data/raw/research/derived/analysis.json`` y un resumen por pantalla con:

1. Inferencia de la puntuación directa mínima (corte) de cada parte a partir de las calificaciones
   publicadas en el BOE (validada con los cortes oficiales de 2019 y 2021).
2. Distribución de calificaciones de los aprobados por convocatoria.
3. Convocatoria 2024: distribución de las directas por parte y simulación de las reglas de 2025.
4. Destinos: reparto por tier y por ciudad, y último número de orden con plaza en cada tier/ciudad.
"""

from __future__ import annotations

import bisect
import collections
import math
import statistics
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from common import DERIVED_DIR, DESTINOS_DIR, META_DIR, read_json, rel, write_json  # noqa: E402

# N nominal (directa máxima) por parte de cada convocatoria con calificación por partes
PER_PART_N = {"li-2016": (100, 40), "li-2018": (100, 30), "li-2019": (100, 30), "li-2021": (80, 20)}


def transformed_grid(n: float, m: float, e: float = 50.0, denom: int = 3) -> list[float]:
    out = []
    for k in range(int(round(m * denom)), int(round(n * denom)) + 1):
        d = k / denom
        out.append(e / 2 * (1 + (d - m) / (n - m)))
    return out


def explained(grades: list[float], n: float, m: float, tol: float = 0.0101) -> float:
    grid = transformed_grid(n, m)
    ok = 0
    for g in grades:
        i = bisect.bisect_left(grid, g - tol)
        ok += i < len(grid) and abs(grid[i] - g) <= tol
    return ok / len(grades)


def infer_cutoff(grades: list[float], n: float) -> dict:
    """Busca la directa mínima M (múltiplo de 1/3) que mejor explica las calificaciones 0–50.

    Solo N−M es identificable: se asume N nominal (sin anulaciones no cubiertas por reservas)."""
    scored = []
    for k in range(int(0.25 * n * 3), int(0.85 * n * 3)):
        m = k / 3
        scored.append((explained(grades, n, m), m))
    scored.sort(reverse=True)
    best_f, best_m = scored[0]
    return {"n": n, "m": round(best_m, 2), "explained": round(best_f, 3), "runner_up": round(scored[1][0], 3)}


def quantiles(values: list[float], qs=(0.1, 0.25, 0.5, 0.75, 0.9)) -> dict:
    s = sorted(values)
    out = {}
    for q in qs:
        idx = min(len(s) - 1, max(0, math.ceil(q * len(s)) - 1))
        out[f"p{int(q * 100)}"] = s[idx]
    return out


def tier_map() -> dict[tuple[str, str], str]:
    loc = read_json(META_DIR / "localidades.json")
    return {(x["province"], x["name"]): x["tier"] for x in loc["localities"]}


def destinos_stats(conv: str, tiers: dict) -> dict:
    data = read_json(DESTINOS_DIR / f"{conv}.json")
    rows = data["assignments"]
    total = len(rows)
    max_order = max(r["order"] for r in rows)
    by_tier = collections.Counter(tiers[(r["province"], r["locality"])] for r in rows)
    last_tier = {}
    for r in rows:
        t = tiers[(r["province"], r["locality"])]
        last_tier[t] = max(last_tier.get(t, 0), r["order"])
    by_city = collections.Counter(r["locality"] for r in rows)
    last_city = {}
    first_city = {}
    for r in rows:
        last_city[r["locality"]] = max(last_city.get(r["locality"], 0), r["order"])
        first_city[r["locality"]] = min(first_city.get(r["locality"], 10**9), r["order"])
    by_prov = collections.Counter(r["province"] for r in rows)
    # disponibilidad por posición relativa: ¿quedaba algún destino del tier con orden >= j?
    avail = {}
    for q in (0.1, 0.25, 0.5, 0.75, 0.9, 0.95, 1.0):
        j = math.ceil(q * max_order)
        avail[str(q)] = {t: any(tiers[(r["province"], r["locality"])] == t and r["order"] >= j for r in rows)
                         for t in ("gran_ciudad", "ciudad_media", "pueblo")}
    # tiers fuera de Madrid capital (Madrid acapara la mayoría de destinos)
    big_no_madrid = [
        r for r in rows
        if tiers[(r["province"], r["locality"])] == "gran_ciudad" and r["locality"] != "Madrid"
    ]
    cities = []
    for city, n in by_city.most_common():
        prov = next(r["province"] for r in rows if r["locality"] == city)
        cities.append({
            "locality": city, "province": prov, "tier": tiers[(prov, city)], "count": n,
            "first_order": first_city[city], "last_order": last_city[city],
            "last_order_rel": round(last_city[city] / max_order, 3),
        })
    return {
        "convocatoria": conv,
        "total": total,
        "max_order": max_order,
        "by_tier": dict(by_tier),
        "share_by_tier": {t: round(n / total, 4) for t, n in by_tier.items()},
        "last_order_by_tier": last_tier,
        "last_order_rel_by_tier": {t: round(v / max_order, 3) for t, v in last_tier.items()},
        "gran_ciudad_sin_madrid": {
            "count": len(big_no_madrid),
            "last_order": max((r["order"] for r in big_no_madrid), default=None),
        },
        "madrid": {"count": by_city.get("Madrid", 0), "share": round(by_city.get("Madrid", 0) / total, 4)},
        "comunidad_madrid": {
            "count": by_prov.get("Madrid", 0),
            "share": round(by_prov.get("Madrid", 0) / total, 4),
        },
        "availability_by_relative_position": avail,
        "cities": cities,
        "provinces": dict(by_prov.most_common()),
    }


def answered(row: dict, part: int) -> int:
    return row["parts"][part]["correct"] + row["parts"][part]["wrong"]


def li2024_parts() -> dict:
    d = read_json(DERIVED_DIR / "aprobados-li-2024.json")
    rows = d["rows"]
    p1 = [r["parts"][0]["direct"] for r in rows]
    p2 = [r["parts"][1]["direct"] / 4 for r in rows]  # 4·A − 4·E/3 → equivalente a A − E/3 sobre 20
    res = {
        "aprobados": len(rows),
        "p1_direct_quantiles_80": quantiles(p1),
        "p2_net_quantiles_20": quantiles(p2),
        "p1_ge_40": sum(1 for x in p1 if x >= 40),
        "p1_ge_24": sum(1 for x in p1 if x >= 24),
        "p2_ge_6": sum(1 for x in p2 if x >= 6),
        "corr_p1_p2": round(statistics.correlation(p1, p2), 3),
        "mean_answered_p1": round(statistics.mean(answered(r, 0) for r in rows), 1),
        "mean_answered_p2": round(statistics.mean(answered(r, 1) for r in rows), 1),
    }
    # Simulación de las reglas de 2025 sobre la cohorte 2024, escalando por presentados
    # (li-2024: memoria CPS 2024, definitivo; li-2025: nota CPS del 23/05/2026, provisional).
    convs = {c["id"]: c for c in read_json(META_DIR / "convocatorias.json")["convocatorias"]}
    pres_2024, pres_2025 = convs["li-2024"]["presentados"], convs["li-2025"]["presentados"]
    scale = pres_2024 / pres_2025
    plazas_2025 = convs["li-2025"]["plazas"]["total"]
    k = round(plazas_2025 * scale)  # puesto equivalente en la cohorte 2024
    # criterio CPS 2025: aptos en la 1.ª parte hasta 3 × plazas (2.532 general + 558 norma común 13)
    aptos_p1_target = round(3 * plazas_2025 * scale)
    p1_sorted = sorted(p1, reverse=True)
    n_ge_40 = sum(1 for x in p1 if x >= 40)
    if n_ge_40 >= aptos_p1_target:
        cut1 = 40.0
    elif aptos_p1_target <= len(p1_sorted):
        cut1 = max(24.0, p1_sorted[aptos_p1_target - 1])
    else:
        # solo hay datos de los aprobados de 2024 (nota conjunta ≥ 48/160): el puesto objetivo cae fuera;
        # cota: el corte estaría por debajo de la menor directa observada en ese grupo, y nunca bajo 24.
        cut1 = max(24.0, p1_sorted[-1])
    pool = sorted((x2 for x1, x2 in zip(p1, p2, strict=True) if x1 >= cut1), reverse=True)
    cut2 = max(6.0, pool[k - 1]) if len(pool) >= k else 6.0
    # nota final 2025 (0–100) de esos k primeros
    def g(d, m, n):
        return 25 * (1 + (d - m) / (n - m)) if d >= m else 25 * d / m
    finals = sorted(
        (
            g(x1, cut1, 80) + g(x2, cut2, 20)
            for x1, x2 in zip(p1, p2, strict=True)
            if x1 >= cut1 and x2 >= cut2
        ),
        reverse=True,
    )
    res["sim_2025"] = {
        "scale_presentados": round(scale, 3),
        "equivalent_rank_k": k,
        "aptos_p1_target_equivalent": aptos_p1_target,
        "p1_ge_40_in_2024_aprobados": n_ge_40,
        "cutoff_p1_direct": round(cut1, 2),
        "cutoff_p2_direct": round(cut2, 2),
        "aptos": len(finals),
        "final_grade_quantiles": quantiles(finals) if finals else None,
    }
    # corte equivalente con calificación conjunta (puesto k en la distribución 2024)
    totals = sorted((r["total"] for r in rows), reverse=True)
    res["joint_grade_at_k"] = totals[k - 1]
    res["joint_direct_ratio_at_k"] = round((48 + (totals[k - 1] - 50) / 50 * (160 - 48)) / 160, 4)
    return res


def main() -> int:
    out: dict = {"cutoff_inference": {}, "grades": {}, "destinos": {}}
    for conv, ns in PER_PART_N.items():
        d = read_json(DERIVED_DIR / f"aprobados-{conv}.json")
        out["cutoff_inference"][conv] = [
            infer_cutoff([r["parts"][i]["grade"] for r in d["rows"]], n) for i, n in enumerate(ns)
        ]
    for path in sorted(DERIVED_DIR.glob("aprobados-li-*.json")):
        d = read_json(path)
        if "rows" not in d:
            continue
        totals = [r["total"] for r in d["rows"]]
        out["grades"][d["convocatoria"]] = {
            "count": len(totals), "max": max(totals), "min": min(totals),
            "mean": round(statistics.mean(totals), 2), **quantiles(totals),
        }
    out["li2024_parts"] = li2024_parts()
    tiers = tier_map()
    for path in sorted(DESTINOS_DIR.glob("*.json")):
        conv = path.stem
        out["destinos"][conv] = destinos_stats(conv, tiers)
    dest = DERIVED_DIR / "analysis.json"
    write_json(dest, out)

    print("== Cortes inferidos (N, M, % explicado):")
    for conv, parts in out["cutoff_inference"].items():
        desc = (f"parte {i + 1}: M={p['m']}/{p['n']} ({p['explained']:.0%})" for i, p in enumerate(parts))
        print(f"  {conv}: " + "; ".join(desc))
    print("== Calificaciones de aprobados:")
    for conv, g in out["grades"].items():
        print(f"  {conv}: {g}")
    print("== 2024 por partes:", {k: v for k, v in out["li2024_parts"].items() if k != 'sim_2025'})
    print("== Simulación reglas 2025 sobre cohorte 2024:", out["li2024_parts"]["sim_2025"])
    for conv, s in out["destinos"].items():
        print(f"== Destinos {conv}: total {s['total']} (orden máx {s['max_order']}) "
              f"· por tier {s['by_tier']} "
              f"· último orden por tier {s['last_order_by_tier']} · Madrid {s['madrid']} "
              f"· CAM {s['comunidad_madrid']}")
        print("   gran ciudad sin Madrid:", s["gran_ciudad_sin_madrid"])
        print("   ciudades:", [(c["locality"], c["count"], c["last_order"]) for c in s["cities"][:16]])
    print("→", rel(dest))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
