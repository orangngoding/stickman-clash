// Pembangun suara tingkat rendah (Web Audio API). Semua suara game dibuat dari osilator dan noise,
// jadi tidak ada file audio yang perlu diunduh.

const FLOOR = 0.0001;

export interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  /** Bila ada, frekuensi meluncur (eksponensial) ke nilai ini selama `dur`. */
  freqEnd?: number;
  /** Jeda dari waktu mulai suara (detik). */
  at?: number;
  dur: number;
  vol?: number;
  attack?: number;
}

export interface NoiseOpts {
  filter?: BiquadFilterType;
  freq?: number;
  freqEnd?: number;
  q?: number;
  at?: number;
  dur: number;
  vol?: number;
  attack?: number;
}

/** Noise putih 1 detik, dibuat sekali lalu diputar berulang oleh banyak suara. */
export function createNoiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const buffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/** Nada dengan envelope: naik cepat lalu meluruh eksponensial (cocok untuk benturan dan bunyi perkusif). */
export function playTone(ctx: BaseAudioContext, dest: AudioNode, t0: number, o: ToneOpts): void {
  const t = t0 + (o.at ?? 0);
  const attack = Math.min(o.attack ?? 0.004, o.dur * 0.5);
  const osc = ctx.createOscillator();
  osc.type = o.type ?? "sine";
  osc.frequency.setValueAtTime(Math.max(1, o.freq), t);
  if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), t + o.dur);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(FLOOR * 2, o.vol ?? 0.3), t + attack);
  gain.gain.exponentialRampToValueAtTime(FLOOR, t + o.dur);

  osc.connect(gain);
  gain.connect(dest);
  osc.start(t);
  osc.stop(t + o.dur + 0.03);
  osc.onended = () => gain.disconnect();
}

/** Semburan noise yang difilter (desis, hembusan angin, benturan). */
export function playNoise(
  ctx: BaseAudioContext,
  dest: AudioNode,
  noise: AudioBuffer,
  t0: number,
  o: NoiseOpts,
): void {
  const t = t0 + (o.at ?? 0);
  const attack = Math.min(o.attack ?? 0.004, o.dur * 0.5);
  const src = ctx.createBufferSource();
  src.buffer = noise;
  src.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = o.filter ?? "bandpass";
  filter.frequency.setValueAtTime(Math.max(10, o.freq ?? 1000), t);
  if (o.freqEnd !== undefined) filter.frequency.exponentialRampToValueAtTime(Math.max(10, o.freqEnd), t + o.dur);
  filter.Q.value = o.q ?? 0.8;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(FLOOR, t);
  gain.gain.exponentialRampToValueAtTime(Math.max(FLOOR * 2, o.vol ?? 0.3), t + attack);
  gain.gain.exponentialRampToValueAtTime(FLOOR, t + o.dur);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);
  src.start(t, Math.random() * Math.max(0.01, noise.duration - 0.05));
  src.stop(t + o.dur + 0.03);
  src.onended = () => gain.disconnect();
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}
