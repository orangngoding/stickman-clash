// Angka gerak yang bisa disetel (GDD Bagian 6.4 dan 7.3). Gravitasi dan gesekan ada di constants.ts.

export const MOVEMENT = {
  /** Percepatan di tanah = speed karakter x rasio ini (piksel per frame kuadrat). */
  groundAccelRatio: 0.3,
  /** Percepatan kendali di udara, jauh lebih kecil agar lompatan terasa "komit". */
  airAccelRatio: 0.06,
  /** Di bawah kecepatan ini (px/frame) fighter dianggap berhenti. */
  stopThreshold: 0.5,
  dash: {
    distance: 140,
    frames: 10,
    /** Kebal pada frame-frame pertama dash. */
    invincibleFrames: 8,
    cooldown: 30,
    /** Dipakai di M4 saat stamina ditambahkan. */
    staminaCost: 20,
  },
} as const;

/**
 * Kecepatan dash per frame: dimulai cepat lalu melambat (ease-out), dan totalnya
 * tepat sama dengan jarak dash (140 px dalam 10 frame).
 */
export const DASH_VELOCITIES: readonly number[] = (() => {
  const { distance, frames } = MOVEMENT.dash;
  const weights: number[] = [];
  for (let i = 0; i < frames; i++) weights.push(1 - 0.7 * (i / (frames - 1)));
  const total = weights.reduce((sum, w) => sum + w, 0);
  return weights.map((w) => (distance * w) / total);
})();
