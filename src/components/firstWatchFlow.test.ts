import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { createInitialState } from "../game/state/createInitialState";
import { buildUiSnapshot } from "../game/hud/snapshot";
import { silentPorts } from "../game/sim/ports";
import { buildTower } from "../game/systems/placement";
import { startWave, updateWaveSpawner } from "../game/systems/waves";
import { Enemy } from "../game/entities/Enemy";
import { resolveEscape } from "../game/systems/combat";
import { GameOverOverlay, escapeCauseText } from "./GameOverOverlay";
import { statusContent } from "./Header";
import { bulkUpgradePreview } from "./SelectionPanel";
import { StatsPanel } from "./StatsPanel";
import { objectiveMessage } from "./WatchObjective";

function snapshot(state = createInitialState()) {
  return buildUiSnapshot(state, {
    toast: null,
    muted: false,
    isPanning: false,
    reducedMotion: false,
  });
}

describe("first Watch HUD flow", () => {
  it("names the first objective and explicit Wave action", () => {
    const snap = snapshot();

    expect(objectiveMessage(snap)?.text).toBe(
      "Defend the Citadel. Select a Tower, then place it beside the Road.",
    );
    expect(statusContent(snap)).toEqual({
      phase: "Hold",
      action: "Start Wave 1",
    });
  });

  it("exposes placement failure reasons as persistent text", () => {
    const state = createInitialState();
    state.selectedBuildType = "basic";
    state.hoveredPoint = { x: 200, y: 200 };
    const snap = snapshot(state);

    expect(snap.placementFeedback).toEqual({
      visible: true,
      ok: false,
      reason: "Cannot build on the road.",
    });
    expect(objectiveMessage(snap)).toEqual({
      tone: "danger",
      text: "Cannot build on the road.",
    });
  });

  it("renders active enemies and remaining arrivals", () => {
    const state = createInitialState();
    startWave(state, silentPorts);
    updateWaveSpawner(0, state);
    const markup = renderToStaticMarkup(
      createElement(StatsPanel, { snapshot: snapshot(state) }),
    );

    expect(markup).toContain("Pressure");
    expect(markup).toContain("active");
    expect(markup).toContain("in");
  });

  it("explains the decisive Escape and recovery choices", () => {
    const state = createInitialState();
    state.wave = 5;
    state.lives = 2;
    const colossus = new Enemy(5, "colossus", state.road);
    resolveEscape(state, colossus, silentPorts);
    const snap = snapshot(state);
    const markup = renderToStaticMarkup(
      createElement(GameOverOverlay, {
        snapshot: snap,
        actions: null,
        onRecovery: () => {},
      }),
    );

    expect(escapeCauseText(snap)).toBe(
      "Colossus reached Out and spent 2 Lives.",
    );
    expect(markup).toContain("Rift Broken");
    expect(markup).toContain("New Watch");
    expect(markup).toContain("Choose Layout");
    expect(markup).toContain("Review Controls");
  });

  it("presents Campaign completion without a Wave 21 action", () => {
    const state = createInitialState();
    state.wave = 20;
    state.campaignComplete = true;
    const snap = snapshot(state);
    const markup = renderToStaticMarkup(
      createElement(GameOverOverlay, {
        snapshot: snap,
        actions: null,
        onRecovery: () => {},
      }),
    );

    expect(statusContent(snap)).toEqual({
      phase: "Complete",
      action: "Campaign Complete",
    });
    expect(markup).toContain("Campaign Complete");
    expect(markup).not.toContain("Wave 21");
  });

  it("previews only sequentially affordable linked upgrades", () => {
    const state = createInitialState({ startingGold: 1_000 });
    state.selectedBuildType = "basic";
    buildTower(state, { x: 200, y: 80 }, silentPorts);
    state.selectedBuildType = "cannon";
    buildTower(state, { x: 280, y: 80 }, silentPorts);
    state.selectedTowerIds = new Set(state.towers.map((tower) => tower.id));
    const selected = snapshot(state).selectedTowers;

    expect(bulkUpgradePreview(selected, 200)).toEqual({
      count: 1,
      cost: 78,
      skipped: 1,
    });
  });
});
