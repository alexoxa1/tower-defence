# Citadel Watch design

Filament Plate. A surveyor’s instrument bolted to two corners of a living Board. Not glass. Not a dashboard.

- Display / in-Watch titles: Space Grotesk, uppercase
- Labels: Barlow Condensed, uppercase, tracking 0.12em
- Numbers: Courier Prime, tabular-nums (auth numbers: Azeret Mono)
- Auth / splash titles: Big Shoulders Display ExtraBold
- Filament: `#f0b429` on filament ink `#1a1404`
- Plate: soot `#16140f` at 92% (HUD plates `#100e09` at 90%). No blur
- Ink: `#f2ece0`. Muted: `#9a9386`. Danger: `#d4453a`
- Hairline 1px `#3d3930`. Radius 0–2px
- No Inter. No Syne. No purple. No emoji chrome

Towers (3D swatches, unchanged): Hex Gun `#ff6a1a`, Mortar Post `#2ee6c5`, Rail Sniper `#d8fff6`, Ward Beacon `#e8a54b`, Frost Lantern `#7dcea0`.
HUD accent is filament gold. Tower bodies follow the 3D materials.
Enemies: Creep, Runner, Brute, Swarm, Warden, Shade, Colossus, Overlord.
Lose state title: Rift Broken.

Desktop is an L-frame: 40px top stats ruler, 140px status bezel + 44px tool spine top-left, 220px Armory strip on the right, ~240px selected plate bottom-right. Phone is a top ruler, thumb-zone 56px Start Wave, and a 56px Armory sheet peek. Compact (≤720px wide or ≤540px tall) stacks like phone — no side rack. Coarse pointers get 44px targets and no hover-only affordances. Board gestures for touch are in `docs/design/touch-and-small-screens.md`.

## Plate

HUD chrome is matte soot with engraved hairlines. Filament `--filament` is the only accent.

Tokens live in `src/styles/tokens.css`.

Rules:

- Solid (or 90–92% soot) fill. No `backdrop-filter`. No sheen gradient. No glass.
- 1px hairline `#3d3930`. Radius 0–2px. Auth plate may use a tight outer shadow; HUD chrome should not.
- Children inherit the plate. Do not stack a second fill on every chip.
- `prefers-reduced-motion` and `html[data-reduced-motion="true"]` use solid `#121212` and `--motion: 0ms`.
- Do not invent stats, a minimap, Combo HUD, sign-up, or a pause modal. Do not cover the Road, In, or Out.
