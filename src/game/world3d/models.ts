import * as THREE from "three";
import type { EnemyKind, TowerType } from "../types";

export const ORANGE = 0xff6a1a;
export const TEAL = 0x2ee6c5;
export const STONE = 0x1a1a1c;
export const METAL = 0x3a342e;

function mat(
  color: number,
  extras: THREE.MeshStandardMaterialParameters = {},
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.72,
    metalness: 0.28,
    ...extras,
  });
}

export function makeHexGun(): THREE.Group {
  const g = new THREE.Group();
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.15, 0.35, 6),
    mat(0x2a241c, { metalness: 0.55 }),
  );
  base.position.y = 0.18;
  g.add(base);

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.82, 0.7, 6),
    mat(0x8a5a28, { metalness: 0.62, roughness: 0.38 }),
  );
  body.position.y = 0.68;
  g.add(body);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.08, 8, 6),
    mat(ORANGE, { emissive: ORANGE, emissiveIntensity: 0.85, roughness: 0.4 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.95;
  g.add(ring);

  const turret = new THREE.Group();
  turret.name = "aim";
  turret.position.y = 1.05;
  for (let i = -1; i <= 1; i += 1) {
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, 1.35, 8),
      mat(0x1c1814, { metalness: 0.7 }),
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.55, 0.08, i * 0.22);
    turret.add(barrel);
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 8, 8),
      mat(ORANGE, { emissive: ORANGE, emissiveIntensity: 1.4 }),
    );
    glow.position.set(1.22, 0.08, i * 0.22);
    turret.add(glow);
  }
  g.add(turret);
  g.userData.kind = "tower";
  return g;
}

export function makeMortar(): THREE.Group {
  const g = new THREE.Group();
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(1.28, 1.42, 0.22, 20),
    mat(0x122824, { metalness: 0.45, roughness: 0.7 }),
  );
  pad.position.y = 0.11;
  g.add(pad);

  const collar = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.08, 8, 24),
    mat(TEAL, { emissive: TEAL, emissiveIntensity: 0.45 }),
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.24;
  g.add(collar);

  const drum = new THREE.Mesh(
    new THREE.CylinderGeometry(0.92, 1.08, 0.42, 20),
    mat(0x1a5c52, { metalness: 0.4 }),
  );
  drum.position.y = 0.42;
  g.add(drum);

  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.78, 20, 14, 0, Math.PI * 2, 0, Math.PI / 1.7),
    mat(0x14584c, { metalness: 0.35, roughness: 0.45 }),
  );
  bowl.position.y = 0.62;
  g.add(bowl);

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(0.42, 20),
    mat(TEAL, { emissive: TEAL, emissiveIntensity: 1.1 }),
  );
  core.rotation.x = -Math.PI / 2;
  core.position.y = 0.68;
  g.add(core);

  const aim = new THREE.Group();
  aim.name = "aim";
  aim.position.y = 0.85;
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.26, 0.85, 12),
    mat(0x0c221c, { metalness: 0.65 }),
  );
  tube.rotation.z = 0.72;
  tube.position.set(0.22, 0.28, 0);
  aim.add(tube);
  g.add(aim);
  g.userData.kind = "tower";
  return g;
}

export function makeRail(): THREE.Group {
  const g = new THREE.Group();
  const foot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.55, 0.7, 0.2, 6),
    mat(0x1c2224, { metalness: 0.72 }),
  );
  foot.position.y = 0.1;
  g.add(foot);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.32, 3.9, 6),
    mat(0xb8fff4, {
      metalness: 0.62,
      roughness: 0.22,
      emissive: TEAL,
      emissiveIntensity: 0.28,
    }),
  );
  shaft.position.y = 2.15;
  g.add(shaft);

  for (let i = 0; i < 5; i += 1) {
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.92, 0.08, 0.04),
      mat(TEAL, { emissive: TEAL, emissiveIntensity: 0.85 }),
    );
    fin.position.y = 0.85 + i * 0.62;
    fin.rotation.y = (i * Math.PI) / 5;
    g.add(fin);
    const twin = fin.clone();
    twin.rotation.y += Math.PI / 2;
    g.add(twin);
  }

  const cap = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.22),
    mat(0xffffff, { emissive: TEAL, emissiveIntensity: 1.1, metalness: 0.8 }),
  );
  cap.position.y = 4.15;
  g.add(cap);

  const aim = new THREE.Group();
  aim.name = "aim";
  aim.position.y = 3.55;
  const needle = new THREE.Mesh(
    new THREE.ConeGeometry(0.07, 1.35, 6),
    mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.7, metalness: 0.85 }),
  );
  needle.rotation.z = -Math.PI / 2;
  needle.position.x = 0.7;
  aim.add(needle);
  g.add(aim);
  g.userData.kind = "tower";
  return g;
}

export function makeBeacon(): THREE.Group {
  const g = new THREE.Group();
  const amber = 0xe8a54b;
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.95, 1.12, 0.22, 6),
    mat(0x2a2214, { metalness: 0.5 }),
  );
  pad.position.y = 0.12;
  g.add(pad);

  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.38, 2.2, 6),
    mat(0x3a2e1c, { metalness: 0.55, roughness: 0.4 }),
  );
  shaft.position.y = 1.2;
  g.add(shaft);

  const flame = new THREE.Mesh(
    new THREE.SphereGeometry(0.42, 12, 10),
    mat(amber, { emissive: amber, emissiveIntensity: 1.35, roughness: 0.28 }),
  );
  flame.position.y = 2.45;
  g.add(flame);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.62, 0.05, 8, 16),
    mat(amber, { emissive: amber, emissiveIntensity: 0.9 }),
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 2.45;
  g.add(halo);

  const aim = new THREE.Group();
  aim.name = "aim";
  aim.position.y = 2.45;
  g.add(aim);
  g.userData.kind = "tower";
  return g;
}

export function makeLantern(): THREE.Group {
  const g = new THREE.Group();
  const mint = 0x7dcea0;
  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.82, 1.05, 0.28, 8),
    mat(0x14241c, { metalness: 0.4, roughness: 0.62 }),
  );
  bowl.position.y = 0.16;
  g.add(bowl);

  const cage = new THREE.Mesh(
    new THREE.CylinderGeometry(0.48, 0.55, 1.35, 8, 1, true),
    mat(mint, { emissive: mint, emissiveIntensity: 0.35, transparent: true, opacity: 0.7 }),
  );
  cage.position.y = 1.05;
  g.add(cage);

  const core = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.38),
    mat(0xd8fff6, { emissive: mint, emissiveIntensity: 1.2, metalness: 0.7 }),
  );
  core.position.y = 1.1;
  g.add(core);

  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 0.42, 8),
    mat(0x1a2e24, { metalness: 0.5 }),
  );
  cap.position.y = 1.85;
  g.add(cap);

  const aim = new THREE.Group();
  aim.name = "aim";
  aim.position.y = 1.1;
  g.add(aim);
  g.userData.kind = "tower";
  return g;
}

export function makeTower(type: TowerType): THREE.Group {
  if (type === "cannon") return makeMortar();
  if (type === "sniper") return makeRail();
  if (type === "beacon") return makeBeacon();
  if (type === "lantern") return makeLantern();
  return makeHexGun();
}

function addHpBar(g: THREE.Group, y: number, width = 0.7): void {
  const track = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 0.07),
    new THREE.MeshBasicMaterial({ color: 0x1a1210, side: THREE.DoubleSide }),
  );
  track.position.y = y;
  track.name = "hp-track";
  g.add(track);
  const fill = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.94, 0.05),
    new THREE.MeshBasicMaterial({ color: ORANGE, side: THREE.DoubleSide }),
  );
  fill.position.y = y + 0.001;
  fill.name = "hp";
  g.add(fill);
}

function makeCreepFigure(): THREE.Group {
  const g = new THREE.Group();
  const hide = mat(0x4a2414, { roughness: 0.82 });
  const flesh = mat(0xc45a22, { roughness: 0.5 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.38, 4, 8), flesh);
  torso.position.y = 0.48;
  g.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), flesh);
  head.position.y = 0.92;
  g.add(head);
  for (const x of [-0.16, 0.16]) {
    const horn = new THREE.Mesh(
      new THREE.ConeGeometry(0.05, 0.28, 6),
      mat(0x2a1810, { roughness: 0.7 }),
    );
    horn.position.set(x, 1.12, -0.02);
    horn.rotation.z = x > 0 ? -0.35 : 0.35;
    g.add(horn);
  }
  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.18), hide);
  jaw.position.set(0, 0.82, 0.12);
  g.add(jaw);
  for (const x of [-0.22, 0.22]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 3, 6), hide);
    arm.position.set(x, 0.55, 0.02);
    arm.rotation.z = x > 0 ? -0.55 : 0.55;
    g.add(arm);
  }
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 8, 8),
    mat(ORANGE, { emissive: ORANGE, emissiveIntensity: 1.2 }),
  );
  eye.position.set(0.1, 0.96, 0.16);
  g.add(eye);
  addHpBar(g, 1.28);
  return g;
}

function makeRunnerFigure(): THREE.Group {
  const g = new THREE.Group();
  const hide = mat(0x16382c, { roughness: 0.55, emissive: 0x083028, emissiveIntensity: 0.25 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 4, 8), hide);
  body.rotation.z = Math.PI / 2;
  body.position.set(0.05, 0.28, 0);
  g.add(body);
  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.42, 7),
    mat(TEAL, { emissive: TEAL, emissiveIntensity: 0.45 }),
  );
  head.rotation.z = -Math.PI / 2;
  head.position.set(0.42, 0.3, 0);
  g.add(head);
  for (const z of [-0.12, 0.12]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6), hide);
    leg.position.set(-0.12, 0.16, z);
    g.add(leg);
  }
  addHpBar(g, 0.72, 0.55);
  return g;
}

function makeBruteFigure(): THREE.Group {
  const g = new THREE.Group();
  const plate = mat(0x5a2218, { roughness: 0.78, metalness: 0.2 });
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.48), plate);
  torso.position.y = 0.55;
  g.add(torso);
  const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.42), plate);
  pauldronL.position.set(-0.42, 0.78, 0);
  const pauldronR = pauldronL.clone();
  pauldronR.position.x = 0.42;
  g.add(pauldronL, pauldronR);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.28), plate);
  head.position.y = 1.02;
  g.add(head);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, 0.06),
    mat(ORANGE, { emissive: ORANGE, emissiveIntensity: 1.1 }),
  );
  visor.position.set(0, 1.04, 0.16);
  g.add(visor);
  addHpBar(g, 1.32, 0.9);
  return g;
}

function makeSwarmFigure(): THREE.Group {
  const g = new THREE.Group();
  const shard = mat(ORANGE, { emissive: ORANGE, emissiveIntensity: 0.55, roughness: 0.4 });
  const offsets: [number, number, number][] = [
    [0, 0.32, 0],
    [-0.22, 0.22, 0.1],
    [0.2, 0.18, -0.08],
  ];
  for (const [x, y, z] of offsets) {
    const bit = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), shard);
    bit.position.set(x, y, z);
    g.add(bit);
  }
  addHpBar(g, 0.62, 0.5);
  return g;
}

function makeWardenFigure(): THREE.Group {
  const g = new THREE.Group();
  const steel = mat(0x6a7080, { metalness: 0.62, roughness: 0.38 });
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.7, 6), steel);
  torso.position.y = 0.55;
  g.add(torso);
  const shield = new THREE.Mesh(
    new THREE.BoxGeometry(0.12, 0.7, 0.55),
    mat(0x2ee6c5, { emissive: TEAL, emissiveIntensity: 0.35, metalness: 0.5 }),
  );
  shield.position.set(-0.42, 0.55, 0.08);
  g.add(shield);
  const helm = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), steel);
  helm.position.y = 1.05;
  g.add(helm);
  const crest = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.28, 0.18),
    mat(TEAL, { emissive: TEAL, emissiveIntensity: 0.8 }),
  );
  crest.position.y = 1.28;
  g.add(crest);
  addHpBar(g, 1.48, 0.85);
  return g;
}

function makeShadeFigure(): THREE.Group {
  const g = new THREE.Group();
  const veil = mat(0x3a2a88, {
    transparent: true,
    opacity: 0.78,
    emissive: 0x4a3cff,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const body = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.05, 7), veil);
  body.position.y = 0.55;
  g.add(body);
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    mat(0xd8fff6, { emissive: 0xffffff, emissiveIntensity: 1.2 }),
  );
  core.position.y = 0.78;
  g.add(core);
  addHpBar(g, 1.22, 0.6);
  return g;
}

function makeColossusFigure(): THREE.Group {
  const g = new THREE.Group();
  const stone = mat(0x3a2a22, { roughness: 0.9, flatShading: true });
  const magma = mat(ORANGE, { emissive: ORANGE, emissiveIntensity: 0.95 });
  const hips = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.55), stone);
  hips.position.y = 0.45;
  g.add(hips);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.85, 0.6), stone);
  torso.position.y = 1.05;
  g.add(torso);
  const crack = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.08), magma);
  crack.position.set(0.08, 1.05, 0.32);
  g.add(crack);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.42), stone);
  head.position.y = 1.68;
  g.add(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.06), magma);
  eye.position.set(0, 1.7, 0.22);
  g.add(eye);
  for (const x of [-0.38, 0.38]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.85, 0.28), stone);
    arm.position.set(x, 0.85, 0);
    g.add(arm);
  }
  addHpBar(g, 2.05, 1.2);
  return g;
}

function makeOverlordFigure(): THREE.Group {
  const g = new THREE.Group();
  const carapace = mat(0x2a0c14, { roughness: 0.55, metalness: 0.35 });
  const fire = mat(0xff3a1a, { emissive: 0xff3a1a, emissiveIntensity: 1.35 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.7, 1.35, 6), carapace);
  body.position.y = 0.95;
  g.add(body);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.7, 6), carapace);
  crown.position.y = 1.95;
  g.add(crown);
  for (let i = 0; i < 4; i += 1) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.55, 5), fire);
    const a = (i / 4) * Math.PI * 2 + 0.4;
    horn.position.set(Math.cos(a) * 0.28, 2.22, Math.sin(a) * 0.28);
    horn.rotation.z = Math.cos(a) * 0.4;
    g.add(horn);
  }
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.22), fire);
  heart.position.set(0, 1.05, 0.38);
  g.add(heart);
  const cape = new THREE.Mesh(
    new THREE.BoxGeometry(0.9, 1.1, 0.08),
    mat(0x14080c, { roughness: 0.85 }),
  );
  cape.position.set(0, 0.85, -0.38);
  g.add(cape);
  addHpBar(g, 2.55, 1.45);
  return g;
}

export function makeEnemy(kind: EnemyKind): THREE.Group {
  let g: THREE.Group;
  if (kind === "runner") g = makeRunnerFigure();
  else if (kind === "brute") g = makeBruteFigure();
  else if (kind === "swarm") g = makeSwarmFigure();
  else if (kind === "warden") g = makeWardenFigure();
  else if (kind === "shade") g = makeShadeFigure();
  else if (kind === "colossus") g = makeColossusFigure();
  else if (kind === "overlord") g = makeOverlordFigure();
  else g = makeCreepFigure();
  g.userData.kind = "enemy";
  return g;
}

function makeLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 80;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 256, 80);
    ctx.font = "800 56px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.strokeStyle = "#140800";
    ctx.lineWidth = 8;
    ctx.strokeText(text, 128, 42);
    ctx.fillStyle = "#ff6a1a";
    ctx.fillText(text, 128, 42);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, depthTest: false }),
  );
  sprite.scale.set(4.4, 1.35, 1);
  sprite.position.y = 4.55;
  sprite.renderOrder = 4;
  return sprite;
}

export function makePortal(label: "IN" | "OUT"): THREE.Group {
  const g = new THREE.Group();
  const stone = mat(0x2b2722, { roughness: 0.92, metalness: 0.08, flatShading: true });
  const pillarGeo = new THREE.BoxGeometry(0.48, 3.35, 0.52);
  const left = new THREE.Mesh(pillarGeo, stone);
  const right = new THREE.Mesh(pillarGeo, stone);
  left.position.set(-1.12, 1.68, 0);
  right.position.set(1.12, 1.68, 0);
  g.add(left, right);

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.38, 0.55), stone);
  lintel.position.y = 3.38;
  g.add(lintel);

  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(1.18, 0.2, 8, 22, Math.PI),
    stone,
  );
  arch.rotation.z = Math.PI;
  arch.position.y = 3.2;
  g.add(arch);

  const flameMat = new THREE.MeshStandardMaterial({
    color: ORANGE,
    emissive: ORANGE,
    emissiveIntensity: 2.4,
    transparent: true,
    opacity: 0.88,
    roughness: 0.28,
  });
  for (let i = 0; i < 4; i += 1) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.55 - i * 0.08, 1.7 - i * 0.18, 8),
      flameMat,
    );
    flame.position.y = 1.05 + i * 0.18;
    flame.scale.set(1.15, 1, 0.38);
    flame.name = "flame";
    g.add(flame);
  }

  const light = new THREE.PointLight(ORANGE, 7.5, 20, 1.5);
  light.position.y = 1.7;
  g.add(light);
  g.add(makeLabelSprite(label));

  g.userData.label = label;
  return g;
}

export function makeJaggedRock(rand: () => number): THREE.Mesh {
  const geo = new THREE.IcosahedronGeometry(0.55 + rand() * 1.15, 0);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i += 1) {
    pos.setXYZ(
      i,
      pos.getX(i) * (0.55 + rand() * 1.15),
      pos.getY(i) * (0.7 + rand() * 1.8),
      pos.getZ(i) * (0.55 + rand() * 1.15),
    );
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color: new THREE.Color().setHSL(0.04, 0.05, 0.05 + rand() * 0.06),
      roughness: 0.97,
      metalness: 0.04,
      flatShading: true,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function makeChevron(color: number): THREE.Mesh {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.22);
  shape.lineTo(0.18, -0.1);
  shape.lineTo(0.08, -0.1);
  shape.lineTo(0.08, -0.22);
  shape.lineTo(-0.08, -0.22);
  shape.lineTo(-0.08, -0.1);
  shape.lineTo(-0.18, -0.1);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: false });
  geo.center();
  const mesh = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.1,
      roughness: 0.35,
      side: THREE.DoubleSide,
    }),
  );
  mesh.userData.kind = "upgrade";
  return mesh;
}

export function parseCssColor(color: string): number {
  const hex = color.trim().replace("#", "");
  const n = Number.parseInt(hex.length === 3 ? hex.replace(/./g, "$&$&") : hex, 16);
  return Number.isFinite(n) ? n : ORANGE;
}
