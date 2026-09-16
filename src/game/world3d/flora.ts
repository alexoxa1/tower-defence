import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Point } from "../types";
import { logicalToWorld } from "./coords";
import { getRockMap, layoutSeed, seeded } from "./textures";

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
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) {
    return new THREE.BufferGeometry();
  }
  merged.computeVertexNormals();
  return merged;
}

function pineGeom(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.06, 0.1, 0.55, 5);
  trunk.translate(0, 0.28, 0);
  paint(trunk, 0.1, 0.08, 0.07);
  const parts: THREE.BufferGeometry[] = [trunk];
  const layers: [number, number, number, number, number][] = [
    [0.42, 0.48, 0.1, 0.18, 0.15],
    [0.3, 0.78, 0.14, 0.26, 0.2],
    [0.18, 1.02, 0.22, 0.38, 0.3],
  ];
  for (const [radius, y, r, g, b] of layers) {
    const cone = new THREE.ConeGeometry(radius, 0.48, 6);
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
  const trunk = new THREE.CylinderGeometry(0.07, 0.11, 0.5, 6);
  trunk.translate(0, 0.25, 0);
  paint(trunk, 0.18, 0.1, 0.06);
  const core = new THREE.IcosahedronGeometry(0.34, 0);
  core.translate(0, 0.62, 0);
  paint(core, 0.45, 0.2, 0.08);
  const crown = new THREE.IcosahedronGeometry(0.42, 0);
  crown.translate(0.08, 0.78, -0.04);
  paint(crown, 0.75, 0.42, 0.16);
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
): THREE.MeshStandardMaterial {
  const mat = new THREE.MeshStandardMaterial({
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
  mat.customProgramCacheKey = () => "cw-flora-wind";
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
  const maxAttempts = count * 36;
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
    _pos.set(wx, 0, wz);
    _euler.set(0, rand() * Math.PI * 2, (rand() - 0.5) * 0.08);
    _quat.setFromEuler(_euler);
    _scale.set(s, s * (0.9 + rand() * 0.22), s);
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
): THREE.Group {
  const rand = seeded(layoutSeed(layoutId) ^ 90210);
  const root = new THREE.Group();
  root.name = "flora";

  const pineMat = windMaterial(
    { roughness: 0.88, emissive: 0x7dcea0, emissiveIntensity: 0.08 },
    wind,
  );
  const pine = makeLayer(pineGeom(), pineMat, 24, true);
  scatter(24, 0.4, 0.84, 58, 140, road, rand, occupied, pine, pineTint, [0.82, 1.12]);
  pine.name = "pine";

  const squat = makeLayer(squatPineGeom(), pineMat, 16, true);
  scatter(16, 0.4, 0.86, 56, 130, road, rand, occupied, squat, pineTint, [0.82, 1.12]);
  squat.name = "pine-squat";

  const leaf = makeLayer(broadleafGeom(), windMaterial({ roughness: 0.68 }, wind), 22, true);
  scatter(22, 0.45, 0.82, 60, 145, road, rand, occupied, leaf, (c, r) => {
    const t = r();
    c.setRGB(0.86 + t * 0.08, 0.58 + t * 0.1, 0.34 + t * 0.08);
  }, [0.78, 1.08]);
  leaf.name = "broadleaf";

  const shrub = makeLayer(
    shrubGeom(),
    windMaterial(
      { roughness: 0.55, emissive: 0x7dcea0, emissiveIntensity: 0.18 },
      wind,
    ),
    40,
    false,
  );
  scatter(40, 0.25, 0.88, 54, 120, road, rand, occupied, shrub, (c, r) => {
    const t = r();
    c.setRGB(0.6 + t * 0.1, 0.74 + t * 0.08, 0.64 + t * 0.08);
  }, [0.95, 1.45]);
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
    ),
    18,
    false,
  );
  scatterGroves(18, 3, 0.85, 0.45, 68, 120, road, rand, occupied, crystal, (c, r) => {
    c.setRGB(0.62 + r() * 0.12, 0.78 + r() * 0.08, 0.72 + r() * 0.1);
  }, [1.0, 1.4]);
  crystal.name = "crystal";

  const grass = makeLayer(
    grassGeom(),
    windMaterial({ roughness: 0.88, side: THREE.DoubleSide }, wind),
    150,
    false,
  );
  scatter(150, 0.08, 0.9, 52, 105, road, rand, occupied, grass, (c, r) => {
    const t = r();
    c.setRGB(0.66 + t * 0.1, 0.74 + t * 0.08, 0.66 + t * 0.08);
  }, [1.0, 1.55]);
  grass.name = "grass";

  const slabs = makeLayer(
    slabRockGeom(),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getRockMap(),
      roughness: 0.94,
      metalness: 0.08,
      flatShading: true,
    }),
    30,
    true,
  );
  slabs.castShadow = true;
  scatter(30, 0.55, 0.7, 70, 160, road, rand, occupied, slabs, (c, r) => {
    c.setRGB(0.58 + r() * 0.1, 0.62 + r() * 0.08, 0.7 + r() * 0.1);
  }, [0.55, 1.2]);
  slabs.name = "rock-slab";

  root.add(pine, squat, leaf, shrub, crystal, grass, slabs);
  return root;
}
