// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Textos de la predicción en castellano claro (veredicto, razonamiento y supuestos).

use super::{ObservedPart, PredictionContext, PresentadosSource, ReferenceKind};
use crate::api::{CityProbability, DataQuality, RankEstimate, TierProbability};
use crate::defaults::{CUTOFF_NOISE_SD, DEFAULT_TURNOUT, MONTE_CARLO_SAMPLES};
use crate::model::TierId;
use crate::util::{fmt_dec, fmt_int, fmt_pct};

/// Resultados agregados que necesitan los textos.
pub(super) struct Summary<'a> {
    pub ctx: &'a PredictionContext,
    pub parts_observed: &'a [ObservedPart],
    pub substituted: &'a [(u32, u32)],
    pub override_ratio: Option<f64>,
    pub p_pass: f64,
    pub p_plaza: f64,
    pub p_big_city_outside_madrid: Option<f64>,
    pub expected_grade: f64,
    pub observed_grade: f64,
    pub cutoff_ratio: f64,
    pub cutoff_p10: f64,
    pub cutoff_p90: f64,
    pub rank: RankEstimate,
    pub tiers: &'a [TierProbability],
    pub preferred: &'a [CityProbability],
}

fn count(x: f64) -> String {
    if (x - x.round()).abs() < 1e-9 {
        fmt_int(x.round().max(0.0) as u64)
    } else {
        fmt_dec(x, 1)
    }
}

/// Veredicto corto.
pub(super) fn verdict(s: &Summary<'_>) -> String {
    let p = if s.ctx.plazas.is_some() {
        s.p_plaza
    } else {
        s.p_pass
    };
    let what = if s.ctx.plazas.is_some() {
        "de obtener plaza"
    } else {
        "de aprobar"
    };
    let headline = if p >= 0.9 {
        "Muy probable"
    } else if p >= 0.7 {
        "Probable"
    } else if p >= 0.4 {
        "En el límite"
    } else if p >= 0.15 {
        "Difícil por ahora"
    } else {
        "Muy difícil por ahora"
    };
    let mut text = format!("{headline}: {} {what}", fmt_pct(p));
    if s.ctx.data_quality == DataQuality::Synthetic {
        text.push_str(" (estimación con datos sintéticos)");
    }
    text.push('.');
    text
}

/// Pasos del razonamiento.
pub(super) fn reasoning(s: &Summary<'_>) -> Vec<String> {
    let mut out = Vec::new();
    let mut observed: Vec<&ObservedPart> = s
        .parts_observed
        .iter()
        .filter(|o| o.total() > 0.0)
        .collect();
    observed.sort_by_key(|o| o.part);
    if observed.is_empty() {
        out.push(
            "No hay respuestas con las que medir tu rendimiento: se simula un examen en blanco."
                .to_string(),
        );
    }
    for o in observed {
        let answered = o.correct + o.wrong;
        out.push(format!(
            "{}.ª parte: {} aciertos, {} errores y {} en blanco → contestas el {} y aciertas el {} de lo que contestas.",
            o.part,
            count(o.correct),
            count(o.wrong),
            count(o.blank),
            fmt_pct(answered / o.total()),
            fmt_pct(if answered > 0.0 { o.correct / answered } else { 0.0 })
        ));
    }
    out.push(format!(
        "Se han simulado {} exámenes de {} con tu ritmo y tu precisión, incluida la incertidumbre de medirlos con pocas preguntas.",
        fmt_int(MONTE_CARLO_SAMPLES as u64),
        s.ctx.target_label
    ));
    let cutoff_text = if let Some(r) = s.override_ratio {
        format!(
            "Corte: tu corte personalizado del {} de la puntuación directa máxima (nunca por debajo del mínimo reglamentario).",
            fmt_pct(r)
        )
    } else if s.ctx.official_ratios.iter().all(Option::is_some) {
        format!(
            "Corte: el oficial publicado, {} de la puntuación directa máxima.",
            fmt_pct(s.cutoff_ratio)
        )
    } else {
        format!(
            "Corte estimado: en torno al {} de la puntuación directa máxima (entre {} y {} en el 80 % de los escenarios), según las plazas y la distribución de notas de referencia.",
            fmt_pct(s.cutoff_ratio),
            fmt_pct(s.cutoff_p10),
            fmt_pct(s.cutoff_p90)
        )
    };
    out.push(cutoff_text);
    out.push(format!(
        "Nota esperada en el examen objetivo: {} sobre 100 (la de este intento: {}); es la mediana de las simulaciones, que con pocas preguntas acercan tu precisión al 50 % por prudencia. Superas el corte en el {} de los escenarios.",
        fmt_dec(s.expected_grade, 1),
        fmt_dec(s.observed_grade, 1),
        fmt_pct(s.p_pass)
    ));
    match s.ctx.plazas {
        Some(plazas) => out.push(format!(
            "Puesto estimado: {} (entre {} y {} en el 80 % de los escenarios) de unos {} presentados para {} plazas{} → plaza en el {} de los escenarios.",
            fmt_int(s.rank.p50 as u64),
            fmt_int(s.rank.p10 as u64),
            fmt_int(s.rank.p90 as u64),
            fmt_int(s.ctx.target_presentados.round() as u64),
            fmt_int(u64::from(plazas)),
            if s.ctx.reserved_plazas.is_some() {
                " del turno general"
            } else {
                ""
            },
            fmt_pct(s.p_plaza)
        )),
        None => out.push(
            "No se conocen las plazas de la convocatoria objetivo: la probabilidad de plaza se iguala a la de aprobar."
                .to_string(),
        ),
    }
    if s.p_plaza > 0.0 {
        let parts: Vec<String> = s
            .tiers
            .iter()
            .map(|t| format!("{} {}", t.label.to_lowercase(), fmt_pct(t.probability)))
            .collect();
        out.push(format!(
            "Destinos (probabilidad de que queden plazas al elegir): {}.",
            parts.join(", ")
        ));
        if let (Some(share), Some(outside)) =
            (s.ctx.destinations.madrid_share, s.p_big_city_outside_madrid)
        {
            out.push(format!(
                "Madrid concentra ~{} de las plazas y no se agota nunca, por eso «grandes ciudades» sale alta; en otras grandes ciudades (Barcelona, València, Sevilla…) quedarían plazas en el {} de los escenarios.",
                fmt_pct(share),
                fmt_pct(outside)
            ));
        }
        for p in s.preferred {
            out.push(format!(
                "{}: {} de que quede plaza cuando te toque elegir.",
                p.locality,
                fmt_pct(p.probability)
            ));
        }
    }
    out
}

/// Supuestos del modelo.
pub(super) fn assumptions(s: &Summary<'_>) -> Vec<String> {
    let ctx = s.ctx;
    let mut out = vec![
        "Es una estimación orientativa basada en datos públicos; no sustituye a las listas oficiales del tribunal."
            .to_string(),
        format!("El examen objetivo sigue el esquema «{}».", ctx.scheme.title),
        ctx.reference.description.clone(),
    ];
    match ctx.presentados_source {
        PresentadosSource::Published => out.push(format!(
            "Presentados en la convocatoria objetivo: {}; el puesto se escala desde la referencia en proporción a los presentados.",
            fmt_int(ctx.target_presentados.round() as u64)
        )),
        PresentadosSource::FromAdmitidos => out.push(format!(
            "Sin presentados publicados: se estiman {} (el {} de los admitidos, participación habitual).",
            fmt_int(ctx.target_presentados.round() as u64),
            fmt_pct(DEFAULT_TURNOUT)
        )),
        PresentadosSource::AsReference => out.push(
            "Se desconocen los presentados de la convocatoria objetivo: se suponen los mismos que en la referencia."
                .to_string(),
        ),
    }
    if ctx.official_ratios.iter().any(Option::is_none) && s.override_ratio.is_none() {
        out.push(format!(
            "El corte estimado lleva un margen de incertidumbre (desviación de {} puntos porcentuales) y nunca baja del mínimo reglamentario.",
            fmt_dec(CUTOFF_NOISE_SD * 100.0, 0)
        ));
    }
    if ctx.scheme.grading.units.len() > 1 {
        out.push(
            "Calificación por partes eliminatorias: la 1.ª parte se estima en el mínimo reglamentario (filtra a muchos más aspirantes que plazas) y las siguientes con el corte por número de plazas; la 2.ª parte solo cuenta si se supera la 1.ª."
                .to_string(),
        );
    }
    for (missing, used) in s.substituted {
        out.push(format!(
            "No hay respuestas de la {missing}.ª parte: se estima con tu rendimiento en la {used}.ª parte."
        ));
    }
    match (ctx.reserved_plazas, ctx.plazas) {
        (Some(reserved), Some(plazas)) => out.push(format!(
            "Se simula el turno general: compites por sus {} plazas. Las {} del cupo de discapacidad tienen su propio corte y, si quedan desiertas, no se acumulan al turno general (base 5.4 de la convocatoria). La distribución de referencia incluye a las personas del cupo, así que el puesto es ligeramente prudente.",
            fmt_int(u64::from(plazas)),
            fmt_int(u64::from(reserved))
        )),
        _ if ctx.scheme.access == crate::model::Access::PromocionInterna => out.push(
            "En promoción interna las plazas del cupo de discapacidad no cubiertas se acumulan al turno general: cuentan todas."
                .to_string(),
        ),
        _ => {}
    }
    if ctx.destinations.synthetic {
        out.push(
            "Sin datos de destinos adjudicados: se usan el reparto y el agotamiento medios de 2023–2024 (Madrid no se agota; las ciudades medias aguantan hasta el 89 % de la lista y los pueblos hasta el 74 %)."
                .to_string(),
        );
    } else {
        out.push(format!(
            "Disponibilidad de destinos según las adjudicaciones de {} ({} plazas): una zona está disponible si alguien con un puesto igual o peor que el tuyo obtuvo plaza allí.",
            ctx.destinations.convocatoria.as_deref().unwrap_or("la referencia"),
            fmt_int(u64::from(ctx.destinations.total))
        ));
        if ctx.destinations.unclassified > 0 {
            out.push(format!(
                "{} destinos de la referencia no figuran en la clasificación de localidades y se cuentan como «{}».",
                fmt_int(u64::from(ctx.destinations.unclassified)),
                ctx.tiers
                    .iter()
                    .find(|t| t.id == TierId::Pueblo)
                    .map(|t| t.label.clone())
                    .unwrap_or_else(|| "pueblos".to_string())
            ));
        }
        for p in s.preferred {
            if ctx.destinations.locality(&p.locality).is_none() {
                out.push(format!(
                    "En la convocatoria de referencia no hubo plazas en {}: su probabilidad se considera 0.",
                    p.locality
                ));
            }
        }
    }
    if ctx.reference.kind == ReferenceKind::Synthetic {
        out.push(
            "Faltan datos históricos: los resultados dependen de valores por defecto documentados y pueden variar mucho."
                .to_string(),
        );
    }
    out.push(
        "Simulación determinista: con los mismos datos se obtiene siempre el mismo resultado."
            .to_string(),
    );
    out
}
