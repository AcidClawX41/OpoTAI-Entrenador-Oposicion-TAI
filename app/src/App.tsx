// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import { MotionConfig } from "motion/react";
import { router } from "./app/router";
import { ThemeController } from "./app/ThemeController";
import { installSfxUnlock } from "./lib/sfx";
import { Toaster } from "./components/ui/Toaster";
import { LightboxRoot } from "./components/ui/ImageLightbox";
import { SupportDialog } from "./components/support/SupportDialog";

/** OpoTAI · interfaz de escritorio. Autor: Eric Valls Gramunt. */
export default function App() {
  useEffect(() => installSfxUnlock(), []);
  return (
    <MotionConfig reducedMotion="user">
      <ThemeController />
      <RouterProvider router={router} />
      <SupportDialog />
      <LightboxRoot />
      <Toaster />
    </MotionConfig>
  );
}
