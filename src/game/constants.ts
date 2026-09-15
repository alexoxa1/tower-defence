import type { TowerType } from "./types";

export const LOGICAL_WIDTH = 1400;
export const LOGICAL_HEIGHT = 1000;
export const CAMPAIGN_WAVES = 15;
export const MAX_TOWER_LEVEL = 10;
export const STARTING_GOLD = 500;
export const STARTING_LIVES = 20;
export const SPEED_OPTIONS = [1, 2, 3, 4, 5] as const;
export type GameSpeed = (typeof SPEED_OPTIONS)[number];

export const PATH = [
  { x: -40, y: 200 },
  { x: 340, y: 200 },
  { x: 340, y: 560 },
  { x: 640, y: 560 },
  { x: 640, y: 300 },
  { x: 980, y: 300 },
  { x: 980, y: 760 },
  { x: 1280, y: 760 },
  { x: 1280, y: 440 },
  { x: 1440, y: 440 },
] as const;

export const TOWER_TYPES: Record<
  TowerType,
  {
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
> = {
  basic: {
    label: "Hex Gun",
    icon: "HEX",
    cost: 100,
    range: 130,
    fireRate: 1.85,
    damage: 18,
    projectileSpeed: 410,
    splash: 0,
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
    color: "#d8fff6",
    bulletColor: "#f4fff8",
  },
};
