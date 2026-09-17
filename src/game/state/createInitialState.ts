import { STARTING_GOLD, STARTING_LIVES } from "../constants";
import { DEFAULT_LAYOUT_ID, getLayout } from "../config/layouts";
import { idleDrag } from "../sim/drag";
import type { GameState, LayoutId } from "../types";

export function createInitialState(options?: {
  startingGold?: number;
  layoutId?: LayoutId;
}): GameState {
  const layoutId = options?.layoutId ?? DEFAULT_LAYOUT_ID;
  const layout = getLayout(layoutId);
  return {
    layoutId,
    road: layout.road,
    gold: options?.startingGold ?? STARTING_GOLD,
    lives: STARTING_LIVES,
    wave: 0,
    score: 0,
    kills: 0,
    selectedBuildType: null,
    selectedTowerIds: new Set(),
    hoveredPoint: null,
    enemies: [],
    towers: [],
    projectiles: [],
    floatingTexts: [],
    particles: [],
    waveActive: false,
    lastRewardedWave: 0,
    enemiesLeftToSpawn: 0,
    spawnTimer: 0,
    spawnGap: 0.6,
    paused: false,
    speed: 1,
    gameOver: false,
    campaignComplete: false,
    lastEscape: null,
    lastClearBonus: 0,
    drag: idleDrag(),
    elapsed: 0,
    shake: { time: 0, mag: 0 },
    combo: 0,
    comboTimer: 0,
    nextTowerId: 0,
    interactionMode: "scout",
    placementPreview: {
      visible: false,
      ok: false,
      reason: "",
      range: 0,
      x: 0,
      y: 0,
      type: null,
    },
  };
}

export function resetState(
  state: GameState,
  options?: { startingGold?: number; layoutId?: LayoutId },
): void {
  const layoutId = options?.layoutId ?? state.layoutId;
  const fresh = createInitialState({
    startingGold: options?.startingGold,
    layoutId,
  });
  Object.assign(state, fresh);
  state.selectedTowerIds = new Set();
  state.drag = idleDrag();
  state.road = getLayout(layoutId).road;
}
