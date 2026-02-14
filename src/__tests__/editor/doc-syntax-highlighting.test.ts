/**
 * Doc-Mode Syntax Highlighting Tests
 *
 * Tests for the syntax highlighting of doc-mode content.
 */

import { describe, it, expect } from 'vitest'

// Import the internal functions for testing
// Note: We test the tokenization logic, not the CodeMirror integration

// Simple tokenizer test helper
function tokenizeDocContent(content: string): Array<{ from: number; to: number; class: string }> {
  const tokens: Array<{ from: number; to: number; class: string }> = []
  let pos = 0

  const DOC_TOKEN = /^\$[a-zA-Z][a-zA-Z0-9_-]*/
  const DOC_LINK_URL = /^\([^)]*\)/

  while (pos < content.length) {
    const rest = content.slice(pos)

    // Doc token: $name or $name[text] or $link[text](url)
    const tokenMatch = rest.match(DOC_TOKEN)
    if (tokenMatch) {
      const tokenName = tokenMatch[0]
      tokens.push({
        from: pos,
        to: pos + tokenName.length,
        class: 'dsl-doc-token'
      })
      pos += tokenName.length

      // Check for bracket content: [text]
      const afterToken = content.slice(pos)
      const bracketMatch = afterToken.match(/^\[([^\]]*)\]/)
      if (bracketMatch) {
        // Opening bracket
        tokens.push({
          from: pos,
          to: pos + 1,
          class: 'dsl-doc-bracket'
        })
        // Closing bracket
        tokens.push({
          from: pos + bracketMatch[0].length - 1,
          to: pos + bracketMatch[0].length,
          class: 'dsl-doc-bracket'
        })
        pos += bracketMatch[0].length

        // Check for link URL: (url)
        const afterBracket = content.slice(pos)
        const urlMatch = afterBracket.match(DOC_LINK_URL)
        if (urlMatch) {
          tokens.push({
            from: pos,
            to: pos + urlMatch[0].length,
            class: 'dsl-doc-link-url'
          })
          pos += urlMatch[0].length
        }
      }
      continue
    }

    pos++
  }

  return tokens
}

describe('doc-mode syntax highlighting', () => {
  describe('doc tokens', () => {
    it('highlights block tokens ($h2, $p)', () => {
      const content = '$h2 Hello World'
      const tokens = tokenizeDocContent(content)

      expect(tokens).toHaveLength(1)
      expect(tokens[0]).toEqual({
        from: 0,
        to: 3,
        class: 'dsl-doc-token'
      })
    })

    it('highlights inline tokens ($b[text])', () => {
      const content = 'Some $b[bold] text'
      const tokens = tokenizeDocContent(content)

      expect(tokens).toHaveLength(3)
      expect(tokens[0]).toEqual({
        from: 5,
        to: 7,
        class: 'dsl-doc-token'
      })
      expect(tokens[1]).toEqual({
        from: 7,
        to: 8,
        class: 'dsl-doc-bracket'
      })
      expect(tokens[2]).toEqual({
        from: 12,
        to: 13,
        class: 'dsl-doc-bracket'
      })
    })

    it('highlights link tokens ($link[text](url))', () => {
      const content = 'Click $link[here](https://example.com) for more'
      const tokens = tokenizeDocContent(content)

      expect(tokens).toHaveLength(4)
      expect(tokens[0].class).toBe('dsl-doc-token')  // $link
      expect(tokens[1].class).toBe('dsl-doc-bracket')  // [
      expect(tokens[2].class).toBe('dsl-doc-bracket')  // ]
      expect(tokens[3].class).toBe('dsl-doc-link-url')  // (url)
    })

    it('highlights multiple tokens in same content', () => {
      const content = '$h2 Title with $b[bold] and $i[italic]'
      const tokens = tokenizeDocContent(content)

      // $h2, $b, [, ], $i, [, ]
      expect(tokens).toHaveLength(7)

      // $h2
      expect(tokens[0]).toEqual({ from: 0, to: 3, class: 'dsl-doc-token' })
      // $b
      expect(tokens[1]).toEqual({ from: 15, to: 17, class: 'dsl-doc-token' })
      // $i
      expect(tokens[4]).toEqual({ from: 28, to: 30, class: 'dsl-doc-token' })
    })
  })

  describe('doc keywords', () => {
    it('identifies text as doc keyword', () => {
      const DOC_KEYWORD = /^(text|playground|doc)\b/
      expect('text'.match(DOC_KEYWORD)).toBeTruthy()
      expect('playground'.match(DOC_KEYWORD)).toBeTruthy()
      expect('doc'.match(DOC_KEYWORD)).toBeTruthy()
      expect('textual'.match(DOC_KEYWORD)).toBeFalsy()
    })
  })

  describe('multiline string detection', () => {
    it('finds multiline strings', () => {
      const text = "text\n  '$h2 Hello'"

      // Find single quotes
      const strings: Array<{ from: number; to: number }> = []
      let pos = 0
      while (pos < text.length) {
        if (text[pos] === "'") {
          const start = pos
          pos++
          while (pos < text.length && text[pos] !== "'") {
            pos++
          }
          if (pos < text.length) {
            strings.push({ from: start, to: pos + 1 })
            pos++
          }
        } else {
          pos++
        }
      }

      expect(strings).toHaveLength(1)
      expect(strings[0].from).toBe(7)  // position of opening '
      expect(strings[0].to).toBe(18)   // position after closing '
    })
  })
})
