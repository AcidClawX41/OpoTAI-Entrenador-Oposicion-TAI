// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import { rewriteAssetRefs, rewriteDiagramRefs } from "./assets";
import { Registry } from "./registry";

describe("imágenes en Markdown (como el núcleo)", () => {
  it("reescribe solo las referencias assets/… resolubles", () => {
    const md = 'Mira ![Esquema](assets/a/b.png "título") y ![x](https://ejemplo.es/i.png) y ![y](assets/no.png)';
    const out = rewriteAssetRefs(md, (p) => (p === "assets/a/b.png" ? "data:image/png;base64,AAAA" : null));
    expect(out).toBe('Mira ![Esquema](data:image/png;base64,AAAA "título") y ![x](https://ejemplo.es/i.png) y ![y](assets/no.png)');
  });

  it("reescribe los diagramas de la teoría (diagramas/…)", () => {
    const md = "![Capas OSI](diagramas/IV.7-osi-tcpip.svg)\n\n![b](assets/a/b.png) ![n](diagramas/IV.7-no.svg)";
    const out = rewriteDiagramRefs(md, (p) => (p === "diagramas/IV.7-osi-tcpip.svg" ? "/__opotai/dev-data/teoria/diagramas/IV.7-osi-tcpip.svg" : null));
    expect(out).toBe("![Capas OSI](/__opotai/dev-data/teoria/diagramas/IV.7-osi-tcpip.svg)\n\n![b](assets/a/b.png) ![n](diagramas/IV.7-no.svg)");
  });

  it("el banco de ejemplo trae imágenes en enunciados y en opciones", () => {
    const reg = new Registry(null);
    const all = reg.allQuestions();
    const withOptionImages = all.find((e) => e.question.options.every((o) => o.includes("](data:image/svg+xml;base64,")));
    expect(withOptionImages).toBeDefined();
    const network = all.find((e) => e.question.text.includes("![Esquema"));
    expect(network?.question.text).toMatch(/\]\(data:image\/svg\+xml;base64,/);
    expect(network?.question.media[0]?.data_url).toMatch(/^data:image\/svg\+xml;base64,/);
  });
});
