// Data senjata. Jangkauan adalah jarak ujung hitbox serangan senjata dari tengah badan (piksel).
// Senjata digambar dari garis oleh StickmanRenderer, jadi tidak ada sprite.

export type WeaponKind = "fists" | "daggers" | "sword" | "spear";

export interface WeaponData {
  id: string;
  name: string;
  kind: WeaponKind;
  reach: number;
  /** Damage dasar serangan senjata (tombol L). */
  heavyDamage: number;
}

export const WEAPONS: Record<string, WeaponData> = {
  fists: { id: "fists", name: "Tangan Kosong", kind: "fists", reach: 60, heavyDamage: 16 },
  daggers: { id: "daggers", name: "Belati", kind: "daggers", reach: 70, heavyDamage: 16 },
  sword: { id: "sword", name: "Pedang", kind: "sword", reach: 130, heavyDamage: 16 },
  spear: { id: "spear", name: "Tombak", kind: "spear", reach: 165, heavyDamage: 14 },
};

/**
 * Senjata tiap ronde (dipakai kedua petarung): ronde 1 tangan kosong, ronde 2 pedang,
 * ronde 3 dan seterusnya (termasuk ronde tambahan bila seri) tombak.
 */
export function weaponIdForRound(round: number): string | null {
  if (round <= 1) return null;
  return round === 2 ? "sword" : "spear";
}
