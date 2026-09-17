import * as THREE from "three";
import { SimplexNoise } from "three/examples/jsm/math/SimplexNoise.js";

export function seeded(seed: number): () => number {
  let s = seed % 2147483646;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function layoutSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  }
  return (h >>> 0) % 2147483646 + 1;
}

type SurfaceKey = "ground" | "road" | "lava" | "rock";
type FlatKey = "brushed" | "runes" | "frost" | "glow" | "scorch";
type CacheKey = SurfaceKey | `${SurfaceKey}-normal` | `${SurfaceKey}-rough` | FlatKey;

const cache: Partial<Record<CacheKey, THREE.CanvasTexture>> = {};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, v));
}

function tileNoise(noise: SimplexNoise, u: number, v: number, freq: number): number {
  const x = u * freq;
  const y = v * freq;
  const n00 = noise.noise(x, y);
  const n10 = noise.noise(x - freq, y);
  const n01 = noise.noise(x, y - freq);
  const n11 = noise.noise(x - freq, y - freq);
  return lerp(lerp(n00, n10, u), lerp(n01, n11, u), v);
}

function tileFbm(noise: SimplexNoise, u: number, v: number, freq: number, octaves: number): number {
  let sum = 0;
  let amp = 0.5;
  let f = freq;
  let norm = 0;
  for (let i = 0; i < octaves; i += 1) {
    sum += tileNoise(noise, u, v, f) * amp;
    norm += amp;
    amp *= 0.5;
    f *= 2;
  }
  return sum / norm;
}

/** Tileable cellular noise. Returns nearest / second-nearest feature distances and the cell id. */
class Worley {
  private px: Float32Array;
  private py: Float32Array;
  constructor(
    private cells: number,
    rand: () => number,
  ) {
    this.px = new Float32Array(cells * cells);
    this.py = new Float32Array(cells * cells);
    for (let i = 0; i < cells * cells; i += 1) {
      this.px[i] = rand();
      this.py[i] = rand();
    }
  }

  sample(u: number, v: number): { f1: number; f2: number; id: number } {
    const n = this.cells;
    const x = u * n;
    const y = v * n;
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    let f1 = 9;
    let f2 = 9;
    let id = 0;
    for (let oy = -1; oy <= 1; oy += 1) {
      for (let ox = -1; ox <= 1; ox += 1) {
        const gx = (cx + ox + n) % n;
        const gy = (cy + oy + n) % n;
        const i = gy * n + gx;
        const fx = cx + ox + this.px[i];
        const fy = cy + oy + this.py[i];
        const d = (fx - x) * (fx - x) + (fy - y) * (fy - y);
        if (d < f1) {
          f2 = f1;
          f1 = d;
          id = i;
        } else if (d < f2) {
          f2 = d;
        }
      }
    }
    return { f1: Math.sqrt(f1), f2: Math.sqrt(f2), id };
  }
}

interface SurfacePaint {
  (
    data: Uint8ClampedArray,
    height: Float32Array,
    rough: Float32Array,
    ctx: { noise: SimplexNoise; rand: () => number; size: number },
  ): void;
}

function canvasTexture(canvas: HTMLCanvasElement, srgb: boolean): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.userData.shared = true;
  tex.needsUpdate = true;
  return tex;
}

function blankCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D | null } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return { canvas, ctx: canvas.getContext("2d") };
}

/** Sobel of a wrapped height field into a tangent-space normal map. */
function heightToNormal(height: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const { canvas, ctx } = blankCanvas(size);
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const tl = at(x - 1, y - 1);
      const l = at(x - 1, y);
      const bl = at(x - 1, y + 1);
      const tr = at(x + 1, y - 1);
      const r = at(x + 1, y);
      const br = at(x + 1, y + 1);
      const t = at(x, y - 1);
      const b = at(x, y + 1);
      const dx = tr + 2 * r + br - (tl + 2 * l + bl);
      const dy = bl + 2 * b + br - (tl + 2 * t + tr);
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      nz /= len;
      const i = (y * size + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      img.data[i + 2] = (nz * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function roughToCanvas(rough: Float32Array, size: number): HTMLCanvasElement {
  const { canvas, ctx } = blankCanvas(size);
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i += 1) {
    const v = clamp255(rough[i] * 255);
    img.data[i * 4] = v;
    img.data[i * 4 + 1] = v;
    img.data[i * 4 + 2] = v;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function buildSurface(key: SurfaceKey, size: number, seed: number, normalStrength: number, paint: SurfacePaint): void {
  const { canvas, ctx } = blankCanvas(size);
  const height = new Float32Array(size * size);
  const rough = new Float32Array(size * size).fill(0.9);
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const rand = seeded(seed);
    const noise = new SimplexNoise({ random: rand });
    paint(img.data, height, rough, { noise, rand, size });
    ctx.putImageData(img, 0, 0);
  }
  cache[key] = canvasTexture(canvas, true);
  cache[`${key}-normal`] = canvasTexture(heightToNormal(height, size, normalStrength), false);
  cache[`${key}-rough`] = canvasTexture(roughToCanvas(rough, size), false);
}

function surface(key: SurfaceKey, build: () => void): THREE.CanvasTexture {
  if (!cache[key]) build();
  return cache[key] as THREE.CanvasTexture;
}

function makeFlat(
  size: number,
  seed: number,
  paint: (data: Uint8ClampedArray, noise: SimplexNoise, size: number) => void,
  srgb = true,
): THREE.CanvasTexture {
  const { canvas, ctx } = blankCanvas(size);
  if (ctx) {
    const img = ctx.createImageData(size, size);
    const rand = seeded(seed);
    const noise = new SimplexNoise({ random: rand });
    paint(img.data, noise, size);
    ctx.putImageData(img, 0, 0);
  }
  return canvasTexture(canvas, srgb);
}

function flat(key: FlatKey, build: () => THREE.CanvasTexture): THREE.CanvasTexture {
  const hit = cache[key];
  if (hit) return hit;
  const tex = build();
  cache[key] = tex;
  return tex;
}

// ---------------------------------------------------------------------------------------------
// Ground: cracked ash basalt plates with moss pockets and faint ember veins in the cracks.

function buildGround(): void {
  buildSurface("ground", 512, 90211, 2.6, (data, height, rough, { noise, rand, size }) => {
    const plates = new Worley(9, rand);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        const warp = tileFbm(noise, u, v, 3, 3) * 0.02;
        const cell = plates.sample(u + warp, v - warp);
        const edge = cell.f2 - cell.f1; // 0 at plate borders
        const crack = edge < 0.06 ? 1 - edge / 0.06 : 0;
        const n = tileFbm(noise, u, v, 4, 5);
        const grit = tileNoise(noise, u, v, 36);
        const ash = (n + 1) * 0.5;
        const blob = (tileFbm(noise, u + 0.31, v + 0.17, 2, 3) + 1) * 0.5;
        const moss = blob > 0.74 ? Math.min(1, (blob - 0.74) / 0.16) : 0;
        const plateShade = ((cell.id * 7919) % 17) / 17 - 0.5;
        const ember = crack * Math.max(0, tileNoise(noise, u * 2, v * 2, 6)) * 0.55;
        const r = 66 + ash * 78 + grit * 10 + plateShade * 14 - crack * 46 - moss * 8 + ember * 190;
        const g = 68 + ash * 76 + grit * 8 + plateShade * 12 - crack * 42 + moss * (10 + blob * 8) + ember * 70;
        const b = 78 + ash * 80 + grit * 10 + plateShade * 14 - crack * 34 - moss * 2 + ember * 10;
        const i = (y * size + x) * 4;
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        const p = y * size + x;
        height[p] = ash * 0.35 + plateShade * 0.15 - crack * 0.8 + grit * 0.06 + moss * 0.08;
        rough[p] = 0.88 + crack * 0.08 - ember * 0.4 - moss * 0.1 + grit * 0.04;
      }
    }
  });
}

export function getGroundMap(): THREE.CanvasTexture {
  return surface("ground", buildGround);
}
export function getGroundNormalMap(): THREE.CanvasTexture {
  surface("ground", buildGround);
  return cache["ground-normal"] as THREE.CanvasTexture;
}
export function getGroundRoughnessMap(): THREE.CanvasTexture {
  surface("ground", buildGround);
  return cache["ground-rough"] as THREE.CanvasTexture;
}

// ---------------------------------------------------------------------------------------------
// Road: fitted cobbles with two worn wheel ruts along V.

function buildRoad(): void {
  buildSurface("road", 512, 44021, 3.2, (data, height, rough, { noise, rand, size }) => {
    const cobbles = new Worley(14, rand);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        const n = tileFbm(noise, u, v, 5, 4);
        const cell = cobbles.sample(u, v);
        const gap = cell.f2 - cell.f1;
        const mortar = gap < 0.08 ? 1 - gap / 0.08 : 0;
        const dome = Math.max(0, 1 - cell.f1 * 2.2);
        const stoneShade = ((cell.id * 4271) % 13) / 13 - 0.5;
        const rutA = Math.exp(-Math.pow((u - 0.3) * 9, 2));
        const rutB = Math.exp(-Math.pow((u - 0.7) * 9, 2));
        const rut = Math.min(1, rutA + rutB) * (0.7 + n * 0.3);
        const scratch = Math.pow(Math.abs(Math.sin(v * 42 + n * 6)), 12) * rut;
        const wear = (n + 1) * 0.5;
        const r = 40 + wear * 30 + stoneShade * 18 - mortar * 22 - rut * 14 + scratch * 30;
        const g = 36 + wear * 26 + stoneShade * 16 - mortar * 20 - rut * 12 + scratch * 22;
        const b = 34 + wear * 24 + stoneShade * 16 - mortar * 18 - rut * 10 + scratch * 14;
        const i = (y * size + x) * 4;
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        const p = y * size + x;
        height[p] = dome * 0.5 - mortar * 0.6 - rut * 0.25 + stoneShade * 0.1 + n * 0.05;
        rough[p] = 0.82 + mortar * 0.12 - rut * 0.22 + stoneShade * 0.04;
      }
    }
  });
}

export function getRoadMap(): THREE.CanvasTexture {
  return surface("road", buildRoad);
}
export function getRoadNormalMap(): THREE.CanvasTexture {
  surface("road", buildRoad);
  return cache["road-normal"] as THREE.CanvasTexture;
}
export function getRoadRoughnessMap(): THREE.CanvasTexture {
  surface("road", buildRoad);
  return cache["road-rough"] as THREE.CanvasTexture;
}

// ---------------------------------------------------------------------------------------------
// Lava: emissive mask. Bright veins between cooling crust cells.

function buildLava(): void {
  buildSurface("lava", 512, 77113, 2.0, (data, height, rough, { noise, rand, size }) => {
    const crust = new Worley(7, rand);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        const n = tileFbm(noise, u, v, 3, 4);
        const warp = n * 0.035;
        const cell = crust.sample(u + warp, v - warp);
        const gap = cell.f2 - cell.f1;
        const vein = gap < 0.1 ? Math.pow(1 - gap / 0.1, 1.6) : 0;
        const pool = Math.pow(1 - Math.abs(tileNoise(noise, u, v, 12)), 6) * 0.3;
        const glow = Math.min(1, vein + pool);
        const i = (y * size + x) * 4;
        data[i] = clamp255(22 + glow * 250);
        data[i + 1] = clamp255(2 + glow * 48);
        data[i + 2] = clamp255(1 + glow * 8);
        data[i + 3] = 255;
        const p = y * size + x;
        height[p] = -vein * 0.7 + n * 0.1;
        rough[p] = 0.7 - glow * 0.4;
      }
    }
  });
}

export function getLavaMap(): THREE.CanvasTexture {
  return surface("lava", buildLava);
}
export function getLavaNormalMap(): THREE.CanvasTexture {
  surface("lava", buildLava);
  return cache["lava-normal"] as THREE.CanvasTexture;
}

// ---------------------------------------------------------------------------------------------
// Rock: pitted stone.

function buildRock(): void {
  buildSurface("rock", 512, 33019, 2.4, (data, height, rough, { noise, size }) => {
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const u = x / size;
        const v = y / size;
        const n = tileFbm(noise, u, v, 6, 4);
        const pit = tileNoise(noise, u, v, 18);
        const strata = Math.pow(Math.abs(Math.sin(v * 22 + n * 4)), 8) * 0.5;
        const shade = (n + 1) * 0.5;
        const r = 66 + shade * 55 + pit * 10 - strata * 18;
        const g = 70 + shade * 54 + pit * 8 - strata * 16;
        const b = 82 + shade * 56 + pit * 10 - strata * 14;
        const i = (y * size + x) * 4;
        data[i] = clamp255(r);
        data[i + 1] = clamp255(g);
        data[i + 2] = clamp255(b);
        data[i + 3] = 255;
        const p = y * size + x;
        height[p] = shade * 0.4 + pit * 0.25 - strata * 0.3;
        rough[p] = 0.92 - shade * 0.08;
      }
    }
  });
}

export function getRockMap(): THREE.CanvasTexture {
  return surface("rock", buildRock);
}
export function getRockNormalMap(): THREE.CanvasTexture {
  surface("rock", buildRock);
  return cache["rock-normal"] as THREE.CanvasTexture;
}

// ---------------------------------------------------------------------------------------------
// Flat detail maps.

export function getBrushedMap(): THREE.CanvasTexture {
  return flat("brushed", () =>
    makeFlat(256, 55102, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const streak = tileNoise(noise, u * 0.15 + v, v * 18, 2);
          const grain = tileNoise(noise, u, v, 40) * 0.12;
          const l = 0.78 + streak * 0.16 + grain;
          const c = clamp255(l * 255);
          const i = (y * size + x) * 4;
          data[i] = c;
          data[i + 1] = c;
          data[i + 2] = c;
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getRuneMap(): THREE.CanvasTexture {
  return flat("runes", () =>
    makeFlat(256, 99014, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const gx = Math.abs((u * 8) % 1 - 0.5);
          const gy = Math.abs((v * 8) % 1 - 0.5);
          const grid = gx < 0.03 || gy < 0.03 ? 1 : 0;
          const mark = tileNoise(noise, u, v, 12) > 0.55 ? 1 : 0;
          const line = Math.pow(1 - Math.abs(Math.sin(u * 26) * Math.sin(v * 9)), 16);
          const glow = Math.min(1, grid * 0.55 + mark * 0.35 + line);
          const i = (y * size + x) * 4;
          data[i] = clamp255(glow * 255);
          data[i + 1] = clamp255(glow * 140);
          data[i + 2] = clamp255(glow * 40);
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getFrostMap(): THREE.CanvasTexture {
  return flat("frost", () =>
    makeFlat(256, 22088, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const n = tileFbm(noise, u, v, 7, 4);
          const flake = tileNoise(noise, u, v, 36) > 0.7 ? 0.35 : 0;
          const l = 0.62 + n * 0.2 + flake;
          const i = (y * size + x) * 4;
          data[i] = clamp255((l * 0.85 + 0.2) * 216);
          data[i + 1] = clamp255((l * 0.95 + 0.2) * 255);
          data[i + 2] = clamp255((l + 0.22) * 246);
          data[i + 3] = 255;
        }
      }
    }),
  );
}

/** Soft radial glow for muzzle flashes and impact flares. */
export function getGlowSprite(): THREE.CanvasTexture {
  return flat("glow", () => {
    const size = 128;
    const { canvas, ctx } = blankCanvas(size);
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.25, "rgba(255,255,255,0.85)");
      grad.addColorStop(0.6, "rgba(255,255,255,0.18)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
    }
    const tex = canvasTexture(canvas, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

/** Soot scorch ring left by a Mortar Post Splash. */
export function getScorchSprite(): THREE.CanvasTexture {
  return flat("scorch", () => {
    const size = 128;
    const { canvas, ctx } = blankCanvas(size);
    if (ctx) {
      const rand = seeded(5150);
      const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      grad.addColorStop(0, "rgba(10,6,4,0.95)");
      grad.addColorStop(0.55, "rgba(12,8,6,0.7)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, size, size);
      ctx.globalCompositeOperation = "destination-out";
      for (let i = 0; i < 26; i += 1) {
        const a = rand() * Math.PI * 2;
        const r = 30 + rand() * 34;
        ctx.beginPath();
        ctx.arc(64 + Math.cos(a) * r, 64 + Math.sin(a) * r, 5 + rand() * 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const tex = canvasTexture(canvas, true);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    return tex;
  });
}

export function warmupWorldTextures(): void {
  getGroundMap();
  getRoadMap();
  getLavaMap();
  getRockMap();
  getBrushedMap();
  getRuneMap();
  getFrostMap();
  getGlowSprite();
  getScorchSprite();
}

export function setWorldTextureAnisotropy(value: number): void {
  for (const tex of Object.values(cache)) {
    if (!tex) continue;
    tex.anisotropy = value;
    tex.needsUpdate = true;
  }
}

export function disposeWorldTextures(): void {
  for (const key of Object.keys(cache) as CacheKey[]) {
    cache[key]?.dispose();
    delete cache[key];
  }
}

/** Samples map, emissive, normal, and roughness maps by world XZ so Road pieces tile seamlessly. */
export function useWorldXZMap(mat: THREE.MeshStandardMaterial, scale: number): void {
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      "#include <project_vertex>",
      `#include <project_vertex>
#ifdef USE_MAP
  vMapUv = (modelMatrix * vec4(transformed, 1.0)).xz * ${scale.toFixed(4)};
#endif
#ifdef USE_EMISSIVEMAP
  vEmissiveMapUv = (modelMatrix * vec4(transformed, 1.0)).xz * ${scale.toFixed(4)};
#endif
#ifdef USE_ROUGHNESSMAP
  vRoughnessMapUv = (modelMatrix * vec4(transformed, 1.0)).xz * ${scale.toFixed(4)};
#endif
#ifdef USE_NORMALMAP
  vNormalMapUv = (modelMatrix * vec4(transformed, 1.0)).xz * ${scale.toFixed(4)};
#endif
`,
    );
  };
  mat.customProgramCacheKey = () => `cw-worldxz-${scale}`;
}
