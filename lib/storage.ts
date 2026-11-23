// Penyimpanan localStorage (GDD Bagian 15). Data punya versi dan data rusak selalu kembali ke default tanpa crash.

export const SAVE_KEY = "stickman-clash-save";
export const SAVE_VERSION = 1;

export interface SaveData {
  saveVersion: number;
  /** Stage campaign tertinggi yang terbuka (1 sampai 10). */
  highestStage: number;
  unlockedCharacters: string[];
  survivalBest: number;
  settings: {
    musicVolume: number;
    sfxVolume: number;
    /** Semua suara dimatikan (musik dan efek). */
    muted: boolean;
    roundTime: 30 | 60 | 99;
    screenShake: boolean;
    showFps: boolean;
    touchControls: boolean;
  };
  stats: { wins: number; totalDamage: number };
}

export function createDefaultSave(): SaveData {
  return {
    saveVersion: SAVE_VERSION,
    highestStage: 1,
    unlockedCharacters: ["blade", "brawler", "shadow", "lancer"],
    survivalBest: 0,
    settings: {
      musicVolume: 0.6,
      sfxVolume: 0.8,
      muted: false,
      roundTime: 60,
      screenShake: true,
      showFps: true,
      touchControls: false,
    },
    stats: { wins: 0, totalDamage: 0 },
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readNumber(value: unknown, fallback: number, min: number, max: number): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;
}

function readBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function readStrings(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((v) => typeof v === "string") ? (value as string[]) : fallback;
}

/** Memvalidasi data mentah satu per satu. Field yang salah diganti default, bukan membuang semuanya. */
export function parseSave(raw: unknown): SaveData {
  const base = createDefaultSave();
  if (!isRecord(raw) || raw.saveVersion !== SAVE_VERSION) return base;

  const settings = isRecord(raw.settings) ? raw.settings : {};
  const stats = isRecord(raw.stats) ? raw.stats : {};
  const roundTime = settings.roundTime === 30 || settings.roundTime === 99 ? settings.roundTime : 60;

  return {
    saveVersion: SAVE_VERSION,
    highestStage: Math.round(readNumber(raw.highestStage, base.highestStage, 1, 10)),
    unlockedCharacters: readStrings(raw.unlockedCharacters, base.unlockedCharacters),
    survivalBest: readNumber(raw.survivalBest, base.survivalBest, 0, Number.MAX_SAFE_INTEGER),
    settings: {
      musicVolume: readNumber(settings.musicVolume, base.settings.musicVolume, 0, 1),
      sfxVolume: readNumber(settings.sfxVolume, base.settings.sfxVolume, 0, 1),
      muted: readBoolean(settings.muted, base.settings.muted),
      roundTime,
      screenShake: readBoolean(settings.screenShake, base.settings.screenShake),
      showFps: readBoolean(settings.showFps, base.settings.showFps),
      touchControls: readBoolean(settings.touchControls, base.settings.touchControls),
    },
    stats: {
      wins: readNumber(stats.wins, 0, 0, Number.MAX_SAFE_INTEGER),
      totalDamage: readNumber(stats.totalDamage, 0, 0, Number.MAX_SAFE_INTEGER),
    },
  };
}

export function loadSave(): SaveData {
  if (typeof window === "undefined") return createDefaultSave();
  try {
    const text = window.localStorage.getItem(SAVE_KEY);
    return text ? parseSave(JSON.parse(text)) : createDefaultSave();
  } catch {
    return createDefaultSave();
  }
}

export function writeSave(data: SaveData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {
    // Penyimpanan penuh atau diblokir: game tetap berjalan tanpa menyimpan.
  }
}
