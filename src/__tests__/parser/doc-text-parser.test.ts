/**
 * Doc Text Parser Tests
 *
 * Tests for parsing multiline strings with markdown-style formatting.
 */

import { describe, it, expect } from 'vitest'
import { parseDocText, parseInlineTokens, normalizeIndent } from '../../parser/doc-text-parser'

describe('doc-text-parser', () => {
  describe('parseInlineTokens - Markdown syntax', () => {
    it('returns plain text as single segment', () => {
      const result = parseInlineTokens('Hello World')
      expect(result).toEqual([{ type: 'text', content: 'Hello World' }])
    })

    it('parses **bold** text', () => {
      const result = parseInlineTokens('This is **bold** text')
      expect(result).toEqual([
        { type: 'text', content: 'This is ' },
        { type: 'inline', content: 'bold', token: 'b' },
        { type: 'text', content: ' text' }
      ])
    })

    it('parses _italic_ text', () => {
      const result = parseInlineTokens('This is _italic_ text')
      expect(result).toEqual([
        { type: 'text', content: 'This is ' },
        { type: 'inline', content: 'italic', token: 'i' },
        { type: 'text', content: ' text' }
      ])
    })

    it('parses `code` text', () => {
      const result = parseInlineTokens('Use `console.log()` for debugging')
      expect(result).toEqual([
        { type: 'text', content: 'Use ' },
        { type: 'inline', content: 'console.log()', token: 'code' },
        { type: 'text', content: ' for debugging' }
      ])
    })

    it('parses multiple inline tokens', () => {
      const result = parseInlineTokens('**bold** and _italic_')
      expect(result).toEqual([
        { type: 'inline', content: 'bold', token: 'b' },
        { type: 'text', content: ' and ' },
        { type: 'inline', content: 'italic', token: 'i' }
      ])
    })

    it('parses [link text](url) syntax', () => {
      const result = parseInlineTokens('Visit [our docs](https://example.com) for more')
      expect(result).toEqual([
        { type: 'text', content: 'Visit ' },
        { type: 'link', content: 'our docs', token: 'link', url: 'https://example.com' },
        { type: 'text', content: ' for more' }
      ])
    })

    it('handles escaped characters', () => {
      const result = parseInlineTokens('Use \\*asterisks\\* literally')
      expect(result).toEqual([{ type: 'text', content: 'Use *asterisks* literally' }])
    })

    it('handles escaped brackets', () => {
      const result = parseInlineTokens('Array\\[0\\] syntax')
      expect(result).toEqual([{ type: 'text', content: 'Array[0] syntax' }])
    })

    it('handles bold at end of text', () => {
      const result = parseInlineTokens('Click **here**')
      expect(result).toEqual([
        { type: 'text', content: 'Click ' },
        { type: 'inline', content: 'here', token: 'b' }
      ])
    })

    it('handles bold at start of text', () => {
      const result = parseInlineTokens('**Important** notice')
      expect(result).toEqual([
        { type: 'inline', content: 'Important', token: 'b' },
        { type: 'text', content: ' notice' }
      ])
    })

    it('handles empty bold', () => {
      const result = parseInlineTokens('****')
      expect(result).toEqual([
        { type: 'inline', content: '', token: 'b' }
      ])
    })

    it('does not match underscore in snake_case', () => {
      // snake_case should not be parsed as italic
      const result = parseInlineTokens('Use my_variable_name here')
      expect(result).toEqual([{ type: 'text', content: 'Use my_variable_name here' }])
    })

    it('matches underscore at word boundary', () => {
      const result = parseInlineTokens('This _word_ is italic')
      expect(result).toEqual([
        { type: 'text', content: 'This ' },
        { type: 'inline', content: 'word', token: 'i' },
        { type: 'text', content: ' is italic' }
      ])
    })

    it('does not parse unclosed markers', () => {
      const result = parseInlineTokens('This has **unclosed bold')
      expect(result).toEqual([{ type: 'text', content: 'This has **unclosed bold' }])
    })
  })

  describe('parseDocText - Block syntax', () => {
    it('parses # Heading 1', () => {
      const result = parseDocText('# What is Mirror')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        content: 'What is Mirror',
        token: 'h1'
      })
    })

    it('parses ## Heading 2', () => {
      const result = parseDocText('## Getting Started')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        content: 'Getting Started',
        token: 'h2'
      })
    })

    it('parses ### Heading 3', () => {
      const result = parseDocText('### Installation')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        content: 'Installation',
        token: 'h3'
      })
    })

    it('parses #### Heading 4', () => {
      const result = parseDocText('#### Details')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        content: 'Details',
        token: 'h4'
      })
    })

    it('parses legacy $token syntax', () => {
      const result = parseDocText('$p This is a paragraph.')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        content: 'This is a paragraph.',
        token: 'p'
      })
    })

    it('parses multiple blocks', () => {
      const result = parseDocText(`## Title

$p First paragraph.

$p Second paragraph.`)

      expect(result).toHaveLength(3)
      expect(result[0].token).toBe('h2')
      expect(result[1].token).toBe('p')
      expect(result[2].token).toBe('p')
    })

    it('parses inline tokens within block', () => {
      const result = parseDocText('$p This has **bold** text.')

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('block')
      expect(result[0].token).toBe('p')
      expect(result[0].children).toBeDefined()
      expect(result[0].children).toHaveLength(3)
      expect(result[0].children![0]).toEqual({ type: 'text', content: 'This has ' })
      expect(result[0].children![1]).toEqual({ type: 'inline', content: 'bold', token: 'b' })
      expect(result[0].children![2]).toEqual({ type: 'text', content: ' text.' })
    })

    it('parses links within block', () => {
      const result = parseDocText('$p See [docs](https://example.com) for info.')

      expect(result).toHaveLength(1)
      expect(result[0].children).toBeDefined()

      const linkSegment = result[0].children!.find(s => s.type === 'link')
      expect(linkSegment).toMatchObject({
        type: 'link',
        content: 'docs',
        token: 'link',
        url: 'https://example.com'
      })
    })

    it('handles block token without content', () => {
      const result = parseDocText('$divider')
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        content: '',
        token: 'divider'
      })
    })

    it('handles plain text lines (no block token)', () => {
      const result = parseDocText('Just plain text')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ type: 'text', content: 'Just plain text' })
    })

    it('handles mixed block and plain text', () => {
      const result = parseDocText(`## Title

Plain text here.

$p Paragraph.`)

      expect(result.length).toBeGreaterThanOrEqual(3)
      expect(result[0].type).toBe('block')
      expect(result[0].token).toBe('h2')
    })

    it('merges continuation lines into block (soft wrap)', () => {
      const result = parseDocText(`$p This is a long paragraph
that continues on the next line
and even a third line.`)

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        type: 'block',
        token: 'p',
        content: 'This is a long paragraph that continues on the next line and even a third line.'
      })
    })

    it('ends block on empty line, starts new block on next token', () => {
      const result = parseDocText(`$p First paragraph
with continuation.

$p Second paragraph
also with continuation.`)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'block',
        token: 'p',
        content: 'First paragraph with continuation.'
      })
      expect(result[1]).toMatchObject({
        type: 'block',
        token: 'p',
        content: 'Second paragraph also with continuation.'
      })
    })

    it('handles consecutive block tokens without empty lines', () => {
      const result = parseDocText(`## Title
$p Paragraph starts immediately.`)

      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        type: 'block',
        token: 'h2',
        content: 'Title'
      })
      expect(result[1]).toMatchObject({
        type: 'block',
        token: 'p',
        content: 'Paragraph starts immediately.'
      })
    })

    it('inline tokens cannot span lines', () => {
      // If ** starts on one line and ** is on another, it should NOT be parsed as bold
      const result = parseDocText(`$p Text with **broken
token** here.`)

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('block')
      // The **broken should remain as plain text since it's not closed on same line
      const children = result[0].children
      expect(children).toBeDefined()
      // Should NOT contain a bold token with content "broken token"
      const brokenInline = children?.find(c => c.type === 'inline' && c.content === 'broken token')
      expect(brokenInline).toBeUndefined()
    })

    it('inline tokens work when on same line', () => {
      const result = parseDocText(`$p Text with _italic_ and
more text here.`)

      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('block')
      const children = result[0].children
      expect(children).toBeDefined()
      // Should contain the italic inline token
      const italicInline = children?.find(c => c.type === 'inline' && c.token === 'i')
      expect(italicInline).toBeDefined()
      expect(italicInline?.content).toBe('italic')
    })

    it('does not match # without space', () => {
      // #hashtag should not be parsed as heading
      const result = parseDocText('#hashtag')
      expect(result).toHaveLength(1)
      expect(result[0].type).toBe('text')
      expect(result[0].content).toBe('#hashtag')
    })
  })

  describe('normalizeIndent', () => {
    it('removes common leading indentation', () => {
      const input = `  Line 1
  Line 2
  Line 3`
      const result = normalizeIndent(input)
      expect(result).toBe(`Line 1
Line 2
Line 3`)
    })

    it('preserves relative indentation', () => {
      const input = `  Base
    Indented
  Back`
      const result = normalizeIndent(input)
      expect(result).toBe(`Base
  Indented
Back`)
    })

    it('ignores empty lines when calculating min indent', () => {
      const input = `  Line 1

  Line 2`
      const result = normalizeIndent(input)
      expect(result).toBe(`Line 1

Line 2`)
    })

    it('returns unchanged if no common indent', () => {
      const input = `No indent
  Some indent`
      const result = normalizeIndent(input)
      expect(result).toBe(input)
    })
  })

  describe('full document parsing', () => {
    it('parses complete doc-mode content with markdown syntax', () => {
      const content = `## What is Mirror

$p Mirror is a description language for **user interfaces**. One syntax for structure, styling, and interactions.

$p Building UI today means juggling three languages.`

      const result = parseDocText(content)

      expect(result.length).toBeGreaterThanOrEqual(3)

      // First should be h2
      expect(result[0]).toMatchObject({
        type: 'block',
        token: 'h2',
        content: 'What is Mirror'
      })

      // Second should be p with inline bold
      expect(result[1].type).toBe('block')
      expect(result[1].token).toBe('p')
      expect(result[1].children).toBeDefined()

      const boldSegment = result[1].children!.find(s => s.type === 'inline' && s.token === 'b')
      expect(boldSegment).toBeDefined()
      expect(boldSegment!.content).toBe('user interfaces')
    })

    it('parses markdown headings with inline formatting', () => {
      const content = `# Welcome to **Mirror**`
      const result = parseDocText(content)

      expect(result).toHaveLength(1)
      expect(result[0].token).toBe('h1')
      expect(result[0].children).toBeDefined()

      const boldSegment = result[0].children!.find(s => s.type === 'inline' && s.token === 'b')
      expect(boldSegment).toBeDefined()
      expect(boldSegment!.content).toBe('Mirror')
    })

    it('parses mixed formatting', () => {
      const content = `$p This has **bold**, _italic_, and \`code\` formatting.`
      const result = parseDocText(content)

      expect(result).toHaveLength(1)
      expect(result[0].children).toBeDefined()

      const children = result[0].children!
      const bold = children.find(s => s.token === 'b')
      const italic = children.find(s => s.token === 'i')
      const code = children.find(s => s.token === 'code')

      expect(bold).toBeDefined()
      expect(italic).toBeDefined()
      expect(code).toBeDefined()
    })
  })
})
