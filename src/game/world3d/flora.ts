import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
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
  const trunk = new THREE.CylinderGeometry(0.05, 0.09, 0.85, 5);
  trunk.translate(0, 0.42, 0);
  paint(trunk, 0.14, 0.1, 0.08);
  const parts: THREE.BufferGeometry[] = [trunk];
  const layers: [number, number, number][] = [
    [0.52, 0.62, 0.12],
    [0.38, 1.05, 0.14],
    [0.22, 1.42, 0.16],
  ];
  for (const [radius, y, green] of layers) {
    const cone = new THREE.ConeGeometry(radius, 0.62, 6);
    cone.translate(0, y, 0);
    paint(cone, 0.18, 0.28 + green, 0.14);
    parts.push(cone);
  }
  return merge(parts);
}

function broadleafGeom(): THREE.BufferGeometry {
  const trunk = new THREE.CylinderGeometry(0.07, 0.11, 0.7, 6);
  trunk.translate(0, 0.35, 0);
  paint(trunk, 0.22, 0.14, 0.08);
  const crown = new THREE.IcosahedronGeometry(0.55, 0);
  crown.translate(0, 1.05, 0);
  paint(crown, 0.86, 0.58, 0.22);
  const crown2 = new THREE.IcosahedronGeometry(0.38, 0);
  crown2.translate(0.18, 1.22, -0.08);
  paint(crown2, 0.95, 0.42, 0.12);
  return merge([trunk, crown, crown2]);
}

function shrubGeom(): THREE.BufferGeometry {
  const a = new THREE.IcosahedronGeometry(0.28, 0);
  a.translate(0, 0.26, 0);
  paint(a, 0.42, 0.78, 0.58);
  const b = new THREE.IcosahedronGeometry(0.2, 0);
  b.translate(0.16, 0.22, 0.08);
  paint(b, 0.32, 0.7, 0.52);
  const c = new THREE.IcosahedronGeometry(0.16, 0);
  c.translate(-0.12, 0.2, -0.1);
  paint(c, 0.78, 0.95, 0.88);
  return merge([a, b, c]);
}

function crystalGeom(): THREE.BufferGeometry {
  const core = new THREE.OctahedronGeometry(0.22, 0);
  core.translate(0, 0.28, 0);
  paint(core, 0.78, 0.98, 0.92);
  const spike = new THREE.ConeGeometry(0.08, 0.42, 5);
  spike.translate(0, 0.58, 0);
  paint(spike, 0.48, 0.86, 0.72);
  const side = new THREE.OctahedronGeometry(0.12, 0);
  side.translate(0.16, 0.16, 0.04);
  paint(side, 0.9, 0.64, 0.28);
  return merge([core, spike, side]);
}

function grassGeom(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 3; i += 1) {
    const blade = new THREE.BoxGeometry(0.035, 0.32, 0.012);
    blade.translate(0, 0.16, 0);
    blade.rotateY(i * 2.09);
    blade.rotateZ((i - 1) * 0.2);
    paint(blade, 0.2, 0.32, 0.16);
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

function scatter(
  count: number,
  pad: number,
  rimChance: number,
  rand: () => number,
  occupied: OccupiedFn,
  into: THREE.InstancedMesh,
  tint: (color: THREE.Color, rand: () => number) => void,
  scaleRange: [number, number],
): void {
  let n = 0;
  let attempts = 0;
  const maxAttempts = count * 28;
  while (n < count && attempts < maxAttempts) {
    attempts += 1;
    let wx = (rand() - 0.5) * 108;
    let wz = (rand() - 0.5) * 80;
    if (rand() < rimChance) {
      if (rand() < 0.5) wx = (rand() < 0.5 ? -1 : 1) * (34 + rand() * 20);
      else wz = (rand() < 0.5 ? -1 : 1) * (22 + rand() * 18);
    }
    if (occupied(wx, wz, pad)) continue;
    const s = scaleRange[0] + rand() * (scaleRange[1] - scaleRange[0]);
    _pos.set(wx, 0, wz);
    _euler.set(0, rand() * Math.PI * 2, (rand() - 0.5) * 0.08);
    _quat.setFromEuler(_euler);
    _scale.set(s, s * (0.9 + rand() * 0.25), s);
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
): THREE.Group {
  const rand = seeded(layoutSeed(layoutId) ^ 90210);
  const root = new THREE.Group();
  root.name = "flora";

  const pine = makeLayer(pineGeom(), windMaterial({ roughness: 0.88 }, wind), 24, true);
  scatter(24, 4.6, 0.32, rand, occupied, pine, (c, r) => {
    c.setRGB(0.82 + r() * 0.2, 0.78 + r() * 0.16, 0.72 + r() * 0.12);
  }, [0.85, 1.55]);
  pine.name = "pine";

  const leaf = makeLayer(broadleafGeom(), windMaterial({ roughness: 0.7 }, wind), 18, true);
  scatter(18, 4.8, 0.3, rand, occupied, leaf, (c, r) => {
    c.setRGB(0.95 + r() * 0.08, 0.7 + r() * 0.25, 0.45 + r() * 0.2);
  }, [0.75, 1.35]);
  leaf.name = "broadleaf";

  const shrub = makeLayer(
    shrubGeom(),
    windMaterial(
      { roughness: 0.55, emissive: 0x7dcea0, emissiveIntensity: 0.28 },
      wind,
    ),
    40,
    false,
  );
  scatter(40, 4.4, 0.18, rand, occupied, shrub, (c, r) => {
    c.setRGB(0.75 + r() * 0.25, 0.95, 0.85 + r() * 0.12);
  }, [0.7, 1.25]);
  shrub.name = "shrub";

  const crystal = makeLayer(
    crystalGeom(),
    windMaterial(
      {
        roughness: 0.22,
        metalness: 0.35,
        emissive: 0x2ee6c5,
        emissiveIntensity: 0.55,
      },
      wind,
    ),
    22,
    false,
  );
  scatter(22, 4.2, 0.22, rand, occupied, crystal, (c, r) => {
    c.setRGB(0.85 + r() * 0.15, 0.95, 0.9 + r() * 0.08);
  }, [0.65, 1.2]);
  crystal.name = "crystal";

  const grass = makeLayer(
    grassGeom(),
    windMaterial({ roughness: 0.9, side: THREE.DoubleSide }, wind),
    140,
    false,
  );
  scatter(140, 3.6, 0.08, rand, occupied, grass, (c, r) => {
    c.setRGB(0.7 + r() * 0.2, 0.85 + r() * 0.15, 0.55 + r() * 0.15);
  }, [0.7, 1.4]);
  grass.name = "grass";

  root.add(pine, leaf, shrub, crystal, grass);
  return root;
}
