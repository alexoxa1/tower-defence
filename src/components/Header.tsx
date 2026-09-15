import { useRef, useState, type MouseEvent } from "react";
import { GearSix, Question, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
import type { HudCommands } from "../game/hud/commands";
import type { UiSnapshot } from "../game/types";

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
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
}) {
  const settingsRef = useRef<HTMLDialogElement>(null);
  const helpRef = useRef<HTMLDialogElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const label = statusLabel(snapshot);
  const canStart = snapshot.canStartWave && !snapshot.paused;

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
      <div className="hud-tools">
        <button
          type="button"
          className="icon-btn"
          aria-label="Settings"
          onClick={() => {
            setConfirmReset(false);
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
          Click the board to place a tower. Drag a placed tower to move it. Click
          ↑ to upgrade. Drag empty ground to pan. Pick a tower in the Armory, or
          press <kbd>4</kbd> for Scout. Scroll to zoom.{" "}
          <kbd>W</kbd>
          <kbd>A</kbd>
          <kbd>S</kbd>
          <kbd>D</kbd> also pan, <kbd>Home</kbd> resets the view.{" "}
          <kbd>Ctrl</kbd>+click or right-click a tower for multi-select. Speed{" "}
          <kbd>[</kbd>
          <kbd>]</kbd>, mute <kbd>M</kbd>, towers <kbd>1</kbd>
          <kbd>2</kbd>
          <kbd>3</kbd>, pause <kbd>Space</kbd>, upgrade <kbd>U</kbd>, clear{" "}
          <kbd>Esc</kbd>.
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
