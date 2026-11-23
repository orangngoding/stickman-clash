import { DEFAULT_KEYMAPS } from "../data/keymaps";
import { ACTIONS } from "../types";
import type { ActionFlags, ControlState, KeyMap } from "../types";

export function createActionFlags(): ActionFlags {
  return {
    left: false,
    right: false,
    up: false,
    down: false,
    light: false,
    kick: false,
    heavy: false,
    dash: false,
    special: false,
  };
}

export function createControlState(): ControlState {
  return { down: createActionFlags(), pressed: createActionFlags() };
}

/** Mengosongkan semua tombol virtual (dipakai saat hitung mundur, akhir ronde, dan hasil). */
export function clearControlState(state: ControlState): void {
  for (const action of ACTIONS) {
    state.down[action] = false;
    state.pressed[action] = false;
  }
}

// Tombol yang tidak boleh memicu perilaku bawaan browser (scroll, quick find, dsb).
// Spasi sengaja tidak diblokir agar tombol di menu React tetap bisa diaktifkan dengan Spasi.
const BLOCKED_DEFAULT_CODES = new Set<string>([
  "Escape",
  ...Object.values(DEFAULT_KEYMAPS.p1),
  ...Object.values(DEFAULT_KEYMAPS.p2),
]);

/**
 * Membaca keyboard dan menyimpan status per frame: isDown, justPressed, justReleased (GDD Bagian 6.3).
 * justPressed/justReleased dibersihkan lewat endFrame() setelah tiap update logika.
 * Input buffer 6 frame untuk serangan ditambahkan di M4.
 */
export class Input {
  private readonly down = new Set<string>();
  private readonly pressed = new Set<string>();
  private readonly released = new Set<string>();

  attach(): void {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.reset);
  }

  detach(): void {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.reset);
    this.reset();
  }

  isDown(code: string): boolean {
    return this.down.has(code);
  }

  justPressed(code: string): boolean {
    return this.pressed.has(code);
  }

  justReleased(code: string): boolean {
    return this.released.has(code);
  }

  get downCodes(): ReadonlySet<string> {
    return this.down;
  }

  /** Mengisi tombol virtual satu pemain tanpa membuat objek baru. */
  readControls(keyMap: KeyMap, out: ControlState): void {
    for (const action of ACTIONS) {
      const code = keyMap[action];
      out.down[action] = this.down.has(code);
      out.pressed[action] = this.pressed.has(code);
    }
  }

  /** Dipanggil setelah setiap update logika. */
  endFrame(): void {
    this.pressed.clear();
    this.released.clear();
  }

  /** Melepas semua tombol (saat window kehilangan fokus atau tab disembunyikan). */
  readonly reset = (): void => {
    this.down.clear();
    this.pressed.clear();
    this.released.clear();
  };

  private readonly onKeyDown = (event: KeyboardEvent): void => {
    // Biarkan pintasan browser (Ctrl+R, Cmd+L, dst) bekerja.
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Kolom isian (mis. slider volume di menu jeda) tetap memakai tombol panah bawaannya.
    const inField = event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement;
    if (BLOCKED_DEFAULT_CODES.has(event.code) && !inField) event.preventDefault();
    if (event.repeat || this.down.has(event.code)) return;
    this.down.add(event.code);
    this.pressed.add(event.code);
  };

  private readonly onKeyUp = (event: KeyboardEvent): void => {
    if (!this.down.has(event.code)) return;
    this.down.delete(event.code);
    this.released.add(event.code);
  };
}
