/**
 * Multiline String Tests
 *
 * Tests for the '...' multiline string syntax used in doc-mode.
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'

describe('multiline-string lexer', () => {
  describe('basic parsing', () => {
    it('parses single-line string with single quotes', () => {
      const tokens = tokenize("'Hello World'")
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe('Hello World')
    })

    it('parses multiline string', () => {
      const code = `'First line
Second line
Third line'`
      const tokens = tokenize(code)
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe('First line\nSecond line\nThird line')
    })

    it('preserves indentation in multiline string', () => {
      const code = `'Line 1
  Indented line
    More indented'`
      const tokens = tokenize(code)
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe('Line 1\n  Indented line\n    More indented')
    })

    it('handles empty multiline string', () => {
      const tokens = tokenize("''")
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe('')
    })
  })

  describe('escaping', () => {
    it('handles escaped single quotes', () => {
      const tokens = tokenize("'It\\'s working'")
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe("It's working")
    })

    it('handles multiple escaped quotes', () => {
      const tokens = tokenize("'He said \\'hello\\' and \\'goodbye\\''")
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe("He said 'hello' and 'goodbye'")
    })
  })

  describe('with doc-mode content', () => {
    it('parses string with $token syntax', () => {
      const code = `'$h2 Title

$p This is a paragraph with $b[bold] text.'`
      const tokens = tokenize(code)
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toContain('$h2 Title')
      expect(stringToken!.value).toContain('$b[bold]')
    })

    it('parses string after text keyword', () => {
      const code = `text
'$p Hello World'`
      const tokens = tokenize(code)

      // Should have: COMPONENT_NAME(text), NEWLINE, MULTILINE_STRING, NEWLINE, EOF
      const textToken = tokens.find(t => t.type === 'COMPONENT_NAME' && t.value === 'text')
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')

      expect(textToken).toBeDefined()
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe('$p Hello World')
    })

    it('parses string after playground keyword', () => {
      const code = `playground
  'Button bg #2271c1 "Click me"'`
      const tokens = tokenize(code)

      const playgroundToken = tokens.find(t => t.type === 'COMPONENT_NAME' && t.value === 'playground')
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')

      expect(playgroundToken).toBeDefined()
      expect(stringToken).toBeDefined()
      expect(stringToken!.value).toBe('Button bg #2271c1 "Click me"')
    })
  })

  describe('error handling', () => {
    it('reports error for unterminated string', () => {
      const code = `'This string never ends`
      const tokens = tokenize(code)
      const errorToken = tokens.find(t => t.type === 'ERROR')
      expect(errorToken).toBeDefined()
      expect(errorToken!.value).toContain('Unterminated')
    })

    it('reports error for unterminated multiline string', () => {
      const code = `'This string
spans multiple lines
but never ends`
      const tokens = tokenize(code)
      const errorToken = tokens.find(t => t.type === 'ERROR')
      expect(errorToken).toBeDefined()
      expect(errorToken!.value).toContain('Unterminated')
    })
  })

  describe('line tracking', () => {
    it('tracks starting line of multiline string', () => {
      const code = `text
'Line 1
Line 2'`
      const tokens = tokenize(code)
      const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
      expect(stringToken).toBeDefined()
      expect(stringToken!.line).toBe(1) // 0-indexed, so line 2 = index 1
    })
  })

  describe('mixed content', () => {
    it('handles regular strings and multiline strings in same file', () => {
      const code = `Button "Click me"
text
'$p Multiline content'`
      const tokens = tokenize(code)

      const regularString = tokens.find(t => t.type === 'STRING')
      const multilineString = tokens.find(t => t.type === 'MULTILINE_STRING')

      expect(regularString).toBeDefined()
      expect(regularString!.value).toBe('Click me')

      expect(multilineString).toBeDefined()
      expect(multilineString!.value).toBe('$p Multiline content')
    })
  })
})
