/**
 * Tests for the Preprocessor
 *
 * Verifies transformation to canonical form:
 * - Property name normalization
 * - Direction/corner normalization
 * - Inline → Block conversion
 * - Sugar expansion
 */

import { describe, it, expect } from 'vitest'
import { preprocess, isCanonical } from '../../parser/preprocessor'
import { tokenize } from '../../parser/preprocessor/tokenizer'
import { normalizePropertyName, normalizeDirection, normalizeCorner } from '../../parser/preprocessor/property-normalizer'

describe('Preprocessor', () => {
  describe('preprocess', () => {
    describe('Property Name Normalization', () => {
      // Preprocessor normalizes short forms → canonical (long) forms
      // Parser then normalizes back to short forms for storage via toInternalName
      it('should normalize short property names', () => {
        const result = preprocess('Button\n  pad 12')
        // Preprocessor normalizes to canonical form
        expect(result).toContain('padding 12')
      })

      it('should normalize background shorthand', () => {
        const result = preprocess('Button\n  bg #333')
        // Preprocessor normalizes to canonical form
        expect(result).toContain('background #333')
      })

      it('should normalize color shorthand', () => {
        const result = preprocess('Button\n  col #FFF')
        // Preprocessor normalizes to canonical form
        expect(result).toContain('color #FFF')
      })

      it('should normalize radius shorthand', () => {
        const result = preprocess('Button\n  rad 8')
        // Preprocessor normalizes to canonical form
        expect(result).toContain('radius 8')
      })

      it('should keep long forms unchanged', () => {
        const result = preprocess('Button\n  padding 12')
        expect(result).toContain('padding 12')
      })
    })

    describe('Direction Normalization', () => {
      it('should keep short directions (parser compatible)', () => {
        const result = preprocess('Button\n  padding l 8')
        expect(result).toContain('padding l 8')
      })

      it('should keep direction combos in short form', () => {
        const result = preprocess('Button\n  padding l-r 16')
        expect(result).toContain('padding l-r 16')
      })

      it('should normalize t to t (short form)', () => {
        const result = preprocess('Button\n  padding t 8')
        expect(result).toContain('padding t 8')
      })

      it('should normalize b to b (short form)', () => {
        const result = preprocess('Button\n  padding b 8')
        expect(result).toContain('padding b 8')
      })

      it('should normalize long directions to short', () => {
        const result = preprocess('Button\n  padding left 8')
        expect(result).toContain('padding l 8')
      })
    })

    describe('Corner Normalization', () => {
      it('should keep short corners (parser compatible)', () => {
        const result = preprocess('Button\n  radius tl 8')
        expect(result).toContain('radius tl 8')
      })

      it('should keep all short corners unchanged', () => {
        expect(preprocess('Box\n  radius tr 4')).toContain('radius tr 4')
        expect(preprocess('Box\n  radius bl 4')).toContain('radius bl 4')
        expect(preprocess('Box\n  radius br 4')).toContain('radius br 4')
      })

      it('should normalize long corners to short', () => {
        expect(preprocess('Box\n  radius top-left 4')).toContain('radius tl 4')
        expect(preprocess('Box\n  radius bottom-right 4')).toContain('radius br 4')
      })
    })

    describe('Inline to Block Conversion', () => {
      // Preprocessor normalizes property names to canonical form
      it('should convert inline properties to block', () => {
        const result = preprocess('Button pad 12, bg #333')
        // Properties normalized to canonical forms
        expect(result).toContain('Button padding 12, background #333')
      })

      it('should handle multiple inline properties', () => {
        const result = preprocess('Card pad 16, bg #333, rad 8, col #FFF')
        // Properties normalized to canonical forms
        expect(result).toContain('padding 16')
        expect(result).toContain('background #333')
        expect(result).toContain('radius 8')
        expect(result).toContain('color #FFF')
      })

      it('should preserve block syntax', () => {
        const input = `Button
  padding 12
  background #333`
        const result = preprocess(input)
        expect(result).toContain('Button')
        expect(result).toContain('padding 12')
        expect(result).toContain('background #333')
      })
    })

    describe('Sugar Expansion', () => {
      it('should expand dimension sugar (two numbers → width/height)', () => {
        const result = preprocess('Box 300 400')
        expect(result).toContain('width 300')
        expect(result).toContain('height 400')
      })

      it('should expand color sugar (standalone color → bg)', () => {
        const result = preprocess('Box #333')
        // Uses short form 'bg' to match how parser stores properties
        expect(result).toContain('bg #333')
      })

      it('should expand string sugar for Image (→ src)', () => {
        const result = preprocess('Image "photo.jpg"')
        expect(result).toContain('src "photo.jpg"')
      })

      it('should expand string sugar for Input (→ placeholder)', () => {
        const result = preprocess('Input "Enter name"')
        expect(result).toContain('placeholder "Enter name"')
      })
    })

    describe('String Normalization', () => {
      it('should skip preprocessing for single-quoted strings (doc-mode content)', () => {
        // Single quotes have special meaning in Mirror DSL (MULTILINE_STRING for doc-mode)
        // Preprocessing is skipped to preserve this semantics
        const result = preprocess("Button 'Click me'")
        // Code is returned unchanged when single quotes are present
        expect(result).toBe("Button 'Click me'")
      })
    })

    describe('Component Definitions', () => {
      it('should preserve component definitions', () => {
        const result = preprocess('Button: pad 12, bg #333')
        expect(result).toContain('Button:')
        // Preprocessor normalizes to canonical forms
        expect(result).toContain('padding 12')
      })

      it('should preserve inheritance', () => {
        const result = preprocess('DangerButton: Button bg #EF4444')
        expect(result).toContain('DangerButton: Button')
        // Preprocessor normalizes to canonical forms
        expect(result).toContain('background #EF4444')
      })
    })

    describe('Nested Components', () => {
      it('should handle nested components', () => {
        const input = `Card pad 16
  Title "Hello"
  Button pad 8, bg #333`
        const result = preprocess(input)
        expect(result).toContain('Card')
        // Preprocessor normalizes to canonical forms
        expect(result).toContain('padding 16')
        expect(result).toContain('Title')
        expect(result).toContain('"Hello"')
        expect(result).toContain('Button')
        expect(result).toContain('padding 8')
        expect(result).toContain('background #333')
      })
    })

    describe('Comments', () => {
      it('should preserve comments', () => {
        const result = preprocess('Button pad 12 // spacing')
        expect(result).toContain('// spacing')
      })

      it('should preserve comment-only lines', () => {
        const input = `// Header comment
Button pad 12`
        const result = preprocess(input)
        expect(result).toContain('// Header comment')
      })
    })

    describe('Token References', () => {
      it('should preserve token references', () => {
        const result = preprocess('Button bg $primary')
        expect(result).toContain('$primary')
      })

      it('should expand token suffix to property', () => {
        const result = preprocess('Button $card-bg')
        // Uses short form 'bg' to match how parser stores properties
        expect(result).toContain('bg $card-bg')
      })
    })

    describe('States', () => {
      it('should preserve state blocks', () => {
        const input = `Button
  padding 12
  hover
    background #555`
        const result = preprocess(input)
        expect(result).toContain('hover')
        expect(result).toContain('background #555')
      })
    })

    describe('Events', () => {
      it('should preserve event handlers', () => {
        const input = `Button
  onclick toggle Modal`
        const result = preprocess(input)
        expect(result).toContain('onclick')
        expect(result).toContain('toggle')
        expect(result).toContain('Modal')
      })
    })
  })

  describe('isCanonical', () => {
    it('should return true for canonical form', () => {
      const canonical = `Button
  padding 12
  background #333`
      expect(isCanonical(canonical)).toBe(true)
    })

    it('should return false for inline syntax', () => {
      expect(isCanonical('Button pad 12, bg #333')).toBe(false)
    })

    it('should return false for short forms', () => {
      expect(isCanonical('Button\n  pad 12')).toBe(false)
    })

    it('should return true for short directions (they are canonical)', () => {
      // Short directions (l, r, t, b) ARE canonical - parser recognizes them as DIRECTION tokens
      expect(isCanonical('Button\n  padding l 8')).toBe(true)
    })
  })
})

describe('Tokenizer', () => {
  it('should tokenize component', () => {
    const tokens = tokenize('Button')
    expect(tokens.find(t => t.type === 'COMPONENT')).toBeTruthy()
  })

  it('should tokenize component definition', () => {
    const tokens = tokenize('Button:')
    expect(tokens.find(t => t.type === 'COMPONENT_DEF')).toBeTruthy()
  })

  it('should tokenize property', () => {
    const tokens = tokenize('padding 12')
    expect(tokens.find(t => t.type === 'PROPERTY' && t.value === 'padding')).toBeTruthy()
    expect(tokens.find(t => t.type === 'NUMBER' && t.value === '12')).toBeTruthy()
  })

  it('should tokenize color', () => {
    const tokens = tokenize('background #3B82F6')
    expect(tokens.find(t => t.type === 'COLOR' && t.value === '#3B82F6')).toBeTruthy()
  })

  it('should tokenize string', () => {
    const tokens = tokenize('"Hello World"')
    expect(tokens.find(t => t.type === 'STRING' && t.value === '"Hello World"')).toBeTruthy()
  })

  it('should tokenize token reference', () => {
    const tokens = tokenize('$primary.bg')
    expect(tokens.find(t => t.type === 'TOKEN_REF' && t.value === '$primary.bg')).toBeTruthy()
  })

  it('should tokenize indent', () => {
    const tokens = tokenize('  padding 12')
    expect(tokens.find(t => t.type === 'INDENT' && t.indent === 2)).toBeTruthy()
  })

  it('should tokenize comment', () => {
    const tokens = tokenize('// comment')
    expect(tokens.find(t => t.type === 'COMMENT')).toBeTruthy()
  })
})

describe('Property Normalizer', () => {
  describe('normalizePropertyName', () => {
    it('should normalize short forms', () => {
      expect(normalizePropertyName('pad')).toBe('padding')
      expect(normalizePropertyName('bg')).toBe('background')
      expect(normalizePropertyName('col')).toBe('color')
      expect(normalizePropertyName('rad')).toBe('radius')
    })

    it('should keep long forms unchanged', () => {
      expect(normalizePropertyName('padding')).toBe('padding')
      expect(normalizePropertyName('background')).toBe('background')
    })
  })

  describe('normalizeDirection', () => {
    it('should keep short directions unchanged', () => {
      // All short forms stay as-is (parser compatible)
      expect(normalizeDirection('l')).toBe('l')
      expect(normalizeDirection('r')).toBe('r')
      expect(normalizeDirection('t')).toBe('t')
      expect(normalizeDirection('b')).toBe('b')
      expect(normalizeDirection('u')).toBe('u')
      expect(normalizeDirection('d')).toBe('d')
    })

    it('should normalize combos', () => {
      // Combos also stay in short form
      expect(normalizeDirection('l-r')).toBe('l-r')
      expect(normalizeDirection('t-b')).toBe('t-b')
      expect(normalizeDirection('lr')).toBe('l-r')
    })

    it('should normalize long forms to short', () => {
      expect(normalizeDirection('left')).toBe('l')
      expect(normalizeDirection('right')).toBe('r')
      // top/bottom normalize to u/d (up/down) in internal format
      expect(normalizeDirection('top')).toBe('u')
      expect(normalizeDirection('bottom')).toBe('d')
      expect(normalizeDirection('left-right')).toBe('l-r')
      expect(normalizeDirection('top-bottom')).toBe('u-d')
    })
  })

  describe('normalizeCorner', () => {
    it('should keep short corners unchanged', () => {
      // Short corners stay as-is (parser compatible)
      expect(normalizeCorner('tl')).toBe('tl')
      expect(normalizeCorner('tr')).toBe('tr')
      expect(normalizeCorner('bl')).toBe('bl')
      expect(normalizeCorner('br')).toBe('br')
    })

    it('should normalize long corners to short', () => {
      expect(normalizeCorner('top-left')).toBe('tl')
      expect(normalizeCorner('top-right')).toBe('tr')
      expect(normalizeCorner('bottom-left')).toBe('bl')
      expect(normalizeCorner('bottom-right')).toBe('br')
    })
  })
})

describe('CSS Shorthand Expansion', () => {
  // Preprocessor normalizes property names to canonical form
  it('should expand padding with 2 values', () => {
    const result = preprocess('Button pad 8 16')
    // Normalizes to canonical form 'padding', expands to directional
    expect(result).toContain('padding t-b 8')
    expect(result).toContain('padding l-r 16')
  })

  it('should expand padding with 4 values', () => {
    const result = preprocess('Card padding 8 16 12 24')
    // Long form 'padding' is kept as-is
    expect(result).toContain('padding t 8')
    expect(result).toContain('padding r 16')
    expect(result).toContain('padding b 12')
    expect(result).toContain('padding l 24')
  })

  it('should expand radius with 2 values', () => {
    const result = preprocess('Box rad 8 16')
    // Normalizes to canonical form 'radius'
    expect(result).toContain('radius tl 8')
    expect(result).toContain('radius tr 16')
    expect(result).toContain('radius br 8')
    expect(result).toContain('radius bl 16')
  })

  it('should not expand single value', () => {
    const result = preprocess('Button pad 12')
    // Normalizes to canonical form 'padding'
    expect(result).toContain('padding 12')
    expect(result).not.toContain('t-b')
  })

  it('should not expand when direction already specified', () => {
    const result = preprocess('Button pad left 8')
    // Property normalized to canonical form, direction normalized to short form
    expect(result).toContain('padding l 8')
  })
})

describe('Child Override Syntax', () => {
  it('should expand semicolon-separated child overrides', () => {
    const result = preprocess('NavItem Icon "home"; Label "Home"')
    expect(result).toContain('NavItem')
    expect(result).toContain('  Icon')
    expect(result).toContain('    "home"')
    expect(result).toContain('  Label')
    expect(result).toContain('    "Home"')
  })

  it('should handle multiple child overrides', () => {
    const result = preprocess('MenuItem Icon "settings"; Title "Settings"; Badge "3"')
    expect(result).toContain('MenuItem')
    expect(result).toContain('  Icon')
    expect(result).toContain('  Title')
    expect(result).toContain('  Badge')
  })

  it('should work with properties before child overrides', () => {
    const result = preprocess('Button pad 8, bg #333 Icon "save"; Label "Save"')
    expect(result).toContain('Button')
    // Properties normalized to canonical forms
    expect(result).toContain('padding 8')
    expect(result).toContain('background #333')
    // Child overrides are expanded to block format
    expect(result).toContain('  Icon')
    expect(result).toContain('  Label')
  })

  it('should preserve inheritance for definitions', () => {
    const result = preprocess('DangerButton: Button bg #EF4444')
    expect(result).toContain('DangerButton: Button')
    // Properties normalized to canonical forms
    expect(result).toContain('background #EF4444')
  })
})

describe('Roundtrip', () => {
  it('should be idempotent', () => {
    const input = 'Button pad 12, bg #333, rad 8'
    const first = preprocess(input)
    const second = preprocess(first)
    expect(first).toBe(second)
  })

  it('should be idempotent for complex code', () => {
    const input = `Card pad 16, bg #333
  Title fs 18, "Welcome"
  Button pad 8, bg #3B82F6, "Click"`
    const first = preprocess(input)
    const second = preprocess(first)
    expect(first).toBe(second)
  })

  it('should be idempotent for CSS shorthands', () => {
    const input = 'Button pad 8 16, rad 4 8'
    const first = preprocess(input)
    const second = preprocess(first)
    expect(first).toBe(second)
  })

  it('should be idempotent for child overrides', () => {
    const input = 'NavItem Icon "home"; Label "Home"'
    const first = preprocess(input)
    const second = preprocess(first)
    expect(first).toBe(second)
  })
})
