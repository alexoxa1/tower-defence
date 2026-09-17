import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play } from "@phosphor-icons/react";
import { ControlsPanel } from "./components/ControlsPanel";
import { GameCanvas } from "./components/GameCanvas";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { Header, runStatusAction, statusAction } from "./components/Header";
import { QuickMenu } from "./components/QuickMenu";
import { SelectionPanel } from "./components/SelectionPanel";
import { ShopPanel } from "./components/ShopPanel";
import { StatsPanel } from "./components/StatsPanel";
import { Toast } from "./components/Toast";
import { SignOutControl } from "./auth/SignOutControl";
import { ARMORY } from "./game/config/armory";
import type { UiSnapshot } from "./game/types";
import { formatNumber } from "./game/utils/format";
import { useGameEngine } from "./hooks/useGameEngine";
import "./styles/tokens.css";
import "./styles/app.css";

function sheetPeekCopy(snapshot: UiSnapshot): string {
  const selected = snapshot.selectedTowers;
  if (selected.length === 1) {
    const tower = selected[0];
    return `ARMORY · ${ARMORY[tower.type].name} · ${formatNumber(ARMORY[tower.type].cost)}`;
  }
  if (selected.length > 1) {
    return `ARMORY · ${selected.length} Towers`;
  }
  if (snapshot.selectedBuildType) {
    const item = ARMORY[snapshot.selectedBuildType];
    return `ARMORY · ${item.name} · ${formatNumber(item.cost)}`;
  }
  return "ARMORY · Scout · No build";
}

export default function App() {
  const { snapshot, actions, canvasRef } = useGameEngine();
  const [hudHidden, setHudHidden] = useState(false);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const selectionKey = snapshot.selectedBuildType
    ?? snapshot.selectedTowers.map((tower) => tower.id).join(",")
    ?? "";
  const prevSelectionKey = useRef(selectionKey);

  const toggleHud = useCallback(() => {
    setHudHidden((hidden) => !hidden);
    actions?.closeQuickMenu();
  }, [actions]);

  useEffect(() => {
    if (hudHidden) {
      setSheetExpanded(false);
      return;
    }
    if (selectionKey && selectionKey !== prevSelectionKey.current) {
      setSheetExpanded(true);
    } else if (!selectionKey && prevSelectionKey.current) {
      setSheetExpanded(false);
    }
    prevSelectionKey.current = selectionKey;
  }, [hudHidden, selectionKey]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!actions) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      ) {
        return;
      }
      if (
        (e.key === "h" || e.key === "H") &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.repeat
      ) {
        e.preventDefault();
        toggleHud();
        return;
      }
      if (snapshot.quickMenu) {
        if (e.key === "Escape") {
          e.preventDefault();
          actions.closeQuickMenu();
        }
        return;
      }
      if (
        e.code === "Space" ||
        e.code === "ArrowUp" ||
        e.code === "ArrowDown" ||
        e.code === "ArrowLeft" ||
        e.code === "ArrowRight" ||
        e.code === "Home"
      ) {
        e.preventDefault();
      }
      actions.handleKeyDown(e.key, e.code, e.ctrlKey || e.metaKey);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [actions, snapshot.quickMenu, toggleHud]);

  const thumbVerb = statusAction(snapshot);
  const thumbPause = snapshot.waveActive && !snapshot.paused;
  const appClass = [
    "app",
    hudHidden ? "is-hud-hidden" : "",
    sheetExpanded ? "is-sheet-expanded" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <main className={appClass}>
      <h1 className="visually-hidden">Citadel Watch</h1>
      <a className="skip-link" href="#board">
        Skip to board
      </a>
      <div
        className="game-container"
        inert={snapshot.quickMenu ? true : undefined}
      >
        <section className="stage" id="board">
          <GameCanvas
            canvasRef={canvasRef}
            input={actions}
            isDragging={snapshot.isDragging}
            isPanning={snapshot.isPanning}
            interactionMode={snapshot.interactionMode}
          />
          <div className="hud-ruler">
            <StatsPanel snapshot={snapshot} />
          </div>
          <div className="hud-account">
            <SignOutControl />
          </div>
          <div className="hud-chrome">
            <Header
              snapshot={snapshot}
              actions={actions}
              hudHidden={hudHidden}
              onToggleHud={toggleHud}
            />
          </div>
          <aside className="ui-panel" aria-label="Command rack">
            <button
              type="button"
              className="sheet-peek"
              aria-expanded={sheetExpanded}
              aria-controls="sheet-body"
              onClick={() => setSheetExpanded((open) => !open)}
            >
              <span className="sheet-handle" aria-hidden="true" />
              <span className="sheet-peek-label">{sheetPeekCopy(snapshot)}</span>
            </button>
            <div className="sheet-body" id="sheet-body">
              <SelectionPanel snapshot={snapshot} actions={actions} />
              <ShopPanel snapshot={snapshot} actions={actions} />
              <ControlsPanel snapshot={snapshot} actions={actions} />
            </div>
          </aside>
          {snapshot.gameOver ? null : (
            <button
              type="button"
              className={`start-wave-thumb${thumbPause ? " is-wave" : ""}`}
              onClick={() => runStatusAction(snapshot, actions)}
            >
              <span>{thumbVerb}</span>
              {thumbPause ? (
                <Pause size={18} weight="bold" aria-hidden="true" />
              ) : (
                <Play size={18} weight="bold" aria-hidden="true" />
              )}
            </button>
          )}
          <Toast message={snapshot.toast} />
          <GameOverOverlay snapshot={snapshot} actions={actions} />
        </section>
      </div>
      <QuickMenu
        snapshot={snapshot}
        actions={actions}
        hudHidden={hudHidden}
        onToggleHud={toggleHud}
        canvasRef={canvasRef}
      />
    </main>
  );
}
