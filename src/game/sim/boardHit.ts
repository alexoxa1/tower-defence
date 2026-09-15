import { findTowerAt } from "../systems/placement";
import type { GameState, Point } from "../types";

export type BoardHit =
  | { kind: "upgrade"; towerId: string }
  | { kind: "tower"; towerId: string; point: Point }
  | { kind: "ground"; point: Point }
  | { kind: "none" };

/** Screen pixels in, logical board facts out. */
export interface BoardHitTest {
  toLogical(clientX: number, clientY: number): Point | null;
  hit(clientX: number, clientY: number): BoardHit;
}

/** Treats client coordinates as logical board points. No Three.js. */
export function createLogicalHitTest(getState: () => GameState): BoardHitTest {
  return {
    toLogical(clientX, clientY) {
      return { x: clientX, y: clientY };
    },
    hit(clientX, clientY) {
      const point = { x: clientX, y: clientY };
      const tower = findTowerAt(getState(), point);
      if (tower) {
        return { kind: "tower", towerId: tower.id, point: { x: tower.x, y: tower.y } };
      }
      return { kind: "ground", point };
    },
  };
}
