import type { LayoutId, TowerType } from "./types";
import { DEFAULT_LAYOUT_ID, getLayout } from "./config/layouts";

export const LOGICAL_WIDTH = 1400;
export const LOGICAL_HEIGHT = 1000;
export const CAMPAIGN_WAVES = 20;
export const MAX_TOWER_LEVEL = 10;
export const STARTING_GOLD = 500;
export const STARTING_LIVES = 20;
export const SPEED_OPTIONS = [1, 2, 3, 4, 5] as const;
export type GameSpeed = (typeof SPEED_OPTIONS)[number];

/** Logical travel before a press on a tower becomes a relocate. */
export const RELOCATE_THRESHOLD = 16;

/** Relocate travel on touch/pen. Finger jitter is larger than a mouse nudge. */
export const RELOCATE_THRESHOLD_COARSE = 48;

/** @deprecated Use getLayout(id).road or GameState.road. Kept as the Serpentine Road. */
export const PATH = getLayout(DEFAULT_LAYOUT_ID).road;

export { DEFAULT_LAYOUT_ID };
export type { LayoutId };

const ZERO_AURA = {
  slowDuration: 0,
  auraRadius: 0,
  auraRangeBonus: 0,
  auraSlowFactor: 1,
  auraSlowDuration: 0,
};

export const TOWER_TYPES: Record<TowerType, {
  label: string;
  icon: string;
  cost: number;
  range: number;
  fireRate: number;
  damage: number;
  projectileSpeed: number;
  splash: number;
  slowDuration: number;
  auraRadius: number;
  auraRangeBonus: number;
  auraSlowFactor: number;
  auraSlowDuration: number;
  color: string;
  bulletColor: string;
}> = {
  basic: {
    label: "Hex Gun",
    icon: "HEX",
    cost: 100,
    range: 130,
    fireRate: 1.85,
    damage: 18,
    projectileSpeed: 410,
    splash: 0,
    ...ZERO_AURA,
    color: "#ff6a1a",
    bulletColor: "#ffd2a0",
  },
  cannon: {
    label: "Mortar Post",
    icon: "MTR",
    cost: 210,
    range: 165,
    fireRate: 0.78,
    damage: 50,
    projectileSpeed: 310,
    splash: 46,
    ...ZERO_AURA,
    color: "#2ee6c5",
    bulletColor: "#b8fff0",
  },
  sniper: {
    label: "Rail Sniper",
    icon: "RAIL",
    cost: 280,
    range: 235,
    fireRate: 0.56,
    damage: 105,
    projectileSpeed: 560,
    splash: 0,
    ...ZERO_AURA,
    slowDuration: 1.4,
    color: "#d8fff6",
    bulletColor: "#f4fff8",
  },
  beacon: {
    label: "Ward Beacon",
    icon: "WARD",
    cost: 180,
    range: 150,
    fireRate: 0,
    damage: 0,
    projectileSpeed: 0,
    splash: 0,
    ...ZERO_AURA,
    auraRadius: 150,
    auraRangeBonus: 28,
    color: "#e8a54b",
    bulletColor: "#ffe0a0",
  },
  lantern: {
    label: "Frost Lantern",
    icon: "FROST",
    cost: 160,
    range: 125,
    fireRate: 0,
    damage: 0,
    projectileSpeed: 0,
    splash: 0,
    ...ZERO_AURA,
    auraRadius: 125,
    auraSlowFactor: 0.55,
    auraSlowDuration: 0.45,
    color: "#7dcea0",
    bulletColor: "#c8ffe0",
  },
};
