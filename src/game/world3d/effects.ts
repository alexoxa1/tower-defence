import * as THREE from "three";
import type { Projectile } from "../entities/Projectile";
import type { GameState } from "../types";
import { logicalRadius, logicalToWorld } from "./coords";
import { disposeObject } from "./dispose";
import { parseCssColor } from "./models";
import { getGlowSprite, getScorchSprite } from "./textures";

const UP = new THREE.Vector3(0, 1, 0);
const _dir = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _white = new THREE.Color(1, 1, 1);

interface Timed<T extends THREE.Object3D> {
  obj: T;
  life: number;
  max: number;
  size: number;
}

/**
 * Projectile heads with tracer tails, plus impact flares, Splash shockwaves, and scorch decals.
 * Everything is pooled; nothing allocates per frame once the pools are warm.
 */
export class EffectsLayer {
  readonly root = new THREE.Group();

  private heads: THREE.Mesh[] = [];
  private tails: THREE.Mesh[] = [];
  private headGeo = new THREE.SphereGeometry(0.13, 10, 8);
  private tailGeo = new THREE.CylinderGeometry(0.02, 0.1, 1, 6, 1, true);
  private flares: Timed<THREE.Sprite>[] = [];
  private rings: Timed<THREE.Mesh>[] = [];
  private decals: Timed<THREE.Mesh>[] = [];
  private ringGeo = new THREE.RingGeometry(0.82, 1, 48);
  private decalGeo = new THREE.PlaneGeometry(2, 2);
  private previous: Projectile[] = [];
  private live = new Set<Projectile>();

  constructor() {
    this.root.name = "effects";
    this.tailGeo.translate(0, 0.5, 0);
  }

  sync(state: GameState, simDt: number): void {
    this.syncProjectiles(state);
    this.detectImpacts(state);
    this.tick(simDt);
  }

  private syncProjectiles(state: GameState): void {
    while (this.heads.length < state.projectiles.length) {
      const head = new THREE.Mesh(
        this.headGeo,
        new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xff6a1a, emissiveIntensity: 2.2, roughness: 0.3 }),
      );
      head.raycast = () => {};
      const tail = new THREE.Mesh(
        this.tailGeo,
        new THREE.MeshBasicMaterial({
          color: 0xff6a1a,
          transparent: true,
          opacity: 0.75,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      tail.raycast = () => {};
      this.heads.push(head);
      this.tails.push(tail);
      this.root.add(head, tail);
    }
    for (let i = 0; i < this.heads.length; i += 1) {
      const p = state.projectiles[i];
      const head = this.heads[i];
      const tail = this.tails[i];
      if (!p) {
        head.visible = false;
        tail.visible = false;
        continue;
      }
      head.visible = true;
      const tint = parseCssColor(p.color);
      const headMat = head.material as THREE.MeshStandardMaterial;
      headMat.color.setHex(tint).lerp(_white, 0.35);
      headMat.emissive.setHex(tint);
      const splash = p.splash > 0;
      const height = splash ? 1.55 : 0.95;
      head.position.copy(logicalToWorld(p.x, p.y, height));
      head.scale.setScalar(splash ? 1.6 : p.slowDuration > 0 ? 0.8 : 1);

      const first = p.trail[0];
      if (!first) {
        tail.visible = false;
        continue;
      }
      _a.copy(logicalToWorld(first.x, first.y, height));
      _b.copy(head.position);
      _dir.subVectors(_b, _a);
      const len = _dir.length();
      if (len < 0.05) {
        tail.visible = false;
        continue;
      }
      tail.visible = true;
      _dir.divideScalar(len);
      tail.quaternion.setFromUnitVectors(UP, _dir);
      tail.position.copy(_a);
      tail.scale.set(splash ? 1.6 : 1, Math.min(len, 3.2), splash ? 1.6 : 1);
      (tail.material as THREE.MeshBasicMaterial).color.setHex(tint);
    }
  }

  private detectImpacts(state: GameState): void {
    this.live.clear();
    for (const p of state.projectiles) this.live.add(p);
    for (const p of this.previous) {
      if (this.live.has(p)) continue;
      // A Projectile that ended on its target hit it; one that lost its target just fades.
      const hit = !p.active && Math.hypot(p.x - p.target.x, p.y - p.target.y) < 0.5;
      if (!hit) continue;
      const tint = parseCssColor(p.color);
      if (p.splash > 0) {
        const radius = logicalRadius(p.splash);
        this.spawnRing(p.x, p.y, radius, tint, 0.42);
        this.spawnDecal(p.x, p.y, radius * 0.9, 5.5);
        this.spawnFlare(p.x, p.y, 1.35, radius * 1.4, tint, 0.24);
      } else if (p.slowDuration > 0) {
        this.spawnRing(p.x, p.y, 0.7, tint, 0.3);
        this.spawnFlare(p.x, p.y, 0.9, 1.1, tint, 0.18);
      } else {
        this.spawnFlare(p.x, p.y, 0.9, 0.8, tint, 0.14);
      }
    }
    this.previous.length = 0;
    for (const p of state.projectiles) this.previous.push(p);
  }

  private spawnFlare(x: number, y: number, h: number, size: number, tint: number, seconds: number): void {
    let slot = this.flares.find((f) => f.life <= 0);
    if (!slot) {
      if (this.flares.length >= 32) return;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: getGlowSprite(),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        }),
      );
      sprite.raycast = () => {};
      slot = { obj: sprite, life: 0, max: 1, size: 1 };
      this.flares.push(slot);
      this.root.add(sprite);
    }
    slot.life = seconds;
    slot.max = seconds;
    slot.size = size;
    slot.obj.visible = true;
    slot.obj.position.copy(logicalToWorld(x, y, h));
    (slot.obj.material as THREE.SpriteMaterial).color.setHex(tint);
  }

  private spawnRing(x: number, y: number, radius: number, tint: number, seconds: number): void {
    let slot = this.rings.find((r) => r.life <= 0);
    if (!slot) {
      if (this.rings.length >= 16) return;
      const mesh = new THREE.Mesh(
        this.ringGeo,
        new THREE.MeshBasicMaterial({
          color: tint,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.raycast = () => {};
      slot = { obj: mesh, life: 0, max: 1, size: 1 };
      this.rings.push(slot);
      this.root.add(mesh);
    }
    slot.life = seconds;
    slot.max = seconds;
    slot.size = radius;
    slot.obj.visible = true;
    slot.obj.position.copy(logicalToWorld(x, y, 0.12));
    (slot.obj.material as THREE.MeshBasicMaterial).color.setHex(tint);
  }

  private spawnDecal(x: number, y: number, radius: number, seconds: number): void {
    let slot = this.decals.find((d) => d.life <= 0);
    if (!slot) {
      if (this.decals.length >= 14) {
        // Recycle the oldest scorch so the Road never fills up.
        slot = this.decals.reduce((min, d) => (d.life < min.life ? d : min), this.decals[0]);
      } else {
        const mesh = new THREE.Mesh(
          this.decalGeo,
          new THREE.MeshBasicMaterial({
            map: getScorchSprite(),
            transparent: true,
            depthWrite: false,
            polygonOffset: true,
            polygonOffsetFactor: -2,
          }),
        );
        mesh.rotation.x = -Math.PI / 2;
        mesh.raycast = () => {};
        mesh.renderOrder = 1;
        slot = { obj: mesh, life: 0, max: 1, size: 1 };
        this.decals.push(slot);
        this.root.add(mesh);
      }
    }
    slot.life = seconds;
    slot.max = seconds;
    slot.size = radius;
    slot.obj.visible = true;
    slot.obj.position.copy(logicalToWorld(x, y, 0.2));
    slot.obj.rotation.z = Math.random() * Math.PI * 2;
    slot.obj.scale.setScalar(radius);
  }

  private tick(dt: number): void {
    for (const f of this.flares) {
      if (f.life <= 0) continue;
      f.life -= dt;
      const k = Math.max(0, f.life / f.max);
      f.obj.scale.setScalar(f.size * (1.4 - k * 0.6));
      (f.obj.material as THREE.SpriteMaterial).opacity = k;
      if (f.life <= 0) f.obj.visible = false;
    }
    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const k = Math.max(0, r.life / r.max);
      const grow = 1 - k * k;
      r.obj.scale.setScalar(Math.max(0.05, r.size * (0.2 + grow * 0.8)));
      (r.obj.material as THREE.MeshBasicMaterial).opacity = k * 0.9;
      if (r.life <= 0) r.obj.visible = false;
    }
    for (const d of this.decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      const k = Math.max(0, d.life / d.max);
      (d.obj.material as THREE.MeshBasicMaterial).opacity = Math.min(0.85, k * 1.6);
      if (d.life <= 0) d.obj.visible = false;
    }
  }

  dispose(): void {
    disposeObject(this.root);
    this.headGeo.dispose();
    this.tailGeo.dispose();
    this.ringGeo.dispose();
    this.decalGeo.dispose();
  }
}
