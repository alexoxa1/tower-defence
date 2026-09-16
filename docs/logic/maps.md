# Layouts and the Road

A Layout is a named Road plan. Simulation owns the waypoints. HUD gets `{ id, name }` only. The 3D view displays `state.road` and rebuilds meshes when `layoutId` changes.

## Schema

`src/game/config/layouts.ts`:

- `id`: `serpentine` | `switchback` | `oxbow`
- `name`, `blurb`
- `road`: In to Out waypoints in logical 1400×1000 space

`createInitialState({ layoutId })` copies that Road onto `GameState.road`. Enemies walk `state.road`. Placement tests Road clearance against `state.road`.

## Switching

`HudCommands.selectLayout(id)` starts a new Watch on that Layout. It does not morph a live Wave. Settings confirm if a Wave has started or towers exist.

## Adding a Layout

1. Add an id to `LayoutId`.
2. Add waypoints and catalog copy in `layouts.ts`.
3. Append the id to `LAYOUT_ORDER`.
4. No HUD or 3D geometry tables. `WorldRenderer.sync` rebuilds from `state.road`.
