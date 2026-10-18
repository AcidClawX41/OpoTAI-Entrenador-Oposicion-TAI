// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Integración con los datos reales del repositorio (`data/`). Se omite limpiamente si los
//! bancos todavía no existen (p. ej. mientras el pipeline de datos está a medias).

mod common;

use std::path::PathBuf;

use common::*;
use tai_core::api::{ExamSpec, FeedbackMode, ManualGradeInput, ManualPartInput};
use tai_core::catalog::IssueKind;
use tai_core::prediction::{PredictionContext, ReferenceKind};
use tai_core::{Catalog, Database, Engine, EngineOptions, FixedClock};

fn data_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../data")
}

fn has_banks(dir: &std::path::Path) -> bool {
    fn walk(dir: &std::path::Path) -> bool {
        std::fs::read_dir(dir).is_ok_and(|entries| {
            entries.filter_map(Result::ok).any(|e| {
                let p = e.path();
                if p.is_dir() {
                    !p.ends_with("assets") && walk(&p)
                } else {
                    p.extension().is_some_and(|x| x == "json")
                }
            })
        })
    }
    walk(&dir.join("banks"))
}

#[test]
fn real_data_deserializes_and_works_end_to_end() {
    let dir = data_dir();
    if !dir.is_dir() || !has_banks(&dir) {
        eprintln!("data/banks sin bancos todavía: se omite el test con datos reales");
        return;
    }
    let started = std::time::Instant::now();
    let catalog = Catalog::load_dir(&dir).expect("data/");
    eprintln!(
        "carga del catálogo real: {} ms",
        started.elapsed().as_millis()
    );
    let report = catalog.report();
    let parse: Vec<String> = report
        .parse_errors()
        .map(|i| format!("{} · {}", i.path, i.message))
        .collect();
    assert!(
        parse.is_empty(),
        "ficheros que no deserializan:\n{}",
        parse.join("\n")
    );
    let integrity: Vec<String> = report
        .errors()
        .filter(|i| i.kind == IssueKind::Integrity)
        .map(|i| format!("{} · {}", i.path, i.message))
        .collect();
    eprintln!(
        "datos reales: {} bancos, {} preguntas, {} temas de teoría, {} errores ({} de integridad), {} avisos",
        catalog.banks().len(),
        catalog.question_count(),
        catalog.theory().len(),
        report.errors().count(),
        integrity.len(),
        report.warnings().count()
    );
    for issue in integrity.iter().take(20) {
        eprintln!("  · {issue}");
    }
    assert!(!catalog.banks().is_empty());

    let clock = std::sync::Arc::new(FixedClock::new(now()));
    let db = Database::open_in_memory().expect("db");
    let mut engine = Engine::with_options(catalog, db, EngineOptions::with_clock(clock));
    let profile = engine
        .create_profile("Real", "#7c3aed", None)
        .expect("perfil")
        .id;
    let info = engine.get_app_info();
    assert!(info.questions > 0);
    let catalog_info = engine.get_catalog();
    assert!(!catalog_info.schemes.is_empty());

    // Los diagramas de la teoría (`![alt](diagramas/…)`) llegan siempre como data URL.
    for summary in engine.get_theory_index() {
        let topic = engine.get_theory(&summary.topic).expect("teoría");
        assert!(
            !topic.content.contains("](diagramas/"),
            "{}: diagrama sin resolver",
            summary.topic
        );
    }
    if let Ok(iv7) = engine.get_theory("IV.7") {
        assert!(iv7.content.contains("](data:image/svg+xml;base64,"));
    }

    // Cada examen oficial se puede generar y corregir.
    let bank_ids: Vec<String> = catalog_info
        .banks
        .iter()
        .filter(|b| b.kind == tai_core::api::BankKind::Official)
        .map(|b| b.id.clone())
        .collect();
    for bank_id in &bank_ids {
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Official {
                    bank_id: bank_id.clone(),
                    include_reserve: true,
                    timed: true,
                    feedback: FeedbackMode::End,
                    theory_block: None,
                },
            )
            .unwrap_or_else(|e| panic!("{bank_id}: {e}"));
        let first_case = paper
            .sections
            .iter()
            .find(|s| s.kind == tai_core::api::SectionKind::Case)
            .map(|s| s.id.clone());
        let result = engine
            .submit_exam(&progress_with(&paper, first_case.as_deref(), |id, _| {
                correct_letter(&engine, id)
            }))
            .unwrap_or_else(|e| panic!("{bank_id}: {e}"));
        assert!(
            result.grade.passed,
            "{bank_id}: todo correcto debería aprobar"
        );
        assert!(result.prediction.is_some());
        for item in &result.review {
            for text in std::iter::once(&item.text).chain(item.options.iter()) {
                assert!(
                    !text.contains("](assets/"),
                    "{bank_id}: imagen sin resolver en {}",
                    item.question_id
                );
            }
        }
    }

    // Simulacro, numerado y sorteo con los datos reales.
    let simulacro = engine
        .start_exam(
            &profile,
            ExamSpec::Simulacro {
                scheme_id: None,
                part1_questions: None,
                include_case: true,
                duration_minutes: None,
                prefer_unseen: true,
                seed: Some(2026),
                feedback: FeedbackMode::End,
                freestyle: false,
            },
        )
        .expect("simulacro");
    assert!(simulacro.sections[0].questions.len() >= 50);
    let numbered = engine
        .start_exam(
            &profile,
            ExamSpec::Numbered {
                number: 1,
                feedback: FeedbackMode::End,
                timed: true,
            },
        )
        .expect("numerado");
    assert!(numbered.requires_case_choice);
    // En el sorteo solo entran los exámenes oficiales completos (1.ª parte y supuesto), por sí
    // mismos o con su ejercicio complementario (2018: 1.er ejercicio + 2.º publicado aparte); el
    // banco secundario se puede hacer como réplica suelta pero no se sortea.
    let has = |b: &tai_core::api::BankSummary, kind: tai_core::api::SectionKind| {
        b.sections
            .iter()
            .any(|s| s.kind == kind && s.question_count > 0)
    };
    let by_id = |id: &str| catalog_info.banks.iter().find(|b| b.id == id);
    let complete_officials = catalog_info
        .banks
        .iter()
        .filter(|b| b.kind == tai_core::api::BankKind::Official)
        .filter(|b| {
            let companion_cases = b
                .companion_bank_id
                .as_deref()
                .and_then(by_id)
                .is_some_and(|c| has(c, tai_core::api::SectionKind::Case));
            has(b, tai_core::api::SectionKind::Theory)
                && (has(b, tai_core::api::SectionKind::Case) || companion_cases)
        })
        .count();
    assert_eq!(
        complete_officials,
        catalog_info
            .banks
            .iter()
            .filter(|b| b.complete_exam)
            .count()
    );
    let draw = engine.draw_random_exam(&profile).expect("sorteo");
    assert_eq!(draw.pool_size as usize, complete_officials + 30);

    // Calculadora con el esquema por defecto y predicción.
    let default_scheme = catalog_info.default_scheme.clone();
    let started = std::time::Instant::now();
    let calc = engine
        .calculate_grade(
            Some(&profile),
            &ManualGradeInput {
                scheme_id: default_scheme,
                parts: vec![
                    ManualPartInput {
                        part: 1,
                        correct: 50,
                        wrong: 15,
                        blank: 15,
                    },
                    ManualPartInput {
                        part: 2,
                        correct: 12,
                        wrong: 4,
                        blank: 4,
                    },
                ],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora");
    eprintln!(
        "calculadora + predicción (4.000 simulaciones): {} ms",
        started.elapsed().as_millis()
    );
    assert!(calc.grade.total_grade.is_finite());
    eprintln!(
        "calculadora (50/15/15 + 12/4/4): nota {:.2} · p_aprobar {:.2} · p_plaza {:.2} · {}",
        calc.grade.total_grade,
        calc.prediction.p_pass,
        calc.prediction.p_plaza,
        calc.prediction.verdict
    );
    let stats = engine.get_stats(&profile).expect("stats");
    assert_eq!(stats.attempts_finished as usize, bank_ids.len());
}

#[test]
fn research_cutoffs_for_2025_are_reproduced() {
    let dir = data_dir();
    if !dir.join("meta").join("convocatorias.json").is_file() {
        eprintln!("data/meta sin convocatorias: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let Some(target) = catalog.convocatoria("li-2025") else {
        eprintln!("sin li-2025 en los datos: se omite");
        return;
    };
    if target
        .cutoff
        .as_ref()
        .is_some_and(|c| c.part_ratio(2).is_some())
    {
        eprintln!("li-2025 ya tiene cortes oficiales: se omite la comprobación de la estimación");
        return;
    }
    let ctx = PredictionContext::build(&catalog, Some("li-2025"));
    if ctx.reference.kind != ReferenceKind::Grades {
        eprintln!("sin notas de aptos en la referencia: se omite");
        return;
    }
    // docs/investigacion/modelo-plazas-destinos.md: k_ref = 844 · 5.261 / 8.790 ≈ 505 (plazas
    // del turno general), 1.ª parte 0,30 (24/80) y 2.ª parte ≈ 0,40–0,42 (8/20).
    let k = ctx.reference_rank_k().expect("plazas");
    assert!((495..=515).contains(&k), "k_ref = {k}");
    let cutoffs = ctx.base_cutoff_ratios();
    assert!((cutoffs[0] - 0.30).abs() < 1e-9, "{cutoffs:?}");
    assert!(cutoffs[1] > 0.34 && cutoffs[1] < 0.44, "{cutoffs:?}");
    eprintln!(
        "li-2025: referencia {:?}, k_ref = {k}, cortes estimados {:?}, destinos de {:?}",
        ctx.reference.convocatoria, cutoffs, ctx.destinations.convocatoria
    );
}

#[test]
fn destination_simulator_replays_previous_calls_with_real_data() {
    let dir = data_dir();
    if !dir.join("meta").join("destinos").is_dir() || !has_banks(&dir) {
        eprintln!("sin destinos ni bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let db = Database::open_in_memory().expect("db");
    let mut engine = Engine::with_options(
        catalog,
        db,
        EngineOptions::with_clock(std::sync::Arc::new(FixedClock::new(now()))),
    );
    let profile = engine
        .create_profile("Destinos", "#7c3aed", None)
        .expect("perfil")
        .id;
    let scheme_id = engine.get_catalog().default_scheme;
    // (aciertos, errores) de la 1.ª parte (80) y del supuesto (20): fuerte, medio y justo.
    let cases = [((72, 6), (18, 2)), ((52, 16), (12, 5)), ((40, 25), (8, 8))];
    let mut medians = Vec::new();
    for ((c1, e1), (c2, e2)) in cases {
        let input = ManualGradeInput {
            scheme_id: scheme_id.clone(),
            parts: vec![
                ManualPartInput {
                    part: 1,
                    correct: c1,
                    wrong: e1,
                    blank: 80 - c1 - e1,
                },
                ManualPartInput {
                    part: 2,
                    correct: c2,
                    wrong: e2,
                    blank: 20 - c2 - e2,
                },
            ],
            cutoff_override_ratio: None,
        };
        let started = std::time::Instant::now();
        let sim = engine
            .simulate_destinations(Some(&profile), None, Some(&input))
            .expect("simulador");
        eprintln!(
            "simulador ({c1}/{e1} + {c2}/{e2}): {} ms · nota {:.2}",
            started.elapsed().as_millis(),
            sim.observed_grade
        );
        assert!(
            sim.scenarios.len() >= 2,
            "proyección y al menos una réplica"
        );
        assert_eq!(sim.scenarios[0].id, "proyeccion");
        for s in &sim.scenarios {
            eprintln!("  · {}", s.summary);
            for p in [s.p_pass, s.p_plaza, s.available_share] {
                assert!(
                    (0.0..=1.0 + 1e-9).contains(&p),
                    "{}: probabilidad fuera de rango",
                    s.id
                );
            }
            assert!(s.available_posts <= f64::from(s.posts_total) + 1e-9);
            let posts: u32 = s.provinces.iter().map(|p| p.posts).sum();
            assert_eq!(posts, s.posts_total, "{}: provincias = total", s.id);
            for p in &s.provinces {
                assert!(p.available_posts <= f64::from(p.posts) + 1e-9);
                assert!((0.0..=1.0 + 1e-9).contains(&p.p_available));
            }
            if s.p_plaza > 0.0 {
                let likely: f64 = s.provinces.iter().map(|p| p.p_likely).sum();
                assert!(
                    (likely - 1.0).abs() < 1e-6,
                    "{}: Σ p_likely = {likely}",
                    s.id
                );
                assert!(!s.likely.is_empty());
            }
        }
        medians.push(
            sim.scenarios
                .iter()
                .find(|s| s.id == "li-2024")
                .and_then(|s| s.rank.map(|r| r.p50)),
        );
    }
    // A mejor rendimiento, mejor número de orden en la réplica de 2024.
    if let [Some(a), Some(b), ..] = medians[..] {
        assert!(a < b, "el fuerte ({a}) debe ir delante del medio ({b})");
    }
}

#[test]
fn official_replay_offers_first_part_block_choice() {
    let dir = data_dir();
    let bank_path = dir.join("banks/oficiales/tai-li-2016.json");
    if !bank_path.is_file() {
        eprintln!("sin tai-li-2016: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let db = Database::open_in_memory().expect("db");
    let mut engine = Engine::with_options(
        catalog,
        db,
        EngineOptions::with_clock(std::sync::Arc::new(FixedClock::new(now()))),
    );
    let profile = engine
        .create_profile("Bloques", "#7c3aed", None)
        .expect("perfil")
        .id;
    for block in [tai_core::api::BlockId::III, tai_core::api::BlockId::IV] {
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Official {
                    bank_id: "tai-li-2016".into(),
                    include_reserve: false,
                    timed: true,
                    feedback: FeedbackMode::End,
                    theory_block: Some(block),
                },
            )
            .expect("réplica 2016");
        let theory: Vec<_> = paper
            .sections
            .iter()
            .filter(|s| s.kind == tai_core::api::SectionKind::Theory)
            .collect();
        let blocks: Vec<_> = theory.iter().filter_map(|s| s.block).collect();
        assert_eq!(blocks, vec![block], "solo la alternativa elegida");
        let questions: usize = theory.iter().map(|s| s.questions.len()).sum();
        assert_eq!(questions, 100, "50 comunes + 50 del bloque {block:?}");
        engine.abandon_exam(&paper.attempt_id).expect("abandonar");
    }
}

#[test]
fn official_2018_replica_joins_both_exercises() {
    let dir = data_dir();
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (Some(main), Some(second)) = (catalog.bank("tai-li-2018"), catalog.bank("tai-li-2018-ej2"))
    else {
        eprintln!("sin los bancos de 2018: se omite");
        return;
    };
    assert_eq!(
        catalog.companion(main).map(|b| b.id.as_str()),
        Some(second.id.as_str())
    );
    assert_eq!(
        catalog.companion(second).map(|b| b.id.as_str()),
        Some(main.id.as_str())
    );
    assert!(catalog.is_complete_official(main));
    assert!(
        !catalog.is_complete_official(second),
        "el 2.º ejercicio no se sortea solo"
    );
    // Bancos completos por sí mismos: sin complementario.
    for id in [
        "tai-li-2024",
        "tai-li-2025",
        "tai-li-2025-ext",
        "tai-pi-2018",
    ] {
        if let Some(bank) = catalog.bank(id) {
            assert!(
                catalog.companion(bank).is_none(),
                "{id} no tiene complementario"
            );
        }
    }

    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("Dos ejercicios", "#7c3aed", None)
        .expect("perfil")
        .id;
    let summary = engine.get_catalog();
    let info = summary
        .banks
        .iter()
        .find(|b| b.id == "tai-li-2018")
        .expect("2018");
    assert_eq!(info.companion_bank_id.as_deref(), Some("tai-li-2018-ej2"));
    assert!(info.complete_exam);

    let paper = engine
        .start_exam(
            &profile,
            ExamSpec::Official {
                bank_id: "tai-li-2018".into(),
                include_reserve: true,
                timed: true,
                feedback: FeedbackMode::End,
                theory_block: None,
            },
        )
        .expect("réplica 2018");
    let parts: Vec<(u32, String)> = paper
        .sections
        .iter()
        .map(|s| (s.part, s.id.clone()))
        .collect();
    assert_eq!(parts.first().map(|p| p.0), Some(1));
    assert_eq!(parts.iter().filter(|p| p.0 == 2).count(), 2, "{parts:?}");
    assert!(paper.requires_case_choice);
    assert_eq!(paper.duration_minutes, Some(160));
    assert!(
        paper
            .subtitle
            .as_deref()
            .is_some_and(|s| s.contains("1.er y 2.º ejercicio")),
        "{:?}",
        paper.subtitle
    );
    // Se entrega y se califica con las dos partes del esquema de 2018: todo correcto aprueba.
    let first_case = paper
        .sections
        .iter()
        .find(|s| s.part == 2)
        .map(|s| s.id.clone());
    let result = engine
        .submit_exam(&progress_with(&paper, first_case.as_deref(), |id, _| {
            correct_letter(&engine, id)
        }))
        .expect("entrega");
    assert_eq!(result.grade.parts.len(), 2);
    assert!(result.grade.passed, "todo correcto debería aprobar");
}

#[test]
fn numbered_simulacros_only_offer_cases_of_the_current_format() {
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("Numerados", "#7c3aed", None)
        .expect("perfil")
        .id;
    // Ingreso libre: supuestos de 20 preguntas. Los de promoción interna (12) o de los formatos
    // antiguos (30/40) descuadrarían la nota sobre el esquema vigente.
    let mut pairs = std::collections::HashSet::new();
    for number in 1..=tai_core::defaults::NUMBERED_SIMULACROS {
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Numbered {
                    number,
                    feedback: FeedbackMode::End,
                    timed: true,
                },
            )
            .expect("numerado");
        let sizes: Vec<usize> = paper
            .sections
            .iter()
            .filter(|s| s.kind == tai_core::api::SectionKind::Case)
            .map(|s| s.questions.len())
            .collect();
        assert!(!sizes.is_empty(), "n.º {number} sin supuestos");
        assert!(sizes.iter().all(|&n| n == 20), "n.º {number}: {sizes:?}");
        pairs.insert(
            paper
                .sections
                .iter()
                .filter(|s| s.kind == tai_core::api::SectionKind::Case)
                .map(|s| s.id.clone())
                .collect::<Vec<_>>(),
        );
        engine.abandon_exam(&paper.attempt_id).expect("abandonar");
    }
    // Y siguen rotando entre los supuestos válidos de ingreso libre.
    assert!(pairs.len() >= 5, "solo {} combinaciones", pairs.len());
}

#[test]
fn custom_simulacros_match_the_chosen_scheme_sizes() {
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("A medida", "#7c3aed", None)
        .expect("perfil")
        .id;
    // (esquema, preguntas de la 1.ª parte, preguntas por supuesto): las preguntas de teoría pueden
    // venir de cualquier convocatoria (libre o interna), pero los recuentos son los del esquema.
    for (scheme, theory, case) in [
        ("tai-li-2025", 80, 20),
        ("tai-li-2019", 100, 30),
        ("tai-li-2016", 100, 40),
        ("tai-pi-2025", 50, 12),
    ] {
        for seed in 1..=6 {
            let paper = engine
                .start_exam(
                    &profile,
                    ExamSpec::Simulacro {
                        scheme_id: Some(scheme.into()),
                        part1_questions: None,
                        include_case: true,
                        duration_minutes: None,
                        prefer_unseen: false,
                        seed: Some(seed),
                        feedback: FeedbackMode::End,
                        freestyle: false,
                    },
                )
                .expect("simulacro a medida");
            let count = |kind| {
                paper
                    .sections
                    .iter()
                    .filter(|s| s.kind == kind)
                    .map(|s| s.questions.len())
                    .collect::<Vec<_>>()
            };
            let theory_sizes = count(tai_core::api::SectionKind::Theory);
            let case_sizes = count(tai_core::api::SectionKind::Case);
            assert_eq!(
                theory_sizes.iter().sum::<usize>(),
                theory,
                "{scheme}/{seed}"
            );
            assert!(!case_sizes.is_empty(), "{scheme}/{seed} sin supuestos");
            assert!(
                case_sizes.iter().all(|&n| n == case),
                "{scheme}/{seed}: {case_sizes:?}"
            );
            engine.abandon_exam(&paper.attempt_id).expect("abandonar");
        }
    }
}

#[test]
fn official_replicas_have_the_question_counts_of_their_scheme() {
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let banks: Vec<String> = catalog
        .banks()
        .iter()
        .filter(|b| catalog.is_complete_official(b))
        .map(|b| b.id.clone())
        .collect();
    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("Réplicas", "#7c3aed", None)
        .expect("perfil")
        .id;
    for bank_id in banks {
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Official {
                    bank_id: bank_id.clone(),
                    include_reserve: false,
                    timed: true,
                    feedback: FeedbackMode::End,
                    theory_block: None,
                },
            )
            .expect("réplica");
        let titular = |s: &tai_core::api::PaperSection| {
            s.questions.iter().filter(|q| !q.is_reserve).count() as u32
        };
        for part in &paper.scheme.parts {
            let sections: Vec<_> = paper
                .sections
                .iter()
                .filter(|s| s.part == part.part)
                .collect();
            assert!(
                !sections.is_empty(),
                "{bank_id}: falta la parte {}",
                part.part
            );
            if part.kind == tai_core::api::SectionKind::Case {
                // Cada supuesto ofrecido tiene las preguntas que puntúa el esquema.
                for s in &sections {
                    assert_eq!(titular(s), part.questions, "{bank_id} · {}", s.title);
                }
            } else {
                // Cuestionario: las preguntas puntuables (con bloque a elegir en 2015/2016, las
                // comunes más una alternativa) no pueden ser menos que las del esquema.
                let total: u32 = sections.iter().map(|s| titular(s)).sum();
                assert!(
                    total >= part.questions,
                    "{bank_id}: {total} < {}",
                    part.questions
                );
            }
        }
        engine.abandon_exam(&paper.attempt_id).expect("abandonar");
    }
}

#[test]
fn published_cutoffs_in_thirds_are_reachable() {
    // La CPS publica las puntuaciones directas redondeadas a dos decimales: un corte de
    // «31,67» es en realidad 95/3 (35 aciertos y 10 errores). Quien saca exactamente esa
    // directa supera el corte, con la calificación mínima (25).
    let dir = data_dir();
    if !dir.join("meta").join("scoring.json").is_file() {
        eprintln!("sin scoring.json: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (mut engine, _) = engine_with(catalog);
    // (esquema, parte, aciertos, errores): directa igual al corte publicado.
    let cases = [
        ("tai-li-2019", 1, 35, 10), // 31,67 = 95/3
        ("tai-li-2018", 1, 34, 5),  // 32,33 = 97/3
        ("tai-li-2018", 2, 12, 1),  // 11,67 = 35/3
        ("tai-li-2016", 1, 55, 7),  // 52,67 = 158/3
        ("tai-li-2015", 1, 62, 1),  // 61,67 = 185/3
    ];
    for (scheme_id, part, correct, wrong) in cases {
        if engine.catalog().scheme(scheme_id).is_none() {
            continue;
        }
        let tested = ManualPartInput {
            part,
            correct,
            wrong,
            blank: 0,
        };
        // La 2.ª parte solo se corrige si se supera la 1.ª: se da la 1.ª perfecta.
        let first = ManualPartInput {
            part: 1,
            correct: 100,
            wrong: 0,
            blank: 0,
        };
        let parts = if part == 1 {
            vec![tested]
        } else {
            vec![first, tested]
        };
        let result = engine
            .calculate_grade(
                None,
                &ManualGradeInput {
                    scheme_id: scheme_id.to_string(),
                    parts,
                    cutoff_override_ratio: None,
                },
            )
            .expect("calculadora");
        let unit = result
            .grade
            .units
            .iter()
            .find(|u| u.parts == vec![part])
            .expect("unidad");
        assert!(
            unit.passed && (unit.grade - 25.0).abs() < 1e-6,
            "{scheme_id} parte {part}: directa {} corte {} → {} ({})",
            unit.direct,
            unit.cutoff_direct,
            unit.grade,
            unit.passed
        );
    }
}

#[test]
fn single_case_uses_the_penalty_of_its_own_exam() {
    // Un supuesto suelto de promoción interna resta 1/4 por error, como en su examen.
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let Some(bank) = catalog.bank("tai-pi-2024") else {
        eprintln!("sin tai-pi-2024: se omite");
        return;
    };
    let section_id = bank
        .sections
        .iter()
        .find(|s| s.kind == tai_core::model::SectionKind::Case)
        .map(|s| s.id.clone())
        .expect("supuesto");
    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("Supuesto", "#7c3aed", None)
        .expect("perfil")
        .id;
    let paper = engine
        .start_exam(
            &profile,
            ExamSpec::Case {
                bank_id: "tai-pi-2024".into(),
                section_id,
                feedback: FeedbackMode::End,
                timed: false,
            },
        )
        .expect("supuesto");
    assert_eq!(paper.scheme.parts[0].penalty_divisor, Some(4.0));
    let mut i = 0;
    let result = engine
        .submit_exam(&progress_with(&paper, None, |id, _| {
            i += 1;
            if i <= 9 {
                correct_letter(&engine, id)
            } else {
                Some(wrong_letter(&engine, id))
            }
        }))
        .expect("entregar");
    // 9 aciertos y 3 errores: 9 − 3/4 = 8,25 de 12 (valor 4 → 33 de 48); corte 50 %.
    let unit = &result.grade.units[0];
    assert!((unit.direct / unit.max_direct - 8.25 / 12.0).abs() < 1e-9);
    assert!((result.grade.total_grade - (5.0 + 5.0 * (8.25 - 6.0) / 6.0)).abs() < 1e-9);
}

/// Réplica de una convocatoria con un rendimiento casi determinista (recuentos ×1.000: la
/// precisión apenas varía y, sin errores, los aciertos son exactamente los contestados).
fn replay_scenarios(
    p1: (f64, f64),
    p2: (f64, f64),
) -> Option<Vec<tai_core::api::DestinationScenario>> {
    use tai_core::prediction::{
        DestinationContext, DestinationRequest, ObservedPart, simulate_destinations,
    };
    let dir = data_dir();
    if !dir.join("meta").join("destinos").is_dir() {
        eprintln!("sin destinos reales: se omite");
        return None;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let ctx = PredictionContext::build(&catalog, Some("li-2025"));
    let dctx = DestinationContext::build(&catalog, ctx.scheme.access);
    let k = 1000.0;
    let observed = [
        ObservedPart {
            part: 1,
            correct: p1.0 * k,
            wrong: p1.1 * k,
            blank: (80.0 - p1.0 - p1.1) * k,
        },
        ObservedPart {
            part: 2,
            correct: p2.0 * k,
            wrong: p2.1 * k,
            blank: (20.0 - p2.0 - p2.1) * k,
        },
    ];
    let sim = simulate_destinations(
        &ctx,
        &dctx,
        &DestinationRequest {
            observed: &observed,
            observed_grade: 0.0,
            override_ratio: None,
            preferred_localities: &[],
        },
    );
    Some(sim.scenarios)
}

/// Notas publicadas de los aprobados de una convocatoria, de mayor a menor.
fn published_grades(id: &str) -> Vec<f64> {
    let catalog = Catalog::load_dir(data_dir()).expect("data/");
    let mut g = catalog
        .convocatoria(id)
        .and_then(|c| c.grades_of_aptos.as_ref())
        .map(|g| g.values.clone())
        .unwrap_or_default();
    g.sort_by(|a, b| b.total_cmp(a));
    g
}

#[test]
fn replays_grade_each_part_with_that_years_cutoffs() {
    // 60/80 sin errores y 12/20 sin errores. En 2021 cada parte se calificaba por separado
    // (BOE-A-2022-4417 publica «Parte 1», «Parte 2» y T.P.S.): 1.ª 25 + 25·(60 − 25)/55 =
    // 40,91; 2.ª 25 + 25·(12 − 8)/12 = 33,33; total 74,24. La fórmula conjunta daría 79,10.
    let Some(scenarios) = replay_scenarios((60.0, 0.0), (12.0, 0.0)) else {
        return;
    };
    let s2021 = scenarios.iter().find(|s| s.id == "li-2021").expect("2021");
    let g = s2021.equivalent_grade.expect("nota");
    assert!((g - 74.24).abs() < 0.05, "nota equivalente 2021: {g}");
    let expected = published_grades("li-2021")
        .iter()
        .filter(|x| **x > 74.24 + 1e-6)
        .count() as f64
        + 1.0;
    let r = s2021.rank.expect("plaza en 2021");
    assert_eq!(r.p50, expected, "número de orden en 2021");
    // 2024 (calificación conjunta): 50 + 50·(60 + 48 − 48)/112 = 76,79.
    let s2024 = scenarios.iter().find(|s| s.id == "li-2024").expect("2024");
    let g = s2024.equivalent_grade.expect("nota");
    assert!((g - 76.79).abs() < 0.05, "nota equivalente 2024: {g}");
}

#[test]
fn replays_apply_eliminatory_parts() {
    // Teoría muy buena y supuesto en blanco: en 2019 y 2021 la 2.ª parte era eliminatoria
    // (13/30 y 8/20), así que no se aprueba; en 2023 y 2024 la calificación era conjunta y
    // 70/160 supera el corte de 48/160, con plaza (hubo más plazas que aprobados).
    let Some(scenarios) = replay_scenarios((70.0, 0.0), (0.0, 0.0)) else {
        return;
    };
    for s in &scenarios {
        match s.id.as_str() {
            "li-2019" | "li-2021" => {
                assert_eq!(s.p_pass, 0.0, "{}: aprobaría sin supuesto", s.id);
                assert_eq!(s.p_plaza, 0.0, "{}", s.id);
            }
            "li-2023" | "li-2024" => {
                assert!(s.p_pass > 0.99, "{}: {}", s.id, s.p_pass);
                assert_eq!(s.p_plaza, s.p_pass, "{}: todo apto tuvo plaza", s.id);
            }
            _ => {}
        }
    }
}

#[test]
fn practice_uses_the_penalty_of_the_profile_target() {
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("Interna", "#7c3aed", None)
        .expect("perfil")
        .id;
    let practice = |engine: &mut tai_core::Engine| {
        let paper = engine
            .start_exam(
                &profile,
                ExamSpec::Practice {
                    blocks: vec![],
                    topics: vec![],
                    bank_ids: vec![],
                    include_cases: false,
                    source: tai_core::api::QuestionSource::All,
                    count: 20,
                    feedback: FeedbackMode::Immediate,
                    duration_minutes: None,
                    seed: Some(7),
                },
            )
            .expect("práctica");
        let divisor = paper.scheme.parts[0].penalty_divisor;
        engine.abandon_exam(&paper.attempt_id).expect("abandonar");
        divisor
    };
    // Por defecto (ingreso libre): cada error resta 1/3.
    assert_eq!(practice(&mut engine), Some(3.0));
    // Quien prepara promoción interna practica con su resta: 1/4.
    let mut s = engine.get_settings(&profile).expect("ajustes");
    s.target_convocatoria = Some("pi-2025".into());
    engine.update_settings(&profile, s).expect("guarda");
    assert_eq!(practice(&mut engine), Some(4.0));
}

#[test]
fn block_and_topic_net_use_the_penalty_of_the_profile_target() {
    // El rendimiento neto por bloque y tema resta lo mismo que el examen que se prepara:
    // 1/3 en ingreso libre, 1/4 en promoción interna.
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (mut engine, _) = engine_with(catalog);
    let profile = engine
        .create_profile("Interna", "#7c3aed", None)
        .expect("perfil")
        .id;
    let paper = engine
        .start_exam(
            &profile,
            ExamSpec::Practice {
                blocks: vec![],
                topics: vec![],
                bank_ids: vec![],
                include_cases: false,
                source: tai_core::api::QuestionSource::All,
                count: 40,
                feedback: FeedbackMode::End,
                duration_minutes: None,
                seed: Some(11),
            },
        )
        .expect("práctica");
    let mut i = 0;
    let result = engine
        .submit_exam(&progress_with(&paper, None, |id, _| {
            i += 1;
            if i % 2 == 0 {
                correct_letter(&engine, id)
            } else {
                Some(wrong_letter(&engine, id))
            }
        }))
        .expect("entregar");
    let net = |b: &tai_core::api::BlockStat, d: f64| {
        (f64::from(b.correct) - f64::from(b.wrong) / d) / f64::from(b.total)
    };
    for b in &result.by_block {
        assert!((b.net_ratio - net(b, 3.0)).abs() < 1e-9, "{}", b.key);
    }
    let mut s = engine.get_settings(&profile).expect("ajustes");
    s.target_convocatoria = Some("pi-2025".into());
    engine.update_settings(&profile, s).expect("guarda");
    let stats = engine.get_stats(&profile).expect("estadísticas");
    assert!(!stats.by_block.is_empty());
    assert!(stats.by_block.iter().any(|b| b.wrong > 0));
    for b in stats.by_block.iter().chain(&stats.by_topic) {
        assert!((b.net_ratio - net(b, 4.0)).abs() < 1e-9, "{}", b.key);
    }
}

#[test]
fn ranking_for_2025_uses_the_2025_grade_by_parts() {
    // Mismo ratio conjunto ponderado como en 2024 ((0,8 + 0,45)/2 = (0,55 + 0,7)/2), pero en
    // 2025 cada parte se califica por separado sobre su corte (24/80 y ≈ 8,3/20): el supuesto
    // pesa más y B (44/80 + 14/20, ≈ 71,1) supera a A (64/80 + 9/20, ≈ 69,4). El puesto debe
    // seguir la nota de 2025 aplicada a la cohorte de 2024, no la suma ponderada.
    use tai_core::prediction::{ObservedPart, PredictionRequest, predict};
    let dir = data_dir();
    let catalog = match Catalog::load_dir(&dir) {
        Ok(c) => c,
        Err(_) => return,
    };
    let ctx = PredictionContext::build(&catalog, Some("li-2025"));
    if ctx.reference.kind != ReferenceKind::Grades || ctx.scheme.grading.units.len() < 2 {
        eprintln!("sin notas de referencia o sin calificación por partes: se omite");
        return;
    }
    let k = 1000.0;
    let run = |c1: f64, c2: f64| {
        let observed = [
            ObservedPart {
                part: 1,
                correct: c1 * k,
                wrong: 0.0,
                blank: (80.0 - c1) * k,
            },
            ObservedPart {
                part: 2,
                correct: c2 * k,
                wrong: 0.0,
                blank: (20.0 - c2) * k,
            },
        ];
        predict(
            &ctx,
            &PredictionRequest {
                observed: &observed,
                observed_grade: 0.0,
                override_ratio: None,
                preferred_localities: &[],
            },
        )
    };
    let a = run(64.0, 9.0);
    let b = run(44.0, 14.0);
    let (ra, rb) = (
        a.estimated_rank.expect("puesto A"),
        b.estimated_rank.expect("puesto B"),
    );
    eprintln!(
        "A (64 + 9): nota {:.2}, puesto {}; B (44 + 14): nota {:.2}, puesto {}",
        a.expected_grade, ra.p50, b.expected_grade, rb.p50
    );
    assert!(b.expected_grade > a.expected_grade);
    assert!(
        rb.p50 < ra.p50,
        "B ({}) debe ir delante de A ({})",
        rb.p50,
        ra.p50
    );
}

#[test]
fn failed_first_part_leaves_the_case_ungraded_with_an_indicative_grade() {
    let dir = data_dir();
    if !has_banks(&dir) {
        eprintln!("sin bancos reales: se omite");
        return;
    }
    let catalog = Catalog::load_dir(&dir).expect("data/");
    let (mut engine, _) = engine_with(catalog);
    // Caso real de un usuario (formato 2025): 32 A / 48 E en la 1.ª parte → 16 directos de 80,
    // por debajo del corte; 10 A / 10 E en el supuesto → 6,67 directos, que no se corrigen.
    let result = engine
        .calculate_grade(
            None,
            &tai_core::api::ManualGradeInput {
                scheme_id: "tai-li-2025".into(),
                parts: vec![
                    tai_core::api::ManualPartInput {
                        part: 1,
                        correct: 32,
                        wrong: 48,
                        blank: 0,
                    },
                    tai_core::api::ManualPartInput {
                        part: 2,
                        correct: 10,
                        wrong: 10,
                        blank: 0,
                    },
                ],
                cutoff_override_ratio: None,
            },
        )
        .expect("calculadora");
    let g = &result.grade;
    assert!((g.parts[0].direct - 16.0).abs() < 1e-9);
    assert!((g.parts[1].direct - 20.0 / 3.0).abs() < 1e-9);
    assert!(!g.units[0].passed && !g.units[0].ungraded);
    assert!(
        (g.units[0].grade - 25.0 * 16.0 / 24.0).abs() < 1e-6,
        "{}",
        g.units[0].grade
    );
    assert!(g.units[1].ungraded);
    assert_eq!(g.units[1].grade, 0.0);
    let orientativa = g.units[1].would_be_grade.expect("orientativa");
    assert!(orientativa > 0.0 && orientativa < 25.0, "{orientativa}");
    assert!((g.total_grade - g.units[0].grade).abs() < 1e-9);
    assert!(!g.passed);
}
