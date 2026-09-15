import { TOWER_TYPES } from "../constants";
import { getTowerStats } from "../config/towerStats";
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
    const target = this.findTarget(state);

    if (target) {
      this.angle = Math.atan2(target.y - this.y, target.x - this.x);
      if (this.cooldown <= 0) {
        const stats = this.stats;
        state.projectiles.push(
          new Projectile(
            this.x,
            this.y,
            target,
            stats,
            this.type === "sniper" ? 1.4 : 0,
          ),
        );
        this.cooldown = 1 / stats.fireRate;
        this.flash = 1;
        ports.play("shoot");
      }
    }
  }

  findTarget(state: GameState) {
    const stats = this.stats;
    let bestTarget = null;
    let bestProgress = -Infinity;

    for (const enemy of state.enemies) {
      if (!enemy.alive) continue;
      if (
        distance(this, enemy) <= stats.range &&
        enemy.distanceTravelled > bestProgress
      ) {
        bestProgress = enemy.distanceTravelled;
        bestTarget = enemy;
      }
    }

    return bestTarget;
  }
}
