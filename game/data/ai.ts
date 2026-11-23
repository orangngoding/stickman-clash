import type { AIProfile } from "../types";

// Tingkat kesulitan CPU (GDD Bagian 11). Semua angka penyeimbang AI ada di sini.
//
// reactionFrames : berapa frame sejak serangan lawan terlihat sebelum CPU bereaksi (makin kecil makin sigap).
//                  Pukulan ringan hanya 7 frame (startup + active), jadi CPU lambat tidak sempat memblok jab.
// aggression     : 0 sampai 1, seberapa sering CPU memilih menyerang saat berada di jangkauan.
// blockChance    : peluang CPU benar-benar memblok atau menunduk begitu ia bereaksi.
// comboChance    : peluang CPU menyambung rantai serangan setelah hit mengenai.
// punishChance   : peluang CPU menghukum lawan yang sedang recovery setelah menyerang.

export const AI_PROFILES: Record<"easy" | "normal" | "hard", AIProfile> = {
  easy: { reactionFrames: 15, aggression: 0.35, blockChance: 0.35, comboChance: 0.35, punishChance: 0.2 },
  normal: { reactionFrames: 11, aggression: 0.5, blockChance: 0.55, comboChance: 0.55, punishChance: 0.4 },
  hard: { reactionFrames: 8, aggression: 0.62, blockChance: 0.7, comboChance: 0.75, punishChance: 0.6 },
};

/** Ronde 1 mudah, ronde 2 sedang, ronde 3 dan seterusnya sulit. */
export function aiProfileForRound(round: number): AIProfile {
  if (round <= 1) return AI_PROFILES.easy;
  return round === 2 ? AI_PROFILES.normal : AI_PROFILES.hard;
}
