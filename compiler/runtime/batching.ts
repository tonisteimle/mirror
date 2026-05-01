/**
 * Frame Batching Utilities
 *
 * Batches DOM updates into single animation frames for performance.
 */

/**
 * Track whether we're currently inside a requestAnimationFrame callback.
 * When true, state transitions execute immediately to avoid one-frame
 * delay for watched/dependent elements.
 */
let _insideFrameCallback = false

/**
 * Check if currently inside a frame callback
 */
export function isInsideFrame(): boolean {
  return _insideFrameCallback
}

/**
 * Set frame callback state (used internally)
 */
export function setFrameState(value: boolean): void {
  _insideFrameCallback = value
}

/**
 * Batch a function to run in the next animation frame.
 * If already inside a frame, executes immediately.
 */
export function batchInFrame(fn: () => void): void {
  if (_insideFrameCallback) {
    fn()
    return
  }
  requestAnimationFrame(() => {
    _insideFrameCallback = true
    try {
      fn()
    } finally {
      _insideFrameCallback = false
    }
  })
}
