# Board pointer

Canvas events go to `BoardInput.handleScreenPointer`. `GameEngine` converts screen pixels to a logical point, then calls `pointerDown`, `pointerMove`, and `pointerUp` in `src/game/sim/pointer.ts`. The 3D view does not decide select vs relocate.

## State machine

`GameState.drag` is a sum type:

- `idle`: no press on a tower
- `pending`: press on a tower. The tower is selected. Origins are stored. No relocate yet.
- `relocating`: pointer travel from the *press point* exceeded `RELOCATE_THRESHOLD` (16 logical units)

Tap (down then up while still `pending`) keeps the tower where it is.

Drag past the threshold commits `moveTowers` on up, using `origin + (current - press)`. If the drop is illegal, the towers stay and the player gets the placement reason.

## Invariants

- Press uses the click point, not the tower center. Mixing those two was the tap-to-move bug.
- Relocate costs no gold (ADR 0003).
- Multi-select (right-click or Ctrl/Meta) toggles selection and does not arm relocate.
- Build ghost is hidden while `pending` or `relocating`. Relocate uses the same `placementPreview` ghost at the proposed point.
- HUD `isDragging` is true only for `relocating`, so a tap does not show a grab cursor.

## Call order

1. `pointerDown` selects and arms `pending` or places a new tower on empty ground.
2. `pointerMove` may promote `pending` to `relocating`.
3. `pointerUp` commits or cancels, then returns to `idle`.

Pan on empty ground is owned by `GameEngine` (screen-space). It does not go through `DragState`.
