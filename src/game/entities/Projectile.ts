import type { Enemy } from "./Enemy";
import type { GameState, Point, TowerStats } from "../types";
import type { WatchPorts } from "../sim/ports";
import { resolveProjectileHit } from "../systems/combat";

export class Projectile {
  x: number;
  y: number;
  target: Enemy;
  damage: number;
  speed: number;
  splash: number;
  color: string;
  radius: number;
  slowDuration: number;
  trail: Point[];
  active = true;

  constructor(
    x: number,
    y: number,
    target: Enemy,
    stats: TowerStats,
    slowDuration = 0,
  ) {
    this.x = x;
    this.y = y;
    this.target = target;
    this.damage = stats.damage;
    this.speed = stats.projectileSpeed;
    this.splash = stats.splash;
    this.color = stats.bulletColor;
    this.radius = stats.splash > 0 ? 5 : 4;
    this.slowDuration = slowDuration;
    this.trail = [{ x, y }];
  }

  update(dt: number, state: GameState, ports: WatchPorts): void {
    if (!this.active) return;
    if (!this.target.alive) {
      this.active = false;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const distanceToTarget = Math.hypot(dx, dy);
    const step = this.speed * dt;

    if (distanceToTarget <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.pushTrail();
      resolveProjectileHit(state, this, ports);
      this.active = false;
      return;
    }

    this.x += (dx / distanceToTarget) * step;
    this.y += (dy / distanceToTarget) * step;
    this.pushTrail();
  }

  private pushTrail(): void {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 4) this.trail.shift();
  }
}
