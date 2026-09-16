import type { LayoutId, Point } from "../types";

export interface WatchLayout {
  id: LayoutId;
  name: string;
  blurb: string;
  road: readonly Point[];
}

const SERPENTINE: readonly Point[] = [
  { x: -40, y: 200 },
  { x: 340, y: 200 },
  { x: 340, y: 560 },
  { x: 640, y: 560 },
  { x: 640, y: 300 },
  { x: 980, y: 300 },
  { x: 980, y: 760 },
  { x: 1280, y: 760 },
  { x: 1280, y: 440 },
  { x: 1440, y: 440 },
];

const SWITCHBACK: readonly Point[] = [
  { x: -40, y: 140 },
  { x: 220, y: 140 },
  { x: 220, y: 860 },
  { x: 500, y: 860 },
  { x: 500, y: 140 },
  { x: 780, y: 140 },
  { x: 780, y: 860 },
  { x: 1060, y: 860 },
  { x: 1060, y: 480 },
  { x: 1440, y: 480 },
];

const OXBOW: readonly Point[] = [
  { x: -40, y: 520 },
  { x: 260, y: 520 },
  { x: 260, y: 180 },
  { x: 740, y: 180 },
  { x: 740, y: 840 },
  { x: 260, y: 840 },
  { x: 260, y: 640 },
  { x: 1080, y: 640 },
  { x: 1080, y: 280 },
  { x: 1440, y: 280 },
];

export const LAYOUTS: Record<LayoutId, WatchLayout> = {
  serpentine: {
    id: "serpentine",
    name: "Serpentine",
    blurb: "Long bends. The original Watch ground.",
    road: SERPENTINE,
  },
  switchback: {
    id: "switchback",
    name: "Switchback",
    blurb: "Tight vertical folds. Short sight lines.",
    road: SWITCHBACK,
  },
  oxbow: {
    id: "oxbow",
    name: "Oxbow",
    blurb: "A loop then a run to Out.",
    road: OXBOW,
  },
};

export const LAYOUT_ORDER: LayoutId[] = ["serpentine", "switchback", "oxbow"];

export const DEFAULT_LAYOUT_ID: LayoutId = "serpentine";

export function getLayout(id: LayoutId): WatchLayout {
  return LAYOUTS[id];
}

export function layoutSummaries(): { id: LayoutId; name: string }[] {
  return LAYOUT_ORDER.map((id) => ({ id, name: LAYOUTS[id].name }));
}
