// Tipe data inti. Bagian MoveData, CharacterData, AIProfile, StageData mengikuti GDD Bagian 16.

export interface Vec2 {
  x: number;
  y: number;
}

/** 1 = menghadap kanan, -1 = menghadap kiri. */
export type Facing = 1 | -1;
export type PlayerId = "p1" | "p2";

// ---------- Input ----------

export const ACTIONS = [
  "left",
  "right",
  "up",
  "down",
  "light",
  "kick",
  "heavy",
  "dash",
  "special",
] as const;
export type Action = (typeof ACTIONS)[number];
export type ActionFlags = Record<Action, boolean>;
/** Tombol virtual satu pemain. Pemain dan AI memakai struktur yang sama (GDD Bagian 11). */
export interface ControlState {
  down: ActionFlags;
  pressed: ActionFlags;
}
/** Pemetaan aksi ke KeyboardEvent.code. */
export type KeyMap = Record<Action, string>;

// ---------- State ----------

export type GameStateId =
  | "BOOT"
  | "MAIN_MENU"
  | "CHARACTER_SELECT"
  | "STAGE_INTRO"
  | "ROUND_START"
  | "FIGHTING"
  | "PAUSED"
  | "ROUND_END"
  | "MATCH_RESULT"
  | "GAME_OVER"
  | "SETTINGS";

export type FighterState =
  | "idle"
  | "walk"
  | "jump"
  | "fall"
  | "crouch"
  | "block"
  | "attack"
  | "dash"
  | "hitstun"
  | "knockdown"
  | "getup"
  | "ko"
  | "victory"
  | "defeat";

// ---------- Data gameplay ----------

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Tombol serang yang bisa disimpan di input buffer. */
export type AttackButton = "light" | "kick" | "heavy" | "special";

export interface MoveData {
  id: string;
  /** Animasi yang diputar. Panjang animasi = startup + active + recovery frame. */
  anim: AnimId;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitstun: number;
  knockback: number;
  staminaCost: number;
  /**
   * Hitbox dalam koordinat lokal fighter yang menghadap kanan: x = jarak tepi kiri kotak dari tengah badan,
   * y = tepi atas kotak relatif terhadap kaki (negatif = ke atas). Dicerminkan otomatis bila menghadap kiri.
   */
  hitbox: Rect;
  hitstop: number;
  airOnly?: boolean;
  groundOnly?: boolean;
  /** Lama knockdown (frame). Bila ada, korban jatuh ke lantai alih-alih hitstun biasa. */
  knockdown?: number;
  /** Rasio damage saat diblok. Bawaan: COMBAT.blockDamageRatio. */
  chipRatio?: number;
  /** Serangan lanjutan yang boleh dirantai setelah serangan ini mengenai (tombol -> id serangan). */
  chain?: Partial<Record<"light" | "kick", string>>;
  /** Fase recovery baru berjalan setelah mendarat (serangan lompat). */
  landingRecovery?: boolean;
  /** Hanya mengenai target yang menapak tanah (sapuan). */
  hitsGroundedOnly?: boolean;
}

export interface CharacterData {
  id: string;
  name: string;
  maxHp: number;
  /** Piksel per frame. */
  speed: number;
  jumpPower: number;
  attackMultiplier: number;
  weaponId: string;
  colors: { body: string; accent: string };
  moves: Record<string, MoveData>;
}

export interface AIProfile {
  reactionFrames: number;
  aggression: number;
  blockChance: number;
  comboChance: number;
  punishChance: number;
}

export interface StageData {
  id: string;
  name: string;
  background: string;
  enemyCharacterId: string;
  aiProfile: string;
  isBoss: boolean;
}

// ---------- Skeleton dan animasi ----------

/**
 * Pose stickman. Semua sudut dalam derajat dan ABSOLUT (bukan relatif terhadap tulang induk):
 * - Anggota badan: 0 = lurus ke bawah, positif = berayun ke arah hadap, negatif = ke belakang.
 *   Contoh: lengan bawah 150 menunjuk ke depan dan ke atas (tinju terangkat).
 * - torsoLean: 0 = tegak lurus, positif = condong ke depan.
 * - headTilt: tambahan sudut kepala terhadap torso.
 * Sisi L adalah anggota badan yang jauh dari kamera (digambar di belakang), R yang dekat.
 * Array [atas, bawah] = [lengan atas, lengan bawah] atau [paha, betis].
 */
export interface Pose {
  torsoLean: number;
  headTilt: number;
  armL: [number, number];
  armR: [number, number];
  legL: [number, number];
  legR: [number, number];
}

/** Daftar animasi yang sudah ada. Bertambah di milestone berikutnya. */
export type AnimId =
  | "idle"
  | "walk"
  | "jump"
  | "fall"
  | "crouch"
  | "dash"
  | "backdash"
  | "block"
  | "punch1"
  | "punch2"
  | "kick"
  | "weaponSlash"
  | "jumpAttack"
  | "sweep"
  | "special"
  | "hitstun"
  | "knockdown"
  | "getUp"
  | "ko"
  | "victory"
  | "defeat";

export interface Keyframe {
  frame: number;
  pose: Pose;
}

export interface Animation {
  id: AnimId;
  /** Jumlah frame satu siklus (untuk animasi loop, keyframe terakhir menyambung ke keyframe pertama). */
  length: number;
  loop: boolean;
  keys: Keyframe[];
}

export type JointName =
  | "head"
  | "neck"
  | "hip"
  | "shoulder"
  | "elbowL"
  | "elbowR"
  | "handL"
  | "handR"
  | "kneeL"
  | "kneeR"
  | "footL"
  | "footR";

export type Joints = Record<JointName, Vec2>;

// ---------- Pertandingan ----------

export interface RoundOutcome {
  /** null = seri. */
  winner: PlayerId | null;
  reason: "ko" | "time";
}

export interface PlayerMatchStats {
  name: string;
  roundsWon: number;
  damageDealt: number;
  maxCombo: number;
  /** Persen serangan yang mengenai (0 sampai 100). */
  accuracy: number;
}

export interface MatchResult {
  winner: PlayerId;
  rounds: number;
  p1: PlayerMatchStats;
  p2: PlayerMatchStats;
}
