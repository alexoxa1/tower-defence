# Watch expansion rationale

## Problem

Pressing a tower relocates it. `pointerDown` starts a drag immediately and `pointerUp` measures the click against the tower center with a 4-unit threshold, so a tap inside the footprint looks like a move. The Watch also has one Road and three Armory types. Expansion has to stay on existing seams: simulation owns rules, `GameEngine` is a thin adapter, the 3D view displays, HUD is snapshot plus commands.

## Usage (caller's view)

See `docs/design/watch-expansion.md`. Canvas keeps `handleScreenPointer`. HUD keeps `HudCommands` plus `selectLayout` and `setReducedMotion`. Tests drive `pointerDown` / `pointerMove` / `pointerUp` on `GameState` with no canvas.

## Shape

Intent-gated pointer: one module hides the click-vs-drag policy behind `pointerDown` / `pointerMove` / `pointerUp`. `DragState` is a sum type so idle/pending/relocating cannot be confused. Layouts are config records; `GameState` holds `layoutId` and `road`. Combat stays data on `TOWER_TYPES` so a new tower is a catalog row, a mesh factory, and Armory copy.

Public surface stays small: no relocate mode on HUD, no waypoint lists in the snapshot, no new UI library.

## Synthesis decision

Both arena packages returned after fill-in was already in progress. They still match the pick.

Base: the intent-gated pointer package (`idle` / `pending` / `relocating`, catalogs for Roads and combat). Smaller interface. Relocate remains a drag on a selected tower, which matches ADR 0003 and the help copy.

Grafted from that package: latch once `relocating` so jitter around the threshold cannot drop back to a tap; `hit.point` as the press origin, never the tower center; Field/Slow as profile numbers.

Grafted from the explicit Relocate-mode package: `createInitialState({ layoutId })`; settings fields on `UiSnapshot` (`layoutId`, `layouts`, `reducedMotion`) rather than a second HUD store. Layout change is a new Watch.

Rejected from Relocate-mode: `beginRelocate`, `InteractionMode` relocate, `PlayerSettings` persistence, per-layout Campaign tables. Extra HUD surface for a gesture the product already describes as drag. Callers would coordinate select then Relocate. Shallower module.

Rejected: mutable module-level `PATH`. Multiple Road plans would leak into every importer and fight tests.

Deviation from the intent-gated package: after the threshold, committed meshes follow the proposed point instead of staying at origin with ghost-only. Pending still holds origin, so a tap cannot look like a move.

## Tradeoffs accepted

- We accept a drag threshold (16 logical units) in exchange for tap-to-select that never relocates.
- We accept rebuilding Road meshes on layout change instead of morphing them. Layout change already starts a new Watch.
- We accept two aura towers instead of chain-lightning or targeting modes. Those need new combat branches.
- We accept Scout leaving number key 4 so 1–5 map onto Armory order. Scout stays the Scout card and `V`.

## Alternatives considered

- **Explicit Relocate mode.** Hides less: HUD must know a second mode. Lost because ADR 0003 is drag-to-move, not a tool.
- **Pickup on second click.** Adds a temporal protocol callers have to learn. Lost to press-and-drag after threshold.
- **Per-type combat modules.** Hides little once splash and Slow are data. Lost to profiles on `TOWER_TYPES`.

## Open questions and risks

- Should layout change be allowed mid-Wave without a full reset? Chosen: new Watch only, same as Reset.
- Aura stacking if several Ward Beacons overlap. Chosen: bonuses add. Cheap and readable.

## Next implementation step

Done. Pointer tests lock tap vs relocate, including the relocating latch. Further work is leftover, not sketch fill-in: per-layout Wave tables, persist Speed across a new Watch.
