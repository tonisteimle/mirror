/**
 * Easing Functions for Demo Mode
 *
 * Provides smooth, natural-looking animations for cursor movement.
 */

export type EasingFn = (t: number) => number

/**
 * Linear (no easing)
 */
export const linear: EasingFn = t => t

/**
 * Ease out quad - starts fast, slows down
 */
export const easeOutQuad: EasingFn = t => t * (2 - t)

/**
 * Ease in quad - starts slow, speeds up
 */
export const easeInQuad: EasingFn = t => t * t

/**
 * Ease in-out quad - smooth start and end
 */
export const easeInOutQuad: EasingFn = t => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Ease out cubic - starts fast, slows down (more pronounced)
 */
export const easeOutCubic: EasingFn = t => 1 - Math.pow(1 - t, 3)

/**
 * Ease in-out cubic - smooth start and end (more pronounced)
 */
export const easeInOutCubic: EasingFn = t =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2

/**
 * Ease out back - overshoots slightly then settles (natural feel)
 */
export const easeOutBack: EasingFn = t => {
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
}

/**
 * Default easing for cursor movement
 */
export const defaultCursorEasing = easeInOutCubic

/**
 * Interpolate between two points using an easing function
 */
export function interpolatePoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
  t: number,
  easing: EasingFn = defaultCursorEasing
): { x: number; y: number } {
  const easedT = easing(t)
  return {
    x: from.x + (to.x - from.x) * easedT,
    y: from.y + (to.y - from.y) * easedT,
  }
}

/**
 * Generate intermediate points along a path with easing
 */
export function generatePath(
  from: { x: number; y: number },
  to: { x: number; y: number },
  steps: number,
  easing: EasingFn = defaultCursorEasing
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    points.push(interpolatePoint(from, to, t, easing))
  }
  return points
}
