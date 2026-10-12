// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/store/session";
import { BootError, Splash } from "@/components/layout/Splash";
import { SupportCorner } from "@/components/support/SupportCorner";

/**
 * Arranque de la sesión y elementos globales. La pastilla flotante de apoyo solo aparece en la
 * pantalla de perfiles: con la barra lateral, el botón de apoyo vive en su pie (así no tapa nada),
 * y en el examen y el sorteo no se muestra.
 */
export function Root() {
  const status = useSession((s) => s.status);
  const error = useSession((s) => s.error);
  const boot = useSession((s) => s.boot);
  const { pathname } = useLocation();
  const floatingSupport = pathname.startsWith("/perfiles");

  useEffect(() => {
    if (status === "idle") void boot();
  }, [status, boot]);

  if (status === "idle" || status === "booting") return <Splash />;
  if (status === "error") return <BootError message={error} onRetry={() => void boot()} />;
  return (
    <>
      <Outlet />
      {floatingSupport ? <SupportCorner /> : null}
    </>
  );
}

/**
 * Exige un perfil activo. Con un único perfil se selecciona solo; con varios
 * se muestra el selector («¿Quién estudia hoy?»).
 */
export function RequireProfile() {
  const profile = useSession((s) => s.profile);
  const profiles = useSession((s) => s.profiles);
  const selectProfile = useSession((s) => s.selectProfile);
  const profileChosen = useSession((s) => s.profileChosen);
  const navigate = useNavigate();
  const [auto, setAuto] = useState<"idle" | "running" | "failed">("idle");
  // Solo al arrancar: si después se borra el perfil activo, se vuelve al selector de perfiles.
  const only = profiles.length === 1 && !profileChosen ? profiles[0] : undefined;

  useEffect(() => {
    if (profile || !only || auto !== "idle") return;
    setAuto("running");
    selectProfile(only.id)
      .then((route) => navigate(route, { replace: true }))
      .catch(() => setAuto("failed"));
  }, [profile, only, auto, selectProfile, navigate]);

  if (profile) return <Outlet />;
  if (only && auto !== "failed") return <Splash />;
  return <Navigate to="/perfiles" replace />;
}
