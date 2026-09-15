import type { WatchPorts } from "./ports";
import { refreshPreview } from "./preview";
import {
  buildTower,
  findTowerAt,
  moveTowers,
  validateTowerMove,
} from "../systems/placement";
import type { GameState, Point } from "../types";

export interface PointerOptions {
  button: number;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
}

export function cancelDrag(state: GameState): void {
  state.drag = {
    active: false,
    anchorTowerId: null,
    originPositions: new Map(),
    currentPoint: null,
  };
}

function startDrag(state: GameState, anchorId: string, point: Point): void {
  const ids = state.selectedTowerIds.has(anchorId)
    ? [...state.selectedTowerIds]
    : [anchorId];

  const originPositions = new Map<string, Point>();
  for (const id of ids) {
    const tower = state.towers.find((t) => t.id === id);
    if (tower) originPositions.set(id, { x: tower.x, y: tower.y });
  }

  state.drag = {
    active: true,
    anchorTowerId: anchorId,
    originPositions,
    currentPoint: point,
  };
}

export function pointerDown(
  state: GameState,
  point: Point,
  options: PointerOptions,
  ports: WatchPorts,
): void {
  if (state.gameOver) return;

  const isMultiToggle =
    options.button === 2 || options.ctrlKey || options.metaKey;

  const clickedTower = findTowerAt(state, point);

  if (clickedTower) {
    if (isMultiToggle) {
      const next = new Set(state.selectedTowerIds);
      if (next.has(clickedTower.id)) next.delete(clickedTower.id);
      else next.add(clickedTower.id);
      state.selectedTowerIds = next;
      refreshPreview(state);
      return;
    }

    state.selectedTowerIds = new Set([clickedTower.id]);

    if (options.button === 0) {
      startDrag(state, clickedTower.id, point);
    }
    refreshPreview(state);
    return;
  }

  if (options.button !== 0) return;

  state.selectedTowerIds = new Set();
  if (!state.selectedBuildType) {
    refreshPreview(state);
    return;
  }
  buildTower(state, point, ports);
  refreshPreview(state);
}

export function pointerMove(state: GameState, point: Point): void {
  if (point.x < -100 && point.y < -100) {
    state.hoveredPoint = null;
  } else {
    state.hoveredPoint = point;
  }

  if (state.drag.active) {
    state.drag.currentPoint = point;
  }
  refreshPreview(state);
}

export function pointerUp(
  state: GameState,
  point: Point,
  ports: WatchPorts,
  wasDragging: boolean,
): void {
  if (!wasDragging || !state.drag.active) {
    cancelDrag(state);
    refreshPreview(state);
    return;
  }

  const { drag } = state;
  const anchorOrigin = drag.anchorTowerId
    ? drag.originPositions.get(drag.anchorTowerId)
    : null;

  if (anchorOrigin && drag.anchorTowerId) {
    const dx = point.x - anchorOrigin.x;
    const dy = point.y - anchorOrigin.y;

    if (Math.hypot(dx, dy) > 4) {
      const newPositions = new Map<string, Point>();
      for (const [id, origin] of drag.originPositions) {
        newPositions.set(id, { x: origin.x + dx, y: origin.y + dy });
      }

      const validation = validateTowerMove(state, newPositions);
      if (validation.ok) {
        moveTowers(state, newPositions, ports);
      } else {
        ports.notify(validation.reason);
      }
    }
  }

  cancelDrag(state);
  refreshPreview(state);
}

export function clearBoardSelection(state: GameState): void {
  cancelDrag(state);
  state.selectedTowerIds = new Set();
  state.selectedBuildType = null;
  refreshPreview(state);
}
