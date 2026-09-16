# World life

The 3D view paints the Watch. It does not own gold, lives, Waves, targeting, or placement. `GameEngine` still calls `WorldRenderer.sync(state)` then `render()` each frame. `BoardHitTest` is unchanged: ground rays hit the terrain mesh, towers keep `userData.towerId` on every child, upgrade chevrons stay separate.

Flora and rocks are decorative. Placement legality stays in the sim (`validatePlacement`). Scatter uses a Layout-seeded RNG and rejects points on the Road clearance band and around In / Out so plants never sit on the lane or the portals.

## Layers

**Ground.** Faceted plane. 512² ash/crack CanvasTexture, midtones around `#3a3c44`–`#6a6c74`, darker fissures. Repeat 5×4. Slight warm `emissive` plus stronger hemisphere/ambient fill so ACES does not crush it to pitch. Still the only mesh `intersectGround` tests.

**Road.** Darker basalt + lava seams, so the lane stays darker than the ash.

**Rocks.** Lighter rock map and HSL so they separate from ground.

**Flora.** Five `InstancedMesh` batches. Most instances sit in a belt just outside Road clearance (not on the lane, not at In/Out). Instance scale ~1.6–2.7× the first pass. Pine tips mid-tone, broadleaf amber/mint, crystals bloom.

| Batch | Look | Count cap | Shadow |
| --- | --- | --- | --- |
| Charred pine | amber-tipped cones | 36 | yes |
| Amber broadleaf | icosa crown | 28 | yes |
| Mint glow-shrub | emissive clumps | 52 | no |
| Crystals | mint/amber shards | 32 | no |
| Grass tufts | six-blade clumps | 180 | no |

Wind is an `onBeforeCompile` offset on local `y` (base stays planted). Amplitude is a shared `uWind` uniform.

**Towers.** Brushed-metal / frost / rune CanvasTextures (256²) as `map` / `emissiveMap`. Idle motion, off when reduced motion is on:

- Hex Gun: barrel spin
- Mortar Post: tube bob (deeper on fire flash)
- Rail Sniper: cap charge glow
- Ward Beacon: halo pulse + flame brightness
- Frost Lantern: core swirl

Level does not change the mesh. `syncTowers` never scaled by Level; this view still does not.

**Ambient.** Light `FogExp2` (density 0.0036) so the far Road stays readable. 56 drifting ember `Points`. Enemies keep a cheap warm rest emissive.

## Budget

Textures, all procedural, none larger than 512:

- ground 512, road 512, lava 512, rock 512
- brushed 256, runes 256, frost 256

Draw calls (DEV, composer passes included): **97 before, 97 after** the readability pass. Flora stayed 5 instanced batches; only instance counts and lighting changed.

No new npm packages. Noise is `three/examples/jsm/math/SimplexNoise.js`.

## Reduced motion

`setReducedMotion(true)`:

- bloom strength 0 (existing)
- `uWind = 0` (no sway)
- embers hidden, not ticked
- lava pulse, portal flame scale, tower idle skipped
- fog stays (static)

## Dispose

Shared CanvasTextures are tagged `userData.shared` so per-mesh `disposeObject` does not kill the atlas. `WorldRenderer.dispose` calls `disposeWorldTextures`. Layout rebuild clears `roadRoot`, `portalRoot`, `propRoot`, and `floraRoot` through `disposeObject`. Instanced meshes call `.dispose()`.

## Left out

- Visual Level growth
- Instancing the jagged rocks (geometries stay unique)
- Wind-matching `customDepthMaterial`
- GPU grass blades / L-systems
- Any `GameState` field
