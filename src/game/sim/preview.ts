import { getTowerStats } from "../config/towerStats";
import { validatePlacement } from "../systems/placement";
import type { GameState, InteractionMode, PlacementPreview, TowerType } from "../types";

export function deriveInteractionMode(state: GameState): InteractionMode {
  if (state.selectedTowerIds.size > 1) return "multi";
  if (state.selectedTowerIds.size === 1) return "tower";
  if (state.selectedBuildType) return "build";
  return "scout";
}

export function emptyPlacementPreview(): PlacementPreview {
  return {
    visible: false,
    ok: false,
    reason: "",
    range: 0,
    x: 0,
    y: 0,
    type: null,
  };
}

export function computePlacementPreview(state: GameState): PlacementPreview {
  const type: TowerType | null = state.selectedBuildType;
  const point = state.hoveredPoint;
  if (
    !type ||
    !point ||
    state.selectedTowerIds.size > 0 ||
    state.gameOver ||
    state.drag.active
  ) {
    return emptyPlacementPreview();
  }

  const validation = validatePlacement(state, point, type);
  const stats = getTowerStats(type, 1);
  return {
    visible: true,
    ok: validation.ok,
    reason: validation.reason,
    range: stats.range,
    x: point.x,
    y: point.y,
    type,
  };
}

export function refreshPreview(state: GameState): void {
  state.interactionMode = deriveInteractionMode(state);
  state.placementPreview = computePlacementPreview(state);
}
