import type { AudioEngine } from "./AudioEngine";
import { playNoise, playTone } from "./synth";
import type { NoiseOpts, ToneOpts } from "./synth";

export type SfxName =
  // UI
  | "uiHover" | "uiClick" | "uiStart" | "uiBack" | "pause" | "resume"
  // Alur pertandingan
  | "roundStart" | "count3" | "count2" | "count1" | "fight" | "timerTick" | "timerUrgent" | "timeUp"
  | "lowHp" | "koSlowmo" | "rageFull" | "specialCharge"
  // Gerak
  | "jump" | "dash" | "step" | "land" | "landHard" | "getUp"
  // Ayunan serangan
  | "swingLight" | "swingKick" | "swingSweep" | "swingSword" | "swingSpear" | "swingAir" | "swingSpecial"
  // Terkena serangan
  | "hitPunch" | "hitKick" | "hitSweep" | "hitSword" | "hitSpear" | "hitAir" | "hitSpecial"
  | "hitBlock" | "hitBlockMetal" | "guardBreak" | "hitKo" | "comboDing";

export interface SfxOptions {
  /** Posisi x dunia (0..1280) untuk panning stereo. Tanpa ini suara di tengah. */
  x?: number;
  vol?: number;
  /** Pengali nada (1 = asli). */
  pitch?: number;
  /** Tunda sebelum bunyi (detik). */
  delay?: number;
}

/** Alat bantu resep: waktu dan nada sudah diurus, resep tinggal menyebut bunyinya. */
interface Kit {
  tone(o: ToneOpts): void;
  noise(o: NoiseOpts): void;
  rand(): number;
}
type Recipe = (k: Kit) => void;

const LOGICAL_CENTER = 640;

/** Jarak minimum antar bunyi yang sama (detik) agar tidak menumpuk jadi bising. */
const MIN_GAP: Partial<Record<SfxName, number>> = {
  uiHover: 0.05,
  step: 0.07,
  land: 0.06,
  timerTick: 0.3,
};

const RECIPES: Record<SfxName, Recipe> = {
  // ---------- UI ----------
  uiHover: (k) => k.tone({ freq: 1200, freqEnd: 1450, dur: 0.045, vol: 0.1 }),
  uiClick: (k) => {
    k.tone({ type: "triangle", freq: 440, dur: 0.06, vol: 0.25 });
    k.tone({ type: "triangle", freq: 660, at: 0.05, dur: 0.09, vol: 0.25 });
  },
  uiStart: (k) => {
    k.noise({ freq: 300, freqEnd: 3200, q: 1.2, dur: 0.5, vol: 0.25, attack: 0.15 });
    k.tone({ type: "sawtooth", freq: 220, freqEnd: 440, dur: 0.45, vol: 0.14, attack: 0.05 });
    k.tone({ type: "triangle", freq: 440, at: 0.15, dur: 0.5, vol: 0.22 });
    k.tone({ type: "triangle", freq: 554, at: 0.2, dur: 0.5, vol: 0.18 });
    k.tone({ type: "triangle", freq: 659, at: 0.25, dur: 0.55, vol: 0.18 });
  },
  uiBack: (k) => k.tone({ type: "triangle", freq: 520, freqEnd: 300, dur: 0.12, vol: 0.22 }),
  pause: (k) => {
    k.tone({ type: "triangle", freq: 600, dur: 0.08, vol: 0.22 });
    k.tone({ type: "triangle", freq: 400, at: 0.08, dur: 0.14, vol: 0.22 });
  },
  resume: (k) => {
    k.tone({ type: "triangle", freq: 400, dur: 0.08, vol: 0.22 });
    k.tone({ type: "triangle", freq: 600, at: 0.08, dur: 0.14, vol: 0.22 });
  },

  // ---------- Alur pertandingan ----------
  roundStart: (k) => {
    // Gong: beberapa harmonik tidak selaras yang meluruh lambat.
    [1, 2, 2.63, 3.5, 4.8].forEach((ratio, i) =>
      k.tone({ freq: 98 * ratio, dur: 1.8 - i * 0.2, vol: 0.28 / (i + 1), attack: 0.01 }),
    );
    k.noise({ filter: "lowpass", freq: 500, dur: 0.7, vol: 0.14, attack: 0.05 });
  },
  count3: (k) => countBeep(k, 523),
  count2: (k) => countBeep(k, 587),
  count1: (k) => countBeep(k, 659),
  fight: (k) => {
    k.noise({ freq: 400, freqEnd: 5000, q: 0.8, dur: 0.45, vol: 0.35, attack: 0.02 });
    k.tone({ type: "sawtooth", freq: 110, freqEnd: 440, dur: 0.35, vol: 0.2, attack: 0.02 });
    // Dentuman akor A minor.
    [220, 262, 330, 440].forEach((f) => k.tone({ type: "sawtooth", freq: f, at: 0.1, dur: 0.6, vol: 0.12 }));
    k.tone({ freq: 90, freqEnd: 35, at: 0.1, dur: 0.6, vol: 0.5 });
  },
  timerTick: (k) => k.tone({ type: "square", freq: 1000, dur: 0.04, vol: 0.1 }),
  timerUrgent: (k) => {
    k.tone({ type: "square", freq: 1500, dur: 0.07, vol: 0.16 });
    k.tone({ freq: 750, dur: 0.1, vol: 0.2 });
  },
  timeUp: (k) => {
    k.tone({ type: "sawtooth", freq: 140, dur: 0.4, vol: 0.28, attack: 0.01 });
    k.tone({ type: "sawtooth", freq: 140, at: 0.5, dur: 0.6, vol: 0.28, attack: 0.01 });
  },
  lowHp: (k) => {
    k.tone({ freq: 70, freqEnd: 50, dur: 0.12, vol: 0.6 });
    k.tone({ freq: 65, freqEnd: 45, at: 0.16, dur: 0.16, vol: 0.45 });
  },
  koSlowmo: (k) => {
    k.tone({ freq: 400, freqEnd: 35, dur: 1.2, vol: 0.32 });
    k.noise({ filter: "lowpass", freq: 1500, freqEnd: 150, dur: 1.0, vol: 0.2 });
  },
  rageFull: (k) => {
    [523, 659, 784, 1047].forEach((f, i) => k.tone({ type: "triangle", freq: f, at: i * 0.06, dur: 0.28, vol: 0.2 }));
    k.noise({ filter: "highpass", freq: 6000, dur: 0.3, vol: 0.08, attack: 0.05 });
  },
  specialCharge: (k) => {
    k.tone({ type: "sawtooth", freq: 120, freqEnd: 600, dur: 0.25, vol: 0.16, attack: 0.05 });
    k.noise({ freq: 500, freqEnd: 3000, dur: 0.25, vol: 0.15, attack: 0.08 });
    k.tone({ freq: 880, dur: 0.3, vol: 0.06, attack: 0.1 });
  },

  // ---------- Gerak ----------
  jump: (k) => {
    k.noise({ freq: 500, freqEnd: 1400, q: 1, dur: 0.12, vol: 0.12 });
    k.tone({ freq: 280, freqEnd: 520, dur: 0.1, vol: 0.08 });
  },
  dash: (k) => {
    k.noise({ freq: 700, freqEnd: 2600, dur: 0.16, vol: 0.2, attack: 0.02 });
    k.tone({ freq: 160, freqEnd: 70, dur: 0.14, vol: 0.15 });
  },
  step: (k) => {
    const v = 0.85 + k.rand() * 0.3;
    k.noise({ freq: 500 * v, q: 0.8, dur: 0.04, vol: 0.1 });
    k.tone({ freq: 110 * v, freqEnd: 70, dur: 0.05, vol: 0.09 });
  },
  land: (k) => {
    k.tone({ freq: 100, freqEnd: 55, dur: 0.08, vol: 0.22 });
    k.noise({ filter: "lowpass", freq: 500, dur: 0.05, vol: 0.12 });
  },
  landHard: (k) => {
    k.tone({ freq: 80, freqEnd: 35, dur: 0.16, vol: 0.45 });
    k.noise({ filter: "lowpass", freq: 350, dur: 0.14, vol: 0.3 });
  },
  getUp: (k) => {
    k.noise({ freq: 600, freqEnd: 1200, q: 0.7, dur: 0.18, vol: 0.1, attack: 0.06 });
    k.tone({ freq: 120, freqEnd: 80, at: 0.12, dur: 0.08, vol: 0.12 });
  },

  // ---------- Ayunan serangan ----------
  swingLight: (k) => k.noise({ freq: 2200, freqEnd: 900, q: 1.4, dur: 0.09, vol: 0.16, attack: 0.01 }),
  swingKick: (k) => {
    k.noise({ freq: 1500, freqEnd: 450, q: 1.2, dur: 0.14, vol: 0.2, attack: 0.02 });
    k.tone({ freq: 200, freqEnd: 100, dur: 0.1, vol: 0.06 });
  },
  swingSweep: (k) => k.noise({ freq: 900, freqEnd: 250, q: 1, dur: 0.2, vol: 0.22, attack: 0.04 }),
  swingSword: (k) => {
    k.noise({ freq: 3000, freqEnd: 7000, q: 2, dur: 0.22, vol: 0.2, attack: 0.02 });
    k.tone({ freq: 2400, freqEnd: 3600, dur: 0.18, vol: 0.04 });
  },
  swingSpear: (k) => {
    k.noise({ freq: 1200, freqEnd: 3200, q: 1.6, dur: 0.15, vol: 0.18, attack: 0.02 });
    k.tone({ freq: 600, freqEnd: 1800, dur: 0.12, vol: 0.05 });
  },
  swingAir: (k) => k.noise({ freq: 1800, freqEnd: 700, dur: 0.13, vol: 0.17 }),
  swingSpecial: (k) => {
    k.noise({ freq: 300, freqEnd: 2500, dur: 0.25, vol: 0.32, attack: 0.06 });
    k.tone({ type: "sawtooth", freq: 90, freqEnd: 400, dur: 0.2, vol: 0.12 });
  },

  // ---------- Terkena serangan ----------
  hitPunch: (k) => {
    k.tone({ freq: 180, freqEnd: 60, dur: 0.09, vol: 0.5 });
    k.noise({ filter: "lowpass", freq: 2000, dur: 0.05, vol: 0.3 });
  },
  hitKick: (k) => {
    k.tone({ freq: 130, freqEnd: 45, dur: 0.15, vol: 0.6 });
    k.noise({ filter: "lowpass", freq: 2500, dur: 0.07, vol: 0.35 });
  },
  hitSweep: (k) => {
    k.tone({ freq: 110, freqEnd: 40, dur: 0.18, vol: 0.55 });
    k.noise({ freq: 800, q: 1, dur: 0.15, vol: 0.25 });
  },
  hitSword: (k) => {
    k.noise({ freq: 4000, q: 1, dur: 0.05, vol: 0.35 });
    k.tone({ freq: 1900, dur: 0.35, vol: 0.12 });
    k.tone({ freq: 2870, dur: 0.28, vol: 0.08 });
    k.tone({ freq: 160, freqEnd: 60, dur: 0.12, vol: 0.35 });
  },
  hitSpear: (k) => {
    k.noise({ freq: 2800, q: 1.2, dur: 0.04, vol: 0.35 });
    k.tone({ freq: 200, freqEnd: 70, dur: 0.1, vol: 0.45 });
    k.tone({ type: "triangle", freq: 900, freqEnd: 400, dur: 0.08, vol: 0.1 });
  },
  hitAir: (k) => {
    k.tone({ freq: 170, freqEnd: 55, dur: 0.1, vol: 0.5 });
    k.noise({ filter: "lowpass", freq: 2200, dur: 0.06, vol: 0.3 });
  },
  hitSpecial: (k) => {
    k.tone({ freq: 95, freqEnd: 28, dur: 0.55, vol: 0.8 });
    k.noise({ filter: "lowpass", freq: 3500, freqEnd: 200, dur: 0.5, vol: 0.5 });
    k.noise({ freq: 5000, dur: 0.05, vol: 0.4 });
    k.tone({ freq: 1500, dur: 0.4, vol: 0.1 });
  },
  hitBlock: (k) => {
    k.tone({ type: "square", freq: 230, freqEnd: 120, dur: 0.06, vol: 0.14 });
    k.noise({ freq: 1400, q: 1, dur: 0.05, vol: 0.25 });
    k.tone({ freq: 140, freqEnd: 70, dur: 0.08, vol: 0.3 });
  },
  hitBlockMetal: (k) => {
    [1250, 1870, 2790].forEach((f, i) => k.tone({ freq: f, dur: 0.32 - i * 0.05, vol: 0.1 }));
    k.noise({ freq: 4500, dur: 0.04, vol: 0.3 });
    k.tone({ freq: 120, freqEnd: 60, dur: 0.08, vol: 0.25 });
  },
  guardBreak: (k) => {
    k.noise({ freq: 3000, freqEnd: 600, dur: 0.45, vol: 0.4 });
    for (let i = 0; i < 6; i++) {
      k.tone({ freq: 2500 + k.rand() * 3500, at: i * 0.03, dur: 0.15, vol: 0.08 });
    }
    k.tone({ freq: 100, freqEnd: 35, dur: 0.3, vol: 0.6 });
  },
  hitKo: (k) => {
    k.tone({ freq: 80, freqEnd: 25, dur: 0.8, vol: 0.9 });
    k.noise({ filter: "lowpass", freq: 4000, freqEnd: 150, dur: 0.7, vol: 0.55 });
    k.noise({ freq: 5000, dur: 0.06, vol: 0.4 });
    k.tone({ freq: 600, freqEnd: 100, dur: 0.5, vol: 0.15 });
  },
  comboDing: (k) => {
    k.tone({ freq: 880, dur: 0.18, vol: 0.14 });
    k.tone({ freq: 1760, at: 0.02, dur: 0.22, vol: 0.06 });
  },
};

function countBeep(k: Kit, freq: number): void {
  k.tone({ type: "square", freq, dur: 0.14, vol: 0.16 });
  k.tone({ freq: freq * 2, dur: 0.14, vol: 0.1 });
}

/** Pemutar efek suara. Semua bunyi dibuat saat dipanggil dari resep di atas. */
export class Sfx {
  private readonly lastPlayed = new Map<SfxName, number>();

  constructor(private readonly engine: AudioEngine) {}

  play(name: SfxName, options: SfxOptions = {}): void {
    const engine = this.engine;
    const graph = engine.graph;
    if (!graph || !engine.sfxAudible) return;
    const { ctx, noise, sfxBus } = graph;
    const t = ctx.currentTime + (options.delay ?? 0);

    const gap = MIN_GAP[name];
    if (gap !== undefined) {
      const last = this.lastPlayed.get(name) ?? -Infinity;
      if (t - last < gap) return;
      this.lastPlayed.set(name, t);
    }

    // Satu simpul keluaran per bunyi: volume lalu panning stereo (bila browser mendukung).
    const out = ctx.createGain();
    out.gain.value = options.vol ?? 1;
    let tail: AudioNode = out;
    if (options.x !== undefined && typeof ctx.createStereoPanner === "function") {
      const panner = ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.6, Math.min(0.6, ((options.x - LOGICAL_CENTER) / LOGICAL_CENTER) * 0.6));
      out.connect(panner);
      tail = panner;
    }
    tail.connect(sfxBus);

    const pitch = options.pitch ?? 1;
    const kit: Kit = {
      tone: (o) =>
        playTone(ctx, out, t, { ...o, freq: o.freq * pitch, freqEnd: o.freqEnd === undefined ? undefined : o.freqEnd * pitch }),
      noise: (o) =>
        playNoise(ctx, out, noise, t, {
          ...o,
          freq: o.freq === undefined ? undefined : o.freq * pitch,
          freqEnd: o.freqEnd === undefined ? undefined : o.freqEnd * pitch,
        }),
      rand: Math.random,
    };
    RECIPES[name](kit);
  }
}
