import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { DEFAULT_LAYOUT_ID, LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants";
import { getLayout } from "../config/layouts";
import { getEffectiveStats } from "../config/towerStats";
import { dragOffset } from "../sim/drag";
import type { BoardHit, BoardHitTest } from "../sim/boardHit";
import { nearestIdByScreen, TOWER_PICK_SLOP_PX, UPGRADE_PICK_SLOP_PX } from "../sim/screenPick";
import type { GameState, Point } from "../types";
import { KIT_SCALE, WorldAssets } from "./assets";
import { logicalRadius, logicalToWorld, WORLD_SCALE, worldToLogical } from "./coords";
import { disposeObject } from "./dispose";
import { EffectsLayer } from "./effects";
import { EnemyView } from "./enemyView";
import { buildFlora, type FloraProps } from "./flora";
import { createBoardFog, createEmbers, tickEmbers } from "./life";
import {
  ORANGE,
  TEAL,
  makeChevron,
  makeJaggedRock,
  makePortal,
  parseCssColor,
} from "./models";
import {
  disposeWorldTextures,
  getGroundMap,
  getGroundNormalMap,
  getGroundRoughnessMap,
  getLavaMap,
  getLavaNormalMap,
  getRoadMap,
  getRoadNormalMap,
  getRoadRoughnessMap,
  layoutSeed,
  seeded,
  setWorldTextureAnisotropy,
  useWorldXZMap,
  warmupWorldTextures,
} from "./textures";
import { TowerView } from "./towerView";

const DANGER = 0xd4453a;

function makeLabelTexture(text: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 80);
    ctx.font = '800 44px "Big Shoulders Display", sans-serif';
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
  private roadRoot = new THREE.Group();
  private portalRoot = new THREE.Group();
  private propRoot = new THREE.Group();
  private floraRoot = new THREE.Group();
  private embers: THREE.Points;
  private windTime = { value: 0 };
  private windAmp = { value: 0.12 };
  private layoutId = "";
  private currentRoad: readonly Point[] = [];
  private reducedMotion = false;
  private loggedDraw = false;

  private assets = new WorldAssets();
  private seenGeneration = 0;
  private kitApplied = false;
  private propsApplied = false;
  private lastElapsed = 0;
  private effects = new EffectsLayer();
  private towers = new Map<string, TowerView>();
  private enemies = new Map<number, EnemyView>();
  private dying: EnemyView[] = [];
  private particles: THREE.Mesh[] = [];
  private selectionFx = new Map<string, SelectionFx>();
  private ghost: THREE.Group;
  private ghostPad: THREE.Mesh;
  private ghostRing: THREE.Mesh;
  private ghostInvalidMark: THREE.Group;
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
    this.renderer.toneMapping = THREE.AgXToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x14151a);
    this.scene.fog = createBoardFog();
    // Zero-asset image-based lighting so metal and crystal pick up reflections.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(room, 0.04).texture;
    this.scene.environmentIntensity = 0.28;
    pmrem.dispose();

    this.camera = new THREE.OrthographicCamera(-20, 20, 16, -16, 0.1, 320);
    const d = 52;
    this.cameraOffset.set(d, d * 1.08, d);

    this.scene.add(new THREE.HemisphereLight(0xb4bcc8, 0x24262c, 0.42));
    this.keyLight = new THREE.DirectionalLight(0xffe4c4, 1.25);
    this.keyLight.position.set(18, 30, 12);
    this.keyLight.castShadow = true;
    this.keyLight.shadow.mapSize.set(2048, 2048);
    // Cover the whole 1400x1000 Board (about 81 x 58 world units) from the key light's angle.
    this.keyLight.shadow.camera.left = -48;
    this.keyLight.shadow.camera.right = 48;
    this.keyLight.shadow.camera.top = 40;
    this.keyLight.shadow.camera.bottom = -40;
    this.keyLight.shadow.camera.near = 4;
    this.keyLight.shadow.camera.far = 110;
    this.keyLight.shadow.bias = -0.0004;
    this.keyLight.shadow.normalBias = 0.02;
    this.keyLight.shadow.radius = 2;
    this.scene.add(this.keyLight);
    this.scene.add(this.keyLight.target);
    const fill = new THREE.DirectionalLight(0x9ec4d8, 0.32);
    fill.position.set(-14, 18, -10);
    this.scene.add(fill);
    this.scene.add(new THREE.AmbientLight(0x3a3e46, 0.22));
    this.applyCamera();

    warmupWorldTextures();
    setWorldTextureAnisotropy(Math.min(8, this.renderer.capabilities.getMaxAnisotropy()));

    this.currentRoad = getLayout(DEFAULT_LAYOUT_ID).road;
    this.ground = this.buildTerrain();
    this.scene.add(this.roadRoot, this.portalRoot, this.propRoot, this.floraRoot);
    this.rebuildRoad(this.currentRoad, DEFAULT_LAYOUT_ID);
    this.layoutId = DEFAULT_LAYOUT_ID;
    this.embers = createEmbers();
    this.scene.add(this.embers);
    this.scene.add(this.effects.root);
    this.assets.load(() => {
      /* Views poll assets.generation during sync so swaps happen on the render thread. */
    });

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
        opacity: 0.42,
        side: THREE.DoubleSide,
      }),
    );
    this.ghostRing.rotation.x = -Math.PI / 2;
    this.ghostRing.position.y = 0.06;
    this.ghostInvalidMark = new THREE.Group();
    const invalidMaterial = new THREE.MeshBasicMaterial({ color: DANGER });
    for (const rotation of [-Math.PI / 4, Math.PI / 4]) {
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.08, 0.14),
        invalidMaterial,
      );
      bar.position.y = 0.18;
      bar.rotation.y = rotation;
      this.ghostInvalidMark.add(bar);
    }
    this.ghost = new THREE.Group();
    this.ghost.add(this.ghostPad, this.ghostRing, this.ghostInvalidMark);
    this.ghost.visible = false;
    this.scene.add(this.ghost);

    const size = new THREE.Vector2(canvas.clientWidth || 800, canvas.clientHeight || 600);
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(size, 0.34, 0.3, 0.86);
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
    this.zoomByFactor(deltaY > 0 ? 1.08 : 0.92);
  }

  zoomByFactor(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) return;
    this.frustum = Math.min(22, Math.max(6.4, this.frustum * factor));
    this.resize();
  }

  resetView(): void {
    this.lookTarget.set(0, 0.35, 0);
    this.frustum = 12.4;
    this.applyCamera();
    this.resize();
  }

  setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    this.bloom.strength = on ? 0 : 0.34;
    this.windAmp.value = on ? 0 : 0.12;
    this.embers.visible = !on;
  }

  dispose(): void {
    for (const view of this.towers.values()) {
      this.scene.remove(view.root);
      view.dispose();
    }
    this.towers.clear();
    for (const view of this.enemies.values()) {
      this.scene.remove(view.root);
      view.dispose();
    }
    this.enemies.clear();
    for (const view of this.dying) {
      this.scene.remove(view.root);
      view.dispose();
    }
    this.dying = [];
    this.scene.remove(this.effects.root);
    this.effects.dispose();
    this.assets.dispose();
    this.rockMaterial?.dispose();
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
    disposeWorldTextures();
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
    const objects = [...this.towers.values()].map((view) => view.root);
    if (objects.length === 0) return null;
    const hits = this.raycaster.intersectObjects(objects, true);
    const id = hits[0]?.object.userData.towerId;
    if (typeof id === "string") return id;
    return this.pickNearestScreen(
      [...this.towers.entries()].map(([towerId, view]) => ({
        id: towerId,
        object: view.root,
      })),
      clientX,
      clientY,
      TOWER_PICK_SLOP_PX,
    );
  }

  pickUpgrade(clientX: number, clientY: number): string | null {
    this.setPointer(clientX, clientY);
    const chevrons = [...this.selectionFx.values()].map((fx) => fx.chevron);
    if (chevrons.length === 0) return null;
    const hits = this.raycaster.intersectObjects(chevrons, false);
    const id = hits[0]?.object.userData.towerId;
    if (typeof id === "string") return id;
    return this.pickNearestScreen(
      [...this.selectionFx.entries()].map(([towerId, fx]) => ({
        id: towerId,
        object: fx.chevron,
      })),
      clientX,
      clientY,
      UPGRADE_PICK_SLOP_PX,
    );
  }

  private pickNearestScreen(
    items: { id: string; object: THREE.Object3D }[],
    clientX: number,
    clientY: number,
    maxPx: number,
  ): string | null {
    const rect = this.canvas.getBoundingClientRect();
    const world = new THREE.Vector3();
    const projected = items.map((item) => {
      item.object.getWorldPosition(world);
      world.project(this.camera);
      return {
        id: item.id,
        x: (world.x * 0.5 + 0.5) * rect.width + rect.left,
        y: (-world.y * 0.5 + 0.5) * rect.height + rect.top,
      };
    });
    return nearestIdByScreen(projected, clientX, clientY, maxPx);
  }

  sync(state: GameState): void {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.getElapsedTime();
    this.windTime.value = t;
    // Watch time: frozen while paused, scaled by Speed. Drives mixers and impact FX.
    const simDt = Math.max(0, Math.min(0.1, state.elapsed - this.lastElapsed));
    this.lastElapsed = state.elapsed;

    const assetsChanged = this.assets.generation !== this.seenGeneration;
    this.seenGeneration = this.assets.generation;
    if (state.layoutId !== this.layoutId || this.assetPropsArrived()) {
      this.rebuildRoad(state.road, state.layoutId);
      this.layoutId = state.layoutId;
    }
    this.syncTowers(state, dt, t);
    this.syncEnemies(state, simDt, t, assetsChanged);
    this.effects.sync(state, simDt);
    this.syncParticles(state);
    this.syncFloatingTexts(state);
    this.syncGhost(state);
    this.applyShake(state);

    if (this.reducedMotion) return;

    tickEmbers(this.embers, t);
    const pulse = 0.46 + Math.sin(t * 1.4) * 0.08;
    for (const mat of this.lavaMats) mat.emissiveIntensity = pulse;

    this.portalRoot.traverse((obj) => {
      if (obj.name === "flame") {
        const s = 1 + Math.sin(t * 4 + obj.id) * 0.08;
        obj.scale.set(s * 1.15, 1.05 + Math.sin(t * 5) * 0.12, 0.38);
      }
    });
  }

  /** True once per pack arrival so props and portals rebuild with kit meshes. */
  private assetPropsArrived(): boolean {
    let changed = false;
    if (!this.kitApplied && this.assets.hasKit()) {
      this.kitApplied = true;
      changed = true;
    }
    if (!this.propsApplied && this.assets.hasProps()) {
      this.propsApplied = true;
      changed = true;
    }
    return changed;
  }

  render(): void {
    const canvas = this.canvas;
    const w = Math.max(1, canvas.clientWidth);
    const h = Math.max(1, canvas.clientHeight);
    if (canvas.width !== w || canvas.height !== h) {
      this.resize();
    }
    if (import.meta.env.DEV && !this.loggedDraw) {
      this.renderer.info.autoReset = false;
      this.renderer.info.reset();
    }
    this.composer.render();
    if (import.meta.env.DEV && !this.loggedDraw) {
      this.loggedDraw = true;
      console.info("[world3d] draw calls", this.renderer.info.render.calls);
      this.logCoverage(w, h);
      this.renderer.info.autoReset = true;
    }
  }

  private logCoverage(width: number, height: number): void {
    const world = new THREE.Vector3();
    const matrix = new THREE.Matrix4();
    const screen: { x: number; y: number; wx: number; wz: number }[] = [];
    const collect = (obj: THREE.Object3D) => {
      const instanced = obj as THREE.InstancedMesh;
      if (instanced.isInstancedMesh) {
        for (let i = 0; i < instanced.count; i += 1) {
          instanced.getMatrixAt(i, matrix);
          world.setFromMatrixPosition(matrix);
          instanced.localToWorld(world);
          screen.push({ x: 0, y: 0, wx: world.x, wz: world.z });
          const last = screen[screen.length - 1];
          world.project(this.camera);
          last.x = (world.x * 0.5 + 0.5) * width;
          last.y = (-world.y * 0.5 + 0.5) * height;
        }
        return;
      }
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.getWorldPosition(world);
      const wx = world.x;
      const wz = world.z;
      world.project(this.camera);
      screen.push({
        x: (world.x * 0.5 + 0.5) * width,
        y: (-world.y * 0.5 + 0.5) * height,
        wx,
        wz,
      });
    };
    this.floraRoot.traverse(collect);
    this.propRoot.traverse(collect);
    const x0 = width * 0.2;
    const y0 = height * 0.12;
    const size = 320;
    const step = 160;
    let emptiest = Number.POSITIVE_INFINITY;
    for (let y = y0; y + size <= height; y += step) {
      for (let x = x0; x + size <= width; x += step) {
        const cx = x + size * 0.5;
        const cy = y + size * 0.5;
        this.pointer.x = (cx / width) * 2 - 1;
        this.pointer.y = -(cy / height) * 2 + 1;
        this.raycaster.setFromCamera(this.pointer, this.camera);
        const hit = this.raycaster.intersectObject(this.ground)[0]?.point;
        if (!hit || this.nearPath(hit.x, hit.z, 0.15)) continue;
        let n = 0;
        for (const p of screen) {
          if (p.x >= x && p.x < x + size && p.y >= y && p.y < y + size) n += 1;
        }
        if (n < emptiest) emptiest = n;
      }
    }
    console.info("[world3d] emptiest_region_props", Number.isFinite(emptiest) ? emptiest : 0);
    const leaf = this.floraRoot.getObjectByName("broadleaf") as THREE.InstancedMesh | undefined;
    if (leaf?.isInstancedMesh) {
      let onScreen = 0;
      for (let i = 0; i < leaf.count; i += 1) {
        leaf.getMatrixAt(i, matrix);
        world.setFromMatrixPosition(matrix);
        leaf.localToWorld(world);
        world.project(this.camera);
        const sx = (world.x * 0.5 + 0.5) * width;
        const sy = (-world.y * 0.5 + 0.5) * height;
        if (sx > width * 0.2 && sx < width && sy > height * 0.12 && sy < height) onScreen += 1;
      }
      console.info("[world3d] broadleaf onscreen", onScreen, "of", leaf.count);
    }
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
    if (this.reducedMotion) return;
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
    const groundMap = getGroundMap();
    groundMap.repeat.set(7, 5);
    const groundNormal = getGroundNormalMap();
    groundNormal.repeat.set(7, 5);
    const groundRough = getGroundRoughnessMap();
    groundRough.repeat.set(7, 5);
    const mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0x8a8c94,
        map: groundMap,
        normalMap: groundNormal,
        normalScale: new THREE.Vector2(0.9, 0.9),
        roughnessMap: groundRough,
        roughness: 1,
        metalness: 0.04,
        emissive: 0x222a38,
        emissiveIntensity: 0.12,
      }),
    );
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  private occupied(wx: number, wz: number, pad: number): boolean {
    if (this.nearPath(wx, wz, pad)) return true;
    const road = this.currentRoad;
    if (road.length === 0) return true;
    const inn = logicalToWorld(road[0].x + 36, road[0].y, 0);
    const out = logicalToWorld(road[road.length - 1].x - 36, road[road.length - 1].y, 0);
    const r2 = 5.2 * 5.2;
    const dxIn = wx - inn.x;
    const dzIn = wz - inn.z;
    if (dxIn * dxIn + dzIn * dzIn < r2) return true;
    const dxOut = wx - out.x;
    const dzOut = wz - out.z;
    return dxOut * dxOut + dzOut * dzOut < r2;
  }

  private sampleCorridor(rand: () => number, inner: number, outer: number): { wx: number; wz: number } {
    const road = this.currentRoad;
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
    const w = logicalToWorld(lx + (-dy / len) * dist * side, ly + (dx / len) * dist * side, 0);
    return { wx: w.x, wz: w.z };
  }

  private buildRocks(layoutId: string): void {
    const rand = seeded(90210 ^ layoutSeed(layoutId));
    let placed = 0;
    let attempts = 0;
    while (placed < 40 && attempts < 40 * 24) {
      attempts += 1;
      let rx: number;
      let rz: number;
      if (this.currentRoad.length > 1 && rand() < 0.78) {
        const sample = this.sampleCorridor(rand, 72, 160);
        rx = sample.wx;
        rz = sample.wz;
      } else {
        rx = (rand() - 0.5) * 110;
        rz = (rand() - 0.5) * 82;
      }
      if (this.occupied(rx, rz, 0.6)) continue;
      const kitRock = this.kitRock(rand);
      if (kitRock) {
        const s = 1.2 + rand() * 1.6;
        kitRock.position.set(rx, -0.04, rz);
        kitRock.scale.set(s, s * (0.8 + rand() * 0.5), s);
        kitRock.rotation.set(0, rand() * Math.PI * 2, 0);
        this.propRoot.add(kitRock);
      } else {
        const rock = makeJaggedRock(rand);
        const s = 0.5 + rand() * 0.8;
        const h = 0.4 + rand() * 1.0;
        rock.position.set(rx, h * 0.18, rz);
        rock.scale.set(s, h, s);
        rock.rotation.set(rand() * 0.28, rand() * Math.PI, rand() * 0.2);
        this.propRoot.add(rock);
      }
      placed += 1;
    }
  }

  private rockMaterial: THREE.MeshStandardMaterial | null = null;

  /** Nature Kit rock instance with a soot tint, or null before the props load. */
  private kitRock(rand: () => number): THREE.Mesh | null {
    const names = ["rock_largeA", "rock_largeB", "rock_tallA", "rock_tallC", "rock_tallH", "stone_largeA", "stone_tallB"];
    const geo = this.assets.propGeometry(names[Math.floor(rand() * names.length)]);
    if (!geo) return null;
    if (!this.rockMaterial) {
      this.rockMaterial = new THREE.MeshStandardMaterial({
        color: 0x8c8f99,
        vertexColors: true,
        roughness: 0.92,
        metalness: 0.06,
        flatShading: true,
      });
      this.rockMaterial.userData.shared = true;
    }
    const mesh = new THREE.Mesh(geo, this.rockMaterial);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private floraProps(): FloraProps {
    const g = (name: string) => this.assets.propGeometry(name) ?? undefined;
    return {
      pine: g("tree_pineTallA"),
      squat: g("tree_pineRoundA"),
      broadleaf: g("tree_oak_dark"),
      shrub: g("plant_bushLarge"),
      grass: g("grass_leafs"),
      slab: g("rock_largeB"),
    };
  }

  private nearPath(wx: number, wz: number, pad: number): boolean {
    const p = worldToLogical(wx, wz);
    const road = this.currentRoad;
    for (let i = 0; i < road.length - 1; i += 1) {
      const a = road[i];
      const b = road[i + 1];
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

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      disposeObject(child);
    }
  }

  private rebuildRoad(road: readonly Point[], layoutId: string): void {
    this.currentRoad = road;
    this.clearGroup(this.roadRoot);
    this.clearGroup(this.portalRoot);
    this.clearGroup(this.propRoot);
    this.clearGroup(this.floraRoot);
    this.lavaMats = [];
    this.buildPath(road);
    this.buildPortals(road);
    this.buildRocks(layoutId);
    const flora = buildFlora(
      layoutId,
      (wx, wz, pad) => this.occupied(wx, wz, pad),
      { uTime: this.windTime, uWind: this.windAmp },
      road,
      this.floraProps(),
    );
    this.floraRoot.add(flora);
  }

  private buildPath(road: readonly Point[] = this.currentRoad): void {
    const width = logicalRadius(28) * 2;
    const lavaWidth = width * 0.45;
    const stoneMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: getRoadMap(),
      normalMap: getRoadNormalMap(),
      normalScale: new THREE.Vector2(1.1, 1.1),
      roughnessMap: getRoadRoughnessMap(),
      roughness: 1,
      metalness: 0.1,
    });
    useWorldXZMap(stoneMat, 0.28);
    const lavaMat = new THREE.MeshStandardMaterial({
      color: 0x181c24,
      map: getRoadMap(),
      normalMap: getLavaNormalMap(),
      normalScale: new THREE.Vector2(0.8, 0.8),
      emissive: 0xd47828,
      emissiveMap: getLavaMap(),
      emissiveIntensity: 0.46,
      roughness: 0.72,
      metalness: 0.06,
    });
    useWorldXZMap(lavaMat, 0.34);
    this.lavaMats.push(lavaMat);

    for (let i = 0; i < road.length - 1; i += 1) {
      const a = logicalToWorld(road[i].x, road[i].y, 0.04);
      const b = logicalToWorld(road[i + 1].x, road[i + 1].y, 0.04);
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const len = Math.hypot(dx, dz) + 0.35;
      const yaw = Math.atan2(dx, dz);
      const mid = new THREE.Vector3((a.x + b.x) / 2, 0.05, (a.z + b.z) / 2);

      const rim = new THREE.Mesh(new THREE.BoxGeometry(width, 0.16, len), stoneMat);
      rim.position.copy(mid);
      rim.rotation.y = yaw;
      rim.receiveShadow = true;
      this.roadRoot.add(rim);

      const lava = new THREE.Mesh(new THREE.BoxGeometry(lavaWidth, 0.08, len - 0.08), lavaMat);
      lava.position.set(mid.x, 0.14, mid.z);
      lava.rotation.y = yaw;
      this.roadRoot.add(lava);

      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(width * 0.48, width * 0.48, 0.16, 8),
        stoneMat,
      );
      cap.position.copy(a);
      cap.position.y = 0.05;
      this.roadRoot.add(cap);
    }
  }

  private buildPortals(road: readonly Point[] = this.currentRoad): void {
    if (road.length === 0) return;
    const start = road[0];
    const end = road[road.length - 1];
    const inn = makePortal("IN");
    const out = makePortal("OUT");
    inn.position.copy(logicalToWorld(start.x + 36, start.y, 0));
    out.position.copy(logicalToWorld(end.x - 36, end.y, 0));
    inn.rotation.y = Math.PI / 2;
    out.rotation.y = -Math.PI / 2;
    this.portalRoot.add(inn, out);
    this.dressPortal(inn, "spawn-round", 1);
    this.dressPortal(out, "spawn-square", 2);
  }

  /** Kit pad and crystal shards around a portal once the kit has loaded. */
  private dressPortal(portal: THREE.Group, pad: string, seed: number): void {
    const material = this.assets.kitPropMaterial();
    if (!material) return;
    const plate = this.assets.kitPart(pad, material);
    if (plate) {
      plate.scale.setScalar(KIT_SCALE * 2.6);
      plate.position.y = 0.02;
      portal.add(plate);
    }
    const rand = seeded(7000 + seed);
    for (let i = 0; i < 5; i += 1) {
      const shard = this.assets.kitPart(i % 2 === 0 ? "detail-crystal" : "detail-rocks", material);
      if (!shard) continue;
      const a = rand() * Math.PI * 2;
      const r = 2.2 + rand() * 1.4;
      shard.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      shard.rotation.y = rand() * Math.PI * 2;
      shard.scale.setScalar(KIT_SCALE * (0.9 + rand() * 0.8));
      portal.add(shard);
    }
  }

  private removeTowerView(id: string, view: TowerView): void {
    this.scene.remove(view.root);
    view.dispose();
    this.towers.delete(id);
    const fx = this.selectionFx.get(id);
    if (fx) {
      this.scene.remove(fx.ring, fx.chevron);
      disposeObject(fx.ring);
      disposeObject(fx.chevron);
      this.selectionFx.delete(id);
    }
  }

  private syncTowers(state: GameState, dt: number, t: number): void {
    const seen = new Set<string>();
    for (const tower of state.towers) {
      seen.add(tower.id);
      let view = this.towers.get(tower.id);
      if (!view) {
        view = new TowerView(tower.id, tower.type, tower.level, this.assets);
        this.towers.set(tower.id, view);
        this.scene.add(view.root);
      } else {
        view.syncModel(tower.level, this.assets);
      }
      const offset = dragOffset(state.drag);
      const moving =
        offset &&
        state.drag.kind === "relocating" &&
        state.drag.originPositions.has(tower.id);
      const x = moving && offset ? tower.x + offset.x : tower.x;
      const y = moving && offset ? tower.y + offset.y : tower.y;
      view.root.position.copy(logicalToWorld(x, y, 0));
      view.update(tower, dt, t, this.reducedMotion);
    }
    for (const [id, view] of this.towers) {
      if (!seen.has(id)) this.removeTowerView(id, view);
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
      const offset = dragOffset(state.drag);
      const moving =
        offset &&
        state.drag.kind === "relocating" &&
        state.drag.originPositions.has(tower.id);
      const x = moving && offset ? tower.x + offset.x : tower.x;
      const y = moving && offset ? tower.y + offset.y : tower.y;
      const color = parseCssColor(tower.stats.color);
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

      const range = logicalRadius(getEffectiveStats(state, tower).range);
      fx.ring.scale.set(range, range, 1);
      fx.ring.position.copy(logicalToWorld(x, y, 0.08));
      const chevronH = this.towers.get(id)?.markerHeight ?? 2.35;
      fx.chevron.position.copy(logicalToWorld(x, y, chevronH));
      fx.chevron.lookAt(this.camera.position);
    }
  }

  private syncEnemies(state: GameState, simDt: number, t: number, assetsChanged: boolean): void {
    const live = new Set<number>();
    for (const enemy of state.enemies) {
      let key = this.enemyKeys.get(enemy);
      if (key === undefined) {
        this.enemyId += 1;
        key = this.enemyId;
        this.enemyKeys.set(enemy, key);
      }
      live.add(key);
      let view = this.enemies.get(key);
      if (!view) {
        view = new EnemyView(enemy, this.assets);
        this.enemies.set(key, view);
        this.scene.add(view.root);
      } else if (assetsChanged && !view.isRigged) {
        view.tryRig(this.assets);
      }
      view.update(state, simDt, this.camera, t, this.reducedMotion);
    }
    for (const [key, view] of this.enemies) {
      if (live.has(key)) continue;
      this.enemies.delete(key);
      if (!this.reducedMotion && view.beginRemoval()) {
        this.dying.push(view);
      } else {
        this.scene.remove(view.root);
        view.dispose();
      }
    }
    for (let i = this.dying.length - 1; i >= 0; i -= 1) {
      const view = this.dying[i];
      if (view.updateDying(simDt)) {
        this.scene.remove(view.root);
        view.dispose();
        this.dying.splice(i, 1);
      }
    }
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
    const color = preview.ok ? TEAL : DANGER;
    const padMat = this.ghostPad.material as THREE.MeshStandardMaterial;
    padMat.color.setHex(color);
    padMat.emissive.setHex(color);
    (this.ghostRing.material as THREE.MeshBasicMaterial).color.setHex(color);
    this.ghostInvalidMark.visible = !preview.ok;
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
