// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { Profile } from "@/api/types";
import { useSession } from "@/store/session";
import { RequireProfile } from "@/app/Root";

const OTHER: Profile = { id: "p2", name: "Marcos", color: "#e11d48", avatar: null, created_at: "2026-10-12T06:00:00Z", last_active_at: null };

afterEach(() => {
  cleanup();
  useSession.setState({ profile: null, settings: null, profiles: [], profileChosen: false });
});

function renderGuard() {
  render(
    <MemoryRouter initialEntries={["/inicio"]}>
      <Routes>
        <Route element={<RequireProfile />}>
          <Route path="/inicio" element={<p>inicio</p>} />
        </Route>
        <Route path="/perfiles" element={<p>selector de perfiles</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RequireProfile", () => {
  it("tras borrar el perfil activo no entra solo en el perfil que queda: va al selector", () => {
    // Ya se había elegido un perfil en esta sesión (el borrado) y queda otro.
    useSession.setState({ profile: null, profiles: [OTHER], profileChosen: true });
    renderGuard();
    expect(screen.getByText("selector de perfiles")).toBeInTheDocument();
  });
});
