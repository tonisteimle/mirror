/**
 * Gap-Handle Math — pure helpers extracted from `GapHandleManager`.
 *
 * Sibling module to `spacing-handle-math.ts` (padding/margin polarity).
 * Gap is conceptually simpler than padding/margin — it has no
 * outward/inward polarity question, just a directional delta:
 *
 *   horizontal flex/grid (children flow →) — drag right grows the gap
 *   vertical flex/grid (children flow ↓) — drag down grows the gap
 *
 * The whole math was inline in the 800+ LOC manager file without
 * unit coverage; only browser tests (heavily mocked via synthetic
 * MouseEvent.dispatchEvent at that) protected it. Extracting here
 * gives vitest direct pins for the polarity and clamping rules.
 *
 * Conventions match `calculateSpacingDelta`:
 *   - Returns a signed delta in PX (caller adds to `startGap`).
 *   - Caller does snap + minimum-zero clamping. This function does
 *     not consult tokens or modifier-keys (those are caller concerns).
 *
 * The companion `applyGapDelta` exists for parity with the
 * margin/padding code paths and to centralise the "minimum is zero"
 * invariant. If a future feature allows negative gaps (e.g. overlap
 * patterns) it lives here, not scattered through the manager.
 */

export type GapDirection = 'horizontal' | 'vertical'

/**
 * Compute the signed pixel delta from drag start. Positive delta
 * means the gap should grow.
 *
 *   direction='horizontal' → delta = mouseX - startX
 *   direction='vertical'   → delta = mouseY - startY
 */
export function calculateGapDelta(
  direction: GapDirection,
  startX: number,
  startY: number,
  mouseX: number,
  mouseY: number
): number {
  if (direction === 'horizontal') return mouseX - startX
  return mouseY - startY
}

/**
 * Apply a signed delta to a start-gap value and clamp to the
 * minimum (currently 0 — gaps cannot be negative).
 */
export function applyGapDelta(startGap: number, delta: number): number {
  return Math.max(0, startGap + delta)
}
