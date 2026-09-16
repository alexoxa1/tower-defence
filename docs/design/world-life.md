# World life

The 3D view paints the Watch. It does not own gold, lives, Waves, targeting, or placement. `GameEngine` still calls `WorldRenderer.sync(state)` then `render()` each frame. `BoardHitTest` is unchanged: ground rays hit the terrain mesh, towers keep `userData.towerId` on every child, upgrade chevrons stay separate.

Flora and rocks are decorative. Placement legality stays in the sim (`validatePlacement`). Scatter uses a Layout-seeded RNG and rejects points on the Road clearance band and around In / Out so plants never sit on the lane or the portals.

## Layers

**Ground.** Faceted plane, same displacement as before. Albedo is a 512² seeded CanvasTexture (midnight ash, grit, hairline cracks). Repeat 8×6. Still the only mesh `intersectGround` tests.

**Road.** Shared basalt CanvasTexture with world-XZ UVs so long segments do not stretch. Lava strip uses the same basalt plus a 512² emissive seam map. `lavaMats` still pulse `emissiveIntensity` unless reduced motion is on.

**Rocks.** Existing `makeJaggedRock` meshes, now with a shared 512² rock map. Rebuilt when the Layout changes so they stay off the live Road.

**Flora.** Five `InstancedMesh` batches, vertex-colored, no image maps:

| Batch | Look | Count cap | Shadow |
| --- | --- | --- | --- |
| Charred pine | dark cones | 24 | yes |
| Amber broadleaf | icosa crown | 18 | yes |
| Mint glow-shrub | emissive clumps | 40 | no |
| Crystals | mint/amber shards | 22 | no |
| Grass tufts | three-blade clumps | 140 | no |

Wind is an `onBeforeCompile` offset on local `y` (base stays planted). Amplitude is a shared `uWind` uniform.

**Towers.** Brushed-metal / frost / rune CanvasTextures (256²) as `map` / `emissiveMap`. Idle motion, off when reduced motion is on:

- Hex Gun: barrel spin
- Mortar Post: tube bob (deeper on fire flash)
- Rail Sniper: cap charge glow
- Ward Beacon: halo pulse + flame brightness
- Frost Lantern: core swirl

Level does not change the mesh. `syncTowers` never scaled by Level; this view still does not.

**Ambient.** `FogExp2` matching the scene background. 56 drifting ember `Points` (additive, no per-frame alloc). Enemies get a cheap warm rest emissive so they read on the textured ground.

## Budget

Textures, all procedural, none larger than 512:

- ground 512, road 512, lava 512, rock 512
- brushed 256, runes 256, frost 256

Draw calls (DEV, first frame, `renderer.info.autoReset = false` so bloom passes count too): **97** on the default Serpentine Hold. Rocks frustum-cull; flora is 5 instanced batches.

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
