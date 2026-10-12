#!/usr/bin/env node
// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/**
 * OpoTAI · capturas de pantalla de la interfaz en modo demo (navegador).
 *
 * Uso (con `pnpm dev` arrancado en el puerto 1420):
 *   node scripts/screenshots.mjs [--out ../docs/capturas] [--only inicio,examen] [--scale 1]
 *                                [--base http://localhost:1420] [--datos ejemplo]
 *
 * Usa Chromium headless de Playwright (`playwright-core`, sin descargar navegadores):
 * ruta por defecto /opt/pw-browsers/chromium-1194/chrome-linux/chrome o CHROME_PATH.
 * Autor: Eric Valls Gramunt.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, cur, i, all) => {
    if (cur.startsWith("--")) acc.push([cur.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : "1"]);
    return acc;
  }, []),
);
const BASE = args.base ?? "http://localhost:1420";
const OUT = resolve(here, args.out ?? "../../docs/capturas");
const ONLY = args.only ? new Set(args.only.split(",")) : null;
const SCALE = Number(args.scale ?? 1);
const QUERY = args.datos ? `?datos=${args.datos}` : "";
const EXECUTABLE = process.env.CHROME_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const W = Number(args.width ?? 1440);
const H = Number(args.height ?? 900);

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ executablePath: EXECUTABLE, args: ["--disable-gpu", "--font-render-hinting=none"] });
const want = (name) => !ONLY || ONLY.has(name);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function newPage(scheme) {
  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: SCALE,
    colorScheme: scheme,
    reducedMotion: "reduce",
    locale: "es-ES",
    timezoneId: "Europe/Madrid",
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => console.error("  [pageerror]", e.message));
  page.on("console", (m) => {
    if (m.type() === "error") console.error("  [console]", m.text());
  });
  return { context, page };
}

async function go(page, hash, wait = 450) {
  await page.goto(`${BASE}/${QUERY}#${hash}`);
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await sleep(wait);
}

async function shot(page, name, opts = {}) {
  if (!want(name)) return;
  // Ratón fuera de cualquier elemento para que no aparezcan tooltips ni estados hover.
  await page.mouse.move(Math.round(W * 0.6), 1);
  await sleep(120);
  const path = resolve(OUT, `${name}.png`);
  await page.screenshot({ path, fullPage: false, ...opts });
  console.log("✓", name);
}

/** Crea los datos de ejemplo y entra con el perfil principal. */
async function seed(page) {
  await go(page, "/perfiles", 600);
  const button = page.getByRole("button", { name: /datos de ejemplo/i });
  if (await button.count()) {
    await button.click();
    await page.waitForURL(/#\/(sorteo|inicio)/, { timeout: 20000 });
    await sleep(700);
  }
}

/** Abre los resultados de un intento sembrado (enlace «Ver detalle» del inicio). */
async function openSeededResult(page) {
  await go(page, "/inicio", 900);
  const detail = page.getByRole("link", { name: /ver detalle/i });
  if (!(await detail.count())) return false;
  await detail.first().click();
  await page.waitForURL(/#\/resultados\//, { timeout: 15000 });
  await sleep(1400);
  return true;
}

async function scrollTo(page, selector, offset = 24) {
  await page.evaluate(
    ([sel, off]) => {
      const el = document.querySelector(sel);
      if (!el) return;
      el.scrollIntoView({ block: "start" });
      let node = el.parentElement;
      while (node && node.scrollHeight <= node.clientHeight) node = node.parentElement;
      if (node) node.scrollTop -= off;
    },
    [selector, offset],
  );
  await sleep(500);
}

const scenes = [
  ["bienvenida", async () => {
    const { context, page } = await newPage("dark");
    await go(page, "/perfiles", 700);
    await shot(page, "bienvenida");
    await context.close();
  }],
  ["demo", async () => {
    const { context, page } = await newPage("dark");
    await seed(page);
    if (/sorteo/.test(page.url())) await shot(page, "sorteo");
    const later = page.getByRole("button", { name: /ahora no/i });
    if (await later.count()) await later.click();
    await sleep(600);
    await shot(page, "inicio");
    if (want("esquina")) {
      await shot(page, "esquina", { clip: { x: W - 420, y: H - 300, width: 420, height: 300 } });
    }
    for (const [name, hash] of [
      ["teoria", "/teoria"],
      ["teoria-tema", "/teoria/I.1"],
      ["simulacro", "/simulacro"],
      ["oficiales", "/oficiales"],
      ["temas", "/temas"],
      ["supuestos", "/supuestos"],
      ["repaso", "/repaso"],
      ["estadisticas", "/estadisticas"],
      ["calculadora", "/calculadora"],
      ["ajustes", "/ajustes"],
      ["acerca-de", "/ajustes/acerca-de"],
    ]) {
      if (!want(name)) continue;
      await go(page, hash, name === "estadisticas" ? 3500 : 1000);
      await shot(page, name);
    }
    if (["apoyo", "apoyo-autor"].some(want)) {
      await go(page, "/inicio", 800);
      await page.getByRole("button", { name: /donación|cerveza/i }).first().click();
      await sleep(900);
      await shot(page, "apoyo");
      if (want("apoyo-autor")) {
        await page.evaluate(() => document.getElementById("sobre-el-autor")?.scrollIntoView({ block: "start" }));
        await sleep(500);
        await shot(page, "apoyo-autor");
      }
      await page.keyboard.press("Escape");
      await sleep(400);
    }
    if (["resultados", "resultados-posibilidades", "resultados-revision"].some(want) && (await openSeededResult(page))) {
      await shot(page, "resultados");
      await scrollTo(page, "#posibilidades", 70);
      await shot(page, "resultados-posibilidades");
      await scrollTo(page, "#revision", 12);
      await shot(page, "resultados-revision");
    }
    if (want("pregunta-imagen")) {
      await go(page, "/temas?temas=III.1", 1000);
      await page.getByRole("button", { name: /empezar test/i }).click();
      await page.waitForURL(/#\/examen\//, { timeout: 15000 });
      await sleep(900);
      for (let i = 0; i < 25; i++) {
        const withImage = await page.locator('[role="radiogroup"] img').count();
        if (withImage > 0) break;
        await page.keyboard.press("ArrowRight");
        await sleep(250);
      }
      await sleep(500);
      await shot(page, "pregunta-imagen");
      const abandon = page.getByRole("button", { name: /salir|cerrar/i }).first();
      if (await abandon.count()) await abandon.click().catch(() => undefined);
      await sleep(400);
    }
    if (["examen", "examen-supuesto", "entrega"].some(want)) {
      await go(page, "/simulacro", 900);
      await page.getByRole("button", { name: /empezar simulacro/i }).click();
      const discard = page.getByRole("button", { name: /empezar el nuevo/i });
      await sleep(600);
      if (await discard.count()) await discard.click();
      await page.waitForURL(/#\/examen\//, { timeout: 15000 });
      await sleep(900);
      for (const key of ["2", "ArrowRight", "3", "ArrowRight", "1", "f", "ArrowRight", "4", "ArrowRight", "2", "ArrowRight", "ArrowRight", "3", "ArrowRight"]) {
        await page.keyboard.press(key);
        await sleep(140);
      }
      await sleep(500);
      await shot(page, "examen");
      const tab2 = page.getByRole("tab", { name: /2\.ª parte/ });
      if (await tab2.count()) {
        await tab2.click();
        await sleep(500);
        await page.keyboard.press("2");
        await sleep(200);
        await page.keyboard.press("ArrowRight");
        await sleep(500);
        await shot(page, "examen-supuesto");
      }
      await page.keyboard.press("Control+Enter");
      await sleep(600);
      await shot(page, "entrega");
    }
    await context.close();
  }],
  ["claro", async () => {
    if (!["inicio-claro", "resultados-claro", "estadisticas-claro", "teoria-tema-claro"].some(want)) return;
    const { context, page } = await newPage("light");
    await seed(page);
    const later = page.getByRole("button", { name: /ahora no/i });
    if (await later.count()) await later.click();
    await sleep(600);
    await shot(page, "inicio-claro");
    if (want("estadisticas-claro")) {
      await go(page, "/estadisticas", 3500);
      await shot(page, "estadisticas-claro");
    }
    if (want("teoria-tema-claro")) {
      await go(page, "/teoria/I.1", 1000);
      await shot(page, "teoria-tema-claro");
    }
    if (want("resultados-claro") && (await openSeededResult(page))) await shot(page, "resultados-claro");
    await context.close();
  }],
];

for (const [name, run] of scenes) {
  try {
    await run();
  } catch (error) {
    console.error(`✗ ${name}:`, error.message);
  }
}
await browser.close();
