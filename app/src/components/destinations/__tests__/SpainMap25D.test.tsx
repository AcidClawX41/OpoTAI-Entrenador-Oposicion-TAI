// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ProvinceAvailability } from "@/api/types";
import { GEO } from "../geo";
import { SpainMap25D } from "../SpainMap25D";

const row = (province: string, posts: number, available: number, likely: number): ProvinceAvailability => ({
  province,
  posts,
  available_posts: available,
  p_available: available > 0 ? 1 : 0,
  p_likely: likely,
  last_order: 1200,
});

const PROVINCES: ProvinceAvailability[] = [
  row("Madrid", 1352, 1340, 0.82),
  row("Barcelona", 28, 27, 0.04),
  row("Valencia", 21, 20, 0.03),
  row("Illes Balears", 15, 15, 0.02),
  row("Zaragoza", 14, 14, 0.02),
  row("Murcia", 14, 13, 0.01),
  row("Sevilla", 11, 11, 0.01),
  row("Bizkaia", 10, 10, 0.01),
  row("Toledo", 10, 9, 0),
  row("Las Palmas", 6, 6, 0),
  row("Santa Cruz de Tenerife", 5, 5, 0),
  row("Ceuta", 2, 2, 0),
];

const PIN = { locality: "Madrid", province: "Madrid", label: "Más probable: Madrid" };
const texts = (root: ParentNode) => [...root.querySelectorAll("svg text")].map((t) => t.textContent ?? "");
const seats = GEO.capitals.filter((c) => c.region_capital).map((c) => c.name);
const provincial = GEO.capitals.filter((c) => !c.region_capital).map((c) => c.name);

afterEach(cleanup);

describe("SpainMap25D", () => {
  it("rotula todas las sedes autonómicas a zoom 1, la mayoría de capitales y el pin", () => {
    const { container } = render(<SpainMap25D provinces={PROVINCES} metric="available" pin={PIN} />);
    const shown = texts(container);
    for (const name of seats) expect(shown, name).toContain(name);
    expect(provincial.filter((n) => shown.includes(n)).length).toBeGreaterThanOrEqual(provincial.length * 0.8);
    expect(shown).toContain("Más probable: Madrid");
    // Cifra de la provincia con más plazas libres sobre su columna.
    expect(shown).toContain("1.340/1.352");
  });

  it("es accesible: imagen con título y descripción, grupo enfocable y botones de zoom con nombre", () => {
    render(<SpainMap25D provinces={PROVINCES} metric="posts" />);
    const img = screen.getByRole("img", { name: /mapa de españa/i });
    expect(img).toHaveAccessibleDescription(/sedes autonómicas se marcan con una estrella/i);
    expect(img).toHaveAccessibleDescription(/Madrid \(1\.352\)/);
    const map = screen.getByRole("group", { name: /mapa de destinos/i });
    expect(map).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("button", { name: "Acercar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Alejar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Restablecer vista" })).toBeDisabled();
    expect(screen.getByText(/IGN \(CC BY 4\.0\)/)).toBeInTheDocument();
  });

  it("cambia entre 2.5D y plano y entre todas las capitales, solo las autonómicas o ninguna", () => {
    const { container } = render(<SpainMap25D provinces={PROVINCES} metric="available" />);
    expect(container.querySelectorAll("svg polygon").length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("radio", { name: "Plano" }));
    expect(container.querySelectorAll("svg polygon")).toHaveLength(0);
    expect(container.querySelectorAll("svg circle").length).toBeGreaterThan(PROVINCES.length);

    fireEvent.click(screen.getByRole("radio", { name: "Solo autonómicas" }));
    let shown = texts(container);
    for (const name of seats) expect(shown).toContain(name);
    expect(provincial.some((n) => shown.includes(n))).toBe(false);

    fireEvent.click(screen.getByRole("radio", { name: "Ninguno" }));
    shown = texts(container);
    expect([...seats, ...provincial].some((n) => shown.includes(n))).toBe(false);
    // Las cifras siguen visibles.
    expect(shown).toContain("1.340/1.352");

    // Se vuelve a la vista por defecto para no afectar a otros tests (la elección se recuerda).
    fireEvent.click(screen.getByRole("radio", { name: "Todas las capitales" }));
    fireEvent.click(screen.getByRole("radio", { name: "2.5D" }));
  });

  it("al acercar aparecen todas las capitales", async () => {
    const { container } = render(<SpainMap25D provinces={PROVINCES} metric="available" pin={PIN} />);
    const map = screen.getByRole("group", { name: /mapa de destinos/i });
    fireEvent.keyDown(map, { key: "+" });
    await waitFor(() => expect(container.querySelector("svg > g")?.getAttribute("transform")).toContain("scale(1.5)"));
    fireEvent.keyDown(map, { key: "+" });
    await waitFor(() => expect(container.querySelector("svg > g")?.getAttribute("transform")).toContain("scale(2.25)"));
    const shown = texts(container);
    for (const name of [...seats, ...provincial]) expect(shown, name).toContain(name);
  });

  it("acerca y restablece con el teclado y los botones", async () => {
    const { container } = render(<SpainMap25D provinces={PROVINCES} metric="posts" />);
    const map = screen.getByRole("group", { name: /mapa de destinos/i });
    const zoomed = () => container.querySelector("svg > g")?.getAttribute("transform") ?? "";
    expect(zoomed()).toContain("scale(1)");
    fireEvent.keyDown(map, { key: "+" });
    await waitFor(() => expect(zoomed()).toContain("scale(1.5)"));
    expect(screen.getByRole("button", { name: "Alejar" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Restablecer vista" }));
    await waitFor(() => expect(zoomed()).toContain("scale(1)"));
  });
});
