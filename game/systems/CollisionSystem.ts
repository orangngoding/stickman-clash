import { ARENA_MAX_X, ARENA_MIN_X, PUSHBOX_WIDTH } from "../constants";
import { clamp } from "../core/math";
import type { Fighter } from "../entities/Fighter";

/** Dua pushbox (AABB) bertumpuk bila tumpang tindih di sumbu x dan y. Kaki fighter ada di dasar kotak. */
export function pushboxesOverlap(a: Fighter, b: Fighter): boolean {
  // Fighter yang tergeletak (knockdown, KO) tidak mendorong siapa pun.
  if (a.isDown || b.isDown) return false;
  const overlapX = PUSHBOX_WIDTH - Math.abs(b.x - a.x) > 0;
  const overlapY = a.y > b.y - b.pushboxHeight && b.y > a.y - a.pushboxHeight;
  return overlapX && overlapY;
}

/**
 * Mencegah dua fighter saling menembus: dorong keluar sama rata ke kiri dan kanan.
 * Jika salah satu terjepit dinding, sisa dorongan ditanggung fighter satunya.
 * Fighter yang melompat di atas kepala lawan tidak bertumpuk secara vertikal, jadi boleh melewatinya.
 */
export function resolvePushboxes(a: Fighter, b: Fighter): void {
  if (!pushboxesOverlap(a, b)) return;

  const dx = b.x - a.x;
  const overlap = PUSHBOX_WIDTH - Math.abs(dx);
  // Jika persis di titik yang sama, tentukan sisi dari arah hadap a (a biasanya menghadap lawannya).
  const dir = dx !== 0 ? Math.sign(dx) : a.facing;
  const half = overlap / 2;

  a.x -= dir * half;
  b.x += dir * half;

  const clampedA = clamp(a.x, ARENA_MIN_X, ARENA_MAX_X);
  const clampedB = clamp(b.x, ARENA_MIN_X, ARENA_MAX_X);
  if (clampedA !== a.x) {
    a.x = clampedA;
    b.x = clamp(a.x + dir * PUSHBOX_WIDTH, ARENA_MIN_X, ARENA_MAX_X);
  } else if (clampedB !== b.x) {
    b.x = clampedB;
    a.x = clamp(b.x - dir * PUSHBOX_WIDTH, ARENA_MIN_X, ARENA_MAX_X);
  }
}
