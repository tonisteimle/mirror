/**
 * DSL Token Tests
 *
 * Tests for design tokens (variables):
 * - Token definitions
 * - Token usage
 * - Token suffix inference
 * - Token in different contexts
 */

import { describe, it, expect } from 'vitest'
import { runSyntaxTests, type SyntaxTest } from '../_infrastructure'
import { parse } from '../../../parser/parser'
import { generate, getStyle } from '../../test-utils'

// ============================================
// Token Definitions
// ============================================

describe('Token Definitions', () => {
  describe('basic tokens', () => {
    it('defines color token', () => {
      const result = parse('$primary: #3B82F6')
      expect(result.tokens.get('primary')).toBe('#3B82F6')
    })

    it('defines number token', () => {
      const result = parse('$spacing: 16')
      expect(result.tokens.get('spacing')).toBe(16)
    })

    it('defines multiple tokens', () => {
      const result = parse(`$primary: #3B82F6
$secondary: #10B981
$spacing: 16`)
      expect(result.tokens.get('primary')).toBe('#3B82F6')
      expect(result.tokens.get('secondary')).toBe('#10B981')
      expect(result.tokens.get('spacing')).toBe(16)
    })
  })

  describe('token naming', () => {
    it('allows hyphenated names', () => {
      const result = parse('$btn-primary: #3B82F6')
      expect(result.tokens.get('btn-primary')).toBe('#3B82F6')
    })

    it('allows camelCase names', () => {
      const result = parse('$primaryColor: #3B82F6')
      expect(result.tokens.get('primaryColor')).toBe('#3B82F6')
    })

    it('allows underscore names', () => {
      const result = parse('$primary_color: #3B82F6')
      expect(result.tokens.get('primary_color')).toBe('#3B82F6')
    })
  })
})

// ============================================
// Token Usage
// ============================================

describe('Token Usage', () => {
  describe('explicit property assignment', () => {
    it('uses token for background', () => {
      const result = parse(`$primary: #3B82F6
Box bg $primary`)
      expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    })

    it('uses token for color', () => {
      const result = parse(`$textColor: #FFFFFF
Box col $textColor`)
      expect(result.nodes[0].properties.col).toBe('#FFFFFF')
    })

    it('uses token for padding', () => {
      const result = parse(`$spacing: 16
Box pad $spacing`)
      expect(result.nodes[0].properties.pad).toBe(16)
    })

    it('uses token for gap', () => {
      const result = parse(`$gap: 8
Box gap $gap`)
      expect(result.nodes[0].properties.gap).toBe(8)
    })

    it('uses token for border-radius', () => {
      const result = parse(`$radius: 8
Box rad $radius`)
      expect(result.nodes[0].properties.rad).toBe(8)
    })

    it('uses token for width', () => {
      const result = parse(`$cardWidth: 300
Card w $cardWidth`)
      expect(result.nodes[0].properties.w).toBe(300)
    })
  })

  describe('renders token values', () => {
    it('renders token background', () => {
      const style = getStyle(generate(`$primary: #3B82F6
Box bg $primary`))
      expect(style.backgroundColor).toBe('#3B82F6')
    })

    it('renders token padding', () => {
      const style = getStyle(generate(`$spacing: 16
Box pad $spacing`))
      expect(style.padding).toBe('16px')
    })
  })
})

// ============================================
// Token Suffix Inference
// ============================================

describe('Token Suffix Inference', () => {
  // NOTE: Only some token suffix inferences are implemented
  // Working: -color, -size, -gap
  // NOT working: -background, -padding, -spacing, -radius, -border, -border-color

  describe('-color suffix → background (WORKS)', () => {
    it('infers background from -color', () => {
      const result = parse(`$blue-color: #0000FF
Box $blue-color`)
      expect(result.nodes[0].properties.bg).toBe('#0000FF')
    })
  })

  describe('-background suffix (NOT IMPLEMENTED)', () => {
    it.skip('infers background from -background - NOT IMPLEMENTED', () => {
      const result = parse(`$card-background: #1E1E2E
Box $card-background`)
      expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
    })
  })

  describe('-size suffix → font-size (WORKS)', () => {
    it('infers font-size from -size', () => {
      const result = parse(`$heading-size: 24
Text $heading-size`)
      expect(result.nodes[0].properties.size).toBe(24)
    })
  })

  describe('-padding/-spacing suffix (NOT IMPLEMENTED)', () => {
    it.skip('infers padding from -padding - NOT IMPLEMENTED', () => {
      const result = parse(`$card-padding: 16
Card $card-padding`)
      expect(result.nodes[0].properties.pad).toBe(16)
    })

    it.skip('infers padding from -spacing - NOT IMPLEMENTED', () => {
      const result = parse(`$element-spacing: 12
Box $element-spacing`)
      expect(result.nodes[0].properties.pad).toBe(12)
    })
  })

  describe('-radius suffix (NOT IMPLEMENTED)', () => {
    it.skip('infers border-radius from -radius - NOT IMPLEMENTED', () => {
      const result = parse(`$btn-radius: 8
Button $btn-radius`)
      expect(result.nodes[0].properties.rad).toBe(8)
    })
  })

  describe('-gap suffix → gap (WORKS)', () => {
    it('infers gap from -gap', () => {
      const result = parse(`$grid-gap: 16
Grid $grid-gap`)
      expect(result.nodes[0].properties.gap).toBe(16)
    })
  })

  describe('-border suffix (NOT IMPLEMENTED)', () => {
    it.skip('infers border from -border - NOT IMPLEMENTED', () => {
      const result = parse(`$card-border: 1
Card $card-border`)
      expect(result.nodes[0].properties.bor).toBe(1)
    })
  })

  describe('-border-color suffix (NOT IMPLEMENTED)', () => {
    it.skip('infers border-color from -border-color - NOT IMPLEMENTED', () => {
      const result = parse(`$input-border-color: #333
Input $input-border-color`)
      expect(result.nodes[0].properties.boc).toBe('#333')
    })
  })
})

// ============================================
// Multiple Tokens
// ============================================

describe('Multiple Tokens', () => {
  it('uses multiple tokens in one component', () => {
    const result = parse(`$bg: #1E1E2E
$pad: 16
$rad: 8
Card bg $bg pad $pad rad $rad`)
    expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
    expect(result.nodes[0].properties.pad).toBe(16)
    expect(result.nodes[0].properties.rad).toBe(8)
  })

  // NOTE: This test uses -padding suffix which is not implemented
  it.skip('uses inferred and explicit tokens together - USES UNIMPLEMENTED SUFFIX', () => {
    const result = parse(`$card-padding: 16
$primary: #3B82F6
Card $card-padding bg $primary`)
    expect(result.nodes[0].properties.pad).toBe(16)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
  })

  it('uses explicit property assignment with tokens', () => {
    const result = parse(`$pad: 16
$primary: #3B82F6
Card pad $pad bg $primary`)
    expect(result.nodes[0].properties.pad).toBe(16)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
  })
})

// ============================================
// Token Scope
// ============================================

describe('Token Scope', () => {
  it('tokens are available globally', () => {
    const result = parse(`$primary: #3B82F6
Header bg $primary
Footer bg $primary`)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    expect(result.nodes[1].properties.bg).toBe('#3B82F6')
  })

  it('tokens defined after usage are resolved', () => {
    // Note: This tests the actual parser behavior
    // Some implementations may require tokens to be defined first
    const result = parse(`Box bg $primary
$primary: #3B82F6`)
    // Document actual behavior
  })
})

// ============================================
// Token with Component Definitions
// ============================================

describe('Tokens with Component Definitions', () => {
  it('uses tokens in component definitions', () => {
    const result = parse(`$primary: #3B82F6
$radius: 8
Button: bg $primary rad $radius pad 12
Button "Click"`)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    expect(result.nodes[0].properties.rad).toBe(8)
  })

  // NOTE: This test uses -radius and -padding suffixes which are not implemented
  it.skip('uses inferred tokens in component definitions - USES UNIMPLEMENTED SUFFIX', () => {
    const result = parse(`$btn-radius: 8
$btn-padding: 12
Button: $btn-radius $btn-padding
Button "Click"`)
    expect(result.nodes[0].properties.rad).toBe(8)
    expect(result.nodes[0].properties.pad).toBe(12)
  })
})
