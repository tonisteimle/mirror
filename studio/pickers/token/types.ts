/**
 * Token Picker Types
 */

import { getTokenSuffix, inferTokenTypeFromSuffix } from '../../../compiler/schema/token-suffixes'

export type TokenType = 'color' | 'spacing' | 'size' | 'font' | 'other'

/** A single property inside a property-set (`cardstyle: bg #1a1a1a, pad 16, …`). */
export interface SetProperty {
  name: string // e.g. "bg", "pad", "rad"
  value: string // raw value as written; multi-token values joined by space ("10 20")
}

export interface TokenDefinition {
  name: string // e.g., "$accent.bg" (single) or "$cardstyle" (set)
  value: string // e.g., "#007bff" (single) or property-bag preview text (set)
  type: TokenType // 'color'|'spacing'|… for single; 'other' for sets
  category?: string // e.g., "primary", "secondary"
  description?: string
  /**
   * Discriminator. `'single'` is the historical default (single-value tokens
   * like `primary.bg: #2271C1`). `'set'` flags property-set tokens like
   * `cardstyle: bg #1a1a1a, pad 16, rad 8` — Slice 78.
   */
  kind?: 'single' | 'set'
  /**
   * Constituent properties when `kind === 'set'`. Used by the picker to render
   * a property-bag preview instead of a color-swatch, and by the trigger to
   * decide where the set is applicable. `undefined` for single-value tokens.
   */
  properties?: SetProperty[]
}

export interface TokenContext {
  property: string // Current property being edited (bg, pad, col, etc.)
  nodeType?: string // Component type
  allowedTypes: TokenType[]
}

// Property to token type mapping
export const PROPERTY_TOKEN_TYPES: Record<string, TokenType[]> = {
  // Colors
  bg: ['color'],
  background: ['color'],
  col: ['color'],
  color: ['color'],
  boc: ['color'],
  bordercolor: ['color'],
  fill: ['color'],

  // Spacing
  pad: ['spacing'],
  padding: ['spacing'],
  margin: ['spacing'],
  gap: ['spacing'],

  // Sizes
  w: ['size', 'spacing'],
  width: ['size', 'spacing'],
  h: ['size', 'spacing'],
  height: ['size', 'spacing'],
  minw: ['size', 'spacing'],
  maxw: ['size', 'spacing'],
  minh: ['size', 'spacing'],
  maxh: ['size', 'spacing'],
  rad: ['size', 'spacing'],
  radius: ['size', 'spacing'],

  // Fonts
  font: ['font'],
  fontsize: ['size', 'font'],
  fs: ['size', 'font'],
  lineheight: ['size'],
  lh: ['size'],
}

/**
 * Get allowed token types for a property.
 *
 * Resolution order (Slice 78 Iter-2):
 *   1. Picker-explicit `PROPERTY_TOKEN_TYPES` (UI-vocabulary, includes the
 *      picker-only `'spacing'` distinction).
 *   2. Schema-derived fallback via `compiler/schema/token-suffixes.ts`. Maps
 *      the compiler `TokenType` to picker vocabulary:
 *        'color' → ['color']
 *        'size'  → ['size', 'spacing']  (most permissive — picker-`spacing`
 *                                         is a UI-grouping, not a schema concept)
 *        'font'  → ['font']
 *        'icon'  → ['other']            (no picker UI for icon-typed tokens yet)
 *   3. `['other']` for unknown properties.
 *
 * Iter-1 stopped at step 1, leaving the picker blind for 25 compiler-known
 * aliases (`c`, `p`, `m`, `mar`, `font-family`, `weight`, `ls`, `tracking`,
 * `min-height`, `max-height`, etc.). Iter-2 adds the schema fallback so any
 * future compiler-schema addition is reachable from the picker without
 * editing this map.
 */
export function getTokenTypesForProperty(property: string): TokenType[] {
  const normalized = property.toLowerCase().replace(/[-_]/g, '')
  if (normalized in PROPERTY_TOKEN_TYPES) return PROPERTY_TOKEN_TYPES[normalized]
  const canonicalSuffix = getTokenSuffix(property)
  if (!canonicalSuffix) return ['other']
  const schemaType = inferTokenTypeFromSuffix(canonicalSuffix)
  if (schemaType === 'color') return ['color']
  if (schemaType === 'size') return ['size', 'spacing']
  if (schemaType === 'font') return ['font']
  return ['other']
}

/** Word that looks like a Mirror property name (used to detect property-set values). */
const PROPERTY_NAME_RE = /^[a-zA-Z][a-zA-Z0-9-]*$/

/**
 * Parse a property-set value body — the part after `cardstyle:` in
 * `cardstyle: bg #1a1a1a, pad 16, rad 8`. Returns `null` if the body
 * doesn't look like a property list (so the caller can fall through).
 *
 * Each comma-separated segment is split into a property name (first
 * lookup-word) and a value (rest of the segment). `bg #1a1a1a` →
 * `{name: 'bg', value: '#1a1a1a'}`; `pad 10 20` → `{name: 'pad', value: '10 20'}`.
 *
 * Rule: a property-set must contain **at least two** comma-separated
 * properties. Single-segment bodies are returned as `null` so that
 * `$text: hello world` (which isn't a token at all in Mirror) doesn't
 * accidentally parse as a one-property set. Multi-property sets are the
 * documented form anyway (Tutorial: „Property Sets bündeln *mehrere*
 * Properties").
 */
function parseSetBody(body: string): SetProperty[] | null {
  const segments = body
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
  if (segments.length < 2) return null

  const properties: SetProperty[] = []
  for (const segment of segments) {
    const firstSpace = segment.search(/\s/)
    // Standalone keyword (`hor`, `center`, `wrap`) — name with empty value.
    if (firstSpace === -1) {
      if (!PROPERTY_NAME_RE.test(segment)) return null
      properties.push({ name: segment, value: '' })
      continue
    }
    const name = segment.slice(0, firstSpace)
    const value = segment.slice(firstSpace + 1).trim()
    if (!PROPERTY_NAME_RE.test(name)) return null
    properties.push({ name, value })
  }
  return properties
}

/** Build a short preview-text for a property-set (`bg #1a1a1a · pad 16 · …`). */
function setPreviewValue(properties: SetProperty[]): string {
  const head = properties
    .slice(0, 3)
    .map(p => (p.value ? `${p.name} ${p.value}` : p.name))
    .join(' · ')
  return properties.length > 3 ? `${head} · +${properties.length - 3} more` : head
}

/**
 * Parse token definitions from source code.
 *
 * Supports four definition forms:
 *   - `name.suffix: value`           single-value with suffix    (e.g. `primary.bg: #2271C1`)
 *   - `name: value`                  single-value without suffix (e.g. `grey-800: #333`)
 *   - `name: $other`                 single-value chain          (e.g. `accent.bg: $primary`)
 *   - `name: prop value, prop value` property-set                (e.g. `cardstyle: bg #1a1a1a, pad 16, rad 8`)
 *
 * Property-sets (Slice 25 / Slice 78) get `kind: 'set'` and a `properties`
 * array with the constituent (name, value) pairs.
 *
 * Chain resolution (Slice 24 / Slice 78 V-5): single-value tokens whose value
 * starts with `$` follow up to 8 hops to the terminal value, so the picker's
 * color-swatch preview reflects the effective hex even for indirected tokens.
 */
export function parseTokens(source: string): TokenDefinition[] {
  const tokens: TokenDefinition[] = []
  const lines = source.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('#')) {
      continue
    }

    // Match token definition with property suffix: $name.property: value
    const matchWithSuffix = trimmed.match(/^\$?([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+):\s*(.+)$/)
    if (matchWithSuffix) {
      const [, category, prop, rawValue] = matchWithSuffix
      // Strip inline comments
      const value = rawValue.split('//')[0].trim()
      const name = `$${category}.${prop}`

      // Determine type from property name
      let type: TokenType = 'other'
      if (/^(bg|col|color|fill|boc)$/i.test(prop) || /^#[0-9a-f]{3,8}$/i.test(value)) {
        type = 'color'
      } else if (/^(pad|margin|gap|spacing)$/i.test(prop)) {
        type = 'spacing'
      } else if (/^(w|h|size|rad|radius)$/i.test(prop) || /^\d+$/.test(value)) {
        type = 'size'
      } else if (/^(font|fs|lh)$/i.test(prop)) {
        type = 'font'
      }

      tokens.push({
        name,
        value,
        type,
        category,
        kind: 'single',
      })
      continue
    }

    // Match: name: <body>  (no suffix on the LHS).
    // Three sub-forms:
    //   - simple-value:  bg-like value (#hex, number, $-ref)
    //   - chain-ref:     `$other` only (single-value chain)
    //   - property-set:  body matches `prop value, prop value, …`
    const matchSimple = trimmed.match(/^\$?([a-zA-Z][a-zA-Z0-9_-]*):\s*(.+)$/)
    if (matchSimple) {
      const [, rawName, rawValue] = matchSimple
      const body = rawValue.split('//')[0].trim() // strip inline comments
      const name = rawName.startsWith('$') ? rawName : `$${rawName}`

      // Single-value form: hex, number, or a single $-ref.
      if (/^(#[0-9a-f]{3,8}|\d+|\$[\w.-]+)$/i.test(body)) {
        let type: TokenType = 'other'
        if (/^#[0-9a-f]{3,8}$/i.test(body) || /^\$[\w.-]+\.(bg|col|color|boc)$/i.test(body)) {
          type = 'color'
        } else if (/^\d+$/.test(body) || /^\$[\w.-]+\.(pad|gap|margin)$/i.test(body)) {
          type = 'spacing'
        }
        tokens.push({
          name,
          value: body,
          type,
          kind: 'single',
        })
        continue
      }

      // Property-set form: `prop value, prop value, …`. Slice 78 V-1.
      const setProps = parseSetBody(body)
      if (setProps && setProps.length > 0) {
        tokens.push({
          name,
          value: setPreviewValue(setProps),
          type: 'other',
          kind: 'set',
          properties: setProps,
        })
        continue
      }
      // Body shape unrecognised — skip silently (matches old behaviour).
    }
  }

  // Chain-resolution pass: for single-value tokens whose value is `$other`,
  // follow up to 8 hops to the terminal value. The picker uses `value` to
  // render the color-swatch; a literal `$primary` would not be a valid CSS
  // color and the swatch would not paint. Slice 78 V-5.
  //
  // Suffix-aware lookup: a chain like `accent.bg: $primary` written with a
  // suffix on the LHS can mean "primary.bg" — the same `.bg` suffix. If
  // the bare `$primary` doesn't exist as a token, try `$primary.<suffix>`
  // before giving up. Mirrors what the compiler's positional resolver does.
  const byName = new Map<string, TokenDefinition>()
  for (const t of tokens) byName.set(t.name, t)
  const suffixOf = (n: string): string | undefined => {
    const dot = n.lastIndexOf('.')
    return dot >= 0 ? n.slice(dot + 1) : undefined
  }
  for (const t of tokens) {
    if (t.kind !== 'single' || !t.value.startsWith('$')) continue
    const ownSuffix = suffixOf(t.name)
    let cur = t.value
    for (let hop = 0; hop < 8 && cur.startsWith('$'); hop++) {
      let next = byName.get(cur)
      if (!next && ownSuffix) {
        // Fall back to suffix-aware lookup: `$primary` + suffix `.bg` → `$primary.bg`.
        next = byName.get(`${cur}.${ownSuffix}`)
      }
      if (!next || next === t || next.value === cur) break
      cur = next.value
      if (!cur.startsWith('$')) {
        t.value = cur
        // Re-classify type if we just resolved to a hex (chain-of-color).
        if (t.type === 'other' && /^#[0-9a-f]{3,8}$/i.test(cur)) t.type = 'color'
        break
      }
    }
  }

  return tokens
}

/**
 * Parse tokens from multiple files
 * Returns unique tokens (deduped by name)
 */
export function parseTokensFromFiles(files: Record<string, string>): TokenDefinition[] {
  const allTokens: TokenDefinition[] = [],
    seen = new Set<string>()
  for (const [, content] of Object.entries(files)) {
    if (!content) continue
    for (const token of parseTokens(content)) {
      if (!seen.has(token.name)) {
        seen.add(token.name)
        allTokens.push(token)
      }
    }
  }
  return allTokens
}

/**
 * Filter tokens by property suffix
 */
export function filterTokensBySuffix(tokens: TokenDefinition[], suffix: string): TokenDefinition[] {
  if (!suffix) return tokens
  return tokens.filter(t => t.name.endsWith(suffix))
}

/**
 * Filter tokens by type
 */
export function filterTokensByType(
  tokens: TokenDefinition[],
  types: TokenType[]
): TokenDefinition[] {
  if (!types || types.length === 0) return tokens
  return tokens.filter(t => types.includes(t.type))
}

/**
 * Filter tokens by search query
 */
export function filterTokensBySearch(tokens: TokenDefinition[], query: string): TokenDefinition[] {
  if (!query) return tokens
  const lowerQuery = query.toLowerCase()
  return tokens.filter(
    t =>
      t.name.toLowerCase().includes(lowerQuery) ||
      t.value.toLowerCase().includes(lowerQuery) ||
      (t.category && t.category.toLowerCase().includes(lowerQuery))
  )
}
