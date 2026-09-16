import * as THREE from "three";

const EMBER_COUNT = 56;
const SPREAD_X = 42;
const SPREAD_Z = 30;
const HEIGHT = 7.5;

export function createEmbers(): THREE.Points {
  const positions = new Float32Array(EMBER_COUNT * 3);
  const seeds = new Float32Array(EMBER_COUNT * 3);
  for (let i = 0; i < EMBER_COUNT; i += 1) {
    seeds[i * 3] = Math.random();
    seeds[i * 3 + 1] = Math.random();
    seeds[i * 3 + 2] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xe8a54b,
    size: 0.13,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
    fog: true,
  });
  const points = new THREE.Points(geo, mat);
  points.name = "embers";
  points.frustumCulled = false;
  points.raycast = () => {};
  points.userData.seeds = seeds;
  return points;
}

export function tickEmbers(points: THREE.Points, t: number): void {
  const pos = points.geometry.attributes.position;
  const seeds = points.userData.seeds as Float32Array;
  const arr = pos.array as Float32Array;
  for (let i = 0; i < EMBER_COUNT; i += 1) {
    const sx = seeds[i * 3];
    const sy = seeds[i * 3 + 1];
    const sz = seeds[i * 3 + 2];
    const i3 = i * 3;
    arr[i3] = (sx - 0.5) * SPREAD_X * 2 + Math.sin(t * 0.31 + sx * 6.2) * 2.4;
    arr[i3 + 1] = ((t * (0.35 + sy * 0.45) + sy * HEIGHT) % HEIGHT) + 0.35;
    arr[i3 + 2] = (sz - 0.5) * SPREAD_Z * 2 + Math.cos(t * 0.27 + sz * 5.1) * 2.1;
  }
  pos.needsUpdate = true;
}

export function createBoardFog(): THREE.FogExp2 {
  return new THREE.FogExp2(0x14151a, 0.0036);
}
