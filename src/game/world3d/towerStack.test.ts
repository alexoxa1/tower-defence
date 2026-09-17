import { describe, expect, it } from "vitest";
import type { TowerType } from "../types";
import { towerStack, towerTier } from "./towerStack";

const TYPES: TowerType[] = ["basic", "cannon", "sniper", "beacon", "lantern"];

describe("towerStack", () => {
  it("maps Level 1-10 onto four tiers", () => {
    expect([1, 2, 3, 5, 6, 8, 9, 10].map(towerTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it("never shrinks as Level rises", () => {
    for (const type of TYPES) {
      let last = 0;
      for (let level = 1; level <= 10; level += 1) {
        const n = towerStack(type, level).base.length;
        expect(n).toBeGreaterThanOrEqual(last);
        last = n;
      }
      expect(towerStack(type, 1).base).toHaveLength(1);
      expect(towerStack(type, 10).base).toHaveLength(4);
    }
  });

  it("gives firing Towers a weapon and aura Towers a crown", () => {
    expect(towerStack("basic", 1).weapon).toBe("weapon-turret");
    expect(towerStack("cannon", 1).weapon).toBe("weapon-cannon");
    expect(towerStack("sniper", 1).weapon).toBe("weapon-ballista");
    expect(towerStack("beacon", 1).weapon).toBeNull();
    expect(towerStack("beacon", 1).crown).toBe("tower-round-crystals");
    expect(towerStack("lantern", 1).weapon).toBeNull();
    expect(towerStack("lantern", 1).crown).toBe("tower-round-roof-c");
  });
});
