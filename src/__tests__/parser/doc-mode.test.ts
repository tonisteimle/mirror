/**
 * Doc Mode Integration Tests
 *
 * Tests for the complete doc-mode functionality:
 * - text block with multiline strings
 * - playground block with code and preview
 * - Token formatting within text
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('doc-mode', () => {
  describe('text block', () => {
    it('parses text with multiline string (indented)', () => {
      const code = `text
  '$h2 Hello World'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const textNode = result.nodes[0]
      expect(textNode.name).toBe('text')
      expect(textNode._isLibrary).toBe(true)
      expect(textNode._libraryType).toBe('text')
      expect(textNode.properties._docContent).toBe('$h2 Hello World')
    })

    it('parses text with multiline string (not indented)', () => {
      const code = `text

'$h2 Hello World'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const textNode = result.nodes[0]
      expect(textNode.name).toBe('text')
      expect(textNode.properties._docContent).toBe('$h2 Hello World')
    })

    it('parses text with complex multiline content', () => {
      const code = `text
  '$h2 What is Mirror

   $p Mirror is a description language for $b[user interfaces].

   $p Building UI today means juggling three languages.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const textNode = result.nodes[0]
      expect(textNode.properties._docContent).toContain('$h2 What is Mirror')
      expect(textNode.properties._docContent).toContain('$b[user interfaces]')
      expect(textNode.properties._docContent).toContain('$p Building UI')
    })
  })

  describe('playground block', () => {
    it('parses playground with multiline string', () => {
      const code = `playground
  'Button bg #2271c1 pad 12 24 rad 8 "Click me"'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const playgroundNode = result.nodes[0]
      expect(playgroundNode.name).toBe('playground')
      expect(playgroundNode._isLibrary).toBe(true)
      expect(playgroundNode._libraryType).toBe('playground')
      expect(playgroundNode.properties._docContent).toBe('Button bg #2271c1 pad 12 24 rad 8 "Click me"')
    })

    it('parses playground with multi-component code', () => {
      const code = `playground
  'Row gap 12
   Button #2271c1 pad 12 24 rad 8 "Primary"
   Button #333 pad 12 24 rad 8 "Secondary"'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const playgroundNode = result.nodes[0]
      expect(playgroundNode.properties._docContent).toContain('Row gap 12')
      expect(playgroundNode.properties._docContent).toContain('Primary')
      expect(playgroundNode.properties._docContent).toContain('Secondary')
    })
  })

  describe('multiple doc blocks', () => {
    it('parses multiple text and playground blocks', () => {
      const code = `text
  '$h2 Getting Started'

playground
  'Button "Click me"'

text
  '$p More content here.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(3)

      expect(result.nodes[0].name).toBe('text')
      expect(result.nodes[0].properties._docContent).toContain('Getting Started')

      expect(result.nodes[1].name).toBe('playground')
      expect(result.nodes[1].properties._docContent).toContain('Button')

      expect(result.nodes[2].name).toBe('text')
      expect(result.nodes[2].properties._docContent).toContain('More content')
    })
  })

  describe('mixed regular and doc blocks', () => {
    it('parses mix of regular components and doc blocks', () => {
      const code = `Header hor between pad 16 bg #1a1a1a
  Logo "Mirror"

text
  '$h2 Documentation'

Button bg #2271c1 "Click me"`

      const result = parse(code)
      // Filter warnings - the test focuses on doc-mode parsing, not other component warnings
      const realErrors = result.errors.filter(e => !e.includes('Warning'))
      expect(realErrors).toHaveLength(0)
      expect(result.nodes).toHaveLength(3)

      expect(result.nodes[0].name).toBe('Header')
      expect(result.nodes[1].name).toBe('text')
      expect(result.nodes[2].name).toBe('Button')
    })
  })

  describe('flat structure (no indentation)', () => {
    it('parses doc mode with flat structure', () => {
      const code = `text
'$h2 Title'

playground
'Button "Click"'

text
'$p Another paragraph.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(3)

      expect(result.nodes[0].name).toBe('text')
      expect(result.nodes[0].properties._docContent).toBe('$h2 Title')

      expect(result.nodes[1].name).toBe('playground')
      expect(result.nodes[1].properties._docContent).toBe('Button "Click"')

      expect(result.nodes[2].name).toBe('text')
      expect(result.nodes[2].properties._docContent).toBe('$p Another paragraph.')
    })
  })
})
