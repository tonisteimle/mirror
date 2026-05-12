/**
 * Compile-source resolver for compile().
 *
 * Four branches decide how the editor's source becomes the input that
 * `MirrorLang.parse()` actually sees:
 *
 *   1. testMode + layout       → prelude + user code, no App-wrap
 *      (test framework expects deterministic node-1 = first user node).
 *   2. testMode + non-layout   → user code alone (tokens/components self-compile).
 *   3. !testMode + layout      → wrapLayoutForCompile (may insert App-root).
 *   4. !testMode + non-layout  → user code alone, BUT compile()'s existing
 *      preludeOffset / preludeLineOffset / isWrappedWithApp closure
 *      values stay untouched (legacy passthrough).
 *
 * Pure: pulls prependPrelude / wrapLayoutForCompile / preludeLineOffset
 * from wrap-layout.ts. Returns `Partial<...>`-style with `undefined` for
 * fields the caller must NOT update (preserves Branch 4 passthrough).
 */

import { prependPrelude, preludeLineOffset, wrapLayoutForCompile } from './wrap-layout'

export interface ResolveCompileSourceInputs {
  compileCode: string
  compileFile: string
  /** File type for `compileFile` — only `'layout'` triggers wrap/prelude
   *  logic; everything else compiles standalone. */
  fileType: string
  /** Concatenated prelude (tokens + components) for this file, or null. */
  prelude: string | null
  /** True when the studio runs under the browser-test framework. */
  testMode: boolean
}

export interface ResolveCompileSourceResult {
  /** Always set. The source `MirrorLang.parse` should receive. */
  resolvedCode: string
  /** Character offset where the user's source starts inside `resolvedCode`.
   *  `undefined` only for Branch 4 (passthrough — caller keeps stale value). */
  preludeOffset?: number
  /** Line offset. Set in Branches 1 and 2 (testMode). For Branch 3
   *  (!testMode + layout) the caller computes this later in the state-update
   *  block. `undefined` also for Branch 4. */
  preludeLineOffset?: number
  /** True when wrapLayoutForCompile inserted an implicit App-root. Set in
   *  Branch 3 only — `undefined` for Branches 1, 2, 4. */
  isWrappedWithApp?: boolean
}

export function resolveCompileSource(
  inputs: ResolveCompileSourceInputs
): ResolveCompileSourceResult {
  const { compileCode, compileFile, fileType, prelude, testMode } = inputs

  // Branch 1 — testMode + layout: prelude + code, no App-wrap.
  if (testMode && fileType === 'layout') {
    const prepended = prependPrelude(compileCode, compileFile, prelude)
    return {
      resolvedCode: prepended.resolvedCode,
      preludeOffset: prepended.preludeOffset,
      preludeLineOffset: preludeLineOffset(prepended.resolvedCode, prepended.preludeOffset),
    }
  }

  // Branch 2 — testMode + non-layout: code stands alone.
  if (testMode) {
    return {
      resolvedCode: compileCode,
      preludeOffset: 0,
      preludeLineOffset: 0,
    }
  }

  // Branch 3 — !testMode + layout: wrap (may insert App-root).
  if (fileType === 'layout') {
    const wrap = wrapLayoutForCompile(compileCode, compileFile, prelude)
    return {
      resolvedCode: wrap.resolvedCode,
      preludeOffset: wrap.preludeOffset,
      isWrappedWithApp: wrap.isWrappedWithApp,
    }
  }

  // Branch 4 — !testMode + non-layout: passthrough. Caller's closure
  // vars (currentPreludeOffset, currentPreludeLineOffset, isWrappedWithApp)
  // keep their values from the previous compile — legacy behavior, pinned.
  return { resolvedCode: compileCode }
}
