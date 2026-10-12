// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
/** Versión de la interfaz, inyectada por Vite desde app/package.json (`define: __APP_VERSION__`). */
declare const __APP_VERSION__: string;

export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "0.0.0";
