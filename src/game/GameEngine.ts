import { AudioEngine } from "./audio/AudioEngine";
import { ARMORY_ORDER } from "./config/armory";
import { type GameSpeed } from "./constants";
import { buildUiSnapshot } from "./hud/snapshot";
import type { GameActions, PointerOptions } from "./hud/commands";
import { createInitialState, resetState } from "./state/createInitialState";
import { advanceWatch } from "./sim/advanceWatch";
import type { BoardHitTest } from "./sim/boardHit";
import type { WatchPorts } from "./sim/ports";
import {
  cancelDrag,
  clearBoardSelection,
  pointerDown,
  pointerMove,
  pointerUp,
} from "./sim/pointer";
import { refreshPreview } from "./sim/preview";
import { ScreenPointerHub } from "./sim/screenPointer";
import { startWave } from "./systems/waves";
import { sellTower, sellTowers, upgradeTower, upgradeTowers } from "./systems/upgrade";
import { WorldRenderer } from "./world3d/WorldRenderer";
import type { GameState, LayoutId, TowerType, UiSnapshot } from "./types";

export type { GameActions, PointerOptions } from "./hud/commands";

export class GameEngine {
  private world: WorldRenderer;
  private board: BoardHitTest;
  private state: GameState;
  private lastFrameTime = 0;
  private animationFrameId = 0;
  private toastMessage: string | null = null;
  private toastTimer = 0;
  private onSnapshot: (snapshot: UiSnapshot) => void;
  private audio = new AudioEngine();
  private reducedMotion = false;
  private ports: WatchPorts;
  private hudKey = "";
  private pointerHub: ScreenPointerHub;

  readonly actions: GameActions;

  constructor(
    canvas: HTMLCanvasElement,
    onSnapshot: (snapshot: UiSnapshot) => void,
  ) {
    this.world = new WorldRenderer(canvas);
    this.board = this.world;
    this.state = createInitialState();
    this.onSnapshot = onSnapshot;
    this.reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.world.setReducedMotion(this.reducedMotion);
    this.applyMotionPreference();
    this.ports = {
      play: (name) => this.audio.play(name),
      notify: (message) => this.showToast(message),
    };
    this.pointerHub = new ScreenPointerHub({
      interactionMode: () => this.state.interactionMode,
      hit: (x, y) => this.board.hit(x, y),
      toLogical: (x, y) => this.board.toLogical(x, y),
      pan: (dx, dy) => this.world.pan(dx, dy),
      zoomByFactor: (factor) => this.world.zoomByFactor(factor),
      upgradeTower: (id) => this.doUpgradeTower(id),
      pointerDown: (point, options) =>
        pointerDown(this.state, point, options, this.ports),
      pointerMove: (point) => pointerMove(this.state, point),
      pointerUp: (point) => pointerUp(this.state, point, this.ports),
      cancelDrag: () => {
        cancelDrag(this.state);
        refreshPreview(this.state);
      },
    });

    this.actions = {
      selectBuildType: (type) => this.selectBuildType(type),
      startWave: () => this.doStartWave(),
      togglePause: () => this.togglePause(),
      setSpeed: (speed) => this.setSpeed(speed),
      resetGame: () => this.resetGame(),
      upgradeTower: (id) => this.doUpgradeTower(id),
      upgradeSelected: () => this.doUpgradeSelected(),
      sellTower: (id) => this.doSellTower(id),
      sellSelected: () => this.doSellSelected(),
      clearSelection: () => this.clearSelection(),
      handleScreenPointer: (phase, x, y, options) =>
        this.handleScreenPointer(phase, x, y, options),
      handlePointerMove: (point) => {
        pointerMove(this.state, point);
      },
      handleWheel: (deltaY) => this.world.zoom(deltaY),
      toggleMute: () => this.toggleMute(),
      setReducedMotion: (on) => this.setReducedMotion(on),
      selectLayout: (id) => this.selectLayout(id),
      handleKeyDown: (key, code, ctrlKey) =>
        this.handleKeyDown(key, code, ctrlKey),
      zoomIn: () => this.world.zoom(-120),
      zoomOut: () => this.world.zoom(120),
      resetView: () => this.world.resetView(),
    };

    this.setupCanvas();
    this.emitSnapshot();
    this.showToast("Scout: drag to pan. Pinch or use + / − to zoom.");
  }

  start(): void {
    this.lastFrameTime = 0;
    cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
    window.addEventListener("resize", this.setupCanvasBound);
  }

  stop(): void {
    cancelAnimationFrame(this.animationFrameId);
    window.removeEventListener("resize", this.setupCanvasBound);
    this.world.dispose();
  }

  private setupCanvasBound = (): void => {
    this.setupCanvas();
  };

  private setupCanvas(): void {
    this.world.resize();
  }

  private emitSnapshot(): void {
    this.onSnapshot(
      buildUiSnapshot(this.state, {
        toast: this.toastMessage,
        muted: this.audio.muted,
        isPanning: this.pointerHub.isPanning(),
        reducedMotion: this.reducedMotion,
      }),
    );
    this.hudKey = this.snapshotKey();
  }

  private snapshotKey(): string {
    const s = this.state;
    return [
      s.gold,
      s.lives,
      s.wave,
      s.score,
      s.kills,
      s.combo,
      s.paused,
      s.gameOver,
      s.waveActive,
      s.enemies.length,
      s.towers.length,
      s.enemiesLeftToSpawn,
      s.selectedBuildType,
      [...s.selectedTowerIds].join(","),
      s.speed,
      s.interactionMode,
      s.drag.kind,
      this.toastMessage ?? "",
      this.audio.muted,
      this.reducedMotion,
      s.layoutId,
      this.pointerHub.isPanning(),
    ].join("|");
  }

  private showToast(message: string): void {
    this.toastMessage = message;
    this.emitSnapshot();
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastMessage = null;
      this.emitSnapshot();
    }, 1600);
  }

  private toggleMute(): void {
    this.audio.toggleMute();
    this.showToast(this.audio.muted ? "Audio muted." : "Audio on.");
  }

  private applyMotionPreference(): void {
    document.documentElement.dataset.reducedMotion = this.reducedMotion
      ? "true"
      : "false";
  }

  private setReducedMotion(on: boolean): void {
    this.reducedMotion = on;
    this.world.setReducedMotion(on);
    this.applyMotionPreference();
    this.emitSnapshot();
    this.showToast(on ? "Motion reduced." : "Motion on.");
  }

  private selectLayout(id: LayoutId): void {
    resetState(this.state, { layoutId: id });
    this.world.resetView();
    this.emitSnapshot();
    this.showToast("New Watch on a new Road.");
  }

  private resetGame(): void {
    resetState(this.state);
    this.emitSnapshot();
    this.showToast("New Watch. Place a tower, then start the Wave.");
  }

  private selectBuildType(type: TowerType | null): void {
    this.state.selectedBuildType = type;
    this.state.selectedTowerIds = new Set();
    refreshPreview(this.state);
    this.emitSnapshot();
  }

  private doStartWave(): void {
    startWave(this.state, this.ports);
    this.emitSnapshot();
  }

  private togglePause(): void {
    if (this.state.gameOver) return;
    this.state.paused = !this.state.paused;
    this.showToast(this.state.paused ? "Paused." : "Resumed.");
  }

  private setSpeed(speed: GameSpeed): void {
    this.state.speed = speed;
    this.emitSnapshot();
  }

  private doUpgradeTower(id: string): void {
    upgradeTower(this.state, id, this.ports);
    this.emitSnapshot();
  }

  private doUpgradeSelected(): void {
    const ids = [...this.state.selectedTowerIds];
    if (ids.length === 0) return;
    if (ids.length === 1) {
      this.doUpgradeTower(ids[0]);
      return;
    }
    upgradeTowers(this.state, ids, this.ports);
    this.emitSnapshot();
  }

  private doSellTower(id: string): void {
    sellTower(this.state, id, this.ports);
    this.emitSnapshot();
  }

  private doSellSelected(): void {
    const ids = [...this.state.selectedTowerIds];
    if (ids.length === 0) return;
    sellTowers(this.state, ids, this.ports);
    this.emitSnapshot();
  }

  private clearSelection(): void {
    clearBoardSelection(this.state);
    this.emitSnapshot();
  }

  private handleScreenPointer(
    phase: "down" | "move" | "up",
    clientX: number,
    clientY: number,
    options?: PointerOptions,
  ): void {
    const wasPanning = this.pointerHub.isPanning();
    this.pointerHub.handle(phase, clientX, clientY, options);
    const nowPanning = this.pointerHub.isPanning();
    if (phase !== "move" || nowPanning !== wasPanning) this.emitSnapshot();
  }

  private handleKeyDown(key: string, code: string, ctrlKey: boolean): void {
    if (code === "Space") {
      this.togglePause();
      return;
    }
    if (key === "Escape") {
      this.clearSelection();
      return;
    }
    if (key === "[") {
      const speeds = [1, 2, 3, 4, 5] as const;
      const idx = speeds.indexOf(this.state.speed);
      this.setSpeed(speeds[Math.max(0, idx - 1)]);
      return;
    }
    if (key === "]") {
      const speeds = [1, 2, 3, 4, 5] as const;
      const idx = speeds.indexOf(this.state.speed);
      this.setSpeed(speeds[Math.min(speeds.length - 1, idx + 1)]);
      return;
    }
    if (key === "u" && !ctrlKey) {
      this.doUpgradeSelected();
      return;
    }
    if (key === "m" || key === "M") {
      this.toggleMute();
      return;
    }
    if (key === "Home") {
      this.world.resetView();
      return;
    }
    const panStep = 48;
    if (key === "a" || key === "A" || code === "ArrowLeft") {
      this.world.pan(-panStep, 0);
      return;
    }
    if (key === "d" || key === "D" || code === "ArrowRight") {
      this.world.pan(panStep, 0);
      return;
    }
    if (key === "w" || key === "W" || code === "ArrowUp") {
      this.world.pan(0, -panStep);
      return;
    }
    if (key === "s" || key === "S" || code === "ArrowDown") {
      this.world.pan(0, panStep);
      return;
    }
    const pickIndex = Number.parseInt(key, 10);
    if (pickIndex >= 1 && pickIndex <= ARMORY_ORDER.length) {
      this.selectBuildType(ARMORY_ORDER[pickIndex - 1]);
      return;
    }
    if (key === "v" || key === "V" || key === "0") {
      this.selectBuildType(null);
    }
  }

  private loop(timestamp: number): void {
    if (!this.lastFrameTime) this.lastFrameTime = timestamp;
    const rawDt = Math.min((timestamp - this.lastFrameTime) / 1000, 0.05);
    this.lastFrameTime = timestamp;

    const frozen = this.state.paused || this.state.gameOver;
    const dt = frozen ? rawDt : rawDt * this.state.speed;
    advanceWatch(this.state, dt, this.ports, { frozen });

    this.world.sync(this.state);
    this.world.render();
    if (this.snapshotKey() !== this.hudKey) this.emitSnapshot();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}
