import type { DragState, Point } from "../types";

export function idleDrag(): DragState {
  return { kind: "idle" };
}

export function dragOffset(drag: DragState): Point | null {
  if (drag.kind !== "relocating") return null;
  return {
    x: drag.currentPoint.x - drag.pressPoint.x,
    y: drag.currentPoint.y - drag.pressPoint.y,
  };
}

export function proposedRelocatePositions(
  drag: Extract<DragState, { kind: "relocating" }>,
): Map<string, Point> {
  const offset = dragOffset(drag);
  const next = new Map<string, Point>();
  if (!offset) return next;
  for (const [id, origin] of drag.originPositions) {
    next.set(id, { x: origin.x + offset.x, y: origin.y + offset.y });
  }
  return next;
}
