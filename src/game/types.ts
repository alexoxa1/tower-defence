import type { Enemy } from "./entities/Enemy";
import type { FloatingText } from "./entities/FloatingText";
import type { Particle } from "./entities/Particle";
import type { Projectile } from "./entities/Projectile";
import type { Tower } from "./entities/Tower";

import type { GameSpeed } from "./constants";

export type TowerType = "basic" | "cannon" | "sniper";

export type InteractionMode = "scout" | "build" | "tower" | "multi";

export interface Point {
  x: number;
  y: number;
}

export interface TowerStats {
  label: string;
  icon: string;
  cost: number;
  range: number;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  splash: number;
  color: string;
  bulletColor: string;
}

export interface DragState {
  active: boolean;
  anchorTowerId: string | null;
  originPositions: Map<string, Point>;
  currentPoint: Point | null;
}

export interface PlacementPreview {
  visible: boolean;
  ok: boolean;
  reason: string;
  range: number;
  x: number;
  y: number;
  type: TowerType | null;
}

export type EnemyKind =
  | "creep"
  | "runner"
  | "brute"
  | "swarm"
  | "warden"
  | "shade"
  | "colossus"
  | "overlord";

export interface GameState {
  gold: number;
  lives: number;
  wave: number;
  score: number;
  kills: number;
  selectedBuildType: TowerType | null;
  selectedTowerIds: Set<string>;
  hoveredPoint: Point | null;
  enemies: Enemy[];
  towers: Tower[];
  projectiles: Projectile[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  waveActive: boolean;
  lastRewardedWave: number;
  enemiesLeftToSpawn: number;
  spawnTimer: number;
  spawnGap: number;
  paused: boolean;
  speed: GameSpeed;
  gameOver: boolean;
  drag: DragState;
  elapsed: number;
  shake: { time: number; mag: number };
  combo: number;
  comboTimer: number;
  nextTowerId: number;
  interactionMode: InteractionMode;
  placementPreview: PlacementPreview;
}

export interface TowerSummary {
  id: string;
  type: TowerType;
  level: number;
  x: number;
  y: number;
  damage: number;
  range: number;
  fireRate: number;
  upgradeCost: number;
  canUpgrade: boolean;
  atMaxLevel: boolean;
  refund: number;
  spent: number;
}

export interface UiSnapshot {
  gold: number;
  lives: number;
  wave: number;
  score: number;
  kills: number;
  paused: boolean;
  speed: GameSpeed;
  gameOver: boolean;
  selectedBuildType: TowerType | null;
  selectedTowers: TowerSummary[];
  waveName: string;
  waveActive: boolean;
  enemiesCount: number;
  enemiesLeftToSpawn: number;
  toast: string | null;
  isDragging: boolean;
  isPanning: boolean;
  combo: number;
  muted: boolean;
  interactionMode: InteractionMode;
  canStartWave: boolean;
  canAffordBuild: Record<TowerType, boolean>;
  campaignWaves: number;
  maxTowerLevel: number;
}

export interface PlacementResult {
  ok: boolean;
  reason: string;
}

export interface UpgradeResult {
  upgraded: number;
  skipped: number;
  totalCost: number;
}
