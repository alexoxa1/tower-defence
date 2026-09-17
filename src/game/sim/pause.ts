import type { GameState } from "../types";

export function pauseForOverlay(state: GameState): boolean {
  if (state.paused || state.gameOver || state.campaignComplete) return false;
  state.paused = true;
  return true;
}

export function resumeOverlayPause(state: GameState, owned: boolean): void {
  if (!owned || state.gameOver || state.campaignComplete) return;
  state.paused = false;
}
