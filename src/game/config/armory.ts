import { TOWER_TYPES } from "../constants";
import type { TowerType } from "../types";

export const ARMORY_ORDER: TowerType[] = [
  "basic",
  "cannon",
  "sniper",
  "beacon",
  "lantern",
];

export const ARMORY: Record<
  TowerType,
  { name: string; blurb: string; swatch: string; cost: number }
> = {
  basic: {
    name: "Hex Gun",
    blurb: "Fast fire · Short range",
    swatch: "#ff6a1a",
    cost: TOWER_TYPES.basic.cost,
  },
  cannon: {
    name: "Mortar Post",
    blurb: "Splash around the impact",
    swatch: "#2ee6c5",
    cost: TOWER_TYPES.cannon.cost,
  },
  sniper: {
    name: "Rail Sniper",
    blurb: "Long range · Applies Slow",
    swatch: "#d8fff6",
    cost: TOWER_TYPES.sniper.cost,
  },
  beacon: {
    name: "Ward Beacon",
    blurb: "Aura · Extra Range nearby",
    swatch: "#e8a54b",
    cost: TOWER_TYPES.beacon.cost,
  },
  lantern: {
    name: "Frost Lantern",
    blurb: "Aura · Slows the Road",
    swatch: "#7dcea0",
    cost: TOWER_TYPES.lantern.cost,
  },
};
