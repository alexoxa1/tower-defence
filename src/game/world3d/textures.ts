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

type CacheKey =
  | "ground"
  | "road"
  | "lava"
  | "rock"
  | "brushed"
  | "runes"
  | "frost";

const cache: Partial<Record<CacheKey, THREE.CanvasTexture>> = {};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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

function tileFbm(
  noise: SimplexNoise,
  u: number,
  v: number,
  freq: number,
  octaves: number,
): number {
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

function makeCanvas(
  size: number,
  seed: number,
  paint: (data: Uint8ClampedArray, noise: SimplexNoise, size: number) => void,
): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.userData.shared = true;
    return tex;
  }
  const img = ctx.createImageData(size, size);
  const rand = seeded(seed);
  const noise = new SimplexNoise({ random: rand });
  paint(img.data, noise, size);
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.userData.shared = true;
  tex.needsUpdate = true;
  return tex;
}

function get(key: CacheKey, build: () => THREE.CanvasTexture): THREE.CanvasTexture {
  const hit = cache[key];
  if (hit) return hit;
  const tex = build();
  cache[key] = tex;
  return tex;
}

export function getGroundMap(): THREE.CanvasTexture {
  return get("ground", () =>
    makeCanvas(512, 90211, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const n = tileFbm(noise, u, v, 4, 5);
          const grit = tileNoise(noise, u, v, 28);
          const ridge = 1 - Math.abs(tileFbm(noise, u + 0.17, v, 6, 3));
          const crack = ridge > 0.88 ? (ridge - 0.88) / 0.12 : 0;
          const ash = (n + 1) * 0.5;
          const r = 52 + ash * 78 + grit * 16 - crack * 42;
          const g = 50 + ash * 70 + grit * 12 - crack * 38;
          const b = 56 + ash * 74 + grit * 14 - crack * 34;
          const amber = grit > 0.55 ? (grit - 0.55) * 28 : 0;
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, r + amber * 1.4));
          data[i + 1] = Math.max(0, Math.min(255, g + amber * 0.7));
          data[i + 2] = Math.max(0, Math.min(255, b));
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getRoadMap(): THREE.CanvasTexture {
  return get("road", () =>
    makeCanvas(512, 44021, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const n = tileFbm(noise, u, v, 5, 4);
          const scratch = Math.pow(Math.abs(Math.sin(v * 42 + n * 6)), 10);
          const wear = (n + 1) * 0.5;
          const r = 36 + wear * 32 + scratch * 36;
          const g = 32 + wear * 26 + scratch * 24;
          const b = 28 + wear * 22 + scratch * 14;
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getLavaMap(): THREE.CanvasTexture {
  return get("lava", () =>
    makeCanvas(512, 77113, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const n = tileFbm(noise, u, v, 3, 4);
          const seam =
            Math.pow(1 - Math.abs(Math.sin(u * 18 + n * 4) * Math.cos(v * 7 + n * 3)), 10) +
            Math.pow(1 - Math.abs(tileNoise(noise, u, v, 9)), 8) * 0.45;
          const glow = Math.min(1, seam);
          const i = (y * size + x) * 4;
          data[i] = Math.min(255, 40 + glow * 215);
          data[i + 1] = Math.min(255, 12 + glow * 90);
          data[i + 2] = Math.min(255, 6 + glow * 18);
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getRockMap(): THREE.CanvasTexture {
  return get("rock", () =>
    makeCanvas(512, 33019, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const n = tileFbm(noise, u, v, 6, 4);
          const pit = tileNoise(noise, u, v, 18);
          const shade = (n + 1) * 0.5;
          const r = 78 + shade * 58 + pit * 18;
          const g = 72 + shade * 50 + pit * 10;
          const b = 68 + shade * 46;
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, r));
          data[i + 1] = Math.max(0, Math.min(255, g));
          data[i + 2] = Math.max(0, Math.min(255, b));
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getBrushedMap(): THREE.CanvasTexture {
  return get("brushed", () =>
    makeCanvas(256, 55102, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const streak = tileNoise(noise, u * 0.15 + v, v * 18, 2);
          const grain = tileNoise(noise, u, v, 40) * 0.12;
          const l = 0.78 + streak * 0.16 + grain;
          const c = Math.max(0, Math.min(255, l * 255));
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
  return get("runes", () =>
    makeCanvas(256, 99014, (data, noise, size) => {
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
          data[i] = Math.min(255, glow * 255);
          data[i + 1] = Math.min(255, glow * 140);
          data[i + 2] = Math.min(255, glow * 40);
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function getFrostMap(): THREE.CanvasTexture {
  return get("frost", () =>
    makeCanvas(256, 22088, (data, noise, size) => {
      for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
          const u = x / size;
          const v = y / size;
          const n = tileFbm(noise, u, v, 7, 4);
          const flake = tileNoise(noise, u, v, 36) > 0.7 ? 0.35 : 0;
          const l = 0.62 + n * 0.2 + flake;
          const i = (y * size + x) * 4;
          data[i] = Math.max(0, Math.min(255, (l * 0.85 + 0.2) * 216));
          data[i + 1] = Math.max(0, Math.min(255, (l * 0.95 + 0.2) * 255));
          data[i + 2] = Math.max(0, Math.min(255, (l + 0.22) * 246));
          data[i + 3] = 255;
        }
      }
    }),
  );
}

export function warmupWorldTextures(): void {
  getGroundMap();
  getRoadMap();
  getLavaMap();
  getRockMap();
  getBrushedMap();
  getRuneMap();
  getFrostMap();
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
`,
    );
  };
  mat.customProgramCacheKey = () => `cw-worldxz-${scale}`;
}
