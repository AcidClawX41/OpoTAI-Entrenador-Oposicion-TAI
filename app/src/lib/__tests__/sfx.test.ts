// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2026 Eric Valls Gramunt
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureSfx, playSfx, resetSfxForTests, unlockSfx } from "@/lib/sfx";
import { soundForFeedback, soundForResult, soundForSelection } from "@/lib/examSounds";

class FakeParam {
  setValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class FakeNode {
  frequency = new FakeParam();
  gain = new FakeParam();
  type = "sine";
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}
const created: FakeNode[] = [];
class FakeAudioContext {
  currentTime = 0;
  state = "running";
  destination = {};
  createOscillator() {
    const n = new FakeNode();
    created.push(n);
    return n;
  }
  createGain() {
    return new FakeNode();
  }
  resume() {
    return Promise.resolve();
  }
}

describe("efectos de sonido", () => {
  beforeEach(() => {
    resetSfxForTests();
    created.length = 0;
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  });
  afterEach(() => {
    delete (window as unknown as { AudioContext?: unknown }).AudioContext;
  });

  it("no suena antes de la primera interacción", () => {
    expect(playSfx("correct")).toBe(false);
  });

  it("suena tras desbloquear y respeta sound_enabled", () => {
    unlockSfx();
    expect(playSfx("correct")).toBe(true);
    expect(created.length).toBeGreaterThan(0);
    configureSfx({ enabled: false });
    expect(playSfx("wrong")).toBe(false);
    expect(playSfx("correct", { ignoreEnabled: true })).toBe(true);
    configureSfx({ enabled: true, volume: 0 });
    expect(playSfx("nav")).toBe(false);
  });

  it("nunca suena al dejar en blanco", () => {
    expect(soundForSelection("end", null)).toBeNull();
    expect(soundForSelection("immediate", null)).toBeNull();
    expect(soundForSelection("end", "B")).toBe("tick");
    expect(soundForFeedback({ chosen: null, is_correct: false, annulled: false })).toBeNull();
    expect(soundForFeedback({ chosen: "A", is_correct: true, annulled: false })).toBe("correct");
    expect(soundForFeedback({ chosen: "A", is_correct: false, annulled: false })).toBe("wrong");
    expect(soundForResult(true)).toBe("pass");
  });
});
