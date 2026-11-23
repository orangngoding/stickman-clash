import type { WeaponKind } from "../data/weapons";
import type { PlayerId } from "../types";

/**
 * Peristiwa game yang bisa didengar sistem lain (saat ini: audio).
 * Logika pertarungan hanya MEMANCARKAN peristiwa dan tidak tahu apa pun soal suara,
 * jadi World, Fighter, dan CombatSystem tetap murni dan bisa diuji tanpa browser.
 */
export type GameEvent =
  // Alur pertandingan
  | { type: "roundStart"; round: number }
  | { type: "countdown"; number: 1 | 2 | 3 }
  | { type: "fight" }
  | { type: "timerTick"; seconds: number }
  | { type: "lowHp" }
  | { type: "roundEnd"; reason: "ko" | "time"; winner: PlayerId | null }
  | { type: "roundResult"; winner: PlayerId | null; matchOver: boolean }
  | { type: "matchEnd"; winner: PlayerId }
  | { type: "pause" }
  | { type: "resume" }
  // Aksi fighter (x dipakai untuk panning stereo)
  | { type: "jump" | "dash" | "step" | "getUp" | "rageFull" | "specialStart"; fighter: PlayerId; x: number }
  | { type: "land"; fighter: PlayerId; x: number; hard: boolean }
  | { type: "swing"; fighter: PlayerId; x: number; moveId: string; weaponKind: WeaponKind | null }
  | {
      type: "hit";
      attacker: PlayerId;
      defender: PlayerId;
      x: number;
      moveId: string;
      weaponKind: WeaponKind | null;
      blocked: boolean;
      guardBreak: boolean;
      ko: boolean;
      knockdown: boolean;
      /** Jumlah hit beruntun yang diterima korban (0 bila diblok). */
      combo: number;
    };

export type GameEventListener = (event: GameEvent) => void;

/** Bus peristiwa sederhana: pemancar tidak peduli siapa yang mendengarkan. */
export class EventBus {
  private readonly listeners = new Set<GameEventListener>();

  /** Mendaftar pendengar. Mengembalikan fungsi untuk berhenti mendengarkan. */
  on(listener: GameEventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event: GameEvent): void {
    for (const listener of this.listeners) listener(event);
  }

  clear(): void {
    this.listeners.clear();
  }
}
