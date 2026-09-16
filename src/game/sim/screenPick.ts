/** Screen-pixel radius for fat-finger tower pick after a raycast miss. */
export const TOWER_PICK_SLOP_PX = 28;

/** Screen-pixel radius for the upgrade chevron on fine pointers. */
export const UPGRADE_PICK_SLOP_PX = 22;

export function nearestIdByScreen(
  items: readonly { id: string; x: number; y: number }[],
  clientX: number,
  clientY: number,
  maxPx: number,
): string | null {
  let best: { id: string; dist: number } | null = null;
  for (const item of items) {
    const dist = Math.hypot(item.x - clientX, item.y - clientY);
    if (best === null || dist < best.dist) best = { id: item.id, dist };
  }
  return best && best.dist <= maxPx ? best.id : null;
}
