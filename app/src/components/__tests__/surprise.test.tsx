// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { setInvoker } from "@/api/client";
import type { Profile, RandomDraw, Settings } from "@/api/types";
import { useSession } from "@/store/session";
import SurprisePage from "@/pages/SurprisePage";

const profile: Profile = { id: "p1", name: "Alex", color: "#7c3aed", avatar: null, created_at: "2026-10-01T08:00:00Z", last_active_at: null };
const settings = { random_exam_on_startup: true, exam_feedback: "end" } as Settings;
const draw: RandomDraw = {
  spec: { type: "numbered", number: 3, feedback: "end" },
  kind: "numbered",
  title: "Simulacro OpoTAI n.º 3",
  subtitle: "80 preguntas + supuesto práctico · 120 min",
  description: "Formato completo del examen vigente.",
  question_count: 80,
  case_count: 2,
  duration_minutes: 120,
  already_done: false,
  pool_size: 12,
};

/** Backend falso: guarda los ajustes y registra la especificación con la que se empieza. */
function fakeBackend() {
  return vi.fn(async (cmd: string, args?: Record<string, unknown>) => {
    if (cmd === "draw_random_exam") return draw;
    if (cmd === "update_settings") return args?.settings ?? null;
    if (cmd === "start_exam") throw { code: "internal", message: "fin de la prueba" };
    return null;
  });
}

afterEach(() => {
  cleanup();
  setInvoker(null);
  useSession.setState({ profile: null, settings: null, draws: {} });
});

describe("Simulacro sorpresa", () => {
  it("presenta el sorteo con solo «Comenzar simulacro» y «Ahora no», sin volver a sortear", async () => {
    const invoker = vi.fn(async (cmd: string) => (cmd === "draw_random_exam" ? draw : null));
    setInvoker(invoker);
    useSession.setState({ profile, settings, draws: {} });
    render(
      <MemoryRouter>
        <SurprisePage />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Simulacro OpoTAI n.º 3")).toBeInTheDocument();
    expect(screen.getByText(/Tu simulacro de hoy/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: /comenzar simulacro/i })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /ahora no/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /sortear|otro|cambiar/i })).toBeNull();
    // Un único sorteo aunque el componente se vuelva a montar en la misma sesión.
    await useSession.getState().ensureDraw("p1");
    expect(invoker.mock.calls.filter(([c]) => c === "draw_random_exam")).toHaveLength(1);
  });

  it("modo aprendizaje: arranca el examen sorteado sin límite de tiempo y con corrección inmediata", async () => {
    const invoker = fakeBackend();
    setInvoker(invoker);
    useSession.setState({ profile, settings, draws: {} });
    render(
      <MemoryRouter>
        <SurprisePage />
      </MemoryRouter>,
    );
    const group = await screen.findByRole("radiogroup", { name: /cómo quieres hacerlo/i });
    expect(group).toBeInTheDocument();
    const real = screen.getByRole("radio", { name: /examen real/i });
    const learning = screen.getByRole("radio", { name: /aprendizaje/i });
    expect(real).toHaveAttribute("aria-checked", "true");
    expect(real).toHaveAccessibleDescription(/cronómetro oficial \(120 min\)/i);
    expect(learning).toHaveAccessibleDescription(/sin límite de tiempo/i);

    fireEvent.click(learning);
    await waitFor(() => expect(screen.getByRole("radio", { name: /aprendizaje/i })).toHaveAttribute("aria-checked", "true"));
    // La elección se recuerda en los ajustes del perfil.
    expect(invoker).toHaveBeenCalledWith("update_settings", expect.objectContaining({ settings: expect.objectContaining({ exam_feedback: "immediate" }) }));

    fireEvent.click(screen.getByRole("button", { name: /comenzar simulacro/i }));
    await waitFor(() => expect(invoker.mock.calls.some(([c]) => c === "start_exam")).toBe(true));
    const [, args] = invoker.mock.calls.find(([c]) => c === "start_exam")!;
    expect(args).toMatchObject({ profile_id: "p1", spec: { type: "numbered", number: 3, timed: false, feedback: "immediate" } });
  });

  it("modo examen real (con el teclado): cronómetro oficial y corrección al entregar", async () => {
    const invoker = fakeBackend();
    setInvoker(invoker);
    useSession.setState({ profile, settings: { ...settings, exam_feedback: "immediate" }, draws: {} });
    render(
      <MemoryRouter>
        <SurprisePage />
      </MemoryRouter>,
    );
    const learning = await screen.findByRole("radio", { name: /aprendizaje/i });
    expect(learning).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(learning, { key: "ArrowRight" });
    await waitFor(() => expect(screen.getByRole("radio", { name: /examen real/i })).toHaveAttribute("aria-checked", "true"));
    fireEvent.click(screen.getByRole("button", { name: /comenzar simulacro/i }));
    await waitFor(() => expect(invoker.mock.calls.some(([c]) => c === "start_exam")).toBe(true));
    const [, args] = invoker.mock.calls.find(([c]) => c === "start_exam")!;
    expect(args).toMatchObject({ spec: { type: "numbered", number: 3, timed: true, feedback: "end" } });
  });
});
