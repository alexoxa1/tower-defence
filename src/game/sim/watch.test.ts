import { describe, expect, it } from "vitest";
import { CAMPAIGN_WAVES, MAX_TOWER_LEVEL, STARTING_GOLD, TOWER_TYPES } from "../constants";
import { Enemy } from "../entities/Enemy";
import { buildUiSnapshot } from "../hud/snapshot";
import { createInitialState } from "../state/createInitialState";
import { advanceWatch } from "./advanceWatch";
import { createLogicalHitTest } from "./boardHit";
import { createRecordingPorts, silentPorts } from "./ports";
import { deriveInteractionMode, refreshPreview } from "./preview";
import { applyDamage, resolveEscape } from "../systems/combat";
import { buildTower, validatePlacement } from "../systems/placement";
import { canUpgradeTower, towerToSummary } from "../systems/upgrade";
import {
  canStartWave,
  checkWaveCleared,
  startWave,
  updateWaveSpawner,
} from "../systems/waves";

const OPEN_GROUND = { x: 200, y: 80 };

describe("advanceWatch", () => {
  it("ticks a Watch with no canvas or WebGL", () => {
    const state = createInitialState();
    state.selectedBuildType = "basic";
    expect(buildTower(state, OPEN_GROUND, silentPorts).ok).toBe(true);

    startWave(state, silentPorts);
    for (let i = 0; i < 90; i += 1) {
      advanceWatch(state, 1 / 30, silentPorts);
    }

    expect(state.towers).toHaveLength(1);
    expect(state.wave).toBe(1);
    expect(state.enemies.length + state.enemiesLeftToSpawn).toBeGreaterThan(0);
    expect(state.elapsed).toBeGreaterThan(2);
  });
});

describe("placement preview", () => {
  it("flags legal and illegal ghost points without Three.js", () => {
    const state = createInitialState();
    state.selectedBuildType = "basic";
    state.hoveredPoint = OPEN_GROUND;
    refreshPreview(state);

    expect(state.placementPreview.visible).toBe(true);
    expect(state.placementPreview.ok).toBe(true);
    expect(state.placementPreview.range).toBe(TOWER_TYPES.basic.range);
    expect(validatePlacement(state, OPEN_GROUND, "basic").ok).toBe(true);

    state.hoveredPoint = { x: 200, y: 200 };
    refreshPreview(state);
    expect(state.placementPreview.visible).toBe(true);
    expect(state.placementPreview.ok).toBe(false);
    expect(state.placementPreview.reason).toMatch(/road/i);
  });
});

describe("combat", () => {
  it("pays gold and score on a kill", () => {
    const state = createInitialState();
    const rec = createRecordingPorts();
    const enemy = new Enemy(1, "creep");
    enemy.hp = 4;
    state.enemies.push(enemy);
    const goldBefore = state.gold;

    expect(applyDamage(state, enemy, 4, rec.ports)).toBe(true);
    expect(enemy.alive).toBe(false);
    expect(state.gold).toBe(goldBefore + enemy.reward);
    expect(state.kills).toBe(1);
    expect(state.score).toBeGreaterThan(0);
    expect(rec.sounds.filter((s) => s === "kill")).toHaveLength(1);
    expect(rec.sounds).not.toContain("lose");
  });

  it("spends lives on Escape and plays lose once at Rift Broken", () => {
    const state = createInitialState();
    state.lives = 1;
    const rec = createRecordingPorts();
    const enemy = new Enemy(1, "creep");
    enemy.escaped = true;
    enemy.alive = false;

    resolveEscape(state, enemy, rec.ports);
    expect(state.lives).toBeLessThanOrEqual(0);
    expect(state.gameOver).toBe(true);
    expect(rec.sounds.filter((s) => s === "lose")).toHaveLength(1);
    expect(rec.sounds).not.toContain("life");

    resolveEscape(state, new Enemy(1, "creep"), rec.ports);
    expect(rec.sounds.filter((s) => s === "lose")).toHaveLength(1);
  });
});

describe("eligibility", () => {
  it("matches canStartWave and upgrade rules on the snapshot", () => {
    const state = createInitialState();
    expect(state.gold).toBe(STARTING_GOLD);
    expect(canStartWave(state)).toBe(true);

    let snap = buildUiSnapshot(state, {
      toast: null,
      muted: false,
      isPanning: false,
    });
    expect(snap.canStartWave).toBe(true);
    expect(snap.canAffordBuild.basic).toBe(true);
    expect(snap.campaignWaves).toBe(CAMPAIGN_WAVES);
    expect(snap.maxTowerLevel).toBe(MAX_TOWER_LEVEL);

    startWave(state, silentPorts);
    expect(canStartWave(state)).toBe(false);
    snap = buildUiSnapshot(state, { toast: null, muted: false, isPanning: false });
    expect(snap.canStartWave).toBe(false);
    expect(snap.waveActive).toBe(true);

    state.enemiesLeftToSpawn = 0;
    state.enemies.push(new Enemy(1, "creep"));
    updateWaveSpawner(0, state);
    snap = buildUiSnapshot(state, { toast: null, muted: false, isPanning: false });
    expect(state.waveActive).toBe(true);
    expect(snap.waveActive).toBe(true);
    expect(snap.canStartWave).toBe(false);

    state.enemies = [];
    checkWaveCleared(state, silentPorts);
    snap = buildUiSnapshot(state, { toast: null, muted: false, isPanning: false });
    expect(state.waveActive).toBe(false);
    expect(snap.canStartWave).toBe(true);

    const fresh = createInitialState();
    fresh.selectedBuildType = "basic";
    buildTower(fresh, OPEN_GROUND, silentPorts);
    const tower = fresh.towers[0];
    expect(towerToSummary(tower, fresh.gold).canUpgrade).toBe(
      canUpgradeTower(tower, fresh.gold),
    );

    tower.level = MAX_TOWER_LEVEL;
    const maxed = towerToSummary(tower, 99_999);
    expect(maxed.atMaxLevel).toBe(true);
    expect(maxed.canUpgrade).toBe(false);
    expect(canUpgradeTower(tower, 99_999)).toBe(false);
  });
});

describe("interaction mode", () => {
  it("derives scout, build, tower, and multi from selection", () => {
    const state = createInitialState();
    expect(deriveInteractionMode(state)).toBe("scout");

    state.selectedBuildType = "cannon";
    expect(deriveInteractionMode(state)).toBe("build");

    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, { x: 80, y: 80 }, silentPorts);
    expect(deriveInteractionMode(state)).toBe("tower");

    state.selectedTowerIds = new Set();
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    state.selectedTowerIds = new Set(state.towers.map((t) => t.id));
    expect(state.towers.length).toBe(2);
    expect(deriveInteractionMode(state)).toBe("multi");
  });
});

describe("board hit-test", () => {
  it("picks a tower from logical coordinates", () => {
    const state = createInitialState();
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    const board = createLogicalHitTest(() => state);
    const miss = board.hit(80, 80);
    expect(miss.kind).toBe("ground");
    const hit = board.hit(OPEN_GROUND.x, OPEN_GROUND.y);
    expect(hit.kind).toBe("tower");
    if (hit.kind === "tower") expect(hit.towerId).toBe(state.towers[0].id);
  });
});
