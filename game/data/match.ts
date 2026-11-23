// Angka alur pertandingan (GDD Bagian 7.4 dan 8.3). Satuan frame logika (60 per detik).

export const MATCH = {
  /** Best of 3: siapa pun yang lebih dulu memenangi 2 ronde menang. */
  roundsToWin: 2,
  roundTimeOptions: [30, 60, 99] as const,
  defaultRoundTime: 60,

  // Awal ronde: banner "RONDE N", hitung mundur 3-2-1, lalu "FIGHT!"
  introFrames: 60,
  countdownStep: 36,
  fightBannerFrames: 40,

  /** Slow motion saat KO: 0.3x selama 40 frame layar. */
  koSlowMo: { scale: 0.3, realFrames: 40 },
  koZoom: 1.15,

  // Akhir ronde
  /** Frame ke berapa pemenang mulai merayakan. */
  victoryAtFrame: 50,
  /** Total lama layar akhir ronde sebelum lanjut. */
  roundEndFrames: 150,

  /** Selisih rasio HP di bawah ini dianggap seri saat waktu habis. */
  drawEpsilon: 0.0005,
} as const;

/**
 * Slow motion berjalan dengan skala 0.3, jadi 40 frame layar setara 12 update logika.
 * Game menghitung durasinya dalam update logika karena state machine berjalan per update.
 */
export const KO_SLOWMO_UPDATES = Math.round(MATCH.koSlowMo.realFrames * MATCH.koSlowMo.scale);
