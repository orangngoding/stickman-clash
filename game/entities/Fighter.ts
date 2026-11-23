import {
  AIR_FRICTION,
  FLOOR_Y,
  GROUND_FRICTION,
  PUSHBOX_HEIGHT_CROUCH,
  PUSHBOX_HEIGHT_STAND,
  SKELETON,
} from "../constants";
import { clamp, easeOutQuad, lerp } from "../core/math";
import { clearControlState, createControlState } from "../core/Input";
import type { EventBus } from "../core/Events";
import { StateMachine } from "../core/StateMachine";
import { ANIMATIONS } from "../data/animations";
import { HURTBOX_CROUCH, HURTBOX_STAND } from "../data/boxes";
import { COMBAT } from "../data/combat";
import { getMoves } from "../data/moves";
import { DASH_VELOCITIES, MOVEMENT } from "../data/movement";
import { WEAPONS } from "../data/weapons";
import type { WeaponData } from "../data/weapons";
import { copyPose, createPose, lerpPose, sampleAnimation } from "../render/pose";
import { shadeColor } from "../render/colors";
import { Skeleton } from "../render/Skeleton";
import type { StickmanStyle } from "../render/StickmanRenderer";
import type {
  AnimId,
  AttackButton,
  CharacterData,
  Facing,
  FighterState,
  MoveData,
  PlayerId,
  Rect,
} from "../types";

/** Kecepatan jalan acuan (Blade). Animasi jalan mengikuti kecepatan sebenarnya agar kaki tidak "meluncur". */
const REFERENCE_SPEED = 5.0;
const DEFAULT_BLEND = 6;
/** Jarak jalan (piksel) antar bunyi langkah kaki. */
const STEP_DISTANCE = 60;

/**
 * Satu petarung. Pemain dan musuh AI memakai kelas yang sama, hanya beda sumber `controls`.
 * State machine hanya mengatur NIAT gerak (mengubah vx, vy, state). Posisi dipindahkan oleh
 * PhysicsSystem, tumpang tindih diselesaikan CollisionSystem, dan hit diproses CombatSystem.
 */
export class Fighter {
  x: number;
  /** Posisi kaki. FLOOR_Y = di lantai. */
  y = FLOOR_Y;
  vx = 0;
  vy = 0;
  grounded = true;
  facing: Facing;

  // Statistik
  hp: number;
  stamina: number = COMBAT.staminaMax;
  rage = 0;

  /** Sisa frame kebal (dash, bangun dari knockdown). */
  invincibleFrames = 0;
  /** Sisa frame sebelum dash bisa dipakai lagi. */
  dashCooldown = 0;
  private dashFrame = 0;
  private dashDirection: Facing = 1;

  // Combat
  /** Jumlah hit beruntun yang DITERIMA fighter ini (untuk pengurangan damage dan penghitung combo). */
  comboHits = 0;
  /** Senjata yang dipegang (null = tangan kosong, serangan senjata tidak bisa dipakai). */
  weapon: WeaponData | null = null;
  /** Daftar serangan sesuai senjata yang dipegang. */
  moves: Record<string, MoveData>;
  /** Serangan yang sedang berjalan (state attack). */
  move: MoveData | null = null;
  /** Frame ke-berapa serangan saat ini (0 = frame pertama startup). */
  attackFrame = 0;
  hasHit = false;
  /** Sisa frame jendela rantai setelah hit mengenai. */
  chainWindow = 0;
  /** Sisa frame hitstun, knockdown, atau bangun. */
  stunLeft = 0;
  /** Sisa frame blockstun (tidak bisa beraksi tapi tetap memblok). */
  blockstunLeft = 0;
  /** Terkena hit saat di udara: jatuh lalu knockdown begitu mendarat. */
  private airHit = false;
  private pendingMove: MoveData | null = null;
  private buffered: AttackButton | null = null;
  private bufferLeft = 0;

  /** Statistik satu pertandingan (untuk layar hasil). Tidak ikut di-reset tiap ronde. */
  readonly stats = { damageDealt: 0, hits: 0, attacks: 0, maxCombo: 0 };

  /** Posisi pada update sebelumnya, untuk interpolasi render. */
  private prevX: number;
  private prevY = FLOOR_Y;

  /** Penerima peristiwa (suara). Diisi Game; null = tidak ada yang mendengarkan. */
  events: EventBus | null = null;
  /** Jarak jalan sejak bunyi langkah terakhir. */
  private stepDistance = 0;

  /** Tombol virtual. Diisi Input (pemain) atau AI. */
  readonly controls = createControlState();
  readonly machine: StateMachine<FighterState, Fighter>;
  readonly style: StickmanStyle;
  readonly skeleton = new Skeleton();

  // Animasi
  private anim: AnimId = "idle";
  private animFrame = 0;
  /** Frame animasi per update (negatif untuk memutar mundur, pecahan untuk mempercepat). */
  private animStep = 1;

  private readonly pose = createPose();
  private readonly fromPose = createPose();
  private readonly targetPose = createPose();
  private blendLeft = 0;
  private blendTotal = DEFAULT_BLEND;

  /** Posisi hasil interpolasi, diisi updateVisual(). */
  renderX: number;
  renderY = FLOOR_Y;

  constructor(
    readonly id: PlayerId,
    readonly character: CharacterData,
    startX: number,
    facing: Facing,
  ) {
    this.x = startX;
    this.prevX = startX;
    this.renderX = startX;
    this.facing = facing;
    this.hp = character.maxHp;
    this.moves = getMoves(null);
    this.style = {
      body: character.colors.body,
      accent: character.colors.accent,
      far: shadeColor(character.colors.body, 0.65),
    };

    this.machine = new StateMachine<FighterState, Fighter>(this)
      .add("idle", {
        enter: (f) => f.setAnim("idle", 1),
        update: (f) => {
          f.groundMove(0);
          f.checkGroundActions();
        },
      })
      .add("walk", {
        enter: (f) => {
          f.stepDistance = 0;
          f.setAnim("walk", 1);
        },
        update: (f) => {
          const dir = f.moveDirection();
          f.groundMove(dir);
          if (f.checkGroundActions()) return;
          if (dir === 0 && Math.abs(f.vx) < MOVEMENT.stopThreshold) {
            f.vx = 0;
            f.machine.change("idle");
            return;
          }
          // Maju (searah hadap) memutar animasi ke depan, mundur memutarnya terbalik.
          f.animStep = (Math.sign(f.vx) * f.facing * Math.abs(f.vx)) / REFERENCE_SPEED;
          // Bunyi langkah kaki tiap beberapa langkah jalan.
          f.stepDistance += Math.abs(f.vx);
          if (f.stepDistance >= STEP_DISTANCE) {
            f.stepDistance -= STEP_DISTANCE;
            f.emitAction("step");
          }
        },
      })
      .add("crouch", {
        enter: (f) => f.setAnim("crouch", 1),
        update: (f) => {
          f.groundMove(0);
          f.checkGroundActions();
        },
      })
      .add("block", {
        enter: (f) => f.setAnim("block", 1, 2),
        update: (f) => {
          // Blok bisa berjalan mundur pelan. Saat blockstun, tidak bisa beraksi.
          const back = f.isHoldingBack();
          f.groundMove(back && f.blockstunLeft === 0 ? -f.facing : 0, COMBAT.blockWalkRatio);
          f.checkGroundActions();
        },
      })
      .add("jump", {
        enter: (f) => {
          f.vy = -f.character.jumpPower;
          f.grounded = false;
          f.setAnim("jump", 1);
          f.emitAction("jump");
        },
        update: (f) => {
          f.airMove(f.moveDirection());
          if (f.tryAirAttack()) return;
          if (f.vy >= 0) f.machine.change("fall");
        },
      })
      .add("fall", {
        enter: (f) => f.setAnim("fall", 1),
        update: (f) => {
          f.airMove(f.moveDirection());
          if (f.tryAirAttack()) return;
          if (f.grounded) f.machine.change("idle");
        },
      })
      .add("dash", {
        enter: (f) => {
          // Arah dash: tombol arah yang ditahan, atau maju bila tidak ada.
          const held = f.moveDirection();
          f.dashDirection = held !== 0 ? (held as Facing) : f.facing;
          f.dashFrame = 0;
          f.invincibleFrames = MOVEMENT.dash.invincibleFrames;
          f.dashCooldown = MOVEMENT.dash.cooldown;
          f.stamina -= MOVEMENT.dash.staminaCost;
          f.setAnim(f.dashDirection === f.facing ? "dash" : "backdash", 1);
          f.vx = f.dashDirection * DASH_VELOCITIES[f.dashFrame++];
          f.emitAction("dash");
        },
        update: (f) => {
          if (f.dashFrame >= MOVEMENT.dash.frames) {
            f.vx = 0;
            f.machine.change("idle");
            return;
          }
          f.vx = f.dashDirection * DASH_VELOCITIES[f.dashFrame++];
        },
      })
      .add("attack", {
        enter: (f) => {
          const move = f.pendingMove;
          if (!move) throw new Error("Masuk state attack tanpa serangan");
          f.pendingMove = null;
          f.move = move;
          f.attackFrame = 0;
          f.hasHit = false;
          f.chainWindow = 0;
          f.setAnim(move.anim, 1, 2, true);
          if (move.id === "special") f.emitAction("specialStart");
        },
        update: (f) => f.updateAttack(),
        exit: (f) => {
          f.move = null;
        },
      })
      .add("hitstun", {
        enter: (f) => f.setAnim("hitstun", 1, 1),
        update: (f) => {
          if (f.grounded) f.groundMove(0);
          else f.airMove(0);
          if (f.grounded && f.airHit) {
            f.airHit = false;
            f.enterKnockdown(COMBAT.getUpFrames * 2, 0);
            return;
          }
          if (f.stunLeft > 0) f.stunLeft--;
          if (f.stunLeft === 0 && f.grounded) f.recover();
        },
      })
      .add("knockdown", {
        enter: (f) => f.setAnim("knockdown", 1, 2),
        update: (f) => {
          if (f.grounded) f.groundMove(0);
          else f.airMove(0);
          if (f.stunLeft > 0) f.stunLeft--;
          if (f.stunLeft === 0 && f.grounded) f.machine.change("getup");
        },
      })
      .add("getup", {
        enter: (f) => {
          f.setAnim("getUp", 1, 2);
          f.emitAction("getUp");
          f.stunLeft = COMBAT.getUpFrames;
          f.invincibleFrames = COMBAT.getUpInvincible;
          f.comboHits = 0;
        },
        update: (f) => {
          f.groundMove(0);
          if (--f.stunLeft <= 0) f.recover();
        },
      })
      .add("ko", {
        enter: (f) => f.setAnim("ko", 1, 2),
        update: (f) => {
          if (f.grounded) f.groundMove(0);
          else f.airMove(0);
        },
      })
      .add("victory", {
        enter: (f) => f.setAnim("victory", 1, 5),
        update: (f) => {
          if (f.grounded) f.groundMove(0);
          else f.airMove(0);
        },
      })
      .add("defeat", {
        enter: (f) => f.setAnim("defeat", 1, 8),
        update: (f) => {
          if (f.grounded) f.groundMove(0);
          else f.airMove(0);
        },
      });
    this.machine.change("idle");
    this.updateVisual(1);
  }

  // ---------- Informasi untuk sistem lain ----------

  /** Postur rendah: jongkok atau sedang menyapu. Hurtbox dan pushbox ikut lebih pendek. */
  private get isLow(): boolean {
    return this.machine.current === "crouch" || (this.machine.current === "attack" && this.move?.anim === "sweep");
  }

  /** Tinggi pushbox saat ini (lebih pendek saat postur rendah). */
  get pushboxHeight(): number {
    return this.isLow ? PUSHBOX_HEIGHT_CROUCH : PUSHBOX_HEIGHT_STAND;
  }

  /** Sedang tergeletak (knockdown atau KO): tidak mendorong dan tidak bisa dipukul. */
  get isDown(): boolean {
    const s = this.machine.current;
    return s === "knockdown" || s === "ko";
  }

  get isKo(): boolean {
    return this.machine.current === "ko";
  }

  /** Bisa terkena serangan? Tidak saat kebal, tergeletak, atau sedang bangun. */
  isHittable(): boolean {
    const s = this.machine.current;
    return this.invincibleFrames === 0 && s !== "knockdown" && s !== "getup" && s !== "ko";
  }

  /** Memblok: di tanah dan sedang berdiri memblok (tahan mundur) atau jongkok (tahan bawah). */
  isBlocking(): boolean {
    const s = this.machine.current;
    return this.grounded && (s === "block" || s === "crouch");
  }

  getHurtbox(out: Rect): void {
    const box = this.isLow ? HURTBOX_CROUCH : HURTBOX_STAND;
    out.x = this.x + box.x;
    out.y = this.y + box.y;
    out.w = box.w;
    out.h = box.h;
  }

  /** Mengisi `out` dengan hitbox dunia bila serangan sedang di fase active dan belum mengenai. */
  getActiveHitbox(out: Rect): boolean {
    const m = this.move;
    if (this.machine.current !== "attack" || !m || this.hasHit) return false;
    if (this.attackFrame < m.startup || this.attackFrame >= m.startup + m.active) return false;
    const box = m.hitbox;
    out.x = this.facing === 1 ? this.x + box.x : this.x - box.x - box.w;
    out.y = this.y + box.y;
    out.w = box.w;
    out.h = box.h;
    return true;
  }

  addRage(amount: number): void {
    const before = this.rage;
    this.rage = clamp(this.rage + amount, 0, COMBAT.rageMax);
    if (before < COMBAT.rageMax && this.rage >= COMBAT.rageMax) this.emitAction("rageFull");
  }

  /** Memancarkan peristiwa aksi sederhana (suara memakainya untuk lompat, dash, langkah, dll). */
  private emitAction(type: "jump" | "dash" | "step" | "getUp" | "rageFull" | "specialStart"): void {
    this.events?.emit({ type, fighter: this.id, x: this.x });
  }

  // ---------- Reaksi terkena serangan (dipanggil CombatSystem) ----------

  enterHitstun(frames: number, knockbackVx: number): void {
    this.airHit = !this.grounded;
    this.stunLeft = frames;
    this.vx = knockbackVx;
    this.blockstunLeft = 0;
    this.machine.change("hitstun");
  }

  enterKnockdown(frames: number, knockbackVx: number): void {
    this.airHit = false;
    this.stunLeft = frames;
    this.vx = knockbackVx;
    this.blockstunLeft = 0;
    if (this.grounded) {
      this.vy = -COMBAT.knockdownPop;
      this.grounded = false;
    }
    this.machine.change("knockdown");
  }

  enterKo(knockbackVx: number): void {
    this.airHit = false;
    this.vx = knockbackVx;
    this.blockstunLeft = 0;
    if (this.grounded) {
      this.vy = -COMBAT.koPop;
      this.grounded = false;
    }
    this.machine.change("ko");
  }

  /** Pemenang ronde merayakan. Tidak mengubah fighter yang sudah KO. */
  enterVictory(): void {
    if (this.isKo) return;
    this.blockstunLeft = 0;
    this.machine.change("victory");
  }

  /** Kalah karena waktu habis: tertunduk. Tidak mengubah fighter yang sudah KO. */
  enterDefeat(): void {
    if (this.isKo) return;
    this.blockstunLeft = 0;
    this.machine.change("defeat");
  }

  /** Memegang senjata (null = tangan kosong). Dipanggil di awal ronde. */
  equip(weaponId: string | null): void {
    this.weapon = weaponId ? (WEAPONS[weaponId] ?? null) : null;
    this.moves = getMoves(this.weapon);
  }

  /** Mengosongkan tombol virtual fighter ini. */
  clearControls(): void {
    clearControlState(this.controls);
  }

  /** Mengosongkan statistik pertandingan. */
  resetStats(): void {
    this.stats.damageDealt = 0;
    this.stats.hits = 0;
    this.stats.attacks = 0;
    this.stats.maxCombo = 0;
  }

  /** Stamina habis saat memblok: stun panjang tanpa perlindungan. */
  guardBreak(): void {
    this.enterHitstun(COMBAT.guardBreakStun, this.vx);
  }

  /** Kembali ke kondisi netral dan mengakhiri combo yang diterima. */
  private recover(): void {
    this.comboHits = 0;
    this.machine.change("idle");
    this.checkGroundActions();
  }

  /** Mengembalikan fighter ke kondisi awal ronde. Statistik pertandingan tetap. */
  reset(startX: number, facing: Facing): void {
    this.x = startX;
    this.prevX = startX;
    this.y = FLOOR_Y;
    this.prevY = FLOOR_Y;
    this.vx = 0;
    this.vy = 0;
    this.grounded = true;
    this.facing = facing;
    this.hp = this.character.maxHp;
    this.stamina = COMBAT.staminaMax;
    this.rage = 0;
    this.invincibleFrames = 0;
    this.dashCooldown = 0;
    this.comboHits = 0;
    this.move = null;
    this.pendingMove = null;
    this.hasHit = false;
    this.chainWindow = 0;
    this.stunLeft = 0;
    this.blockstunLeft = 0;
    this.airHit = false;
    this.buffered = null;
    this.bufferLeft = 0;
    this.stepDistance = 0;
    this.machine.change("idle");
  }

  // ---------- Update ----------

  /** Menyimpan tombol serang yang baru ditekan (input buffer). Dipanggil juga saat hitstop. */
  bufferInputs(): void {
    const p = this.controls.pressed;
    if (p.light) this.buffer("light");
    if (p.kick) this.buffer("kick");
    if (p.heavy) this.buffer("heavy");
    if (p.special) this.buffer("special");
  }

  /** Satu update logika (60 kali per detik). */
  update(opponent: Fighter): void {
    this.prevX = this.x;
    this.prevY = this.y;

    if (this.bufferLeft > 0 && --this.bufferLeft === 0) this.buffered = null;
    this.bufferInputs();

    // Menghadap lawan hanya di tanah dan tidak saat menyerang atau tergeletak.
    if (this.grounded && this.canTurn()) this.faceOpponent(opponent);

    if (this.dashCooldown > 0) this.dashCooldown--;
    if (this.invincibleFrames > 0) this.invincibleFrames--;
    if (this.blockstunLeft > 0) this.blockstunLeft--;

    this.machine.update();
    this.regenStamina();

    if (this.machine.current === "attack") {
      // Animasi serangan selalu sejalan dengan frame serangan.
      this.animFrame = this.attackFrame;
    } else {
      this.animFrame += this.animStep;
    }
    if (this.blendLeft > 0) this.blendLeft--;
  }

  /**
   * Menyiapkan pose dan skeleton untuk digambar.
   * @param alpha 0..1 posisi di antara update sebelumnya dan sekarang (interpolasi agar mulus di layar 144 Hz)
   */
  updateVisual(alpha: number): void {
    this.renderX = lerp(this.prevX, this.x, alpha);
    this.renderY = lerp(this.prevY, this.y, alpha);

    // animFrame sudah maju satu langkah di update terakhir, jadi mundur (1 - alpha) langkah.
    const sampleFrame = this.animFrame - this.animStep * (1 - alpha);
    sampleAnimation(ANIMATIONS[this.anim], sampleFrame, this.targetPose);

    if (this.blendLeft > 0) {
      const t = easeOutQuad(1 - this.blendLeft / this.blendTotal);
      lerpPose(this.fromPose, this.targetPose, t, this.pose);
    } else {
      copyPose(this.targetPose, this.pose);
    }

    // Garis kaki berada di tengah goresan, jadi naikkan setengah tebal garis agar tidak menembus lantai.
    this.skeleton.update(this.pose, this.facing, this.renderX, this.renderY - SKELETON.lineWidth / 2);
  }

  // ---------- Serangan ----------

  private updateAttack(): void {
    const m = this.move;
    if (!m) return;
    const activeEnd = m.startup + m.active;
    const total = activeEnd + m.recovery;

    // Serangan lompat menahan pose di udara dan baru menjalankan recovery setelah mendarat.
    const waitForLanding = m.landingRecovery === true && !this.grounded && this.attackFrame >= activeEnd;
    if (!waitForLanding) {
      this.attackFrame++;
      // Bunyi ayunan tepat saat fase active dimulai (saat serangan benar-benar keluar).
      if (this.attackFrame === m.startup) {
        this.events?.emit({
          type: "swing",
          fighter: this.id,
          x: this.x,
          moveId: m.id,
          weaponKind: this.weapon?.kind ?? null,
        });
      }
    }

    if (this.grounded) this.groundMove(0);
    else this.airMove(this.moveDirection());

    if (this.chainWindow > 0) this.chainWindow--;
    if (this.tryChain()) return;

    if (this.attackFrame >= total) {
      if (this.grounded) {
        this.machine.change("idle");
        this.checkGroundActions();
      } else {
        this.machine.change("fall");
      }
    }
  }

  /** Merantai serangan berikutnya (P, P, K) bila hit sudah mengenai dan masih dalam jendela rantai. */
  private tryChain(): boolean {
    const m = this.move;
    if (!m || !m.chain || !this.hasHit || this.chainWindow === 0) return false;
    if (this.buffered !== "light" && this.buffered !== "kick") return false;
    const nextId = m.chain[this.buffered];
    return nextId !== undefined && this.startAttack(this.moves[nextId]);
  }

  /** Memulai serangan. Gagal bila stamina kurang. */
  private startAttack(move: MoveData | undefined): boolean {
    if (!move || this.stamina < move.staminaCost) return false;
    this.stamina -= move.staminaCost;
    this.stats.attacks++;
    if (move.id === "special") this.rage = 0;
    this.pendingMove = move;
    this.buffered = null;
    this.bufferLeft = 0;
    this.machine.change("attack");
    return true;
  }

  /** Mencocokkan tombol yang tersimpan dengan serangan sesuai posisi (tanah). */
  private tryBufferedAttack(): boolean {
    const button = this.buffered;
    if (!button) return false;
    const moves = this.moves;
    switch (button) {
      case "light":
        return this.startAttack(moves.light1);
      case "kick":
        return this.startAttack(this.controls.down.down ? moves.sweep : moves.kick);
      case "heavy":
        // Serangan senjata hanya bisa bila memegang senjata (ronde 2 dan 3).
        return this.weapon !== null && this.startAttack(moves.heavy);
      case "special":
        return this.rage >= COMBAT.rageMax && this.startAttack(moves.special);
    }
  }

  /** Di udara, serangan ringan atau tendangan menjadi serangan lompat. */
  private tryAirAttack(): boolean {
    if (this.buffered !== "light" && this.buffered !== "kick") return false;
    return this.startAttack(this.moves.jumpAttack);
  }

  private buffer(button: AttackButton): void {
    this.buffered = button;
    this.bufferLeft = COMBAT.inputBuffer;
  }

  // ---------- Niat gerak (dipakai state) ----------

  /** -1 (kiri), 0 (diam), atau 1 (kanan). Kiri dan kanan sekaligus saling membatalkan. */
  private moveDirection(): number {
    return (this.controls.down.right ? 1 : 0) - (this.controls.down.left ? 1 : 0);
  }

  /** Menahan arah menjauhi lawan. */
  private isHoldingBack(): boolean {
    const dir = this.moveDirection();
    return dir !== 0 && dir === -this.facing;
  }

  /** Gerak di tanah: percepatan saat ada input, gesekan lantai saat tidak ada atau melebihi kecepatan maksimum. */
  private groundMove(dir: number, speedScale = 1): void {
    const maxSpeed = this.character.speed * speedScale;
    if (dir !== 0 && Math.abs(this.vx) <= maxSpeed) {
      const accel = maxSpeed * MOVEMENT.groundAccelRatio;
      this.vx = clamp(this.vx + dir * accel, -maxSpeed, maxSpeed);
    } else {
      this.vx *= GROUND_FRICTION;
      if (Math.abs(this.vx) < 0.05) this.vx = 0;
    }
  }

  /** Gerak di udara: kendali kecil saat ada input, gesekan udara saat tidak ada. */
  private airMove(dir: number): void {
    const maxSpeed = this.character.speed;
    if (dir !== 0) {
      const next = this.vx + dir * maxSpeed * MOVEMENT.airAccelRatio;
      // Boleh menambah kecepatan hanya sampai batas maksimum karakter.
      if (Math.abs(next) <= maxSpeed || Math.abs(next) < Math.abs(this.vx)) this.vx = next;
    } else {
      this.vx *= AIR_FRICTION;
    }
  }

  /**
   * Aksi yang bisa dimulai dari tanah: serang, lompat, dash, jongkok, blok, jalan.
   * Tidak ada aksi selama blockstun.
   * @returns true bila state berganti
   */
  private checkGroundActions(): boolean {
    if (this.blockstunLeft > 0) return false;
    const current = this.machine.current;
    const down = this.controls.down.down;

    if (this.tryBufferedAttack()) return true;

    if (this.controls.pressed.up && !down) {
      this.machine.change("jump");
      return true;
    }
    if (
      this.controls.pressed.dash &&
      !down &&
      this.dashCooldown === 0 &&
      this.stamina >= MOVEMENT.dash.staminaCost
    ) {
      this.machine.change("dash");
      return true;
    }
    if (down) {
      if (current === "crouch") return false;
      this.machine.change("crouch");
      return true;
    }
    if (this.isHoldingBack()) {
      if (current === "block") return false;
      this.machine.change("block");
      return true;
    }
    if (current === "crouch" || current === "block") {
      this.machine.change("idle");
      return true;
    }
    if (current === "idle" && this.moveDirection() !== 0) {
      this.machine.change("walk");
      return true;
    }
    return false;
  }

  /** Stamina pulih kecuali saat memblok, dash, atau menyerang. */
  private regenStamina(): void {
    const s = this.machine.current;
    if (s === "block" || s === "dash" || s === "attack" || this.blockstunLeft > 0) return;
    this.stamina = Math.min(COMBAT.staminaMax, this.stamina + COMBAT.staminaRegen);
  }

  private canTurn(): boolean {
    const s = this.machine.current;
    return s !== "attack" && s !== "knockdown" && s !== "getup" && s !== "ko";
  }

  /** Fighter menghadap lawan. */
  private faceOpponent(opponent: Fighter): void {
    if (opponent.x > this.x) this.facing = 1;
    else if (opponent.x < this.x) this.facing = -1;
  }

  private setAnim(id: AnimId, step: number, blend = DEFAULT_BLEND, restart = false): void {
    this.animStep = step;
    if (id === this.anim && !restart) return;
    // Crossfade dari pose yang sedang tampil agar peralihan animasi tidak "loncat".
    copyPose(this.pose, this.fromPose);
    this.anim = id;
    this.animFrame = 0;
    this.blendTotal = blend;
    this.blendLeft = blend;
  }
}
