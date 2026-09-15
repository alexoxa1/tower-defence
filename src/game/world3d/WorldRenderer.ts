import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH, PATH } from "../constants";
import type { BoardHit, BoardHitTest } from "../sim/boardHit";
import type { GameState, Point } from "../types";
import { logicalRadius, logicalToWorld, WORLD_SCALE, worldToLogical } from "./coords";
import { disposeObject } from "./dispose";
import {
  ORANGE,
  TEAL,
  makeChevron,
  makeEnemy,
  makeJaggedRock,
  makePortal,
  makeTower,
  parseCssColor,
} from "./models";

function seeded(seed: number): () => number {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 80);
    ctx.font = "800 44px Syne, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "rgba(8, 8, 8, 0.9)";
    ctx.lineWidth = 8;
    ctx.strokeText(text, 128, 42);
    ctx.fillStyle = color;
    ctx.fillText(text, 128, 42);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function matOpacity(material: THREE.SpriteMaterial, opacity: number): void {
  material.opacity = opacity;
}

interface SelectionFx {
  ring: THREE.Mesh;
  chevron: THREE.Mesh;
  color: number;
}

export class WorldRenderer implements BoardHitTest {
  readonly canvas: HTMLCanvasElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private ground: THREE.Mesh;
  private clock = new THREE.Clock();
  private cameraBase = new THREE.Vector3();
  private lookTarget = new THREE.Vector3(0, 0.35, 0);
  private cameraOffset = new THREE.Vector3();
  private panRight = new THREE.Vector3();
  private panUp = new THREE.Vector3();
  private frustum = 12.4;
  private keyLight: THREE.DirectionalLight;
  private lavaMats: THREE.MeshStandardMaterial[] = [];

  private towers = new Map<string, THREE.Group>();
  private enemies = new Map<number, THREE.Group>();
  private projectiles: THREE.Mesh[] = [];
  private particles: THREE.Mesh[] = [];
  private selectionFx = new Map<string, SelectionFx>();
  private ghost: THREE.Group;
  private ghostPad: THREE.Mesh;
  private ghostRing: THREE.Mesh;
  private floatSprites: THREE.Sprite[] = [];
  private enemyId = 0;
  private enemyKeys = new WeakMap<object, number>();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.22;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x14151a);

    this.camera = new THREE.OrthographicCamera(-20, 20, 16, -16, 0.1, 320);
    const d = 52;
    this.cameraOffset.set(d, d * 1.08, d);

    this.scene.add(new THREE.HemisphereLight(0xb8b0a4, 0x1c1a18, 1.15));
    this.keyLight = new THREE.DirectionalLight(0xffe4c4, 1.55);
    this.keyLight.position.set(18, 30, 12);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(1024, 1024);
    this.keyLight.shadow.camera.left = -30;
    this.keyLight.shadow.camera.right = 30;
    this.keyLight.shadow.camera.top = 26;
    this.keyLight.shadow.camera.bottom = -26;
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 90;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);
    const fill = new THREE.DirectionalLight(0x9ec4d8, 0.55);
    fill.position.set(-14, 18, -10);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0x3a3834, 0.82));
    this.applyCamera();

    this.ground = this.buildTerrain();
    this.buildPath();
    this.buildPortals();

    this.ghostPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.85, 0.95, 0.08, 6),
      new THREE.MeshStandardMaterial({
        color: TEAL,
        transparent: true,
        opacity: 0.42,
        emissive: TEAL,
        emissiveIntensity: 0.55,
      }),
    );
    this.ghostRing = new THREE.Mesh(
      new THREE.RingGeometry(0.94, 1, 48),
      new THREE.MeshBasicMaterial({
        color: TEAL,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
      }),
    );
    this.ghostRing.rotation.x = -Math.PI / 2;
    this.ghostRing.position.y = 0.06;
    this.ghost = new THREE.Group();
    this.ghost.add(this.ghostPad, this.ghostRing);
    this.ghost.visible = false;
    this.scene.add(this.ghost);

    const size = new THREE.Vector2(canvas.clientWidth || 800, canvas.clientHeight || 600);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(size, 0.28, 0.2, 0.52);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());

    this.resize();
  }

  resize(): void {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.bloom.setSize(w, h);
    const aspect = w / h;
    this.camera.left = -this.frustum * aspect;
    this.camera.right = this.frustum * aspect;
    this.camera.top = this.frustum;
    this.camera.bottom = -this.frustum;
    this.camera.updateProjectionMatrix();
  }

  pan(dxPx: number, dyPx: number): void {
    const scale = (this.frustum * 2) / Math.max(1, this.canvas.clientHeight);
    this.lookTarget.addScaledVector(this.panRight, -dxPx * scale);
    this.lookTarget.addScaledVector(this.panUp, dyPx * scale);
    this.clampLook();
    this.applyCamera();
  }

  zoom(deltaY: number): void {
    const factor = deltaY > 0 ? 1.08 : 0.92;
    this.frustum = Math.min(22, Math.max(6.4, this.frustum * factor));
    this.resize();
  }

  resetView(): void {
    this.lookTarget.set(0, 0.35, 0);
    this.frustum = 12.4;
    this.applyCamera();
    this.resize();
  }

  dispose(): void {
    for (const mesh of this.towers.values()) {
      this.scene.remove(mesh);
      disposeObject(mesh);
    }
    this.towers.clear();
    for (const mesh of this.enemies.values()) {
      this.scene.remove(mesh);
      disposeObject(mesh);
    }
    this.enemies.clear();
    for (const fx of this.selectionFx.values()) {
      this.scene.remove(fx.ring, fx.chevron);
      disposeObject(fx.ring);
      disposeObject(fx.chevron);
    }
    this.selectionFx.clear();
    for (const sprite of this.floatSprites) {
      this.scene.remove(sprite);
      sprite.material.map?.dispose();
      sprite.material.dispose();
    }
    this.floatSprites = [];
    disposeObject(this.scene);
    this.composer.dispose();
    this.renderer.dispose();
  }

  toLogical(clientX: number, clientY: number): Point | null {
    return this.screenToLogical(clientX, clientY);
  }

  hit(clientX: number, clientY: number): BoardHit {
    const upgradeId = this.pickUpgrade(clientX, clientY);
    if (upgradeId) return { kind: "upgrade", towerId: upgradeId };
    const towerId = this.pickTower(clientX, clientY);
    if (towerId) {
      const point = this.screenToLogical(clientX, clientY) ?? { x: 0, y: 0 };
      return { kind: "tower", towerId, point };
    }
    const ground = this.screenToLogical(clientX, clientY);
    if (ground) return { kind: "ground", point: ground };
    return { kind: "none" };
  }

  screenToLogical(clientX: number, clientY: number): Point | null {
    const hit = this.intersectGround(clientX, clientY);
    if (!hit) return null;
    return worldToLogical(hit.x, hit.z);
  }

  pickTower(clientX: number, clientY: number): string | null {
    this.setPointer(clientX, clientY);
    const objects = [...this.towers.values()];
    if (objects.length === 0) return null;
    const hits = this.raycaster.intersectObjects(objects, true);
    const id = hits[0]?.object.userData.towerId;
    return typeof id === "string" ? id : null;
  }

  pickUpgrade(clientX: number, clientY: number): string | null {
    this.setPointer(clientX, clientY);
    const chevrons = [...this.selectionFx.values()].map((fx) => fx.chevron);
    if (chevrons.length === 0) return null;
    const hits = this.raycaster.intersectObjects(chevrons, false);
    const id = hits[0]?.object.userData.towerId;
    return typeof id === "string" ? id : null;
  }

  sync(state: GameState): void {
    const t = this.clock.getElapsedTime();
    this.syncTowers(state);
    this.syncEnemies(state);
    this.syncProjectiles(state);
    this.syncParticles(state);
    this.syncFloatingTexts(state);
    this.syncGhost(state);
    this.applyShake(state);

    const pulse = 0.46 + Math.sin(t * 1.4) * 0.08;
    for (const mat of this.lavaMats) mat.emissiveIntensity = pulse;

    this.scene.traverse((obj) => {
      if (obj.name === "flame") {
        const s = 1 + Math.sin(t * 4 + obj.id) * 0.08;
        obj.scale.set(s * 1.15, 1.05 + Math.sin(t * 5) * 0.12, 0.38);
      }
    });
  }

  render(): void {
    const canvas = this.canvas;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      this.resize();
    }
    this.composer.render();
  }

  private setPointer(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  private intersectGround(clientX: number, clientY: number): THREE.Vector3 | null {
    this.setPointer(clientX, clientY);
    const hits = this.raycaster.intersectObject(this.ground);
    return hits[0]?.point ?? null;
  }

  private applyCamera(): void {
    this.camera.position.copy(this.lookTarget).add(this.cameraOffset);
    this.camera.lookAt(this.lookTarget);
    this.camera.updateMatrixWorld();
    this.cameraBase.copy(this.camera.position);

    this.panRight.setFromMatrixColumn(this.camera.matrixWorld, 0);
    this.panRight.y = 0;
    if (this.panRight.lengthSq() < 0.0001) this.panRight.set(1, 0, 0);
    this.panRight.normalize();
    this.panUp.crossVectors(new THREE.Vector3(0, 1, 0), this.panRight).normalize();

    if (this.keyLight) {
      this.keyLight.position.set(
        this.lookTarget.x + 18,
        this.lookTarget.y + 30,
        this.lookTarget.z + 12,
      );
      this.keyLight.target.position.copy(this.lookTarget);
      this.keyLight.target.updateMatrixWorld();
    }
  }

  private clampLook(): void {
    const padX = (LOGICAL_WIDTH / 2) * WORLD_SCALE;
    const padZ = (LOGICAL_HEIGHT / 2) * WORLD_SCALE;
    this.lookTarget.x = Math.min(padX, Math.max(-padX, this.lookTarget.x));
    this.lookTarget.z = Math.min(padZ, Math.max(-padZ, this.lookTarget.z));
  }

  private applyShake(state: GameState): void {
    this.camera.position.copy(this.cameraBase);
    if (state.shake.time > 0 && state.shake.mag > 0) {
      const amp = state.shake.mag * 0.04 * Math.min(1, state.shake.time * 4);
      this.camera.position.x += (Math.random() * 2 - 1) * amp;
      this.camera.position.y += (Math.random() * 2 - 1) * amp;
    }
  }

  private buildTerrain(): THREE.Mesh {
    const geo = new THREE.PlaneGeometry(130, 100, 56, 42);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const rand = seeded(90210);
    for (let i = 0; i < pos.count; i += 1) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const n =
        Math.sin(x * 0.16) * Math.cos(z * 0.14) * 0.55 +
        (rand() - 0.5) * 0.45;
      const edge = Math.max(0, Math.hypot(x, z) - 28) * 0.12;
      pos.setY(i, Math.max(-0.2, n * 0.32 + edge * edge * 0.03));
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0x2a2b32,
        roughness: 0.92,
        metalness: 0.05,
        flatShading: true,
      }),
    );
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    const rocks = new THREE.Group();
    for (let i = 0; i < 140; i += 1) {
      const rx = (rand() - 0.5) * 110;
      const rz = (rand() - 0.5) * 82;
      if (this.nearPath(rx, rz, 3.4)) continue;
      const rock = makeJaggedRock(rand);
      const h = 0.6 + rand() * 2.4;
      rock.position.set(rx, h * 0.35, rz);
      rock.scale.setScalar(0.8 + rand() * 1.6);
      rock.rotation.set(rand() * 0.4, rand() * Math.PI, rand() * 0.3);
      rocks.add(rock);
    }
    this.scene.add(rocks);
    return mesh;
  }

  private nearPath(wx: number, wz: number, pad: number): boolean {
    const p = worldToLogical(wx, wz);
    for (let i = 0; i < PATH.length - 1; i += 1) {
      const a = PATH[i];
      const b = PATH[i + 1];
      const abx = b.x - a.x;
      const aby = b.y - a.y;
      const t = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * abx + (p.y - a.y) * aby) / (abx * abx + aby * aby)),
      );
      const nx = a.x + abx * t;
      const ny = a.y + aby * t;
      if (Math.hypot(p.x - nx, p.y - ny) < 48 + pad * 8) return true;
    }
    return false;
  }

  private buildPath(): void {
    const width = logicalRadius(28) * 2;
    const lavaWidth = width * 0.7;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0x2a2620,
      roughness: 0.92,
      metalness: 0.12,
      flatShading: true,
    });
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0x3a2214,
      emissive: 0x9a3c14,
      emissiveIntensity: 0.46,
      roughness: 0.68,
      metalness: 0.06,
    });
    this.lavaMats.push(lavaMat);

    for (let i = 0; i < PATH.length - 1; i += 1) {
      const a = logicalToWorld(PATH[i].x, PATH[i].y, 0.04);
      const b = logicalToWorld(PATH[i + 1].x, PATH[i + 1].y, 0.04);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) + 0.35;
      const yaw = Math.atan2(dx, dz);
      const mid = new THREE.Vector3((a.x + b.x) / 2, 0.05, (a.z + b.z) / 2);

      const rim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, len), stoneMat);
      rim.position.copy(mid);
      rim.rotation.y = yaw;
      rim.receiveShadow = true;
      this.scene.add(rim);

      const lava = new THREE.Mesh(new THREE.BoxGeometry(lavaWidth, 0.08, len - 0.08), lavaMat);
      lava.position.set(mid.x, 0.14, mid.z);
      lava.rotation.y = yaw;
      this.scene.add(lava);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.48, width * 0.48, 0.16, 8),
        stoneMat,
      );
      cap.position.copy(a);
      cap.position.y = 0.05;
      this.scene.add(cap);
    }
  }

  private buildPortals(): void {
    const start = PATH[0];
    const end = PATH[PATH.length - 1];
    const inn = makePortal("IN");
    const out = makePortal("OUT");
    inn.position.copy(logicalToWorld(start.x + 36, start.y, 0));
    out.position.copy(logicalToWorld(end.x - 36, end.y, 0));
    inn.rotation.y = Math.PI / 2;
    out.rotation.y = -Math.PI / 2;
    this.scene.add(inn, out);
  }

  private removeTowerMesh(id: string, mesh: THREE.Group): void {
    this.scene.remove(mesh);
    disposeObject(mesh);
    this.towers.delete(id);
    const fx = this.selectionFx.get(id);
    if (fx) {
      this.scene.remove(fx.ring, fx.chevron);
      disposeObject(fx.ring);
      disposeObject(fx.chevron);
      this.selectionFx.delete(id);
    }
  }

  private syncTowers(state: GameState): void {
    const seen = new Set<string>();
    for (const tower of state.towers) {
      seen.add(tower.id);
      let mesh = this.towers.get(tower.id);
      if (!mesh) {
        mesh = makeTower(tower.type);
        mesh.userData.towerId = tower.id;
        mesh.traverse((c) => {
          c.castShadow = true;
          c.userData.towerId = tower.id;
        });
        this.towers.set(tower.id, mesh);
        this.scene.add(mesh);
      }
      const pos = logicalToWorld(tower.x, tower.y, 0);
      mesh.position.copy(pos);
      const aim = mesh.getObjectByName("aim");
      if (aim) aim.rotation.y = -tower.angle;
    }
    for (const [id, mesh] of this.towers) {
      if (!seen.has(id)) this.removeTowerMesh(id, mesh);
    }

    const selected = state.selectedTowerIds;
    for (const [id, fx] of this.selectionFx) {
      if (!selected.has(id)) {
        this.scene.remove(fx.ring, fx.chevron);
        disposeObject(fx.ring);
        disposeObject(fx.chevron);
        this.selectionFx.delete(id);
      }
    }

    for (const id of selected) {
      const tower = state.towers.find((t) => t.id === id);
      if (!tower) continue;
      const color = tower.type === "basic" ? ORANGE : TEAL;
      let fx = this.selectionFx.get(id);
      if (!fx) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(0.94, 1, 64),
          new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: 0.55,
            side: THREE.DoubleSide,
          }),
        );
        ring.rotation.x = -Math.PI / 2;
        const chevron = makeChevron(color);
        chevron.userData.towerId = id;
        this.scene.add(ring, chevron);
        fx = { ring, chevron, color };
        this.selectionFx.set(id, fx);
      } else if (fx.color !== color) {
        (fx.ring.material as THREE.MeshBasicMaterial).color.setHex(color);
        (fx.chevron.material as THREE.MeshStandardMaterial).color.setHex(color);
        (fx.chevron.material as THREE.MeshStandardMaterial).emissive.setHex(color);
        fx.color = color;
      }

      const range = logicalRadius(tower.stats.range);
      fx.ring.scale.set(range, range, 1);
      fx.ring.position.copy(logicalToWorld(tower.x, tower.y, 0.08));
      fx.chevron.position.copy(
        logicalToWorld(tower.x, tower.y, tower.type === "sniper" ? 4.35 : 2.35),
      );
      fx.chevron.lookAt(this.camera.position);
    }
  }

  private syncEnemies(state: GameState): void {
    const live = new Set<number>();
    for (const enemy of state.enemies) {
      let key = this.enemyKeys.get(enemy);
      if (key === undefined) {
        this.enemyId += 1;
        key = this.enemyId;
        this.enemyKeys.set(enemy, key);
      }
      live.add(key);
      let mesh = this.enemies.get(key);
      if (!mesh) {
        mesh = makeEnemy(enemy.kind);
        mesh.traverse((c) => {
          c.castShadow = true;
        });
        this.enemies.set(key, mesh);
        this.scene.add(mesh);
      }
      mesh.position.copy(logicalToWorld(enemy.x, enemy.y, 0));
      const pulse = enemy.flash > 0.4 ? 1.12 : 1;
      mesh.scale.setScalar(enemy.scale * pulse);
      const waypoint = PATH[Math.min(enemy.waypointIndex, PATH.length - 1)];
      mesh.rotation.y = -Math.atan2(waypoint.y - enemy.y, waypoint.x - enemy.x);
      const hp = mesh.getObjectByName("hp");
      if (hp) hp.scale.x = Math.max(0.08, enemy.hp / enemy.maxHp);
      hp?.lookAt(this.camera.position);
      mesh.getObjectByName("hp-track")?.lookAt(this.camera.position);
      const body = mesh.children.find((c) => c instanceof THREE.Mesh) as THREE.Mesh | undefined;
      const mat = body?.material as THREE.MeshStandardMaterial | undefined;
      if (mat && "emissive" in mat) {
        mat.emissive.setHex(enemy.slowTimer > 0 ? TEAL : 0x000000);
        mat.emissiveIntensity = enemy.slowTimer > 0 ? 0.55 : 0.15;
      }
    }
    for (const [key, mesh] of this.enemies) {
      if (!live.has(key)) {
        this.scene.remove(mesh);
        disposeObject(mesh);
        this.enemies.delete(key);
      }
    }
  }

  private syncProjectiles(state: GameState): void {
    while (this.projectiles.length < state.projectiles.length) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xffe0a0,
          emissive: ORANGE,
          emissiveIntensity: 1.6,
        }),
      );
      this.projectiles.push(ball);
      this.scene.add(ball);
    }
    this.projectiles.forEach((mesh, i) => {
      const p = state.projectiles[i];
      if (!p) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      const tint = parseCssColor(p.color);
      const mat = mesh.material as THREE.MeshStandardMaterial;
      mat.color.setHex(tint);
      mat.emissive.setHex(tint);
      const height = p.splash > 0 ? 1.55 : 0.95;
      mesh.position.copy(logicalToWorld(p.x, p.y, height));
    });
  }

  private syncParticles(state: GameState): void {
    const max = Math.min(state.particles.length, 60);
    while (this.particles.length < max) {
      const speck = new THREE.Mesh(
        new THREE.SphereGeometry(0.08, 6, 6),
        new THREE.MeshBasicMaterial({ color: ORANGE }),
      );
      this.particles.push(speck);
      this.scene.add(speck);
    }
    this.particles.forEach((mesh, i) => {
      const p = state.particles[i];
      if (!p || i >= max) {
        mesh.visible = false;
        return;
      }
      mesh.visible = true;
      (mesh.material as THREE.MeshBasicMaterial).color.set(p.color);
      mesh.position.copy(logicalToWorld(p.x, p.y, 0.6 + (p.maxLife - p.life)));
      mesh.scale.setScalar(Math.max(0.2, p.life / p.maxLife));
    });
  }

  private syncGhost(state: GameState): void {
    const preview = state.placementPreview;
    if (!preview.visible) {
      this.ghost.visible = false;
      return;
    }
    const color = preview.ok ? TEAL : ORANGE;
    const padMat = this.ghostPad.material as THREE.MeshStandardMaterial;
    padMat.color.setHex(color);
    padMat.emissive.setHex(color);
    (this.ghostRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    const range = logicalRadius(preview.range);
    this.ghostRing.scale.set(range, range, 1);
    this.ghost.visible = true;
    this.ghost.position.copy(logicalToWorld(preview.x, preview.y, 0.05));
  }

  private syncFloatingTexts(state: GameState): void {
    const texts = state.floatingTexts;
    while (this.floatSprites.length < texts.length) {
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          transparent: true,
          depthTest: false,
          depthWrite: false,
          sizeAttenuation: true,
          toneMapped: false,
        }),
      );
      sprite.scale.set(3.8, 1.15, 1);
      sprite.renderOrder = 20;
      this.floatSprites.push(sprite);
      this.scene.add(sprite);
    }
    this.floatSprites.forEach((sprite, i) => {
      const text = texts[i];
      if (!text) {
        sprite.visible = false;
        return;
      }
      sprite.visible = true;
      const key = `${text.text}|${text.color}`;
      if (sprite.userData.label !== key) {
        const map = makeLabelTexture(text.text, text.color);
        const mat = sprite.material;
        mat.map?.dispose();
        mat.map = map;
        mat.needsUpdate = true;
        sprite.userData.label = key;
      }
      matOpacity(sprite.material, Math.max(0, text.life / text.maxLife));
      sprite.position.copy(logicalToWorld(text.x, text.y, 2.6));
    });
  }
}
