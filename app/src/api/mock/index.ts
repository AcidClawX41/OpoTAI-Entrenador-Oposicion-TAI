// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * Backend simulado del MODO DEMO (navegador sin Tauri).
 *
 * Implementa todos los comandos de `docs/CONTRATO-API.md` con un banco de
 * preguntas de ejemplo propio y persistencia en `localStorage`. Los datos
 * viajan serializados a JSON igual que por IPC, para detectar en la demo los
 * mismos problemas que tendría la app real.
 */
import type { Invoker } from "../client";
import { loadDevData } from "./devData";
import { MockEngine } from "./engine";
import { seedDemo } from "./seed";
import { clearDb } from "./store";

let enginePromise: Promise<MockEngine> | null = null;

export function getMockEngine(): Promise<MockEngine> {
  if (!enginePromise) enginePromise = loadDevData().then((dev) => MockEngine.create(dev));
  return enginePromise;
}

function viaJson<T>(value: T): T {
  return value === undefined ? (null as T) : (JSON.parse(JSON.stringify(value)) as T);
}

export function createMockInvoker(): Invoker {
  return async (command, args) => {
    const engine = await getMockEngine();
    // Pequeña pausa asíncrona, como una llamada IPC real.
    await Promise.resolve();
    return viaJson(engine.dispatch(command, viaJson(args ?? {})));
  };
}

/** Crea perfiles de ejemplo con historial y devuelve el id del principal. */
export async function seedDemoData(): Promise<string> {
  const engine = await getMockEngine();
  return seedDemo(engine);
}

/** Borra todos los datos del modo demo. */
export async function resetDemoData(): Promise<void> {
  clearDb();
  const engine = await getMockEngine();
  engine.reload();
}

/** Solo para tests: descarta el motor (y su caché). */
export function resetMockEngine(): void {
  enginePromise = null;
}
