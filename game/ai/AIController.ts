import { clearControlState } from "../core/Input";
import { COMBAT } from "../data/combat";
import { MOVEMENT } from "../data/movement";
import type { Fighter } from "../entities/Fighter";
import type { AIProfile, FighterState, MoveData } from "../types";

/** Sumber angka acak 0..1. Bisa diganti pembangkit berbenih agar perilaku AI bisa diuji berulang. */
export type Rng = () => number;

/** Setengah lebar hurtbox lawan: serangan mengenai bila ujung hitbox melewati tepi badan lawan. */
const BODY_HALF = 22;
/** Hurtbox jongkok setinggi 92 px: hitbox yang seluruhnya di atas garis ini tidak mengenai yang menunduk. */
const CROUCH_HURTBOX_TOP = -92;

type Intent = "wait" | "approach" | "retreat" | "block" | "duck" | "dashIn" | "jumpIn";

const GROUND_STATES: ReadonlySet<FighterState> = new Set<FighterState>(["idle", "walk", "crouch", "block"]);

/** Jarak (dari tengah badan) sampai serangan ini masih bisa mengenai lawan. */
function reachOf(move: MoveData): number {
  return move.hitbox.x + move.hitbox.w + BODY_HALF;
}

/**
 * Otak CPU. Tidak menyentuh fisika atau combat: AI hanya mengisi `controls` Fighter dengan
 * tombol virtual yang sama dengan yang dipakai pemain (GDD Bagian 11), sehingga semua aturan
 * (stamina, cooldown, buffer, blok) berlaku sama untuk pemain dan CPU.
 *
 * Cara kerja, tiap update logika:
 * 1. Amati lawan. Serangan lawan yang berbahaya baru "terlihat" setelah `reactionFrames`.
 * 2. Reaksi: memblok atau menunduk (hanya mempan terhadap serangan tinggi).
 * 3. Hukum: serang balik saat lawan recovery.
 * 4. Rantai: sambung combo setelah hit mengenai.
 * 5. Keputusan taktis: mendekat, menjaga jarak, menyerang, dash, melompat, atau menunggu.
 */
export class AIController {
  private intent: Intent = "wait";
  private intentLeft = 0;
  private attackCooldown = 0;

  // Pengamatan serangan lawan
  private threat: MoveData | null = null;
  private threatFrames = 0;
  private reacted = false;
  private punishRolled = false;
  private seenMove: MoveData | null = null;
  private seenFrame = 0;

  // Rantai serangan sendiri
  private ownMove: MoveData | null = null;
  private ownFrame = 0;
  private chainRolled = false;

  private airAttacked = false;

  constructor(
    private profile: AIProfile,
    private readonly rng: Rng = Math.random,
  ) {}

  setProfile(profile: AIProfile): void {
    this.profile = profile;
  }

  /** Mengosongkan ingatan AI (awal ronde). */
  reset(): void {
    this.intent = "wait";
    this.intentLeft = 0;
    this.attackCooldown = 20;
    this.threat = null;
    this.threatFrames = 0;
    this.reacted = false;
    this.punishRolled = false;
    this.seenMove = null;
    this.seenFrame = 0;
    this.ownMove = null;
    this.ownFrame = 0;
    this.chainRolled = false;
    this.airAttacked = false;
  }

  /** Satu update logika. Isi `self.controls` sebelum World.step() dipanggil. */
  update(self: Fighter, opp: Fighter): void {
    const c = self.controls;
    clearControlState(c);
    if (this.attackCooldown > 0) this.attackCooldown--;
    if (this.intentLeft > 0) this.intentLeft--;

    const dx = opp.x - self.x;
    const dist = Math.abs(dx);
    const toward = dx >= 0 ? 1 : -1;
    this.observe(opp, dist);

    const state = self.machine.current;

    if (state === "attack") {
      this.chain(self);
      return;
    }
    if (state === "jump" || state === "fall") {
      this.airTick(self, dist, toward);
      return;
    }
    if (state === null || !GROUND_STATES.has(state)) return;
    this.airAttacked = false;

    this.reactToThreat(opp);

    // Menghukum lawan yang sedang recovery.
    if (this.canPunish(opp, dist) && !this.punishRolled) {
      this.punishRolled = true;
      if (this.rng() < this.profile.punishChance && this.attack(self, opp, dist, true)) {
        this.intent = "wait";
        this.intentLeft = 4;
        return;
      }
    }

    if (this.intentLeft <= 0) this.decide(self, opp, dist);
    this.execute(self, toward);
  }

  // ---------- Pengamatan ----------

  /** Mencatat serangan lawan yang sedang berbahaya dan sudah berapa frame terlihat. */
  private observe(opp: Fighter, dist: number): void {
    const move = opp.move;
    if (opp.machine.current !== "attack" || !move) {
      this.threat = null;
      this.threatFrames = 0;
      this.reacted = false;
      this.punishRolled = false;
      this.seenMove = null;
      this.seenFrame = 0;
      return;
    }
    // Serangan baru: serangan berbeda (rantai) atau frame serangan kembali ke awal.
    if (move !== this.seenMove || opp.attackFrame < this.seenFrame) {
      this.threatFrames = 0;
      this.reacted = false;
      this.punishRolled = false;
    }
    this.seenMove = move;
    this.seenFrame = opp.attackFrame;

    const dangerous = opp.attackFrame < move.startup + move.active && dist <= reachOf(move) + 30;
    this.threat = dangerous ? move : null;
    this.threatFrames = dangerous ? this.threatFrames + 1 : 0;
  }

  private reactToThreat(opp: Fighter): void {
    const move = this.threat;
    if (!move || this.reacted || this.threatFrames < this.profile.reactionFrames) return;
    this.reacted = true;
    if (this.rng() >= this.profile.blockChance) return;

    const canDuck = move.hitbox.y + move.hitbox.h <= CROUCH_HURTBOX_TOP - 1;
    const remaining = move.startup + move.active - opp.attackFrame + 10;
    this.setIntent(canDuck && this.rng() < 0.4 ? "duck" : "block", remaining);
  }

  private canPunish(opp: Fighter, dist: number): boolean {
    const move = opp.move;
    if (opp.machine.current !== "attack" || !move) return false;
    const total = move.startup + move.active + move.recovery;
    const inRecovery = opp.attackFrame >= move.startup + move.active && opp.attackFrame < total - 3;
    return inRecovery && dist <= 85;
  }

  // ---------- Rantai dan serangan udara ----------

  /** Menyambung combo (P, P, K) bila hit mengenai, dengan peluang comboChance. */
  private chain(self: Fighter): void {
    const move = self.move;
    if (!move) return;
    if (move !== this.ownMove || self.attackFrame < this.ownFrame) this.chainRolled = false;
    this.ownMove = move;
    this.ownFrame = self.attackFrame;

    if (!move.chain || !self.hasHit || self.chainWindow === 0 || this.chainRolled) return;
    this.chainRolled = true;
    if (this.rng() >= this.profile.comboChance) return;
    const buttons = (Object.keys(move.chain) as ("light" | "kick")[]).filter((b) => move.chain?.[b]);
    if (buttons.length === 0) return;
    self.controls.pressed[buttons[Math.floor(this.rng() * buttons.length)]] = true;
  }

  /** Di udara: terus melaju ke arah lawan dan memukul sekali bila sudah dekat. */
  private airTick(self: Fighter, dist: number, toward: number): void {
    this.hold(self, toward);
    if (!this.airAttacked && dist < 110) {
      self.controls.pressed.light = true;
      this.airAttacked = true;
    }
  }

  // ---------- Keputusan ----------

  private setIntent(intent: Intent, frames: number): void {
    this.intent = intent;
    this.intentLeft = Math.max(1, Math.round(frames));
  }

  private randomFrames(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  /** Memilih niat berikutnya (dipanggil saat niat sebelumnya habis). */
  private decide(self: Fighter, opp: Fighter, dist: number): void {
    const p = this.profile;
    const r = this.rng;
    const range = self.weapon ? reachOf(self.moves.heavy) : reachOf(self.moves.kick);

    // Lawan tergeletak atau baru bangun (kebal): jangan buang serangan. Dekati dan tunggu.
    if (opp.isDown || opp.machine.current === "getup") {
      if (dist > 110) this.setIntent("approach", 10);
      else this.setIntent("wait", 10);
      return;
    }

    // Stamina menipis: diam sejenak agar pulih (stamina tidak pulih saat memblok).
    if (self.stamina < 20) {
      this.setIntent("wait", this.randomFrames(18, 30));
      return;
    }

    if (dist > range + 70) {
      const canDash = self.dashCooldown === 0 && self.stamina >= MOVEMENT.dash.staminaCost + 20;
      const roll = r();
      if (canDash && dist > 220 && roll < 0.3 * p.aggression) this.setIntent("dashIn", 1);
      else if (dist > 170 && dist < 330 && roll > 0.9) this.setIntent("jumpIn", 1);
      else this.setIntent("approach", this.randomFrames(12, 30));
      return;
    }

    if (dist > range) {
      this.setIntent("approach", this.randomFrames(5, 12));
      return;
    }

    // Dalam jangkauan: menyerang, mundur menjaga jarak, bertahan, atau menunggu.
    if (this.attackCooldown === 0 && r() < 0.35 + p.aggression * 0.6 && this.attack(self, opp, dist, false)) {
      this.setIntent("wait", 4);
      return;
    }
    const roll = r();
    if (roll < 0.35) this.setIntent("retreat", this.randomFrames(8, 20));
    else if (roll < 0.55) this.setIntent("block", this.randomFrames(12, 26));
    else this.setIntent("wait", this.randomFrames(6, 14));
  }

  /**
   * Memilih satu serangan yang mengenai pada jarak ini lalu menekan tombolnya.
   * @param fast true = hanya serangan cepat (untuk menghukum)
   * @returns false bila tidak ada serangan yang cocok
   */
  private attack(self: Fighter, opp: Fighter, dist: number, fast: boolean): boolean {
    const c = self.controls;
    const m = self.moves;
    // Margin kecil agar CPU tidak menyerang tepat di ujung jangkauan.
    const inReach = (move: MoveData): boolean => dist <= reachOf(move) - 6;
    const oppCrouching = opp.machine.current === "crouch";

    if (!fast && self.rage >= COMBAT.rageMax && inReach(m.special)) {
      c.pressed.special = true;
      this.attackCooldown = 40;
      return true;
    }

    const options: [string, number][] = [];
    // Pukulan dan senjata melewati kepala lawan yang menunduk, jadi dilewati.
    if (!oppCrouching && inReach(m.light1)) options.push(["light", 3]);
    if (self.stamina >= m.kick.staminaCost && inReach(m.kick)) options.push(["kick", fast ? 3 : 2]);
    if (!fast) {
      if (!oppCrouching && self.weapon && self.stamina >= m.heavy.staminaCost && inReach(m.heavy)) {
        options.push(["heavy", dist > reachOf(m.light1) ? 5 : 1]);
      }
      if (oppCrouching && self.stamina >= m.sweep.staminaCost && inReach(m.sweep)) options.push(["sweep", 4]);
    }
    if (options.length === 0) return false;

    const total = options.reduce((sum, [, weight]) => sum + weight, 0);
    let pick = this.rng() * total;
    let chosen = options[0][0];
    for (const [name, weight] of options) {
      pick -= weight;
      if (pick <= 0) {
        chosen = name;
        break;
      }
    }

    if (chosen === "sweep") {
      c.pressed.kick = true;
      c.down.down = true;
    } else {
      c.pressed[chosen as "light" | "kick" | "heavy"] = true;
    }
    const aggression = this.profile.aggression;
    this.attackCooldown = Math.round(40 - 28 * aggression) + this.randomFrames(0, 10);
    return true;
  }

  // ---------- Eksekusi niat ----------

  /** Menekan tombol arah: 1 = kanan, -1 = kiri. */
  private hold(self: Fighter, dir: number): void {
    self.controls.down.right = dir > 0;
    self.controls.down.left = dir < 0;
  }

  private execute(self: Fighter, toward: number): void {
    const c = self.controls;
    switch (this.intent) {
      case "approach":
        this.hold(self, toward);
        break;
      case "retreat":
      case "block":
        // Menahan arah menjauhi lawan = memblok (dan berjalan mundur pelan).
        this.hold(self, -toward);
        break;
      case "duck":
        c.down.down = true;
        break;
      case "dashIn":
        this.hold(self, toward);
        c.pressed.dash = true;
        this.setIntent("approach", 6);
        break;
      case "jumpIn":
        this.hold(self, toward);
        c.pressed.up = true;
        this.setIntent("wait", 4);
        break;
      case "wait":
        break;
    }
  }
}
