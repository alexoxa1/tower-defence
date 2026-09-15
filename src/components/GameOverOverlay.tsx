import { useEffect, useRef } from "react";
import type { HudCommands } from "../game/hud/commands";
import type { UiSnapshot } from "../game/types";
import { formatNumber } from "../game/utils/format";

export function GameOverOverlay({
  snapshot,
  actions,
}: {
  snapshot: UiSnapshot;
  actions: HudCommands | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (snapshot.gameOver && !dialog.open) {
      dialog.showModal();
      dialog.querySelector("button")?.focus();
    }
    if (!snapshot.gameOver && dialog.open) dialog.close();
  }, [snapshot.gameOver]);

  return (
    <dialog
      ref={dialogRef}
      className="game-over-screen"
      aria-labelledby="game-over-title"
      aria-modal="true"
    >
      <h2 id="game-over-title">Rift Broken</h2>
      <p>
        Score {formatNumber(snapshot.score)} · Waves{" "}
        {Math.max(0, snapshot.wave - 1)} · Kills {snapshot.kills}
      </p>
      <button type="button" className="action" onClick={() => actions?.resetGame()}>
        Play Again
      </button>
    </dialog>
  );
}
