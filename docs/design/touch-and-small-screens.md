# Touch and small screens

Citadel Watch is a board you play with a pointer. Phones and other coarse-pointer screens (capacitive “sensor” screens) used to fail because empty-ground input was pan-first with a 2px tap gate. A finger almost never lifts without moving more than 2px, so place never fired. Zoom was wheel-only. The HUD stacked only on `max-width: 720px`, so landscape phones kept a 320px sidebar on a short stage.

This file is the product rule for those screens. Code lives in `src/game/sim/screenPointer.ts`, `src/components/GameCanvas.tsx`, `src/styles/app.css`, and `HudCommands` view buttons on `Header`.

## What “sensor screen” means here

Not gyroscope. Not DeviceOrientation. The Watch does not tilt-to-pan. A sensor screen is a coarse pointer: `pointerType` `touch` or `pen`, CSS `(pointer: coarse)`.

## Board gestures

- **Scout, one finger:** drag pans. A tap under 16px slop still counts as a tap (deselect / pick).
- **Build, one finger:** drag aims the ghost. Lift places. The camera does not steal that drag.
- **Two fingers:** pinch zooms, midpoint pans. Cancels a pending place.
- **Tower press:** select, then relocate after 48 logical units (mouse stays at 16).
- **Upgrade on the board chevron:** mouse only. Touch uses the command rack.
- **Zoom without pinch:** `+` / `−` / home on the board HUD.

Canvas uses `touch-action: none`. The page does not scroll under the board on compact viewports (`overflow: hidden` on `100svh`).

## HUD

Compact layout triggers on `max-width: 720px` **or** `max-height: 540px`, so landscape phones stack the command rack under the board. The rack is height-capped and scrolls. Hit targets on coarse pointers are at least `--touch-min` (44px). Hover styles are gated to `(hover: hover) and (pointer: fine)`. Safe-area insets stay in `max()` with `viewport-fit=cover`. Sign-out tucks to the stage corner and hides the email on compact screens.

## Tests

`src/game/sim/screenPointer.test.ts` and `screenPick.test.ts` cover slop, aim-place, pinch, and fat-finger pick. Relocate coarse threshold is in `watch.test.ts`. There is no WebGL in those tests. `GameEngine` only wires the hub to `WorldRenderer`.

Local Vite can open the board without login via `?skipAuth`. That query works only when `import.meta.env.DEV` is true. Production builds ignore it.
