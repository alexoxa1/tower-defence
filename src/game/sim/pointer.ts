import { RELOCATE_THRESHOLD } from "../constants";
import type { WatchPorts } from "./ports";
import { idleDrag, proposedRelocatePositions } from "./drag";
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

export { idleDrag, dragOffset, proposedRelocatePositions } from "./drag";

export function cancelDrag(state: GameState): void {
  state.drag = idleDrag();
}

function captureOrigins(state: GameState, anchorId: string): Map<string, Point> {
  const ids = state.selectedTowerIds.has(anchorId)
    ? [...state.selectedTowerIds]
    : [anchorId];
  const originPositions = new Map<string, Point>();
  for (const id of ids) {
    const tower = state.towers.find((item) => item.id === id);
    if (tower) originPositions.set(id, { x: tower.x, y: tower.y });
  }
  return originPositions;
}

function armPending(state: GameState, anchorId: string, pressPoint: Point): void {
  state.drag = {
    kind: "pending",
    pressPoint,
    anchorTowerId: anchorId,
    originPositions: captureOrigins(state, anchorId),
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
      cancelDrag(state);
      refreshPreview(state);
      return;
    }

    state.selectedTowerIds = new Set([clickedTower.id]);
    if (options.button === 0) {
      armPending(state, clickedTower.id, point);
    } else {
      cancelDrag(state);
    }
    refreshPreview(state);
    return;
  }

  if (options.button !== 0) return;

  state.selectedTowerIds = new Set();
  cancelDrag(state);
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

  if (state.drag.kind === "pending") {
    const dx = point.x - state.drag.pressPoint.x;
    const dy = point.y - state.drag.pressPoint.y;
    if (Math.hypot(dx, dy) > RELOCATE_THRESHOLD) {
      state.drag = {
        kind: "relocating",
        pressPoint: state.drag.pressPoint,
        anchorTowerId: state.drag.anchorTowerId,
        originPositions: state.drag.originPositions,
        currentPoint: point,
      };
    }
  } else if (state.drag.kind === "relocating") {
    state.drag = { ...state.drag, currentPoint: point };
  }
  refreshPreview(state);
}

export function pointerUp(
  state: GameState,
  point: Point,
  ports: WatchPorts,
): void {
  if (state.drag.kind !== "relocating") {
    cancelDrag(state);
    refreshPreview(state);
    return;
  }

  const drag = { ...state.drag, currentPoint: point };
  const newPositions = proposedRelocatePositions(drag);
  const validation = validateTowerMove(state, newPositions);
  if (validation.ok) {
    moveTowers(state, newPositions, ports);
  } else {
    ports.notify(validation.reason);
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
