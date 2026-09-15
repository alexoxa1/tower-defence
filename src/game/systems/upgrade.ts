import { MAX_TOWER_LEVEL, TOWER_TYPES } from "../constants";
import {
  canUpgradeTower,
  getTowerStats,
  getUpgradeCost,
} from "../config/towerStats";
import type { Tower } from "../entities/Tower";
import type { GameState, UpgradeResult } from "../types";
import type { WatchPorts } from "../sim/ports";
import { addFloatingText } from "./fx";
import { money } from "../utils/format";

export { getTowerStats, getUpgradeCost, canUpgradeTower };

export function getBulkUpgradeCost(state: GameState, ids: string[]): number {
  let total = 0;
  for (const id of ids) {
    const tower = state.towers.find((t) => t.id === id);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) continue;
    total += getUpgradeCost(tower);
  }
  return total;
}

function applyUpgrade(
  state: GameState,
  tower: Tower,
): { ok: boolean; message: string; cost?: number } {
  if (tower.level >= MAX_TOWER_LEVEL) {
    return { ok: false, message: "This tower is already max level." };
  }

  const cost = getUpgradeCost(tower);
  if (state.gold < cost) {
    return {
      ok: false,
      message: `Need ${money(cost - state.gold)} more gold for upgrade.`,
    };
  }

  state.gold -= cost;
  tower.spent += cost;
  tower.level += 1;
  addFloatingText(state, "UPGRADE", tower.x, tower.y - 28, "#d8f5a2");
  return {
    ok: true,
    message: `${TOWER_TYPES[tower.type].label} upgraded to level ${tower.level}.`,
    cost,
  };
}

export function upgradeTower(
  state: GameState,
  towerId: string,
  ports: WatchPorts,
): { ok: boolean } {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) {
    ports.notify("Tower not found.");
    return { ok: false };
  }

  const result = applyUpgrade(state, tower);
  if (result.ok) {
    ports.play("upgrade");
  }
  if (result.message) ports.notify(result.message);
  return { ok: result.ok };
}

export function upgradeTowers(
  state: GameState,
  ids: string[],
  ports: WatchPorts,
): UpgradeResult {
  let upgraded = 0;
  let skipped = 0;
  let totalCost = 0;

  for (const id of ids) {
    const tower = state.towers.find((t) => t.id === id);
    if (!tower || tower.level >= MAX_TOWER_LEVEL) {
      skipped += 1;
      continue;
    }
    const cost = getUpgradeCost(tower);
    if (state.gold < cost) {
      skipped += 1;
      continue;
    }
    const result = applyUpgrade(state, tower);
    if (result.ok) {
      upgraded += 1;
      totalCost += result.cost ?? 0;
    } else {
      skipped += 1;
    }
  }

  const message =
    upgraded > 0
      ? `Upgraded ${upgraded} tower${upgraded > 1 ? "s" : ""} for ${money(totalCost)}.`
      : "Could not upgrade selected towers.";

  if (upgraded > 0) {
    ports.play("upgrade");
  }
  ports.notify(message);
  return { upgraded, skipped, totalCost };
}

export function sellTower(
  state: GameState,
  towerId: string,
  ports: WatchPorts,
): { ok: boolean; refund: number } {
  const tower = state.towers.find((t) => t.id === towerId);
  if (!tower) {
    ports.notify("Tower not found.");
    return { ok: false, refund: 0 };
  }

  const refund = Math.round(tower.spent * 0.65);
  state.gold += refund;
  state.towers = state.towers.filter((t) => t.id !== towerId);
  state.selectedTowerIds.delete(towerId);
  addFloatingText(state, `+${refund}`, tower.x, tower.y - 22, "#69db7c");
  ports.play("sell");
  ports.notify(`Tower sold for ${money(refund)}.`);
  return { ok: true, refund };
}

export function sellTowers(
  state: GameState,
  ids: string[],
  ports: WatchPorts,
): { totalRefund: number } {
  let totalRefund = 0;
  let sold = 0;
  for (const id of [...ids]) {
    const tower = state.towers.find((t) => t.id === id);
    if (!tower) continue;
    const refund = Math.round(tower.spent * 0.65);
    state.gold += refund;
    state.towers = state.towers.filter((t) => t.id !== id);
    state.selectedTowerIds.delete(id);
    addFloatingText(state, `+${refund}`, tower.x, tower.y - 22, "#69db7c");
    totalRefund += refund;
    sold += 1;
  }
  if (sold > 0) ports.play("sell");
  ports.notify(
    sold > 0
      ? `Sold ${sold} tower${sold > 1 ? "s" : ""} for ${money(totalRefund)}.`
      : "Nothing to sell.",
  );
  return { totalRefund };
}

export function towerToSummary(tower: Tower, gold: number) {
  const stats = getTowerStats(tower.type, tower.level);
  const upgradeCost = getUpgradeCost(tower);
  return {
    id: tower.id,
    type: tower.type,
    level: tower.level,
    x: tower.x,
    y: tower.y,
    damage: stats.damage,
    range: stats.range,
    fireRate: stats.fireRate,
    upgradeCost,
    canUpgrade: canUpgradeTower(tower, gold),
    atMaxLevel: tower.level >= MAX_TOWER_LEVEL,
    refund: Math.round(tower.spent * 0.65),
    spent: tower.spent,
  };
}
