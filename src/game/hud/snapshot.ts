import { CAMPAIGN_WAVES, MAX_TOWER_LEVEL, TOWER_TYPES } from "../constants";
import { ARMORY_ORDER } from "../config/armory";
import { layoutSummaries } from "../config/layouts";
import { getWaveTitle } from "../config/waves";
import { towerToSummary } from "../systems/upgrade";
import { canStartWave } from "../systems/waves";
import { refreshPreview } from "../sim/preview";
import type { GameState, TowerType, UiSnapshot } from "../types";

export function canAffordBuild(state: GameState): Record<TowerType, boolean> {
  const result = {} as Record<TowerType, boolean>;
  for (const type of ARMORY_ORDER) {
    result[type] = state.gold >= TOWER_TYPES[type].cost;
  }
  return result;
}

export function buildUiSnapshot(
  state: GameState,
  extras: {
    toast: string | null;
    muted: boolean;
    isPanning: boolean;
    reducedMotion: boolean;
  },
): UiSnapshot {
  refreshPreview(state);
  const selectedTowers = [...state.selectedTowerIds]
    .map((id) => state.towers.find((t) => t.id === id))
    .filter((t): t is NonNullable<typeof t> => !!t)
    .map((t) => towerToSummary(t, state.gold, state));

  return {
    gold: state.gold,
    lives: state.lives,
    wave: state.wave,
    score: state.score,
    kills: state.kills,
    paused: state.paused,
    speed: state.speed,
    gameOver: state.gameOver,
    selectedBuildType: state.selectedBuildType,
    selectedTowers,
    waveName: getWaveTitle(state.wave),
    waveActive: state.waveActive,
    enemiesCount: state.enemies.length,
    enemiesLeftToSpawn: state.enemiesLeftToSpawn,
    toast: extras.toast,
    isDragging: state.drag.kind === "relocating",
    isPanning: extras.isPanning,
    combo: state.combo,
    muted: extras.muted,
    interactionMode: state.interactionMode,
    canStartWave: canStartWave(state),
    canAffordBuild: canAffordBuild(state),
    campaignWaves: CAMPAIGN_WAVES,
    maxTowerLevel: MAX_TOWER_LEVEL,
    layoutId: state.layoutId,
    layouts: layoutSummaries(),
    reducedMotion: extras.reducedMotion,
    towerCount: state.towers.length,
  };
}
