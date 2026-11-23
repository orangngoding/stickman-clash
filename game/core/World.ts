import type { Fighter } from "../entities/Fighter";
import type { EventBus } from "./Events";
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
  /** Penerima peristiwa (suara). Opsional: tanpa bus, World tetap berjalan murni. */
  events: EventBus | null = null;

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
    const air1 = !this.p1.grounded;
    const air2 = !this.p2.grounded;
    this.p1.update(this.p2);
    this.p2.update(this.p1);
    stepPhysics(this.p1);
    stepPhysics(this.p2);
    this.announceLanding(this.p1, air1);
    this.announceLanding(this.p2, air2);
    resolvePushboxes(this.p1, this.p2);
    this.hitstop = resolveCombat(this.p1, this.p2, this.events);
  }

  /** Fighter yang tadinya di udara dan kini menapak lantai: kirim peristiwa mendarat. */
  private announceLanding(f: Fighter, wasAirborne: boolean): void {
    if (!wasAirborne || !f.grounded || !this.events) return;
    // Jatuh karena knockdown atau KO terdengar lebih berat.
    const hard = f.machine.current === "knockdown" || f.machine.current === "ko";
    this.events.emit({ type: "land", fighter: f.id, x: f.x, hard });
  }
}
