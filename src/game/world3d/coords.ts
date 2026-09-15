import * as THREE from "three";
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from "../constants";
import type { Point } from "../types";

export const WORLD_SCALE = 0.058;

export function logicalToWorld(x: number, y: number, height = 0): THREE.Vector3 {
  return new THREE.Vector3(
    (x - LOGICAL_WIDTH / 2) * WORLD_SCALE,
    height,
    (y - LOGICAL_HEIGHT / 2) * WORLD_SCALE,
  );
}

export function worldToLogical(wx: number, wz: number): Point {
  return {
    x: wx / WORLD_SCALE + LOGICAL_WIDTH / 2,
    y: wz / WORLD_SCALE + LOGICAL_HEIGHT / 2,
  };
}

export function logicalRadius(px: number): number {
  return px * WORLD_SCALE;
}
