/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";

// Configuración pensada para Tauri 2: puerto fijo, sin limpiar la consola y
// variables de entorno TAURI_* expuestas al frontend.
const host = process.env.TAURI_DEV_HOST;

const DATA_DIR = fileURLToPath(new URL("../data", import.meta.url));
/** Versión de la app (única fuente: app/package.json, sincronizada con Cargo.toml y tauri.conf.json). */
const APP_VERSION = (JSON.parse(readFileSync(fileURLToPath(new URL("./package.json", import.meta.url)), "utf8")) as { version: string }).version;

const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function readJson(path: string): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

/**
 * Solo en `pnpm dev` (modo demo en navegador): expone los bancos reales de
 * `data/banks/oficiales/*.json`, los metadatos de `data/meta` y la teoría (con
 * sus diagramas de `data/teoria/diagramas`) para que el
 * backend simulado los use si existen. No interviene en `vite build`, así que
 * el build de producción nunca empaqueta esos JSON.
 */
function opotaiDevData(): Plugin {
  return {
    name: "opotai-dev-data",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__opotai/dev-data", (req, res) => {
        const path = decodeURIComponent((req.url ?? "/").split("?")[0] ?? "/");
        if (path === "/index.json") {
          const dir = join(DATA_DIR, "banks", "oficiales");
          const banks = existsSync(dir)
            ? readdirSync(dir)
                .filter((f) => f.endsWith(".json"))
                .sort()
                .map((f) => readJson(join(dir, f)))
                .filter(Boolean)
            : [];
          const convocatorias = readJson(join(DATA_DIR, "meta", "convocatorias.json")) as {
            convocatorias?: { destinations_dataset?: string | null }[];
          } | null;
          const destinos: Record<string, unknown> = {};
          for (const c of convocatorias?.convocatorias ?? []) {
            const ds = c.destinations_dataset;
            if (ds && !destinos[ds] && /^destinos\/[\w.-]+\.json$/.test(ds)) destinos[ds] = readJson(join(DATA_DIR, "meta", ds));
          }
          const teoriaIndex = readJson(join(DATA_DIR, "teoria", "index.json")) as {
            topics?: { topic?: string; file?: string }[];
          } | null;
          const contents: Record<string, string> = {};
          for (const t of teoriaIndex?.topics ?? []) {
            const file = t.file ?? (t.topic ? `${t.topic}.md` : null);
            if (!t.topic || !file || !/^[\w.-]+\.md$/.test(file)) continue;
            try {
              contents[t.topic] = readFileSync(join(DATA_DIR, "teoria", file), "utf8");
            } catch {
              // tema sin fichero todavía
            }
          }
          const payload = {
            banks,
            temario: readJson(join(DATA_DIR, "meta", "temario.json")),
            scoring: readJson(join(DATA_DIR, "meta", "scoring.json")),
            convocatorias,
            localidades: readJson(join(DATA_DIR, "meta", "localidades.json")),
            destinos,
            teoria: teoriaIndex ? { index: teoriaIndex, contents } : null,
            license: (() => {
              try {
                return readFileSync(join(DATA_DIR, "..", "LICENSE"), "utf8");
              } catch {
                return null;
              }
            })(),
          };
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(payload));
          return;
        }
        if (path.startsWith("/asset/") || path.startsWith("/teoria/diagramas/")) {
          const theory = path.startsWith("/teoria/");
          const base = theory ? resolve(DATA_DIR, "teoria", "diagramas") : resolve(DATA_DIR, "banks");
          const file = resolve(base, path.slice(theory ? "/teoria/diagramas/".length : "/asset/".length));
          if (!file.startsWith(base + sep) || !existsSync(file) || !statSync(file).isFile()) {
            res.statusCode = 404;
            res.end();
            return;
          }
          res.setHeader("Content-Type", IMAGE_TYPES[extname(file).toLowerCase()] ?? "application/octet-stream");
          res.end(readFileSync(file));
          return;
        }
        res.statusCode = 404;
        res.end();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), opotaiDevData()],
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_ENV_*"],
  build: {
    target: "es2022",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
