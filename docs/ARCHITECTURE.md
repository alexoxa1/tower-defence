# Architecture

Module map for Citadel Watch. Domain words are in `CONTEXT.md`. Decisions are `docs/adr/0001`, `0002`, and `0003`. Code orientation uses Graphify. Hubs are `advanceWatch`, `GameEngine`, `WorldRenderer`, and `GameState`.

Simulation, HUD, and the 3D view are separate modules. They meet at small interfaces. Change locality should stay on one side of a seam unless the task is the seam itself.

The Watch simulates on a 2D board of points. `WorldRenderer` only displays that board. Towers occupy free points with spacing and Road clearance, not a grid. Hex is the Hex Gun silhouette. A placed tower can be dragged to another legal point at no gold cost.

## Runtime

`src/main.tsx` mounts `App`. `useGameEngine` constructs `GameEngine` with the canvas and a snapshot setter, then calls `start()`.

Each animation frame `GameEngine` calls `advanceWatch` on `GameState` (or a frozen presentation tick when paused / Rift Broken), then asks `WorldRenderer` to sync meshes and render. After player commands and when HUD fields change it emits `UiSnapshot`. React HUD re-renders from that snapshot only.

Logical space is 1400x1000. `PATH` in `src/game/constants.ts` is the Road. Enemies walk from In to Out. An Escape spends Citadel lives. Three.js space is a scaled isometric view of that plane, converted in `src/game/world3d/coords.ts`.

## Seams

**HUD to Watch.** Interface is `HudCommands` plus `UiSnapshot` in `src/game/hud/commands.ts` and `src/game/types.ts`. Adapter is `useGameEngine`. HUD modules must not import `GameEngine` or `GameState`. Commands go in. Snapshot comes out with eligibility flags (`canStartWave`, `canAffordBuild`, `interactionMode`, `maxTowerLevel`, `campaignWaves`). Canvas pointers use `BoardInput`, a nested surface on the same `GameActions` object, not Armory clicks.

**Watch to 3D view.** Interface is `WorldRenderer`: `sync`, `render`, `resize`, `pan`, `zoom`, `resetView`, `dispose`, plus `BoardHitTest` (`toLogical`, `hit`). `GameEngine` is the caller. The view must not own gold, lives, Waves, targeting, or placement legality. Ghost color and range come from `state.placementPreview`.

**Watch to simulation.** Interface is `advanceWatch(state, dt, ports)` in `src/game/sim/advanceWatch.ts`. `WatchPorts` is play-audio plus notify-UI. Rift Broken is a state transition in combat, not a second lose callback. Tests inject recording ports. Production ports are `AudioEngine.play` and engine toasts.

**Board plane to Three.js.** Interface is `BoardHitTest` in `src/game/sim/boardHit.ts`. WorldRenderer is the raycast adapter. `createLogicalHitTest` is the geometry adapter (client coordinates treated as logical points). `logicalToWorld` / `worldToLogical` stay private to `world3d` except as consumed through `toLogical`.

**Audio.** Interface is `WatchPorts.play`. One live adapter, `AudioEngine`, constructed inside `GameEngine`.

## Domain modules

**Watch tick.** `src/game/sim/advanceWatch.ts`. Fixed-phase simulation. Does not import canvas, Three.js, or React.

**Watch adapter.** `src/game/GameEngine.ts`. RAF, keyboard, screen pointer to logical pointer, snapshot emit, audio mute, camera keys.

**Wave.** `src/game/config/waves.ts` holds `WAVE_PLANS`. `src/game/systems/waves.ts` starts a Wave, arrives enemies on a timer, pays a Clear bonus, and exports `canStartWave`. Campaign is the first fifteen named Waves. Hold is the idle name before Wave 1. Wave and clear copy go to toast, not a second banner.

**Tower placement.** `src/game/systems/placement.ts`. Validate gold, board edges, Road clearance, and spacing. Place on a free point. Reposition a placed tower to another legal point at no gold cost. Preview flags live on `GameState.placementPreview`, computed in `src/game/sim/preview.ts`.

**Armory.** `TOWER_TYPES` in `src/game/constants.ts` is Hex Gun, Mortar Post, and Rail Sniper, keyed as `basic`, `cannon`, and `sniper`. Display catalog is `src/game/config/armory.ts`. `src/game/config/towerStats.ts` scales by Level. Upgrade cost, Spent, and Refund live in `src/game/systems/upgrade.ts`. Scout is `interactionMode === "scout"`. Slow is Rail Sniper only, applied on projectile hit.

**Combat.** `src/game/systems/combat.ts` owns hit resolution, kill Reward, Combo, Escape lives, and Rift Broken. Entities keep data and movement. `Enemy.update` reports an Escape; combat applies it. `lose` plays once when the rift breaks.

**Citadel.** Lives on `GameState`. Not a building on the board. Starting lives and gold are `STARTING_LIVES` and `STARTING_GOLD` in `src/game/constants.ts`. Pass `{ startingGold }` into `createInitialState` for a local override.

**Road and board.** `PATH`, `LOGICAL_WIDTH`, `LOGICAL_HEIGHT` in `src/game/constants.ts`. In and Out portals and the 3D Road are built once in `WorldRenderer`.

**FX.** `tickFx` for shake and Combo timer. `Particle` and `FloatingText` are sim objects. `WorldRenderer` mirrors particles and floating combat text as sprites.

**3D view.** `WorldRenderer` plus `models.ts`, `coords.ts`, `dispose.ts`. Mesh factories and bloom stay behind the renderer interface.

**HUD.** `App` shells the board and command rack. `GameCanvas` binds pointer and wheel to `BoardInput`. `Header`, `StatsPanel`, `ShopPanel`, `ControlsPanel`, `SelectionPanel`, `Toast`, and `GameOverOverlay` are shallow adapters over snapshot and `HudCommands`. `ShopPanel` is the Armory. `GameOverOverlay` is Rift Broken. CSS tokens are `src/styles/tokens.css`. Layout is `src/styles/app.css`.

**Audio.** `src/game/audio/AudioEngine.ts`. Web Audio blips keyed by `SoundName`.

## Depth notes

These are observations, not a review report.

`advanceWatch` is deep for rules. Callers pass state, dt, and ports.

`WorldRenderer` is deep for the view. Callers learn sync/render/hit/pan/zoom.

`AudioEngine.play` is deep in the same way.

`validatePlacement` is deep for place and reposition rules. Ghost preview and place share it through `refreshPreview`.

`GameEngine` is a thin adapter over those modules.

HUD modules in `src/components/` are shallow. They map snapshot fields to DOM and forward clicks.

## src map

| Path | Role |
| --- | --- |
| `src/main.tsx` | React mount |
| `src/App.tsx` | HUD shell, keyboard to `HudCommands` |
| `src/hooks/useGameEngine.ts` | Adapter from canvas + React state to `GameEngine` |
| `src/components/GameCanvas.tsx` | Pointer and wheel into `BoardInput` |
| `src/components/Header.tsx` | Status, mute, reset, help |
| `src/components/StatsPanel.tsx` | Gold, lives, Wave, Score |
| `src/components/ShopPanel.tsx` | Armory. Scout vs Hex Gun, Mortar Post, Rail Sniper |
| `src/components/ControlsPanel.tsx` | Speed |
| `src/components/SelectionPanel.tsx` | Selected tower upgrade and sell |
| `src/components/Toast.tsx` | Snapshot toast copy |
| `src/components/GameOverOverlay.tsx` | Rift Broken |
| `src/styles/tokens.css` | Color, type, HUD metrics |
| `src/styles/app.css` | Layout |
| `src/game/sim/advanceWatch.ts` | Headless Watch tick |
| `src/game/sim/ports.ts` | `WatchPorts` |
| `src/game/sim/preview.ts` | Placement preview and `interactionMode` |
| `src/game/sim/pointer.ts` | Logical pointer commands |
| `src/game/sim/boardHit.ts` | `BoardHitTest` |
| `src/game/hud/commands.ts` | `HudCommands`, `BoardInput` |
| `src/game/hud/snapshot.ts` | `buildUiSnapshot` |
| `src/game/GameEngine.ts` | Live adapter: RAF, input, presentation |
| `src/game/types.ts` | `GameState`, `UiSnapshot` |
| `src/game/constants.ts` | Road, Armory bases, board size, starting gold |
| `src/game/state/createInitialState.ts` | New Watch values |
| `src/game/config/waves.ts` | Wave plans, Campaign |
| `src/game/config/towerStats.ts` | Level scaling |
| `src/game/config/armory.ts` | Armory display catalog |
| `src/game/systems/waves.ts` | Arrive, Clear bonus, `canStartWave` |
| `src/game/systems/placement.ts` | Place and reposition |
| `src/game/systems/upgrade.ts` | Upgrade and sell |
| `src/game/systems/combat.ts` | Hits, payout, Escape, Rift Broken |
| `src/game/systems/fx.ts` | Shake, Combo, motes, floating text |
| `src/game/entities/Enemy.ts` | Road follow, traits |
| `src/game/entities/Tower.ts` | Target and fire |
| `src/game/entities/Projectile.ts` | Flight |
| `src/game/entities/Particle.ts` | Burst motes |
| `src/game/entities/FloatingText.ts` | Rising labels |
| `src/game/world3d/WorldRenderer.ts` | 3D view adapter and `BoardHitTest` |
| `src/game/world3d/models.ts` | Mesh factories |
| `src/game/world3d/coords.ts` | Logical to world |
| `src/game/world3d/dispose.ts` | GPU teardown |
| `src/game/audio/AudioEngine.ts` | SFX |
| `src/game/utils/geometry.ts` | Distances, Road clearance |
| `src/game/utils/format.ts` | Gold and Score text |

## Change locality

| Task | Start here |
| --- | --- |
| Wave roster, names, gaps | `src/game/config/waves.ts` |
| Enemy HP, speed, Escape lives | `KIND_TRAITS` in `Enemy.ts` |
| Tower cost, Range, damage | `TOWER_TYPES` then `towerStats.ts` |
| Place legality | `placement.ts` then `preview.ts` |
| Kill Reward, Combo, shake, Rift Broken | `combat.ts` |
| Lives, starting gold | `constants.ts` and `createInitialState.ts` |
| Camera, pick, meshes | `WorldRenderer` / `models.ts` |
| HUD copy, Armory, Speed | `src/components/` plus `UiSnapshot` if a new field is required |
| Brand color and type | `DESIGN.md` and `tokens.css`. They can disagree. Prefer `DESIGN.md` for intent. |
