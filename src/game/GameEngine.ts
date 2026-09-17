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
import { pauseForOverlay, resumeOverlayPause } from "./sim/pause";
import { refreshPreview } from "./sim/preview";
import { ScreenPointerHub } from "./sim/screenPointer";
import { startWave } from "./systems/waves";
import { sellTower, sellTowers, upgradeTower, upgradeTowers } from "./systems/upgrade";
import { buildTower } from "./systems/placement";
import { WorldRenderer } from "./world3d/WorldRenderer";
import type { GameState, LayoutId, QuickMenuAnchor, TowerType, UiSnapshot } from "./types";

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
  private quickMenu: QuickMenuAnchor | null = null;
  private overlayPauseOwned = false;

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
      openQuickMenu: (x, y) => this.openQuickMenu(x, y),
      closeQuickMenu: () => this.closeQuickMenu(),
    });

    this.actions = {
      selectBuildType: (type) => this.selectBuildType(type),
      startWave: () => this.doStartWave(),
      togglePause: () => this.togglePause(),
      beginOverlayPause: () => this.beginOverlayPause(),
      endOverlayPause: () => this.endOverlayPause(),
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
      handleWheel: (deltaY) => {
        this.world.zoom(deltaY);
        this.closeQuickMenu();
      },
      toggleMute: () => this.toggleMute(),
      setReducedMotion: (on) => this.setReducedMotion(on),
      selectLayout: (id) => this.selectLayout(id),
      handleKeyDown: (key, code, ctrlKey) =>
        this.handleKeyDown(key, code, ctrlKey),
      zoomIn: () => this.zoomBy(-120),
      zoomOut: () => this.zoomBy(120),
      resetView: () => this.resetView(),
      closeQuickMenu: () => this.closeQuickMenu(),
      toggleTowerLink: (id) => this.toggleTowerLink(id),
      buildTowerAt: (type, point) => this.buildTowerAt(type, point),
    };

    this.setupCanvas();
    this.emitSnapshot();
    this.showToast("Defend the Citadel. Place a Tower beside the Road.");
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
        quickMenu: this.quickMenu,
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
      s.campaignComplete,
      s.waveActive,
      s.enemies.length,
      s.towers.length,
      s.enemiesLeftToSpawn,
      s.selectedBuildType,
      [...s.selectedTowerIds].join(","),
      s.speed,
      s.interactionMode,
      s.drag.kind,
      s.lastClearBonus,
      s.lastEscape
        ? `${s.lastEscape.enemyKind},${s.lastEscape.remainingLives}`
        : "",
      s.placementPreview.visible,
      s.placementPreview.ok,
      s.placementPreview.reason,
      this.toastMessage ?? "",
      this.audio.muted,
      this.reducedMotion,
      s.layoutId,
      this.pointerHub.isPanning(),
      this.quickMenu
        ? `${this.quickMenu.x},${this.quickMenu.y},${this.quickMenu.target.kind}`
        : "",
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

  private closeQuickMenu(): void {
    if (!this.quickMenu) return;
    this.quickMenu = null;
    this.emitSnapshot();
  }

  private openQuickMenu(clientX: number, clientY: number): void {
    const hit = this.board.hit(clientX, clientY);
    if (hit.kind === "tower" || hit.kind === "upgrade") {
      this.quickMenu = {
        x: clientX,
        y: clientY,
        target: { kind: "tower", towerId: hit.towerId },
      };
    } else {
      const point =
        hit.kind === "ground" ? hit.point : this.board.toLogical(clientX, clientY);
      if (!point) return;
      this.quickMenu = {
        x: clientX,
        y: clientY,
        target: { kind: "ground", point },
      };
    }
    this.emitSnapshot();
  }

  private toggleTowerLink(id: string): void {
    const next = new Set(this.state.selectedTowerIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    this.state.selectedTowerIds = next;
    cancelDrag(this.state);
    refreshPreview(this.state);
    this.quickMenu = null;
    this.emitSnapshot();
  }

  private buildTowerAt(type: TowerType, point: { x: number; y: number }): void {
    this.quickMenu = null;
    buildTower(this.state, point, this.ports, type);
    refreshPreview(this.state);
    this.emitSnapshot();
  }

  private zoomBy(deltaY: number): void {
    this.world.zoom(deltaY);
    this.closeQuickMenu();
  }

  private resetView(): void {
    this.world.resetView();
    this.closeQuickMenu();
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
    this.quickMenu = null;
    this.overlayPauseOwned = false;
    resetState(this.state, { layoutId: id });
    this.world.resetView();
    this.emitSnapshot();
    this.showToast("New Watch on a new Road.");
  }

  private resetGame(): void {
    this.quickMenu = null;
    this.overlayPauseOwned = false;
    resetState(this.state);
    this.world.resetView();
    this.emitSnapshot();
    this.showToast("New Watch. Place a tower, then start the Wave.");
  }

  private selectBuildType(type: TowerType | null): void {
    this.quickMenu = null;
    this.state.selectedBuildType = type;
    this.state.selectedTowerIds = new Set();
    refreshPreview(this.state);
    this.emitSnapshot();
  }

  private doStartWave(): void {
    this.quickMenu = null;
    startWave(this.state, this.ports);
    this.emitSnapshot();
  }

  private togglePause(): void {
    if (this.state.gameOver || this.state.campaignComplete) return;
    this.quickMenu = null;
    this.state.paused = !this.state.paused;
    this.showToast(this.state.paused ? "Paused." : "Resumed.");
  }

  private beginOverlayPause(): void {
    this.quickMenu = null;
    this.overlayPauseOwned = pauseForOverlay(this.state);
    this.emitSnapshot();
  }

  private endOverlayPause(): void {
    resumeOverlayPause(this.state, this.overlayPauseOwned);
    this.overlayPauseOwned = false;
    this.emitSnapshot();
  }

  private setSpeed(speed: GameSpeed): void {
    this.quickMenu = null;
    this.state.speed = speed;
    this.emitSnapshot();
  }

  private doUpgradeTower(id: string): void {
    this.quickMenu = null;
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
    this.quickMenu = null;
    this.emitSnapshot();
  }

  private doSellTower(id: string): void {
    this.quickMenu = null;
    sellTower(this.state, id, this.ports);
    this.emitSnapshot();
  }

  private doSellSelected(): void {
    const ids = [...this.state.selectedTowerIds];
    if (ids.length === 0) return;
    sellTowers(this.state, ids, this.ports);
    this.quickMenu = null;
    this.emitSnapshot();
  }

  private clearSelection(): void {
    this.quickMenu = null;
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
    if (this.quickMenu && key === "Escape") {
      this.closeQuickMenu();
      return;
    }
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
      this.resetView();
      return;
    }
    const panStep = 48;
    if (key === "a" || key === "A" || code === "ArrowLeft") {
      this.world.pan(-panStep, 0);
      this.closeQuickMenu();
      return;
    }
    if (key === "d" || key === "D" || code === "ArrowRight") {
      this.world.pan(panStep, 0);
      this.closeQuickMenu();
      return;
    }
    if (key === "w" || key === "W" || code === "ArrowUp") {
      this.world.pan(0, -panStep);
      this.closeQuickMenu();
      return;
    }
    if (key === "s" || key === "S" || code === "ArrowDown") {
      this.world.pan(0, panStep);
      this.closeQuickMenu();
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

    const frozen =
      this.state.paused || this.state.gameOver || this.state.campaignComplete;
    const dt = frozen ? rawDt : rawDt * this.state.speed;
    advanceWatch(this.state, dt, this.ports, { frozen });

    this.world.sync(this.state);
    this.world.render();
    if (this.snapshotKey() !== this.hudKey) this.emitSnapshot();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }
}
