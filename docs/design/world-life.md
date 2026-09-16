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
| Ground map | cool ash `(76,78,90)` → `(160,162,176)`, blue-dark cracks, mint moss on ~15% (low-octave fbm). Emissive `#222a38` **0.14** |
| Pines | vertex `(0.10,0.18,0.15)` → tips `(0.22,0.38,0.30)`, mint emissive **0.08**, instance hue teal↔olive, scale **1.05–1.4** |
| Broadleaf | rust trunk `(0.42,0.20,0.07)`, amber crown `(1.0,0.50,0.06)`, emissive `#ff8414` **0.28**, no instance tint, scale **1.16–1.28** |
| Grass | olive-mint `(0.22,0.34,0.26)` → `(0.38,0.52,0.42)`, scale **1.2–1.8** |
| Shrubs | body `(0.35,0.60,0.48)`, emissive **0.18**, scale **1.1–1.6** |
| Crystals | vertex mid-mint `(0.45,0.85,0.75)` + amber facet, emissive **0.45**, 18 in 3 groves |
| Rocks | basalt `(70,76,90)` → `(125,130,145)`, ~40 jagged + 40 instanced slabs |
| Road | charcoal stone `#181c24`, lava pulse **0.42 ± 0.06**, thin ember veins (G ≈ 0.17 R) |

No saturated lime. No white flora tints. Road stays darker than ground.

## Layers

**Ground.** Faceted plane. 512² cool ash/crack CanvasTexture plus faint mint lichen blobs. Repeat 5×4. Cool `emissive` 0.14 so mid-tones survive ACES. Still the only mesh `intersectGround` tests.

**Road.** Dark charcoal rim. Center strip is stone albedo with a thin ember-vein emissive map, not a lava fill. Pulse `0.42 + sin * 0.06`. Seam exponents 7 / 5.

**Rocks.** ~40 unique `makeJaggedRock` (scale 0.5–1.3, height 0.4–1.4, Road corridor, pad 0.6) plus 40 instanced basalt slabs (pad 0.55). Off the berm. Slightly darker than ground, lit on top faces.

**Flora.** Instanced batches. Shared grove centers along the Road (~60% of trees within ~6 world units of another tree; rest stragglers). Grass clusters at tree feet and along the berm. Broadleaf sits beside the nearest pines in the default view (no instance tint — vertex color only). `mergeGeometries` always de-indexes first: Cylinder is indexed, Icosahedron is not, and a mixed merge used to return an empty mesh. Tallest pine / Hex Gun ≈ **1.47**; tallest broadleaf ≈ **1.40** (≤ 1.5).

| Batch | Look | Count cap | Shadow |
| --- | --- | --- | --- |
| Charred pine | tall cones | 40 | yes |
| Squat pine | wide cones | 28 | yes |
| Amber broadleaf | rust core + amber crown | 36 | yes |
| Mint glow-shrub | mid-mint clumps | 64 | no |
| Crystals | 3 groves along the Road | 18 | no |
| Grass tufts | six-blade olive | 300 | no |
| Rock slabs | flattened dodeca | 40 | yes |

Wind is an `onBeforeCompile` offset on local `y` (base stays planted). Amplitude is a shared `uWind` uniform. Crystals and slabs still instance; crystals keep a light sway.

**Towers.** Brushed-metal / frost / rune CanvasTextures. Idle motion off when reduced motion is on.

## Budget

Textures ≤ 512, all procedural. Flora/prop instanced batches: **7**. Draw calls (DEV, composer included): **88** (≤ 110). Mean board sRGB luminance **0.235** at default zoom (HUD cropped). Road red mean **0.162**; Road luminance **0.106** vs ground **0.265** (ratio **0.40**). Off-Road amber pixels (hue 18–45°, sat > 0.45): **0 → 18981**. Emptiest 320×320 board region (outside HUD, outside Road): **20** props. Broadleaf on screen at default zoom: **34 / 36**.

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
