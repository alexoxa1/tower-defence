import { Enemy } from "../entities/Enemy";
import { getWavePlan } from "../config/waves";
import type { GameState } from "../types";
import type { WatchPorts } from "../sim/ports";
import { money } from "../utils/format";

export function canStartWave(state: GameState): boolean {
  return !state.gameOver && !state.waveActive && state.enemies.length === 0;
}

export function startWave(
  state: GameState,
  ports: WatchPorts,
): { ok: boolean } {
  if (state.gameOver) return { ok: false };
  if (!canStartWave(state)) {
    ports.notify("Clear the current wave first.");
    return { ok: false };
  }

  state.wave += 1;
  const plan = getWavePlan(state.wave);
  state.waveActive = true;
  state.enemiesLeftToSpawn = plan.count + (plan.boss ? 1 : 0);
  state.spawnGap = plan.gap;
  state.spawnTimer = 0;
  ports.play("wave");
  const bossNote = plan.boss ? " Boss incoming." : "";
  ports.notify(`${plan.name} · Wave ${state.wave}.${bossNote}`);
  return { ok: true };
}

export function updateWaveSpawner(dt: number, state: GameState): void {
  if (!state.waveActive) return;
  const plan = getWavePlan(state.wave);

  state.spawnTimer -= dt;
  while (state.spawnTimer <= 0 && state.enemiesLeftToSpawn > 0) {
    const remaining = state.enemiesLeftToSpawn;
    const spawnBoss = Boolean(plan.boss) && remaining === 1;
    const kind = spawnBoss
      ? plan.boss!
      : plan.roster[(plan.count - remaining) % plan.roster.length];
    state.enemies.push(new Enemy(state.wave, kind, state.road));
    if (kind === "swarm" && state.enemiesLeftToSpawn > (plan.boss ? 2 : 1)) {
      state.enemies.push(new Enemy(state.wave, "swarm", state.road));
      state.enemiesLeftToSpawn -= 1;
    }
    state.enemiesLeftToSpawn -= 1;
    state.spawnTimer += spawnBoss ? plan.gap * 1.8 : plan.gap;
  }
}

export function checkWaveCleared(state: GameState, ports: WatchPorts): void {
  if (state.gameOver || !state.waveActive) return;
  if (state.enemies.length > 0 || state.enemiesLeftToSpawn > 0) return;

  state.waveActive = false;
  if (state.lastRewardedWave === state.wave) return;

  state.lastRewardedWave = state.wave;
  const plan = getWavePlan(state.wave);
  const bonus = 35 + state.wave * 7 + (plan.boss ? 80 : 0);
  state.gold += bonus;
  state.score += bonus * 4;
  ports.play("clear");
  ports.notify(`${plan.name} cleared. Bonus ${money(bonus)}.`);
}
