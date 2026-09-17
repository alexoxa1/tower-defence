import { describe, expect, it } from "vitest";
import { CAMPAIGN_WAVES, MAX_TOWER_LEVEL, RELOCATE_THRESHOLD, RELOCATE_THRESHOLD_COARSE, STARTING_GOLD, TOWER_TYPES } from "../constants";
import { Enemy } from "../entities/Enemy";
import { Projectile } from "../entities/Projectile";
import { buildUiSnapshot } from "../hud/snapshot";
import { createInitialState } from "../state/createInitialState";
import { advanceWatch } from "./advanceWatch";
import { createLogicalHitTest } from "./boardHit";
import { createRecordingPorts, silentPorts } from "./ports";
import { deriveInteractionMode, refreshPreview } from "./preview";
import { pauseForOverlay, resumeOverlayPause } from "./pause";
import { pointerDown, pointerMove, pointerUp } from "./pointer";
import { applyDamage, resolveEscape } from "../systems/combat";
import { buildTower, validatePlacement } from "../systems/placement";
import { canUpgradeTower, towerToSummary } from "../systems/upgrade";
import { getEffectiveStats } from "../config/towerStats";
import { getLayout } from "../config/layouts";
import {
  canStartWave,
  checkWaveCleared,
  startWave,
  updateWaveSpawner,
} from "../systems/waves";

const OPEN_GROUND = { x: 200, y: 80 };
const LEFT = { button: 0, ctrlKey: false, metaKey: false };

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
    const enemy = new Enemy(1, "creep", state.road);
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
    const enemy = new Enemy(1, "creep", state.road);
    enemy.escaped = true;
    enemy.alive = false;

    resolveEscape(state, enemy, rec.ports);
    expect(state.lives).toBe(0);
    expect(state.gameOver).toBe(true);
    expect(state.lastEscape).toEqual({
      enemyKind: "creep",
      livesCost: 1,
      remainingLives: 0,
      wave: 0,
    });
    expect(rec.sounds.filter((s) => s === "lose")).toHaveLength(1);
    expect(rec.sounds).not.toContain("life");

    resolveEscape(state, new Enemy(1, "creep", state.road), rec.ports);
    expect(rec.sounds.filter((s) => s === "lose")).toHaveLength(1);
  });

  it("stops the tick atomically after the decisive Escape", () => {
    const state = createInitialState();
    state.wave = 1;
    state.waveActive = true;
    state.enemiesLeftToSpawn = 0;
    state.lives = 1;
    const rec = createRecordingPorts();
    const end = state.road[state.road.length - 1];
    const fatal = new Enemy(1, "creep", state.road);
    fatal.waypointIndex = state.road.length - 1;
    fatal.x = end.x - 1;
    fatal.y = end.y;
    fatal.speed = 100;
    const later = new Enemy(1, "runner", state.road);
    later.waypointIndex = state.road.length - 1;
    later.x = end.x - 1;
    later.y = end.y;
    later.speed = 100;
    state.enemies.push(fatal, later);
    const projectile = new Projectile(
      later.x,
      later.y,
      later,
      TOWER_TYPES.basic,
    );
    state.projectiles.push(projectile);
    const goldBefore = state.gold;

    advanceWatch(state, 0.1, rec.ports);

    expect(state.gameOver).toBe(true);
    expect(state.lives).toBe(0);
    expect(state.lastEscape?.enemyKind).toBe("creep");
    expect(state.enemies).toEqual([later]);
    expect(later.alive).toBe(true);
    expect(projectile.active).toBe(true);
    expect(state.gold).toBe(goldBefore);
    expect(state.score).toBe(0);
    expect(state.lastClearBonus).toBe(0);
    expect(rec.sounds.filter((sound) => sound === "lose")).toHaveLength(1);
    expect(rec.sounds).not.toContain("life");
    expect(rec.sounds).not.toContain("kill");
  });
});

describe("overlay pause", () => {
  it("resumes only a pause owned by the overlay", () => {
    const state = createInitialState();
    const owned = pauseForOverlay(state);
    expect(owned).toBe(true);
    expect(state.paused).toBe(true);

    resumeOverlayPause(state, owned);
    expect(state.paused).toBe(false);

    state.paused = true;
    const playerPauseOwned = pauseForOverlay(state);
    expect(playerPauseOwned).toBe(false);
    resumeOverlayPause(state, playerPauseOwned);
    expect(state.paused).toBe(true);
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
      reducedMotion: false,
    });
    expect(snap.canStartWave).toBe(true);
    expect(snap.phase).toBe("hold");
    expect(snap.nextWaveName).toBe("Rift Drip");
    expect(snap.canAffordBuild.basic).toBe(true);
    expect(snap.canAffordBuild.beacon).toBe(true);
    expect(snap.campaignWaves).toBe(CAMPAIGN_WAVES);
    expect(snap.maxTowerLevel).toBe(MAX_TOWER_LEVEL);
    expect(snap.layoutId).toBe("serpentine");
    expect(snap.layouts).toHaveLength(3);

    startWave(state, silentPorts);
    expect(canStartWave(state)).toBe(false);
    snap = buildUiSnapshot(state, {
      toast: null,
      muted: false,
      isPanning: false,
      reducedMotion: false,
    });
    expect(snap.canStartWave).toBe(false);
    expect(snap.waveActive).toBe(true);
    expect(snap.phase).toBe("wave-arrivals");

    state.enemiesLeftToSpawn = 0;
    state.enemies.push(new Enemy(1, "creep", state.road));
    updateWaveSpawner(0, state);
    snap = buildUiSnapshot(state, {
      toast: null,
      muted: false,
      isPanning: false,
      reducedMotion: false,
    });
    expect(state.waveActive).toBe(true);
    expect(snap.waveActive).toBe(true);
    expect(snap.canStartWave).toBe(false);
    expect(snap.phase).toBe("wave-resolution");

    state.enemies = [];
    checkWaveCleared(state, silentPorts);
    snap = buildUiSnapshot(state, {
      toast: null,
      muted: false,
      isPanning: false,
      reducedMotion: false,
    });
    expect(state.waveActive).toBe(false);
    expect(snap.canStartWave).toBe(true);
    expect(snap.phase).toBe("inter-wave");

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

describe("Campaign completion", () => {
  it("ends after Wave 20 and never starts Wave 21", () => {
    const state = createInitialState();
    const rec = createRecordingPorts();
    state.wave = CAMPAIGN_WAVES;
    state.waveActive = true;
    state.lastRewardedWave = CAMPAIGN_WAVES - 1;
    state.enemiesLeftToSpawn = 0;

    checkWaveCleared(state, rec.ports);

    expect(state.campaignComplete).toBe(true);
    expect(state.wave).toBe(CAMPAIGN_WAVES);
    expect(state.waveActive).toBe(false);
    expect(state.lastClearBonus).toBe(255);
    expect(canStartWave(state)).toBe(false);
    expect(startWave(state, rec.ports).ok).toBe(false);
    expect(state.wave).toBe(CAMPAIGN_WAVES);
    expect(rec.notes).toContain("Campaign complete. Start a New Watch.");
    const snap = buildUiSnapshot(state, {
      toast: null,
      muted: false,
      isPanning: false,
      reducedMotion: false,
    });
    expect(snap.phase).toBe("campaign-complete");
    expect(snap.nextWaveName).toBeNull();
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
    if (hit.kind === "tower") {
      expect(hit.towerId).toBe(state.towers[0].id);
      expect(hit.point).toEqual(OPEN_GROUND);
    }
  });
});

describe("pointer select vs relocate", () => {
  it("selects a tower on tap without moving it", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    const tower = state.towers[0];
    const origin = { x: tower.x, y: tower.y };
    const press = { x: origin.x + 8, y: origin.y + 6 };

    pointerDown(state, press, LEFT, silentPorts);
    expect(state.selectedTowerIds.has(tower.id)).toBe(true);
    expect(state.drag.kind).toBe("pending");
    pointerUp(state, press, silentPorts);

    expect(tower.x).toBe(origin.x);
    expect(tower.y).toBe(origin.y);
    expect(state.drag.kind).toBe("idle");
    expect(state.selectedTowerIds.has(tower.id)).toBe(true);
  });

  it("does not relocate when travel stays under the threshold", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    const tower = state.towers[0];
    const origin = { x: tower.x, y: tower.y };
    const press = { x: origin.x, y: origin.y };
    const nudge = { x: origin.x + RELOCATE_THRESHOLD - 1, y: origin.y };

    pointerDown(state, press, LEFT, silentPorts);
    pointerMove(state, nudge);
    expect(state.drag.kind).toBe("pending");
    pointerUp(state, nudge, silentPorts);

    expect(tower.x).toBe(origin.x);
    expect(tower.y).toBe(origin.y);
  });

  it("relocates after travel past the threshold", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    const tower = state.towers[0];
    const origin = { x: tower.x, y: tower.y };
    const press = { x: origin.x, y: origin.y };
    const drop = { x: origin.x + 80, y: origin.y + 10 };

    pointerDown(state, press, LEFT, silentPorts);
    pointerMove(state, drop);
    expect(state.drag.kind).toBe("relocating");
    pointerUp(state, drop, silentPorts);

    expect(tower.x).toBeCloseTo(drop.x);
    expect(tower.y).toBeCloseTo(drop.y);
    expect(state.drag.kind).toBe("idle");
  });

  it("stays relocating if the pointer returns under the threshold", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    const tower = state.towers[0];
    const origin = { x: tower.x, y: tower.y };
    const press = { x: origin.x, y: origin.y };

    pointerDown(state, press, LEFT, silentPorts);
    pointerMove(state, { x: origin.x + 80, y: origin.y });
    expect(state.drag.kind).toBe("relocating");
    pointerMove(state, { x: origin.x + 4, y: origin.y });
    expect(state.drag.kind).toBe("relocating");
    pointerUp(state, { x: origin.x + 4, y: origin.y }, silentPorts);

    expect(tower.x).toBeCloseTo(origin.x + 4);
    expect(tower.y).toBeCloseTo(origin.y);
  });

  it("needs more travel to relocate on a touch press", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    const tower = state.towers[0];
    const origin = { x: tower.x, y: tower.y };
    const press = { x: origin.x, y: origin.y };
    const touch = { button: 0, ctrlKey: false, metaKey: false, pointerType: "touch" };

    pointerDown(state, press, touch, silentPorts);
    pointerMove(state, { x: origin.x + RELOCATE_THRESHOLD + 1, y: origin.y });
    expect(state.drag.kind).toBe("pending");
    pointerMove(state, { x: origin.x + RELOCATE_THRESHOLD_COARSE + 1, y: origin.y });
    expect(state.drag.kind).toBe("relocating");
  });

  it("Ctrl-click toggles Link; right-click does not", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    buildTower(state, { x: 80, y: 80 }, silentPorts);
    const first = state.towers[0];
    const second = state.towers[1];
    state.selectedTowerIds = new Set([first.id]);

    pointerDown(
      state,
      { x: second.x, y: second.y },
      { button: 2, ctrlKey: false, metaKey: false },
      silentPorts,
    );
    expect(state.selectedTowerIds.has(second.id)).toBe(false);
    expect(state.selectedTowerIds.has(first.id)).toBe(true);

    pointerDown(
      state,
      { x: second.x, y: second.y },
      { button: 0, ctrlKey: true, metaKey: false },
      silentPorts,
    );
    expect(state.selectedTowerIds.has(second.id)).toBe(true);
    expect(state.selectedTowerIds.has(first.id)).toBe(true);
  });
});

describe("layouts", () => {
  it("starts a Watch on Switchback with that Road", () => {
    const state = createInitialState({ layoutId: "switchback" });
    expect(state.layoutId).toBe("switchback");
    expect(state.road).toBe(getLayout("switchback").road);
    expect(state.road[0]).toEqual(getLayout("switchback").road[0]);
  });
});

describe("new Armory types", () => {
  it("Frost Lantern applies Slow without a projectile", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "lantern";
    expect(buildTower(state, { x: 340, y: 80 }, silentPorts).ok).toBe(true);
    const lantern = state.towers[0];
    const enemy = new Enemy(1, "creep", state.road);
    enemy.x = lantern.x;
    enemy.y = lantern.y;
    state.enemies.push(enemy);
    advanceWatch(state, 1 / 60, silentPorts);
    expect(state.projectiles).toHaveLength(0);
    expect(enemy.slowTimer).toBeGreaterThan(0);
  });

  it("Ward Beacon adds Range to a nearby Hex Gun", () => {
    const state = createInitialState();
    state.gold = 1000;
    state.selectedBuildType = "basic";
    buildTower(state, OPEN_GROUND, silentPorts);
    state.selectedBuildType = "beacon";
    expect(buildTower(state, { x: 280, y: 80 }, silentPorts).ok).toBe(true);
    const gun = state.towers[0];
    const base = TOWER_TYPES.basic.range;
    expect(getEffectiveStats(state, gun).range).toBeGreaterThan(base);
  });

  it("places from an explicit Armory type without a selected build", () => {
    const state = createInitialState();
    state.gold = 1000;
    expect(state.selectedBuildType).toBeNull();
    expect(buildTower(state, OPEN_GROUND, silentPorts, "basic").ok).toBe(true);
    expect(state.towers[0].type).toBe("basic");
  });
});
