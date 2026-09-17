import { useEffect, useRef, useState } from "react";
import type { HudCommands } from "../game/hud/commands";
import type { EnemyKind, UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

const ENEMY_NAMES: Record<EnemyKind, string> = {
  creep: "Creep",
  runner: "Runner",
  brute: "Brute",
  swarm: "Swarm",
  warden: "Warden",
  shade: "Shade",
  colossus: "Colossus",
  overlord: "Overlord",
};

export function escapeCauseText(snapshot: UiSnapshot): string {
  const escape = snapshot.lastEscape;
  if (!escape) return "Enemies reached Out and spent the Citadel's Lives.";
  const noun = escape.livesCost === 1 ? "Life" : "Lives";
  return `${ENEMY_NAMES[escape.enemyKind]} reached Out and spent ${escape.livesCost} ${noun}.`;
}

export function GameOverOverlay({
  snapshot,
  actions,
  onRecovery,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
  onRecovery: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showLayouts, setShowLayouts] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const ended = snapshot.gameOver || snapshot.campaignComplete;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (ended && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("button")?.focus();
    }
    if (!ended && dialog.open) dialog.close();
    if (!ended) {
      setShowLayouts(false);
      setShowHelp(false);
    }
  }, [ended]);

  const layoutName =
    snapshot.layouts.find((layout) => layout.id === snapshot.layoutId)?.name ??
    snapshot.layoutId;
  const wavesCleared = snapshot.campaignComplete
    ? snapshot.campaignWaves
    : Math.max(0, snapshot.wave - 1);

  const recover = (action: () => void) => {
    setShowLayouts(false);
    setShowHelp(false);
    onRecovery();
    action();
  };

  return (
    <dialog
      ref={dialogRef}
      className="game-over-screen"
      aria-labelledby="watch-end-title"
      aria-modal="true"
    >
      <h2 id="watch-end-title">
        {snapshot.campaignComplete ? "Campaign Complete" : "Rift Broken"}
      </h2>
      <p className="watch-end-cause">
        {snapshot.campaignComplete
          ? "Twenty Waves cleared. The Citadel stands."
          : escapeCauseText(snapshot)}
      </p>
      <p>
        Score {formatNumber(snapshot.score)} · Waves {wavesCleared} · Kills{" "}
        {snapshot.kills} · {layoutName}
      </p>
      <button
        type="button"
        className="action"
        onClick={() => recover(() => actions?.resetGame())}
      >
        New Watch
      </button>
      <div className="watch-end-actions">
        <button
          type="button"
          className="action secondary"
          aria-expanded={showLayouts}
          onClick={() => {
            setShowHelp(false);
            setShowLayouts((visible) => !visible);
          }}
        >
          Choose Layout
        </button>
        <button
          type="button"
          className="action secondary"
          aria-expanded={showHelp}
          onClick={() => {
            setShowLayouts(false);
            setShowHelp((visible) => !visible);
          }}
        >
          Review Controls
        </button>
      </div>
      {showLayouts ? (
        <div className="watch-end-options" aria-label="Choose Layout">
          {snapshot.layouts.map((layout) => (
            <button
              key={layout.id}
              type="button"
              className="speed-pill"
              onClick={() =>
                recover(() => actions?.selectLayout(layout.id))
              }
            >
              {layout.name}
            </button>
          ))}
        </div>
      ) : null}
      {showHelp ? (
        <div className="watch-end-help" role="region" aria-label="Watch controls">
          <p>
            Place from the Armory. Tap a Tower to select it. Drag a Tower to
            relocate. Use Scout to pan. Start each Wave from the Hold control.
          </p>
          <p>
            Keyboard: 1–5 Armory, V Scout, Space pause, U upgrade, M mute,
            and Escape clear.
          </p>
        </div>
      ) : null}
    </dialog>
  );
}
