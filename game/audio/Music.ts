import type { AudioEngine } from "./AudioEngine";
import { midiToFreq, playNoise, playTone } from "./synth";
import { TRACKS, parseBar } from "./tracks";
import type { NoteEvent, ParsedBar, TrackId, TrackSpec } from "./tracks";

/** Seberapa jauh ke depan nada dijadwalkan (detik) dan seberapa sering penjadwal berjalan (ms). */
const LOOKAHEAD = 0.25;
const TICK_MS = 25;

export interface PlayOptions {
  /** Lama fade-in (detik). */
  fadeIn?: number;
  /** Dipanggil saat lagu tidak berulang (jingle) selesai. */
  onEnd?: () => void;
}

interface Active {
  id: TrackId;
  spec: TrackSpec;
  bars: ParsedBar[];
  gain: GainNode;
  stepDur: number;
  bar: number;
  step: number;
  nextTime: number;
  onEnd?: () => void;
}

const parsedCache = new Map<TrackId, ParsedBar[]>();
function parsedBars(id: TrackId): ParsedBar[] {
  let bars = parsedCache.get(id);
  if (!bars) {
    bars = TRACKS[id].bars.map(parseBar);
    parsedCache.set(id, bars);
  }
  return bars;
}

/**
 * Pemutar musik prosedural: penjadwal "lookahead" menyusun nada tiap langkah 1/16 sedikit
 * lebih awal dari waktu putar, sehingga ritmenya presisi walau timer JavaScript tidak tepat.
 */
export class MusicPlayer {
  private active: Active | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  /** Lagu yang diminta sebelum audio siap (belum ada interaksi pemain). */
  private pending: { id: TrackId; options: PlayOptions } | null = null;
  private muffled = false;

  constructor(private readonly engine: AudioEngine) {}

  /** Id lagu yang sedang atau akan diputar. */
  get currentId(): TrackId | null {
    return this.active?.id ?? this.pending?.id ?? null;
  }

  /** Dipanggil mesin audio begitu konteks siap. */
  contextReady(): void {
    if (!this.pending) return;
    const { id, options } = this.pending;
    this.pending = null;
    this.play(id, options);
  }

  play(id: TrackId, options: PlayOptions = {}): void {
    const graph = this.engine.graph;
    if (!graph) {
      this.pending = { id, options };
      return;
    }
    // Lagu berulang yang sama tidak diulang dari awal.
    if (this.active?.id === id && TRACKS[id].loop) return;
    this.stop(0.25);

    const { ctx, musicIn } = graph;
    const spec = TRACKS[id];
    const fadeIn = options.fadeIn ?? 0.05;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(fadeIn > 0.06 ? 0.0001 : 1, ctx.currentTime);
    if (fadeIn > 0.06) gain.gain.exponentialRampToValueAtTime(1, ctx.currentTime + fadeIn);
    gain.connect(musicIn);

    this.active = {
      id,
      spec,
      bars: parsedBars(id),
      gain,
      stepDur: 60 / spec.bpm / 4,
      bar: 0,
      step: 0,
      nextTime: ctx.currentTime + 0.06,
      onEnd: options.onEnd,
    };
    this.timer = setInterval(this.tick, TICK_MS);
    this.tick();
  }

  /** Menghentikan musik dengan fade-out. Jingle yang menunggu `onEnd` ikut dibatalkan. */
  stop(fadeOut = 0.4): void {
    this.pending = null;
    if (this.timer !== null) clearInterval(this.timer);
    if (this.endTimer !== null) clearTimeout(this.endTimer);
    this.timer = null;
    this.endTimer = null;

    const graph = this.engine.graph;
    const old = this.active;
    this.active = null;
    if (!old || !graph) return;
    const now = graph.ctx.currentTime;
    old.gain.gain.cancelScheduledValues(now);
    old.gain.gain.setValueAtTime(Math.max(old.gain.gain.value, 0.0001), now);
    old.gain.gain.exponentialRampToValueAtTime(0.0001, now + fadeOut);
    setTimeout(() => old.gain.disconnect(), (fadeOut + 0.2) * 1000);
  }

  /** Meredam musik (jeda, KO): nada tinggi dipotong dan volume turun. */
  setMuffled(on: boolean): void {
    this.muffled = on;
    const graph = this.engine.graph;
    if (!graph) return;
    const now = graph.ctx.currentTime;
    graph.musicFilter.frequency.cancelScheduledValues(now);
    graph.musicFilter.frequency.setTargetAtTime(on ? 700 : 20000, now, 0.08);
    graph.musicDuck.gain.cancelScheduledValues(now);
    graph.musicDuck.gain.setTargetAtTime(on ? 0.55 : 1, now, 0.08);
  }

  get isMuffled(): boolean {
    return this.muffled;
  }

  // ---------- Penjadwal ----------

  private readonly tick = (): void => {
    const graph = this.engine.graph;
    const a = this.active;
    if (!graph || !a) return;
    const horizon = graph.ctx.currentTime + LOOKAHEAD;

    while (a.nextTime < horizon) {
      this.scheduleStep(graph.ctx, graph.noise, a, a.bars[a.bar], a.step, a.nextTime);
      a.nextTime += a.stepDur;
      if (++a.step === 16) {
        a.step = 0;
        a.bar++;
        if (a.bar >= a.bars.length) {
          if (a.spec.loop) {
            a.bar = 0;
          } else {
            this.finish(graph.ctx, a);
            return;
          }
        }
      }
    }
  };

  /** Jingle selesai dijadwalkan: tunggu sampai terdengar habis lalu panggil onEnd. */
  private finish(ctx: AudioContext, a: Active): void {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    const wait = Math.max(0, a.nextTime - ctx.currentTime) + 0.6;
    this.endTimer = setTimeout(() => {
      this.endTimer = null;
      if (this.active === a) this.active = null;
      a.gain.disconnect();
      a.onEnd?.();
    }, wait * 1000);
  }

  private scheduleStep(
    ctx: AudioContext,
    noise: AudioBuffer,
    a: Active,
    bar: ParsedBar,
    step: number,
    t: number,
  ): void {
    const { mix, bassWave, leadWave } = a.spec;
    const dest = a.gain;
    const stepDur = a.stepDur;
    const barDur = stepDur * 16;

    if (step === 0) {
      if (bar.pad && mix.pad > 0) this.pad(ctx, dest, t, bar.pad, barDur, mix.pad);
      if (bar.crash) playNoise(ctx, dest, noise, t, { filter: "highpass", freq: 5500, q: 0.5, dur: 1.2, vol: 0.14 * mix.drums });
    }

    const bass = bar.bass[step];
    if (bass && mix.bass > 0) this.note(ctx, dest, t, bass, stepDur, bassWave, 0.26 * mix.bass, 700, 0.005);
    const lead = bar.lead[step];
    if (lead && mix.lead > 0) this.lead(ctx, dest, t, lead, stepDur, leadWave, 0.11 * mix.lead);
    const arp = bar.arp[step];
    if (arp && mix.arp > 0) {
      playTone(ctx, dest, t, { type: "triangle", freq: midiToFreq(arp.midi + 12), dur: stepDur * 1.6, vol: 0.07 * mix.arp });
    }

    if (mix.drums <= 0) return;
    const d = mix.drums;
    if (bar.kick[step]) this.kick(ctx, dest, t, (bar.kick[step] === 2 ? 1.15 : 1) * d);
    if (bar.snare[step]) this.snare(ctx, dest, noise, t, d);
    if (bar.hat[step]) {
      playNoise(ctx, dest, noise, t, {
        filter: "highpass",
        freq: 7000,
        q: 0.6,
        dur: bar.hat[step] === 2 ? 0.07 : 0.04,
        vol: (bar.hat[step] === 2 ? 0.1 : 0.06) * d,
      });
    }
  }

  /** Nada panjang dengan envelope sustain dan filter lowpass (bass). */
  private note(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    n: NoteEvent,
    stepDur: number,
    type: OscillatorType,
    vol: number,
    cutoff: number,
    attack: number,
  ): void {
    const dur = Math.max(0.05, n.len * stepDur * 0.95);
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = midiToFreq(n.midi);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    filter.Q.value = 1.5;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + attack);
    gain.gain.setValueAtTime(vol, t + Math.max(attack, dur - 0.04));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + dur + 0.03);
    osc.onended = () => gain.disconnect();
  }

  /** Lead: dua osilator sedikit tidak selaras agar terdengar tebal, plus vibrato di nada panjang. */
  private lead(
    ctx: AudioContext,
    dest: AudioNode,
    t: number,
    n: NoteEvent,
    stepDur: number,
    type: OscillatorType,
    vol: number,
  ): void {
    const dur = Math.max(0.06, n.len * stepDur * 0.92);
    const freq = midiToFreq(n.midi);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 3200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    gain.gain.setValueAtTime(vol, t + Math.max(0.012, dur - 0.06));
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filter.connect(gain);
    gain.connect(dest);

    let lfo: OscillatorNode | null = null;
    let lfoGain: GainNode | null = null;
    if (n.len >= 4) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = 5.5;
      lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0, t);
      lfoGain.gain.linearRampToValueAtTime(7, t + Math.min(0.3, dur));
      lfo.connect(lfoGain);
      lfo.start(t);
      lfo.stop(t + dur + 0.03);
    }

    [-6, 6].forEach((detune, i) => {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      if (lfoGain) lfoGain.connect(osc.detune);
      osc.connect(filter);
      osc.start(t);
      osc.stop(t + dur + 0.03);
      if (i === 0) osc.onended = () => gain.disconnect();
    });
  }

  /** Akor panjang yang lembut di belakang melodi. */
  private pad(ctx: AudioContext, dest: AudioNode, t: number, chord: number[], dur: number, mix: number): void {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1300;
    const gain = ctx.createGain();
    const vol = 0.045 * mix;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.2, dur / 3));
    gain.gain.setValueAtTime(vol, t + dur * 0.8);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    filter.connect(gain);
    gain.connect(dest);
    let first = true;
    for (const midi of chord) {
      for (const detune of [-5, 5]) {
        const osc = ctx.createOscillator();
        osc.type = "triangle";
        osc.frequency.value = midiToFreq(midi);
        osc.detune.value = detune;
        osc.connect(filter);
        osc.start(t);
        osc.stop(t + dur + 0.03);
        if (first) {
          osc.onended = () => gain.disconnect();
          first = false;
        }
      }
    }
  }

  private kick(ctx: AudioContext, dest: AudioNode, t: number, level: number): void {
    playTone(ctx, dest, t, { freq: 150, freqEnd: 42, dur: 0.2, vol: 0.85 * level, attack: 0.002 });
  }

  private snare(ctx: AudioContext, dest: AudioNode, noise: AudioBuffer, t: number, level: number): void {
    playNoise(ctx, dest, noise, t, { freq: 1800, q: 0.8, dur: 0.16, vol: 0.32 * level, attack: 0.002 });
    playTone(ctx, dest, t, { type: "triangle", freq: 190, freqEnd: 120, dur: 0.09, vol: 0.22 * level, attack: 0.002 });
  }
}
