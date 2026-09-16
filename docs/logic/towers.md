# Towers

Combat numbers live on `TOWER_TYPES` in `src/game/constants.ts`. HUD copy lives in `src/game/config/armory.ts`. Meshes live in `src/game/world3d/models.ts`. Do not add a combat file per type.

## Profiles

Each type has Range, fire rate, damage, projectile speed, splash, `slowDuration` (on hit), and optional aura fields (`auraRadius`, `auraRangeBonus`, `auraSlowFactor`, `auraSlowDuration`). `fireRate` of 0 means the tower does not shoot.

- Hex Gun (`basic`): fast, short Range
- Mortar Post (`cannon`): splash
- Rail Sniper (`sniper`): long Range, Slow on hit
- Ward Beacon (`beacon`): Range aura for nearby towers
- Frost Lantern (`lantern`): Slow aura, no projectile

`getTowerStats` scales by Level. `getEffectiveStats` adds Beacon Range bonuses. `Tower.update` reads those stats.

## Tick

`advanceWatch` updates enemies, then towers, then projectiles. Auras apply in `Tower.update` before targeting. Placement legality stays in `validatePlacement`.

## Adding a tower

1. Extend `TowerType`.
2. Add a `TOWER_TYPES` row and an `ARMORY` row. `ARMORY_ORDER` drives hotkeys 1–n.
3. Add `makeX` and a branch in `makeTower`.
4. Prefer new numbers on the profile over a new combat branch.
