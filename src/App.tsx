import { useEffect } from "react";
import { ControlsPanel } from "./components/ControlsPanel";
import { GameCanvas } from "./components/GameCanvas";
import { GameOverOverlay } from "./components/GameOverOverlay";
import { Header } from "./components/Header";
import { SelectionPanel } from "./components/SelectionPanel";
import { ShopPanel } from "./components/ShopPanel";
import { StatsPanel } from "./components/StatsPanel";
import { Toast } from "./components/Toast";
import { useGameEngine } from "./hooks/useGameEngine";
import "@fontsource/syne/700.css";
import "@fontsource/syne/800.css";
import "@fontsource/ibm-plex-mono/600.css";
import "@fontsource/ibm-plex-mono/700.css";
import "./styles/tokens.css";
import "./styles/app.css";

export default function App() {
  const { snapshot, actions, canvasRef } = useGameEngine();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!actions) return;
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
  }, [actions]);

  return (
    <main className="app">
      <h1 className="visually-hidden">Citadel Watch</h1>
      <a className="skip-link" href="#board">
        Skip to board
      </a>
      <div className="game-container">
        <section className="stage" id="board">
          <GameCanvas
            canvasRef={canvasRef}
            input={actions}
            isDragging={snapshot.isDragging}
            isPanning={snapshot.isPanning}
            interactionMode={snapshot.interactionMode}
          />
          <Header snapshot={snapshot} actions={actions} />
          <StatsPanel snapshot={snapshot} />
          <Toast message={snapshot.toast} />
          <GameOverOverlay snapshot={snapshot} actions={actions} />
        </section>
        <aside className="ui-panel" aria-label="Command rack">
          <ShopPanel snapshot={snapshot} actions={actions} />
          <ControlsPanel snapshot={snapshot} actions={actions} />
          <SelectionPanel snapshot={snapshot} actions={actions} />
        </aside>
      </div>
    </main>
  );
}
