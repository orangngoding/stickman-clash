// Angka penyeimbang combat (GDD Bagian 7). Semua bisa disetel tanpa menyentuh logika.

export const COMBAT = {
  // Statistik fighter
  staminaMax: 100,
  /** Regenerasi per frame saat tidak sedang memblok, dash, atau menyerang. */
  staminaRegen: 0.6,
  rageMax: 100,
  rageOnHit: 0.8,
  rageOnHurt: 0.5,

  // Blok
  /** Damage yang tetap masuk saat diblok (chip damage 20 persen). */
  blockDamageRatio: 0.2,
  /** Stamina terkuras = damage dasar serangan x rasio ini. */
  blockStaminaDrainRatio: 1,
  /** Lama blockstun = hitstun x rasio ini. */
  blockstunRatio: 0.7,
  /** Dorongan mundur saat diblok = knockback x rasio ini. */
  blockKnockbackRatio: 0.6,
  guardBreakStun: 40,
  /** Saat blok berjalan mundur, kecepatan dikali rasio ini. */
  blockWalkRatio: 0.5,

  // Combo
  /** Damage tiap hit berikutnya dalam satu combo dikali nilai ini dari hit sebelumnya. */
  comboDamageScale: 0.9,
  /** Jendela rantai setelah hit (frame). */
  chainWindow: 12,
  /** Tombol serang yang ditekan sesaat lebih awal tetap dieksekusi (frame). */
  inputBuffer: 6,

  // Knockdown
  /** Setelah knockdown selesai: lama bangun dan lama kebal (frame). */
  getUpFrames: 20,
  getUpInvincible: 20,
  /** Lompatan kecil saat jatuh (px per frame ke atas). */
  knockdownPop: 6,
  koPop: 8,

  /** Jika korban terkena di dinding, penyerang terdorong mundur sebanyak ini (px). */
  wallPushback: 2,
} as const;
