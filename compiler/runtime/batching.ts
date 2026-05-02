/**
 * Frame Batching Utilities
 *
 * Batches DOM updates into single animation frames for performance.
 *
 * Implementation lives inside `createBatchingModule()` so the entire
 * thing is self-contained — typed unit tests instantiate the module,
 * and the runtime template stamps the factory verbatim via .toString()
 * so production runs the same code. The shared frame-state flag lives
 * in the closure, not at module level.
 */

interface BatchingModule {
  isInsideFrame(): boolean
  setFrameState(value: boolean): void
  batchInFrame(fn: () => void): void
}

/**
 * Factory: returns a fresh batching module with its own
 * `_insideFrameCallback` flag. Self-contained so the runtime template
 * can stamp it as a single block.
 */
export function createBatchingModule(): BatchingModule {
  // Track whether we're currently inside a requestAnimationFrame
  // callback. When true, state transitions execute immediately to
  // avoid one-frame delay for watched/dependent elements.
  let insideFrame = false

  function isInsideFrame(): boolean {
    return insideFrame
  }

  function setFrameState(value: boolean): void {
    insideFrame = value
  }

  function batchInFrame(fn: () => void): void {
    if (insideFrame) {
      fn()
      return
    }
    requestAnimationFrame(() => {
      insideFrame = true
      try {
        fn()
      } finally {
        insideFrame = false
      }
    })
  }

  return { isInsideFrame, setFrameState, batchInFrame }
}

// Module-level singleton for code that imports the helpers directly.
// The runtime template instantiates its own copy via createBatchingModule()
// — see compiler/backends/dom/runtime-template/index.ts.
const _module = createBatchingModule()
export const isInsideFrame = _module.isInsideFrame
export const setFrameState = _module.setFrameState
export const batchInFrame = _module.batchInFrame
