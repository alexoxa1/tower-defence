import { useEffect, type RefObject } from "react";
import type { BoardInput } from "../game/hud/commands";
import type { PointerOptions } from "../game/sim/pointer";
import type { InteractionMode } from "../game/types";

interface GameCanvasProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  input: BoardInput | null;
  isDragging: boolean;
  isPanning: boolean;
  interactionMode: InteractionMode;
}

function pointerOptions(e: PointerEvent): PointerOptions {
  return {
    button: e.button,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
    pointerType: e.pointerType,
    pointerId: e.pointerId,
  };
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
      input.handleScreenPointer("move", e.clientX, e.clientY, pointerOptions(e));
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || e.button === 1) e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      input.handleScreenPointer("down", e.clientX, e.clientY, pointerOptions(e));
    };

    const onUp = (e: PointerEvent) => {
      input.handleScreenPointer("up", e.clientX, e.clientY, pointerOptions(e));
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

    const onLeave = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
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
      aria-label="Citadel Watch board. Drag to pan. Pinch or use plus and minus to zoom. Pick a tower in the Armory to build."
    />
  );
}
