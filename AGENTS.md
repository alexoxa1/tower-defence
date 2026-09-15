# Agent notes

Citadel Watch is a Vite + React + TypeScript + Three.js arcade tower defense. Product look is in `DESIGN.md`.

## Orient

1. Read `CONTEXT.md` for domain terms. Done when you use those names instead of the avoid list.
2. Orient in code with Graphify before Grep or Read: `graphify query`, `graphify path`, `graphify explain`. Hubs are `advanceWatch`, `GameEngine`, `WorldRenderer`, and `GameState`. Refresh with `bun run graphify:update`. Done when you can name the module that owns the change.
3. Read this file and `docs/ARCHITECTURE.md` for the module map. Decisions live in `docs/adr/0001`, `0002`, and `0003`. Done when you know which seam you are crossing and whether the work is simulation, HUD, or the 3D view.

## Where code lives

The Watch simulates on a 2D board of points in `src/game/`. `advanceWatch` owns the tick: Wave arrivals, combat, Escape, and Rift Broken. `GameEngine` is the live adapter: RAF, pointer translation, snapshot emit, audio wiring. Coordinates are logical 1400x1000. Enemies walk the Road from In to Out. The 3D view must not own gold, lives, waves, targeting, or placement rules.

The live view is `src/game/world3d/`. Each frame `GameEngine` calls `WorldRenderer.sync(state)` then `WorldRenderer.render()`. Picking is `BoardHitTest` (WorldRenderer is the Three.js adapter). Camera drag and zoom sit on the view module.

HUD is React: `src/App.tsx`, `src/hooks/useGameEngine.ts`, `src/components/`, `src/styles/`. HUD reads `UiSnapshot` and calls `HudCommands`. HUD modules must not import `GameEngine`. Canvas pointers go to `BoardInput.handleScreenPointer`. Keyboard in `App` goes to `HudCommands.handleKeyDown`.

Visual work starts at `DESIGN.md` and `src/styles/tokens.css`. Economy, Waves, and tower numbers start at `src/game/state/createInitialState.ts`, `src/game/config/`, and `src/game/constants.ts`.

## Commands

```bash
bun install
bun run dev
bun run test
bun run build
bun run graphify:update
```
