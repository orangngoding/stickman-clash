import type { MoveData } from "../types";
import { WEAPONS } from "./weapons";
import type { WeaponData } from "./weapons";

/**
 * Daftar serangan (GDD Bagian 7.3, satuan frame). Angka frame, damage, hitstun, knockback,
 * stamina dan hitstop dari GDD. Posisi hitbox ditetapkan di sini karena GDD tidak menyebutnya.
 *
 * Hitbox tinggi (pukulan, senjata) sengaja lebih tinggi dari hurtbox jongkok, jadi
 * menunduk menghindari serangan tinggi. Tendangan, sapuan, dan serangan lompat mengenai yang jongkok.
 */
export function createMoves(weaponReach: number, heavyDamage = 16): Record<string, MoveData> {
  const light = {
    startup: 4,
    active: 3,
    recovery: 8,
    damage: 6,
    hitstun: 14,
    knockback: 4,
    staminaCost: 0,
    hitstop: 4,
    hitbox: { x: 14, y: -124, w: 48, h: 30 },
  };

  return {
    light1: { id: "light1", anim: "punch1", ...light, chain: { light: "light2", kick: "kick" } },
    light2: { id: "light2", anim: "punch2", ...light, chain: { kick: "kick" } },
    kick: {
      id: "kick",
      anim: "kick",
      startup: 7,
      active: 4,
      recovery: 12,
      damage: 10,
      hitstun: 18,
      knockback: 7,
      staminaCost: 5,
      hitstop: 4,
      hitbox: { x: 14, y: -88, w: 66, h: 34 },
    },
    heavy: {
      id: "heavy",
      anim: "weaponSlash",
      startup: 12,
      active: 5,
      recovery: 20,
      damage: heavyDamage,
      hitstun: 24,
      knockback: 12,
      staminaCost: 15,
      hitstop: 4,
      groundOnly: true,
      hitbox: { x: 14, y: -135, w: weaponReach - 14, h: 40 },
    },
    jumpAttack: {
      id: "jumpAttack",
      anim: "jumpAttack",
      startup: 6,
      active: 6,
      recovery: 10,
      damage: 9,
      hitstun: 16,
      knockback: 6,
      staminaCost: 0,
      hitstop: 4,
      airOnly: true,
      landingRecovery: true,
      hitbox: { x: 8, y: -55, w: 56, h: 65 },
    },
    sweep: {
      id: "sweep",
      anim: "sweep",
      startup: 8,
      active: 4,
      recovery: 16,
      damage: 8,
      hitstun: 40,
      knockback: 3,
      staminaCost: 8,
      hitstop: 4,
      groundOnly: true,
      hitsGroundedOnly: true,
      knockdown: 40,
      hitbox: { x: 14, y: -28, w: 74, h: 30 },
    },
    special: {
      id: "special",
      anim: "special",
      startup: 10,
      active: 10,
      recovery: 28,
      damage: 30,
      hitstun: 60,
      knockback: 20,
      staminaCost: 0,
      hitstop: 8,
      groundOnly: true,
      knockdown: 60,
      chipRatio: 0.5,
      hitbox: { x: 10, y: -140, w: 150, h: 120 },
    },
  };
}

const movesCache = new Map<string, Record<string, MoveData>>();

/**
 * Daftar serangan untuk senjata tertentu (null = tangan kosong). Hasilnya di-cache karena
 * senjata berganti tiap ronde. Tanpa senjata, serangan "heavy" tetap ada di data tetapi
 * Fighter tidak akan memakainya.
 */
export function getMoves(weapon: WeaponData | null): Record<string, MoveData> {
  const key = weapon?.id ?? "none";
  let moves = movesCache.get(key);
  if (!moves) {
    moves = weapon ? createMoves(weapon.reach, weapon.heavyDamage) : createMoves(WEAPONS.fists.reach);
    movesCache.set(key, moves);
  }
  return moves;
}
