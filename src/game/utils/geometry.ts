import type { Point } from "../types";

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function distanceXY(x1: number, y1: number, x2: number, y2: number): number {
  return Math.hypot(x1 - x2, y1 - y2);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function pointToSegmentDistance(point: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const apx = point.x - a.x;
  const apy = point.y - a.y;
  const lengthSq = abx * abx + aby * aby;
  const t =
    lengthSq === 0 ? 0 : clamp((apx * abx + apy * aby) / lengthSq, 0, 1);
  const nearest = { x: a.x + abx * t, y: a.y + aby * t };
  return distance(point, nearest);
}

export function pointInCircle(
  point: Point,
  center: Point,
  radius: number,
): boolean {
  return distance(point, center) <= radius;
}
