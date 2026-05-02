/**
 * Parser limits and shared constants.
 *
 * Lives in `ops/` so that ops modules can import these without pulling
 * in the Parser class as a value (which creates a circular import:
 * parser.ts imports ops modules; ops modules referencing `Parser.MAX_*`
 * imported Parser back).
 */

/** Maximum iterations for while loops to prevent infinite loops. Safety net. */
export const MAX_ITERATIONS = 100000

/** Maximum lookahead distance for line-based scans. DoS guard against very long lines. */
export const MAX_LOOKAHEAD = 1000

/** Maximum depth for condition chains (and/or). Prevents infinite loops in cross-element state conditions. */
export const MAX_CONDITION_DEPTH = 100

/** JavaScript keywords that signal the start of a JS code block. */
export const JS_KEYWORDS = new Set(['let', 'const', 'var', 'function', 'class'])
