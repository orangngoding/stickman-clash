import { TICKS_PER_SECOND } from "../constants";
import { MATCH } from "../data/match";
import type { Fighter } from "../entities/Fighter";
import type { PlayerId, RoundOutcome } from "../types";

/** Skor dan timer pertandingan best of 3. Murni data dan aturan, tidak menyentuh canvas. */
export class Match {
  round = 1;
  readonly wins: Record<PlayerId, number> = { p1: 0, p2: 0 };
  /** Sisa waktu ronde dalam frame logika. */
  timerFrames: number;

  constructor(
    readonly roundSeconds: number,
    readonly roundsToWin: number,
  ) {
    this.timerFrames = roundSeconds * TICKS_PER_SECOND;
  }

  /** Detik yang ditampilkan di timer (dibulatkan ke atas). */
  get secondsLeft(): number {
    return Math.ceil(this.timerFrames / TICKS_PER_SECOND);
  }

  /** Pemenang pertandingan, atau null bila belum ada yang mencapai batas kemenangan. */
  get winner(): PlayerId | null {
    if (this.wins.p1 >= this.roundsToWin) return "p1";
    if (this.wins.p2 >= this.roundsToWin) return "p2";
    return null;
  }

  reset(): void {
    this.round = 1;
    this.wins.p1 = 0;
    this.wins.p2 = 0;
    this.startRound();
  }

  startRound(): void {
    this.timerFrames = this.roundSeconds * TICKS_PER_SECOND;
  }

  /**
   * Menentukan hasil ronde dan mencatat kemenangan.
   * KO menang langsung. Bila waktu habis, persentase HP terbanyak menang. Selisih kecil atau
   * KO ganda dianggap seri: tidak ada poin, dan ronde berikutnya menjadi ronde tambahan.
   */
  resolveRound(p1: Fighter, p2: Fighter): RoundOutcome {
    let outcome: RoundOutcome;
    if (p1.isKo || p2.isKo) {
      const winner: PlayerId | null = p1.isKo && p2.isKo ? null : p1.isKo ? "p2" : "p1";
      outcome = { winner, reason: "ko" };
    } else {
      const r1 = p1.hp / p1.character.maxHp;
      const r2 = p2.hp / p2.character.maxHp;
      const winner: PlayerId | null = Math.abs(r1 - r2) <= MATCH.drawEpsilon ? null : r1 > r2 ? "p1" : "p2";
      outcome = { winner, reason: "time" };
    }
    if (outcome.winner) this.wins[outcome.winner]++;
    return outcome;
  }
}
