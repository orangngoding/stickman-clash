/** Jam game: hitung frame logika dan skala waktu (dipakai slow motion KO di M5). */
export class Clock {
  /** Jumlah update logika sejak game mulai. */
  frame = 0;
  /** 1 = normal, 0.3 = slow motion. */
  timeScale = 1;

  tick(): void {
    this.frame++;
  }
}
