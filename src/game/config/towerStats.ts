import { MAX_TOWER_LEVEL, TOWER_TYPES } from "../constants";
import type { GameState, TowerType } from "../types";
import type { Tower } from "../entities/Tower";
import { distance } from "../utils/geometry";

export function getTowerStats(type: TowerType, level = 1) {
  const base = TOWER_TYPES[type];
  const levelBonus = level - 1;
  const scale = 1 + levelBonus * 0.08;
  return {
    ...base,
    range: Math.round(base.range * scale),
    damage: Math.round(base.damage * (1 + levelBonus * 0.38)),
    fireRate: +(base.fireRate * scale).toFixed(2),
    splash: base.splash > 0 ? Math.round(base.splash * scale) : 0,
    auraRadius: base.auraRadius > 0 ? Math.round(base.auraRadius * scale) : 0,
    auraRangeBonus:
      base.auraRangeBonus > 0 ? Math.round(base.auraRangeBonus * scale) : 0,
  };
}

export function getEffectiveStats(state: Pick<GameState, "towers">, tower: Tower) {
  const base = getTowerStats(tower.type, tower.level);
  let range = base.range;
  for (const other of state.towers) {
    if (other.id === tower.id) continue;
    const aura = getTowerStats(other.type, other.level);
    if (aura.auraRangeBonus <= 0) continue;
    if (distance(tower, other) <= aura.auraRadius) {
      range += aura.auraRangeBonus;
    }
  }
  return { ...base, range };
}

export function getUpgradeCost(tower: Tower): number {
  const base = TOWER_TYPES[tower.type].cost;
  return Math.round(base * 0.78 * tower.level);
}

export function canUpgradeTower(tower: Tower, gold: number): boolean {
  return tower.level < MAX_TOWER_LEVEL && gold >= getUpgradeCost(tower);
}
