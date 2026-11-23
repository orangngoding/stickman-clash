import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants";
import { clamp, easeOutQuad, lerp } from "../core/math";
import { COMBAT } from "../data/combat";
import type { Fighter } from "../entities/Fighter";
import type { FighterState, GameStateId, PlayerId } from "../types";

const BAR_WIDTH = 500;
const BAR_MARGIN = 60;
const HP_Y = 34;
const HP_H = 24;
/** Bar kuning tertinggal menunggu sejenak sebelum menyusut (frame logika). */
const LAG_HOLD = 24;
const LAG_SPEED = 0.008;
/** Label sisi layar: P1 adalah pemain, P2 adalah CPU. */
const SIDE_LABEL: Record<PlayerId, string> = { p1: "KAMU", p2: "CPU" };

export interface DebugInfo {
  fps: number;
  ups: number;
  state: GameStateId | null;
  frame: number;
  keys: ReadonlySet<string>;
  p1State: FighterState | null;
  p2State: FighterState | null;
}

export interface HudInfo {
  seconds: number;
  wins: Record<PlayerId, number>;
  roundsToWin: number;
  /** Penghitung frame untuk animasi berkedip. */
  frame: number;
  /** Senjata ronde ini (ditampilkan di bawah timer). */
  weaponName: string;
}

export interface Banner {
  text: string;
  /** Umur banner dalam frame logika, untuk animasi muncul. */
  age: number;
  color: string;
  sub?: string;
}

/**
 * HUD yang digambar di canvas: bar HP dengan bar susut kuning, stamina, Rage, nama, titik
 * kemenangan ronde, timer, penghitung combo, dan banner (RONDE, 3-2-1, FIGHT!, K.O.).
 */
export class HudRenderer {
  private readonly lag: Record<PlayerId, number> = { p1: 1, p2: 1 };
  private readonly prev: Record<PlayerId, number> = { p1: 1, p2: 1 };
  private readonly hold: Record<PlayerId, number> = { p1: 0, p2: 0 };

  /** Mengembalikan bar susut ke kondisi penuh (awal ronde). */
  resetLag(p1: Fighter, p2: Fighter): void {
    for (const [key, f] of [["p1", p1], ["p2", p2]] as const) {
      const ratio = f.hp / f.character.maxHp;
      this.lag[key] = ratio;
      this.prev[key] = ratio;
      this.hold[key] = 0;
    }
  }

  /** Dipanggil tiap update logika. */
  update(p1: Fighter, p2: Fighter): void {
    this.updateOne("p1", p1);
    this.updateOne("p2", p2);
  }

  private updateOne(key: PlayerId, f: Fighter): void {
    const ratio = f.hp / f.character.maxHp;
    if (ratio < this.prev[key]) this.hold[key] = LAG_HOLD;
    this.prev[key] = ratio;

    if (ratio >= this.lag[key]) {
      this.lag[key] = ratio;
      return;
    }
    if (this.hold[key] > 0) {
      this.hold[key]--;
      return;
    }
    this.lag[key] = Math.max(ratio, this.lag[key] - LAG_SPEED);
  }

  // ---------- HUD pertarungan ----------

  drawHud(ctx: CanvasRenderingContext2D, p1: Fighter, p2: Fighter, info: HudInfo): void {
    this.drawSide(ctx, p1, "p1", info);
    this.drawSide(ctx, p2, "p2", info);
    this.drawTimer(ctx, info);

    // Senjata ronde ini di bawah timer.
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = info.weaponName === "Tangan Kosong" ? "#94a3b8" : "#fbbf24";
    ctx.fillText(info.weaponName.toUpperCase(), LOGICAL_WIDTH / 2, 106);
  }

  private drawSide(ctx: CanvasRenderingContext2D, f: Fighter, key: PlayerId, info: HudInfo): void {
    // P1 di kiri: sisa bar menempel ke tengah layar. P2 di kanan: sama, simetris.
    const leftSide = key === "p1";
    const x = leftSide ? BAR_MARGIN : LOGICAL_WIDTH - BAR_MARGIN - BAR_WIDTH;
    const hpRatio = clamp(f.hp / f.character.maxHp, 0, 1);

    // Nama
    ctx.font = "bold 18px system-ui, sans-serif";
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = leftSide ? "left" : "right";
    ctx.fillStyle = f.style.body;
    ctx.fillText(`${SIDE_LABEL[key]}  ${f.character.name.toUpperCase()}`, leftSide ? x : x + BAR_WIDTH, 26);

    // HP: latar, bar susut kuning, lalu bar utama
    this.bar(ctx, x, HP_Y, BAR_WIDTH, HP_H, 1, "rgba(2, 6, 23, 0.75)", leftSide);
    this.bar(ctx, x, HP_Y, BAR_WIDTH, HP_H, this.lag[key], "#facc15", leftSide);
    this.bar(ctx, x, HP_Y, BAR_WIDTH, HP_H, hpRatio, hpColor(hpRatio), leftSide);
    ctx.strokeStyle = "rgba(226, 232, 240, 0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, HP_Y, BAR_WIDTH, HP_H);

    // Stamina (tipis). Kuning bila kurang dari biaya dash.
    const staminaRatio = clamp(f.stamina / COMBAT.staminaMax, 0, 1);
    this.bar(ctx, x, 62, BAR_WIDTH, 6, 1, "rgba(2, 6, 23, 0.75)", leftSide);
    this.bar(ctx, x, 62, BAR_WIDTH, 6, staminaRatio, f.stamina < 20 ? "#f59e0b" : "#38bdf8", leftSide);

    // Rage. Berdenyut oranye saat penuh.
    const rageRatio = clamp(f.rage / COMBAT.rageMax, 0, 1);
    const rageFull = rageRatio >= 1;
    const pulse = rageFull ? 0.65 + 0.35 * Math.sin(info.frame * 0.25) : 1;
    this.bar(ctx, x, 72, BAR_WIDTH, 8, 1, "rgba(2, 6, 23, 0.75)", leftSide);
    ctx.globalAlpha = pulse;
    this.bar(ctx, x, 72, BAR_WIDTH, 8, rageRatio, rageFull ? "#fb923c" : "#a855f7", leftSide);
    ctx.globalAlpha = 1;
    if (rageFull) {
      ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillStyle = "#fb923c";
      ctx.textAlign = leftSide ? "left" : "right";
      ctx.fillText("SPESIAL SIAP", leftSide ? x : x + BAR_WIDTH, 98);
    }

    // Titik kemenangan ronde, di sisi tengah layar
    for (let i = 0; i < info.roundsToWin; i++) {
      const dotX = leftSide ? x + BAR_WIDTH - 8 - i * 20 : x + 8 + i * 20;
      ctx.beginPath();
      ctx.arc(dotX, 96, 6, 0, Math.PI * 2);
      if (i < info.wins[key]) {
        ctx.fillStyle = "#22d3ee";
        ctx.fill();
      } else {
        ctx.strokeStyle = "rgba(226, 232, 240, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
  }

  /** Bar horizontal yang menempel ke sisi tengah layar: P1 rata kanan, P2 rata kiri. */
  private bar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    ratio: number,
    color: string,
    leftSide: boolean,
  ): void {
    const fillW = w * clamp(ratio, 0, 1);
    ctx.fillStyle = color;
    ctx.fillRect(leftSide ? x + w - fillW : x, y, fillW, h);
  }

  private drawTimer(ctx: CanvasRenderingContext2D, info: HudInfo): void {
    const w = 104;
    const h = 58;
    const x = LOGICAL_WIDTH / 2 - w / 2;
    const y = 26;
    const urgent = info.seconds <= 10;
    const flash = urgent && Math.floor(info.frame / 15) % 2 === 0;

    ctx.fillStyle = "rgba(2, 6, 23, 0.8)";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = urgent ? "#f87171" : "#22d3ee";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 40px system-ui, sans-serif";
    ctx.fillStyle = flash ? "#fecaca" : urgent ? "#f87171" : "#e2e8f0";
    ctx.fillText(String(info.seconds), LOGICAL_WIDTH / 2, y + h / 2 + 2);
  }

  /** Penghitung combo di sisi penyerang (korban menerima 2 hit atau lebih beruntun). */
  drawCombo(ctx: CanvasRenderingContext2D, hits: number, side: "left" | "right"): void {
    if (hits < 2) return;
    ctx.textAlign = side === "left" ? "left" : "right";
    ctx.textBaseline = "alphabetic";
    ctx.lineWidth = 6;
    ctx.strokeStyle = "rgba(2, 6, 23, 0.8)";
    ctx.fillStyle = "#fde047";
    ctx.font = "bold 48px system-ui, sans-serif";
    const x = side === "left" ? BAR_MARGIN : LOGICAL_WIDTH - BAR_MARGIN;
    ctx.strokeText(`${hits} HIT`, x, 170);
    ctx.fillText(`${hits} HIT`, x, 170);
  }

  // ---------- Banner dan layar ----------

  /** Teks besar di tengah layar yang membesar lalu menetap (RONDE 1, 3, FIGHT!, K.O.). */
  drawBanner(ctx: CanvasRenderingContext2D, banner: Banner): void {
    const t = clamp(banner.age / 10, 0, 1);
    const scale = lerp(1.7, 1, easeOutQuad(t));
    ctx.save();
    ctx.globalAlpha = clamp(banner.age / 6, 0, 1);
    ctx.translate(LOGICAL_WIDTH / 2, 300);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 104px system-ui, sans-serif";
    ctx.lineWidth = 12;
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(2, 6, 23, 0.9)";
    ctx.strokeText(banner.text, 0, 0);
    ctx.fillStyle = banner.color;
    ctx.fillText(banner.text, 0, 0);
    ctx.restore();

    if (banner.sub) {
      ctx.globalAlpha = clamp((banner.age - 20) / 10, 0, 1);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "bold 28px system-ui, sans-serif";
      ctx.fillStyle = "#e2e8f0";
      ctx.fillText(banner.sub, LOGICAL_WIDTH / 2, 372);
      ctx.globalAlpha = 1;
    }
  }

  /** Petunjuk kontrol singkat di awal pertandingan. */
  drawHints(ctx: CanvasRenderingContext2D, weaponName: string | null): void {
    ctx.font = "15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
    ctx.fillText(
      "A/D jalan  W lompat  S jongkok  U dash  J pukul  K tendang  I spesial (Rage penuh)     Blok: tahan arah mundur",
      LOGICAL_WIDTH / 2,
      LOGICAL_HEIGHT - 52,
    );
    const weaponLine = weaponName
      ? `L: serang pakai ${weaponName.toLowerCase()}`
      : "L: serangan senjata aktif mulai ronde 2";
    ctx.fillText(`${weaponLine}     Esc: jeda   H: mode uji`, LOGICAL_WIDTH / 2, LOGICAL_HEIGHT - 28);
  }

  /** Redup untuk latar menu jeda (menu sendiri berupa komponen React). */
  drawDim(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = "rgba(2, 6, 23, 0.6)";
    ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  }

  drawFps(ctx: CanvasRenderingContext2D, fps: number): void {
    ctx.font = "13px ui-monospace, Menlo, Consolas, monospace";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "rgba(148, 163, 184, 0.8)";
    ctx.fillText(`${fps.toFixed(0)} FPS`, 14, LOGICAL_HEIGHT - 12);
  }

  /** Panel info uji (aktif dengan tombol H bersama kotak tabrakan). */
  drawDebug(ctx: CanvasRenderingContext2D, info: DebugInfo): void {
    ctx.font = "15px ui-monospace, Menlo, Consolas, monospace";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(2, 6, 23, 0.7)";
    ctx.fillRect(12, 120, 300, 100);

    ctx.fillStyle = "#e2e8f0";
    ctx.fillText(`FPS ${info.fps.toFixed(0)}  UPS ${info.ups.toFixed(0)}`, 22, 128);
    ctx.fillText(`${info.state ?? "-"}  frame ${info.frame}`, 22, 150);
    ctx.fillText(`P1 ${info.p1State ?? "-"}  P2 ${info.p2State ?? "-"}`, 22, 172);
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(`Tombol ${[...info.keys].join(" ") || "-"}`.slice(0, 34), 22, 194);
  }
}

function hpColor(ratio: number): string {
  if (ratio > 0.5) return "#4ade80";
  if (ratio > 0.25) return "#fbbf24";
  return "#f87171";
}
