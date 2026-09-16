import { describe, expect, it } from "vitest";
import type { BoardHit } from "./boardHit";
import type { PointerOptions } from "./pointer";
import type { InteractionMode, Point } from "../types";
import {
  ScreenPointerHub,
  TAP_SLOP_MOUSE_PX,
  TAP_SLOP_TOUCH_PX,
  emptyGroundMode,
  pinchZoomFactor,
  tapSlopPx,
  type ScreenPointerHost,
} from "./screenPointer";

type Call =
  | ["pan", number, number]
  | ["zoom", number]
  | ["upgrade", string]
  | ["down", Point, PointerOptions]
  | ["move", Point]
  | ["up", Point]
  | ["cancel"];

function createHost(mode: InteractionMode = "scout") {
  const calls: Call[] = [];
  let hit: BoardHit = { kind: "ground", point: { x: 200, y: 80 } };
  const host: ScreenPointerHost & {
    mode: InteractionMode;
    hitValue: BoardHit;
  } = {
    mode,
    hitValue: hit,
    interactionMode: () => host.mode,
    hit: () => host.hitValue,
    toLogical: (x, y) => ({ x, y }),
    pan: (dx, dy) => calls.push(["pan", dx, dy]),
    zoomByFactor: (factor) => calls.push(["zoom", factor]),
    upgradeTower: (id) => calls.push(["upgrade", id]),
    pointerDown: (point, options) => calls.push(["down", point, options]),
    pointerMove: (point) => calls.push(["move", point]),
    pointerUp: (point) => calls.push(["up", point]),
    cancelDrag: () => calls.push(["cancel"]),
  };
  host.hitValue = hit;
  return { host, calls };
}

const mouse: PointerOptions = {
  button: 0,
  ctrlKey: false,
  metaKey: false,
  pointerType: "mouse",
  pointerId: 1,
};

const touch = (id: number): PointerOptions => ({
  button: 0,
  ctrlKey: false,
  metaKey: false,
  pointerType: "touch",
  pointerId: id,
});

describe("tap slop and empty-ground mode", () => {
  it("uses a larger slop on touch than on mouse", () => {
    expect(tapSlopPx("mouse")).toBe(TAP_SLOP_MOUSE_PX);
    expect(tapSlopPx("touch")).toBe(TAP_SLOP_TOUCH_PX);
    expect(TAP_SLOP_TOUCH_PX).toBeGreaterThan(TAP_SLOP_MOUSE_PX);
  });

  it("aims a place on coarse pointers in build mode", () => {
    expect(
      emptyGroundMode({
        pointerType: "touch",
        interactionMode: "build",
        button: 0,
      }),
    ).toBe("aim-place");
    expect(
      emptyGroundMode({
        pointerType: "mouse",
        interactionMode: "build",
        button: 0,
      }),
    ).toBe("pan-first");
    expect(
      emptyGroundMode({
        pointerType: "touch",
        interactionMode: "scout",
        button: 0,
      }),
    ).toBe("pan-first");
  });

  it("maps pinch-out to a zoom-in factor under 1", () => {
    expect(pinchZoomFactor(100, 200)).toBeCloseTo(0.5);
    expect(pinchZoomFactor(200, 100)).toBeCloseTo(2);
    expect(pinchZoomFactor(0, 40)).toBe(1);
  });
});

describe("ScreenPointerHub", () => {
  it("treats a mouse tap with jitter under slop as a click, not a pan", () => {
    const { host, calls } = createHost("build");
    const hub = new ScreenPointerHub(host);
    hub.handle("down", 40, 40, mouse);
    hub.handle("move", 42, 41, mouse);
    hub.handle("up", 42, 41, mouse);
    expect(calls.filter((c) => c[0] === "pan")).toHaveLength(0);
    expect(calls.some((c) => c[0] === "down")).toBe(true);
  });

  it("pans a mouse drag past slop and does not place", () => {
    const { host, calls } = createHost("build");
    const hub = new ScreenPointerHub(host);
    hub.handle("down", 40, 40, mouse);
    hub.handle("move", 48, 40, mouse);
    hub.handle("up", 48, 40, mouse);
    expect(calls.some((c) => c[0] === "pan")).toBe(true);
    expect(calls.some((c) => c[0] === "down")).toBe(false);
    expect(hub.isPanning()).toBe(false);
  });

  it("does not pan a touch tap with 10px jitter in Scout", () => {
    const { host, calls } = createHost("scout");
    const hub = new ScreenPointerHub(host);
    const a = touch(7);
    hub.handle("down", 40, 40, a);
    hub.handle("move", 50, 42, a);
    hub.handle("up", 50, 42, a);
    expect(calls.filter((c) => c[0] === "pan")).toHaveLength(0);
    expect(calls.some((c) => c[0] === "down")).toBe(true);
  });

  it("aims a ghost while dragging in touch build, then places on lift", () => {
    const { host, calls } = createHost("build");
    const hub = new ScreenPointerHub(host);
    const a = touch(3);
    hub.handle("down", 40, 40, a);
    hub.handle("move", 90, 70, a);
    hub.handle("up", 90, 70, a);
    expect(calls.filter((c) => c[0] === "pan")).toHaveLength(0);
    expect(calls.filter((c) => c[0] === "move").length).toBeGreaterThan(0);
    expect(calls.some((c) => c[0] === "down")).toBe(true);
    expect(calls.some((c) => c[0] === "up")).toBe(true);
  });

  it("pinches to zoom and does not place", () => {
    const { host, calls } = createHost("build");
    const hub = new ScreenPointerHub(host);
    hub.handle("down", 40, 40, touch(1));
    hub.handle("down", 80, 40, touch(2));
    hub.handle("move", 100, 40, touch(2));
    hub.handle("up", 100, 40, touch(2));
    hub.handle("up", 40, 40, touch(1));
    expect(calls.some((c) => c[0] === "zoom")).toBe(true);
    expect(calls.some((c) => c[0] === "down")).toBe(false);
  });

  it("selects a tower on down and completes on up", () => {
    const { host, calls } = createHost("scout");
    host.hitValue = {
      kind: "tower",
      towerId: "t1",
      point: { x: 12, y: 8 },
    };
    const hub = new ScreenPointerHub(host);
    hub.handle("down", 12, 8, mouse);
    hub.handle("up", 12, 8, mouse);
    expect(calls[0][0]).toBe("down");
    expect(calls.some((c) => c[0] === "up")).toBe(true);
  });

  it("turns a touch upgrade chevron hit into a tower select", () => {
    const { host, calls } = createHost("tower");
    host.hitValue = { kind: "upgrade", towerId: "t1" };
    const hub = new ScreenPointerHub(host);
    hub.handle("down", 12, 8, touch(4));
    expect(calls.some((c) => c[0] === "upgrade")).toBe(false);
    expect(calls.some((c) => c[0] === "down")).toBe(true);
  });

  it("still upgrades from the chevron with a mouse", () => {
    const { host, calls } = createHost("tower");
    host.hitValue = { kind: "upgrade", towerId: "t1" };
    const hub = new ScreenPointerHub(host);
    hub.handle("down", 12, 8, mouse);
    expect(calls).toEqual([["upgrade", "t1"]]);
  });
});
