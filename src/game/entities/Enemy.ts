import { PATH } from "../constants";
import type { EnemyKind } from "../types";

const KIND_TRAITS: Record<
  EnemyKind,
  { speed: number; hp: number; radius: number; reward: number; lives: number; scale: number }
> = {
  creep: { speed: 1, hp: 1, radius: 0, reward: 1, lives: 1, scale: 1 },
  runner: { speed: 1.62, hp: 0.58, radius: -3, reward: 0.85, lives: 1, scale: 0.92 },
  brute: { speed: 0.55, hp: 2.4, radius: 5, reward: 1.7, lives: 1, scale: 1.28 },
  swarm: { speed: 1.32, hp: 0.36, radius: -5, reward: 0.5, lives: 1, scale: 0.7 },
  warden: { speed: 0.7, hp: 2.9, radius: 4, reward: 2.2, lives: 1, scale: 1.38 },
  shade: { speed: 1.88, hp: 0.72, radius: -2, reward: 1.25, lives: 1, scale: 1.08 },
  colossus: { speed: 0.42, hp: 8.6, radius: 11, reward: 7, lives: 2, scale: 2.15 },
  overlord: { speed: 0.34, hp: 16.5, radius: 15, reward: 16, lives: 3, scale: 2.75 },
};

function pickKind(waveNumber: number, kind?: EnemyKind): EnemyKind {
  if (kind) return kind;
  const roll = Math.random();
  if (waveNumber >= 3 && roll < 0.12) return "brute";
  if (roll < 0.26) return "runner";
  if (waveNumber >= 2 && roll < 0.44) return "swarm";
  return "creep";
}

export class Enemy {
  x: number;
  y: number;
  waypointIndex = 1;
  distanceTravelled = 0;
  speed: number;
  maxHp: number;
  hp: number;
  radius: number;
  reward: number;
  kind: EnemyKind;
  scale: number;
  livesCost: number;
  isBoss: boolean;
  alive = true;
  escaped = false;
  flash = 0;
  slowTimer = 0;
  slowFactor = 1;

  constructor(waveNumber: number, kind?: EnemyKind) {
    this.kind = pickKind(waveNumber, kind);
    const trait = KIND_TRAITS[this.kind];
    this.x = PATH[0].x;
    this.y = PATH[0].y;
    this.speed = (50 + waveNumber * 4.5) * trait.speed;
    this.maxHp = Math.round(
      (42 * Math.pow(1.18, waveNumber - 1) + waveNumber * 13) * trait.hp,
    );
    this.hp = this.maxHp;
    this.radius = Math.max(6, 12 + Math.min(6, Math.floor(waveNumber / 6)) + trait.radius);
    this.reward = Math.max(4, Math.round((12 + Math.floor(waveNumber * 3.5)) * trait.reward));
    this.scale = trait.scale;
    this.livesCost = trait.lives;
    this.isBoss = kind === "colossus" || kind === "overlord";
    if (this.isBoss) {
      this.maxHp = Math.round(this.maxHp * (1 + waveNumber * 0.08));
      this.hp = this.maxHp;
    }
  }

  applySlow(duration: number, factor = 0.5): void {
    this.slowTimer = Math.max(this.slowTimer, duration);
    this.slowFactor = factor;
  }

  /** Walks the Road. Returns true on the frame the enemy Escapes through Out. */
  update(dt: number): boolean {
    if (!this.alive || this.waypointIndex >= PATH.length) return false;

    if (this.slowTimer > 0) {
      this.slowTimer = Math.max(0, this.slowTimer - dt);
      if (this.slowTimer === 0) this.slowFactor = 1;
    }

    const pace = this.slowTimer > 0 ? this.speed * this.slowFactor : this.speed;
    let remaining = pace * dt;
    while (remaining > 0 && this.alive) {
      const target = PATH[this.waypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const segmentDistance = Math.hypot(dx, dy);

      if (segmentDistance <= remaining) {
        this.x = target.x;
        this.y = target.y;
        this.distanceTravelled += segmentDistance;
        remaining -= segmentDistance;
        this.waypointIndex += 1;

        if (this.waypointIndex >= PATH.length) {
          this.alive = false;
          this.escaped = true;
          return true;
        }
      } else {
        this.x += (dx / segmentDistance) * remaining;
        this.y += (dy / segmentDistance) * remaining;
        this.distanceTravelled += remaining;
        remaining = 0;
      }
    }

    this.flash = Math.max(0, this.flash - dt * 5);
    return false;
  }

  takeDamage(amount: number): boolean {
    if (!this.alive) return false;
    this.hp -= amount;
    this.flash = 1;
    if (this.hp <= 0) {
      this.alive = false;
      return true;
    }
    return false;
  }
}
