export const DEG2RAD = Math.PI / 180;

export type EaseFn = (t: number) => number;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export const linear: EaseFn = (t) => t;
export const easeInOutSine: EaseFn = (t) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutQuad: EaseFn = (t) => 1 - (1 - t) * (1 - t);
