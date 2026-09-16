# Citadel Watch design

Midnight command board. Not a generic dark dashboard.

- Display: Syne
- Mono / numbers: IBM Plex Mono, tabular-nums
- Accent: burnt amber `#e8a54b`
- Support: mint `#7dcea0`
- Danger: `#e05555`
- Ground: `#0c0b0e`
- No Inter. No purple. No emoji chrome.

Towers: Hex Gun (orange `#ff6a1a`), Mortar Post (teal `#2ee6c5`), Rail Sniper (mint `#d8fff6`), Ward Beacon (amber `#e8a54b`), Frost Lantern (support mint `#7dcea0`).
HUD accent is amber. Tower bodies follow the 3D materials.
Enemies: Creep, Runner, Brute, Swarm, Warden, Shade, Colossus, Overlord.
Lose state title: Rift Broken.

Small screens keep the same tokens. Layout stacks the command rack under the board when the viewport is narrow or short. Coarse pointers get 44px targets and no hover-only affordances. Board gestures for touch are in `docs/design/touch-and-small-screens.md`.

## Glass

HUD chrome is liquid glass over the midnight board. Amber `--accent` stays the only accent.

Tokens live in `src/styles/tokens.css`: `--glass-fill`, `--glass-bg`, `--glass-highlight`, `--glass-edge`, `--glass-blur`.

Rules:

- Translucent gradient fill plus `backdrop-filter: blur() saturate()` on a few containers only: command rack, status cluster, dialogs, board menu, auth card.
- 1px inner light (`inset` box-shadow) and a top specular sheen (`::before` gradient). Soft outer shadow for depth.
- Children (icon buttons, stats, Armory rows, speed pills) inherit the look without a second backdrop-filter.
- `prefers-reduced-transparency: reduce` and `html[data-reduced-motion="true"]` drop blur for a solid `--panel-solid` fill.
- Compact viewports use a smaller blur. Do not put backdrop-filter on every chip.
