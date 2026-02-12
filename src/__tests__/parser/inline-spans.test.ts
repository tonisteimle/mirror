/**
 * Inline Span Tests
 *
 * Tests for inline span syntax: "text *styled*:style more"
 * - *text*:bold → bold
 * - *text*:italic → italic
 * - *text*:underline → underline
 * - *text*:$token → custom style token
 */

import { describe, it, expect } from 'vitest'
import { parseInlineSpans, resolveSpanStyle } from '../../parser/sugar/handlers/string-handler'
import { parse } from '../../parser/parser'

describe('inline-spans', () => {
  describe('parseInlineSpans', () => {
    it('returns single span for plain text', () => {
      const spans = parseInlineSpans('Hello World')
      expect(spans).toEqual([{ text: 'Hello World' }])
    })

    it('parses *text*:bold syntax', () => {
      const spans = parseInlineSpans('This is *important*:bold text')
      expect(spans).toEqual([
        { text: 'This is ' },
        { text: 'important', style: 'bold' },
        { text: ' text' },
      ])
    })

    it('parses *text*:italic syntax', () => {
      const spans = parseInlineSpans('This is *emphasized*:italic')
      expect(spans).toEqual([
        { text: 'This is ' },
        { text: 'emphasized', style: 'italic' },
      ])
    })

    it('parses *text*:underline syntax', () => {
      const spans = parseInlineSpans('Click *here*:underline to continue')
      expect(spans).toEqual([
        { text: 'Click ' },
        { text: 'here', style: 'underline' },
        { text: ' to continue' },
      ])
    })

    it('parses *text*:$token syntax', () => {
      const spans = parseInlineSpans('The *title*:$header is important')
      expect(spans).toEqual([
        { text: 'The ' },
        { text: 'title', style: '$header' },
        { text: ' is important' },
      ])
    })

    it('parses multiple spans in one string', () => {
      const spans = parseInlineSpans('*bold*:bold and *italic*:italic')
      expect(spans).toEqual([
        { text: 'bold', style: 'bold' },
        { text: ' and ' },
        { text: 'italic', style: 'italic' },
      ])
    })

    it('treats *text* without :style as literal text', () => {
      const spans = parseInlineSpans('This is *not styled* text')
      expect(spans).toEqual([{ text: 'This is *not styled* text' }])
    })

    it('handles escaped asterisks', () => {
      const spans = parseInlineSpans('Use \\* for emphasis')
      expect(spans).toEqual([{ text: 'Use * for emphasis' }])
    })

    it('handles escaped asterisks inside spans', () => {
      const spans = parseInlineSpans('*A \\* B*:bold')
      expect(spans).toEqual([{ text: 'A * B', style: 'bold' }])
    })

    it('handles unclosed span as literal', () => {
      const spans = parseInlineSpans('This is *unclosed')
      expect(spans).toEqual([{ text: 'This is *unclosed' }])
    })

    it('handles span at start of string', () => {
      const spans = parseInlineSpans('*First*:bold word')
      expect(spans).toEqual([
        { text: 'First', style: 'bold' },
        { text: ' word' },
      ])
    })

    it('handles span at end of string', () => {
      const spans = parseInlineSpans('Last *word*:bold')
      expect(spans).toEqual([
        { text: 'Last ' },
        { text: 'word', style: 'bold' },
      ])
    })

    it('handles empty span text', () => {
      const spans = parseInlineSpans('**:bold')
      expect(spans).toEqual([{ text: '', style: 'bold' }])
    })

    it('handles style with hyphen', () => {
      const spans = parseInlineSpans('*text*:my-style')
      expect(spans).toEqual([{ text: 'text', style: 'my-style' }])
    })

    it('handles style with underscore', () => {
      const spans = parseInlineSpans('*text*:my_style')
      expect(spans).toEqual([{ text: 'text', style: 'my_style' }])
    })
  })

  describe('resolveSpanStyle', () => {
    // Create a mock context for testing
    const createMockContext = (tokens: Map<string, unknown> = new Map()) => ({
      designTokens: tokens,
    }) as never

    it('returns bold properties for "bold"', () => {
      const ctx = createMockContext()
      const style = resolveSpanStyle('bold', ctx)
      expect(style).toEqual({ weight: 700 })
    })

    it('returns italic properties for "italic"', () => {
      const ctx = createMockContext()
      const style = resolveSpanStyle('italic', ctx)
      expect(style).toEqual({ italic: true })
    })

    it('returns underline properties for "underline"', () => {
      const ctx = createMockContext()
      const style = resolveSpanStyle('underline', ctx)
      expect(style).toEqual({ underline: true })
    })

    it('returns empty for unknown style', () => {
      const ctx = createMockContext()
      const style = resolveSpanStyle('unknown', ctx)
      expect(style).toEqual({})
    })

    it('resolves $token from designTokens', () => {
      const tokens = new Map<string, unknown>([
        ['header', { col: '#234', weight: 700 }],
      ])
      const ctx = createMockContext(tokens)
      const style = resolveSpanStyle('$header', ctx)
      expect(style).toEqual({ col: '#234', weight: 700 })
    })

    it('returns empty for non-existent token', () => {
      const ctx = createMockContext()
      const style = resolveSpanStyle('$nonexistent', ctx)
      expect(style).toEqual({})
    })

    it('resolves token sequence to properties', () => {
      const tokens = new Map<string, unknown>([
        ['header', {
          type: 'sequence',
          tokens: [
            { type: 'PROPERTY', value: 'col' },
            { type: 'COLOR', value: '#234' },
            { type: 'PROPERTY', value: 'weight' },
            { type: 'NUMBER', value: '700' },
          ]
        }],
      ])
      const ctx = createMockContext(tokens)
      const style = resolveSpanStyle('$header', ctx)
      expect(style).toEqual({ col: '#234', weight: 700 })
    })
  })

  describe('parse integration', () => {
    it('creates multiple _text nodes for inline spans', () => {
      const code = 'Box "Hello *world*:bold"'
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const boxNode = result.nodes[0]
      expect(boxNode.name).toBe('Box')
      expect(boxNode.children).toHaveLength(2)

      // First span: "Hello "
      expect(boxNode.children[0].name).toBe('_text')
      expect(boxNode.children[0].content).toBe('Hello ')

      // Second span: "world" with bold
      expect(boxNode.children[1].name).toBe('_text')
      expect(boxNode.children[1].content).toBe('world')
      expect(boxNode.children[1].properties.weight).toBe(700)
    })

    it('creates _text nodes with italic style', () => {
      const code = 'Box "*emphasized*:italic text"'
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      const boxNode = result.nodes[0]
      expect(boxNode.children).toHaveLength(2)

      expect(boxNode.children[0].content).toBe('emphasized')
      expect(boxNode.children[0].properties.italic).toBe(true)

      expect(boxNode.children[1].content).toBe(' text')
    })

    it('creates _text nodes with underline style', () => {
      const code = 'Box "Click *here*:underline"'
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      const boxNode = result.nodes[0]

      const underlinedSpan = boxNode.children.find(c => c.content === 'here')
      expect(underlinedSpan).toBeDefined()
      expect(underlinedSpan!.properties.underline).toBe(true)
    })

    it('handles plain text without spans', () => {
      const code = 'Box "Plain text without spans"'
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      const boxNode = result.nodes[0]
      expect(boxNode.children).toHaveLength(1)
      expect(boxNode.children[0].content).toBe('Plain text without spans')
    })

    it('handles multiple styled spans', () => {
      const code = 'Box "*bold*:bold and *italic*:italic"'
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      const boxNode = result.nodes[0]
      expect(boxNode.children).toHaveLength(3)

      expect(boxNode.children[0].content).toBe('bold')
      expect(boxNode.children[0].properties.weight).toBe(700)

      expect(boxNode.children[1].content).toBe(' and ')

      expect(boxNode.children[2].content).toBe('italic')
      expect(boxNode.children[2].properties.italic).toBe(true)
    })

    it('preserves trailing properties after string with spans', () => {
      const code = 'Box "Hello *world*:bold" col #F00'
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      const boxNode = result.nodes[0]

      // Last span should have the trailing col property
      const lastSpan = boxNode.children[boxNode.children.length - 1]
      expect(lastSpan.properties.col).toBe('#F00')
    })

    it('applies custom token styles to inline spans', () => {
      const code = `$header: col #234 weight 700

Box "Der *Titel*:$header steht hier"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      const boxNode = result.nodes[0]
      expect(boxNode.children).toHaveLength(3)

      // First span: "Der "
      expect(boxNode.children[0].content).toBe('Der ')
      expect(boxNode.children[0].properties).toEqual({})

      // Second span: "Titel" with token styles
      expect(boxNode.children[1].content).toBe('Titel')
      expect(boxNode.children[1].properties.col).toBe('#234')
      expect(boxNode.children[1].properties.weight).toBe(700)

      // Third span: " steht hier"
      expect(boxNode.children[2].content).toBe(' steht hier')
    })
  })
})
