/**
 * Layout-file wrap logic for compile().
 *
 * Mirror layouts compile in two flavors:
 *
 *   1. Implicit-`App` mode (the default): the user's code is treated as the
 *      body of an implicit `App` root. We prepend `App\n` and indent each
 *      user line by two spaces so it becomes a child.
 *
 *   2. Explicit mode: the user's code already starts with `App` OR contains
 *      one or more root-level component definitions (capital-letter name +
 *      `:` at column 0). Wrapping in those cases would either double-wrap
 *      or — worse — turn definitions into slot-fillers. We leave the code
 *      alone.
 *
 * The prelude (tokens + components from sibling files) is concatenated in
 * both flavors when present. The function returns the resolved source plus
 * the prelude offset (character count up to the start of the user's first
 * line), which `compile()` writes into state for Commands and the
 * line-offset tracker.
 *
 * Pure: no closures, no side effects. Inputs in, outputs out.
 */

export interface WrapLayoutResult {
  resolvedCode: string
  /** Character offset where the user's code starts within `resolvedCode`. */
  preludeOffset: number
  /** True when we wrapped the user's code in an implicit `App` root. */
  isWrappedWithApp: boolean
}

const APP_ROOT = 'App'

/**
 * Prepend `prelude` to `compileCode` with a `// === filename ===` separator.
 * No App-wrap. Used directly by test mode (which wants the user's first
 * element to be node-1, not the synthetic App) and indirectly by
 * `wrapLayoutForCompile` for the explicit-App / root-defs branches.
 */
export function prependPrelude(
  compileCode: string,
  compileFile: string,
  prelude: string | null
): { resolvedCode: string; preludeOffset: number } {
  if (!prelude) {
    return { resolvedCode: compileCode, preludeOffset: 0 }
  }
  const separator = `\n\n// === ${compileFile} ===\n`
  return {
    resolvedCode: prelude + separator + compileCode,
    preludeOffset: prelude.length + separator.length,
  }
}

/**
 * Convert a character-based prelude offset to a line-based offset.
 * Used by the line-offset tracker for editor → sourceMap line resolution.
 */
export function preludeLineOffset(resolvedCode: string, preludeOffset: number): number {
  if (preludeOffset === 0) return 0
  return resolvedCode.substring(0, preludeOffset).split('\n').length - 1
}

/**
 * True when `code` declares at least one root-level component definition
 * (capital-letter name + `:` at column 0). Wrapping such files in an
 * implicit `App` would re-interpret the definition as a slot filler.
 */
function hasRootComponentDefs(code: string): boolean {
  return code.split('\n').some(line => {
    const trimmed = line.trim()
    return (
      trimmed.match(/^[A-Z][a-zA-Z0-9]*:/) !== null &&
      !line.startsWith(' ') &&
      !line.startsWith('\t')
    )
  })
}

export function wrapLayoutForCompile(
  compileCode: string,
  compileFile: string,
  prelude: string | null
): WrapLayoutResult {
  const startsWithApp = compileCode.trimStart().startsWith(APP_ROOT)
  const skipWrap = startsWithApp || hasRootComponentDefs(compileCode)

  if (skipWrap) {
    return { ...prependPrelude(compileCode, compileFile, prelude), isWrappedWithApp: false }
  }

  const indentedCode = compileCode
    .split('\n')
    .map(line => (line ? '  ' + line : ''))
    .join('\n')
  const wrappedBody = APP_ROOT + '\n' + indentedCode
  const wrapped = prependPrelude(wrappedBody, compileFile, prelude)
  return {
    resolvedCode: wrapped.resolvedCode,
    preludeOffset: wrapped.preludeOffset + APP_ROOT.length + 1,
    isWrappedWithApp: true,
  }
}
