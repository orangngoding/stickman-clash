import { ARENA_MAX_X, ARENA_MIN_X, FLOOR_Y, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants";

/**
 * Latar arena yang digambar lewat kode. Saat ini satu latar bawaan;
 * sepuluh arena bertema dan parallax dikerjakan di M8 (GDD Bagian 12).
 */
export class ArenaRenderer {
  private readonly sky: CanvasGradient;
  private readonly floor: CanvasGradient;

  constructor(ctx: CanvasRenderingContext2D) {
    this.sky = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    this.sky.addColorStop(0, "#0b1020");
    this.sky.addColorStop(1, "#1e293b");

    this.floor = ctx.createLinearGradient(0, FLOOR_Y, 0, LOGICAL_HEIGHT);
    this.floor.addColorStop(0, "#1f2937");
    this.floor.addColorStop(1, "#0b1020");
  }

  draw(ctx: CanvasRenderingContext2D, showBounds: boolean): void {
    ctx.fillStyle = this.sky;
    ctx.fillRect(0, 0, LOGICAL_WIDTH, FLOOR_Y);

    // Siluet pegunungan sederhana sebagai lapisan jauh.
    ctx.fillStyle = "#111a2e";
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    ctx.lineTo(0, 470);
    ctx.lineTo(180, 380);
    ctx.lineTo(340, 480);
    ctx.lineTo(560, 340);
    ctx.lineTo(760, 470);
    ctx.lineTo(980, 370);
    ctx.lineTo(1280, 480);
    ctx.lineTo(1280, FLOOR_Y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = this.floor;
    ctx.fillRect(0, FLOOR_Y, LOGICAL_WIDTH, LOGICAL_HEIGHT - FLOOR_Y);

    ctx.strokeStyle = "#22d3ee";
    ctx.lineWidth = 3;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, FLOOR_Y);
    ctx.lineTo(LOGICAL_WIDTH, FLOOR_Y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    if (showBounds) {
      // Batas dinding arena (x 60 sampai 1220), hanya untuk debug.
      ctx.strokeStyle = "rgba(251, 146, 60, 0.5)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.moveTo(ARENA_MIN_X, 120);
      ctx.lineTo(ARENA_MIN_X, FLOOR_Y);
      ctx.moveTo(ARENA_MAX_X, 120);
      ctx.lineTo(ARENA_MAX_X, FLOOR_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
