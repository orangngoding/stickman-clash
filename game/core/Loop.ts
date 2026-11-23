import { FIXED_DT, MAX_FRAME_TIME } from "../constants";
import type { Clock } from "./Time";

export interface LoopCallbacks {
  /** Dipanggil tepat 60 kali per detik (timestep tetap). */
  update: () => void;
  /** Dipanggil sekali per frame layar. alpha (0..1) = sisa waktu di accumulator, untuk interpolasi. */
  render: (alpha: number) => void;
  /** Dipanggil kira-kira tiap 0.5 detik dengan statistik. */
  onStats?: (fps: number, ups: number) => void;
}

/** Game loop timestep tetap dengan accumulator (GDD Bagian 6.1). */
export class Loop {
  private running = false;
  private rafId = 0;
  private lastTime = 0;
  private accumulator = 0;

  private statTime = 0;
  private statFrames = 0;
  private statUpdates = 0;

  constructor(
    private readonly clock: Clock,
    private readonly callbacks: LoopCallbacks,
  ) {}

  start(): void {
    if (this.running) return;
    this.running = true;
    this.resetTiming();
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    document.removeEventListener("visibilitychange", this.handleVisibility);
  }

  private resetTiming(): void {
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.statTime = 0;
    this.statFrames = 0;
    this.statUpdates = 0;
  }

  private readonly handleVisibility = (): void => {
    if (!this.running) return;
    cancelAnimationFrame(this.rafId);
    if (!document.hidden) {
      // Kembali dari tab lain: mulai timing dari nol supaya tidak ada lonjakan dt.
      this.resetTiming();
      this.rafId = requestAnimationFrame(this.tick);
    }
  };

  private readonly tick = (now: number): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.tick);

    const rawDt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    const frameTime = Math.min(rawDt, MAX_FRAME_TIME);

    this.accumulator += frameTime * this.clock.timeScale;
    while (this.accumulator >= FIXED_DT) {
      this.callbacks.update();
      this.accumulator -= FIXED_DT;
      this.statUpdates++;
    }

    this.callbacks.render(this.accumulator / FIXED_DT);

    this.statFrames++;
    this.statTime += rawDt;
    if (this.statTime >= 0.5) {
      this.callbacks.onStats?.(this.statFrames / this.statTime, this.statUpdates / this.statTime);
      this.statTime = 0;
      this.statFrames = 0;
      this.statUpdates = 0;
    }
  };
}
