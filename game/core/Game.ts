import { AIController } from "../ai/AIController";
import { FLOOR_Y, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants";
import { aiProfileForRound } from "../data/ai";
import { CHARACTERS } from "../data/characters";
import { DEFAULT_KEYMAPS, PAUSE_KEY } from "../data/keymaps";
import { KO_SLOWMO_UPDATES, MATCH } from "../data/match";
import { weaponIdForRound } from "../data/weapons";
import { Fighter } from "../entities/Fighter";
import { ArenaRenderer } from "../render/ArenaRenderer";
import { DebugRenderer } from "../render/DebugRenderer";
import { HudRenderer } from "../render/HudRenderer";
import type { Banner } from "../render/HudRenderer";
import { StickmanRenderer } from "../render/StickmanRenderer";
import type { GameStateId, MatchResult, PlayerMatchStats, RoundOutcome } from "../types";
import { loadSave } from "../../lib/storage";
import { Camera } from "./Camera";
import { Input } from "./Input";
import { Loop } from "./Loop";
import { Match } from "./Match";
import { StateMachine } from "./StateMachine";
import { Clock } from "./Time";
import { World } from "./World";

/** Penghubung ke UI React (menu jeda dan layar hasil berada di luar canvas). */
export interface GameCallbacks {
  onPauseChange?: (paused: boolean) => void;
  /** Dipanggil dengan hasil saat pertandingan selesai, dan null saat pertandingan baru dimulai. */
  onMatchEnd?: (result: MatchResult | null) => void;
}

const START_X = { p1: 430, p2: 850 } as const;

/**
 * Mode satu pemain: P1 dikendalikan keyboard, P2 adalah CPU (AIController).
 * Ronde 1 tangan kosong, ronde 2 pedang, ronde 3 tombak (data/weapons.ts).
 *
 * Pengendali utama game: memegang canvas, loop, input, kamera, dan state machine game.
 * Semua transisi state diatur di sini (GDD Bagian 6.2):
 * BOOT -> ROUND_START -> FIGHTING -> ROUND_END -> (ROUND_START | MATCH_RESULT), dengan PAUSED dari FIGHTING.
 */
export class Game {
  private readonly ctx: CanvasRenderingContext2D;
  private readonly clock = new Clock();
  private readonly input = new Input();
  private readonly camera = new Camera();
  private readonly loop: Loop;
  private readonly machine: StateMachine<GameStateId, Game>;

  private readonly arena: ArenaRenderer;
  private readonly stickmen = new StickmanRenderer();
  private readonly hud = new HudRenderer();
  private readonly debugRenderer = new DebugRenderer();

  private readonly world = new World(
    new Fighter("p1", CHARACTERS.blade, START_X.p1, 1),
    new Fighter("p2", CHARACTERS.brawler, START_X.p2, -1),
  );
  private readonly p1 = this.world.p1;
  private readonly p2 = this.world.p2;
  private readonly ai = new AIController(aiProfileForRound(1));
  private readonly match: Match;

  private roundOutcome: RoundOutcome | null = null;
  private fightBannerLeft = 0;
  private slowMoActive = false;
  private debug = false;

  private fps = 0;
  private ups = 0;
  /** Skala dari koordinat logis (1280x720) ke piksel kanvas. */
  private viewScale = 1;
  private resizeObserver: ResizeObserver | null = null;
  private destroyed = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly container: HTMLElement,
    private readonly callbacks: GameCallbacks = {},
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Browser tidak mendukung Canvas 2D.");
    this.ctx = ctx;
    this.arena = new ArenaRenderer(ctx);
    this.match = new Match(loadSave().settings.roundTime, MATCH.roundsToWin);

    this.machine = new StateMachine<GameStateId, Game>(this)
      .add("BOOT", {
        update: (g) => g.beginMatch(),
      })
      .add("ROUND_START", {
        enter: (g) => g.enterRoundStart(),
        update: (g) => g.updateRoundStart(),
      })
      .add("FIGHTING", {
        update: (g) => g.updateFighting(),
      })
      .add("PAUSED", {
        enter: (g) => g.callbacks.onPauseChange?.(true),
        exit: (g) => g.callbacks.onPauseChange?.(false),
        update: (g) => {
          if (g.input.justPressed(PAUSE_KEY)) g.machine.change("FIGHTING");
        },
      })
      .add("ROUND_END", {
        enter: (g) => g.enterRoundEnd(),
        update: (g) => g.updateRoundEnd(),
        exit: (g) => {
          g.clock.timeScale = 1;
        },
      })
      .add("MATCH_RESULT", {
        enter: (g) => g.enterMatchResult(),
        update: (g) => g.updateIdleWorld(),
      });
    this.machine.change("BOOT");

    this.loop = new Loop(this.clock, {
      update: () => this.step(),
      render: (alpha) => this.render(alpha),
      onStats: (fps, ups) => {
        this.fps = fps;
        this.ups = ups;
      },
    });
  }

  start(): void {
    this.input.attach();
    document.addEventListener("visibilitychange", this.handleVisibility);
    window.addEventListener("resize", this.resize);
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(this.container);
    this.resize();
    this.loop.start();
  }

  /** Membersihkan semua listener dan loop. Aman dipanggil lebih dari sekali. */
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.loop.stop();
    this.input.detach();
    document.removeEventListener("visibilitychange", this.handleVisibility);
    window.removeEventListener("resize", this.resize);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  // ---------- Perintah dari UI ----------

  /** Melanjutkan dari jeda. */
  resume(): void {
    if (this.machine.current === "PAUSED") this.machine.change("FIGHTING");
  }

  /** Mengulang pertandingan dari ronde 1. */
  restartMatch(): void {
    this.beginMatch();
  }

  // ---------- Logika (60 kali per detik) ----------

  private step(): void {
    this.clock.tick();
    if (this.input.justPressed("KeyH")) this.debug = !this.debug;
    this.machine.update();
    this.input.endFrame();
  }

  private beginMatch(): void {
    this.match.reset();
    this.p1.resetStats();
    this.p2.resetStats();
    this.callbacks.onMatchEnd?.(null);
    this.machine.change("ROUND_START");
  }

  private enterRoundStart(): void {
    this.p1.reset(START_X.p1, 1);
    this.p2.reset(START_X.p2, -1);
    // Senjata dan tingkat kesulitan CPU mengikuti nomor ronde.
    const weaponId = weaponIdForRound(this.match.round);
    this.p1.equip(weaponId);
    this.p2.equip(weaponId);
    this.ai.setProfile(aiProfileForRound(this.match.round));
    this.ai.reset();
    this.world.hitstop = 0;
    this.clock.timeScale = 1;
    this.camera.reset();
    this.match.startRound();
    this.roundOutcome = null;
    this.fightBannerLeft = 0;
    this.slowMoActive = false;
    this.hud.resetLag(this.p1, this.p2);
  }

  /** Hitung mundur: pemain belum bisa bergerak, tapi stickman tetap bernapas. */
  private updateRoundStart(): void {
    this.updateIdleWorld();
    if (this.machine.framesInState >= MATCH.introFrames + MATCH.countdownStep * 3) {
      this.fightBannerLeft = MATCH.fightBannerFrames;
      this.machine.change("FIGHTING");
    }
  }

  private updateFighting(): void {
    if (this.input.justPressed(PAUSE_KEY)) {
      this.machine.change("PAUSED");
      return;
    }
    this.input.readControls(DEFAULT_KEYMAPS.p1, this.p1.controls);
    this.ai.update(this.p2, this.p1);

    // Timer ikut membeku saat hitstop.
    if (this.world.hitstop === 0) this.match.timerFrames = Math.max(0, this.match.timerFrames - 1);
    this.world.step();
    this.hud.update(this.p1, this.p2);
    if (this.fightBannerLeft > 0) this.fightBannerLeft--;

    if (this.p1.isKo || this.p2.isKo || this.match.timerFrames === 0) {
      this.machine.change("ROUND_END");
    }
  }

  private enterRoundEnd(): void {
    this.roundOutcome = this.match.resolveRound(this.p1, this.p2);
    this.p1.clearControls();
    this.p2.clearControls();

    if (this.roundOutcome.reason === "ko") {
      // Slow motion dan zoom ke arah fighter yang KO.
      this.clock.timeScale = MATCH.koSlowMo.scale;
      this.slowMoActive = true;
      const down = [this.p1, this.p2].filter((f) => f.isKo);
      const x = down.reduce((sum, f) => sum + f.x, 0) / down.length;
      this.camera.focus(x, FLOOR_Y - 120, MATCH.koZoom);
    }
  }

  private updateRoundEnd(): void {
    this.updateIdleWorld();
    const frame = this.machine.framesInState;

    if (this.slowMoActive && frame >= KO_SLOWMO_UPDATES) {
      this.clock.timeScale = 1;
      this.slowMoActive = false;
    }
    if (frame === MATCH.victoryAtFrame) this.celebrate();
    if (frame >= MATCH.roundEndFrames) {
      if (this.match.winner) {
        this.machine.change("MATCH_RESULT");
      } else {
        this.match.round++;
        this.machine.change("ROUND_START");
      }
    }
  }

  /** Pemenang ronde merayakan. Yang kalah karena waktu habis tertunduk. */
  private celebrate(): void {
    const outcome = this.roundOutcome;
    if (!outcome || !outcome.winner) return;
    const winner = outcome.winner === "p1" ? this.p1 : this.p2;
    const loser = outcome.winner === "p1" ? this.p2 : this.p1;
    winner.enterVictory();
    loser.enterDefeat();
  }

  private enterMatchResult(): void {
    const winner = this.match.winner;
    if (!winner) return;
    this.clock.timeScale = 1;
    const result: MatchResult = {
      winner,
      rounds: this.match.round,
      p1: this.playerStats(this.p1),
      p2: this.playerStats(this.p2),
    };
    this.callbacks.onMatchEnd?.(result);
  }

  private playerStats(f: Fighter): PlayerMatchStats {
    const { attacks, hits, damageDealt, maxCombo } = f.stats;
    return {
      name: f.character.name,
      roundsWon: this.match.wins[f.id],
      damageDealt: Math.round(damageDealt),
      maxCombo,
      accuracy: attacks > 0 ? Math.min(100, Math.round((hits / attacks) * 100)) : 0,
    };
  }

  /** Dunia berjalan tanpa input pemain (hitung mundur, akhir ronde, layar hasil). */
  private updateIdleWorld(): void {
    this.p1.clearControls();
    this.p2.clearControls();
    this.world.step();
    this.hud.update(this.p1, this.p2);
  }

  // ---------- Render ----------

  private render(alpha: number): void {
    const ctx = this.ctx;
    // Saat jeda logika berhenti, jadi tampilkan posisi terbaru tanpa interpolasi.
    const visualAlpha = this.machine.current === "PAUSED" ? 1 : alpha;

    this.p1.updateVisual(visualAlpha);
    this.p2.updateVisual(visualAlpha);
    this.camera.update();

    ctx.setTransform(this.viewScale, 0, 0, this.viewScale, 0, 0);

    ctx.save();
    this.camera.apply(ctx);
    this.arena.draw(ctx, this.debug);
    for (const fighter of [this.p1, this.p2]) {
      this.stickmen.drawShadow(ctx, fighter.renderX, FLOOR_Y, FLOOR_Y - fighter.renderY);
    }
    for (const fighter of [this.p1, this.p2]) {
      // Kebal (dash, bangun) ditandai dengan tubuh setengah transparan.
      ctx.globalAlpha = fighter.invincibleFrames > 0 ? 0.45 : 1;
      // Saat hitstop, yang terkena bergetar sedikit agar pukulan terasa.
      const shaking = this.world.hitstop > 0 && fighter.machine.current !== "attack";
      const jitter = shaking ? (this.clock.frame % 2 === 0 ? 2 : -2) : 0;
      if (jitter !== 0) ctx.translate(jitter, 0);
      this.stickmen.draw(ctx, fighter.skeleton, fighter.style, this.clock.frame, fighter.weapon);
      if (jitter !== 0) ctx.translate(-jitter, 0);
    }
    ctx.globalAlpha = 1;
    if (this.debug) this.debugRenderer.drawBoxes(ctx, [this.p1, this.p2]);
    ctx.restore();

    this.hud.drawHud(ctx, this.p1, this.p2, {
      seconds: this.match.secondsLeft,
      wins: this.match.wins,
      roundsToWin: this.match.roundsToWin,
      frame: this.clock.frame,
      weaponName: this.p1.weapon?.name ?? "Tangan Kosong",
    });
    this.hud.drawCombo(ctx, this.p2.comboHits, "left");
    this.hud.drawCombo(ctx, this.p1.comboHits, "right");

    const banner = this.currentBanner();
    if (banner) this.hud.drawBanner(ctx, banner);
    if (this.machine.current === "ROUND_START") this.hud.drawHints(ctx, this.p1.weapon?.name ?? null);

    this.hud.drawFps(ctx, this.fps);
    if (this.debug) {
      this.hud.drawDebug(ctx, {
        fps: this.fps,
        ups: this.ups,
        state: this.machine.current,
        frame: this.clock.frame,
        keys: this.input.downCodes,
        p1State: this.p1.machine.current,
        p2State: this.p2.machine.current,
      });
    }
    if (this.machine.current === "PAUSED") this.hud.drawDim(ctx);
  }

  /** Banner yang sedang tampil: RONDE N, 3, 2, 1, FIGHT!, atau hasil ronde. */
  private currentBanner(): Banner | null {
    const frame = this.machine.framesInState;
    switch (this.machine.current) {
      case "ROUND_START": {
        if (frame < MATCH.introFrames) {
          const weapon = this.p1.weapon;
          return {
            text: `RONDE ${this.match.round}`,
            age: frame,
            color: "#22d3ee",
            sub: weapon ? `SENJATA: ${weapon.name.toUpperCase()}` : "TANGAN KOSONG",
          };
        }
        const since = frame - MATCH.introFrames;
        const number = 3 - Math.floor(since / MATCH.countdownStep);
        return { text: String(Math.max(1, number)), age: since % MATCH.countdownStep, color: "#e2e8f0" };
      }
      case "FIGHTING":
        if (this.fightBannerLeft === 0) return null;
        return { text: "FIGHT!", age: MATCH.fightBannerFrames - this.fightBannerLeft, color: "#fb923c" };
      case "ROUND_END": {
        const outcome = this.roundOutcome;
        if (!outcome) return null;
        const winner = outcome.winner === "p1" ? this.p1 : outcome.winner === "p2" ? this.p2 : null;
        const text = outcome.reason === "ko" ? "K.O." : winner ? "WAKTU HABIS" : "SERI";
        const sub = winner ? (winner === this.p1 ? "KAMU MENANG RONDE" : "CPU MENANG RONDE") : "SERI, ADA RONDE TAMBAHAN";
        return { text, age: frame, color: outcome.reason === "ko" ? "#f87171" : "#fbbf24", sub };
      }
      default:
        return null;
    }
  }

  // ---------- Layar ----------

  /** Menjaga rasio 16:9 (letterbox) dan menajamkan kanvas sesuai devicePixelRatio (GDD Bagian 6.1). */
  private readonly resize = (): void => {
    const availableW = this.container.clientWidth;
    const availableH = this.container.clientHeight;
    if (availableW === 0 || availableH === 0) return;

    const fit = Math.min(availableW / LOGICAL_WIDTH, availableH / LOGICAL_HEIGHT);
    const cssW = Math.floor(LOGICAL_WIDTH * fit);
    const cssH = Math.floor(LOGICAL_HEIGHT * fit);
    const dpr = window.devicePixelRatio || 1;

    this.canvas.style.width = `${cssW}px`;
    this.canvas.style.height = `${cssH}px`;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.viewScale = this.canvas.width / LOGICAL_WIDTH;
  };

  /** Tab disembunyikan: otomatis jeda dan lepas semua tombol agar tidak ada tombol "tersangkut". */
  private readonly handleVisibility = (): void => {
    if (!document.hidden) return;
    this.input.reset();
    if (this.machine.current === "FIGHTING") this.machine.change("PAUSED");
  };
}
