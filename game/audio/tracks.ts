// Data lagu. Semua musik ditulis sebagai pola 16 langkah per bar (satu langkah = 1/16 not),
// lalu dimainkan oleh MusicPlayer dengan osilator. Tidak ada file audio.
//
// Notasi satu bar = 16 token dipisah spasi:
//   "."  jeda            "-"  menyambung nada sebelumnya
//   "A4" nada absolut (nama + oktaf, "#" atau "b" untuk kres/mol, mis. "C#5", "Bb3")
//   r t f s o  nada relatif terhadap akor bar itu: r = root, t = terts (mol 3 / mayor 4),
//              f = kuint (7), s = septim mol (10), o = oktaf (12); akhiran ^ naik oktaf, _ turun oktaf.
// Pola relatif otomatis mengikuti perubahan akor, jadi satu riff bisa dipakai di semua akor.
// Drum: 16 karakter, "x" = pukul, "X" = aksen, "." = diam.

export interface NoteEvent {
  step: number;
  midi: number;
  /** Panjang dalam langkah. */
  len: number;
}

export interface BarSpec {
  /** Akor bar ini: nama root + oktaf, akhiran "m" untuk minor. Contoh "A3m", "F3", "Bb3". */
  chord: string;
  bass?: string;
  lead?: string;
  arp?: string;
  /** Bunyikan akor panjang (pad) selama satu bar. */
  pad?: boolean;
  kick?: string;
  snare?: string;
  hat?: string;
  crash?: boolean;
}

export type TrackId = "menu" | "fight1" | "fight2" | "fight3" | "roundWin" | "roundLose" | "draw" | "matchWin" | "matchLose";

export interface TrackSpec {
  bpm: number;
  loop: boolean;
  leadWave: OscillatorType;
  bassWave: OscillatorType;
  /** Volume relatif tiap lapisan. */
  mix: { lead: number; bass: number; arp: number; pad: number; drums: number };
  bars: BarSpec[];
}

export interface ParsedBar {
  bass: (NoteEvent | undefined)[];
  lead: (NoteEvent | undefined)[];
  arp: (NoteEvent | undefined)[];
  pad: number[] | null;
  kick: number[];
  snare: number[];
  hat: number[];
  crash: boolean;
}

// ---------- Parser ----------

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NOTE_RE = /^([A-G])([#b]?)(\d)$/;
const CHORD_RE = /^([A-G])([#b]?)(\d)(m?)$/;
const REL_RE = /^([rtfso])([\^_]?)$/;

export function noteToMidi(name: string): number {
  const m = NOTE_RE.exec(name);
  if (!m) throw new Error(`Nama nada tidak valid: ${name}`);
  const accidental = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  return 12 * (Number(m[3]) + 1) + SEMITONES[m[1]] + accidental;
}

function parseChord(name: string): { root: number; minor: boolean } {
  const m = CHORD_RE.exec(name);
  if (!m) throw new Error(`Akor tidak valid: ${name}`);
  return { root: noteToMidi(`${m[1]}${m[2]}${m[3]}`), minor: m[4] === "m" };
}

function parseNotes(pattern: string | undefined, root: number, minor: boolean): (NoteEvent | undefined)[] {
  const byStep: (NoteEvent | undefined)[] = new Array<NoteEvent | undefined>(16).fill(undefined);
  if (!pattern) return byStep;
  const tokens = pattern.trim().split(/\s+/);
  if (tokens.length !== 16) throw new Error(`Pola harus 16 token, dapat ${tokens.length}: "${pattern}"`);

  let current: NoteEvent | null = null;
  for (let i = 0; i < 16; i++) {
    const token = tokens[i];
    if (token === "-") {
      if (current) current.len++;
      continue;
    }
    current = null;
    if (token === ".") continue;
    const rel = REL_RE.exec(token);
    let midi: number;
    if (rel) {
      const base = { r: 0, t: minor ? 3 : 4, f: 7, s: 10, o: 12 }[rel[1] as "r" | "t" | "f" | "s" | "o"];
      midi = root + base + (rel[2] === "^" ? 12 : rel[2] === "_" ? -12 : 0);
    } else {
      midi = noteToMidi(token);
    }
    current = { step: i, midi, len: 1 };
    byStep[i] = current;
  }
  return byStep;
}

function parseDrums(pattern: string | undefined): number[] {
  const out = new Array<number>(16).fill(0);
  if (!pattern) return out;
  if (pattern.length !== 16) throw new Error(`Pola drum harus 16 karakter: "${pattern}"`);
  for (let i = 0; i < 16; i++) out[i] = pattern[i] === "X" ? 2 : pattern[i] === "x" ? 1 : 0;
  return out;
}

export function parseBar(spec: BarSpec): ParsedBar {
  const { root, minor } = parseChord(spec.chord);
  // Bass satu oktaf di bawah akor, lead dan arp satu oktaf di atas.
  const bass = parseNotes(spec.bass, root - 12, minor);
  const lead = parseNotes(spec.lead, root + 12, minor);
  const arp = parseNotes(spec.arp, root + 12, minor);
  const pad = spec.pad ? [root, root + (minor ? 3 : 4), root + 7] : null;
  return {
    bass,
    lead,
    arp,
    pad,
    kick: parseDrums(spec.kick),
    snare: parseDrums(spec.snare),
    hat: parseDrums(spec.hat),
    crash: spec.crash === true,
  };
}

// ---------- Pembangun lagu ----------

type Template = Omit<BarSpec, "chord">;

/** Satu bar per akor, semuanya memakai template yang sama. `first` dan `last` menimpa bar pertama dan terakhir. */
function section(chords: string[], tpl: Template, first: Template = {}, last: Template = {}): BarSpec[] {
  return chords.map((chord, i) => ({
    chord,
    ...tpl,
    ...(i === 0 ? first : {}),
    ...(i === chords.length - 1 ? last : {}),
  }));
}


// ---------- MENU: tenang tapi gagah, A minor 96 bpm ----------

const MENU_MELODY = [
  "E5 - - - C5 - - - D5 - - - E5 - - -",
  "F5 - - - E5 - - - C5 - - - A4 - - -",
  "G4 - - - C5 - - - E5 - - - G5 - - -",
  "F5 - - - D5 - - - B4 - - - D5 - - -",
  "E5 - - - A5 - - - G5 - E5 - D5 - C5 -",
  "C5 - A4 - C5 - F5 - E5 - - - C5 - - -",
  "D5 - - - G5 - - - F5 - D5 - B4 - D5 -",
  "A4 - - - - - - - E4 - - - - - - -",
];
const MENU_CHORDS = ["A3m", "F3", "C4", "G3", "A3m", "F3", "G3", "A3m"];

const MENU: TrackSpec = {
  bpm: 96,
  loop: true,
  leadWave: "triangle",
  bassWave: "sine",
  mix: { lead: 1.1, bass: 0.9, arp: 0.7, pad: 1, drums: 0.7 },
  bars: MENU_CHORDS.map((chord, i) => ({
    chord,
    pad: true,
    bass: "r - - - - - - - f - - - r - - -",
    arp: "r . t . f . t . r . t . f . t .",
    lead: MENU_MELODY[i],
    kick: "x.......x.......",
    snare: "....x.......x...",
    hat: "x...x...x...x...",
    crash: i === 0,
  })),
};

// ---------- RONDE 1: A minor 126 bpm, tangan kosong ----------

const F1_A: Template = {
  bass: "r . r . r . r . r . r . r . f .",
  lead: "r . r . t . r . f . t . r . s .",
  arp: "r t f t r t f t r t f t r t f t",
  kick: "x...x...x...x...",
  snare: "....x.......x...",
  hat: "x.x.x.x.x.x.x.x.",
};
const F1_B: Template = {
  ...F1_A,
  lead: "r . t . f . o . f . t . r . t .",
  hat: "XxxxXxxxXxxxXxxx",
};
const FIGHT1: TrackSpec = {
  bpm: 126,
  loop: true,
  leadWave: "square",
  bassWave: "sawtooth",
  mix: { lead: 0.8, bass: 1, arp: 0.5, pad: 0, drums: 1 },
  bars: [
    ...section(["A3m", "A3m", "F3", "G3"], F1_A, { crash: true }),
    ...section(["A3m", "A3m", "F3", "E3"], F1_B, { crash: true }, { snare: "....x...x.x.xxxx" }),
  ],
};

// ---------- RONDE 2: D minor 138 bpm, pedang ----------

const F2_A: Template = {
  bass: "r . r r . r r . r . r r . r r .",
  lead: "r . . r . . t . . f . . t . r .",
  arp: "r f o f t f o f r f o f t f o f",
  kick: "x...x..xx...x...",
  snare: "....x.......x...",
  hat: "XxxxXxxxXxxxXxxx",
};
const F2_B: Template = {
  ...F2_A,
  lead: "f - t - r - t - f - o - f - t -",
};
const FIGHT2: TrackSpec = {
  bpm: 138,
  loop: true,
  leadWave: "sawtooth",
  bassWave: "sawtooth",
  mix: { lead: 0.6, bass: 1, arp: 0.5, pad: 0, drums: 1 },
  bars: [
    ...section(["D3m", "D3m", "Bb3", "C4"], F2_A, { crash: true }),
    ...section(["D3m", "F3", "C4", "A3"], F2_B, { crash: true }, { snare: "....x..x..x.xxxx" }),
  ],
};

// ---------- RONDE 3: C minor 150 bpm, tombak, paling intens ----------

const F3_A: Template = {
  bass: "r r o r r o r r r r o r r o f s",
  lead: "r . t . f . t . o . f . t . f .",
  arp: "r t f o f t r t f o f t r t f o",
  kick: "x.x.x.x.x.x.x.x.",
  snare: "....x.......x.x.",
  hat: "XxxxXxxxXxxxXxxx",
};
const F3_B: Template = {
  ...F3_A,
  lead: "o - - o t - f - o - - o t - r -",
};
const FIGHT3: TrackSpec = {
  bpm: 150,
  loop: true,
  leadWave: "sawtooth",
  bassWave: "square",
  mix: { lead: 0.65, bass: 0.9, arp: 0.55, pad: 0, drums: 1.1 },
  bars: [
    ...section(["C3m", "Ab3", "Bb3", "G3"], F3_A, { crash: true }),
    ...section(["C3m", "Ab3", "Bb3", "G3"], F3_B, { crash: true }, { snare: "..x.x..x..x.xxxx" }),
  ],
};

// ---------- Jingle (tidak berulang) ----------

// Jingle ronde dibuat 1 bar agar selesai sebelum ronde berikutnya mulai (akhir ronde sekitar 2,5 detik).
const ROUND_WIN: TrackSpec = {
  bpm: 150,
  loop: false,
  leadWave: "square",
  bassWave: "sawtooth",
  mix: { lead: 0.8, bass: 0.9, arp: 0, pad: 1, drums: 1 },
  bars: [
    {
      chord: "C4",
      pad: true,
      lead: "C5 . E5 . G5 . C6 - - - - - - - - -",
      bass: "C2 . . . . . . . G2 . . . C2 - - -",
      kick: "x.......x.......",
      snare: "....x.......x...",
      crash: true,
    },
  ],
};

const ROUND_LOSE: TrackSpec = {
  bpm: 130,
  loop: false,
  leadWave: "triangle",
  bassWave: "sine",
  mix: { lead: 1.1, bass: 1, arp: 0, pad: 1, drums: 0 },
  bars: [
    { chord: "A3m", pad: true, lead: "E5 - - - D5 - - - C5 - - - A4 - - -", bass: "A2 - - - - - - - - - - - - - - -" },
  ],
};

const DRAW: TrackSpec = {
  bpm: 130,
  loop: false,
  leadWave: "triangle",
  bassWave: "sine",
  mix: { lead: 1, bass: 0.8, arp: 0, pad: 1, drums: 0 },
  bars: [
    { chord: "A3m", pad: true, lead: "A4 - - - C5 - - - A4 - - - - - - -", bass: "A2 - - - - - - - - - - - - - - -" },
  ],
};

const MATCH_WIN: TrackSpec = {
  bpm: 140,
  loop: false,
  leadWave: "square",
  bassWave: "sawtooth",
  mix: { lead: 0.8, bass: 0.9, arp: 0, pad: 1, drums: 1 },
  bars: [
    {
      chord: "C4",
      pad: true,
      lead: "C5 . E5 . G5 . E5 . G5 . C6 . G5 . E5 .",
      bass: "C2 . C2 . C2 . C2 . C2 . C2 . C2 . C2 .",
      kick: "x...x...x...x...",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
      crash: true,
    },
    {
      chord: "F3",
      pad: true,
      lead: "A5 . F5 . A5 . C6 . A5 . F5 . A5 - - -",
      bass: "F2 . F2 . F2 . F2 . F2 . F2 . F2 . F2 .",
      kick: "x...x...x...x...",
      snare: "....x.......x...",
      hat: "x.x.x.x.x.x.x.x.",
    },
    {
      chord: "G3",
      pad: true,
      lead: "G5 . B5 . D6 . B5 . D6 . G6 . D6 - - -",
      bass: "G2 . G2 . G2 . G2 . G2 . G2 . G2 . G2 .",
      kick: "x...x...x...x...",
      snare: "....x...x.x.xxxx",
      hat: "x.x.x.x.x.x.x.x.",
    },
    {
      chord: "C4",
      pad: true,
      lead: "C6 - - - - - - - E6 - - - G6 - - -",
      bass: "C2 - - - - - - - - - - - - - - -",
      kick: "X...............",
      crash: true,
    },
  ],
};

const MATCH_LOSE: TrackSpec = {
  bpm: 72,
  loop: false,
  leadWave: "triangle",
  bassWave: "sine",
  mix: { lead: 1.1, bass: 1, arp: 0, pad: 1, drums: 0.6 },
  bars: [
    {
      chord: "A3m",
      pad: true,
      lead: "E5 - - - - - D5 - - - C5 - - - B4 -",
      bass: "A2 - - - - - - - - - - - - - - -",
      kick: "x...............",
    },
    { chord: "F3", pad: true, lead: "A4 - - - - - - - C5 - - - A4 - - -", bass: "F2 - - - - - - - - - - - - - - -" },
    {
      chord: "E3",
      pad: true,
      lead: "G#4 - - - - - - - E4 - - - - - - -",
      bass: "E2 - - - - - - - - - - - - - - -",
      kick: "x...............",
    },
  ],
};

export const TRACKS: Record<TrackId, TrackSpec> = {
  menu: MENU,
  fight1: FIGHT1,
  fight2: FIGHT2,
  fight3: FIGHT3,
  roundWin: ROUND_WIN,
  roundLose: ROUND_LOSE,
  draw: DRAW,
  matchWin: MATCH_WIN,
  matchLose: MATCH_LOSE,
};

/** Lagu pertarungan sesuai nomor ronde (ronde 3 dan seterusnya memakai lagu paling intens). */
export function fightTrackForRound(round: number): TrackId {
  return round <= 1 ? "fight1" : round === 2 ? "fight2" : "fight3";
}

