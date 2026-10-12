// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Valores por defecto internos y documentados para cuando faltan ficheros de `data/meta`.
//!
//! Fuentes (consultadas el 11/10/2026):
//!
//! - **tai-li-2024**: criterios de corrección de la CPS de 10/12/2024 (1.ª parte 80 + 5 reserva,
//!   valor 1, `A − E/3`; 2.ª parte supuesto 20 + 5 reserva a elegir 1 de 2, valor 4,
//!   `4A − 4E/3`; 120 min; calificación conjunta 0–100, corte 48 directos sobre 160 = 50).
//!   Plazas: 1.879 (1.712 + 167), BOE-A-2024-14098, Anexo V. 9.633 admitidos, 5.261
//!   presentados y 1.756 aptos (`docs/investigacion/convocatorias-y-puntuacion.md`).
//! - **tai-li-2025**: BOE-A-2025-26262, Anexo V (1.030 plazas: 844 + 186) y criterios de la
//!   CPS de 18/05/2026: cada parte `A − E/3` con valor 1 por pregunta; cada parte se califica
//!   de 0 a 50 con 25 en el corte y la final es la suma. Examen el 23/05/2026 con 8.790
//!   presentados provisionales (8.410 + 380).
//! - **tai-pi-2024**: criterios de la CPS de 10/12/2024 (50 + 5 preguntas valor 1 y un
//!   supuesto de 12 + 3 preguntas valor 4; los errores restan 1/4 del valor; 90 min;
//!   0–100 con corte 29,40 directos sobre 98). Plazas: 600 (564 + 36).
//!
//! Estos valores solo se usan si `data/meta` no trae los ficheros; los datos del agente de
//! investigación (`data/meta/*.json`) siempre tienen prioridad.

use crate::model::{
    Access, Convocatoria, ConvocatoriaStatus, ConvocatoriasFile, Cutoff, CutoffBasis, Grading,
    GradingUnit, Link, LocalidadesFile, Plazas, ScoringFile, ScoringPart, ScoringScheme,
    SectionKind, TierDef, TierId,
};

/// Convocatoria objetivo por defecto de las predicciones.
pub const DEFAULT_TARGET: &str = "li-2025";

/// Esquema por defecto de los simulacros.
pub const DEFAULT_SCHEME: &str = "tai-li-2025";

/// Número de simulaciones Monte Carlo de la predicción.
pub const MONTE_CARLO_SAMPLES: usize = 4000;

/// Desviación típica del ruido del corte estimado (ratio de la directa máxima).
pub const CUTOFF_NOISE_SD: f64 = 0.03;

/// Distribución sintética de ratios de puntuación directa entre presentados (sin datos):
/// Normal(0,25; 0,15), ajustada a la cola superior observada en 2023–2024
/// (`docs/investigacion/modelo-plazas-destinos.md` §4).
pub const SYNTHETIC_PRESENTADOS: u32 = 6000;
/// Media de la distribución sintética de ratios.
pub const SYNTHETIC_MEAN_RATIO: f64 = 0.25;
/// Desviación típica de la distribución de ratios (también al calibrar con presentados/aptos).
pub const RATIO_SD: f64 = 0.15;
/// Tasa de aptos supuesta cuando hay notas de aptos pero no se conoce el número de presentados.
pub const DEFAULT_PASS_RATE: f64 = 0.30;
/// Participación supuesta (presentados / admitidos) si no se conocen los presentados.
pub const DEFAULT_TURNOUT: f64 = 0.55;

/// Reparto sintético de plazas por tamaño de localidad (sin dataset de destinos): media de
/// 2023–2024 (78 % Madrid + 7 % otras grandes ciudades, 14 % ciudades medias, 1 % pueblos).
pub const SYNTHETIC_TIER_SHARES: [(TierId, f64); 3] = [
    (TierId::GranCiudad, 0.85),
    (TierId::CiudadMedia, 0.14),
    (TierId::Pueblo, 0.01),
];

/// Posición relativa (fracción de la lista) del último destino de cada zona en 2024, usada
/// sin dataset de destinos. Madrid no se agota nunca.
pub const SYNTHETIC_TIER_LAST: [(TierId, f64); 3] = [
    (TierId::GranCiudad, 1.0),
    (TierId::CiudadMedia, 0.89),
    (TierId::Pueblo, 0.74),
];

/// Nombre normalizado de la ciudad que concentra la mayoría de plazas (se excluye en
/// `p_big_city_outside_madrid`).
pub const MADRID: &str = "madrid";

/// Mínimo de respuestas para que un tema aparezca entre los más débiles.
pub const WEAK_TOPIC_MIN_ANSWERS: u32 = 5;

/// Días de actividad que devuelve `get_stats`.
pub const ACTIVITY_DAYS: i64 = 120;

/// Simulacros recientes que alimentan la predicción de preparación (`readiness`).
pub const READINESS_ATTEMPTS: usize = 5;

/// Límite por defecto de `list_attempts`.
pub const DEFAULT_ATTEMPT_LIMIT: u32 = 50;

/// Color de acento por defecto.
pub const DEFAULT_ACCENT: &str = "#7c3aed";

/// Número de simulacros numerados («Simulacro OpoTAI n.º 1…30»).
pub const NUMBERED_SIMULACROS: u32 = 30;

/// Validez (horas) de un sorteo pendiente para marcar `drawn` en el `start_exam` siguiente.
pub const DRAW_VALID_HOURS: i64 = 12;

fn theory_part(questions: u32, reserve: u32, value: f64, divisor: f64) -> ScoringPart {
    ScoringPart {
        part: 1,
        title: "Cuestionario".to_string(),
        kind: SectionKind::Theory,
        questions,
        reserve,
        value,
        penalty_divisor: Some(divisor),
        cases_offered: None,
        cases_to_choose: None,
    }
}

fn case_part(questions: u32, reserve: u32, value: f64, divisor: f64, offered: u32) -> ScoringPart {
    ScoringPart {
        part: 2,
        title: "Supuesto práctico".to_string(),
        kind: SectionKind::Case,
        questions,
        reserve,
        value,
        penalty_divisor: Some(divisor),
        cases_offered: Some(offered),
        cases_to_choose: Some(1),
    }
}

/// Esquema TAI ingreso libre 2024 (calificación conjunta 0–100).
pub fn scheme_li_2024() -> ScoringScheme {
    ScoringScheme {
        id: "tai-li-2024".to_string(),
        title: "TAI ingreso libre · convocatoria 2024".to_string(),
        access: Access::Libre,
        convocatoria: Some("li-2024".to_string()),
        sources: vec![Link {
            title: "Criterios de corrección CPS (10/12/2024)".to_string(),
            url: "https://sede.inap.gob.es/".to_string(),
        }],
        duration_minutes: 120,
        parts: vec![theory_part(80, 5, 1.0, 3.0), case_part(20, 5, 4.0, 3.0, 2)],
        grading: Grading {
            units: vec![GradingUnit {
                parts: vec![1, 2],
                max_grade: 100.0,
                pass_grade: 50.0,
                min_direct_ratio: 0.30,
                cutoff_direct: Some(48.0),
                cutoff_note: Some(
                    "Corte oficial: 48 puntos directos sobre 160 (30 % de la directa máxima)"
                        .to_string(),
                ),
            }],
        },
        notes: Some("Valores por defecto internos (data/meta/scoring.json no disponible).".into()),
    }
}

/// Esquema TAI ingreso libre 2025 (cada parte 0–50 con mínimo 25).
pub fn scheme_li_2025() -> ScoringScheme {
    ScoringScheme {
        id: "tai-li-2025".to_string(),
        title: "TAI ingreso libre · convocatoria 2025".to_string(),
        access: Access::Libre,
        convocatoria: Some("li-2025".to_string()),
        sources: vec![Link {
            title: "BOE-A-2025-26262, Anexo V · Criterios CPS (18/05/2026)".to_string(),
            url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262".to_string(),
        }],
        duration_minutes: 120,
        parts: vec![theory_part(80, 5, 1.0, 3.0), case_part(20, 5, 1.0, 3.0, 2)],
        grading: Grading {
            units: vec![
                GradingUnit {
                    parts: vec![1],
                    max_grade: 50.0,
                    pass_grade: 25.0,
                    min_direct_ratio: 0.30,
                    cutoff_direct: None,
                    cutoff_note: Some(
                        "La CPS fija el corte de la 1.ª parte (50 % de la directa máxima o \
                         menos, nunca por debajo del 30 %)"
                            .to_string(),
                    ),
                },
                GradingUnit {
                    parts: vec![2],
                    max_grade: 50.0,
                    pass_grade: 25.0,
                    min_direct_ratio: 0.30,
                    cutoff_direct: None,
                    cutoff_note: Some(
                        "Corte de la 2.ª parte por número de plazas del turno general (844), mínimo 30 %"
                            .to_string(),
                    ),
                },
            ],
        },
        notes: Some("Valores por defecto internos (data/meta/scoring.json no disponible).".into()),
    }
}

/// Esquema TAI promoción interna 2024 (penalización 1/4).
pub fn scheme_pi_2024() -> ScoringScheme {
    let case = case_part(12, 3, 4.0, 4.0, 2);
    ScoringScheme {
        id: "tai-pi-2024".to_string(),
        title: "TAI promoción interna · convocatoria 2024".to_string(),
        access: Access::PromocionInterna,
        convocatoria: Some("pi-2024".to_string()),
        sources: vec![Link {
            title: "Criterios de corrección CPS (10/12/2024)".to_string(),
            url: "https://sede.inap.gob.es/".to_string(),
        }],
        duration_minutes: 90,
        parts: vec![theory_part(50, 5, 1.0, 4.0), case],
        grading: Grading {
            units: vec![GradingUnit {
                parts: vec![1, 2],
                max_grade: 100.0,
                pass_grade: 50.0,
                min_direct_ratio: 0.30,
                cutoff_direct: Some(29.4),
                cutoff_note: Some(
                    "Corte oficial: 29,40 puntos directos sobre 98 (30 % de la directa máxima)"
                        .to_string(),
                ),
            }],
        },
        notes: Some("Valores por defecto internos (data/meta/scoring.json no disponible).".into()),
    }
}

/// `scoring.json` por defecto.
pub fn scoring() -> ScoringFile {
    ScoringFile {
        schema_version: 1,
        default_scheme: DEFAULT_SCHEME.to_string(),
        schemes: vec![scheme_li_2025(), scheme_li_2024(), scheme_pi_2024()],
    }
}

/// `convocatorias.json` por defecto (sin calificaciones individuales ni destinos).
pub fn convocatorias() -> ConvocatoriasFile {
    let li_2025 = Convocatoria {
        id: "li-2025".to_string(),
        access: Access::Libre,
        year: 2025,
        oep: Some("2025".to_string()),
        title: "Convocatoria 2025 (OEP 2025)".to_string(),
        resolution: Some("Resolución de 18 de diciembre de 2025, de la SEFP".to_string()),
        boe_id: Some("BOE-A-2025-26262".to_string()),
        exam_date: Some("2026-05-23".to_string()),
        status: ConvocatoriaStatus::ExamenRealizado,
        scoring_scheme: Some("tai-li-2025".to_string()),
        plazas: Plazas {
            general: Some(844),
            discapacidad: Some(186),
            total: Some(1030),
        },
        admitidos: Some(15_073),
        presentados: Some(8_790),
        aptos: None,
        aprobados: None,
        cutoff: None,
        grades_of_aptos: None,
        destinations_dataset: None,
        sources: vec![Link {
            title: "BOE-A-2025-26262".to_string(),
            url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2025-26262".to_string(),
        }],
        notes: Some("Valores por defecto internos; presentados provisionales.".to_string()),
    };
    let li_2024 = Convocatoria {
        id: "li-2024".to_string(),
        access: Access::Libre,
        year: 2024,
        oep: Some("2023-2024".to_string()),
        title: "Convocatoria 2024 (OEP 2023-2024)".to_string(),
        resolution: Some("Resolución de 9 de julio de 2024, de la SEFP".to_string()),
        boe_id: Some("BOE-A-2024-14098".to_string()),
        exam_date: Some("2024-12-14".to_string()),
        status: ConvocatoriaStatus::Finalizada,
        scoring_scheme: Some("tai-li-2024".to_string()),
        plazas: Plazas {
            general: Some(1712),
            discapacidad: Some(167),
            total: Some(1879),
        },
        admitidos: Some(9_633),
        presentados: Some(5_261),
        aptos: Some(1_756),
        aprobados: None,
        cutoff: Some(Cutoff {
            direct: Some(48.0),
            max_direct: Some(160.0),
            grade: Some(50.0),
            basis: CutoffBasis::Floor,
            per_part: None,
        }),
        grades_of_aptos: None,
        destinations_dataset: None,
        sources: vec![Link {
            title: "BOE-A-2024-14098".to_string(),
            url: "https://www.boe.es/diario_boe/txt.php?id=BOE-A-2024-14098".to_string(),
        }],
        notes: Some("Valores por defecto internos; presentados provisionales.".to_string()),
    };
    let pi_2024 = Convocatoria {
        id: "pi-2024".to_string(),
        access: Access::PromocionInterna,
        year: 2024,
        oep: Some("2021-2024".to_string()),
        title: "Promoción interna 2024".to_string(),
        resolution: Some("Resolución de 9 de julio de 2024, de la SEFP".to_string()),
        boe_id: Some("BOE-A-2024-14098".to_string()),
        exam_date: Some("2024-12-14".to_string()),
        status: ConvocatoriaStatus::Finalizada,
        scoring_scheme: Some("tai-pi-2024".to_string()),
        plazas: Plazas {
            general: Some(564),
            discapacidad: Some(36),
            total: Some(600),
        },
        admitidos: Some(93),
        presentados: Some(56),
        aptos: None,
        aprobados: None,
        cutoff: Some(Cutoff {
            direct: Some(29.4),
            max_direct: Some(98.0),
            grade: Some(50.0),
            basis: CutoffBasis::Floor,
            per_part: None,
        }),
        grades_of_aptos: None,
        destinations_dataset: None,
        sources: Vec::new(),
        notes: Some("Valores por defecto internos; presentados provisionales.".to_string()),
    };
    ConvocatoriasFile {
        schema_version: 1,
        updated: None,
        target_convocatoria: Some(DEFAULT_TARGET.to_string()),
        convocatorias: vec![li_2025, li_2024, pi_2024],
    }
}

/// Tamaños de localidad por defecto.
pub fn tiers() -> Vec<TierDef> {
    vec![
        TierDef {
            id: TierId::GranCiudad,
            order: 1,
            label: "Grandes ciudades".to_string(),
            description: "Municipios ≥ 300.000 habitantes".to_string(),
        },
        TierDef {
            id: TierId::CiudadMedia,
            order: 2,
            label: "Capitales y ciudades medias".to_string(),
            description: "Capitales de provincia y municipios ≥ 50.000 hab.".to_string(),
        },
        TierDef {
            id: TierId::Pueblo,
            order: 3,
            label: "Pueblos y zonas menos pobladas".to_string(),
            description: "Resto de municipios".to_string(),
        },
    ]
}

/// `localidades.json` por defecto: solo los tamaños, sin localidades.
pub fn localidades() -> LocalidadesFile {
    LocalidadesFile {
        schema_version: 1,
        source: None,
        population_year: None,
        tiers: tiers(),
        localities: Vec::new(),
    }
}
