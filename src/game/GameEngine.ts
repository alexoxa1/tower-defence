import { AudioEngine } from "./audio/AudioEngine";
import { type GameSpeed } from "./constants";
import { buildUiSnapshot } from "./hud/snapshot";
import type { GameActions, PointerOptions } from "./hud/commands";
import { createInitialState, resetState } from "./state/createInitialState";
import { advanceWatch } from "./sim/advanceWatch";
import type { BoardHitTest } from "./sim/boardHit";
import type { WatchPorts } from "./sim/ports";
import {
  clearBoardSelection,
  pointerDown,
  pointerMove,
  pointerUp,
} from "./sim/pointer";
import { refreshPreview } from "./sim/preview";
import { startWave } from "./systems/waves";
import { sellTower, sellTowers, upgradeTower, upgradeTowers } from "./systems/upgrade";
import { WorldRenderer } from "./world3d/WorldRenderer";
import type { GameState, TowerType, UiSnapshot } from "./types";

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
  private isDraggingPointer = false;
  private audio = new AudioEngine();
  private ports: WatchPorts;
  private hudKey = "";
  private panSession: {
    x: number;
    y: number;
    button: number;
    moved: boolean;
  } | null = null;

  readonly actions: GameActions;

  constructor(
    canvas: HTMLCanvasElement,
    onSnapshot: (snapshot: UiSnapshot) => void,
  ) {
    this.world = new WorldRenderer(canvas);
    this.board = this.world;
    this.state = createInitialState();
    this.onSnapshot = onSnapshot;
    this.ports = {
      play: (name) => this.audio.play(name),
      notify: (message) => this.showToast(message),
    };

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
      handleKeyDown: (key, code, ctrlKey) =>
        this.handleKeyDown(key, code, ctrlKey),
    };

    this.setupCanvas();
    this.emitSnapshot();
    this.showToast("Scout: drag the board. Pick a tower in the Armory to build.");
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
        isPanning: this.panSession?.moved === true,
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
      s.enemiesLeftToSpawn,
      s.selectedBuildType,
      [...s.selectedTowerIds].join(","),
      s.speed,
      s.interactionMode,
      s.drag.active,
      this.toastMessage ?? "",
      this.audio.muted,
      this.panSession?.moved === true,
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
    this.isDraggingPointer = false;
    clearBoardSelection(this.state);
    this.emitSnapshot();
  }

  private handleScreenPointer(
    phase: "down" | "move" | "up",
    clientX: number,
    clientY: number,
    options?: PointerOptions,
  ): void {
    if (phase === "down" && options && this.shouldPan(options)) {
      this.panSession = {
        x: clientX,
        y: clientY,
        button: options.button,
        moved: false,
      };
      this.emitSnapshot();
      return;
    }

    if (phase === "down" && options && options.button === 0) {
      const hit = this.board.hit(clientX, clientY);
      if (hit.kind === "upgrade") {
        this.doUpgradeTower(hit.towerId);
        return;
      }
      if (hit.kind === "tower") {
        const tower = this.state.towers.find((item) => item.id === hit.towerId);
        if (tower) {
          pointerDown(this.state, { x: tower.x, y: tower.y }, options, this.ports);
          this.isDraggingPointer = this.state.drag.active;
          this.emitSnapshot();
          return;
        }
      }
      this.panSession = {
        x: clientX,
        y: clientY,
        button: 0,
        moved: false,
      };
      return;
    }

    if (this.panSession && phase === "move") {
      const dx = clientX - this.panSession.x;
      const dy = clientY - this.panSession.y;
      const wasMoved = this.panSession.moved;
      if (Math.hypot(dx, dy) > 2) this.panSession.moved = true;
      this.world.pan(dx, dy);
      this.panSession.x = clientX;
      this.panSession.y = clientY;
      if (this.panSession.moved && !wasMoved) this.emitSnapshot();
      return;
    }

    if (this.panSession && phase === "up") {
      const session = this.panSession;
      this.panSession = null;
      if (!session.moved) {
        const hit = this.board.hit(clientX, clientY);
        if (hit.kind === "tower") {
          const tower = this.state.towers.find((item) => item.id === hit.towerId);
          if (tower) {
            pointerDown(
              this.state,
              { x: tower.x, y: tower.y },
              { button: session.button, ctrlKey: false, metaKey: false },
              this.ports,
            );
          }
        } else {
          const point =
            hit.kind === "ground"
              ? hit.point
              : this.board.toLogical(clientX, clientY);
          if (point) {
            pointerDown(
              this.state,
              point,
              {
                button: session.button,
                ctrlKey: false,
                metaKey: false,
              },
              this.ports,
            );
          }
        }
      }
      this.emitSnapshot();
      return;
    }

    const point = this.board.toLogical(clientX, clientY);
    if (!point) {
      if (phase === "move") pointerMove(this.state, { x: -999, y: -999 });
      return;
    }
    if (phase === "move") pointerMove(this.state, point);
    else if (phase === "up") {
      pointerUp(this.state, point, this.ports, this.isDraggingPointer);
      this.isDraggingPointer = false;
      this.emitSnapshot();
    }
  }

  private shouldPan(options: PointerOptions): boolean {
    return (
      options.button === 1 ||
      options.button === 2 ||
      (options.button === 0 &&
        (options.altKey === true || options.shiftKey === true))
    );
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
    const hotkeys: Record<string, TowerType | "scout"> = {
      "1": "basic",
      "2": "cannon",
      "3": "sniper",
      "4": "scout",
      v: "scout",
      V: "scout",
    };
    const pick = hotkeys[key];
    if (pick === "scout") {
      this.selectBuildType(null);
      return;
    }
    if (pick) this.selectBuildType(pick);
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
