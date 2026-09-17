import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Point } from "../types";
import { logicalToWorld } from "./coords";
import { getRockMap, getRockNormalMap, layoutSeed, seeded } from "./textures";

export interface WindUniforms {
  uTime: { value: number };
  uWind: { value: number };
}

const _matrix = new THREE.Matrix4();
const _pos = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _scale = new THREE.Vector3();
const _euler = new THREE.Euler();
const _color = new THREE.Color();

export type OccupiedFn = (wx: number, wz: number, pad: number) => boolean;

/** Optional kit geometries (vertex-colored, ground at y=0) that replace the procedural shapes. */
export interface FloraProps {
  pine?: THREE.BufferGeometry;
  squat?: THREE.BufferGeometry;
  broadleaf?: THREE.BufferGeometry;
  shrub?: THREE.BufferGeometry;
  grass?: THREE.BufferGeometry;
  slab?: THREE.BufferGeometry;
}

function paint(geo: THREE.BufferGeometry, r: number, g: number, b: number): THREE.BufferGeometry {
  const n = geo.attributes.position.count;
  const col = new Float32Array(n * 3);
  for (let i = 0; i < n; i += 1) {
    col[i * 3] = r;
    col[i * 3 + 1] = g;
    col[i * 3 + 2] = b;
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  geo.deleteAttribute("uv");
  return geo;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const prepared = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = mergeGeometries(prepared, false);
  for (const part of parts) part.dispose();
  for (const p of prepared) {
    if (!parts.includes(p)) p.dispose();
  }
  if (!merged) {
    if (import.meta.env.DEV) console.warn("[world3d] mergeGeometries failed");
    return new THREE.BufferGeometry();
  }
  merged.computeVertexNormals();
  return merged;
}

function pineGeom(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.06, 0.1, 0.5, 5);
  trunk.translate(0, 0.25, 0);
  paint(trunk, 0.1, 0.08, 0.07);
  const parts: THREE.BufferGeometry[] = [trunk];
  const layers: [number, number, number, number, number][] = [
    [0.46, 0.44, 0.1, 0.18, 0.15],
    [0.34, 0.74, 0.14, 0.26, 0.2],
    [0.2, 0.98, 0.22, 0.38, 0.3],
  ];
  for (const [radius, y, r, g, b] of layers) {
    const cone = new THREE.ConeGeometry(radius, 0.42, 6);
    cone.translate(0, y, 0);
    paint(cone, r, g, b);
    parts.push(cone);
  }
  return merge(parts);
}

function squatPineGeom(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.08, 0.14, 0.32, 5);
  trunk.translate(0, 0.16, 0);
  paint(trunk, 0.1, 0.08, 0.07);
  const low = new THREE.ConeGeometry(0.62, 0.42, 6);
  low.translate(0, 0.38, 0);
  paint(low, 0.1, 0.18, 0.15);
  const high = new THREE.ConeGeometry(0.38, 0.34, 6);
  high.translate(0, 0.62, 0);
  paint(high, 0.2, 0.34, 0.28);
  return merge([trunk, low, high]);
}

function broadleafGeom(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.07, 0.12, 0.58, 6);
  trunk.translate(0, 0.29, 0);
  paint(trunk, 0.42, 0.2, 0.07);
  const core = new THREE.IcosahedronGeometry(0.24, 0);
  core.translate(0, 0.7, 0);
  paint(core, 1, 0.48, 0.08);
  const crown = new THREE.IcosahedronGeometry(0.36, 0);
  crown.translate(0.04, 0.88, -0.03);
  paint(crown, 1, 0.5, 0.06);
  return merge([trunk, core, crown]);
}

function shrubGeom(): THREE.BufferGeometry {
  const a = new THREE.IcosahedronGeometry(0.3, 0);
  a.translate(0, 0.28, 0);
  paint(a, 0.35, 0.6, 0.48);
  const b = new THREE.IcosahedronGeometry(0.22, 0);
  b.translate(0.16, 0.24, 0.08);
  paint(b, 0.3, 0.52, 0.42);
  const c = new THREE.IcosahedronGeometry(0.16, 0);
  c.translate(-0.12, 0.22, -0.08);
  paint(c, 0.4, 0.62, 0.5);
  return merge([a, b, c]);
}

function crystalGeom(): THREE.BufferGeometry {
  const core = new THREE.OctahedronGeometry(0.22, 0);
  core.translate(0, 0.28, 0);
  paint(core, 0.45, 0.85, 0.75);
  const spike = new THREE.ConeGeometry(0.08, 0.4, 5);
  spike.translate(0, 0.55, 0);
  paint(spike, 0.4, 0.78, 0.7);
  const side = new THREE.OctahedronGeometry(0.12, 0);
  side.translate(0.16, 0.16, 0.04);
  paint(side, 0.75, 0.42, 0.16);
  return merge([core, spike, side]);
}

function grassGeom(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i += 1) {
    const blade = new THREE.BoxGeometry(0.08, 0.52, 0.032);
    blade.translate(0, 0.26, 0);
    blade.rotateY(i * 1.05);
    blade.rotateZ((i % 3 - 1) * 0.2);
    const tip = i % 2 === 0;
    paint(blade, tip ? 0.38 : 0.22, tip ? 0.52 : 0.34, tip ? 0.42 : 0.26);
    parts.push(blade);
  }
  return merge(parts);
}

function slabRockGeom(): THREE.BufferGeometry {
  const geo = new THREE.DodecahedronGeometry(0.48, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setY(i, pos.getY(i) * 0.42);
    pos.setX(i, pos.getX(i) * 1.15);
  }
  geo.computeVertexNormals();
  return geo;
}

function windMaterial(
  extras: THREE.MeshStandardMaterialParameters,
  wind: WindUniforms,
  tag: string,
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.04,
    flatShading: true,
    ...extras,
  });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.uTime;
    shader.uniforms.uWind = wind.uWind;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <common>",
      `#include <common>
uniform float uTime;
uniform float uWind;`,
    );
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
#ifdef USE_INSTANCING
  float h = max(transformed.y, 0.0);
  float gust = sin(uTime * 1.25 + instanceMatrix[3].x * 0.37 + h);
  float side = cos(uTime * 1.05 + instanceMatrix[3].z * 0.31);
  transformed.x += gust * uWind * h;
  transformed.z += side * uWind * 0.65 * h;
#endif
`,
    );
  };
  mat.customProgramCacheKey = () => `cw-flora-wind-${tag}`;
  return mat;
}

function sampleCorridor(
  road: readonly Point[],
  rand: () => number,
  inner: number,
  outer: number,
): { wx: number; wz: number } {
  const i = Math.min(road.length - 2, Math.floor(rand() * Math.max(1, road.length - 1)));
  const a = road[i];
  const b = road[i + 1];
  const t = rand();
  const lx = a.x + (b.x - a.x) * t;
  const ly = a.y + (b.y - a.y) * t;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const dist = inner + rand() * (outer - inner);
  const side = rand() < 0.5 ? 1 : -1;
  const px = lx + (-dy / len) * dist * side;
  const py = ly + (dx / len) * dist * side;
  const w = logicalToWorld(px, py, 0);
  return { wx: w.x, wz: w.z };
}

type Site = { wx: number; wz: number };

function commitInstance(
  into: THREE.InstancedMesh,
  index: number,
  wx: number,
  wz: number,
  s: number,
  yScale: number,
  tilt: number,
  yaw: number,
  tint: (color: THREE.Color, rand: () => number) => void,
  rand: () => number,
  intoSites?: Site[],
): void {
  _pos.set(wx, 0, wz);
  _euler.set(0, yaw, tilt);
  _quat.setFromEuler(_euler);
  _scale.set(s, yScale, s);
  _matrix.compose(_pos, _quat, _scale);
  into.setMatrixAt(index, _matrix);
  tint(_color, rand);
  into.setColorAt(index, _color);
  intoSites?.push({ wx, wz });
}

function finishLayer(into: THREE.InstancedMesh, n: number): void {
  into.count = n;
  into.instanceMatrix.needsUpdate = true;
  if (into.instanceColor) into.instanceColor.needsUpdate = true;
  into.computeBoundingSphere();
}

function pickGroveCenters(
  count: number,
  pad: number,
  inner: number,
  outer: number,
  road: readonly Point[],
  rand: () => number,
  occupied: OccupiedFn,
): Site[] {
  const groves: Site[] = [];
  let guard = 0;
  while (groves.length < count && guard < count * 36) {
    guard += 1;
    const sample = sampleCorridor(road, rand, inner, outer);
    if (occupied(sample.wx, sample.wz, pad)) continue;
    if (groves.some((g) => Math.hypot(g.wx - sample.wx, g.wz - sample.wz) < 5)) continue;
    groves.push(sample);
  }
  if (groves.length === 0) groves.push(sampleCorridor(road, rand, inner, outer));
  return groves;
}

function scatterMixed(
  count: number,
  pad: number,
  inner: number,
  outer: number,
  groves: Site[],
  groveShare: number,
  groveRadius: number,
  road: readonly Point[],
  rand: () => number,
  occupied: OccupiedFn,
  into: THREE.InstancedMesh,
  tint: (color: THREE.Color, rand: () => number) => void,
  scaleRange: [number, number],
  intoSites?: Site[],
): void {
  const groveTarget = Math.round(count * groveShare);
  let n = 0;
  let attempts = 0;
  const maxAttempts = count * 80;
  while (n < count && attempts < maxAttempts) {
    attempts += 1;
    let wx: number;
    let wz: number;
    if (n < groveTarget && groves.length > 0) {
      const grove = groves[Math.floor(rand() * groves.length)];
      const ang = rand() * Math.PI * 2;
      const rad = Math.sqrt(rand()) * groveRadius;
      wx = grove.wx + Math.cos(ang) * rad;
      wz = grove.wz + Math.sin(ang) * rad;
    } else if (road.length > 1 && rand() < 0.55) {
      const sample = sampleCorridor(road, rand, inner, outer);
      wx = sample.wx;
      wz = sample.wz;
    } else {
      wx = (rand() - 0.5) * 108;
      wz = (rand() - 0.5) * 80;
    }
    if (occupied(wx, wz, pad)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    commitInstance(
      into,
      n,
      wx,
      wz,
      s,
      s,
      (rand() - 0.5) * 0.08,
      rand() * Math.PI * 2,
      tint,
      rand,
      intoSites,
    );
    n += 1;
  }
  finishLayer(into, n);
}

function scatterBesidePines(
  count: number,
  pad: number,
  sites: Site[],
  nearMin: number,
  nearMax: number,
  rand: () => number,
  occupied: OccupiedFn,
  into: THREE.InstancedMesh,
  scaleRange: [number, number],
): void {
  const nearby = sites.filter((s) => Math.abs(s.wx) < 11 && Math.abs(s.wz) < 9);
  const pool = nearby.length >= 6 ? nearby : sites.filter((s) => Math.abs(s.wx) < 14 && Math.abs(s.wz) < 12);
  const use = pool.length > 0 ? pool : [{ wx: 0, wz: 0 }];
  let n = 0;
  let attempts = 0;
  const maxAttempts = count * 80;
  while (n < count && attempts < maxAttempts) {
    attempts += 1;
    const site = use[n % use.length];
    const ang = rand() * Math.PI * 2;
    const rad = nearMin + rand() * (nearMax - nearMin);
    const wx = site.wx + Math.cos(ang) * rad;
    const wz = site.wz + Math.sin(ang) * rad;
    if (Math.abs(wx) > 14 || Math.abs(wz) > 12) continue;
    if (occupied(wx, wz, pad)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    _pos.set(wx, 0, wz);
    _euler.set(0, rand() * Math.PI * 2, (rand() - 0.5) * 0.06);
    _quat.setFromEuler(_euler);
    _scale.set(s, s, s);
    _matrix.compose(_pos, _quat, _scale);
    into.setMatrixAt(n, _matrix);
    n += 1;
  }
  let k = 0;
  while (n < count && k < count * 40) {
    k += 1;
    const ang = n * 2.4 + k * 0.37;
    const rad = 3.4 + (k % 8) * 0.85;
    const wx = Math.cos(ang) * rad;
    const wz = Math.sin(ang) * rad;
    if (occupied(wx, wz, pad * 0.45)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    _pos.set(wx, 0, wz);
    _euler.set(0, rand() * Math.PI * 2, 0);
    _quat.setFromEuler(_euler);
    _scale.set(s, s, s);
    _matrix.compose(_pos, _quat, _scale);
    into.setMatrixAt(n, _matrix);
    n += 1;
  }
  into.count = n;
  into.instanceMatrix.needsUpdate = true;
  into.computeBoundingSphere();
}

function scatterAroundSites(
  count: number,
  pad: number,
  sites: Site[],
  nearMin: number,
  nearMax: number,
  bermInner: number,
  bermOuter: number,
  bermShare: number,
  road: readonly Point[],
  rand: () => number,
  occupied: OccupiedFn,
  into: THREE.InstancedMesh,
  tint: (color: THREE.Color, rand: () => number) => void,
  scaleRange: [number, number],
): void {
  const bermTarget = Math.round(count * bermShare);
  let n = 0;
  let attempts = 0;
  const maxAttempts = count * 56;
  while (n < count && attempts < maxAttempts) {
    attempts += 1;
    let wx: number;
    let wz: number;
    if (n >= bermTarget && sites.length > 0) {
      const site = sites[Math.floor(rand() * sites.length)];
      const ang = rand() * Math.PI * 2;
      const rad = nearMin + rand() * (nearMax - nearMin);
      wx = site.wx + Math.cos(ang) * rad;
      wz = site.wz + Math.sin(ang) * rad;
    } else if (road.length > 1) {
      const sample = sampleCorridor(road, rand, bermInner, bermOuter);
      wx = sample.wx;
      wz = sample.wz;
    } else {
      wx = (rand() - 0.5) * 108;
      wz = (rand() - 0.5) * 80;
    }
    if (occupied(wx, wz, pad)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    commitInstance(
      into,
      n,
      wx,
      wz,
      s,
      s * (0.9 + rand() * 0.2),
      (rand() - 0.5) * 0.1,
      rand() * Math.PI * 2,
      tint,
      rand,
    );
    n += 1;
  }
  finishLayer(into, n);
}

function scatter(
  count: number,
  pad: number,
  corridorChance: number,
  inner: number,
  outer: number,
  road: readonly Point[],
  rand: () => number,
  occupied: OccupiedFn,
  into: THREE.InstancedMesh,
  tint: (color: THREE.Color, rand: () => number) => void,
  scaleRange: [number, number],
): void {
  let n = 0;
  let attempts = 0;
  const maxAttempts = count * 40;
  while (n < count && attempts < maxAttempts) {
    attempts += 1;
    let wx: number;
    let wz: number;
    if (road.length > 1 && rand() < corridorChance) {
      const sample = sampleCorridor(road, rand, inner, outer);
      wx = sample.wx;
      wz = sample.wz;
    } else {
      wx = (rand() - 0.5) * 108;
      wz = (rand() - 0.5) * 80;
    }
    if (occupied(wx, wz, pad)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    commitInstance(
      into,
      n,
      wx,
      wz,
      s,
      s * (0.9 + rand() * 0.18),
      (rand() - 0.5) * 0.08,
      rand() * Math.PI * 2,
      tint,
      rand,
    );
    n += 1;
  }
  finishLayer(into, n);
}

function scatterGroves(
  count: number,
  groveCount: number,
  groveRadius: number,
  pad: number,
  inner: number,
  outer: number,
  road: readonly Point[],
  rand: () => number,
  occupied: OccupiedFn,
  into: THREE.InstancedMesh,
  tint: (color: THREE.Color, rand: () => number) => void,
  scaleRange: [number, number],
): void {
  const groves: { wx: number; wz: number }[] = [];
  let guard = 0;
  while (groves.length < groveCount && guard < groveCount * 20) {
    guard += 1;
    const sample = sampleCorridor(road, rand, inner, outer);
    if (occupied(sample.wx, sample.wz, pad)) continue;
    groves.push(sample);
  }
  if (groves.length === 0) {
    groves.push(sampleCorridor(road, rand, inner, outer));
  }
  let n = 0;
  let attempts = 0;
  while (n < count && attempts < count * 24) {
    attempts += 1;
    const grove = groves[Math.floor(rand() * groves.length)];
    const wx = grove.wx + (rand() - 0.5) * groveRadius * 2;
    const wz = grove.wz + (rand() - 0.5) * groveRadius * 2;
    if (occupied(wx, wz, pad)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    _pos.set(wx, 0, wz);
    _euler.set(0, rand() * Math.PI * 2, (rand() - 0.5) * 0.12);
    _quat.setFromEuler(_euler);
    _scale.set(s, s * (0.85 + rand() * 0.25), s);
    _matrix.compose(_pos, _quat, _scale);
    into.setMatrixAt(n, _matrix);
    tint(_color, rand);
    into.setColorAt(n, _color);
    n += 1;
  }
  into.count = n;
  into.instanceMatrix.needsUpdate = true;
  if (into.instanceColor) into.instanceColor.needsUpdate = true;
  into.computeBoundingSphere();
}

function pineTint(color: THREE.Color, rand: () => number): void {
  const teal = rand();
  color.setRGB(
    0.56 + (1 - teal) * 0.16,
    0.66 + teal * 0.1,
    0.46 + teal * 0.24,
  );
}

function makeLayer(
  geom: THREE.BufferGeometry,
  mat: THREE.MeshStandardMaterial,
  count: number,
  castShadow: boolean,
): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geom, mat, count);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = false;
  mesh.frustumCulled = true;
  mesh.raycast = () => {};
  return mesh;
}

export function buildFlora(
  layoutId: string,
  occupied: OccupiedFn,
  wind: WindUniforms,
  road: readonly Point[],
  props: FloraProps = {},
): THREE.Group {
  const rand = seeded(layoutSeed(layoutId) ^ 90210);
  const root = new THREE.Group();
  root.name = "flora";

  const pineMat = windMaterial(
    { roughness: 0.88, emissive: 0x7dcea0, emissiveIntensity: 0.08 },
    wind,
    "pine",
  );
  const groves = pickGroveCenters(12, 0.4, 62, 150, road, rand, occupied);
  const treeSites: Site[] = [];

  const pine = makeLayer(props.pine ?? pineGeom(), pineMat, 40, true);
  scatterMixed(40, 0.38, 56, 150, groves, 0.62, 2.7, road, rand, occupied, pine, pineTint, [1.05, 1.4], treeSites);
  pine.name = "pine";

  const squat = makeLayer(props.squat ?? squatPineGeom(), pineMat, 28, true);
  scatterMixed(28, 0.38, 54, 140, groves, 0.62, 2.9, road, rand, occupied, squat, pineTint, [1.05, 1.35], treeSites);
  squat.name = "pine-squat";

  const leafMat = windMaterial(
    {
      color: props.broadleaf ? 0xffa050 : 0xffffff,
      roughness: 0.5,
      metalness: 0.04,
      emissive: 0xff8414,
      emissiveIntensity: props.broadleaf ? 0.16 : 0.28,
    },
    wind,
    "leaf",
  );
  const leaf = makeLayer(props.broadleaf ?? broadleafGeom(), leafMat, 36, true);
  leaf.frustumCulled = false;
  scatterBesidePines(36, 0.28, treeSites, 0.7, 1.65, rand, occupied, leaf, [1.16, 1.28]);
  leaf.name = "broadleaf";

  const shrub = makeLayer(
    props.shrub ?? shrubGeom(),
    windMaterial(
      { roughness: 0.55, emissive: 0x7dcea0, emissiveIntensity: 0.18 },
      wind,
      "shrub",
    ),
    64,
    false,
  );
  scatterMixed(64, 0.22, 50, 130, groves, 0.5, 3.2, road, rand, occupied, shrub, (c, r) => {
    const t = r();
    c.setRGB(0.6 + t * 0.1, 0.74 + t * 0.08, 0.64 + t * 0.08);
  }, [1.1, 1.6], treeSites);
  shrub.name = "shrub";

  const crystal = makeLayer(
    crystalGeom(),
    windMaterial(
      {
        roughness: 0.22,
        metalness: 0.32,
        emissive: 0x2ee6c5,
        emissiveIntensity: 0.45,
      },
      wind,
      "crystal",
    ),
    18,
    false,
  );
  scatterGroves(18, 3, 0.85, 0.45, 68, 120, road, rand, occupied, crystal, (c, r) => {
    c.setRGB(0.62 + r() * 0.12, 0.78 + r() * 0.08, 0.72 + r() * 0.1);
  }, [1.0, 1.4]);
  crystal.name = "crystal";

  const grass = makeLayer(
    props.grass ?? grassGeom(),
    windMaterial({ roughness: 0.88, side: THREE.DoubleSide }, wind, "grass"),
    300,
    false,
  );
  scatterAroundSites(
    300,
    0.06,
    treeSites,
    0.35,
    1.7,
    50,
    88,
    0.42,
    road,
    rand,
    occupied,
    grass,
    (c, r) => {
      const t = r();
      c.setRGB(0.66 + t * 0.1, 0.74 + t * 0.08, 0.66 + t * 0.08);
    },
    [1.2, 1.8],
  );
  grass.name = "grass";

  const slabs = makeLayer(
    props.slab ?? slabRockGeom(),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: props.slab ? null : getRockMap(),
      normalMap: props.slab ? null : getRockNormalMap(),
      vertexColors: Boolean(props.slab),
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true,
    }),
    40,
    true,
  );
  slabs.castShadow = true;
  scatter(40, 0.55, 0.72, 68, 160, road, rand, occupied, slabs, (c, r) => {
    c.setRGB(0.58 + r() * 0.12, 0.62 + r() * 0.1, 0.68 + r() * 0.1);
  }, [0.55, 1.2]);
  slabs.name = "rock-slab";

  if (import.meta.env.DEV) {
    console.info(
      "[world3d] flora counts",
      `pine=${pine.count} squat=${squat.count} broadleaf=${leaf.count} shrub=${shrub.count} crystal=${crystal.count} grass=${grass.count} slabs=${slabs.count}`,
      `broadleaf_verts=${leaf.geometry.getAttribute("position")?.count ?? 0}`,
    );
  }

  root.add(pine, squat, leaf, shrub, crystal, grass, slabs);
  return root;
}
