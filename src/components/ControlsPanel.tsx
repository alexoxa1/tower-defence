import { House, Minus, Plus } from "@phosphor-icons/react";
import { SPEED_OPTIONS } from "../game/constants";
import type { HudCommands } from "../game/hud/commands";
import type { UiSnapshot } from "../game/types";

export function ControlsPanel({
  snapshot,
  actions,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
}) {
  return (
    <section className="speed-panel" aria-label="Speed">
      <p className="section-title">Speed</p>
      <div className="speed-row" role="group" aria-label="Watch speed">
        {SPEED_OPTIONS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`speed-pill${snapshot.speed === speed ? " active" : ""}`}
            onClick={() => actions?.setSpeed(speed)}
            aria-pressed={snapshot.speed === speed}
            aria-label={`${speed} times speed`}
          >
            {speed}x
          </button>
        ))}
      </div>
      <div className="sheet-zoom" role="group" aria-label="Board view">
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
    </section>
  );
}
