import type { CharacterData } from "../types";
import { createMoves } from "./moves";
import { WEAPONS } from "./weapons";

// Statistik dari GDD Bagian 9. Warlord dan Phantom (karakter unlock) ditambahkan di M6.
// Serangan dibuat dari data/moves.ts, hanya jangkauan serangan senjata yang berbeda tiap karakter.

export const CHARACTERS: Record<string, CharacterData> = {
  blade: {
    id: "blade",
    name: "Blade",
    maxHp: 100,
    speed: 5.0,
    jumpPower: 16,
    attackMultiplier: 1.0,
    weaponId: "sword",
    colors: { body: "#38bdf8", accent: "#fb923c" },
    moves: createMoves(WEAPONS.sword.reach),
  },
  brawler: {
    id: "brawler",
    name: "Brawler",
    maxHp: 120,
    speed: 4.2,
    jumpPower: 15,
    attackMultiplier: 1.15,
    weaponId: "fists",
    colors: { body: "#f87171", accent: "#fde047" },
    moves: createMoves(WEAPONS.fists.reach),
  },
  shadow: {
    id: "shadow",
    name: "Shadow",
    maxHp: 85,
    speed: 6.2,
    jumpPower: 18,
    attackMultiplier: 0.9,
    weaponId: "daggers",
    colors: { body: "#a78bfa", accent: "#22d3ee" },
    moves: createMoves(WEAPONS.daggers.reach),
  },
  lancer: {
    id: "lancer",
    name: "Lancer",
    maxHp: 95,
    speed: 4.6,
    jumpPower: 15,
    attackMultiplier: 1.0,
    weaponId: "spear",
    colors: { body: "#34d399", accent: "#f472b6" },
    moves: createMoves(WEAPONS.spear.reach),
  },
};
