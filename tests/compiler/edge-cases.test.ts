/**
 * Edge Case Katalog
 *
 * Systematische Tests für Grenzfälle und ungewöhnliche Eingaben.
 * Ziel: Der Compiler soll niemals abstürzen, sondern immer eine
 * sinnvolle Fehlermeldung oder ein gültiges Ergebnis liefern.
 *
 * Kategorien:
 * 1. Leere und minimale Eingaben
 * 2. Whitespace-Varianten
 * 3. Sehr lange Eingaben
 * 4. Unicode und Sonderzeichen
 * 5. Maximale Verschachtelung
 * 6. Zahlen-Grenzwerte
 * 7. String-Grenzfälle
 */

import { describe, it, expect } from 'vitest'
import { tokenize, tokenizeWithErrors } from '../../compiler/parser/lexer'
import { parse } from '../../compiler/parser'
import { validate } from '../../compiler/validator'

// ============================================================================
// 1. LEERE UND MINIMALE EINGABEN
// ============================================================================

describe('Edge Cases: Empty and Minimal Input', () => {
  it('handles empty string', () => {
    const result = validate('')
    // Should not crash, result may be valid (no content = no errors)
    expect(result).toBeDefined()
    expect(result.errors).toBeDefined()
  })

  it('handles null-like inputs gracefully', () => {
    // Empty string variations
    const inputs = ['', ' ', '\t', '\n', '\r\n']
    for (const input of inputs) {
      const result = validate(input)
      expect(result).toBeDefined()
    }
  })

  it('handles single character inputs', () => {
    const chars = ['F', 'a', '1', '#', '$', ':', ',', '(', ')']
    for (const char of chars) {
      expect(() => validate(char)).not.toThrow()
    }
  })

  it('handles minimal valid input', () => {
    const result = validate('Frame')
    expect(result.valid).toBe(true)
  })

  it('handles single property', () => {
    const result = validate('Frame w 100')
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// 2. WHITESPACE-VARIANTEN
// ============================================================================

describe('Edge Cases: Whitespace Variants', () => {
  it('handles only spaces', () => {
    const result = validate('     ')
    expect(result).toBeDefined()
  })

  it('handles only tabs', () => {
    const result = validate('\t\t\t')
    expect(result).toBeDefined()
  })

  it('handles only newlines', () => {
    const result = validate('\n\n\n')
    expect(result).toBeDefined()
  })

  it('handles mixed whitespace', () => {
    const result = validate(' \t \n \r\n \t ')
    expect(result).toBeDefined()
  })

  it('handles leading whitespace before code', () => {
    const result = validate('   Frame w 100')
    expect(result).toBeDefined()
  })

  it('handles trailing whitespace after code', () => {
    const result = validate('Frame w 100   ')
    expect(result.valid).toBe(true)
  })

  it('handles multiple blank lines between elements', () => {
    const result = validate(`Frame w 100


Text "Hello"`)
    expect(result.valid).toBe(true)
  })

  it('handles excessive spaces between tokens', () => {
    const result = validate('Frame     w     100')
    expect(result.valid).toBe(true)
  })

  it('handles tabs as indentation', () => {
    const result = validate(`Frame
\tText "Child"`)
    expect(result.valid).toBe(true)
  })

  it('handles carriage return line endings', () => {
    const result = validate('Frame w 100\r\nText "Hello"')
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// 3. SEHR LANGE EINGABEN
// ============================================================================

describe('Edge Cases: Very Long Input', () => {
  it('handles very long property name (should error)', () => {
    const longName = 'a'.repeat(1000)
    const result = validate(`Frame ${longName} 100`)
    expect(result).toBeDefined()
    // Should error as unknown property
    expect(result.valid).toBe(false)
  })

  it('handles very long string value', () => {
    const longString = 'x'.repeat(10000)
    const result = validate(`Text "${longString}"`)
    expect(result).toBeDefined()
    // Should be valid - long strings are allowed
    expect(result.valid).toBe(true)
  })

  it('handles very long component name', () => {
    const longName = 'MyComponent' + 'X'.repeat(500)
    const result = validate(`${longName} as Frame: w 100`)
    expect(result).toBeDefined()
  })

  it('handles very long line with many properties', () => {
    const props = Array(100).fill('pad 10').join(', ')
    const result = validate(`Frame ${props}`)
    expect(result).toBeDefined()
  })

  it('handles many lines', () => {
    const lines = Array(1000).fill('Frame w 100').join('\n')
    const result = validate(lines)
    expect(result).toBeDefined()
  })

  it('handles deeply nested structure (reasonable depth)', () => {
    // 20 levels deep
    let code = ''
    for (let i = 0; i < 20; i++) {
      code += '  '.repeat(i) + 'Frame\n'
    }
    const result = validate(code)
    expect(result).toBeDefined()
  })

  it('handles very long hex color (invalid)', () => {
    const longHex = '#' + 'F'.repeat(100)
    const { tokens, errors } = tokenizeWithErrors(longHex)
    // Should produce an error for invalid hex
    expect(errors.length).toBeGreaterThan(0)
  })

  it('handles very large number', () => {
    const result = validate('Frame w 999999999999999')
    expect(result).toBeDefined()
    // Should be valid (number parsing succeeds)
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// 4. UNICODE UND SONDERZEICHEN
// ============================================================================

describe('Edge Cases: Unicode and Special Characters', () => {
  it('handles Unicode in strings', () => {
    const result = validate('Text "Héllo Wörld 你好 🎉"')
    expect(result.valid).toBe(true)
  })

  it('handles emoji in strings', () => {
    const result = validate('Button "Click 👍"')
    expect(result.valid).toBe(true)
  })

  it('handles Unicode component names (should work)', () => {
    // Component names with Unicode might not be supported
    const result = validate('Кнопка as Button: w 100')
    expect(result).toBeDefined()
  })

  it('handles special characters in strings', () => {
    const specials = ['<', '>', '&', '"escaped\\"quote"', "single'quote"]
    for (const special of specials) {
      const code = `Text "${special}"`
      expect(() => validate(code)).not.toThrow()
    }
  })

  it('handles escaped characters in strings', () => {
    const result = validate('Text "Line1\\nLine2"')
    expect(result).toBeDefined()
  })

  it('handles backslash in strings', () => {
    const result = validate('Text "path\\\\to\\\\file"')
    expect(result).toBeDefined()
  })

  it('handles zero-width characters', () => {
    // Zero-width space (U+200B)
    const result = validate('Frame\u200B w 100')
    expect(result).toBeDefined()
  })

  it('handles RTL characters in strings', () => {
    const result = validate('Text "مرحبا"')  // Arabic "hello"
    expect(result.valid).toBe(true)
  })

  it('handles combining characters', () => {
    const result = validate('Text "café"')  // e with combining acute accent
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// 5. MAXIMALE VERSCHACHTELUNG
// ============================================================================

describe('Edge Cases: Maximum Nesting', () => {
  it('handles 50 levels of nesting (at limit)', () => {
    // The lexer has a limit of 51 levels
    let code = ''
    for (let i = 0; i < 50; i++) {
      code += '  '.repeat(i) + 'Frame\n'
    }
    const result = validate(code)
    expect(result).toBeDefined()
    // Should be valid (at limit)
    expect(result.errors.filter(e => e.code === 'E013')).toHaveLength(0)
  })

  it('rejects excessive nesting (over limit of 51)', () => {
    // The lexer has a limit of 51 indent levels
    // Test with 55 levels - just over the limit
    let code = ''
    for (let i = 0; i < 55; i++) {
      code += '  '.repeat(i) + 'Frame\n'
    }
    const result = validate(code)
    // Should have an error about indentation depth
    expect(result.errors.some(e => e.code === 'E013')).toBe(true)
  })

  it('handles nested components', () => {
    const result = validate(`
Outer as Frame:
  Inner as Frame:
    Innermost as Frame:
      Text "Deep"

Outer
  Inner
    Innermost`)
    expect(result).toBeDefined()
  })

  it('handles component with states', () => {
    const result = validate(`
Btn as Button: toggle()
  hover:
    bg #333
  on:
    bg #2563eb

Btn "Click"`)
    expect(result).toBeDefined()
  })
})

// ============================================================================
// 6. ZAHLEN-GRENZWERTE
// ============================================================================

describe('Edge Cases: Number Boundaries', () => {
  it('handles zero', () => {
    const result = validate('Frame w 0')
    expect(result.valid).toBe(true)
  })

  it('handles negative numbers', () => {
    const result = validate('Frame margin -10')
    expect(result.valid).toBe(true)
  })

  it('handles decimal numbers', () => {
    const result = validate('Frame opacity 0.5')
    expect(result.valid).toBe(true)
  })

  it('handles very small decimals', () => {
    const result = validate('Frame opacity 0.001')
    expect(result.valid).toBe(true)
  })

  it('handles numbers with leading zeros', () => {
    const result = validate('Frame w 007')
    expect(result).toBeDefined()
  })

  it('handles scientific notation (may not be supported)', () => {
    const result = validate('Frame w 1e5')
    expect(result).toBeDefined()
    // May error - not supported
  })

  it('handles MAX_SAFE_INTEGER', () => {
    const result = validate(`Frame w ${Number.MAX_SAFE_INTEGER}`)
    expect(result).toBeDefined()
  })

  it('handles negative zero', () => {
    const result = validate('Frame w -0')
    expect(result).toBeDefined()
  })

  it('handles multiple decimal points (invalid)', () => {
    const result = validate('Frame w 1.2.3')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.code === 'E014')).toBe(true)
  })

  it('handles standalone decimal point', () => {
    const result = validate('Frame w .')
    expect(result).toBeDefined()
  })

  it('handles decimal starting with dot', () => {
    const result = validate('Frame opacity .5')
    // Should parse as 0.5
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// 7. STRING-GRENZFÄLLE
// ============================================================================

describe('Edge Cases: String Boundaries', () => {
  it('handles empty string', () => {
    const result = validate('Text ""')
    expect(result.valid).toBe(true)
  })

  it('handles string with only spaces', () => {
    const result = validate('Text "   "')
    expect(result.valid).toBe(true)
  })

  it('handles string with newline', () => {
    const result = validate('Text "line1\\nline2"')
    expect(result).toBeDefined()
  })

  it('handles unclosed string (error)', () => {
    const result = validate('Text "unclosed')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.code === 'E010')).toBe(true)
  })

  it('handles string with embedded quotes', () => {
    const result = validate('Text "He said \\"hello\\""')
    expect(result).toBeDefined()
  })

  it('handles multiple strings on one line', () => {
    const result = validate('Button "First" "Second"')
    expect(result).toBeDefined()
  })

  it('handles URL in string', () => {
    const result = validate('Link href "https://example.com/path?query=1&foo=bar"')
    expect(result.valid).toBe(true)
  })

  it('handles file path in string', () => {
    const result = validate('Image src "/path/to/image.png"')
    expect(result.valid).toBe(true)
  })
})

// ============================================================================
// 8. SYNTAX-GRENZFÄLLE
// ============================================================================

describe('Edge Cases: Syntax Boundaries', () => {
  it('handles multiple commas', () => {
    const result = validate('Frame w 100,, h 100')
    expect(result).toBeDefined()
  })

  it('handles trailing comma', () => {
    const result = validate('Frame w 100, h 100,')
    expect(result).toBeDefined()
  })

  it('handles leading comma', () => {
    const result = validate('Frame , w 100')
    expect(result).toBeDefined()
  })

  it('handles semicolon in wrong place', () => {
    const result = validate('Frame; w 100')
    expect(result).toBeDefined()
  })

  it('handles colon without component name', () => {
    const result = validate(': w 100')
    expect(result).toBeDefined()
  })

  it('handles double colon', () => {
    const result = validate('Btn:: w 100')
    expect(result).toBeDefined()
  })

  it('handles token without name', () => {
    const result = validate('.bg: #333')
    expect(result).toBeDefined()
  })

  it('handles comment-like syntax', () => {
    const result = validate('// This is a comment\nFrame w 100')
    expect(result).toBeDefined()
  })

  it('handles block comment-like syntax', () => {
    const result = validate('/* comment */ Frame w 100')
    expect(result).toBeDefined()
  })

  it('handles hash without color', () => {
    const result = validate('Frame bg #')
    expect(result).toBeDefined()
    expect(result.valid).toBe(false)
  })

  it('handles dollar without token name', () => {
    const result = validate('Frame bg $')
    expect(result).toBeDefined()
  })

  it('handles parentheses without function', () => {
    const result = validate('Frame ()')
    expect(result).toBeDefined()
  })
})

// ============================================================================
// 9. KOMBINATION VON EDGE CASES
// ============================================================================

describe('Edge Cases: Combinations', () => {
  it('handles empty component definition', () => {
    const result = validate('Empty:')
    expect(result).toBeDefined()
  })

  it('handles component with only whitespace children', () => {
    const result = validate(`Container:

  `)
    expect(result).toBeDefined()
  })

  it('handles deeply nested with long strings', () => {
    const longString = 'x'.repeat(1000)
    const result = validate(`
Frame
  Frame
    Frame
      Frame
        Text "${longString}"`)
    expect(result).toBeDefined()
  })

  it('handles many tokens with long names', () => {
    const longName = 'token' + 'x'.repeat(100)
    const result = validate(`
${longName}.bg: #333
${longName}.col: white
Frame bg $${longName}, col $${longName}`)
    expect(result).toBeDefined()
  })

  it('handles all special characters in one string', () => {
    const result = validate('Text "<>&\\"\\\'\\n\\t\\r"')
    expect(result).toBeDefined()
  })

  it('handles alternating valid and invalid lines', () => {
    const result = validate(`
Frame w 100
InvalidElement
Text "Hello"
#invalid
Button "Click"`)
    expect(result).toBeDefined()
    // Should have some errors but not crash
    expect(result.errors.length).toBeGreaterThan(0)
  })
})
