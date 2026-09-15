import { FloatingText } from "../entities/FloatingText";
import { Particle } from "../entities/Particle";
import type { GameState } from "../types";

export function tickFx(state: GameState, dt: number): void {
  if (state.shake.time > 0) {
    state.shake.time = Math.max(0, state.shake.time - dt);
    if (state.shake.time === 0) state.shake.mag = 0;
  }

  if (state.comboTimer > 0) {
    state.comboTimer = Math.max(0, state.comboTimer - dt);
    if (state.comboTimer === 0) state.combo = 0;
  }
}

export function tickPresentation(state: GameState, dt: number): void {
  for (const text of state.floatingTexts) text.update(dt);
  for (const particle of state.particles) particle.update(dt);
  state.floatingTexts = state.floatingTexts.filter((t) => t.life > 0);
  state.particles = state.particles.filter((p) => p.life > 0);
}

export function addFloatingText(
  state: GameState,
  text: string,
  x: number,
  y: number,
  color: string,
): void {
  state.floatingTexts.push(new FloatingText(text, x, y, color));
}

export function addSpark(
  state: GameState,
  x: number,
  y: number,
  color: string,
): void {
  for (let i = 0; i < 5; i += 1) {
    state.particles.push(new Particle(x, y, color, 2.2));
  }
}

export function addExplosion(
  state: GameState,
  x: number,
  y: number,
  radius: number,
): void {
  const amount = Math.round(8 + radius / 5);
  for (let i = 0; i < amount; i += 1) {
    state.particles.push(
      new Particle(
        x,
        y,
        i % 2 ? "#e8a54b" : "#ff922b",
        2.5 + Math.random() * 2.5,
      ),
    );
  }
}
