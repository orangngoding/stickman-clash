import type { Animation, AnimId, Pose } from "../types";

// Semua animasi adalah DATA (array keyframe), bukan logika. Sudut dijelaskan di types.ts (Pose).
// Menambah animasi baru cukup menambah entri di ANIMATIONS (pengenalan pola).

// ---- Idle: kuda-kuda bertarung dengan napas naik turun (loop 60 frame) ----
const IDLE_EXHALE: Pose = {
  torsoLean: 6,
  headTilt: 0,
  armL: [10, 140],
  armR: [38, 150],
  legL: [-22, -12],
  legR: [24, -4],
};

const IDLE_INHALE: Pose = {
  torsoLean: 9,
  headTilt: 2,
  armL: [14, 136],
  armR: [42, 146],
  legL: [-28, -20],
  legR: [30, -10],
};

// ---- Walk: 4 pose (kontak kanan, lewat, kontak kiri, lewat), loop 24 frame ----
// Tangan tetap berjaga seperti petarung sungguhan, hanya sedikit berayun.
const WALK_CONTACT_R: Pose = {
  torsoLean: 8,
  headTilt: 0,
  armL: [8, 140],
  armR: [36, 152],
  legL: [-22, -40],
  legR: [30, 8],
};

const WALK_PASS_R: Pose = {
  torsoLean: 8,
  headTilt: 0,
  armL: [10, 142],
  armR: [38, 150],
  legL: [20, -50],
  legR: [2, -4],
};

const WALK_CONTACT_L: Pose = {
  torsoLean: 9,
  headTilt: 0,
  armL: [12, 138],
  armR: [40, 148],
  legL: [30, 8],
  legR: [-22, -40],
};

const WALK_PASS_L: Pose = {
  torsoLean: 8,
  headTilt: 0,
  armL: [10, 140],
  armR: [38, 150],
  legL: [2, -4],
  legR: [20, -50],
};

// ---- Lompat dan jatuh ----
const JUMP_LAUNCH: Pose = {
  torsoLean: 4,
  headTilt: 0,
  armL: [18, 140],
  armR: [44, 150],
  legL: [-10, -14],
  legR: [10, -6],
};

const JUMP_TUCK: Pose = {
  torsoLean: 8,
  headTilt: 0,
  armL: [20, 138],
  armR: [46, 146],
  legL: [25, -55],
  legR: [60, -5],
};

const FALL_REACH: Pose = {
  torsoLean: 5,
  headTilt: 0,
  armL: [14, 142],
  armR: [40, 152],
  legL: [-12, -18],
  legR: [18, -4],
};

// ---- Jongkok: pinggul turun, tangan tetap berjaga ----
const CROUCH: Pose = {
  torsoLean: 14,
  headTilt: 0,
  armL: [8, 130],
  armR: [36, 140],
  legL: [40, -50],
  legR: [65, -15],
};

// ---- Dash maju (condong dan melesat) dan dash mundur (lompatan kecil ke belakang) ----
const DASH_FORWARD: Pose = {
  torsoLean: 26,
  headTilt: 0,
  armL: [-50, -35],
  armR: [-35, -20],
  legL: [-55, -70],
  legR: [60, 15],
};

const DASH_BACK: Pose = {
  torsoLean: -6,
  headTilt: 0,
  armL: [20, 130],
  armR: [50, 140],
  legL: [20, -40],
  legR: [40, -20],
};

// ---- Serangan. Frame kunci sengaja jatuh tepat di awal fase active agar pose dan hitbox sejalan ----
const PUNCH_WIND: Pose = {
  torsoLean: 3,
  headTilt: 0,
  armL: [10, 140],
  armR: [-5, 125],
  legL: [-22, -12],
  legR: [24, -4],
};

const PUNCH1_EXT: Pose = {
  torsoLean: 14,
  headTilt: 0,
  armL: [10, 140],
  armR: [88, 92],
  legL: [-28, -14],
  legR: [32, -2],
};

const PUNCH2_WIND: Pose = {
  torsoLean: 3,
  headTilt: 0,
  armL: [-5, 125],
  armR: [38, 150],
  legL: [-22, -12],
  legR: [24, -4],
};

const PUNCH2_EXT: Pose = {
  torsoLean: 12,
  headTilt: 0,
  armL: [88, 92],
  armR: [38, 150],
  legL: [-26, -12],
  legR: [28, -4],
};

const KICK_CHAMBER: Pose = {
  torsoLean: -4,
  headTilt: 0,
  armL: [10, 140],
  armR: [38, 150],
  legL: [-6, -8],
  legR: [70, -50],
};

const KICK_EXT: Pose = {
  torsoLean: -10,
  headTilt: 0,
  armL: [-10, 110],
  armR: [20, 130],
  legL: [-6, -8],
  legR: [82, 88],
};

const SLASH_WIND: Pose = {
  torsoLean: -8,
  headTilt: 0,
  armL: [-80, -120],
  armR: [-110, -150],
  legL: [-24, -12],
  legR: [20, -6],
};

const SLASH_EXT: Pose = {
  torsoLean: 22,
  headTilt: 0,
  armL: [90, 110],
  armR: [98, 98],
  legL: [-30, -16],
  legR: [38, 0],
};

const SLASH_FOLLOW: Pose = {
  torsoLean: 26,
  headTilt: 0,
  armL: [110, 120],
  armR: [125, 130],
  legL: [-30, -16],
  legR: [38, 0],
};

const JUMP_ATTACK_EXT: Pose = {
  torsoLean: -12,
  headTilt: 0,
  armL: [-30, -20],
  armR: [-20, -10],
  legL: [25, -70],
  legR: [52, 58],
};

const SWEEP_EXT: Pose = {
  torsoLean: 24,
  headTilt: 0,
  armL: [20, 0],
  armR: [50, 10],
  legL: [85, -75],
  legR: [76, 80],
};

const SPECIAL_WIND: Pose = {
  torsoLean: -16,
  headTilt: 0,
  armL: [-95, -135],
  armR: [-115, -160],
  legL: [-30, -20],
  legR: [14, -10],
};

const SPECIAL_EXT: Pose = {
  torsoLean: 30,
  headTilt: 0,
  armL: [95, 100],
  armR: [100, 95],
  legL: [-40, -20],
  legR: [45, 5],
};

const SPECIAL_FOLLOW: Pose = {
  torsoLean: 34,
  headTilt: 0,
  armL: [125, 135],
  armR: [130, 140],
  legL: [-40, -20],
  legR: [45, 5],
};

// ---- Bertahan dan terkena serangan ----
const BLOCK: Pose = {
  torsoLean: 4,
  headTilt: 0,
  armL: [40, 160],
  armR: [52, 165],
  legL: [-20, -14],
  legR: [20, -6],
};

const HITSTUN: Pose = {
  torsoLean: -16,
  headTilt: -12,
  armL: [-15, -30],
  armR: [-5, -25],
  legL: [-12, -8],
  legR: [16, -14],
};

/** Berbaring telentang: badan mendatar ke belakang, kaki lurus ke depan, lengan di sisi badan. */
const LYING: Pose = {
  torsoLean: -88,
  headTilt: -6,
  armL: [-80, -88],
  armR: [-85, -90],
  legL: [88, 92],
  legR: [82, 90],
};

// ---- Akhir ronde: pemenang mengangkat tangan, yang kalah waktu tertunduk lesu ----
const VICTORY_A: Pose = {
  torsoLean: -4,
  headTilt: -6,
  armL: [-140, -170],
  armR: [140, 170],
  legL: [-26, -10],
  legR: [26, -10],
};

const VICTORY_B: Pose = {
  torsoLean: -6,
  headTilt: -8,
  armL: [-150, -178],
  armR: [150, 178],
  legL: [-24, -8],
  legR: [24, -8],
};

const DEFEAT: Pose = {
  torsoLean: 30,
  headTilt: 25,
  armL: [6, 10],
  armR: [12, 16],
  legL: [-10, -8],
  legR: [12, -6],
};

const KNOCKDOWN_KEYS = [
  { frame: 0, pose: HITSTUN },
  { frame: 14, pose: LYING },
];

export const ANIMATIONS: Record<AnimId, Animation> = {
  idle: {
    id: "idle",
    length: 60,
    loop: true,
    keys: [
      { frame: 0, pose: IDLE_EXHALE },
      { frame: 30, pose: IDLE_INHALE },
    ],
  },
  walk: {
    id: "walk",
    length: 24,
    loop: true,
    keys: [
      { frame: 0, pose: WALK_CONTACT_R },
      { frame: 6, pose: WALK_PASS_R },
      { frame: 12, pose: WALK_CONTACT_L },
      { frame: 18, pose: WALK_PASS_L },
    ],
  },
  jump: {
    id: "jump",
    length: 14,
    loop: false,
    keys: [
      { frame: 0, pose: JUMP_LAUNCH },
      { frame: 10, pose: JUMP_TUCK },
    ],
  },
  fall: {
    id: "fall",
    length: 20,
    loop: false,
    keys: [
      { frame: 0, pose: JUMP_TUCK },
      { frame: 16, pose: FALL_REACH },
    ],
  },
  crouch: { id: "crouch", length: 1, loop: false, keys: [{ frame: 0, pose: CROUCH }] },
  dash: { id: "dash", length: 1, loop: false, keys: [{ frame: 0, pose: DASH_FORWARD }] },
  backdash: { id: "backdash", length: 1, loop: false, keys: [{ frame: 0, pose: DASH_BACK }] },
  block: { id: "block", length: 1, loop: false, keys: [{ frame: 0, pose: BLOCK }] },
  punch1: {
    id: "punch1",
    length: 15,
    loop: false,
    keys: [
      { frame: 0, pose: IDLE_EXHALE },
      { frame: 2, pose: PUNCH_WIND },
      { frame: 4, pose: PUNCH1_EXT },
      { frame: 7, pose: PUNCH1_EXT },
      { frame: 15, pose: IDLE_EXHALE },
    ],
  },
  punch2: {
    id: "punch2",
    length: 15,
    loop: false,
    keys: [
      { frame: 0, pose: IDLE_EXHALE },
      { frame: 2, pose: PUNCH2_WIND },
      { frame: 4, pose: PUNCH2_EXT },
      { frame: 7, pose: PUNCH2_EXT },
      { frame: 15, pose: IDLE_EXHALE },
    ],
  },
  kick: {
    id: "kick",
    length: 23,
    loop: false,
    keys: [
      { frame: 0, pose: IDLE_EXHALE },
      { frame: 3, pose: KICK_CHAMBER },
      { frame: 7, pose: KICK_EXT },
      { frame: 11, pose: KICK_EXT },
      { frame: 23, pose: IDLE_EXHALE },
    ],
  },
  weaponSlash: {
    id: "weaponSlash",
    length: 37,
    loop: false,
    keys: [
      { frame: 0, pose: IDLE_EXHALE },
      { frame: 6, pose: SLASH_WIND },
      { frame: 12, pose: SLASH_EXT },
      { frame: 17, pose: SLASH_FOLLOW },
      { frame: 37, pose: IDLE_EXHALE },
    ],
  },
  jumpAttack: {
    id: "jumpAttack",
    length: 22,
    loop: false,
    keys: [
      { frame: 0, pose: JUMP_TUCK },
      { frame: 6, pose: JUMP_ATTACK_EXT },
      { frame: 12, pose: JUMP_ATTACK_EXT },
      { frame: 22, pose: FALL_REACH },
    ],
  },
  sweep: {
    id: "sweep",
    length: 28,
    loop: false,
    keys: [
      { frame: 0, pose: CROUCH },
      { frame: 8, pose: SWEEP_EXT },
      { frame: 12, pose: SWEEP_EXT },
      { frame: 28, pose: CROUCH },
    ],
  },
  special: {
    id: "special",
    length: 48,
    loop: false,
    keys: [
      { frame: 0, pose: IDLE_EXHALE },
      { frame: 6, pose: SPECIAL_WIND },
      { frame: 10, pose: SPECIAL_EXT },
      { frame: 20, pose: SPECIAL_FOLLOW },
      { frame: 48, pose: IDLE_EXHALE },
    ],
  },
  hitstun: { id: "hitstun", length: 1, loop: false, keys: [{ frame: 0, pose: HITSTUN }] },
  knockdown: { id: "knockdown", length: 16, loop: false, keys: KNOCKDOWN_KEYS },
  getUp: {
    id: "getUp",
    length: 20,
    loop: false,
    keys: [
      { frame: 0, pose: LYING },
      { frame: 10, pose: CROUCH },
      { frame: 20, pose: IDLE_EXHALE },
    ],
  },
  ko: { id: "ko", length: 16, loop: false, keys: KNOCKDOWN_KEYS },
  victory: {
    id: "victory",
    length: 40,
    loop: true,
    keys: [
      { frame: 0, pose: VICTORY_A },
      { frame: 20, pose: VICTORY_B },
    ],
  },
  defeat: { id: "defeat", length: 1, loop: false, keys: [{ frame: 0, pose: DEFEAT }] },
};
