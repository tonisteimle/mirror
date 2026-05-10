/**
 * Framework backend — Props/States serialization (Slice 4 of
 * framework-backend-decomp).
 *
 *   propsToString   — props record → `{ key: value, … }` JS object-literal
 *                     string. Quotes non-identifier keys (`'font-size'`
 *                     vs bare `fs`), formats strings/numbers/booleans/
 *                     arrays inline.
 *   statesToString  — nested states record → `{ hover: { … }, focus: { … } }`.
 *
 * Pure — no `this` state, no external deps.
 *
 * Extracted from `compiler/backends/framework.ts` per
 * `docs/refactoring/framework-backend-decomp.md`. Behaviour is byte-
 * identical to the pre-extraction call sites.
 */

/**
 * Convert props object to string.
 */
export function propsToString(props: Record<string, unknown>): string {
  const entries = Object.entries(props)
  if (entries.length === 0) return ''

  const parts: string[] = []

  // Quote any key that isn't a valid bare JS identifier. Without this,
  // CSS-style hyphenated keys like `font-size` become illegal JS:
  //   `M('X', { font-size: 0 })` ← SyntaxError on the hyphen.
  const isValidIdent = (k: string) => /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
  const fmtKey = (k: string) => (isValidIdent(k) ? k : `'${k}'`)

  for (const [key, value] of entries) {
    const k = fmtKey(key)
    if (key === 'states') {
      // States need special formatting
      parts.push(`states: ${statesToString(value as Record<string, Record<string, unknown>>)}`)
    } else if (typeof value === 'string') {
      parts.push(`${k}: '${value}'`)
    } else if (typeof value === 'boolean') {
      parts.push(`${k}: ${value}`)
    } else if (typeof value === 'number') {
      parts.push(`${k}: ${value}`)
    } else if (Array.isArray(value)) {
      const arrayStr = value.map(v => (typeof v === 'string' ? `'${v}'` : v)).join(', ')
      parts.push(`${k}: [${arrayStr}]`)
    } else {
      parts.push(`${k}: ${JSON.stringify(value)}`)
    }
  }

  return `{ ${parts.join(', ')} }`
}

/**
 * Convert states object to string.
 */
export function statesToString(states: Record<string, Record<string, unknown>>): string {
  const parts = Object.entries(states).map(([stateName, stateProps]) => {
    const propParts = Object.entries(stateProps).map(([key, value]) =>
      typeof value === 'string' ? `${key}: '${value}'` : `${key}: ${value}`
    )
    return `${stateName}: { ${propParts.join(', ')} }`
  })
  return `{ ${parts.join(', ')} }`
}
