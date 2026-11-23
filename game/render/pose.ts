import { clamp, easeInOutSine, lerp } from "../core/math";
import type { EaseFn } from "../core/math";
import type { Animation, Keyframe, Pose } from "../types";

export function createPose(): Pose {
  return { torsoLean: 0, headTilt: 0, armL: [0, 0], armR: [0, 0], legL: [0, 0], legR: [0, 0] };
}

export function copyPose(from: Pose, to: Pose): void {
  to.torsoLean = from.torsoLean;
  to.headTilt = from.headTilt;
  to.armL[0] = from.armL[0];
  to.armL[1] = from.armL[1];
  to.armR[0] = from.armR[0];
  to.armR[1] = from.armR[1];
  to.legL[0] = from.legL[0];
  to.legL[1] = from.legL[1];
  to.legR[0] = from.legR[0];
  to.legR[1] = from.legR[1];
}

/** Interpolasi linear antar dua pose. Hasil ditulis ke `out` (tanpa alokasi objek baru di dalam loop). */
export function lerpPose(a: Pose, b: Pose, t: number, out: Pose): void {
  out.torsoLean = lerp(a.torsoLean, b.torsoLean, t);
  out.headTilt = lerp(a.headTilt, b.headTilt, t);
  out.armL[0] = lerp(a.armL[0], b.armL[0], t);
  out.armL[1] = lerp(a.armL[1], b.armL[1], t);
  out.armR[0] = lerp(a.armR[0], b.armR[0], t);
  out.armR[1] = lerp(a.armR[1], b.armR[1], t);
  out.legL[0] = lerp(a.legL[0], b.legL[0], t);
  out.legL[1] = lerp(a.legL[1], b.legL[1], t);
  out.legR[0] = lerp(a.legR[0], b.legR[0], t);
  out.legR[1] = lerp(a.legR[1], b.legR[1], t);
}

/**
 * Mengambil pose animasi pada frame tertentu (boleh pecahan dan boleh negatif untuk animasi mundur).
 * Animasi loop membungkus frame; animasi non-loop menahan di keyframe terakhir.
 */
export function sampleAnimation(
  anim: Animation,
  frame: number,
  out: Pose,
  ease: EaseFn = easeInOutSine,
): void {
  const keys = anim.keys;
  const f = anim.loop ? ((frame % anim.length) + anim.length) % anim.length : clamp(frame, 0, anim.length);

  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].frame <= f) i++;

  const from: Keyframe = keys[i];
  let to: Keyframe;
  let toFrame: number;
  if (i < keys.length - 1) {
    to = keys[i + 1];
    toFrame = to.frame;
  } else if (anim.loop) {
    to = keys[0];
    toFrame = anim.length;
  } else {
    copyPose(from.pose, out);
    return;
  }

  const span = toFrame - from.frame;
  const t = span <= 0 ? 0 : (f - from.frame) / span;
  lerpPose(from.pose, to.pose, ease(t), out);
}
