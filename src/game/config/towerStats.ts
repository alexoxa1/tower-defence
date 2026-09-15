import { MAX_TOWER_LEVEL, TOWER_TYPES } from "../constants";
import type { TowerType } from "../types";
import type { Tower } from "../entities/Tower";

export function getTowerStats(type: TowerType, level = 1) {
  const base = TOWER_TYPES[type];
  const levelBonus = level - 1;
  return {
    ...base,
    range: Math.round(base.range * (1 + levelBonus * 0.08)),
    damage: Math.round(base.damage * (1 + levelBonus * 0.38)),
    fireRate: +(base.fireRate * (1 + levelBonus * 0.08)).toFixed(2),
  };
}

export function getUpgradeCost(tower: Tower): number {
  const base = TOWER_TYPES[tower.type].cost;
  return Math.round(base * 0.78 * tower.level);
}

export function canUpgradeTower(tower: Tower, gold: number): boolean {
  return tower.level < MAX_TOWER_LEVEL && gold >= getUpgradeCost(tower);
}
