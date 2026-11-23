import type { EventBus, GameEvent } from "../core/Events";
import type { WeaponKind } from "../data/weapons";
import { audio } from "./AudioEngine";
import type { SfxName } from "./Sfx";
import { fightTrackForRound } from "./tracks";

/**
 * Penerjemah peristiwa game menjadi suara dan musik. Logika game (World, Fighter, CombatSystem)
 * hanya memancarkan GameEvent, jadi semua keputusan "bunyi apa untuk kejadian apa" ada di file ini.
 */
export class GameAudio {
  private readonly off: () => void;
  private round = 1;

  constructor(bus: EventBus) {
    this.off = bus.on((event) => this.handle(event));
  }

  /** Berhenti mendengarkan dan mematikan musik pertandingan (menu tetap boleh berjalan). */
  dispose(): void {
    this.off();
    audio.music.setMuffled(false);
    if (audio.music.currentId !== "menu") audio.music.stop(0.25);
  }

  private handle(e: GameEvent): void {
    const { sfx, music } = audio;
    switch (e.type) {
      // ----- Alur pertandingan -----
      case "roundStart":
        this.round = e.round;
        music.setMuffled(false);
        music.stop(0.25);
        sfx.play("roundStart");
        break;
      case "countdown":
        sfx.play(e.number === 3 ? "count3" : e.number === 2 ? "count2" : "count1");
        break;
      case "fight":
        sfx.play("fight");
        music.play(fightTrackForRound(this.round));
        break;
      case "timerTick":
        sfx.play(e.seconds <= 3 ? "timerUrgent" : "timerTick");
        break;
      case "lowHp":
        sfx.play("lowHp");
        break;
      case "roundEnd":
        music.stop(0.5);
        sfx.play(e.reason === "ko" ? "koSlowmo" : "timeUp");
        break;
      case "roundResult":
        // Bila ronde ini menentukan pemenang pertandingan, jingle besar dimainkan oleh matchEnd.
        if (!e.matchOver) music.play(e.winner === "p1" ? "roundWin" : e.winner === "p2" ? "roundLose" : "draw");
        break;
      case "matchEnd":
        music.play(e.winner === "p1" ? "matchWin" : "matchLose", {
          onEnd: () => music.play("menu", { fadeIn: 1.5 }),
        });
        break;
      case "pause":
        sfx.play("pause");
        music.setMuffled(true);
        break;
      case "resume":
        sfx.play("resume");
        music.setMuffled(false);
        break;

      // ----- Gerak -----
      case "jump":
        sfx.play("jump", { x: e.x });
        break;
      case "dash":
        sfx.play("dash", { x: e.x });
        break;
      case "step":
        sfx.play("step", { x: e.x, vol: e.fighter === "p1" ? 1 : 0.7 });
        break;
      case "land":
        sfx.play(e.hard ? "landHard" : "land", { x: e.x });
        break;
      case "getUp":
        sfx.play("getUp", { x: e.x });
        break;
      case "rageFull":
        // Rage lawan terdengar lebih rendah dan pelan sebagai peringatan.
        sfx.play("rageFull", e.fighter === "p1" ? { x: e.x } : { x: e.x, pitch: 0.7, vol: 0.7 });
        break;
      case "specialStart":
        sfx.play("specialCharge", { x: e.x });
        break;

      // ----- Serangan -----
      case "swing":
        sfx.play(swingSound(e.moveId, e.weaponKind), {
          x: e.x,
          pitch: e.moveId === "light2" ? 1.12 : 1,
        });
        break;
      case "hit":
        this.playHit(e);
        break;
    }
  }

  private playHit(e: Extract<GameEvent, { type: "hit" }>): void {
    const { sfx } = audio;
    const opts = { x: e.x };

    if (e.blocked) {
      // Senjata beradu dengan logam, tangan dan kaki "buk" biasa.
      const metal = e.weaponKind === "sword" || e.weaponKind === "spear" || e.weaponKind === "daggers";
      sfx.play(e.moveId === "heavy" && metal ? "hitBlockMetal" : "hitBlock", opts);
      if (e.guardBreak) sfx.play("guardBreak", { ...opts, delay: 0.02 });
      return;
    }

    // Combo makin tinggi, benturan sedikit makin tinggi nadanya.
    const pitch = 1 + Math.min(e.combo - 1, 5) * 0.04;
    sfx.play(hitSound(e.moveId, e.weaponKind), { ...opts, pitch, vol: e.ko ? 0.7 : 1 });
    if (e.ko) sfx.play("hitKo", opts);
    // Dentingan kecil untuk combo pemain (3 hit ke atas).
    if (e.attacker === "p1" && e.combo >= 3) {
      sfx.play("comboDing", { x: e.x, pitch: 1 + (Math.min(e.combo, 8) - 3) * 0.12, delay: 0.05 });
    }
  }
}

function swingSound(moveId: string, weapon: WeaponKind | null): SfxName {
  switch (moveId) {
    case "kick":
      return "swingKick";
    case "sweep":
      return "swingSweep";
    case "jumpAttack":
      return "swingAir";
    case "special":
      return "swingSpecial";
    case "heavy":
      return weapon === "spear" ? "swingSpear" : weapon === "fists" || weapon === null ? "swingLight" : "swingSword";
    default:
      return "swingLight";
  }
}

function hitSound(moveId: string, weapon: WeaponKind | null): SfxName {
  switch (moveId) {
    case "kick":
      return "hitKick";
    case "sweep":
      return "hitSweep";
    case "jumpAttack":
      return "hitAir";
    case "special":
      return "hitSpecial";
    case "heavy":
      return weapon === "spear" ? "hitSpear" : weapon === "fists" || weapon === null ? "hitPunch" : "hitSword";
    default:
      return "hitPunch";
  }
}
