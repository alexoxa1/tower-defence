import { resolveEscape } from "../systems/combat";
import { checkWaveCleared, updateWaveSpawner } from "../systems/waves";
import { tickFx, tickPresentation } from "../systems/fx";
import { refreshPreview } from "./preview";
import type { WatchPorts } from "./ports";
import type { GameState } from "../types";

export function advanceWatch(
  state: GameState,
  dt: number,
  ports: WatchPorts,
  options?: { frozen?: boolean },
): void {
  if (options?.frozen || state.gameOver) {
    tickPresentation(state, dt);
    refreshPreview(state);
    return;
  }

  state.elapsed += dt;
  tickFx(state, dt);
  updateWaveSpawner(dt, state);

  for (const enemy of state.enemies) {
    if (enemy.update(dt)) resolveEscape(state, enemy, ports);
  }
  for (const tower of state.towers) tower.update(dt, state, ports);
  for (const projectile of state.projectiles) projectile.update(dt, state, ports);
  for (const text of state.floatingTexts) text.update(dt);
  for (const particle of state.particles) particle.update(dt);

  state.enemies = state.enemies.filter((e) => e.alive);
  state.projectiles = state.projectiles.filter((p) => p.active);
  state.floatingTexts = state.floatingTexts.filter((t) => t.life > 0);
  state.particles = state.particles.filter((p) => p.life > 0);

  for (const id of [...state.selectedTowerIds]) {
    if (!state.towers.some((t) => t.id === id)) {
      state.selectedTowerIds.delete(id);
    }
  }

  checkWaveCleared(state, ports);
  refreshPreview(state);
}
