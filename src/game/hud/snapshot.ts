import { CAMPAIGN_WAVES, MAX_TOWER_LEVEL, TOWER_TYPES } from "../constants";
import { ARMORY_ORDER } from "../config/armory";
import { layoutSummaries } from "../config/layouts";
import { getWavePlan, getWaveTitle } from "../config/waves";
import { towerToSummary } from "../systems/upgrade";
import { canStartWave } from "../systems/waves";
import { refreshPreview } from "../sim/preview";
import type {
  GameState,
  QuickMenuAnchor,
  QuickMenuSnapshot,
  TowerType,
  UiSnapshot,
  WatchPhase,
} from "../types";

export function deriveWatchPhase(state: GameState): WatchPhase {
  if (state.gameOver) return "rift-broken";
  if (state.campaignComplete) return "campaign-complete";
  if (state.paused) return "paused";
  if (state.waveActive && state.enemiesLeftToSpawn > 0) {
    return "wave-arrivals";
  }
  if (state.waveActive) return "wave-resolution";
  if (state.wave === 0) return "hold";
  return "inter-wave";
}

export function canAffordBuild(state: GameState): Record<TowerType, boolean> {
  const result = {} as Record<TowerType, boolean>;
  for (const type of ARMORY_ORDER) {
    result[type] = state.gold >= TOWER_TYPES[type].cost;
  }
  return result;
}

function resolveQuickMenu(
  state: GameState,
  anchor: QuickMenuAnchor | null | undefined,
): QuickMenuSnapshot | null {
  if (!anchor) return null;
  const target = anchor.target;
  if (target.kind === "ground") {
    return { x: anchor.x, y: anchor.y, target };
  }
  const tower = state.towers.find((item) => item.id === target.towerId);
  if (!tower) return null;
  return {
    x: anchor.x,
    y: anchor.y,
    target: {
      kind: "tower",
      towerId: tower.id,
      tower: towerToSummary(tower, state.gold, state),
    },
  };
}

export function buildUiSnapshot(
  state: GameState,
  extras: {
    toast: string | null;
    muted: boolean;
    isPanning: boolean;
    reducedMotion: boolean;
    quickMenu?: QuickMenuAnchor | null;
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
    campaignComplete: state.campaignComplete,
    phase: deriveWatchPhase(state),
    selectedBuildType: state.selectedBuildType,
    selectedTowers,
    waveName: getWaveTitle(state.wave),
    nextWaveName:
      state.wave < CAMPAIGN_WAVES
        ? getWavePlan(state.wave + 1).name
        : null,
    waveActive: state.waveActive,
    enemiesCount: state.enemies.length,
    enemiesLeftToSpawn: state.enemiesLeftToSpawn,
    lastEscape: state.lastEscape ? { ...state.lastEscape } : null,
    lastClearBonus: state.lastClearBonus,
    placementFeedback: {
      visible: state.placementPreview.visible,
      ok: state.placementPreview.ok,
      reason: state.placementPreview.reason,
    },
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
    quickMenu: resolveQuickMenu(state, extras.quickMenu),
  };
}
