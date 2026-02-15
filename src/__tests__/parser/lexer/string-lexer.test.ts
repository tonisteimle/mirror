/**
 * String Lexer Tests
 *
 * Unit tests for parseString() and parseMultilineString() functions.
 * Tests string parsing, escaping, and error handling.
 */
import { describe, it, expect } from 'vitest'
import { parseString, parseMultilineString } from '../../../parser/lexer/string-lexer'
import { tokenize } from '../../../parser/lexer'

describe('string-lexer', () => {
  // ==========================================================================
  // parseString - Regular Double-Quoted Strings
  // ==========================================================================
  describe('parseString', () => {
    describe('basic parsing', () => {
      it('parses simple string', () => {
        const content = '"Hello"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens).toHaveLength(1)
        expect(result.tokens[0].type).toBe('STRING')
        expect(result.tokens[0].value).toBe('Hello')
      })

      it('parses empty string', () => {
        const content = '""'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens).toHaveLength(1)
        expect(result.tokens[0].type).toBe('STRING')
        expect(result.tokens[0].value).toBe('')
      })

      it('parses string with spaces', () => {
        const content = '"Hello World"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toBe('Hello World')
      })

      it('parses string with special characters', () => {
        const content = '"Hello, World! @#$%^&*()"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toBe('Hello, World! @#$%^&*()')
      })

      it('parses string with numbers', () => {
        const content = '"123 ABC 456"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toBe('123 ABC 456')
      })

      it('parses string from middle of content', () => {
        const content = 'Button "Click me" bg'
        const startPos = content.indexOf('"')
        const result = parseString(content, startPos, startPos, 0)
        expect(result.tokens[0].value).toBe('Click me')
      })
    })

    describe('position tracking', () => {
      it('updates newPos correctly', () => {
        const content = '"Hello"'
        const result = parseString(content, 0, 0, 0)
        expect(result.newPos).toBe(7) // Past closing quote
      })

      it('updates newColumn correctly', () => {
        const content = '"Hello"'
        const result = parseString(content, 0, 0, 0)
        expect(result.newColumn).toBe(7) // 5 chars + 2 quotes
      })

      it('preserves line number in token', () => {
        const content = '"Hello"'
        const result = parseString(content, 0, 0, 5)
        expect(result.tokens[0].line).toBe(5)
      })

      it('records column in token', () => {
        const content = '"Hello"'
        const result = parseString(content, 0, 10, 0)
        expect(result.tokens[0].column).toBe(10)
      })
    })

    describe('error handling', () => {
      it('returns ERROR token for unterminated string', () => {
        const content = '"Hello'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens).toHaveLength(1)
        expect(result.tokens[0].type).toBe('ERROR')
        expect(result.tokens[0].value).toContain('Unterminated')
      })

      it('includes partial value in error message', () => {
        const content = '"Partial string'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toContain('Partial string')
      })

      it('handles empty unterminated string', () => {
        const content = '"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].type).toBe('ERROR')
      })
    })

    describe('unicode and special content', () => {
      it('parses string with unicode characters', () => {
        const content = '"Hello \u00E9\u00E8\u00EA"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toBe('Hello \u00E9\u00E8\u00EA')
      })

      it('parses string with emoji', () => {
        const content = '"Hello World"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toBe('Hello World')
      })

      it('parses string with tab character', () => {
        const content = '"Hello\tWorld"'
        const result = parseString(content, 0, 0, 0)
        expect(result.tokens[0].value).toBe('Hello\tWorld')
      })
    })
  })

  // ==========================================================================
  // parseMultilineString - Single-Quoted Multiline Strings
  // ==========================================================================
  describe('parseMultilineString', () => {
    describe('single line parsing', () => {
      it('parses simple single-line string', () => {
        const content = "'Hello World'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken).toBeDefined()
        expect(stringToken!.value).toBe('Hello World')
      })

      it('parses empty single-quoted string', () => {
        const content = "''"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('')
      })
    })

    describe('multiline parsing', () => {
      it('parses two-line string', () => {
        const lines = ["'First line", "Second line'"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('First line\nSecond line')
      })

      it('parses three-line string', () => {
        const lines = ["'Line 1", "Line 2", "Line 3'"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('Line 1\nLine 2\nLine 3')
      })

      it('preserves indentation in multiline string', () => {
        const lines = ["'Line 1", "  Indented", "    More indented'"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('Line 1\n  Indented\n    More indented')
      })

      it('preserves empty lines in multiline string', () => {
        const lines = ["'Line 1", "", "Line 3'"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('Line 1\n\nLine 3')
      })
    })

    describe('escape sequences', () => {
      it('handles escaped single quote', () => {
        const content = "'It\\'s working'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe("It's working")
      })

      it('handles multiple escaped quotes', () => {
        const content = "'He said \\'hello\\' and \\'goodbye\\''"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe("He said 'hello' and 'goodbye'")
      })

      it('handles escaped quote at start', () => {
        const content = "'\\'quoted'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe("'quoted")
      })

      it('handles escaped quote at end', () => {
        const content = "'quoted\\''"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe("quoted'")
      })
    })

    describe('position and line tracking', () => {
      it('returns correct newLineNum for multiline string', () => {
        const lines = ["'First line", "Second line", "Third line'"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        expect(result.newLineNum).toBe(2) // Ends on line index 2
      })

      it('sets shouldBreak flag', () => {
        const content = "'Single line'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        expect(result.shouldBreak).toBe(true)
      })

      it('records starting line in token', () => {
        const lines = ["'First line", "Second line'"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.line).toBe(0)
      })

      it('adds NEWLINE token', () => {
        const content = "'Content'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const newlineToken = result.tokens.find(t => t.type === 'NEWLINE')
        expect(newlineToken).toBeDefined()
      })
    })

    describe('error handling', () => {
      it('returns ERROR for unterminated single-line string', () => {
        const content = "'Never ends"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const errorToken = result.tokens.find(t => t.type === 'ERROR')
        expect(errorToken).toBeDefined()
        expect(errorToken!.value).toContain('Unterminated')
      })

      it('returns ERROR for unterminated multiline string', () => {
        const lines = ["'Start", "Middle", "End without quote"]
        const result = parseMultilineString(lines[0], 0, 0, 0, lines)
        const errorToken = result.tokens.find(t => t.type === 'ERROR')
        expect(errorToken).toBeDefined()
        expect(errorToken!.value).toContain('Unterminated')
      })

      it('includes starting line number in error', () => {
        const lines = ["Some code", "'Start", "Never ends"]
        const result = parseMultilineString(lines[1], 0, 0, 1, lines)
        const errorToken = result.tokens.find(t => t.type === 'ERROR')
        expect(errorToken!.value).toContain('line 2') // Line 1 + 1 for 1-indexed
      })
    })

    describe('doc-mode content', () => {
      it('preserves $token syntax', () => {
        const content = "'$h2 Title'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('$h2 Title')
      })

      it('preserves markdown-like formatting', () => {
        const content = "'**bold** and _italic_'"
        const lines = [content]
        const result = parseMultilineString(content, 0, 0, 0, lines)
        const stringToken = result.tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('**bold** and _italic_')
      })
    })
  })

  // ==========================================================================
  // Integration Tests via tokenize()
  // ==========================================================================
  describe('integration with tokenize', () => {
    describe('double-quoted strings', () => {
      it('tokenizes Button with string', () => {
        const tokens = tokenize('Button "Click me"')
        const stringToken = tokens.find(t => t.type === 'STRING')
        expect(stringToken).toBeDefined()
        expect(stringToken!.value).toBe('Click me')
      })

      it('tokenizes multiple strings on same line', () => {
        const tokens = tokenize('Link "https://example.com" "Click here"')
        const stringTokens = tokens.filter(t => t.type === 'STRING')
        expect(stringTokens).toHaveLength(2)
        expect(stringTokens[0].value).toBe('https://example.com')
        expect(stringTokens[1].value).toBe('Click here')
      })

      it('tokenizes string after properties', () => {
        const tokens = tokenize('Button bg #3B82F6 pad 12 "Submit"')
        const stringToken = tokens.find(t => t.type === 'STRING')
        expect(stringToken!.value).toBe('Submit')
      })

      it('handles string with inline comment', () => {
        const tokens = tokenize('Button "Click" // comment')
        const stringToken = tokens.find(t => t.type === 'STRING')
        expect(stringToken!.value).toBe('Click')
        // Comment should be ignored
        expect(tokens.some(t => t.value.includes('comment'))).toBe(false)
      })
    })

    describe('single-quoted strings (multiline)', () => {
      it('tokenizes single-line multiline string', () => {
        const tokens = tokenize("'Hello World'")
        const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken).toBeDefined()
        expect(stringToken!.value).toBe('Hello World')
      })

      it('tokenizes multiline string spanning lines', () => {
        const code = `'First line
Second line'`
        const tokens = tokenize(code)
        const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(stringToken!.value).toBe('First line\nSecond line')
      })

      it('tokenizes text component with multiline string', () => {
        const code = `text
'$p Paragraph content'`
        const tokens = tokenize(code)
        const textToken = tokens.find(t => t.type === 'COMPONENT_NAME' && t.value === 'text')
        const stringToken = tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(textToken).toBeDefined()
        expect(stringToken).toBeDefined()
      })
    })

    describe('mixed string types', () => {
      it('handles both string types in same file', () => {
        const code = `Button "Click me"
text
'$p Multiline content'`
        const tokens = tokenize(code)
        const regularString = tokens.find(t => t.type === 'STRING')
        const multilineString = tokens.find(t => t.type === 'MULTILINE_STRING')
        expect(regularString!.value).toBe('Click me')
        expect(multilineString!.value).toBe('$p Multiline content')
      })
    })
  })
})
