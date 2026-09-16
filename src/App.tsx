import { useCallback, useEffect, useState } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { GameCanvas } from "./components/GameCanvas";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { Header } from "./components/Header";
import { QuickMenu } from "./components/QuickMenu";
import { SelectionPanel } from "./components/SelectionPanel";
import { ShopPanel } from "./components/ShopPanel";
import { StatsPanel } from "./components/StatsPanel";
import { Toast } from "./components/Toast";
import { SignOutControl } from "./auth/SignOutControl";
import { useGameEngine } from "./hooks/useGameEngine";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
import "./styles/tokens.css";
import "./styles/app.css";

export default function App() {
  const { snapshot, actions, canvasRef } = useGameEngine();
  const [hudHidden, setHudHidden] = useState(false);

  const toggleHud = useCallback(() => {
    setHudHidden((hidden) => !hidden);
    actions?.closeQuickMenu();
  }, [actions]);

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

  return (
    <main className={hudHidden ? "app is-hud-hidden" : "app"}>
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
          <div className="hud-chrome">
            <Header
              snapshot={snapshot}
              actions={actions}
              hudHidden={hudHidden}
              onToggleHud={toggleHud}
            />
            <StatsPanel snapshot={snapshot} />
          </div>
          <SignOutControl />
          <Toast message={snapshot.toast} />
          <GameOverOverlay snapshot={snapshot} actions={actions} />
        </section>
        <aside className="ui-panel" aria-label="Command rack">
          <ShopPanel snapshot={snapshot} actions={actions} />
          <ControlsPanel snapshot={snapshot} actions={actions} />
          <SelectionPanel snapshot={snapshot} actions={actions} />
        </aside>
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
