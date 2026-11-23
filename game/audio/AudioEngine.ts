import { loadSave, writeSave } from "../../lib/storage";
import { MusicPlayer } from "./Music";
import { Sfx } from "./Sfx";
import { createNoiseBuffer } from "./synth";

/** Skala dasar agar musik tidak menutupi efek suara. Volume pemain (0..1) dikalikan dengan ini. */
const MUSIC_BASE = 0.34;
const SFX_BASE = 0.9;

/** Simpul-simpul audio. Baru ada setelah pemain berinteraksi (kebijakan autoplay browser). */
export interface AudioGraph {
  ctx: AudioContext;
  noise: AudioBuffer;
  /** Semua efek suara masuk ke sini. */
  sfxBus: GainNode;
  /** Musik masuk ke sini: duck -> filter -> volume. */
  musicIn: GainNode;
  musicDuck: GainNode;
  musicFilter: BiquadFilterNode;
}

/** Potret keadaan audio yang aman dipakai React (useSyncExternalStore). Selalu objek baru saat berubah. */
export interface AudioSnapshot {
  muted: boolean;
  musicVolume: number;
  sfxVolume: number;
  /** Konteks audio sudah berjalan (pemain sudah berinteraksi). */
  running: boolean;
}

const SERVER_SNAPSHOT: AudioSnapshot = { muted: false, musicVolume: 0.6, sfxVolume: 0.8, running: false };

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

/**
 * Mesin audio tunggal untuk seluruh aplikasi (singleton di level modul), jadi musik menu tetap
 * berjalan mulus saat pindah halaman dari menu ke /play.
 *
 * Browser melarang suara sebelum ada interaksi, jadi AudioContext baru dibuat saat klik atau
 * tombol pertama (`installUnlock`). Musik yang diminta sebelum itu disimpan dan dimulai begitu siap.
 */
export class AudioEngine {
  graph: AudioGraph | null = null;
  readonly music = new MusicPlayer(this);
  readonly sfx = new Sfx(this);

  private master: GainNode | null = null;
  private musicVolumeNode: GainNode | null = null;
  private snapshot: AudioSnapshot;
  private readonly listeners = new Set<() => void>();
  private removeUnlock: (() => void) | null = null;

  constructor() {
    const { musicVolume, sfxVolume, muted } = loadSave().settings;
    this.snapshot = { muted, musicVolume, sfxVolume, running: false };
  }

  // ---------- Siklus hidup ----------

  /** Memasang pendengar klik/tombol pertama untuk mengaktifkan audio. Aman dipanggil berkali-kali. */
  installUnlock(): void {
    if (typeof window === "undefined" || this.removeUnlock || this.snapshot.running) return;
    const handler = (): void => this.unlock();
    const events = ["pointerdown", "keydown", "touchstart"] as const;
    for (const name of events) window.addEventListener(name, handler, { capture: true, passive: true });
    this.removeUnlock = () => {
      for (const name of events) window.removeEventListener(name, handler, { capture: true });
      this.removeUnlock = null;
    };
  }

  /** Membuat dan menjalankan AudioContext. Harus dipanggil dari dalam gestur pemain. */
  unlock(): void {
    if (typeof window === "undefined") return;
    if (!this.graph) {
      const Ctor = window.AudioContext ?? (window as WebkitWindow).webkitAudioContext;
      if (!Ctor) return;
      this.build(new Ctor());
    }
    const ctx = this.graph?.ctx;
    if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => undefined);
  }

  private build(ctx: AudioContext): void {
    // Rantai: [musik] duck -> filter -> volume -> master, [efek] sfxBus -> master, master -> kompresor -> speaker.
    const master = ctx.createGain();
    master.gain.value = this.snapshot.muted ? 0 : 1;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -10;
    limiter.knee.value = 12;
    limiter.ratio.value = 6;
    master.connect(limiter);
    limiter.connect(ctx.destination);

    const sfxBus = ctx.createGain();
    sfxBus.gain.value = this.snapshot.sfxVolume * SFX_BASE;
    sfxBus.connect(master);

    const musicVolume = ctx.createGain();
    musicVolume.gain.value = this.snapshot.musicVolume * MUSIC_BASE;
    musicVolume.connect(master);
    const musicFilter = ctx.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = 20000;
    musicFilter.connect(musicVolume);
    const musicDuck = ctx.createGain();
    musicDuck.connect(musicFilter);

    this.master = master;
    this.musicVolumeNode = musicVolume;
    this.graph = { ctx, noise: createNoiseBuffer(ctx), sfxBus, musicIn: musicDuck, musicDuck, musicFilter };

    ctx.onstatechange = () => {
      this.update({ running: ctx.state === "running" });
      if (ctx.state === "running") this.removeUnlock?.();
    };
    document.addEventListener("visibilitychange", this.handleVisibility);
    this.update({ running: ctx.state === "running" });
    this.music.contextReady();
  }

  /** Tab disembunyikan: hentikan semua suara. Kembali: lanjutkan. */
  private readonly handleVisibility = (): void => {
    const ctx = this.graph?.ctx;
    if (!ctx) return;
    if (document.hidden) void ctx.suspend().catch(() => undefined);
    else void ctx.resume().catch(() => undefined);
  };

  // ---------- Volume dan mute (disimpan di localStorage) ----------

  get muted(): boolean {
    return this.snapshot.muted;
  }

  /** Efek suara boleh dimainkan? (konteks siap, tidak mute, volume > 0) */
  get sfxAudible(): boolean {
    return this.graph !== null && !this.snapshot.muted && this.snapshot.sfxVolume > 0;
  }

  setMuted(muted: boolean): void {
    this.update({ muted });
    this.ramp(this.master, muted ? 0 : 1);
    this.persist();
  }

  toggleMuted(): void {
    this.setMuted(!this.snapshot.muted);
  }

  setMusicVolume(volume: number): void {
    const v = clamp01(volume);
    this.update({ musicVolume: v });
    this.ramp(this.musicVolumeNode, v * MUSIC_BASE);
    this.persist();
  }

  setSfxVolume(volume: number): void {
    const v = clamp01(volume);
    this.update({ sfxVolume: v });
    this.ramp(this.graph?.sfxBus ?? null, v * SFX_BASE);
    this.persist();
  }

  private ramp(node: GainNode | null, value: number): void {
    const ctx = this.graph?.ctx;
    if (!node || !ctx) return;
    node.gain.cancelScheduledValues(ctx.currentTime);
    node.gain.setTargetAtTime(value, ctx.currentTime, 0.03);
  }

  private persist(): void {
    const save = loadSave();
    save.settings.musicVolume = this.snapshot.musicVolume;
    save.settings.sfxVolume = this.snapshot.sfxVolume;
    save.settings.muted = this.snapshot.muted;
    writeSave(save);
  }

  // ---------- Untuk React (useSyncExternalStore) ----------

  readonly subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  readonly getSnapshot = (): AudioSnapshot => this.snapshot;
  readonly getServerSnapshot = (): AudioSnapshot => SERVER_SNAPSHOT;

  private update(patch: Partial<AudioSnapshot>): void {
    const next = { ...this.snapshot, ...patch };
    const changed = (Object.keys(next) as (keyof AudioSnapshot)[]).some((k) => next[k] !== this.snapshot[k]);
    if (!changed) return;
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, Number.isFinite(v) ? v : 0));
}

/** Satu-satunya instans mesin audio. Tidak menyentuh window saat dibuat di server. */
export const audio = new AudioEngine();
