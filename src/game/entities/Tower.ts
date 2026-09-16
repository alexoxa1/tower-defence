import { TOWER_TYPES } from "../constants";
import { getEffectiveStats, getTowerStats } from "../config/towerStats";
import type { GameState, TowerType } from "../types";
import type { WatchPorts } from "../sim/ports";
import { distance } from "../utils/geometry";
import { Projectile } from "./Projectile";

export class Tower {
  id: string;
  x: number;
  y: number;
  type: TowerType;
  level = 1;
  radius = 18;
  cooldown = 0;
  angle = -Math.PI / 2;
  spent: number;
  flash = 0;

  constructor(x: number, y: number, type: TowerType, id: string) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.type = type;
    this.spent = TOWER_TYPES[type].cost;
  }

  get stats() {
    return getTowerStats(this.type, this.level);
  }

  update(dt: number, state: GameState, ports: WatchPorts): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.flash = Math.max(0, this.flash - dt * 8);
    const stats = getEffectiveStats(state, this);

    if (stats.auraSlowDuration > 0 && stats.auraRadius > 0) {
      for (const enemy of state.enemies) {
        if (!enemy.alive) continue;
        if (distance(this, enemy) <= stats.auraRadius) {
          enemy.applySlow(stats.auraSlowDuration, stats.auraSlowFactor);
        }
      }
    }

    if (stats.fireRate <= 0) return;

    const target = this.findTarget(state, stats.range);
    if (target) {
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
      if (this.cooldown <= 0) {
        state.projectiles.push(
          new Projectile(this.x, this.y, target, stats, stats.slowDuration),
        );
        this.cooldown = 1 / stats.fireRate;
        this.flash = 1;
        ports.play("shoot");
      }
    }
  }

  findTarget(state: GameState, range = this.stats.range) {
    let bestTarget = null;
    let bestProgress = -Infinity;

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (distance(this, enemy) <= range && enemy.distanceTravelled > bestProgress) {
        bestProgress = enemy.distanceTravelled;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }
}
