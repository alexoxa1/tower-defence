import {
  LOGICAL_HEIGHT,
  LOGICAL_WIDTH,
  TOWER_TYPES,
} from "../constants";
import { PATH } from "../constants";
import { Tower } from "../entities/Tower";
import { addFloatingText } from "./fx";
import type { WatchPorts } from "../sim/ports";
import type {
  GameState,
  PlacementResult,
  Point,
  TowerType,
} from "../types";
import { money } from "../utils/format";
import { distance, pointToSegmentDistance } from "../utils/geometry";

function isPointOnPath(point: Point, extraPadding = 10): boolean {
  const pathRadius = 27 + extraPadding;
  for (let i = 0; i < PATH.length - 1; i += 1) {
    if (pointToSegmentDistance(point, PATH[i], PATH[i + 1]) <= pathRadius) {
      return true;
    }
  }
  return false;
}

export function nextTowerId(state: GameState): string {
  state.nextTowerId += 1;
  return `tower-${state.nextTowerId}`;
}

export function validatePlacement(
  state: GameState,
  point: Point,
  type: TowerType,
  options?: { ignoreTowerIds?: Set<string>; skipGoldCheck?: boolean },
): PlacementResult {
  const config = TOWER_TYPES[type];
  const ignoreIds = options?.ignoreTowerIds ?? new Set<string>();

  if (
    point.x < 24 ||
    point.y < 24 ||
    point.x > LOGICAL_WIDTH - 24 ||
    point.y > LOGICAL_HEIGHT - 24
  ) {
    return { ok: false, reason: "Build inside the map." };
  }

  if (!options?.skipGoldCheck && state.gold < config.cost) {
    return {
      ok: false,
      reason: `Need ${money(config.cost - state.gold)} more gold.`,
    };
  }

  if (isPointOnPath(point, 12)) {
    return { ok: false, reason: "Cannot build on the road." };
  }

  for (const tower of state.towers) {
    if (ignoreIds.has(tower.id)) continue;
    if (distance(point, tower) < tower.radius + 26) {
      return { ok: false, reason: "Too close to another tower." };
    }
  }

  return { ok: true, reason: "" };
}

export function findTowerAt(state: GameState, point: Point): Tower | null {
  return (
    state.towers.find((tower) => distance(point, tower) <= tower.radius + 6) ??
    null
  );
}

export function buildTower(
  state: GameState,
  point: Point,
  ports: WatchPorts,
): { ok: boolean } {
  if (!state.selectedBuildType) {
    ports.notify("Select a battery in the Armory, or drag to pan.");
    return { ok: false };
  }
  const validation = validatePlacement(state, point, state.selectedBuildType);
  if (!validation.ok) {
    ports.notify(validation.reason);
    return { ok: false };
  }

  const config = TOWER_TYPES[state.selectedBuildType];
  const tower = new Tower(
    point.x,
    point.y,
    state.selectedBuildType,
    nextTowerId(state),
  );
  state.towers.push(tower);
  state.gold -= config.cost;
  state.selectedTowerIds = new Set([tower.id]);
  addFloatingText(state, `-${config.cost}`, point.x, point.y - 24, "#ffd43b");
  ports.play("build");
  ports.notify(`${config.label} built.`);
  return { ok: true };
}

export function validateTowerMove(
  state: GameState,
  towerPositions: Map<string, Point>,
): PlacementResult {
  for (const [id, point] of towerPositions) {
    const tower = state.towers.find((t) => t.id === id);
    if (!tower) continue;
    const ignoreIds = new Set(towerPositions.keys());
    const result = validatePlacement(state, point, tower.type, {
      ignoreTowerIds: ignoreIds,
      skipGoldCheck: true,
    });
    if (!result.ok) return result;
  }
  return { ok: true, reason: "" };
}

export function moveTowers(
  state: GameState,
  towerPositions: Map<string, Point>,
  ports: WatchPorts,
): { ok: boolean } {
  const validation = validateTowerMove(state, towerPositions);
  if (!validation.ok) {
    ports.notify(validation.reason);
    return { ok: false };
  }

  for (const [id, point] of towerPositions) {
    const tower = state.towers.find((t) => t.id === id);
    if (tower) {
      tower.x = point.x;
      tower.y = point.y;
    }
  }
  ports.notify("Towers moved.");
  return { ok: true };
}
