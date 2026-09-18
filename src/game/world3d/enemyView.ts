import * as THREE from "three";
import type { Enemy } from "../entities/Enemy";
import type { GameState } from "../types";
import type { WorldAssets } from "./assets";
import { WORLD_SCALE, logicalToWorld } from "./coords";
import { disposeObject } from "./dispose";
import { addHpBar, makeEnemy, TEAL } from "./models";
import { ENEMY_TINT } from "./palette";

const WALK_CLIPS = ["Walk", "Run", "Fast_Flying", "Walking_A"];
const IDLE_CLIPS = ["Idle", "Flying_Idle"];
const DEATH_CLIPS = ["Death", "Death_A"];
const HIT_CLIPS = ["HitReact", "HitRecieve"];

const DEATH_SECONDS = 1.15;
const SINK_AFTER = 0.55;

const _target = new THREE.Vector3();
const _white = new THREE.Color(1, 1, 1);
const _bodyTint = new THREE.Color();

function findClip(clips: THREE.AnimationClip[], names: string[]): THREE.AnimationClip | null {
  for (const name of names) {
    const clip = THREE.AnimationClip.findByName(clips, name);
    if (clip) return clip;
  }
  return null;
}

function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

/**
 * One Enemy on the Board. Starts as a procedural figure and swaps to the rigged glTF once the
 * prefab has loaded. Owns its mixer and per-instance materials.
 */
export class EnemyView {
  readonly root = new THREE.Group();
  readonly enemy: Enemy;

  private body: THREE.Object3D;
  private figure: THREE.Group;
  private mixer: THREE.AnimationMixer | null = null;
  private walk: THREE.AnimationAction | null = null;
  private idle: THREE.AnimationAction | null = null;
  private death: THREE.AnimationAction | null = null;
  private hit: THREE.AnimationAction | null = null;
  private lastHitFlash = 0;
  private materials: THREE.MeshStandardMaterial[] = [];
  private hpFill: THREE.Object3D | null = null;
  private hpTrack: THREE.Object3D | null = null;
  private rigged = false;
  private bodyScale = 1;
  private yaw = Number.NaN;
  private lean = 0;
  private dying = -1;
  private phase = Math.random() * Math.PI * 2;
  private stride = 1;

  constructor(enemy: Enemy, assets: WorldAssets) {
    this.enemy = enemy;
    this.figure = new THREE.Group();
    this.root.add(this.figure);
    this.body = new THREE.Group();
    this.figure.add(this.body);
    if (!this.tryRig(assets)) this.buildProcedural();
  }

  get isRigged(): boolean {
    return this.rigged;
  }

  get isDying(): boolean {
    return this.dying >= 0;
  }

  /** Swaps the procedural stand-in for the rigged prefab. Returns true when it did. */
  tryRig(assets: WorldAssets): boolean {
    if (this.rigged || this.dying >= 0) return false;
    const prefab = assets.enemyPrefab(this.enemy.kind);
    const clone = assets.cloneEnemy(this.enemy.kind);
    if (!prefab || !clone) return false;
    this.clearBody();
    const tint = ENEMY_TINT[this.enemy.kind];
    this.bodyScale = tint.height / prefab.height;
    this.stride = tint.height * 0.9;
    // Quaternius monsters face +Z. The Road heading is +X in the figure's frame.
    clone.rotation.y = Math.PI / 2;
    clone.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = mats.map((mat) => {
        const std = (mat as THREE.MeshStandardMaterial).clone();
        if (std.map) std.map.userData.shared = true;
        // Keep the atlas. A light lerp toward the kind swatch separates the eight Enemies.
        std.color.setHex(0xffffff).lerp(_bodyTint.setHex(tint.body), 0.22);
        std.emissive.setHex(tint.glow);
        std.emissiveIntensity = 0.28;
        if (this.enemy.kind === "shade") {
          std.transparent = true;
          std.opacity = 0.62;
          std.emissiveIntensity = 0.9;
          std.depthWrite = false;
        }
        this.materials.push(std);
        return std;
      });
      mesh.material = cloned.length === 1 ? cloned[0] : cloned;
      mesh.castShadow = this.enemy.kind !== "shade";
    });
    this.body = clone;
    this.figure.add(this.body);
    this.mixer = new THREE.AnimationMixer(clone);
    this.mixer.addEventListener("finished", (event) => {
      if (event.action === this.hit) event.action.fadeOut(0.12);
    });
    const walkClip = findClip(prefab.clips, WALK_CLIPS);
    const idleClip = findClip(prefab.clips, IDLE_CLIPS);
    const deathClip = findClip(prefab.clips, DEATH_CLIPS);
    const hitClip = findClip(prefab.clips, HIT_CLIPS);
    if (walkClip) {
      this.walk = this.mixer.clipAction(walkClip);
      this.walk.play();
      this.walk.time = this.phase * 0.1;
    }
    if (idleClip) this.idle = this.mixer.clipAction(idleClip);
    if (deathClip) {
      this.death = this.mixer.clipAction(deathClip);
      this.death.setLoop(THREE.LoopOnce, 1);
      this.death.clampWhenFinished = true;
    }
    if (hitClip) {
      this.hit = this.mixer.clipAction(hitClip);
      this.hit.setLoop(THREE.LoopOnce, 1);
      this.hit.clampWhenFinished = true;
    }
    this.rigged = true;
    this.addHp(tint.height * 1.12 * this.enemy.scale);
    return true;
  }

  private buildProcedural(): void {
    this.clearBody();
    const figure = makeEnemy(this.enemy.kind);
    figure.traverse((c) => {
      c.castShadow = true;
    });
    figure.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mat = mesh.material as THREE.MeshStandardMaterial;
      if (mat.isMeshStandardMaterial) this.materials.push(mat);
    });
    this.body = figure;
    this.bodyScale = 1;
    this.figure.add(this.body);
    this.hpFill = figure.getObjectByName("hp") ?? null;
    this.hpTrack = figure.getObjectByName("hp-track") ?? null;
  }

  private addHp(height: number): void {
    const bar = new THREE.Group();
    addHpBar(bar, height, 0.55 + this.enemy.scale * 0.25);
    this.root.add(bar);
    this.hpFill = bar.getObjectByName("hp") ?? null;
    this.hpTrack = bar.getObjectByName("hp-track") ?? null;
  }

  private clearBody(): void {
    if (this.body.parent) this.body.parent.remove(this.body);
    this.mixer?.stopAllAction();
    this.mixer = null;
    this.walk = null;
    this.idle = null;
    this.death = null;
    this.hit = null;
    this.lastHitFlash = 0;
    if (this.rigged) {
      for (const mat of this.materials) mat.dispose();
      this.body.traverse((child) => {
        const skinned = child as THREE.SkinnedMesh;
        if (skinned.isSkinnedMesh) skinned.skeleton.dispose();
      });
    } else {
      disposeObject(this.body);
    }
    this.materials = [];
    if (this.hpFill?.parent && this.hpFill.parent !== this.body) {
      const bar = this.hpFill.parent;
      bar.parent?.remove(bar);
      disposeObject(bar);
    }
    this.hpFill = null;
    this.hpTrack = null;
  }

  /** Per-frame update while the Enemy is alive on the Road. */
  update(state: GameState, simDt: number, camera: THREE.Camera, t: number, reducedMotion: boolean): void {
    const enemy = this.enemy;
    this.root.position.copy(logicalToWorld(enemy.x, enemy.y, 0));
    const waypoint = state.road[Math.min(enemy.waypointIndex, state.road.length - 1)] ?? state.road[0];
    const targetYaw = -Math.atan2(waypoint.y - enemy.y, waypoint.x - enemy.x);
    if (Number.isNaN(this.yaw)) this.yaw = targetYaw;
    const delta = wrapAngle(targetYaw - this.yaw);
    const k = 1 - Math.exp(-9 * Math.max(simDt, 0.0001));
    const step = reducedMotion ? delta : delta * k;
    this.yaw += step;
    this.figure.rotation.y = this.yaw;
    // Lean into the turn: roll toward the inside of the bend, then settle.
    const turnRate = simDt > 0 ? step / simDt : 0;
    const wantLean = THREE.MathUtils.clamp(-turnRate * 0.045, -0.28, 0.28);
    this.lean += (wantLean - this.lean) * Math.min(1, simDt * 8);
    this.figure.rotation.z = reducedMotion ? 0 : this.lean;

    const slowed = enemy.slowTimer > 0;
    const pace = enemy.speed * (slowed ? enemy.slowFactor : 1) * WORLD_SCALE;
    const flash = enemy.flash;
    const scale = enemy.scale * this.bodyScale;

    if (this.rigged && this.mixer) {
      if (this.walk) {
        const timeScale = THREE.MathUtils.clamp(pace / this.stride, 0.45, 3.4);
        this.walk.setEffectiveTimeScale(timeScale);
      }
      if (this.hit && flash > 0.72 && this.lastHitFlash <= 0.72) {
        this.hit.reset().setEffectiveTimeScale(1.5).play();
      }
      this.lastHitFlash = flash;
      this.mixer.update(simDt);
      const punch = flash > 0.6 ? 1 + (flash - 0.6) * 0.3 : 1;
      this.body.scale.set(scale * punch, scale * (2 - punch), scale * punch);
      this.body.position.y = enemy.kind === "shade" && !reducedMotion ? 0.35 + Math.sin(t * 2.2 + this.phase) * 0.14 : 0;
    } else {
      const pulse = flash > 0.4 ? 1.12 : 1;
      const bob = reducedMotion ? 0 : Math.abs(Math.sin(t * 7 + this.phase)) * 0.07 * enemy.scale;
      this.body.scale.setScalar(enemy.scale * pulse);
      this.body.position.y = bob;
    }

    for (const mat of this.materials) {
      const tint = ENEMY_TINT[enemy.kind];
      mat.emissive.setHex(slowed ? TEAL : tint.glow);
      if (flash > 0) mat.emissive.lerp(_white, Math.min(1, flash * 0.95));
      const base = this.rigged ? (enemy.kind === "shade" ? 0.9 : 0.35) : 0.22;
      mat.emissiveIntensity = (slowed ? base + 0.3 : base) + flash * 1.8;
    }

    if (this.hpFill) {
      this.hpFill.scale.x = Math.max(0.08, enemy.hp / enemy.maxHp);
      camera.getWorldPosition(_target);
      this.hpFill.lookAt(_target);
      this.hpTrack?.lookAt(_target);
    }
  }

  /** The Enemy left state. Escaped Enemies vanish through Out; killed ones play Death. */
  beginRemoval(): boolean {
    if (this.enemy.escaped) return false;
    this.dying = 0;
    if (this.hpFill?.parent) this.hpFill.parent.visible = false;
    if (this.hpFill && this.hpFill.parent === this.body) this.hpFill.visible = false;
    if (this.hpTrack && this.hpTrack.parent === this.body) this.hpTrack.visible = false;
    if (this.rigged && this.mixer && this.death) {
      this.walk?.fadeOut(0.12);
      this.idle?.stop();
      this.death.reset().setEffectiveTimeScale(1.4).fadeIn(0.08).play();
    }
    return true;
  }

  /** Advances the death. Returns true when the view can be removed. */
  updateDying(simDt: number): boolean {
    this.dying += simDt;
    if (this.rigged && this.mixer) {
      this.mixer.update(simDt);
    } else {
      this.body.rotation.x += simDt * 4;
      this.body.scale.multiplyScalar(Math.max(0.6, 1 - simDt * 2.2));
    }
    if (this.dying > SINK_AFTER) {
      const k = (this.dying - SINK_AFTER) / (DEATH_SECONDS - SINK_AFTER);
      this.root.position.y = -k * k * 1.6;
      for (const mat of this.materials) {
        mat.emissiveIntensity = 0.35 + k * 1.2;
      }
    }
    return this.dying >= DEATH_SECONDS;
  }

  dispose(): void {
    this.clearBody();
    disposeObject(this.root);
  }
}
