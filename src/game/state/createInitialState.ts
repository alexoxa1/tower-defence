import { STARTING_GOLD, STARTING_LIVES } from "../constants";
import type { GameState } from "../types";

export function createInitialState(options?: {
  startingGold?: number;
}): GameState {
  return {
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
    drag: {
      active: false,
      anchorTowerId: null,
      originPositions: new Map(),
      currentPoint: null,
    },
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
  options?: { startingGold?: number },
): void {
  const fresh = createInitialState(options);
  Object.assign(state, fresh);
  state.selectedTowerIds = new Set();
  state.drag = {
    active: false,
    anchorTowerId: null,
    originPositions: new Map(),
    currentPoint: null,
  };
}
