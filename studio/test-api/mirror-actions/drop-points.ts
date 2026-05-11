/**
 * Pure-math helpers for computing test-driven drop points inside a
 * container's bounds. Lives outside the closure in `index.ts` so the
 * math can be unit-tested directly in jsdom without installing the
 * full mirror-actions surface.
 *
 * The cursor positions produced here must satisfy two constraints from
 * Studio's drop-target pipeline:
 *
 *   1. **HitDetector** (`studio/preview/drag/hit-detector.ts`) escapes
 *      to the parent container when the cursor sits within
 *      `ESCAPE_ZONE_SIZE` of the container's far edge AND is below the
 *      last child. We must stay out of that band.
 *   2. **InsertionCalculator** picks "after last" only when the cursor
 *      is below the last child's midpoint. We aim for clearly below
 *      the last child's bottom edge.
 *
 * In tight-packed containers the safe range can shrink to a few px.
 * The escape-zone constraint wins because hitting the parent is
 * silently wrong, while a slightly-suboptimal y is still correct.
 */

import type { Point } from '../../preview/drag/types'
import { ESCAPE_ZONE_SIZE } from '../../preview/drag/hit-detector'

/**
 * Compute the cursor point for a drop at `index` inside `containerRect`
 * with `childRects` already laid out.
 *
 * - `index >= childRects.length`: append after last child.
 * - `index <  childRects.length`: insert before `childRects[index]`.
 * - Empty container: center.
 */
export function computeDropChildIndexPoint(
  containerRect: {
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  },
  childRects: ReadonlyArray<{
    left: number
    top: number
    right: number
    bottom: number
    width: number
    height: number
  }>,
  index: number
): Point {
  if (childRects.length === 0) {
    return {
      x: containerRect.left + containerRect.width / 2,
      y: containerRect.top + containerRect.height / 2,
    }
  }
  if (index >= childRects.length) {
    const last = childRects[childRects.length - 1]
    const cx = last.left + last.width / 2
    const cy = Math.min(last.bottom + 8, containerRect.bottom - ESCAPE_ZONE_SIZE - 4)
    return { x: cx, y: cy }
  }
  const r = childRects[index]
  const cy = Math.max(r.top - 4, containerRect.top + 4)
  return { x: r.left + r.width / 2, y: cy }
}
