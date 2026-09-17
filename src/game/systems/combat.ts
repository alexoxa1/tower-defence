import type { Enemy } from "../entities/Enemy";
import type { GameState } from "../types";
import type { WatchPorts } from "../sim/ports";
import { addExplosion, addFloatingText, addSpark } from "./fx";
import { distanceXY } from "../utils/geometry";

export interface ShotHit {
  x: number;
  y: number;
  damage: number;
  splash: number;
  color: string;
  slowDuration: number;
  target: Enemy;
}

function breakRift(state: GameState, ports: WatchPorts): void {
  if (state.gameOver) return;
  state.gameOver = true;
  state.paused = false;
  ports.play("lose");
}

export function applyDamage(
  state: GameState,
  enemy: Enemy,
  amount: number,
  ports: WatchPorts,
): boolean {
  if (state.gameOver || state.campaignComplete) return false;
  const killed = enemy.takeDamage(amount);
  if (!killed) {
    ports.play("hit");
    return false;
  }

  state.gold += enemy.reward;
  state.combo += 1;
  state.comboTimer = 1.8;
  const comboBonus = Math.min(8, state.combo);
  state.score += enemy.reward * 8 + state.wave * 12 + comboBonus * 6;
  state.kills += 1;
  state.shake = {
    time: 0.12 + Math.min(0.08, state.combo * 0.01),
    mag: 2.2 + Math.min(4, state.combo * 0.35),
  };
  addFloatingText(state, `+${enemy.reward}`, enemy.x, enemy.y - 18, "#7dcea0");
  if (state.combo >= 3) {
    addFloatingText(state, `×${state.combo}`, enemy.x + 16, enemy.y - 34, "#e8a54b");
  }
  addExplosion(state, enemy.x, enemy.y, 24);
  ports.play("kill");
  return true;
}

export function resolveEscape(
  state: GameState,
  enemy: Enemy,
  ports: WatchPorts,
): boolean {
  if (state.gameOver || state.campaignComplete) return true;
  state.lives = Math.max(0, state.lives - enemy.livesCost);
  state.lastEscape = {
    enemyKind: enemy.kind,
    livesCost: enemy.livesCost,
    remainingLives: state.lives,
    wave: state.wave,
  };
  state.shake = { time: enemy.isBoss ? 0.55 : 0.32, mag: enemy.isBoss ? 12 : 7 };
  state.combo = 0;
  state.comboTimer = 0;
  addFloatingText(
    state,
    enemy.isBoss ? `-${enemy.livesCost} lives` : "-1 life",
    enemy.x - 40,
    enemy.y - 20,
    "#ff8787",
  );
  if (state.lives <= 0) {
    breakRift(state, ports);
    return true;
  } else {
    ports.play("life");
    return false;
  }
}

export function resolveProjectileHit(
  state: GameState,
  shot: ShotHit,
  ports: WatchPorts,
): void {
  if (shot.splash > 0) {
    addExplosion(state, shot.x, shot.y, shot.splash);
    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      const d = distanceXY(shot.x, shot.y, enemy.x, enemy.y);
      if (d <= shot.splash) {
        const falloff = 1 - d / shot.splash;
        const damage = Math.round(shot.damage * (0.45 + falloff * 0.55));
        applyDamage(state, enemy, damage, ports);
        if (shot.slowDuration > 0) enemy.applySlow(shot.slowDuration);
      }
    }
    return;
  }

  applyDamage(state, shot.target, shot.damage, ports);
  addSpark(state, shot.x, shot.y, shot.color);
  if (shot.slowDuration > 0) shot.target.applySlow(shot.slowDuration);
}
