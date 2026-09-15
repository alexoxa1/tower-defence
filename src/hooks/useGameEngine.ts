import { useEffect, useRef, useState } from "react";
import { GameEngine } from "../game/GameEngine";
import type { GameActions } from "../game/hud/commands";
import { buildUiSnapshot } from "../game/hud/snapshot";
import type { UiSnapshot } from "../game/types";
import { createInitialState } from "../game/state/createInitialState";

function emptySnapshot(): UiSnapshot {
  return buildUiSnapshot(createInitialState(), {
    toast: null,
    muted: false,
    isPanning: false,
  });
}

export function useGameEngine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [snapshot, setSnapshot] = useState<UiSnapshot>(emptySnapshot);
  const [actions, setActions] = useState<GameActions | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, setSnapshot);
    engineRef.current = engine;
    setActions(engine.actions);
    engine.start();

    return () => {
      engine.stop();
      engineRef.current = null;
      setActions(null);
    };
  }, []);

  return { snapshot, actions, canvasRef };
}
