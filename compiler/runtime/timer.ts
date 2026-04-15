/**
 * Timer Module
 *
 * Delay, debounce, and timing utilities.
 */

// ============================================
// DELAY
// ============================================

/**
 * Execute a function after a delay
 */
export function delay(ms: number, fn: () => void): number {
  return window.setTimeout(fn, ms)
}

/**
 * Cancel a delayed function
 */
export function cancelDelay(timerId: number): void {
  window.clearTimeout(timerId)
}

// ============================================
// DEBOUNCE
// ============================================

/**
 * Create a debounced version of a function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  ms: number,
  fn: T
): (...args: Parameters<T>) => void {
  let timerId: number | null = null
  return (...args: Parameters<T>) => {
    if (timerId) window.clearTimeout(timerId)
    timerId = window.setTimeout(() => {
      fn(...args)
      timerId = null
    }, ms)
  }
}
