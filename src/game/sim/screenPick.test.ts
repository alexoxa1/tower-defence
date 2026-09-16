import { describe, expect, it } from "vitest";
import { nearestIdByScreen, TOWER_PICK_SLOP_PX } from "./screenPick";

describe("nearestIdByScreen", () => {
  const items = [
    { id: "a", x: 100, y: 100 },
    { id: "b", x: 140, y: 100 },
  ];

  it("returns the closest id inside the slop", () => {
    expect(nearestIdByScreen(items, 108, 104, TOWER_PICK_SLOP_PX)).toBe("a");
  });

  it("returns null when every item is outside the slop", () => {
    expect(nearestIdByScreen(items, 400, 400, TOWER_PICK_SLOP_PX)).toBeNull();
  });

  it("includes the slop boundary", () => {
    expect(nearestIdByScreen([{ id: "edge", x: 0, y: 0 }], 28, 0, 28)).toBe("edge");
    expect(nearestIdByScreen([{ id: "edge", x: 0, y: 0 }], 28.1, 0, 28)).toBeNull();
  });
});
