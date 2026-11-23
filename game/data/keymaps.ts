import type { KeyMap, PlayerId } from "../types";

// Kontrol default dari GDD Bagian 7.1. Memakai KeyboardEvent.code (posisi tombol),
// jadi tidak terpengaruh layout keyboard.
export const DEFAULT_KEYMAPS: Record<PlayerId, KeyMap> = {
  p1: {
    left: "KeyA",
    right: "KeyD",
    up: "KeyW",
    down: "KeyS",
    light: "KeyJ",
    kick: "KeyK",
    heavy: "KeyL",
    dash: "KeyU",
    special: "KeyI",
  },
  p2: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    light: "Semicolon",
    kick: "Quote",
    heavy: "Slash",
    dash: "Period",
    special: "Comma",
  },
};

export const PAUSE_KEY = "Escape";
