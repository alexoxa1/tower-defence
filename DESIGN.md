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
