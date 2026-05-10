/**
 * Token Suffixes — Single Source of Truth for property/suffix relationships
 *
 * One canonical map and a small set of helpers for the four places that used
 * to each carry their own knowledge:
 *
 *  - IR `value-resolver`         — use-site `bg $primary` → `var(--primary-bg)`
 *  - Backend chain-resolver      — `accent.bg: $primary` → follow the reference
 *  - Backend px-unit emitter     — append `px` to numeric size-token values
 *  - Parser type inference       — derive `'color' | 'size' | 'font'` from suffix
 *  - Studio token-picker filter  — show tokens compatible with the active property
 *
 * Adding a new property/suffix? Add one entry here. All five consumers pick it
 * up automatically.
 */

/** Token-type categories used throughout the compiler and studio. */
export type TokenType = 'color' | 'size' | 'font' | 'icon'

/**
 * Canonical map: DSL property name → token suffix.
 *
 * Aliases (`bg` and `background`, `col` and `color` and `c`) all map to the
 * same suffix so token-resolution works regardless of which alias the user
 * typed.
 */
export const PROPERTY_TO_TOKEN_SUFFIX: Record<string, string> = {
  // Background
  bg: '.bg',
  background: '.bg',
  // Color
  col: '.col',
  color: '.col',
  c: '.col',
  // Border color
  boc: '.boc',
  'border-color': '.boc',
  // Radius
  rad: '.rad',
  radius: '.rad',
  // Padding
  pad: '.pad',
  padding: '.pad',
  p: '.pad',
  // Margin
  mar: '.mar',
  margin: '.mar',
  m: '.mar',
  // Gap
  gap: '.gap',
  g: '.gap',
  // Width/Height
  w: '.w',
  width: '.w',
  h: '.h',
  height: '.h',
  // Min/Max sizing
  minw: '.minw',
  'min-width': '.minw',
  maxw: '.maxw',
  'max-width': '.maxw',
  minh: '.minh',
  'min-height': '.minh',
  maxh: '.maxh',
  'max-height': '.maxh',
  // Font size
  fs: '.fs',
  'font-size': '.fs',
  // Typography
  weight: '.weight',
  'font-weight': '.weight',
  line: '.line',
  'line-height': '.line',
  font: '.font',
  'font-family': '.font',
  ls: '.ls',
  'letter-spacing': '.ls',
  tracking: '.ls',
  // Icon
  ic: '.ic',
  'icon-color': '.ic',
  is: '.is',
  'icon-size': '.is',
  // Grid (Slice 6 V-4): column count for `Frame grid $cols` with `cols.grid: 12`.
  // Numeric size-token (column count, not a px-length, but the suffix unifies
  // suffix-aware lookup across all backends so React resolves `grid $cols` to
  // the actual count instead of falling through unresolved.
  grid: '.grid',
  'row-height': '.rh',
  rh: '.rh',
  // Slice 7 V-1: explicit grid position. `header.x: 1` + `Frame x $header`
  // resolves via `.x` suffix. Like `.grid`, these are unitless (grid-line
  // numbers); intentionally NOT in SIZE_SUFFIXES so no `px` is appended.
  // Outside-of-grid use (absolute positioning) with token values is not
  // a supported pattern — use literal numbers there.
  x: '.x',
  y: '.y',
}

/** Suffixes that carry size semantics (numeric values get a `px` unit). */
const SIZE_SUFFIXES = new Set([
  '.pad',
  '.gap',
  '.mar',
  '.rad',
  '.w',
  '.h',
  '.minw',
  '.maxw',
  '.minh',
  '.maxh',
  '.fs',
  '.line',
  '.ls',
  '.is',
  // Slice 6 V-4: `row-height` carries px semantics (grid-auto-rows). `.grid`,
  // `.x`, `.y` are unitless counts (column count, grid-line indices) and
  // intentionally NOT in this set — they're classified numeric below.
  '.rh',
])

/**
 * Suffixes that are numeric counts/indices (no `px` suffix), but still
 * classified as 'size' for token-picker/validator purposes (Slice 6 V-4 +
 * Slice 7 V-1 + Slice 78 Iter-2). Separate from SIZE_SUFFIXES because
 * `needsPxUnit` must NOT append `px` to grid column counts, grid-line
 * indices or font-weight numerics.
 *
 * `.weight` (font-weight, e.g. 100..900): numeric, unitless — Slice 78 Iter-2
 * surfaced that the picker reported `getTokenTypesForProperty('weight') →
 * ['other']` because no classifier owned `.weight`. Putting it in
 * COUNT_SUFFIXES makes the picker reach weight tokens AND keeps `weight: 700`
 * unitless in the emitted CSS.
 */
const COUNT_SUFFIXES = new Set(['.grid', '.x', '.y', '.weight'])

/** Suffixes that carry font semantics (typeface tokens). */
const FONT_SUFFIXES = new Set(['.font'])

/** Suffixes that carry color semantics (hex / named / rgba). */
const COLOR_SUFFIXES = new Set(['.bg', '.col', '.boc', '.ic'])

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get the token suffix for a DSL property name.
 *
 *   getTokenSuffix('bg')         → '.bg'
 *   getTokenSuffix('background') → '.bg'
 *   getTokenSuffix('unknown')    → undefined
 */
export function getTokenSuffix(propertyName: string): string | undefined {
  return PROPERTY_TO_TOKEN_SUFFIX[propertyName]
}

/**
 * Get the list of property aliases compatible with a given suffix.
 *
 *   getCompatibleProperties('.bg')  → ['bg', 'background']
 *   getCompatibleProperties('.col') → ['col', 'color', 'c']
 *   getCompatibleProperties('.xyz') → []
 */
export function getCompatibleProperties(suffix: string): string[] {
  return Object.entries(PROPERTY_TO_TOKEN_SUFFIX)
    .filter(([, s]) => s === suffix)
    .map(([prop]) => prop)
}

/**
 * Infer the token type from its suffix.
 *
 *   inferTokenTypeFromSuffix('.bg')   → 'color'
 *   inferTokenTypeFromSuffix('.pad')  → 'size'
 *   inferTokenTypeFromSuffix('.font') → 'font'
 *   inferTokenTypeFromSuffix('')      → undefined
 */
export function inferTokenTypeFromSuffix(suffix: string): TokenType | undefined {
  if (SIZE_SUFFIXES.has(suffix)) return 'size'
  if (COUNT_SUFFIXES.has(suffix)) return 'size'
  if (FONT_SUFFIXES.has(suffix)) return 'font'
  if (COLOR_SUFFIXES.has(suffix)) return 'color'
  return undefined
}

/**
 * Does this token name need a `px` unit appended to numeric values?
 * Looks at the suffix portion of the name.
 *
 *   needsPxUnit('btn.pad')      → true
 *   needsPxUnit('primary.bg')   → false
 *   needsPxUnit('container.w')  → true
 */
export function needsPxUnit(tokenName: string): boolean {
  const dotIndex = tokenName.lastIndexOf('.')
  if (dotIndex < 0) return false
  const suffix = tokenName.slice(dotIndex)
  return SIZE_SUFFIXES.has(suffix)
}

/**
 * Extract the suffix from a token name (with leading dot), or empty string
 * if none.
 *
 *   getSuffix('primary.bg') → '.bg'
 *   getSuffix('primary')    → ''
 */
export function getSuffix(tokenName: string): string {
  const dotIndex = tokenName.lastIndexOf('.')
  if (dotIndex < 0) return ''
  return tokenName.slice(dotIndex)
}

/**
 * Strip a leading `$` prefix from a token reference value.
 *
 *   stripDollar('$primary') → 'primary'
 *   stripDollar('primary')  → 'primary'
 */
export function stripDollar(value: string): string {
  return value.startsWith('$') ? value.slice(1) : value
}

/**
 * Convert a token name to its CSS variable name (dots → hyphens, no `$`).
 *
 *   tokenToCSSVarName('primary.bg')   → 'primary-bg'
 *   tokenToCSSVarName('$primary.bg')  → 'primary-bg'
 *   tokenToCSSVarName('grey-800')     → 'grey-800'
 */
export function tokenToCSSVarName(tokenName: string): string {
  return stripDollar(tokenName).replace(/\./g, '-')
}
