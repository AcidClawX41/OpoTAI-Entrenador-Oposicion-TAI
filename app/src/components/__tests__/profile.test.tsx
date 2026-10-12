// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { useState } from "react";
import { setInvoker } from "@/api/client";
import type { AppInfo, Profile, Settings } from "@/api/types";
import { useSession } from "@/store/session";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfileForm, type ProfileDraft } from "@/components/profile/ProfileForm";
import SettingsPage from "@/pages/SettingsPage";

afterEach(() => {
  cleanup();
  setInvoker(null);
  useSession.setState({ profile: null, settings: null, appInfo: null, profiles: [] });
});

const PIXEL = "data:image/webp;base64,UklGRhYAAABXRUJQVlA4TAoAAAAvAAAAAEX/I/of";

describe("avatar del perfil", () => {
  it("imagen propia: <img> redondo, recortado al centro, sin texto alternativo ni arrastre", () => {
    const { container } = render(<ProfileAvatar profile={{ name: "Alex", color: "#7c3aed", avatar: PIXEL }} size="sm" />);
    const img = container.querySelector("img")!;
    expect(img).toHaveAttribute("src", PIXEL);
    expect(img).toHaveAttribute("alt", "");
    expect(img).toHaveAttribute("draggable", "false");
    expect(img.className).toContain("object-cover");
    expect(container.firstElementChild).toHaveClass("rounded-full");
  });

  it("vista grande: la imagen completa con su proporción", () => {
    const { container } = render(<ProfileAvatar profile={{ name: "Alex", color: "#7c3aed", avatar: PIXEL }} size="xl" shape="full" />);
    expect(container.querySelector("img")!.className).toContain("object-contain");
    expect(container.firstElementChild).toHaveClass("rounded-2xl");
  });

  it("emoji o, si no hay, iniciales", () => {
    const { container, rerender } = render(<ProfileAvatar profile={{ name: "Alex Moreno", color: "#7c3aed", avatar: "🦉" }} />);
    expect(container).toHaveTextContent("🦉");
    expect(container.querySelector("img")).toBeNull();
    rerender(<ProfileAvatar profile={{ name: "Alex Moreno", color: "#7c3aed", avatar: null }} />);
    expect(container).toHaveTextContent("AM");
  });
});

describe("nombre o alias del perfil", () => {
  function Harness() {
    const [draft, setDraft] = useState<ProfileDraft>({ name: "", color: "#7c3aed", avatar: null });
    return <ProfileForm value={draft} onChange={setDraft} />;
  }

  it("pide un nombre o alias de hasta 30 caracteres, sin datos sensibles, y ofrece subir una imagen", () => {
    render(<Harness />);
    const input = screen.getByLabelText("Nombre o alias");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("maxLength", "30");
    expect(input).toHaveAccessibleDescription(/Solo sirve para saludarte y distinguir perfiles en este equipo\. Puedes usar un alias; no escribas datos personales sensibles\./);
    fireEvent.change(input, { target: { value: "x".repeat(40) } });
    expect(input).toHaveValue("x".repeat(30));
    expect(screen.getByRole("button", { name: /subir una imagen/i })).toBeInTheDocument();
    expect(screen.getByText(/hasta 30 MB; se guarda optimizada, sin metadatos y solo en este equipo/)).toBeInTheDocument();
  });

  it("rechaza un SVG con un mensaje amable", () => {
    const { container } = render(<Harness />);
    const file = new File(["<svg/>"], "logo.svg", { type: "image/svg+xml" });
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    expect(screen.getByRole("alert")).toHaveTextContent(/SVG no se admiten/);
  });
});

describe("Ajustes · Privacidad y datos", () => {
  const profile: Profile = { id: "p1", name: "Alex", color: "#7c3aed", avatar: null, created_at: "2026-10-01T08:00:00Z", last_active_at: null };
  const appInfo = { db_path: "/home/alex/.local/share/opotai/opotai.sqlite" } as AppInfo;

  it("explica que todo se queda en el equipo, muestra la ruta y borra el perfil con confirmación", async () => {
    const invoker = vi.fn(async () => null);
    setInvoker(invoker);
    useSession.setState({ profile, profiles: [profile], settings: { theme: "dark" } as Settings, appInfo });
    render(
      <MemoryRouter initialEntries={["/ajustes/privacidad"]}>
        <Routes>
          <Route path="/ajustes/:section" element={<SettingsPage />} />
          <Route path="/perfiles" element={<p>Perfiles</p>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText("Todo se guarda solo en este equipo")).toBeInTheDocument();
    expect(screen.getByText(/Sin cuentas, servidores, analítica ni telemetría/)).toBeInTheDocument();
    expect(screen.getByText(/se rigen por la política de privacidad de cada servicio/)).toBeInTheDocument();
    expect(screen.getByTestId("db-path")).toHaveTextContent(appInfo.db_path);
    fireEvent.click(screen.getByRole("button", { name: /borrar este perfil y todos sus datos/i }));
    const dialog = await screen.findByRole("dialog");
    fireEvent.click(within(dialog).getByRole("button", { name: /borrar definitivamente/i }));
    await waitFor(() => expect(invoker).toHaveBeenCalledWith("delete_profile", { profile_id: "p1" }));
    expect(await screen.findByText("Perfiles")).toBeInTheDocument();
  });
});
