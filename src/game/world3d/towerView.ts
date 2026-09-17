import * as THREE from "three";
import type { Tower } from "../entities/Tower";
import type { TowerType } from "../types";
import type { WorldAssets } from "./assets";
import { disposeObject } from "./dispose";
import { AMBER, MINT, ORANGE, TEAL, idleTower, makeTower } from "./models";
import { TOWER_ACCENT } from "./palette";
import { getFrostMap, getGlowSprite, getRuneMap } from "./textures";
import { towerStack } from "./towerStack";

const _white = new THREE.Color(1, 1, 1);

function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function glowMat(color: number, intensity: number, extras: THREE.MeshStandardMaterialParameters = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.3,
    ...extras,
  });
}

/**
 * One placed Tower. Kit parts stack by Level; a procedural figure stands in until the kit loads.
 * Owns aim damping, recoil, muzzle flash, and the per-type idle motion.
 */
export class TowerView {
  readonly root = new THREE.Group();
  readonly type: TowerType;
  readonly towerId: string;

  private builtStack = 0;
  private kitBuilt = false;
  private aim: THREE.Object3D | null = null;
  private barrel: THREE.Object3D | null = null;
  private barrelRest = new THREE.Vector3();
  private muzzle: THREE.Sprite | null = null;
  private muzzleMat: THREE.SpriteMaterial | null = null;
  private owned: THREE.Object3D[] = [];
  private accents = new Map<string, THREE.Object3D>();
  private yaw = Number.NaN;
  private recoil = 0;
  private recoilVel = 0;
  private lastFlash = 0;
  private heat = 0;
  private topY = 1;

  constructor(towerId: string, type: TowerType, level: number, assets: WorldAssets) {
    this.towerId = towerId;
    this.type = type;
    this.root.userData.towerId = towerId;
    this.rebuild(level, assets);
  }

  /** World-unit height for the upgrade chevron above this Tower. */
  get markerHeight(): number {
    if (!this.kitBuilt) return this.type === "sniper" ? 4.35 : this.type === "beacon" ? 3.1 : 2.35;
    if (this.type === "sniper") return this.topY + 2.3;
    if (this.type === "beacon") return this.topY + 2.2;
    if (this.type === "lantern") return this.topY + 2.5;
    return this.topY + 1.6;
  }

  /** Rebuilds when the Level tier changes or when the kit arrives. Returns true when rebuilt. */
  syncModel(level: number, assets: WorldAssets): boolean {
    const wantKit = assets.hasKit();
    const sameStack = towerStack(this.type, level).base.length === this.builtStack;
    if (wantKit === this.kitBuilt && sameStack) return false;
    this.rebuild(level, assets);
    return true;
  }

  private clear(): void {
    for (const child of [...this.root.children]) this.root.remove(child);
    for (const obj of this.owned) disposeObject(obj);
    this.owned = [];
    this.accents.clear();
    this.aim = null;
    this.barrel = null;
    this.muzzle = null;
    this.muzzleMat = null;
  }

  private rebuild(level: number, assets: WorldAssets): void {
    this.clear();
    this.builtStack = towerStack(this.type, level).base.length;
    const material = assets.hasKit() ? assets.towerMaterial(this.type) : null;
    if (material) {
      this.buildKit(level, assets, material.body);
      this.kitBuilt = true;
    } else {
      const figure = makeTower(this.type);
      this.root.add(figure);
      this.owned.push(figure);
      this.aim = figure.getObjectByName("aim") ?? null;
      this.kitBuilt = false;
      this.topY = this.type === "sniper" ? 3.55 : this.type === "beacon" ? 2.45 : 1.05;
    }
    this.addMuzzle();
    this.root.traverse((child) => {
      child.userData.towerId = this.towerId;
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh && !(child as THREE.Sprite).isSprite) mesh.castShadow = true;
    });
  }

  private own<T extends THREE.Object3D>(obj: T): T {
    this.owned.push(obj);
    return obj;
  }

  private buildKit(level: number, assets: WorldAssets, material: THREE.MeshStandardMaterial): void {
    const stack = towerStack(this.type, level);
    let y = 0;
    for (const part of stack.base) {
      const obj = assets.kitPart(part, material);
      if (!obj) continue;
      obj.position.y = y;
      y += assets.partHeight(part);
      this.root.add(obj);
    }
    this.topY = y;

    if (stack.weapon) {
      const aim = new THREE.Group();
      aim.name = "aim";
      aim.position.y = y;
      const weapon = assets.kitPart(stack.weapon, material);
      if (weapon) {
        // Kit weapons point +Z; the Board heading lives on +X.
        weapon.rotation.y = Math.PI / 2;
        aim.add(weapon);
        this.barrel = weapon.getObjectByName("barrel") ?? weapon.getObjectByName("arrow") ?? null;
        if (this.barrel) this.barrelRest.copy(this.barrel.position);
      }
      this.root.add(aim);
      this.aim = aim;
    }

    if (stack.crown) {
      const crown = assets.kitPart(stack.crown, material);
      if (crown) {
        crown.position.y = y;
        crown.name = "crown";
        this.root.add(crown);
        this.accents.set("crown", crown);
      }
    }

    this.buildAccents(y);
  }

  private buildAccents(topY: number): void {
    if (this.type === "basic") {
      const collar = this.own(new THREE.Mesh(new THREE.TorusGeometry(1.02, 0.07, 8, 6), glowMat(ORANGE, 1.4, { emissiveMap: getRuneMap() })));
      collar.rotation.x = Math.PI / 2;
      collar.position.y = topY + 0.04;
      this.root.add(collar);
      this.accents.set("collar", collar);
      return;
    }
    if (this.type === "cannon") {
      const ring = this.own(new THREE.Mesh(new THREE.TorusGeometry(1.08, 0.06, 8, 28), glowMat(TEAL, 0.9, { emissiveMap: getRuneMap() })));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.22;
      this.root.add(ring);
      const core = this.own(new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), glowMat(TEAL, 1.2)));
      core.rotation.x = -Math.PI / 2;
      core.position.y = topY + 0.02;
      this.root.add(core);
      return;
    }
    if (this.type === "sniper") {
      const pole = this.own(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 1.5, 6), glowMat(TEAL, 0.5, { map: getFrostMap(), metalness: 0.7 })));
      pole.position.y = topY + 0.75;
      this.root.add(pole);
      const charge = this.own(new THREE.Mesh(new THREE.OctahedronGeometry(0.24), glowMat(0xffffff, 1.1, { emissive: TEAL, metalness: 0.8 })));
      charge.name = "charge";
      charge.position.y = topY + 1.6;
      this.root.add(charge);
      this.accents.set("charge", charge);
      for (let i = 0; i < 3; i += 1) {
        const fin = this.own(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.04), glowMat(TEAL, 1.1)));
        fin.position.y = topY + 0.5 + i * 0.4;
        fin.rotation.y = (i * Math.PI) / 3;
        this.root.add(fin);
      }
      return;
    }
    if (this.type === "beacon") {
      const glow = this.own(new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 10), glowMat(AMBER, 1.6)));
      glow.name = "idleGlow";
      glow.position.y = topY + 1.15;
      this.root.add(glow);
      this.accents.set("idleGlow", glow);
      const halo = this.own(new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.045, 8, 32), glowMat(AMBER, 1.3)));
      halo.name = "pulseRing";
      halo.rotation.x = Math.PI / 2;
      halo.position.y = topY + 1.0;
      this.root.add(halo);
      this.accents.set("pulseRing", halo);
      return;
    }
    // Frost Lantern: mint core hanging inside the roof, thin cage around it.
    const core = this.own(new THREE.Mesh(new THREE.OctahedronGeometry(0.36), glowMat(0xd8fff6, 1.5, { emissive: MINT, map: getFrostMap(), metalness: 0.7 })));
    core.name = "swirl";
    core.position.y = topY + 0.9;
    this.root.add(core);
    this.accents.set("swirl", core);
    const cage = this.own(
      new THREE.Mesh(
        new THREE.CylinderGeometry(0.5, 0.58, 1.1, 8, 1, true),
        glowMat(MINT, 0.55, { transparent: true, opacity: 0.55, map: getFrostMap(), side: THREE.DoubleSide }),
      ),
    );
    cage.position.y = topY + 0.85;
    this.root.add(cage);
  }

  private addMuzzle(): void {
    if (!this.aim || this.type === "beacon" || this.type === "lantern") return;
    this.muzzleMat = new THREE.SpriteMaterial({
      map: getGlowSprite(),
      color: TOWER_ACCENT[this.type],
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      opacity: 0,
    });
    const sprite = new THREE.Sprite(this.muzzleMat);
    sprite.raycast = () => {};
    const reach = this.kitBuilt ? (this.type === "sniper" ? 1.0 : 0.72) : this.type === "sniper" ? 1.35 : 1.25;
    const height = this.kitBuilt ? (this.type === "cannon" ? 0.95 : 0.78) : this.type === "cannon" ? 0.55 : 0.08;
    sprite.position.set(reach, height, 0);
    sprite.scale.setScalar(0.01);
    this.aim.add(sprite);
    this.muzzle = sprite;
    this.owned.push(sprite);
  }

  update(tower: Tower, dt: number, t: number, reducedMotion: boolean): void {
    const fired = tower.flash > this.lastFlash + 0.5;
    this.lastFlash = tower.flash;

    if (this.aim) {
      const target = -tower.angle;
      if (Number.isNaN(this.yaw)) this.yaw = target;
      const delta = wrapAngle(target - this.yaw);
      this.yaw += reducedMotion ? delta : delta * (1 - Math.exp(-14 * dt));
      this.aim.rotation.y = this.yaw;
    }

    if (fired) this.recoilVel = this.type === "cannon" ? -4.5 : this.type === "sniper" ? -3.6 : -2.6;
    this.recoilVel += (-this.recoil * 260 - this.recoilVel * 20) * dt;
    this.recoil += this.recoilVel * dt;
    if (this.barrel) {
      this.barrel.position.copy(this.barrelRest);
      this.barrel.position.z += this.recoil * 0.06;
    }

    if (this.muzzle && this.muzzleMat) {
      const flash = tower.flash;
      const on = flash > 0.5;
      this.muzzleMat.opacity = on ? Math.min(1, (flash - 0.5) * 2.2) : 0;
      const size = this.type === "cannon" ? 1.5 : this.type === "sniper" ? 1.2 : 0.95;
      this.muzzle.scale.setScalar(on ? size * (0.6 + flash * 0.5) : 0.01);
    }

    if (reducedMotion) return;

    if (!this.kitBuilt) {
      idleTower(this.root.children[0] as THREE.Group, this.type, t, tower.flash);
      return;
    }

    this.heat = Math.max(this.heat - dt * 0.9, tower.flash);
    if (this.type === "basic") {
      if (this.barrel) this.barrel.rotation.z += dt * 16 * this.heat;
      const collar = this.accents.get("collar") as THREE.Mesh | undefined;
      const mat = collar?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) mat.emissiveIntensity = 1.2 + this.heat * 1.1 + Math.sin(t * 3) * 0.15;
    } else if (this.type === "sniper") {
      const charge = this.accents.get("charge") as THREE.Mesh | undefined;
      const mat = charge?.material as THREE.MeshStandardMaterial | undefined;
      if (mat) {
        // Charge builds while the cooldown runs down, then dumps on fire.
        const cool = tower.cooldown > 0 ? 1 - Math.min(1, tower.cooldown / Math.max(0.2, 1 / tower.stats.fireRate)) : 1;
        mat.emissiveIntensity = 0.5 + cool * 1.6 + tower.flash * 1.4;
        mat.emissive.setHex(TEAL).lerp(_white, cool * 0.5);
      }
      if (charge) charge.rotation.y = t * 1.8;
    } else if (this.type === "beacon") {
      const ring = this.accents.get("pulseRing");
      if (ring) {
        const s = 1 + ((t * 0.55) % 1) * 0.9;
        ring.scale.set(s, s, s);
        const mat = (ring as THREE.Mesh).material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = 1.6 * (1 - ((t * 0.55) % 1));
      }
      const glow = this.accents.get("idleGlow") as THREE.Mesh | undefined;
      const glowMaterial = glow?.material as THREE.MeshStandardMaterial | undefined;
      if (glowMaterial) glowMaterial.emissiveIntensity = 1.4 + Math.sin(t * 1.6) * 0.3;
      const crown = this.accents.get("crown");
      if (crown) crown.rotation.y = t * 0.45;
    } else if (this.type === "lantern") {
      const swirl = this.accents.get("swirl");
      if (swirl) {
        swirl.rotation.y = t * 1.35;
        swirl.position.y = this.topY + 0.9 + Math.sin(t * 1.7) * 0.06;
      }
      const crown = this.accents.get("crown");
      if (crown) crown.rotation.z = Math.sin(t * 1.3) * 0.035;
    }
  }

  dispose(): void {
    this.clear();
  }
}
