// @vitest-environment jsdom
/**
 * Tests for studio/pickers/token/picker.ts (TokenPicker, 0%, 369 LOC)
 *  + studio/pickers/token/types.ts (parsing helpers, 0%, 196 LOC)
 *
 * Both bundled — types.ts has the pure parser/filter helpers, picker.ts
 * is the UI class.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenPicker, createTokenPicker } from '../../studio/pickers/token/picker'
import {
  parseTokens,
  parseTokensFromFiles,
  filterTokensBySuffix,
  filterTokensByType,
  filterTokensBySearch,
  getTokenTypesForProperty,
  PROPERTY_TOKEN_TYPES,
  type TokenDefinition,
} from '../../studio/pickers/token/types'

// =============================================================================
// types.ts — pure helpers
// =============================================================================

describe('getTokenTypesForProperty', () => {
  it('maps known properties to expected token types', () => {
    expect(getTokenTypesForProperty('bg')).toEqual(['color'])
    expect(getTokenTypesForProperty('col')).toEqual(['color'])
    expect(getTokenTypesForProperty('pad')).toEqual(['spacing'])
    expect(getTokenTypesForProperty('w')).toEqual(['size', 'spacing'])
    expect(getTokenTypesForProperty('font')).toEqual(['font'])
  })

  it('normalizes case + strips dashes/underscores', () => {
    expect(getTokenTypesForProperty('BG')).toEqual(['color'])
    expect(getTokenTypesForProperty('font-size')).toEqual(['size', 'font'])
    expect(getTokenTypesForProperty('font_size')).toEqual(['size', 'font'])
  })

  it('returns ["other"] for unknown properties', () => {
    expect(getTokenTypesForProperty('zzz')).toEqual(['other'])
  })

  it('PROPERTY_TOKEN_TYPES exports the registry', () => {
    expect(PROPERTY_TOKEN_TYPES.bg).toEqual(['color'])
  })

  // ---------------------------------------------------------------------------
  // Slice 78 Iter-2 / RT-19 — Schema-Fallback for compiler-known aliases.
  // Pre-Iter-2: 25 properties were missing from PROPERTY_TOKEN_TYPES so the
  // picker fell through to ['other'] and showed no tokens. Iter-2 added a
  // schema-fallback via compiler/schema/token-suffixes.ts.
  // ---------------------------------------------------------------------------
  describe('Slice 78 Iter-2 / RT-19 — schema fallback for missing aliases', () => {
    it('color aliases (`c`, `ic`, `icon-color`) resolve to ["color"]', () => {
      expect(getTokenTypesForProperty('c')).toEqual(['color'])
      expect(getTokenTypesForProperty('ic')).toEqual(['color'])
      expect(getTokenTypesForProperty('icon-color')).toEqual(['color'])
    })

    it('spacing/size aliases (`p`, `m`, `mar`, `g`) resolve to ["size","spacing"]', () => {
      expect(getTokenTypesForProperty('p')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('m')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('mar')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('g')).toEqual(['size', 'spacing'])
    })

    it('typography aliases (`font-family`, `ls`, `tracking`, `letter-spacing`)', () => {
      expect(getTokenTypesForProperty('font-family')).toEqual(['font'])
      expect(getTokenTypesForProperty('ls')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('tracking')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('letter-spacing')).toEqual(['size', 'spacing'])
    })

    it('min/max sizing aliases (`min-height`, `max-height`)', () => {
      expect(getTokenTypesForProperty('min-height')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('max-height')).toEqual(['size', 'spacing'])
    })

    it('grid + position aliases (`x`, `y`, `grid`, `row-height`, `rh`)', () => {
      expect(getTokenTypesForProperty('x')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('y')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('grid')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('row-height')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('rh')).toEqual(['size', 'spacing'])
    })
  })

  // ---------------------------------------------------------------------------
  // Slice 78 Iter-2 / RT-20 — `.weight` classified for picker AND unitless in compile.
  // Pre-Iter-2: `.weight` was in no schema classification set, so picker returned
  // ['other'] and `inferTokenTypeFromSuffix('.weight')` returned undefined. The
  // schema bug was orthogonal to picker — fixing it unblocks both surfaces.
  // ---------------------------------------------------------------------------
  describe('Slice 78 Iter-2 / RT-20 — `.weight` classifier coverage', () => {
    it('`weight` and `font-weight` resolve via schema fallback', () => {
      expect(getTokenTypesForProperty('weight')).toEqual(['size', 'spacing'])
      expect(getTokenTypesForProperty('font-weight')).toEqual(['size', 'spacing'])
    })
  })
})

describe('parseTokens', () => {
  it('parses dotted "$name.bg: #hex" into typed entries', () => {
    const tokens = parseTokens('$primary.bg: #2271C1\n$primary.col: #fff')
    expect(tokens).toHaveLength(2)
    expect(tokens[0]).toMatchObject({
      name: '$primary.bg',
      value: '#2271C1',
      type: 'color',
      category: 'primary',
    })
    expect(tokens[1].name).toBe('$primary.col')
  })

  it('parses simple "$name: value"', () => {
    const tokens = parseTokens('$accent: #5BA8F5')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('$accent')
    expect(tokens[0].value).toBe('#5BA8F5')
    expect(tokens[0].type).toBe('color')
  })

  it('parses "name: value" without leading $ (auto-prefixes)', () => {
    const tokens = parseTokens('primary: #ff0000')
    expect(tokens[0].name).toBe('$primary')
  })

  it('skips comments and blank lines', () => {
    const tokens = parseTokens(`
// comment line
# also a comment

$a: #fff
`)
    expect(tokens).toHaveLength(1)
    expect(tokens[0].name).toBe('$a')
  })

  it('strips inline // comments from values', () => {
    const tokens = parseTokens('$primary.bg: #2271C1 // primary brand color')
    expect(tokens[0].value).toBe('#2271C1')
  })

  it('detects type from property name (bg/col → color)', () => {
    const tokens = parseTokens('$x.bg: somevalue\n$x.col: another')
    expect(tokens[0].type).toBe('color')
    expect(tokens[1].type).toBe('color')
  })

  it('detects type from property name (pad/gap/margin → spacing)', () => {
    const tokens = parseTokens('$x.pad: 12\n$x.gap: 8')
    expect(tokens[0].type).toBe('spacing')
    expect(tokens[1].type).toBe('spacing')
  })

  it('detects type from value when property is ambiguous', () => {
    const tokens = parseTokens('$accent: #aabbcc')
    expect(tokens[0].type).toBe('color')
  })

  it('rejects simple tokens with non-color, non-numeric, non-ref values', () => {
    const tokens = parseTokens('$text: hello world')
    expect(tokens).toEqual([])
  })

  it('keeps simple tokens with $-reference values', () => {
    const tokens = parseTokens('$alias: $primary.bg')
    expect(tokens).toHaveLength(1)
    expect(tokens[0].type).toBe('color')
  })
})

describe('parseTokensFromFiles', () => {
  it('merges tokens from multiple files', () => {
    const tokens = parseTokensFromFiles({
      'a.tok': '$primary.bg: #111',
      'b.tok': '$danger.bg: #222',
    })
    expect(tokens).toHaveLength(2)
  })

  it('dedupes by name (first wins)', () => {
    const tokens = parseTokensFromFiles({
      'a.tok': '$primary.bg: #111',
      'b.tok': '$primary.bg: #222',
    })
    expect(tokens).toHaveLength(1)
    expect(tokens[0].value).toBe('#111')
  })

  it('skips null/empty file contents', () => {
    const tokens = parseTokensFromFiles({
      'a.tok': '',
      'b.tok': null as unknown as string,
      'c.tok': '$x: #fff',
    })
    expect(tokens).toHaveLength(1)
  })
})

describe('filterTokensBySuffix', () => {
  const tokens: TokenDefinition[] = [
    { name: '$primary.bg', value: '#111', type: 'color' },
    { name: '$primary.col', value: '#fff', type: 'color' },
    { name: '$danger.bg', value: '#f00', type: 'color' },
  ]

  it('returns only tokens whose names end with the suffix', () => {
    expect(filterTokensBySuffix(tokens, '.bg')).toHaveLength(2)
    expect(filterTokensBySuffix(tokens, '.col')).toHaveLength(1)
  })

  it('returns the original list for empty suffix', () => {
    expect(filterTokensBySuffix(tokens, '')).toBe(tokens)
  })

  it('returns empty when no tokens match', () => {
    expect(filterTokensBySuffix(tokens, '.zzz')).toEqual([])
  })
})

describe('filterTokensByType', () => {
  const tokens: TokenDefinition[] = [
    { name: '$a', value: '#000', type: 'color' },
    { name: '$b', value: '12', type: 'spacing' },
    { name: '$c', value: '16', type: 'size' },
  ]

  it('keeps tokens whose type is in the allowed list', () => {
    expect(filterTokensByType(tokens, ['color'])).toHaveLength(1)
    expect(filterTokensByType(tokens, ['color', 'spacing'])).toHaveLength(2)
  })

  it('returns the original list when types is empty', () => {
    expect(filterTokensByType(tokens, [])).toBe(tokens)
  })
})

describe('filterTokensBySearch', () => {
  const tokens: TokenDefinition[] = [
    { name: '$primary.bg', value: '#2271C1', type: 'color', category: 'brand' },
    { name: '$danger.bg', value: '#ef4444', type: 'color' },
  ]

  it('matches by name', () => {
    expect(filterTokensBySearch(tokens, 'primary')).toHaveLength(1)
  })

  it('matches by value', () => {
    expect(filterTokensBySearch(tokens, '2271C1')).toHaveLength(1)
  })

  it('matches by category when present', () => {
    expect(filterTokensBySearch(tokens, 'brand')).toHaveLength(1)
  })

  it('case-insensitive', () => {
    expect(filterTokensBySearch(tokens, 'PRIMARY')).toHaveLength(1)
  })

  it('returns original for empty query', () => {
    expect(filterTokensBySearch(tokens, '')).toBe(tokens)
  })
})

// =============================================================================
// TokenPicker (the UI class)
// =============================================================================

let anchor: HTMLElement
let onSelect: ReturnType<typeof vi.fn>

beforeEach(() => {
  document.body.innerHTML = ''
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function () {}
  }
  anchor = document.createElement('button')
  document.body.appendChild(anchor)
  anchor.getBoundingClientRect = () =>
    ({ top: 0, left: 0, bottom: 20, right: 100, width: 100, height: 20 }) as DOMRect

  onSelect = vi.fn()
})

const tokens: TokenDefinition[] = [
  { name: '$primary.bg', value: '#2271C1', type: 'color', category: 'brand' },
  { name: '$primary.col', value: '#ffffff', type: 'color', category: 'brand' },
  { name: '$danger.bg', value: '#ef4444', type: 'color' },
  { name: '$space.gap', value: '12', type: 'spacing' },
]

describe('TokenPicker — construction + render', () => {
  it('createTokenPicker returns a TokenPicker instance with type "token"', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    expect(p).toBeInstanceOf(TokenPicker)
    expect(p.pickerType).toBe('token')
  })

  it('renders all tokens by default', () => {
    const p = createTokenPicker({ tokens, animate: false, searchable: false }, { onSelect })
    p.show(anchor)
    const items = document.querySelectorAll('.token-picker-item')
    expect(items.length).toBe(4)
  })

  it('searchable=true renders a search input', () => {
    const p = createTokenPicker({ tokens, animate: false, searchable: true }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('.token-picker-search-input')).not.toBeNull()
  })

  it('searchable=false omits the search input', () => {
    const p = createTokenPicker({ tokens, animate: false, searchable: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('.token-picker-search-input')).toBeNull()
  })

  it('showPreview=true renders a color swatch for color tokens', () => {
    const p = createTokenPicker({ tokens, animate: false, showPreview: true }, { onSelect })
    p.show(anchor)
    const previews = document.querySelectorAll('.token-picker-preview')
    // 3 color tokens have preview swatches
    expect(previews.length).toBe(3)
  })

  it('showPreview=false omits color swatches', () => {
    const p = createTokenPicker({ tokens, animate: false, showPreview: false }, { onSelect })
    p.show(anchor)
    expect(document.querySelector('.token-picker-preview')).toBeNull()
  })
})

describe('TokenPicker — selection', () => {
  it('clicking a token fires onSelect with the token name', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    const item = document.querySelector('[data-token="$primary.bg"]') as HTMLElement
    item.click()
    expect(onSelect).toHaveBeenCalledWith('$primary.bg')
  })

  it('getSelectedToken returns the current token', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    expect(p.getSelectedToken()?.name).toBe('$primary.bg')
    p.navigate('down')
    expect(p.getSelectedToken()?.name).toBe('$primary.col')
  })

  it('getSelectedValue returns the name string', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    expect(p.getSelectedValue()).toBe('$primary.bg')
  })

  it('getSelectedToken returns null when no items match (filtered to empty)', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.search('does-not-match-anything')
    expect(p.getSelectedToken()).toBeNull()
  })
})

describe('TokenPicker — context filtering', () => {
  it('setContext filters tokens by allowedTypes', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.setContext({ property: 'bg', allowedTypes: ['color'] })
    expect(p.getFilteredTokens().every(t => t.type === 'color')).toBe(true)
    expect(p.getFilteredTokens().length).toBe(3)
  })

  it('clearContext restores all tokens', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.setContext({ property: 'bg', allowedTypes: ['color'] })
    expect(p.getFilteredTokens().length).toBe(3)
    p.clearContext()
    expect(p.getFilteredTokens().length).toBe(4)
  })

  it('setContext + search combine (AND)', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.setContext({ property: 'bg', allowedTypes: ['color'] })
    p.search('primary')
    expect(p.getFilteredTokens().length).toBe(2) // primary.bg + primary.col
  })
})

describe('TokenPicker — search', () => {
  it('filters by query (case-insensitive)', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.search('DANGER')
    expect(p.getFilteredTokens().length).toBe(1)
  })

  it('filter() is an alias for search()', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.filter('space')
    expect(p.getFilteredTokens().length).toBe(1)
    expect(p.getFilteredTokens()[0].name).toBe('$space.gap')
  })

  it('resetFilter clears both context AND query', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.setContext({ property: 'bg', allowedTypes: ['color'] })
    p.search('primary')
    p.resetFilter()
    expect(p.getFilteredTokens().length).toBe(4)
  })
})

describe('TokenPicker — setTokens / setValue', () => {
  it('setTokens swaps the underlying token list and refreshes', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    expect(p.getFilteredTokens().length).toBe(4)
    p.setTokens([{ name: '$only', value: '#000', type: 'color' }])
    expect(p.getFilteredTokens().length).toBe(1)
  })

  it('setValue clears search query when token exists', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.search('primary')
    p.setValue('$danger.bg')
    expect(p.getFilteredTokens().length).toBe(4) // search query cleared
  })

  it('setValue is a no-op for unknown tokens', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.search('primary')
    p.setValue('$nonexistent')
    // search remains; filtered list still narrowed
    expect(p.getFilteredTokens().length).toBe(2)
  })
})

describe('TokenPicker — TriggerManager API', () => {
  it('navigate("down") advances index, navigate("up") decrements', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    expect(p.getSelectedIndex()).toBe(0)
    p.navigate('down')
    expect(p.getSelectedIndex()).toBe(1)
    p.navigate('up')
    expect(p.getSelectedIndex()).toBe(0)
  })

  it('navigate is a no-op when keyboardNav is null (no items)', () => {
    const p = createTokenPicker({ tokens: [], animate: false }, { onSelect })
    p.show(anchor)
    expect(() => {
      p.navigate('up')
      p.navigate('down')
      p.navigate('left')
      p.navigate('right')
    }).not.toThrow()
  })

  it('showAt positions the picker at exact x,y', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.showAt(50, 100)
    const el = p.getElement()!
    expect(el.style.left).toBe('50px')
    expect(el.style.top).toBe('100px')
  })

  it('search input live-updates the filtered list', () => {
    const p = createTokenPicker({ tokens, animate: false, searchable: true }, { onSelect })
    p.show(anchor)
    const input = document.querySelector('.token-picker-search-input') as HTMLInputElement
    input.value = 'space'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(p.getFilteredTokens().length).toBe(1)
  })
})

describe('TokenPicker — empty state', () => {
  it('renders an empty container when no tokens match', () => {
    const p = createTokenPicker({ tokens, animate: false }, { onSelect })
    p.show(anchor)
    p.search('definitely-no-match')
    expect(document.querySelectorAll('.token-picker-item').length).toBe(0)
  })
})

// =============================================================================
// P3 — mutation-driven coverage
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: parseTokens skips comments (catches drop-of-comment-guard)', () => {
    const result = parseTokens('// $fake: #fff\n$real: #000')
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('$real')
  })

  it('M2: parseTokensFromFiles dedupes by name (first wins, second discarded)', () => {
    const result = parseTokensFromFiles({
      a: '$x: #fff',
      b: '$x: #000',
    })
    expect(result).toHaveLength(1)
    // Original value (first occurrence) wins.
    expect(result[0].value).toBe('#fff')
  })

  it('M3: filterTokensBySuffix uses endsWith (catches contains-substring mutation)', () => {
    const tokens: TokenDefinition[] = [
      // Contains '.bg' as a substring but does NOT end with it.
      { name: '$primary.bg.alt', value: 'x', type: 'color' },
      // Ends with '.bg'.
      { name: '$primary.bg', value: 'x', type: 'color' },
    ]
    // Only the second token (ending with .bg) should match. If the
    // implementation used `includes`, BOTH would match.
    expect(filterTokensBySuffix(tokens, '.bg')).toHaveLength(1)
    expect(filterTokensBySuffix(tokens, '.bg')[0].name).toBe('$primary.bg')
  })
})
