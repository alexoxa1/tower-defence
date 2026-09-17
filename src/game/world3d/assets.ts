import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import * as SkeletonUtils from "three/examples/jsm/utils/SkeletonUtils.js";
import type { EnemyKind, TowerType } from "../types";
import { hexToRgb, paletteAccentMask, recolorPalette, TOWER_ACCENT } from "./palette";

/** Kenney kit parts are 1 unit wide. This scale makes a Level 1 base fill the Tower footprint. */
export const KIT_SCALE = 2.0;

/** Filament gold: accent for neutral kit props (portal pads, detail rocks). */
const FILAMENT = 0xf0b429;

const ENEMY_FILES: Record<EnemyKind, string> = {
  creep: "Orc",
  runner: "Ninja",
  brute: "Yeti",
  swarm: "GreenSpikyBlob",
  warden: "Orc_Skull",
  shade: "Ghost",
  colossus: "Demon",
  overlord: "BlueDemon",
};

export interface EnemyPrefab {
  scene: THREE.Group;
  clips: THREE.AnimationClip[];
  /** Bind-pose height in model units. Views scale by target height / this. */
  height: number;
}

export interface KitMaterialSet {
  /** Recolored palette material for the Tower body. */
  body: THREE.MeshStandardMaterial;
}

function modelUrl(path: string): string {
  const base = import.meta.env.BASE_URL || "/";
  return `${base.endsWith("/") ? base : `${base}/`}models/${path}`;
}

function paletteCanvas(source: THREE.Texture): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  const image = source.image as CanvasImageSource & { width: number; height: number };
  if (!image || !image.width) return null;
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0);
  return { canvas, ctx };
}

function textureLike(source: THREE.Texture, canvas: HTMLCanvasElement, colorSpace: string): THREE.Texture {
  const tex = source.clone();
  tex.source = new THREE.Source(canvas);
  tex.colorSpace = colorSpace;
  tex.userData.shared = true;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Loads the CC0 glTF payload once and hands out clones. Everything is optional: while a pack is
 * still loading (or failed) the callers keep their procedural meshes.
 */
export class WorldAssets {
  /** Increments every time a pack finishes so views can swap meshes in. */
  generation = 0;

  private loader = new GLTFLoader();
  private kit: THREE.Group | null = null;
  private kitPalette: THREE.Texture | null = null;
  private partHeights = new Map<string, number>();
  private towerMaterials = new Map<TowerType, KitMaterialSet>();
  private propMaterial: THREE.MeshStandardMaterial | null = null;
  private props = new Map<string, THREE.BufferGeometry>();
  private enemies = new Map<EnemyKind, EnemyPrefab>();
  private disposed = false;
  private onChange: (() => void) | null = null;

  constructor() {
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  load(onChange: () => void): void {
    this.onChange = onChange;
    this.fetch(modelUrl("kenney/td.glb"), (gltf) => this.installKit(gltf));
    this.fetch(modelUrl("nature/props.glb"), (gltf) => this.installProps(gltf));
    for (const kind of Object.keys(ENEMY_FILES) as EnemyKind[]) {
      this.fetch(modelUrl(`quaternius/${ENEMY_FILES[kind]}.glb`), (gltf) => this.installEnemy(kind, gltf));
    }
  }

  private fetch(url: string, install: (gltf: GLTF) => void): void {
    this.loader.load(
      url,
      (gltf) => {
        if (this.disposed) return;
        try {
          install(gltf);
          this.generation += 1;
          this.onChange?.();
        } catch (error) {
          console.warn("[world3d] asset install failed", url, error);
        }
      },
      undefined,
      (error) => {
        console.warn("[world3d] asset load failed, keeping procedural meshes", url, error);
      },
    );
  }

  hasKit(): boolean {
    return this.kit !== null;
  }

  hasProps(): boolean {
    return this.props.size > 0;
  }

  enemyPrefab(kind: EnemyKind): EnemyPrefab | null {
    return this.enemies.get(kind) ?? null;
  }

  /** Height of a kit part in world units after KIT_SCALE. */
  partHeight(name: string): number {
    return (this.partHeights.get(name) ?? 0.5) * KIT_SCALE;
  }

  /** Deep-clones a kit part with the given material. Geometry stays shared. */
  kitPart(name: string, material: THREE.Material): THREE.Object3D | null {
    const source = this.kit?.getObjectByName(name);
    if (!source) return null;
    const clone = source.clone(true);
    clone.position.set(0, 0, 0);
    clone.rotation.set(0, 0, 0);
    clone.scale.setScalar(KIT_SCALE);
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.material = material;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    });
    return clone;
  }

  /** Palette material recolored toward a Tower swatch. One shared material per Tower type. */
  towerMaterial(type: TowerType): KitMaterialSet | null {
    const hit = this.towerMaterials.get(type);
    if (hit) return hit;
    const built = this.buildPaletteMaterial(TOWER_ACCENT[type], 0.75);
    if (!built) return null;
    this.towerMaterials.set(type, { body: built });
    return this.towerMaterials.get(type) ?? null;
  }

  /** Soot palette with filament-gold accents for neutral kit props. */
  kitPropMaterial(): THREE.MeshStandardMaterial | null {
    if (this.propMaterial) return this.propMaterial;
    this.propMaterial = this.buildPaletteMaterial(FILAMENT, 0.5);
    return this.propMaterial;
  }

  private buildPaletteMaterial(accent: number, glow: number): THREE.MeshStandardMaterial | null {
    if (!this.kitPalette) return null;
    const painted = paletteCanvas(this.kitPalette);
    if (!painted) return null;
    const { canvas, ctx } = painted;
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const mask = new Uint8ClampedArray(img.data.length);
    paletteAccentMask(img.data, mask);
    recolorPalette(img.data, hexToRgb(accent));
    ctx.putImageData(img, 0, 0);
    const maskCanvas = document.createElement("canvas");
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    const maskCtx = maskCanvas.getContext("2d");
    if (maskCtx) {
      const maskImg = maskCtx.createImageData(canvas.width, canvas.height);
      maskImg.data.set(mask);
      maskCtx.putImageData(maskImg, 0, 0);
    }
    const material = new THREE.MeshStandardMaterial({
      map: textureLike(this.kitPalette, canvas, THREE.SRGBColorSpace),
      emissive: new THREE.Color(accent),
      emissiveIntensity: glow,
      emissiveMap: textureLike(this.kitPalette, maskCanvas, THREE.SRGBColorSpace),
      roughness: 0.74,
      metalness: 0.12,
    });
    material.userData.accent = accent;
    material.userData.shared = true;
    return material;
  }

  /** Prop geometry (vertex-colored, Y up, ground at 0) from the Nature Kit, or null. */
  propGeometry(name: string): THREE.BufferGeometry | null {
    return this.props.get(name) ?? null;
  }

  /** Instance of a rigged Enemy. Caller owns the mixer and disposes cloned materials. */
  cloneEnemy(kind: EnemyKind): THREE.Group | null {
    const prefab = this.enemies.get(kind);
    if (!prefab) return null;
    return SkeletonUtils.clone(prefab.scene) as THREE.Group;
  }

  dispose(): void {
    this.disposed = true;
    for (const set of this.towerMaterials.values()) {
      set.body.map?.dispose();
      set.body.emissiveMap?.dispose();
      set.body.dispose();
    }
    this.towerMaterials.clear();
    this.propMaterial?.map?.dispose();
    this.propMaterial?.emissiveMap?.dispose();
    this.propMaterial?.dispose();
    this.propMaterial = null;
    this.kitPalette?.dispose();
    this.kit?.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) mesh.geometry.dispose();
    });
    for (const geo of this.props.values()) geo.dispose();
    this.props.clear();
    for (const prefab of this.enemies.values()) {
      prefab.scene.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const mat of mats) {
          (mat as THREE.MeshStandardMaterial).map?.dispose();
          mat.dispose();
        }
      });
    }
    this.enemies.clear();
  }

  private installKit(gltf: GLTF): void {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3();
    for (const part of scene.children) {
      box.setFromObject(part);
      this.partHeights.set(part.name, Math.max(0.05, box.max.y - box.min.y));
      part.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.userData.shared = true;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!this.kitPalette && mat.map) this.kitPalette = mat.map;
      });
    }
    this.kit = scene;
  }

  private installProps(gltf: GLTF): void {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    for (const root of scene.children) {
      let found: THREE.Mesh | null = null;
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && !found) found = mesh;
      });
      if (!found) continue;
      const mesh: THREE.Mesh = found;
      const geo = mesh.geometry.clone();
      // Bake the node transform so instancing works from the prop's ground origin.
      const local = new THREE.Matrix4().copy(mesh.matrixWorld);
      geo.applyMatrix4(local);
      geo.computeVertexNormals();
      geo.computeBoundingBox();
      const minY = geo.boundingBox?.min.y ?? 0;
      if (minY !== 0) geo.translate(0, -minY, 0);
      geo.computeBoundingSphere();
      geo.userData.shared = true;
      this.props.set(root.name, geo);
    }
  }

  private installEnemy(kind: EnemyKind, gltf: GLTF): void {
    const scene = gltf.scene;
    scene.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(scene);
    const height = Math.max(0.1, box.max.y - box.min.y);
    scene.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const mat of mats) {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.isMeshStandardMaterial) {
          std.roughness = 0.68;
          std.metalness = 0.02;
        }
      }
    });
    this.enemies.set(kind, { scene, clips: gltf.animations, height });
  }
}
