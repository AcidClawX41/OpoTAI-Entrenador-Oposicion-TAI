// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
// Evita la consola extra en Windows en compilaciones release.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    opotai_lib::run()
}
