/**
 * Token resolver.
 *
 * Mirror tokens are root-level definitions of the form:
 *
 *   primary.bg: #2271c1
 *   primary.col: white
 *   space.gap: 12
 *
 * Properties reference them with `$<name>`:
 *
 *   Frame bg $primary, col $primary, gap $space
 *
 * Mirror's own resolver looks up `<name>.<propertyName>` automatically
 * — `bg $primary` becomes `primary.bg`. The reader needs the same
 * resolution so it can return a comparable value (the resolved hex /
 * number / etc.) rather than the raw `$primary` string.
 *
 * For now this resolver only handles the auto-suffix form. Property
 * sets (e.g. `cardstyle: bg #1a1a1a, pad 16, rad 8` used as
 * `Frame $cardstyle`) are out of scope — they expand into multiple
 * properties and need a multi-value path.
 */

/**
 * Resolve a token reference (with leading `$`) to its value, given the
 * full Mirror source and the property name we're resolving for.
 *
 * Returns null if the value is not a token reference, or if the token
 * can't be found in the source.
 *
 * Examples:
 *   resolveTokenForProperty('$primary', 'bg', source)
 *     → if source has `primary.bg: #2271c1`, returns `#2271c1`
 *     → otherwise returns null
 */
export function resolveTokenForProperty(
  rawValue: string,
  propertyName: string,
  source: string
): string | null {
  if (!rawValue.startsWith('$')) return null
  const tokenName = rawValue.slice(1)
  // Look for `<tokenName>.<propertyName>: <value>` at the start of any line.
  // The value runs to end-of-line, with surrounding whitespace trimmed.
  const escaped = `${tokenName}\\.${propertyName.replace(/-/g, '\\-')}`
  const re = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:\\s*([^\\n]+)`)
  const m = source.match(re)
  if (!m) return null
  return m[1].trim()
}

/**
 * Convenience: if the raw value is a token reference, resolve it; else
 * return the raw value unchanged. Used by readers that always want "the
 * effective value, whatever form the source used".
 */
export function maybeResolveToken(rawValue: string, propertyName: string, source: string): string {
  const resolved = resolveTokenForProperty(rawValue, propertyName, source)
  return resolved ?? rawValue
}
