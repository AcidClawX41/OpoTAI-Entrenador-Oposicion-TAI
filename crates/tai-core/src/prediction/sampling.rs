// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
//! Muestreo para el Monte Carlo: subflujos `ChaCha8` deterministas y distribuciones
//! (normal, gamma, beta, binomial) implementadas aquí para que el resultado sea estable
//! entre versiones de dependencias.
//!
//! Cada muestra `k` usa subflujos propios por propósito (precisión de cada parte, aciertos,
//! ruido del corte…): con la misma semilla base, dos entradas distintas comparten los mismos
//! números aleatorios (técnica de números aleatorios comunes), lo que hace la predicción
//! estable y casi monótona respecto a los aciertos.

use std::f64::consts::PI;

use rand::{RngExt, SeedableRng};
use rand_chacha::ChaCha8Rng;

use crate::util::mix_seed;

/// Subflujo determinista para la muestra `sample` y el propósito `purpose`.
pub fn stream(base: u64, sample: u64, purpose: u64) -> ChaCha8Rng {
    ChaCha8Rng::seed_from_u64(mix_seed(base, sample, purpose))
}

/// Uniforme en (0, 1).
pub fn uniform_open(rng: &mut ChaCha8Rng) -> f64 {
    loop {
        let u: f64 = rng.random();
        if u > 0.0 {
            return u;
        }
    }
}

/// Normal estándar (Box–Muller).
pub fn standard_normal(rng: &mut ChaCha8Rng) -> f64 {
    let u1 = uniform_open(rng);
    let u2: f64 = rng.random();
    (-2.0 * u1.ln()).sqrt() * (2.0 * PI * u2).cos()
}

/// Gamma(shape, 1) con el método de Marsaglia–Tsang.
pub fn gamma(rng: &mut ChaCha8Rng, shape: f64) -> f64 {
    if shape <= 0.0 {
        return 0.0;
    }
    if shape < 1.0 {
        let u = uniform_open(rng);
        return gamma(rng, shape + 1.0) * u.powf(1.0 / shape);
    }
    let d = shape - 1.0 / 3.0;
    let c = 1.0 / (9.0 * d).sqrt();
    loop {
        let x = standard_normal(rng);
        let v = 1.0 + c * x;
        if v <= 0.0 {
            continue;
        }
        let v3 = v * v * v;
        let u = uniform_open(rng);
        if u < 1.0 - 0.0331 * x.powi(4) || u.ln() < 0.5 * x * x + d * (1.0 - v3 + v3.ln()) {
            return d * v3;
        }
    }
}

/// Beta(a, b) como cociente de gammas.
pub fn beta(rng: &mut ChaCha8Rng, a: f64, b: f64) -> f64 {
    let x = gamma(rng, a);
    let y = gamma(rng, b);
    if x + y <= 0.0 { 0.5 } else { x / (x + y) }
}

/// Binomial(n, p) como suma de Bernoulli (n es pequeño: preguntas de una parte).
pub fn binomial(rng: &mut ChaCha8Rng, n: u32, p: f64) -> u32 {
    let p = p.clamp(0.0, 1.0);
    (0..n).filter(|_| rng.random::<f64>() < p).count() as u32
}

/// Inversa de la función de distribución normal estándar (algoritmo de Acklam,
/// error relativo < 1,2·10⁻⁹).
pub fn inverse_normal_cdf(p: f64) -> f64 {
    const A: [f64; 6] = [
        -3.969_683_028_665_376e1,
        2.209_460_984_245_205e2,
        -2.759_285_104_469_687e2,
        1.383_577_518_672_69e2,
        -3.066_479_806_614_716e1,
        2.506_628_277_459_239,
    ];
    const B: [f64; 5] = [
        -5.447_609_879_822_406e1,
        1.615_858_368_580_409e2,
        -1.556_989_798_598_866e2,
        6.680_131_188_771_972e1,
        -1.328_068_155_288_572e1,
    ];
    const C: [f64; 6] = [
        -7.784_894_002_430_293e-3,
        -3.223_964_580_411_365e-1,
        -2.400_758_277_161_838,
        -2.549_732_539_343_734,
        4.374_664_141_464_968,
        2.938_163_982_698_783,
    ];
    const D: [f64; 4] = [
        7.784_695_709_041_462e-3,
        3.224_671_290_700_398e-1,
        2.445_134_137_142_996,
        3.754_408_661_907_416,
    ];
    const P_LOW: f64 = 0.024_25;
    let p = p.clamp(1e-12, 1.0 - 1e-12);
    let tail = |q: f64| {
        (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5])
            / ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1.0)
    };
    if p < P_LOW {
        tail((-2.0 * p.ln()).sqrt())
    } else if p <= 1.0 - P_LOW {
        let q = p - 0.5;
        let r = q * q;
        (((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q
            / (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1.0)
    } else {
        -tail((-2.0 * (1.0 - p).ln()).sqrt())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn inverse_normal_known_values() {
        assert!(inverse_normal_cdf(0.5).abs() < 1e-9);
        assert!((inverse_normal_cdf(0.975) - 1.959_963_985).abs() < 1e-6);
        assert!((inverse_normal_cdf(0.025) + 1.959_963_985).abs() < 1e-6);
        assert!((inverse_normal_cdf(0.001) + 3.090_232_306).abs() < 1e-6);
    }

    #[test]
    fn beta_mean_is_reasonable() {
        let n = 4000;
        let mean: f64 = (0..n)
            .map(|k| beta(&mut stream(7, k, 1), 61.0, 16.0))
            .sum::<f64>()
            / n as f64;
        // Media teórica 61 / 77 ≈ 0,792.
        assert!((mean - 61.0 / 77.0).abs() < 0.01, "media {mean}");
    }

    #[test]
    fn binomial_mean_is_reasonable() {
        let n = 4000;
        let mean: f64 = (0..n)
            .map(|k| f64::from(binomial(&mut stream(9, k, 2), 80, 0.75)))
            .sum::<f64>()
            / n as f64;
        assert!((mean - 60.0).abs() < 0.5, "media {mean}");
    }

    #[test]
    fn streams_are_deterministic() {
        let a: f64 = stream(1, 2, 3).random();
        let b: f64 = stream(1, 2, 3).random();
        let c: f64 = stream(1, 2, 4).random();
        assert_eq!(a, b);
        assert_ne!(a, c);
    }
}
