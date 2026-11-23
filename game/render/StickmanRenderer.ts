import { SKELETON } from "../constants";
import { clamp } from "../core/math";
import type { WeaponData } from "../data/weapons";
import type { Skeleton } from "./Skeleton";
import type { Vec2 } from "../types";

export interface StickmanStyle {
  body: string;
  accent: string;
  /** Warna anggota badan yang jauh dari kamera (lebih gelap agar terasa ada kedalaman). */
  far: string;
}

/** Ukuran gambar senjata (piksel dari tangan). Dicocokkan dengan jangkauan hitbox di data/weapons.ts. */
const WEAPON_DRAW = {
  swordBlade: 60,
  spearBack: 34,
  spearShaft: 68,
  spearTip: 94,
} as const;

/** Menggambar stickman hanya dari garis dan lingkaran. Tidak ada sprite (GDD Bagian 8). */
export class StickmanRenderer {
  draw(
    ctx: CanvasRenderingContext2D,
    skeleton: Skeleton,
    style: StickmanStyle,
    frame: number,
    weapon: WeaponData | null = null,
  ): void {
    const j = skeleton.joints;

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = SKELETON.lineWidth;

    // Urutan gambar: sisi jauh, torso, sisi dekat, kepala.
    ctx.strokeStyle = style.far;
    this.chain(ctx, j.shoulder, j.elbowL, j.handL);
    this.chain(ctx, j.hip, j.kneeL, j.footL);

    ctx.strokeStyle = style.body;
    this.chain(ctx, j.hip, j.neck);
    this.chain(ctx, j.hip, j.kneeR, j.footR);

    // Kepala
    ctx.fillStyle = style.body;
    ctx.beginPath();
    ctx.arc(j.head.x, j.head.y, SKELETON.headRadius, 0, Math.PI * 2);
    ctx.fill();

    this.drawHeadband(ctx, skeleton, style, frame);

    ctx.strokeStyle = style.body;
    this.chain(ctx, j.shoulder, j.elbowR, j.handR);

    // Senjata dipegang tangan dekat kamera, searah lengan bawah, jadi ikut terayun bersama animasi serangan.
    if (weapon) this.drawWeapon(ctx, skeleton, style, weapon);
  }

  /** Senjata dari garis dan segitiga: pedang (bilah + pelindung) dan tombak (gagang + mata tombak). */
  private drawWeapon(
    ctx: CanvasRenderingContext2D,
    skeleton: Skeleton,
    style: StickmanStyle,
    weapon: WeaponData,
  ): void {
    const { elbowR, handR } = skeleton.joints;
    let dx = handR.x - elbowR.x;
    let dy = handR.y - elbowR.y;
    const length = Math.hypot(dx, dy) || 1;
    dx /= length;
    dy /= length;
    // Titik pada sumbu senjata: `t` piksel dari tangan (negatif = ke belakang tangan).
    const at = (t: number): Vec2 => ({ x: handR.x + dx * t, y: handR.y + dy * t });
    const nx = -dy;
    const ny = dx;
    const steel = "#e2e8f0";
    const wood = "#a16207";

    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (weapon.kind === "sword") {
      const grip0 = at(-12);
      const grip1 = at(7);
      const tip = at(WEAPON_DRAW.swordBlade);
      // Gagang
      ctx.strokeStyle = wood;
      ctx.lineWidth = 6;
      this.chain(ctx, grip0, grip1);
      // Bilah: garis gelap di bawah garis terang agar terlihat berkilau
      ctx.strokeStyle = "#475569";
      ctx.lineWidth = 7;
      this.chain(ctx, grip1, tip);
      ctx.strokeStyle = steel;
      ctx.lineWidth = 4;
      this.chain(ctx, grip1, tip);
      // Pelindung tangan
      ctx.strokeStyle = style.accent;
      ctx.lineWidth = 5;
      this.chain(ctx, { x: grip1.x + nx * 11, y: grip1.y + ny * 11 }, { x: grip1.x - nx * 11, y: grip1.y - ny * 11 });
    } else if (weapon.kind === "spear") {
      const back = at(-WEAPON_DRAW.spearBack);
      const neck = at(WEAPON_DRAW.spearShaft);
      const tip = at(WEAPON_DRAW.spearTip);
      ctx.strokeStyle = wood;
      ctx.lineWidth = 5;
      this.chain(ctx, back, neck);
      // Mata tombak
      ctx.fillStyle = steel;
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(neck.x + nx * 7, neck.y + ny * 7);
      ctx.lineTo(neck.x - nx * 7, neck.y - ny * 7);
      ctx.closePath();
      ctx.fill();
      // Rumbai berwarna aksen di bawah mata tombak
      const tassel = at(WEAPON_DRAW.spearShaft - 6);
      ctx.strokeStyle = style.accent;
      ctx.lineWidth = 4;
      this.chain(ctx, tassel, { x: tassel.x - dx * 12 + nx * 5, y: tassel.y - dy * 12 + ny * 5 + 5 });
    } else if (weapon.kind === "daggers") {
      const tip = at(26);
      ctx.strokeStyle = steel;
      ctx.lineWidth = 4;
      this.chain(ctx, at(4), tip);
    }

    ctx.lineWidth = SKELETON.lineWidth;
  }

  /** Bayangan lonjong di lantai, mengecil dan memudar saat fighter melayang. */
  drawShadow(ctx: CanvasRenderingContext2D, x: number, floorY: number, heightAboveFloor: number): void {
    const shrink = 1 - clamp(heightAboveFloor / 320, 0, 0.6);
    ctx.fillStyle = `rgba(0, 0, 0, ${0.35 * shrink})`;
    ctx.beginPath();
    ctx.ellipse(x, floorY + 2, 36 * shrink, 7 * shrink, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private chain(ctx: CanvasRenderingContext2D, ...points: Vec2[]): void {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  /** Ikat kepala berwarna aksen dengan dua ekor yang berkibar pelan. */
  private drawHeadband(
    ctx: CanvasRenderingContext2D,
    skeleton: Skeleton,
    style: StickmanStyle,
    frame: number,
  ): void {
    const { head } = skeleton.joints;
    const up = skeleton.headUp;
    const fwd = skeleton.headForward;
    const r = SKELETON.headRadius;

    const cx = head.x + up.x * 3;
    const cy = head.y + up.y * 3;
    const half = Math.sqrt(r * r - 9);

    const frontX = cx + fwd.x * half;
    const frontY = cy + fwd.y * half;
    const backX = cx - fwd.x * half;
    const backY = cy - fwd.y * half;

    ctx.strokeStyle = style.accent;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(frontX, frontY);
    ctx.lineTo(backX, backY);
    ctx.stroke();

    // Ekor ikat kepala, mengarah ke belakang kepala dan sedikit jatuh ke bawah.
    const wave = Math.sin(frame * 0.18);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(backX, backY);
    ctx.lineTo(backX - fwd.x * 14, backY - fwd.y * 14 + 4 + wave * 3);
    ctx.moveTo(backX, backY);
    ctx.lineTo(backX - fwd.x * 10, backY - fwd.y * 10 + 10 + wave * 2);
    ctx.stroke();

    ctx.lineWidth = SKELETON.lineWidth;
  }
}
