import type { GameSpeed } from "../constants";
import type { PointerOptions } from "../sim/pointer";
import type { LayoutId, Point, TowerType } from "../types";

export type { PointerOptions };

export interface HudCommands {
  selectBuildType: (type: TowerType | null) => void;
  startWave: () => void;
  togglePause: () => void;
  setSpeed: (speed: GameSpeed) => void;
  resetGame: () => void;
  upgradeTower: (id: string) => void;
  upgradeSelected: () => void;
  sellTower: (id: string) => void;
  sellSelected: () => void;
  clearSelection: () => void;
  toggleMute: () => void;
  setReducedMotion: (on: boolean) => void;
  selectLayout: (id: LayoutId) => void;
  handleKeyDown: (key: string, code: string, ctrlKey: boolean) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

export interface BoardInput {
  handleScreenPointer: (
    phase: "down" | "move" | "up",
    clientX: number,
    clientY: number,
    options?: PointerOptions,
  ) => void;
  handlePointerMove: (point: Point) => void;
  handleWheel: (deltaY: number) => void;
}

export type GameActions = HudCommands & BoardInput;
