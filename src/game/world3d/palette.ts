import type { EnemyKind, TowerType } from "../types";

/** Tower swatches from DESIGN.md. The 3D view tints kit palettes toward these. */
export const TOWER_ACCENT: Record<TowerType, number> = {
  basic: 0xff6a1a,
  cannon: 0x2ee6c5,
  sniper: 0xd8fff6,
  beacon: 0xe8a54b,
  lantern: 0x7dcea0,
};

/** Body tint and glow per Enemy kind. Kept in the soot / filament / danger range. No purple. */
export const ENEMY_TINT: Record<EnemyKind, { body: number; glow: number; height: number }> = {
  creep: { body: 0xb8a58e, glow: 0x2a1810, height: 1.35 },
  runner: { body: 0x9fb3a6, glow: 0x0a3a30, height: 1.2 },
  brute: { body: 0x8f8a86, glow: 0x2a1810, height: 1.8 },
  swarm: { body: 0xd8c47a, glow: 0x3a2a08, height: 0.75 },
  warden: { body: 0xa3a9b8, glow: 0x0c2a28, height: 1.85 },
  shade: { body: 0xd8fff6, glow: 0x7dcea0, height: 1.5 },
  colossus: { body: 0x7a5a4a, glow: 0x6a1a08, height: 2.8 },
  overlord: { body: 0x6a3a3a, glow: 0x7a1006, height: 3.4 },
};

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: number): Rgb {
  return { r: (hex >> 16) & 255, g: (hex >> 8) & 255, b: hex & 255 };
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h, s, l];
}

function hue(p: number, q: number, t: number): number {
  let x = t;
  if (x < 0) x += 1;
  if (x > 1) x -= 1;
  if (x < 1 / 6) return p + (q - p) * 6 * x;
  if (x < 1 / 2) return q;
  if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3), hue(p, q, h), hue(p, q, h - 1 / 3)];
}

export interface RecolorOptions {
  /** Saturation above which a palette cell counts as an accent and takes the tower hue. */
  accentThreshold?: number;
  /** Multiplier for the lightness of neutral (stone / metal) cells. */
  neutralLightness?: number;
  /** Multiplier for the lightness of wood-brown cells. */
  woodLightness?: number;
}

/**
 * Writes a grayscale emissive mask: accent (saturated, non-wood) cells glow by their lightness,
 * everything else is black. Run this before recolorPalette on the same source pixels.
 */
export function paletteAccentMask(src: Uint8ClampedArray, out: Uint8ClampedArray, threshold = 0.28): void {
  for (let i = 0; i < src.length; i += 4) {
    const [h, s, l] = rgbToHsl(src[i] / 255, src[i + 1] / 255, src[i + 2] / 255);
    const isWood = s >= threshold && h > 0.03 && h < 0.12 && l < 0.7;
    const glow = s >= threshold && !isWood ? Math.round(Math.min(1, 0.45 + l * 0.7) * 255) : 0;
    out[i] = glow;
    out[i + 1] = glow;
    out[i + 2] = glow;
    out[i + 3] = 255;
  }
}

/**
 * Recolors an RGBA palette in place. Saturated cells become the accent color, keeping their
 * shading gradient. Neutral grays darken toward soot. Browns (wood) darken and desaturate.
 * Pure function over pixel data so it can run without a canvas.
 */
export function recolorPalette(data: Uint8ClampedArray, accent: Rgb, options: RecolorOptions = {}): void {
  const threshold = options.accentThreshold ?? 0.28;
  const neutralLightness = options.neutralLightness ?? 0.62;
  const woodLightness = options.woodLightness ?? 0.72;
  const [ah, as, al] = rgbToHsl(accent.r / 255, accent.g / 255, accent.b / 255);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [h, s, l] = rgbToHsl(data[i] / 255, data[i + 1] / 255, data[i + 2] / 255);
    let out: [number, number, number];
    const isWood = s >= threshold && h > 0.03 && h < 0.12 && l < 0.7;
    if (isWood) {
      out = hslToRgb(h, s * 0.55, l * woodLightness);
    } else if (s >= threshold) {
      // Keep the cell's gradient (relative lightness) but center it on the accent lightness.
      const shade = (l - 0.5) * 0.7;
      out = hslToRgb(ah, Math.min(1, as * 0.95), Math.min(0.94, Math.max(0.08, al + shade)));
    } else {
      out = hslToRgb(0.09, Math.min(0.12, s + 0.06), l * neutralLightness);
    }
    data[i] = Math.round(out[0] * 255);
    data[i + 1] = Math.round(out[1] * 255);
    data[i + 2] = Math.round(out[2] * 255);
  }
}
