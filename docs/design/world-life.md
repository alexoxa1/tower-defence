# World life

The 3D view paints the Watch. It does not own gold, lives, Waves, targeting, or placement. `GameEngine` still calls `WorldRenderer.sync(state)` then `render()` each frame. `BoardHitTest` is unchanged: ground rays hit the terrain mesh, towers keep `userData.towerId` on every child, upgrade chevrons stay separate.

Flora and rocks are decorative. Placement legality stays in the sim (`validatePlacement`). Scatter uses a Layout-seeded RNG and rejects points on the Road clearance band and around In / Out so plants never sit on the lane or the portals.

## Palette

Midnight command board. Lights stay modest so albedo and emissive carry contrast.

| Token | Value |
| --- | --- |
| Hemisphere | sky `#b4bcc8`, ground `#24262c`, intensity **0.7** |
| Key | `#ffe4c4` **1.1** |
| Fill | `#9ec4d8` **0.4** |
| Ambient | `#3a3e46` **0.45** |
| Exposure | **1.16** (ACES) |
| Bloom | strength 0.28, radius 0.2, threshold **0.72** (strength 0 when reduced motion) |
| Fog | `FogExp2` `#14151a` density **0.0036** |
| Ground map | cool ash `(76,78,90)` → `(160,162,176)`, blue-dark cracks. Emissive `#222a38` **0.14** |
| Pines | vertex `(0.10,0.18,0.15)` → tips `(0.22,0.38,0.30)`, mint emissive **0.08**, instance hue teal↔olive |
| Broadleaf | rust core `(0.45,0.20,0.08)`, amber crown `(0.75,0.42,0.16)` |
| Grass | olive-mint `(0.22,0.34,0.26)` → `(0.38,0.52,0.42)` |
| Shrubs | body `(0.35,0.60,0.48)`, emissive **0.18** |
| Crystals | vertex mid-mint `(0.45,0.85,0.75)` + amber facet, emissive **0.45**, 18 in 3 groves |
| Rocks | basalt `(48,52,62)` map, ~40 jagged + 30 instanced slabs |

No saturated lime. No white flora tints.

## Layers

**Ground.** Faceted plane. 512² cool ash/crack CanvasTexture. Repeat 5×4. Cool `emissive` 0.14 so mid-tones survive ACES. Still the only mesh `intersectGround` tests. Road stays darker than ground. Lava pulse ~0.82 so seams still bloom at threshold 0.72.

**Rocks.** ~40 unique `makeJaggedRock` (scale 0.5–1.3, height 0.4–1.4, Road corridor, pad 0.6) plus 30 instanced basalt slabs (pad 0.55). Off the berm.

**Flora.** Instanced batches, corridor scatter just outside Road clearance. Tallest pine world height ≈ 1.26 × 1.12 × 1.12 ≈ **1.58** vs Hex Gun ≈ **1.13** (ratio **~1.40**, ≤ 1.5).

| Batch | Look | Count cap | Shadow |
| --- | --- | --- | --- |
| Charred pine | tall cones | 24 | yes |
| Squat pine | wide cones | 16 | yes |
| Amber broadleaf | rust core + amber crown | 22 | yes |
| Mint glow-shrub | mid-mint clumps | 40 | no |
| Crystals | 3 groves along the Road | 18 | no |
| Grass tufts | six-blade olive | 150 | no |
| Rock slabs | flattened dodeca | 30 | yes |

Wind is an `onBeforeCompile` offset on local `y` (base stays planted). Amplitude is a shared `uWind` uniform. Crystals and slabs still instance; crystals keep a light sway.

**Towers.** Brushed-metal / frost / rune CanvasTextures. Idle motion off when reduced motion is on.

## Budget

Textures ≤ 512, all procedural. Flora/prop instanced batches: **7**. Draw calls (DEV, composer included): **97** on the readability pass, **85** on this midnight pass (≤ 110). Mean board sRGB luminance **0.227** at default zoom (HUD cropped).

No new npm packages. Noise is `three/examples/jsm/math/SimplexNoise.js`.

## Reduced motion

`setReducedMotion(true)`:

- bloom strength 0 (threshold stays 0.72)
- `uWind = 0`
- embers hidden, not ticked
- lava pulse, portal flame scale, tower idle skipped
- fog stays (static)

## Dispose

Shared CanvasTextures are tagged `userData.shared`. `WorldRenderer.dispose` calls `disposeWorldTextures`. Layout rebuild clears `roadRoot`, `portalRoot`, `propRoot`, and `floraRoot`. Instanced meshes call `.dispose()`.

## Left out

- Visual Level growth
- Instancing every jagged rock
- Wind-matching `customDepthMaterial`
- Any `GameState` field
