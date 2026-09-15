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
      <div className="speed-row" role="group" aria-label="Game speed">
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
    </section>
  );
}
