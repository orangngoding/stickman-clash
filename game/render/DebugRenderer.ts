import { PUSHBOX_WIDTH } from "../constants";
import type { Fighter } from "../entities/Fighter";
import type { Rect } from "../types";

const rect: Rect = { x: 0, y: 0, w: 0, h: 0 };

/** Menggambar kotak tabrakan untuk uji: hurtbox (hijau), pushbox (biru), hitbox aktif (merah). */
export class DebugRenderer {
  drawBoxes(ctx: CanvasRenderingContext2D, fighters: readonly Fighter[]): void {
    ctx.lineWidth = 2;
    for (const f of fighters) {
      // Fighter yang tergeletak tidak bisa dipukul, jadi hurtbox tidak digambar.
      if (!f.isDown) {
        f.getHurtbox(rect);
        ctx.strokeStyle = "rgba(74, 222, 128, 0.9)";
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }

      if (!f.isDown) {
        ctx.strokeStyle = "rgba(96, 165, 250, 0.9)";
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(f.x - PUSHBOX_WIDTH / 2, f.y - f.pushboxHeight, PUSHBOX_WIDTH, f.pushboxHeight);
        ctx.setLineDash([]);
      }

      if (f.getActiveHitbox(rect)) {
        ctx.fillStyle = "rgba(248, 113, 113, 0.35)";
        ctx.strokeStyle = "rgba(248, 113, 113, 1)";
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      }
    }
  }
}
