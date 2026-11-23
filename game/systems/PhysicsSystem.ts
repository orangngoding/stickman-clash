import { ARENA_MAX_X, ARENA_MIN_X, FLOOR_Y, GRAVITY, MAX_FALL_SPEED } from "../constants";
import type { Fighter } from "../entities/Fighter";

/**
 * Integrasi gerak satu fighter per update: gravitasi, posisi, lantai, dan dinding arena.
 * State machine hanya mengatur kecepatan (niat gerak), sistem inilah yang memindahkan posisi.
 */
export function stepPhysics(fighter: Fighter): void {
  if (!fighter.grounded) {
    fighter.vy = Math.min(fighter.vy + GRAVITY, MAX_FALL_SPEED);
  }

  fighter.x += fighter.vx;
  fighter.y += fighter.vy;

  if (fighter.y >= FLOOR_Y) {
    fighter.y = FLOOR_Y;
    fighter.vy = 0;
    fighter.grounded = true;
  }

  if (fighter.x < ARENA_MIN_X) {
    fighter.x = ARENA_MIN_X;
    fighter.vx = 0;
  } else if (fighter.x > ARENA_MAX_X) {
    fighter.x = ARENA_MAX_X;
    fighter.vx = 0;
  }
}
