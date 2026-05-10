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
    if (prelude) {
      const separator = `\n\n// === ${compileFile} ===\n`
      return {
        resolvedCode: prelude + separator + compileCode,
        preludeOffset: prelude.length + separator.length,
        isWrappedWithApp: false,
      }
    }
    return {
      resolvedCode: compileCode,
      preludeOffset: 0,
      isWrappedWithApp: false,
    }
  }

  const indentedCode = compileCode
    .split('\n')
    .map(line => (line ? '  ' + line : ''))
    .join('\n')

  if (prelude) {
    const separator = `\n\n// === ${compileFile} ===\n`
    return {
      resolvedCode: prelude + separator + APP_ROOT + '\n' + indentedCode,
      preludeOffset: prelude.length + separator.length + APP_ROOT.length + 1,
      isWrappedWithApp: true,
    }
  }
  return {
    resolvedCode: APP_ROOT + '\n' + indentedCode,
    preludeOffset: APP_ROOT.length + 1,
    isWrappedWithApp: true,
  }
}
