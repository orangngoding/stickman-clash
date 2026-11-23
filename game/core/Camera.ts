import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants";
import { clamp } from "./math";

const SMOOTHING = 0.1;

/**
 * Kamera 2D. Bergerak halus menuju target dan selalu dibatasi agar tidak menampilkan area di luar arena.
 * Saat ini dipakai untuk zoom ke arah KO. Kamera yang terus mengikuti kedua fighter dikerjakan di M9.
 */
export class Camera {
  x = LOGICAL_WIDTH / 2;
  y = LOGICAL_HEIGHT / 2;
  zoom = 1;

  private targetX = LOGICAL_WIDTH / 2;
  private targetY = LOGICAL_HEIGHT / 2;
  private targetZoom = 1;

  /** Mengarahkan kamera ke titik dengan zoom tertentu (bergerak halus). */
  focus(x: number, y: number, zoom: number): void {
    this.targetX = x;
    this.targetY = y;
    this.targetZoom = zoom;
  }

  /** Kembali ke tampilan awal tanpa animasi. */
  reset(): void {
    this.x = this.targetX = LOGICAL_WIDTH / 2;
    this.y = this.targetY = LOGICAL_HEIGHT / 2;
    this.zoom = this.targetZoom = 1;
  }

  /** Dipanggil tiap frame layar. */
  update(): void {
    this.x += (this.targetX - this.x) * SMOOTHING;
    this.y += (this.targetY - this.y) * SMOOTHING;
    this.zoom += (this.targetZoom - this.zoom) * SMOOTHING;
  }

  /** Menerapkan transformasi kamera di atas transformasi skala layar. Panggil di dalam save()/restore(). */
  apply(ctx: CanvasRenderingContext2D): void {
    const halfW = LOGICAL_WIDTH / 2 / this.zoom;
    const halfH = LOGICAL_HEIGHT / 2 / this.zoom;
    const cx = clamp(this.x, halfW, LOGICAL_WIDTH - halfW);
    const cy = clamp(this.y, halfH, LOGICAL_HEIGHT - halfH);
    ctx.translate(LOGICAL_WIDTH / 2, LOGICAL_HEIGHT / 2);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-cx, -cy);
  }
}
