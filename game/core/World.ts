import type { Fighter } from "../entities/Fighter";
import { resolveCombat } from "../systems/CombatSystem";
import { resolvePushboxes } from "../systems/CollisionSystem";
import { stepPhysics } from "../systems/PhysicsSystem";

/**
 * Dunia pertarungan: dua fighter dan urutan tetap satu tick logika.
 * Dipisah dari Game agar logika pertarungan murni (tanpa canvas) dan bisa diuji tanpa browser.
 */
export class World {
  /** Sisa frame hitstop: seluruh pertarungan membeku sejenak setelah hit untuk memberi bobot pukulan. */
  hitstop = 0;

  constructor(
    readonly p1: Fighter,
    readonly p2: Fighter,
  ) {}

  /** Satu tick (1/60 detik). `controls` kedua fighter harus sudah diisi sebelum dipanggil. */
  step(): void {
    if (this.hitstop > 0) {
      this.hitstop--;
      // Tombol yang ditekan saat hitstop tetap tersimpan di buffer.
      this.p1.bufferInputs();
      this.p2.bufferInputs();
      return;
    }

    // Urutan tetap: niat gerak (state), fisika, tabrakan badan, lalu hit.
    this.p1.update(this.p2);
    this.p2.update(this.p1);
    stepPhysics(this.p1);
    stepPhysics(this.p2);
    resolvePushboxes(this.p1, this.p2);
    this.hitstop = resolveCombat(this.p1, this.p2);
  }
}
