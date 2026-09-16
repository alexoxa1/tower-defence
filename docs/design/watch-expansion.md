# Watch expansion: pointer, layouts, Armory

Usage first. Types follow. Bodies in source replace `not implemented` notes below.

## Usage

Canvas still talks only to `BoardInput.handleScreenPointer`. HUD still talks only to `HudCommands`. The 3D view still reads `GameState` and never owns gold, lives, Waves, or placement legality.

```ts
// Tap a tower: select, do not relocate.
pointerDown(state, clickPoint, { button: 0, ctrlKey: false, metaKey: false }, ports);
pointerUp(state, clickPoint, ports);
// state.towers[0] still at origin. selectedTowerIds has that tower.

// Drag past RELOCATE_THRESHOLD from the *press point*: relocate.
pointerDown(state, press, left, ports);
pointerMove(state, { x: press.x + 40, y: press.y });
pointerUp(state, { x: press.x + 40, y: press.y }, ports);

// New Watch on another Road plan (HUD sends id only).
actions.selectLayout("switchback");

// Armory data drives combat. No per-type combat file.
state.selectedBuildType = "lantern";
buildTower(state, openGround, ports);
```

`GameEngine.handleScreenPointer` translates screen pixels to a logical point, then calls those functions. It does not decide select vs relocate.

## Shape

`DragState` is a discriminated union: `idle` | `pending` | `relocating`. Press on a tower selects and arms `pending` with the actual press point. Relocate starts only after pointer travel exceeds `RELOCATE_THRESHOLD` from that press point. Commit uses `origin + (current - press)`, never click-offset from the tower center.

Road geometry lives on `GameState.road`, chosen by `layoutId` from `src/game/config/layouts.ts`. `Enemy` walks `state.road`. `WorldRenderer` rebuilds Road meshes when `layoutId` changes. `UiSnapshot.layouts` is `{ id, name }[]` only.

Tower combat profiles live on `TOWER_TYPES` (`slowDuration`, splash, optional aura). `Tower.update` reads stats. New Armory entries: Ward Beacon (range aura) and Frost Lantern (Slow aura).

Settings stay in the Header dialog: mute, reduced motion, layout pick (new Watch), reset. Speed stays on the command rack.

## Module map

| Module | Owns |
| --- | --- |
| `src/game/sim/pointer.ts` | Pointer state machine |
| `src/game/systems/placement.ts` | Place and relocate legality |
| `src/game/sim/preview.ts` | Build ghost and relocate ghost flags |
| `src/game/config/layouts.ts` | Named Road plans |
| `src/game/constants.ts` | Armory numeric profiles |
| `src/game/config/armory.ts` | HUD catalog copy |
| `src/game/entities/Tower.ts` | Fire and auras from stats |
| `src/game/world3d/WorldRenderer.ts` | Ghost, range, Road meshes, reduced motion |
| `src/components/Header.tsx` | Settings surface |

## Invariants

- Tap never commits `moveTowers`.
- Relocate costs no gold (ADR 0003).
- HUD never receives waypoints.
- 3D view never validates placement.
- Auth and database stay out (ADR 0004).
