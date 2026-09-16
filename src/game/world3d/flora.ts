import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { Point } from "../types";
import { logicalToWorld } from "./coords";
import { layoutSeed, seeded } from "./textures";

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
  const trunk = new THREE.CylinderGeometry(0.07, 0.13, 1.05, 5);
  trunk.translate(0, 0.52, 0);
  paint(trunk, 0.28, 0.2, 0.14);
  const parts: THREE.BufferGeometry[] = [trunk];
  const layers: [number, number, number, number, number][] = [
    [0.72, 0.72, 0.28, 0.38, 0.2],
    [0.52, 1.22, 0.4, 0.52, 0.26],
    [0.3, 1.68, 0.62, 0.58, 0.3],
  ];
  for (const [radius, y, r, g, b] of layers) {
    const cone = new THREE.ConeGeometry(radius, 0.78, 6);
    cone.translate(0, y, 0);
    paint(cone, r, g, b);
    parts.push(cone);
  }
  return merge(parts);
}

function broadleafGeom(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.09, 0.14, 0.85, 6);
  trunk.translate(0, 0.42, 0);
  paint(trunk, 0.32, 0.2, 0.1);
  const crown = new THREE.IcosahedronGeometry(0.72, 0);
  crown.translate(0, 1.22, 0);
  paint(crown, 0.92, 0.68, 0.32);
  const crown2 = new THREE.IcosahedronGeometry(0.5, 0);
  crown2.translate(0.22, 1.42, -0.1);
  paint(crown2, 0.55, 0.82, 0.62);
  return merge([trunk, crown, crown2]);
}

function shrubGeom(): THREE.BufferGeometry {
  const a = new THREE.IcosahedronGeometry(0.38, 0);
  a.translate(0, 0.34, 0);
  paint(a, 0.48, 0.86, 0.64);
  const b = new THREE.IcosahedronGeometry(0.28, 0);
  b.translate(0.2, 0.3, 0.1);
  paint(b, 0.4, 0.78, 0.58);
  const c = new THREE.IcosahedronGeometry(0.22, 0);
  c.translate(-0.16, 0.28, -0.12);
  paint(c, 0.82, 0.98, 0.9);
  return merge([a, b, c]);
}

function crystalGeom(): THREE.BufferGeometry {
  const core = new THREE.OctahedronGeometry(0.32, 0);
  core.translate(0, 0.38, 0);
  paint(core, 0.82, 1, 0.94);
  const spike = new THREE.ConeGeometry(0.12, 0.58, 5);
  spike.translate(0, 0.78, 0);
  paint(spike, 0.55, 0.92, 0.78);
  const side = new THREE.OctahedronGeometry(0.18, 0);
  side.translate(0.22, 0.22, 0.05);
  paint(side, 0.95, 0.7, 0.32);
  return merge([core, spike, side]);
}

function grassGeom(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i += 1) {
    const blade = new THREE.BoxGeometry(0.1, 0.72, 0.04);
    blade.translate(0, 0.36, 0);
    blade.rotateY(i * 1.05);
    blade.rotateZ((i % 3 - 1) * 0.22);
    const tip = i % 2 === 0;
    paint(blade, tip ? 0.42 : 0.28, tip ? 0.62 : 0.48, tip ? 0.28 : 0.2);
    parts.push(blade);
  }
  return merge(parts);
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

  const pine = makeLayer(pineGeom(), windMaterial({ roughness: 0.82 }, wind), 36, true);
  scatter(36, 0.35, 0.82, 56, 150, road, rand, occupied, pine, (c, r) => {
    c.setRGB(0.9 + r() * 0.1, 0.85 + r() * 0.12, 0.7 + r() * 0.12);
  }, [1.55, 2.45]);
  pine.name = "pine";

  const leaf = makeLayer(broadleafGeom(), windMaterial({ roughness: 0.62 }, wind), 28, true);
  scatter(28, 0.4, 0.8, 58, 155, road, rand, occupied, leaf, (c, r) => {
    c.setRGB(1, 0.78 + r() * 0.18, 0.42 + r() * 0.18);
  }, [1.45, 2.3]);
  leaf.name = "broadleaf";

  const shrub = makeLayer(
    shrubGeom(),
    windMaterial(
      { roughness: 0.5, emissive: 0x7dcea0, emissiveIntensity: 0.48 },
      wind,
    ),
    52,
    false,
  );
  scatter(52, 0.2, 0.86, 52, 120, road, rand, occupied, shrub, (c, r) => {
    c.setRGB(0.8 + r() * 0.18, 1, 0.88 + r() * 0.1);
  }, [1.4, 2.2]);
  shrub.name = "shrub";

  const crystal = makeLayer(
    crystalGeom(),
    windMaterial(
      {
        roughness: 0.18,
        metalness: 0.38,
        emissive: 0x2ee6c5,
        emissiveIntensity: 1.15,
      },
      wind,
    ),
    32,
    false,
  );
  scatter(32, 0.25, 0.84, 54, 125, road, rand, occupied, crystal, (c, r) => {
    c.setRGB(0.9 + r() * 0.1, 1, 0.92 + r() * 0.08);
  }, [1.45, 2.2]);
  crystal.name = "crystal";

  const grass = makeLayer(
    grassGeom(),
    windMaterial({ roughness: 0.86, side: THREE.DoubleSide }, wind),
    180,
    false,
  );
  scatter(180, 0.05, 0.9, 50, 110, road, rand, occupied, grass, (c, r) => {
    c.setRGB(0.55 + r() * 0.2, 0.72 + r() * 0.18, 0.32 + r() * 0.12);
  }, [1.7, 2.7]);
  grass.name = "grass";

  root.add(pine, leaf, shrub, crystal, grass);
  return root;
}
