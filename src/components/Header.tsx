import { useRef, useState, type MouseEvent } from "react";
import { Eye, EyeSlash, GearSix, House, Minus, Plus, Question, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import type { HudCommands } from "../game/hud/commands";
import type { LayoutId, UiSnapshot } from "../game/types";

function statusLabel(snapshot: UiSnapshot): string {
  if (snapshot.gameOver) return "RIFT";
  if (snapshot.paused) return "PAUSED";
  if (snapshot.waveActive) return "WAVE";
  return snapshot.wave === 0 ? "HOLD" : "NEXT";
}

function statusAction(snapshot: UiSnapshot): string {
  if (snapshot.gameOver) return "Rift Broken";
  if (snapshot.paused) return "Resume";
  if (snapshot.waveActive) return "Pause";
  return snapshot.wave === 0 ? "Start wave" : "Start next wave";
}

export function Header({
  snapshot,
  actions,
  hudHidden,
  onToggleHud,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
  hudHidden: boolean;
  onToggleHud: () => void;
}) {
  const settingsRef = useRef<HTMLDialogElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmLayout, setConfirmLayout] = useState<LayoutId | null>(null);

  const label = statusLabel(snapshot);
  const canStart = snapshot.canStartWave && !snapshot.paused;
  const layoutNeedsConfirm = snapshot.wave > 0 || snapshot.towerCount > 0;

  const onStatus = () => {
    if (snapshot.gameOver) return;
    if (snapshot.paused || snapshot.waveActive) {
      actions?.togglePause();
      return;
    }
    if (canStart) actions?.startWave();
  };

  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) event.currentTarget.close();
  };

  const pickLayout = (id: LayoutId) => {
    if (id === snapshot.layoutId) return;
    if (layoutNeedsConfirm && confirmLayout !== id) {
      setConfirmLayout(id);
      window.setTimeout(() => setConfirmLayout(null), 2200);
      return;
    }
    setConfirmLayout(null);
    actions?.selectLayout(id);
    settingsRef.current?.close();
  };

  return (
    <header className="hud-tl">
      <button
        type="button"
        className="status-box"
        onClick={onStatus}
        disabled={snapshot.gameOver}
        aria-label={statusAction(snapshot)}
      >
        {label}
      </button>
      <button
        type="button"
        className="hud-show-pill"
        aria-label="Show HUD"
        onClick={onToggleHud}
      >
        <EyeSlash size={15} weight="bold" aria-hidden="true" />
        Show HUD
      </button>
      <div className="hud-tools">
        <button
          type="button"
          className="icon-btn"
          aria-label={hudHidden ? "Show HUD" : "Hide HUD"}
          aria-pressed={hudHidden}
          onClick={onToggleHud}
        >
          {hudHidden ? (
            <EyeSlash size={15} weight="bold" aria-hidden="true" />
          ) : (
            <Eye size={15} weight="bold" aria-hidden="true" />
          )}
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="Settings"
          onClick={() => {
            setConfirmReset(false);
            setConfirmLayout(null);
            settingsRef.current?.showModal();
          }}
        >
          <GearSix size={15} weight="bold" aria-hidden="true" />
        </button>
        <button
          type="button"
          className="icon-btn"
          aria-label="How to play"
          onClick={() => helpRef.current?.showModal()}
        >
          <Question size={15} weight="bold" aria-hidden="true" />
        </button>
        <div className="view-cluster" role="group" aria-label="Board view">
          <button
            type="button"
            className="icon-btn"
            aria-label="Zoom out"
            onClick={() => actions?.zoomOut()}
          >
            <Minus size={15} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Reset board view"
            onClick={() => actions?.resetView()}
          >
            <House size={15} weight="bold" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Zoom in"
            onClick={() => actions?.zoomIn()}
          >
            <Plus size={15} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>

      <dialog
        ref={settingsRef}
        className="hud-dialog"
        aria-labelledby="settings-title"
        onClick={closeOnBackdrop}
      >
        <h2 id="settings-title" className="section-title">
          Settings
        </h2>
        <div className="dialog-actions">
          <button
            type="button"
            className="action secondary"
            onClick={() => actions?.toggleMute()}
            aria-pressed={snapshot.muted}
            aria-label={snapshot.muted ? "Unmute audio" : "Mute audio"}
          >
            {snapshot.muted ? (
              <SpeakerSlash size={16} weight="bold" aria-hidden="true" />
            ) : (
              <SpeakerHigh size={16} weight="bold" aria-hidden="true" />
            )}
            {snapshot.muted ? "Unmute" : "Mute"}
          </button>
          <button
            type="button"
            className="action secondary"
            onClick={() => actions?.setReducedMotion(!snapshot.reducedMotion)}
            aria-pressed={snapshot.reducedMotion}
            aria-label={
              snapshot.reducedMotion ? "Turn motion on" : "Reduce motion"
            }
          >
            {snapshot.reducedMotion ? "Motion On" : "Reduce Motion"}
          </button>
          <p className="settings-label" id="layout-label">
            Road plan. Starts a new Watch.
          </p>
          <div className="layout-row" role="group" aria-labelledby="layout-label">
            {snapshot.layouts.map((layout) => {
              const armed = confirmLayout === layout.id;
              const current = snapshot.layoutId === layout.id;
              return (
                <button
                  key={layout.id}
                  type="button"
                  className={`speed-pill${current ? " active" : ""}`}
                  aria-pressed={current}
                  aria-label={
                    armed
                      ? `Confirm ${layout.name}. Starts a new Watch.`
                      : `${layout.name} Road plan`
                  }
                  onClick={() => pickLayout(layout.id)}
                >
                  {armed ? "Confirm" : layout.name}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="action danger"
            onClick={() => {
              if (!confirmReset) {
                setConfirmReset(true);
                window.setTimeout(() => setConfirmReset(false), 2200);
                return;
              }
              setConfirmReset(false);
              actions?.resetGame();
              settingsRef.current?.close();
            }}
          >
            {confirmReset ? "Confirm Reset" : "Reset"}
          </button>
          <button
            type="button"
            className="action secondary"
            onClick={() => settingsRef.current?.close()}
          >
            Close
          </button>
        </div>
      </dialog>

      <dialog
        ref={helpRef}
        className="hud-dialog"
        aria-labelledby="help-title"
        onClick={closeOnBackdrop}
      >
        <h2 id="help-title" className="section-title">
          How to play
        </h2>
        <p className="help-copy">
          Place from the Armory. On a mouse: click empty ground to place, drag
          empty ground to pan, scroll to zoom. On a phone: drag to aim the ghost,
          lift to place, two fingers pan and pinch-zoom. Use + / − / home on the
          board if pinch is awkward. Tap a tower to select. Drag it to relocate.
          Upgrade and sell from the command rack. Pick Scout in the Armory to pan
          without placing. Keyboard: <kbd>V</kbd> Scout, <kbd>1</kbd> to{" "}
          <kbd>5</kbd> Armory, <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> pan, <kbd>Home</kbd> reset view, <kbd>H</kbd> hide HUD,{" "}
          <kbd>Ctrl</kbd>+click to link towers, right-click or long-press for the
          board menu, Speed <kbd>[</kbd>
          <kbd>]</kbd>, mute <kbd>M</kbd>, pause <kbd>Space</kbd>, upgrade{" "}
          <kbd>U</kbd>, clear <kbd>Esc</kbd>.
        </p>
        <button
          type="button"
          className="action"
          onClick={() => helpRef.current?.close()}
        >
          Close
        </button>
      </dialog>
    </header>
  );
}
