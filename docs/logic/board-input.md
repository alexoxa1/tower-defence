# Board pointer

Canvas events go to `BoardInput.handleScreenPointer`. `GameEngine` converts screen pixels to a logical point through `ScreenPointerHub` (`src/game/sim/screenPointer.ts`), then calls `pointerDown`, `pointerMove`, and `pointerUp` in `src/game/sim/pointer.ts`. The 3D view does not decide select vs relocate vs pan.

## State machine

`GameState.drag` is a sum type:

- `idle`: no press on a tower
- `pending`: press on a tower. The tower is selected. Origins are stored. No relocate yet.
- `relocating`: pointer travel from the *press point* exceeded the relocate threshold

Tap (down then up while still `pending`) keeps the tower where it is.

Drag past the threshold commits `moveTowers` on up, using `origin + (current - press)`. If the drop is illegal, the towers stay and the player gets the placement reason.

Relocate threshold is `RELOCATE_THRESHOLD` (16 logical) for mouse. Touch and pen use `RELOCATE_THRESHOLD_COARSE` (48 logical) so finger jitter does not start a move.

## Screen gestures (`ScreenPointerHub`)

Pan, pinch, and tap-vs-drag live in the hub. They never enter `DragState`.

Empty-ground primary press:

| Pointer | Mode | Down | Drag | Up |
| --- | --- | --- | --- | --- |
| Mouse / fine | Scout or build | Pan pending | Pan after 4px slop | Tap places or clears if slop not exceeded |
| Touch / pen | Scout, tower, multi | Pan pending | Pan after 16px slop | Tap if slop not exceeded |
| Touch / pen | Build | Aim | Ghost follows the finger. No pan | Places at the lift point |
| Mouse right (button 2) | Any | Pan pending | Pan after slop | No-drag tap opens the board menu at the pointer. Does not toggle Link |
| Touch / pen long-press | Any | Timer 450ms | Travel past slop cancels | Timer fires: same board menu. Lift before the timer keeps the usual tap |

Ctrl/Meta+click still toggles Link on a tower. Right-click no longer does; the menu has Link / Unlink.

Two fingers always pinch-zoom (distance) and pan (midpoint). A pinch cancels a pending place and a pending relocate. The leftover finger after a pinch continues as pan and does not click.

On touch, an upgrade chevron hit is treated as a tower select. Upgrade from the command rack. Mouse still clicks the chevron.

After a raycast miss, `WorldRenderer` picks the nearest tower or chevron in screen pixels (`TOWER_PICK_SLOP_PX` / `UPGRADE_PICK_SLOP_PX`).

HUD `+` / `−` / home call `HudCommands.zoomIn`, `zoomOut`, and `resetView`. Wheel still zooms on desktop.

## Invariants

- Press uses the click point, not the tower center. Mixing those two was the tap-to-move bug.
- Relocate costs no gold (ADR 0003).
- Multi-select (Ctrl/Meta+click, or Link in the board menu) toggles selection and does not arm relocate.
- Right-click without drag opens the board menu. Right-drag still pans.
- Touch/pen long-press (~450ms, under slop) opens the same menu. Move or lift before the timer cancels it.
- Escape, click outside, scroll/pan, or a menu action closes the board menu.
- Build ghost is hidden while `pending` or `relocating`. Relocate uses the same `placementPreview` ghost at the proposed point.
- HUD `isDragging` is true only for `relocating`, so a tap does not show a grab cursor.
- Pan does not move the camera until travel exceeds the pointer slop. A tap does not nudge the view.

## Call order

1. `ScreenPointerHub` classifies the screen gesture.
2. `pointerDown` selects and arms `pending`, or places a new tower on empty ground.
3. `pointerMove` may promote `pending` to `relocating`, or updates the aim ghost.
4. `pointerUp` commits or cancels, then returns to `idle`.

There is no device-orientation or tilt steering. Capacitive touch and pinch are the phone controls.
