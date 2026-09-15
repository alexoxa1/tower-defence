import { useEffect } from "react";
import type { BoardInput } from "../game/hud/commands";
import type { InteractionMode } from "../game/types";

interface GameCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  input: BoardInput | null;
  isDragging: boolean;
  isPanning: boolean;
  interactionMode: InteractionMode;
}

export function GameCanvas({
  canvasRef,
  input,
  isDragging,
  isPanning,
  interactionMode,
}: GameCanvasProps) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !input) return;

    const onMove = (e: PointerEvent) => {
      input.handleScreenPointer("move", e.clientX, e.clientY);
    };

    const onDown = (e: PointerEvent) => {
      if (e.button === 1) e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      input.handleScreenPointer("down", e.clientX, e.clientY, {
        button: e.button,
        ctrlKey: e.ctrlKey,
        metaKey: e.metaKey,
        altKey: e.altKey,
        shiftKey: e.shiftKey,
      });
    };

    const onUp = (e: PointerEvent) => {
      input.handleScreenPointer("up", e.clientX, e.clientY);
      try {
        canvas.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      input.handleWheel(e.deltaY);
    };

    const onLeave = () => {
      input.handlePointerMove({ x: -999, y: -999 });
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    canvas.addEventListener("pointerleave", onLeave);

    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [input, canvasRef]);

  const className = [
    "game-canvas",
    isDragging ? "is-dragging" : "",
    isPanning ? "is-panning" : "",
    interactionMode === "scout" ? "is-scouting" : "",
    interactionMode === "tower" || interactionMode === "multi"
      ? "has-selection"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <canvas
      ref={canvasRef}
      className={className}
      tabIndex={0}
      aria-label="Tower defense game board. Drag to pan, scroll to zoom. Pick a battery to build."
    />
  );
}
