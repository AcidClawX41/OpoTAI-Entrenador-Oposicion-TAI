// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setInvoker } from "@/api/client";
import type { AppInfo } from "@/api/types";
import { AUTHOR_PROFILE, DONATION_PLATFORMS } from "@/content/support";
import { useUi } from "@/store/ui";
import { AboutSection } from "@/components/settings/AboutSection";
import { SupportCorner, SupportNavItem, SupportSidebarButton } from "@/components/support/SupportCorner";
import { SupportDialog } from "@/components/support/SupportDialog";
import { OptionList } from "@/components/exam/OptionList";

const openExternal = vi.fn(async (_url: string) => undefined);
vi.mock("@/lib/platform", () => ({
  isTauri: () => false,
  openExternal: (url: string) => openExternal(url),
  hostOf: (url: string) => url,
}));

const appInfo: AppInfo = {
  name: "OpoTAI",
  version: "1.0.0",
  git_commit: "abc1234",
  author: "Eric Valls Gramunt",
  copyright: "© 2026 Eric Valls Gramunt",
  license: "GPL-3.0-or-later",
  license_name: "GNU General Public License v3.0 o posterior",
  repository: "https://github.com/AcidClawX41/Programa-Oposiciones-TAI",
  data_updated: "2026-10-01",
  banks: 12,
  questions: 1275,
  questions_with_explanation: 0,
  official_exams: 11,
  theory_topics: 4,
  db_path: "/tmp/opotai.sqlite",
};

beforeEach(() => {
  openExternal.mockClear();
  useUi.setState({ supportOpen: false });
});
afterEach(() => {
  cleanup();
  setInvoker(null);
});

describe("Acerca de", () => {
  it("muestra versión, licencia y autor, y carga el texto de la licencia", async () => {
    const invoker = vi.fn(async (cmd: string) => (cmd === "get_license_text" ? "GNU GENERAL PUBLIC LICENSE\nVersion 3, 29 June 2007" : null));
    setInvoker(invoker);
    render(<AboutSection appInfo={appInfo} />);
    expect(screen.getByTestId("about-version")).toHaveTextContent("v1.0.0");
    expect(screen.getAllByText(/GPL-3\.0-or-later/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Eric Valls Gramunt/).length).toBeGreaterThan(0);
    expect(screen.getByText("abc1234")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /ver la licencia/i }));
    await waitFor(() => expect(screen.getByTestId("license-text")).toHaveTextContent("GNU GENERAL PUBLIC LICENSE"));
    expect(invoker).toHaveBeenCalledWith("get_license_text", undefined);
  });
});

describe("Apoyo al proyecto", () => {
  it("la esquina abre el diálogo y Escape lo cierra", async () => {
    render(
      <>
        <SupportCorner />
        <SupportDialog />
      </>,
    );
    fireEvent.click(screen.getByRole("button", { name: /donación|café/i }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toBeInTheDocument();
    act(() => {
      fireEvent.keyDown(document, { key: "Escape" });
    });
    expect(useUi.getState().supportOpen).toBe(false);
  });

  it("la entrada «Apoyar el proyecto» y la pastilla de la barra lateral abren el diálogo", async () => {
    render(
      <>
        <SupportNavItem collapsed={false} />
        <SupportSidebarButton collapsed={false} />
        <SupportDialog />
      </>,
    );
    expect(screen.getByText("Invítame a un café o dona")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /apoyar el proyecto/i }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    act(() => useUi.setState({ supportOpen: false }));
    fireEvent.click(screen.getByRole("button", { name: /invítame a un café o haz una donación/i }));
    expect(useUi.getState().supportOpen).toBe(true);
  });

  it("los botones de donación van primero, con su llamada a la acción y la URL visible", async () => {
    useUi.setState({ supportOpen: true });
    render(<SupportDialog />);
    const dialog = await screen.findByRole("dialog");
    const panel = within(dialog).getByRole("region", { name: /plataformas de donación/i });
    const links = within(panel).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("data-platform"))).toEqual(["paypal", "kofi", "github"]);
    const expected: [string, string][] = [
      ["Donar con PayPal", "paypal.me/EricValls"],
      ["Invitar en Ko-fi", "ko-fi.com/ericdev"],
      ["Patrocinar en GitHub", "github.com/sponsors/AcidClawX41"],
    ];
    for (const [cta, display] of expected) {
      expect(within(panel).getByText(cta)).toBeInTheDocument();
      expect(within(panel).getByText(display)).toBeInTheDocument();
    }
  });

  it("bajo el nombre del autor hay un enlace a su LinkedIn que se abre en el navegador", async () => {
    useUi.setState({ supportOpen: true });
    render(<SupportDialog />);
    const dialog = await screen.findByRole("dialog");
    const links = within(dialog).getAllByRole("link", { name: /perfil de linkedin de eric valls gramunt/i });
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toHaveAttribute("href", "https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7");
    // El del pie, junto a la firma, se ve sin desplazarse junto a los botones de donación.
    const signature = within(dialog).getByText(/— Eric Valls Gramunt/);
    expect(signature.nextElementSibling).toBe(links.find((l) => signature.parentElement?.contains(l)) ?? null);
    fireEvent.click(links[0]!);
    expect(openExternal).toHaveBeenLastCalledWith("https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7");
  });

  it("enlaza las 3 plataformas y el LinkedIn exacto del autor", async () => {
    useUi.setState({ supportOpen: true });
    render(<SupportDialog />);
    const dialog = await screen.findByRole("dialog");
    expect(DONATION_PLATFORMS).toHaveLength(3);
    for (const p of DONATION_PLATFORMS) {
      const link = within(dialog)
        .getAllByRole("link")
        .find((a) => a.getAttribute("href") === p.url);
      expect(link, p.url).toBeTruthy();
      fireEvent.click(link!);
      expect(openExternal).toHaveBeenLastCalledWith(p.url);
    }
    expect(AUTHOR_PROFILE.linkedin.url).toBe("https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7");
    const linkedin = within(dialog)
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === AUTHOR_PROFILE.linkedin.url);
    expect(linkedin).toBeTruthy();
    fireEvent.click(linkedin!);
    expect(openExternal).toHaveBeenLastCalledWith("https://www.linkedin.com/in/eric-valls-gramunt-9238b3b7");
  });
});

describe("Opciones de respuesta", () => {
  it("al pulsar se marca y al pulsar de nuevo se avisa para dejar en blanco", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<OptionList questionId="q1" options={["Uno", "Dos", "Tres", "Cuatro"]} choice={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("radio", { name: /Opción B/ }));
    expect(onSelect).toHaveBeenLastCalledWith("B");
    rerender(<OptionList questionId="q1" options={["Uno", "Dos", "Tres", "Cuatro"]} choice="B" onSelect={onSelect} />);
    expect(screen.getByRole("radio", { name: /Opción B/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Opción B/ }));
    expect(onSelect).toHaveBeenLastCalledWith("B");
  });

  it("en revisión no es interactiva y señala la correcta", () => {
    const onSelect = vi.fn();
    render(<OptionList questionId="q2" options={["Uno", "Dos", "Tres", "Cuatro"]} choice={null} onSelect={onSelect} reveal={{ correct: "C", chosen: "A" }} />);
    fireEvent.click(screen.getByRole("radio", { name: /Opción C \(correcta\)/ }));
    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole("radio", { name: /Opción A \(tu respuesta, incorrecta\)/ })).toBeInTheDocument();
  });
});
