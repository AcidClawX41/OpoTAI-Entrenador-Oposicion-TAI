// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Modelo de predicción: monotonía, corte suelo, coherencia de destinos, determinismo y
//! comportamiento con datos sintéticos o por defecto.

mod common;

use std::borrow::Cow;
use std::path::Path;

use common::*;
use tai_core::Catalog;
use tai_core::api::{DataQuality, Prediction, TierId};
use tai_core::prediction::{
    ObservedPart, PredictionContext, PredictionRequest, ReferenceKind, predict,
};

/// Rendimiento con la misma proporción en las dos partes.
fn observed(ratio_correct: f64, ratio_wrong: f64, q1: f64, q2: f64) -> Vec<ObservedPart> {
    vec![
        ObservedPart {
            part: 1,
            correct: (ratio_correct * q1).round(),
            wrong: (ratio_wrong * q1).round(),
            blank: q1 - (ratio_correct * q1).round() - (ratio_wrong * q1).round(),
        },
        ObservedPart {
            part: 2,
            correct: (ratio_correct * q2).round(),
            wrong: (ratio_wrong * q2).round(),
            blank: q2 - (ratio_correct * q2).round() - (ratio_wrong * q2).round(),
        },
    ]
}

fn run(ctx: &PredictionContext, obs: &[ObservedPart], preferred: &[String]) -> Prediction {
    predict(
        ctx,
        &PredictionRequest {
            observed: obs,
            observed_grade: 50.0,
            override_ratio: None,
            preferred_localities: preferred,
        },
    )
}

/// Ficheros de los fixtures con `convocatorias.json` modificado.
fn fixture_files_with(edit: impl Fn(&mut serde_json::Value)) -> Vec<(String, Cow<'static, [u8]>)> {
    fn walk(dir: &Path, prefix: &str, out: &mut Vec<(String, Cow<'static, [u8]>)>) {
        for entry in std::fs::read_dir(dir).expect("dir") {
            let path = entry.expect("entrada").path();
            let name = path
                .file_name()
                .and_then(|n| n.to_str())
                .unwrap_or_default()
                .to_string();
            let rel = format!("{prefix}/{name}");
            if path.is_dir() {
                walk(&path, &rel, out);
            } else {
                out.push((rel, Cow::Owned(std::fs::read(&path).expect("fichero"))));
            }
        }
    }
    let root = fixtures_dir();
    let mut files = Vec::new();
    for sub in ["banks", "meta"] {
        walk(&root.join(sub), sub, &mut files);
    }
    for (path, bytes) in &mut files {
        if path == "meta/convocatorias.json" {
            let mut value: serde_json::Value = serde_json::from_slice(bytes).expect("json");
            edit(&mut value);
            *bytes = Cow::Owned(serde_json::to_vec(&value).expect("json"));
        }
    }
    files
}

#[test]
fn more_correct_answers_never_lower_the_probabilities() {
    // Valores por defecto (2025: 80 + 20 preguntas, referencia calibrada de 2024).
    let catalog = Catalog::empty();
    let ctx = PredictionContext::build(&catalog, None);
    let mut last_pass = -1.0;
    let mut last_plaza = -1.0;
    let mut last_grade = -1.0;
    for level in [0.25, 0.4, 0.55, 0.7, 0.85] {
        let p = run(&ctx, &observed(level, 0.1, 80.0, 20.0), &[]);
        assert!(
            p.p_pass + 1e-9 >= last_pass,
            "p_pass baja en {level}: {} < {last_pass}",
            p.p_pass
        );
        assert!(p.p_plaza + 1e-9 >= last_plaza, "p_plaza baja en {level}");
        assert!(
            p.expected_grade >= last_grade,
            "nota esperada baja en {level}"
        );
        assert!(p.p_plaza <= p.p_pass + 1e-9);
        last_pass = p.p_pass;
        last_plaza = p.p_plaza;
        last_grade = p.expected_grade;
    }
    let weak = run(&ctx, &observed(0.2, 0.3, 80.0, 20.0), &[]);
    let strong = run(&ctx, &observed(0.9, 0.05, 80.0, 20.0), &[]);
    assert!(weak.p_plaza < 0.05, "débil: {}", weak.p_plaza);
    assert!(strong.p_plaza > 0.9, "fuerte: {}", strong.p_plaza);
    let (weak_rank, strong_rank) = (
        weak.estimated_rank.expect("puesto"),
        strong.estimated_rank.expect("puesto"),
    );
    assert!(strong_rank.p50 < weak_rank.p50);
    assert!(strong_rank.p10 <= strong_rank.p50 && strong_rank.p50 <= strong_rank.p90);
    assert!(
        strong.estimated_percentile.expect("percentil")
            > weak.estimated_percentile.expect("percentil")
    );
}

#[test]
fn default_cutoffs_for_2025_follow_the_research() {
    let catalog = Catalog::empty();
    let ctx = PredictionContext::build(&catalog, None);
    assert_eq!(ctx.target_id, "li-2025");
    assert_eq!(ctx.reference.kind, ReferenceKind::Calibrated);
    // k_ref = 844 · 5.261 / 8.790 ≈ 505 (plazas del turno general).
    assert_eq!(ctx.reference_rank_k(), Some(505));
    let cutoffs = ctx.base_cutoff_ratios();
    assert_eq!(cutoffs.len(), 2);
    // 1.ª parte: suelo (24/80); 2.ª parte: corte por ranking (≈ 0,38–0,42).
    assert!((cutoffs[0] - 0.30).abs() < 1e-9);
    assert!(
        cutoffs[1] > 0.35 && cutoffs[1] < 0.47,
        "2.ª parte: {}",
        cutoffs[1]
    );
    let p = run(&ctx, &observed(0.6, 0.15, 80.0, 20.0), &[]);
    assert_eq!(p.data_quality, DataQuality::Partial);
    assert_eq!(
        p.target_label,
        "Convocatoria 2025 · 1.030 plazas (844 de acceso general)"
    );
    assert_eq!(p.plazas, Some(844));
    // Sin destinos reales no se informa de las grandes ciudades fuera de Madrid.
    assert_eq!(p.p_big_city_outside_madrid, None);
    assert!(p.tiers.iter().all(|t| t.share_of_plazas.is_none()));
}

#[test]
fn general_aspirant_competes_only_for_general_plazas() {
    // Ingreso libre: las plazas del cupo de discapacidad que quedan desiertas no se acumulan
    // al turno general (base 5.4 de las convocatorias de 2021 a 2025). Un aspirante general
    // compite por 844 plazas en 2025, no por 1.030.
    let catalog = Catalog::empty();
    let ctx = PredictionContext::build(&catalog, Some("li-2025"));
    assert_eq!(ctx.plazas, Some(844));
    // Promoción interna: las del cupo no cubiertas sí se acumulan al turno general.
    let ctx = PredictionContext::build(&catalog, Some("pi-2024"));
    assert_eq!(ctx.plazas, Some(600));
}

#[test]
fn cutoff_is_the_floor_when_plazas_exceed_reference_aptos() {
    // Objetivo con 400 plazas de acceso general y la referencia con 250 aptos.
    let files = fixture_files_with(|v| {
        v["convocatorias"][0]["plazas"]["general"] = serde_json::json!(380);
        v["convocatorias"][0]["plazas"]["discapacidad"] = serde_json::json!(20);
        v["convocatorias"][0]["plazas"]["total"] = serde_json::json!(400);
    });
    let catalog = Catalog::from_files(files);
    let ctx = PredictionContext::build(&catalog, None);
    assert_eq!(ctx.plazas, Some(380));
    let cutoffs = ctx.base_cutoff_ratios();
    assert!(
        cutoffs.iter().all(|c| (c - 0.3).abs() < 1e-9),
        "{cutoffs:?}"
    );

    // Con 100 plazas el corte de la 2.ª parte sube por encima del suelo.
    let ctx = PredictionContext::build(&common::catalog(), None);
    let cutoffs = ctx.base_cutoff_ratios();
    assert!((cutoffs[0] - 0.3).abs() < 1e-9);
    assert!(cutoffs[1] > 0.5, "{cutoffs:?}");
}

#[test]
fn destinations_are_coherent_with_rank() {
    let catalog = common::catalog();
    let ctx = PredictionContext::build(&catalog, None);
    assert_eq!(ctx.reference.kind, ReferenceKind::Grades);
    assert!(!ctx.destinations.synthetic);
    let preferred = vec!["Sevilla".to_string(), "Ciudad Desconocida".to_string()];
    let strong = run(&ctx, &observed(0.95, 0.0, 10.0, 4.0), &preferred);
    let medium = run(&ctx, &observed(0.7, 0.2, 10.0, 4.0), &preferred);
    assert_eq!(strong.data_quality, DataQuality::Real);
    for p in [&strong, &medium] {
        let tier = |id: TierId| {
            p.tiers
                .iter()
                .find(|t| t.tier == id)
                .map(|t| t.probability)
                .unwrap_or(-1.0)
        };
        // Madrid no se agota: «gran ciudad» = probabilidad de plaza.
        assert!((tier(TierId::GranCiudad) - p.p_plaza).abs() < 1e-9);
        assert!(tier(TierId::Pueblo) <= tier(TierId::CiudadMedia) + 1e-9);
        assert!(tier(TierId::CiudadMedia) <= tier(TierId::GranCiudad) + 1e-9);
        let outside = p.p_big_city_outside_madrid.expect("con destinos reales");
        assert!(outside <= tier(TierId::GranCiudad) + 1e-9);
        // Sevilla se agota antes que Barcelona.
        let city = |name: &str| {
            p.top_cities
                .iter()
                .find(|c| c.locality == name)
                .map(|c| c.probability)
                .unwrap_or(-1.0)
        };
        assert!(city("Sevilla") <= city("Barcelona") + 1e-9);
        assert!(p.top_cities.len() <= 8);
        assert_eq!(p.top_cities[0].locality, "Madrid");
        assert!(p.preferred[0].probability <= p.p_plaza + 1e-9);
        assert_eq!(p.preferred[1].probability, 0.0);
        assert_eq!(p.tiers.len(), 3);
        assert!(p.tiers.iter().all(|t| t.share_of_plazas.is_some()));
    }
    assert!(strong.p_plaza >= medium.p_plaza);
    assert!(strong.p_big_city_outside_madrid >= medium.p_big_city_outside_madrid);
    assert!(strong.preferred[0].probability >= medium.preferred[0].probability);
    assert!(
        strong
            .reasoning
            .iter()
            .any(|r| r.contains("Madrid concentra"))
    );
    assert!(
        strong
            .assumptions
            .iter()
            .any(|a| a.contains("Ciudad Desconocida"))
    );
    assert!(
        strong
            .assumptions
            .iter()
            .any(|a| a.contains("no figuran en la clasificación"))
    );
    // Los textos están en castellano y nunca vacíos.
    assert!(!strong.verdict.is_empty() && strong.verdict.contains('%'));
}

#[test]
fn predictions_are_deterministic() {
    let catalog = common::catalog();
    let ctx = PredictionContext::build(&catalog, None);
    let obs = observed(0.6, 0.2, 10.0, 4.0);
    let a = run(&ctx, &obs, &[]);
    let b = run(&ctx, &obs, &[]);
    assert_eq!(a, b);
    // Otro contexto construido con los mismos datos da lo mismo.
    let ctx2 = PredictionContext::build(&catalog, Some("li-test-obj"));
    assert_eq!(run(&ctx2, &obs, &[]), a);
    // Solo con la 1.ª parte se usa esa parte para estimar la 2.ª y se indica.
    let only_p1 = run(&ctx, &obs[..1], &[]);
    assert!(
        only_p1
            .assumptions
            .iter()
            .any(|x| x.contains("No hay respuestas de la 2.ª parte"))
    );
}

#[test]
fn without_any_data_the_model_is_synthetic_and_honest() {
    let convocatorias = serde_json::json!({
        "schema_version": 1,
        "updated": "2026-10-11",
        "target_convocatoria": "li-2099",
        "convocatorias": [{
            "id": "li-2099", "access": "libre", "year": 2099, "title": "Convocatoria futura",
            "status": "convocada", "scoring_scheme": "tai-li-2025",
            "plazas": { "general": null, "discapacidad": null, "total": 500 },
            "sources": []
        }]
    });
    let catalog = Catalog::from_files(vec![(
        "meta/convocatorias.json",
        Cow::Owned(serde_json::to_vec(&convocatorias).expect("json")),
    )]);
    let ctx = PredictionContext::build(&catalog, None);
    assert_eq!(ctx.reference.kind, ReferenceKind::Synthetic);
    // Sin notas de referencia, el corte estimado es el suelo de cada parte.
    assert!(
        ctx.base_cutoff_ratios()
            .iter()
            .all(|c| (c - 0.3).abs() < 1e-9)
    );
    let p = run(&ctx, &observed(0.6, 0.2, 80.0, 20.0), &[]);
    assert_eq!(p.data_quality, DataQuality::Synthetic);
    assert!(p.verdict.contains("sintéticos"));
    assert!(
        p.assumptions
            .iter()
            .any(|a| a.contains("valores por defecto"))
    );
    assert_eq!(p.p_big_city_outside_madrid, None);
    // Agotamiento sintético: Madrid nunca; pueblos antes que ciudades medias.
    let tier = |id: TierId| {
        p.tiers
            .iter()
            .find(|t| t.tier == id)
            .map(|t| t.probability)
            .unwrap_or(-1.0)
    };
    assert!((tier(TierId::GranCiudad) - p.p_plaza).abs() < 1e-9);
    assert!(tier(TierId::Pueblo) <= tier(TierId::CiudadMedia));
    for x in [
        p.p_pass,
        p.p_plaza,
        p.cutoff_ratio,
        p.expected_grade / 100.0,
    ] {
        assert!(x.is_finite() && (0.0..=1.0).contains(&x));
    }
}

#[test]
fn user_cutoff_override_is_fixed() {
    let catalog = Catalog::empty();
    let ctx = PredictionContext::build(&catalog, None);
    let obs = observed(0.55, 0.15, 80.0, 20.0);
    let soft = predict(
        &ctx,
        &PredictionRequest {
            observed: &obs,
            observed_grade: 60.0,
            override_ratio: Some(0.3),
            preferred_localities: &[],
        },
    );
    let hard = predict(
        &ctx,
        &PredictionRequest {
            observed: &obs,
            observed_grade: 60.0,
            override_ratio: Some(0.6),
            preferred_localities: &[],
        },
    );
    assert!((soft.cutoff_ratio - 0.3).abs() < 1e-9);
    assert!((hard.cutoff_ratio - 0.6).abs() < 1e-9);
    assert!(soft.p_pass > hard.p_pass);
    assert!(
        soft.reasoning
            .iter()
            .any(|r| r.contains("corte personalizado"))
    );
}
