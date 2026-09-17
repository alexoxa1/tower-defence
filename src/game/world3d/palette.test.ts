import { describe, expect, it } from "vitest";
import { hexToRgb, paletteAccentMask, recolorPalette, TOWER_ACCENT } from "./palette";

function pixels(...rgb: [number, number, number][]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(rgb.length * 4);
  rgb.forEach(([r, g, b], i) => {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  });
  return data;
}

describe("recolorPalette", () => {
  it("turns saturated accent cells toward the Tower swatch", () => {
    const data = pixels([90, 120, 220], [230, 80, 220]);
    recolorPalette(data, hexToRgb(TOWER_ACCENT.basic));
    // Hex Gun orange: red dominates, blue is low, for both the blue and the purple source cell.
    for (let i = 0; i < data.length; i += 4) {
      expect(data[i]).toBeGreaterThan(data[i + 2]);
      expect(data[i]).toBeGreaterThan(data[i + 1]);
    }
  });

  it("darkens neutral stone cells toward soot without adding hue", () => {
    const data = pixels([150, 150, 150]);
    recolorPalette(data, hexToRgb(TOWER_ACCENT.cannon));
    expect(data[0]).toBeLessThan(150);
    expect(Math.abs(data[0] - data[2])).toBeLessThan(30);
    expect(data[3]).toBe(255);
  });

  it("keeps wood brown as brown, only darker", () => {
    const data = pixels([176, 96, 60]);
    recolorPalette(data, hexToRgb(TOWER_ACCENT.cannon));
    expect(data[0]).toBeGreaterThan(data[1]);
    expect(data[1]).toBeGreaterThan(data[2]);
    expect(data[0]).toBeLessThan(176);
  });

  it("masks accent cells for emissive and leaves stone and wood dark", () => {
    const src = pixels([90, 120, 220], [150, 150, 150], [176, 96, 60]);
    const out = new Uint8ClampedArray(src.length);
    paletteAccentMask(src, out);
    expect(out[0]).toBeGreaterThan(100);
    expect(out[4]).toBe(0);
    expect(out[8]).toBe(0);
    expect(out[3]).toBe(255);
  });

  it("skips transparent pixels", () => {
    const data = new Uint8ClampedArray([10, 200, 30, 0]);
    recolorPalette(data, hexToRgb(TOWER_ACCENT.sniper));
    expect([...data]).toEqual([10, 200, 30, 0]);
  });
});
