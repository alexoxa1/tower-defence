import { CAMPAIGN_WAVES } from "../constants";
import type { EnemyKind } from "../types";

export interface WavePlan {
  name: string;
  count: number;
  gap: number;
  roster: EnemyKind[];
  boss?: EnemyKind;
}

export const WAVE_PLANS: WavePlan[] = [
  { name: "Rift Drip", count: 8, gap: 0.72, roster: ["creep"] },
  { name: "Split Pack", count: 10, gap: 0.64, roster: ["creep", "runner"] },
  { name: "Ash Gnats", count: 12, gap: 0.5, roster: ["swarm", "creep", "swarm"] },
  { name: "Iron Line", count: 12, gap: 0.58, roster: ["creep", "brute", "runner"] },
  { name: "Warden Gate", count: 14, gap: 0.52, roster: ["warden", "creep"], boss: "colossus" },
  { name: "Shade Drift", count: 16, gap: 0.42, roster: ["shade", "runner", "swarm"] },
  { name: "Bolt Choir", count: 16, gap: 0.46, roster: ["runner", "swarm", "creep"] },
  { name: "Basalt Guard", count: 18, gap: 0.48, roster: ["warden", "brute", "creep"] },
  { name: "Rift Storm", count: 20, gap: 0.4, roster: ["swarm", "runner", "shade", "creep"] },
  { name: "Twin Colossi", count: 16, gap: 0.44, roster: ["brute", "warden"], boss: "colossus" },
  { name: "Night Harvest", count: 22, gap: 0.36, roster: ["shade", "swarm", "runner"] },
  { name: "Siege March", count: 20, gap: 0.42, roster: ["warden", "brute", "creep", "runner"] },
  { name: "Crimson Tide", count: 24, gap: 0.34, roster: ["creep", "swarm", "runner", "shade"] },
  { name: "Crown Guard", count: 18, gap: 0.4, roster: ["warden", "brute", "colossus"] },
  { name: "Overlord", count: 16, gap: 0.38, roster: ["warden", "shade", "brute"], boss: "overlord" },
];

export function getWavePlan(wave: number): WavePlan {
  if (wave <= WAVE_PLANS.length) return WAVE_PLANS[wave - 1];
  const cycle = ((wave - 1) % CAMPAIGN_WAVES) + 1;
  const base = WAVE_PLANS[cycle - 1];
  const extra = Math.floor((wave - 1) / CAMPAIGN_WAVES);
  return {
    ...base,
    name: extra > 0 ? `${base.name} +${extra}` : base.name,
    count: base.count + extra * 4,
    gap: Math.max(0.22, base.gap - extra * 0.03),
    boss: wave % 5 === 0 ? "overlord" : base.boss,
  };
}

export function getWaveTitle(wave: number): string {
  if (wave <= 0) return "Hold";
  return getWavePlan(wave).name;
}
