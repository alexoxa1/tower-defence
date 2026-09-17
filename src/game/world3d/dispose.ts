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
  const rec = material as unknown as Record<string, { dispose?: () => void; userData?: { shared?: boolean } } | undefined>;
  for (const key of maps) {
    const tex = rec[key];
    if (!tex || tex.userData?.shared) continue;
    tex.dispose?.();
  }
  material.dispose();
}

export function disposeObject(root: THREE.Object3D): void {
  const materials = new Set<THREE.Material>();
  root.traverse((child) => {
    const instanced = child as THREE.InstancedMesh;
    if (instanced.isInstancedMesh) instanced.dispose();
    const mesh = child as THREE.Mesh;
    if (mesh.geometry && !mesh.geometry.userData?.shared) {
      mesh.geometry.dispose();
    }
    const mat = (child as THREE.Mesh).material;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const item of list) {
      if (!item.userData?.shared) materials.add(item);
    }
  });
  for (const material of materials) disposeMaterial(material);
}
