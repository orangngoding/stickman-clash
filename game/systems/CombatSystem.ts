import { ARENA_MAX_X, ARENA_MIN_X } from "../constants";
import { clamp } from "../core/math";
import { COMBAT } from "../data/combat";
import type { EventBus } from "../core/Events";
import type { Fighter } from "../entities/Fighter";
import type { MoveData, Rect } from "../types";

// Kotak dipakai ulang agar tidak membuat objek baru tiap frame.
const hitboxRect: Rect = { x: 0, y: 0, w: 0, h: 0 };
const hurtboxRect: Rect = { x: 0, y: 0, w: 0, h: 0 };

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** Serangan aktif attacker yang mengenai defender pada frame ini, atau null. */
function findHit(attacker: Fighter, defender: Fighter): MoveData | null {
  const move = attacker.move;
  if (!move || !attacker.getActiveHitbox(hitboxRect)) return null;
  if (!defender.isHittable()) return null;
  if (move.hitsGroundedOnly && !defender.grounded) return null;
  defender.getHurtbox(hurtboxRect);
  return rectsOverlap(hitboxRect, hurtboxRect) ? move : null;
}

/**
 * Mendeteksi dan menerapkan hit antar dua fighter pada frame ini.
 * Hit keduanya dideteksi lebih dulu sebelum diterapkan, sehingga saling pukul di frame
 * yang sama (trade) berlaku adil bagi kedua pihak.
 * @returns jumlah frame hitstop yang harus dijalankan (0 bila tidak ada hit)
 */
export function resolveCombat(a: Fighter, b: Fighter, events: EventBus | null = null): number {
  const moveAB = findHit(a, b);
  const moveBA = findHit(b, a);
  let hitstop = 0;
  if (moveAB) hitstop = Math.max(hitstop, applyHit(a, b, moveAB, events));
  if (moveBA) hitstop = Math.max(hitstop, applyHit(b, a, moveBA, events));
  return hitstop;
}

function applyHit(attacker: Fighter, defender: Fighter, move: MoveData, events: EventBus | null): number {
  attacker.hasHit = true;
  attacker.chainWindow = COMBAT.chainWindow;

  // Arah dorongan: dari penyerang menuju korban.
  const dir = defender.x === attacker.x ? attacker.facing : Math.sign(defender.x - attacker.x);
  const multiplier = attacker.character.attackMultiplier;
  const blocked = defender.isBlocking();

  let damage: number;
  if (blocked) {
    damage = move.damage * multiplier * (move.chipRatio ?? COMBAT.blockDamageRatio);
  } else {
    defender.comboHits += 1;
    damage = move.damage * multiplier * Math.pow(COMBAT.comboDamageScale, defender.comboHits - 1);
  }

  const hpBefore = defender.hp;
  defender.hp = Math.max(0, defender.hp - damage);
  attacker.stats.hits++;
  attacker.stats.damageDealt += hpBefore - defender.hp;
  if (!blocked) attacker.stats.maxCombo = Math.max(attacker.stats.maxCombo, defender.comboHits);
  attacker.addRage(damage * COMBAT.rageOnHit);
  defender.addRage(damage * COMBAT.rageOnHurt);

  let guardBroken = false;
  if (defender.hp <= 0) {
    defender.enterKo(dir * move.knockback);
  } else if (blocked) {
    defender.blockstunLeft = Math.round(move.hitstun * COMBAT.blockstunRatio);
    defender.vx = dir * move.knockback * COMBAT.blockKnockbackRatio;
    defender.stamina = Math.max(0, defender.stamina - move.damage * COMBAT.blockStaminaDrainRatio);
    if (defender.stamina <= 0) {
      guardBroken = true;
      defender.guardBreak();
    }
  } else if (move.knockdown) {
    defender.enterKnockdown(move.knockdown, dir * move.knockback);
  } else {
    defender.enterHitstun(move.hitstun, dir * move.knockback);
  }

  // Korban terpojok di dinding: penyerang ikut terdorong mundur sedikit.
  if (defender.x <= ARENA_MIN_X + 0.5 || defender.x >= ARENA_MAX_X - 0.5) {
    attacker.x = clamp(attacker.x - dir * COMBAT.wallPushback, ARENA_MIN_X, ARENA_MAX_X);
  }

  events?.emit({
    type: "hit",
    attacker: attacker.id,
    defender: defender.id,
    x: defender.x,
    moveId: move.id,
    weaponKind: attacker.weapon?.kind ?? null,
    blocked,
    guardBreak: guardBroken,
    ko: defender.isKo,
    knockdown: move.knockdown !== undefined,
    combo: blocked ? 0 : defender.comboHits,
  });

  return move.hitstop;
}
