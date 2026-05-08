// @vitest-environment jsdom
/**
 * Tests for studio/compile/token-renderer.ts (296 LOC, 0%)
 *
 * Renders the .tok preview panel as HTML inside a container element.
 * Two render modes — sectioned (when tokens carry an explicit section
 * field) and categorized (auto-grouped into Farben/Abstände/Radien/
 * Weitere). Visual cells: color swatch for color tokens, sized box for
 * spacing, blank for "other".
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TokenRenderer } from '../../studio/compile/token-renderer'
import type { AST, Token } from '../../studio/compile/types'

let preview: HTMLElement

beforeEach(() => {
  document.body.innerHTML = ''
  preview = document.createElement('div')
  document.body.appendChild(preview)
})

function createRenderer(allSource: string = ''): TokenRenderer {
  return new TokenRenderer({
    preview,
    getAllProjectSource: () => allSource,
  })
}

function ast(tokens: Token[]): AST {
  return { tokens, components: [], instances: [] }
}

// =============================================================================
// Empty / no tokens
// =============================================================================

describe('TokenRenderer — empty', () => {
  it('renders empty message when ast.tokens is missing', () => {
    createRenderer().render({ components: [], instances: [] } as unknown as AST)
    expect(preview.innerHTML).toContain('Keine Tokens definiert')
  })

  it('renders empty message when tokens is []', () => {
    createRenderer().render(ast([]))
    expect(preview.innerHTML).toContain('Keine Tokens definiert')
  })
})

// =============================================================================
// Categorization (no explicit sections)
// =============================================================================

describe('TokenRenderer — categorized rendering', () => {
  it('groups color tokens under "Farben"', () => {
    createRenderer().render(
      ast([
        { name: 'primary.bg', value: '#2271C1' },
        { name: 'card.col', value: '#fff' },
      ])
    )
    expect(preview.innerHTML).toContain('Farben')
  })

  it('groups spacing tokens under "Abstände"', () => {
    createRenderer().render(
      ast([
        { name: 'card.pad', value: '16' },
        { name: 'list.gap', value: '8' },
      ])
    )
    expect(preview.innerHTML).toContain('Abstände')
  })

  it('groups radius tokens under "Radien"', () => {
    createRenderer().render(ast([{ name: 'card.rad', value: '8' }]))
    expect(preview.innerHTML).toContain('Radien')
  })

  it('groups everything else under "Weitere"', () => {
    createRenderer().render(ast([{ name: 'mystery', value: 'unknown' }]))
    expect(preview.innerHTML).toContain('Weitere')
  })

  it('omits sections that are empty', () => {
    createRenderer().render(ast([{ name: 'primary.bg', value: '#2271C1' }]))
    expect(preview.innerHTML).toContain('Farben')
    expect(preview.innerHTML).not.toContain('Abstände')
    expect(preview.innerHTML).not.toContain('Radien')
    expect(preview.innerHTML).not.toContain('Weitere')
  })

  it('renders multiple categories together', () => {
    createRenderer().render(
      ast([
        { name: 'primary.bg', value: '#2271C1' },
        { name: 'card.pad', value: '16' },
        { name: 'card.rad', value: '4' },
      ])
    )
    expect(preview.innerHTML).toContain('Farben')
    expect(preview.innerHTML).toContain('Abstände')
    expect(preview.innerHTML).toContain('Radien')
  })

  it('treats *.color suffix as color token (legacy alias)', () => {
    createRenderer().render(ast([{ name: 'card.color', value: '#fff' }]))
    expect(preview.innerHTML).toContain('Farben')
  })

  it('treats *.margin suffix as spacing', () => {
    createRenderer().render(ast([{ name: 'card.margin', value: '8' }]))
    expect(preview.innerHTML).toContain('Abstände')
  })
})

// =============================================================================
// Direct-color detection (no .bg/.col/.color suffix)
// =============================================================================

describe('TokenRenderer — direct-color detection', () => {
  it('treats hex value as color even without suffix', () => {
    createRenderer().render(ast([{ name: 'primary', value: '#2271C1' }]))
    expect(preview.innerHTML).toContain('Farben')
  })

  it('treats rgb() value as color', () => {
    createRenderer().render(ast([{ name: 'primary', value: 'rgb(34, 113, 193)' }]))
    expect(preview.innerHTML).toContain('Farben')
  })

  it('treats hsl() value as color', () => {
    createRenderer().render(ast([{ name: 'primary', value: 'hsl(200, 50%, 50%)' }]))
    expect(preview.innerHTML).toContain('Farben')
  })

  it('does NOT treat plain text as color', () => {
    createRenderer().render(ast([{ name: 'primary', value: 'red' }]))
    expect(preview.innerHTML).toContain('Weitere')
  })
})

// =============================================================================
// Token reference resolution
// =============================================================================

describe('TokenRenderer — $reference resolution', () => {
  it('resolves $ref to the referenced token within same file', () => {
    createRenderer().render(
      ast([
        { name: 'primary', value: '#2271C1' },
        { name: 'theme.bg', value: '$primary' },
      ])
    )
    // theme.bg is a color (suffix), and the swatch should render the
    // resolved value.
    expect(preview.innerHTML).toContain('Farben')
    expect(preview.innerHTML).toContain('background: #2271C1')
  })

  it('value class for $reference is "token-ref"', () => {
    createRenderer().render(
      ast([
        { name: 'primary', value: '#2271C1' },
        { name: 'card.bg', value: '$primary' },
      ])
    )
    expect(preview.innerHTML).toContain('class="tokens-preview-value token-ref"')
  })

  it('value class for #hex is "hex"', () => {
    createRenderer().render(ast([{ name: 'primary.bg', value: '#fff' }]))
    expect(preview.innerHTML).toContain('class="tokens-preview-value hex"')
  })

  it('value class for numeric is "number"', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: '16' }]))
    expect(preview.innerHTML).toContain('class="tokens-preview-value number"')
  })

  it('attempts cross-file resolve via getAllProjectSource (Q5: regex bug — see findings)', () => {
    // The current regex anchors `^\$tokenName:` but Mirror sources define
    // tokens as `tokenName:` (no leading $). So cross-file lookup never
    // matches and falls back to returning the raw $reference.
    const allSource = `external.bg: #abcdef\n`
    createRenderer(allSource).render(ast([{ name: 'card.bg', value: '$external.bg' }]))
    expect(preview.innerHTML).toContain('background: $external.bg')
  })

  it('returns raw $ref when cross-file lookup fails (matches the regex-bug behavior)', () => {
    const allSource = `a: #2271C1\nb: $a\nc: $b\n`
    createRenderer(allSource).render(ast([{ name: 'card.bg', value: '$c' }]))
    // Same-file map has no $c → tries cross-file → regex doesn't match → raw value.
    expect(preview.innerHTML).toContain('background: $c')
  })

  it('breaks reference cycles without crashing', () => {
    createRenderer().render(
      ast([
        { name: 'a', value: '$b' },
        { name: 'b', value: '$a' },
      ])
    )
    // Should not throw / hang. Some output expected.
    expect(preview.innerHTML.length).toBeGreaterThan(0)
  })

  it('returns the raw $ref as-is when no value found', () => {
    createRenderer().render(ast([{ name: 'card.bg', value: '$missing' }]))
    expect(preview.innerHTML).toContain('background: $missing')
  })
})

// =============================================================================
// Section grouping (explicit `section` field)
// =============================================================================

describe('TokenRenderer — explicit section field', () => {
  it('groups by section when at least one token has section', () => {
    createRenderer().render(
      ast([
        { name: 'primary.bg', value: '#2271C1', section: 'Brand' } as Token,
        { name: 'secondary.bg', value: '#7c3aed', section: 'Brand' } as Token,
      ])
    )
    expect(preview.innerHTML).toContain('Brand')
    expect(preview.innerHTML).not.toContain('Farben') // sectioned mode skips category names
  })

  it('puts unsectioned tokens into "Weitere" when sections present', () => {
    createRenderer().render(
      ast([{ name: 'a.bg', value: '#fff', section: 'A' } as Token, { name: 'b.bg', value: '#000' }])
    )
    expect(preview.innerHTML).toContain('A')
    expect(preview.innerHTML).toContain('Weitere')
  })

  it('preserves section insertion order', () => {
    createRenderer().render(
      ast([
        { name: 'a.bg', value: '#fff', section: 'B' } as Token,
        { name: 'b.bg', value: '#000', section: 'A' } as Token,
      ])
    )
    const html = preview.innerHTML
    expect(html.indexOf('B')).toBeLessThan(html.indexOf('A'))
  })
})

// =============================================================================
// Visual cells
// =============================================================================

describe('TokenRenderer — visual cells', () => {
  it('color tokens render a swatch with background style', () => {
    createRenderer().render(ast([{ name: 'primary.bg', value: '#2271C1' }]))
    expect(preview.querySelector('.tokens-preview-swatch')).not.toBeNull()
  })

  it('spacing tokens render a sized box', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: '16' }]))
    const visual = preview.querySelector('.tokens-preview-spacing') as HTMLElement
    expect(visual).not.toBeNull()
    expect(visual.style.width).toBe('16px')
    expect(visual.style.height).toBe('16px')
  })

  it('spacing visual clamps width at 48px', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: '200' }]))
    const visual = preview.querySelector('.tokens-preview-spacing') as HTMLElement
    expect(visual.style.width).toBe('48px')
  })

  it('spacing visual clamps height at 24px', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: '200' }]))
    const visual = preview.querySelector('.tokens-preview-spacing') as HTMLElement
    expect(visual.style.height).toBe('24px')
  })

  it('spacing falls back to 8 when value is non-numeric', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: 'abc' }]))
    const visual = preview.querySelector('.tokens-preview-spacing') as HTMLElement
    expect(visual.style.width).toBe('8px')
  })

  it('"other" tokens have no visual cell', () => {
    createRenderer().render(ast([{ name: 'mystery', value: 'unknown' }]))
    expect(preview.querySelector('.tokens-preview-swatch')).toBeNull()
    expect(preview.querySelector('.tokens-preview-spacing')).toBeNull()
  })
})

// =============================================================================
// Token name + value display
// =============================================================================

describe('TokenRenderer — name/value display', () => {
  it('displays the token name', () => {
    createRenderer().render(ast([{ name: 'primary.bg', value: '#2271C1' }]))
    expect(preview.innerHTML).toContain('primary.bg')
  })

  it('displays the raw token value (not the resolved one)', () => {
    createRenderer().render(
      ast([
        { name: 'primary', value: '#2271C1' },
        { name: 'card.bg', value: '$primary' },
      ])
    )
    // In the value cell — show the token reference, not the hex.
    expect(preview.innerHTML).toContain('>$primary<')
  })
})

// =============================================================================
// P3 — mutation-driven
// =============================================================================

describe('P3 — mutation-driven', () => {
  it('M1: hasSections check is per-token (catches forEach-vs-some swap)', () => {
    // One sectioned + one unsectioned → goes to sectioned mode (some).
    createRenderer().render(
      ast([{ name: 'a.bg', value: '#fff', section: 'A' } as Token, { name: 'b.bg', value: '#000' }])
    )
    expect(preview.innerHTML).toContain('Weitere') // sectioned mode appends "Weitere"
    expect(preview.innerHTML).not.toContain('Farben') // not categorized mode
  })

  it('M2: visited-set prevents infinite recursion in resolveValue', () => {
    createRenderer().render(
      ast([
        { name: 'a', value: '$b' },
        { name: 'b', value: '$a' },
      ])
    )
    // Test passes if we get here without timeout / stack overflow.
    expect(preview.innerHTML.length).toBeGreaterThan(0)
  })

  it('M3: spacing fallback "8" when parseInt returns NaN (catches drop of `|| 8`)', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: 'abc' }]))
    const visual = preview.querySelector('.tokens-preview-spacing') as HTMLElement
    expect(visual.style.width).toBe('8px')
  })

  it('M4: Math.min clamps spacing visuals (catches Math.max swap)', () => {
    createRenderer().render(ast([{ name: 'card.pad', value: '100' }]))
    const visual = preview.querySelector('.tokens-preview-spacing') as HTMLElement
    expect(visual.style.width).toBe('48px') // min(100, 48) = 48
  })

  it('M5: getValueTypeClass distinguishes # vs $ vs digit (catches false-fallthrough)', () => {
    createRenderer().render(
      ast([
        { name: 'h.bg', value: '#fff' },
        { name: 'p.pad', value: '16' },
        { name: 'r.bg', value: '$h.bg' },
      ])
    )
    expect(preview.innerHTML).toContain('class="tokens-preview-value hex"')
    expect(preview.innerHTML).toContain('class="tokens-preview-value number"')
    expect(preview.innerHTML).toContain('class="tokens-preview-value token-ref"')
  })

  it('M6: isDirectColor recognizes hex/rgb/hsl prefixes (not just hex)', () => {
    createRenderer().render(ast([{ name: 'a', value: 'rgb(0, 0, 0)' }]))
    expect(preview.innerHTML).toContain('Farben') // not Weitere
  })
})
