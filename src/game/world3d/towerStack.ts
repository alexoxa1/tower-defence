import type { TowerType } from "../types";

export interface TowerStack {
  /** Kit part names from the ground up. */
  base: string[];
  /** Yaw-able weapon part placed on top of the base, or null for aura Towers. */
  weapon: string | null;
  /** Static crown placed on top of the base (Ward Beacon crystals, Frost Lantern roof). */
  crown: string | null;
}

interface Kit {
  bottom: string;
  middle: string;
  top: string;
  weapon: string | null;
  crown: string | null;
}

const KITS: Record<TowerType, Kit> = {
  basic: {
    bottom: "tower-round-bottom-a",
    middle: "tower-round-middle-a",
    top: "tower-round-top-a",
    weapon: "weapon-turret",
    crown: null,
  },
  cannon: {
    bottom: "tower-square-bottom-b",
    middle: "tower-square-middle-a",
    top: "tower-square-top-b",
    weapon: "weapon-cannon",
    crown: null,
  },
  sniper: {
    bottom: "tower-square-bottom-a",
    middle: "tower-square-middle-b",
    top: "tower-square-top-a",
    weapon: "weapon-ballista",
    crown: null,
  },
  beacon: {
    bottom: "tower-round-bottom-c",
    middle: "tower-round-middle-c",
    top: "tower-round-top-b",
    weapon: null,
    crown: "tower-round-crystals",
  },
  lantern: {
    bottom: "tower-round-bottom-b",
    middle: "tower-round-middle-b",
    top: "tower-round-top-c",
    weapon: null,
    crown: "tower-round-roof-c",
  },
};

/** Level 1-10 grows through four tiers: 1-2, 3-5, 6-8, 9-10. */
export function towerTier(level: number): 0 | 1 | 2 | 3 {
  if (level <= 2) return 0;
  if (level <= 5) return 1;
  if (level <= 8) return 2;
  return 3;
}

export function towerStack(type: TowerType, level: number): TowerStack {
  const kit = KITS[type];
  const tier = towerTier(level);
  const base = [kit.bottom];
  if (tier >= 1) base.push(kit.middle);
  if (tier >= 3) base.push(kit.middle);
  if (tier >= 2) base.push(kit.top);
  return { base, weapon: kit.weapon, crown: kit.crown };
}
