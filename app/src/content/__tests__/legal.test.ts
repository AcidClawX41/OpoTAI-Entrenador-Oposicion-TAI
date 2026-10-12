// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { describe, expect, it } from "vitest";
import { copyrightYears } from "@/content/legal";

describe("copyrightYears", () => {
  it("muestra solo el año de publicación el primer año (o con el reloj atrasado)", () => {
    expect(copyrightYears(2026)).toBe("2026");
    expect(copyrightYears(2024)).toBe("2026");
  });

  it("amplía el intervalo con el año en curso", () => {
    expect(copyrightYears(2027)).toBe("2026–2027");
    expect(copyrightYears(2031)).toBe("2026–2031");
  });
});
