import * as THREE from "three";

export function disposeMaterial(material: THREE.Material): void {
  const maps = [
    "map",
    "lightMap",
    "aoMap",
    "emissiveMap",
    "bumpMap",
    "normalMap",
    "displacementMap",
    "roughnessMap",
    "metalnessMap",
    "alphaMap",
    "envMap",
  ] as const;
  const rec = material as unknown as Record<string, { dispose?: () => void } | undefined>;
  for (const key of maps) {
    rec[key]?.dispose?.();
  }
  material.dispose();
}

export function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const mat = (child as THREE.Mesh).material;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const item of list) materials.add(item);
  });
  for (const material of materials) disposeMaterial(material);
}
