// Konstanta global engine. Angka sesuai GDD Bagian 6 dan 8.
// Angka penyeimbang gameplay (damage, stamina, dsb) sengaja TIDAK di sini, tapi di game/data.

export const LOGICAL_WIDTH = 1280;
export const LOGICAL_HEIGHT = 720;

/** Update logika tetap 60 kali per detik (dt = 1/60). */
export const TICKS_PER_SECOND = 60;
export const FIXED_DT = 1 / TICKS_PER_SECOND;
/** Batas dt per frame agar game tidak melompat saat tab tidak aktif. */
export const MAX_FRAME_TIME = 0.1;

// Arena dan fisika (sumbu y ke bawah)
export const FLOOR_Y = 600;
export const ARENA_MIN_X = 60;
export const ARENA_MAX_X = 1220;
export const GRAVITY = 0.9;
export const MAX_FALL_SPEED = 18;
export const GROUND_FRICTION = 0.82;
export const AIR_FRICTION = 0.96;
export const PUSHBOX_WIDTH = 40;
/**
 * Tinggi pushbox: berdiri (juga saat di udara) dan jongkok. Kaki berada di dasar kotak.
 * Sengaja lebih rendah dari tinggi badan agar fighter bisa melompat melewati lawan (cross-up).
 */
export const PUSHBOX_HEIGHT_STAND = 90;
export const PUSHBOX_HEIGHT_CROUCH = 60;

/** Proporsi skeleton stickman dalam piksel (GDD Bagian 8.1). */
export const SKELETON = {
  headRadius: 14,
  torso: 50,
  upperArm: 26,
  lowerArm: 26,
  thigh: 32,
  calf: 32,
  lineWidth: 6,
} as const;

/** Jumlah frame untuk crossfade antar animasi. */
export const ANIM_BLEND_FRAMES = 6;
