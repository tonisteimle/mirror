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

// Token parsing now lives in `./parse-via-ast.ts` — built on top of the
// canonical compiler parser. The earlier regex-based parseTokens /
// parseTokensFromFiles in this file were removed in slice 5 of the
// migration tracked in docs/findings.md ("Studio dupliziert Compiler-
// Pfade"). Re-exports below preserve the public surface so call-sites
// keep working under the original names.
export {
  parseTokensViaAST as parseTokens,
  parseTokensFromFilesViaAST as parseTokensFromFiles,
} from './parse-via-ast'

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
