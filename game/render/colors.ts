/** Mengalikan kanal RGB warna "#rrggbb" dengan factor (0..1 menggelapkan). */
export function shadeColor(hex: string, factor: number): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const value = parseInt(match[1], 16);
  const r = Math.round(((value >> 16) & 255) * factor);
  const g = Math.round(((value >> 8) & 255) * factor);
  const b = Math.round((value & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}
