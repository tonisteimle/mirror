/**
 * State-update payload builder for `app.ts:compile()`.
 *
 * After `resolveCompileSource()` produces the resolved code + prelude
 * offsets, `compile()` writes a slice of that into the studio state so
 * Commands / sync / SourceMap can reason about character ↔ line
 * positions in the prelude-prepended source. Two paths differ:
 *
 *   - Production: `preludeLineOffset` is **recomputed** from
 *     `resolvedCode` because `resolveCompileSource` doesn't always
 *     pre-compute it; `isWrappedWithApp` carries through as-is.
 *   - Test mode: `preludeLineOffset` is taken as-is (already computed
 *     in the test-aware branch upstream); `isWrappedWithApp` is forced
 *     to `false` because tests expect deterministic node-IDs from the
 *     user's source, not from a synthetic App root. Additionally the
 *     sync layer's lineOffset is pushed so editor → sourceMap line
 *     resolution in tests matches the resolved source.
 *
 * Pure helper: takes the inputs, returns the payload + a flag for the
 * sync-side effect. Caller does the actual `state.set(...)` and
 * `sync.lineOffset.setOffset(...)`.
 */

import { preludeLineOffset as computePreludeLineOffset } from './wrap-layout'

export interface CompileStateInputs {
  resolvedCode: string
  preludeOffset: number
  preludeLineOffset: number
  isWrappedWithApp: boolean
  testMode: boolean
}

export interface CompileStatePayload {
  resolvedSource: string
  preludeOffset: number
  preludeLineOffset: number
  isWrappedWithApp: boolean
}

export interface CompileStateUpdate {
  /** Payload for `state.set(...)`. */
  payload: CompileStatePayload
  /**
   * In production this is the freshly-recomputed line offset (caller
   * should mutate its local `currentPreludeLineOffset` to match). In
   * test mode this equals the input — caller keeps its existing value.
   */
  newPreludeLineOffset: number
  /**
   * `true` only in test mode: caller should additionally call
   * `sync.lineOffset.setOffset(newPreludeLineOffset)` so editor →
   * sourceMap resolution sees the same offset.
   */
  pushSyncOffset: boolean
}

export function computeCompileStateUpdate(inputs: CompileStateInputs): CompileStateUpdate {
  if (!inputs.testMode) {
    const recomputed = computePreludeLineOffset(inputs.resolvedCode, inputs.preludeOffset)
    return {
      payload: {
        resolvedSource: inputs.resolvedCode,
        preludeOffset: inputs.preludeOffset,
        preludeLineOffset: recomputed,
        isWrappedWithApp: inputs.isWrappedWithApp,
      },
      newPreludeLineOffset: recomputed,
      pushSyncOffset: false,
    }
  }
  return {
    payload: {
      resolvedSource: inputs.resolvedCode,
      preludeOffset: inputs.preludeOffset,
      preludeLineOffset: inputs.preludeLineOffset,
      isWrappedWithApp: false,
    },
    newPreludeLineOffset: inputs.preludeLineOffset,
    pushSyncOffset: true,
  }
}
