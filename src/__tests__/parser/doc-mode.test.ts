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

   $p Mirror is a description language for **user interfaces**.

   $p Building UI today means juggling three languages.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const textNode = result.nodes[0]
      expect(textNode.properties._docContent).toContain('$h2 What is Mirror')
      expect(textNode.properties._docContent).toContain('**user interfaces**')
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

  describe('breakout multiline strings', () => {
    it('parses deeply nested text with unindented multiline string', () => {
      const code = `doc
  Section
    Article
      text
'$h1 Heading

$p This paragraph uses the full editor width
because the multiline string is not indented.'`

      const result = parse(code)
      // Filter out slot warnings - we're testing doc-mode parsing, not component validation
      const parseErrors = result.errors.filter(e => !e.includes('Warning'))
      expect(parseErrors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      // Navigate to the text node
      // Component names are preserved as written
      const docNode = result.nodes[0]
      expect(docNode.name).toBe('doc')

      const sectionNode = docNode.children[0]
      expect(sectionNode.name).toBe('Section')

      const articleNode = sectionNode.children[0]
      expect(articleNode.name).toBe('Article')

      const textNode = articleNode.children[0]
      expect(textNode.name).toBe('text')
      expect(textNode._isLibrary).toBe(true)
      expect(textNode.properties._docContent).toContain('$h1 Heading')
      expect(textNode.properties._docContent).toContain('full editor width')
    })

    it('parses text with breakout string after blank line', () => {
      const code = `Container
  text

'$p Content that breaks out of indentation.'`

      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const containerNode = result.nodes[0]
      expect(containerNode.name).toBe('Container')

      const textNode = containerNode.children[0]
      expect(textNode.name).toBe('text')
      expect(textNode.properties._docContent).toContain('breaks out')
    })

    it('parses playground with breakout string', () => {
      const code = `doc
  playground
'Button background #3B82F6 padding 12 24 radius 8 "Click me"

Card vertical gap 16
  Title "Hello"
  Body "World"'`

      const result = parse(code)
      const parseErrors = result.errors.filter(e => !e.includes('Warning'))
      expect(parseErrors).toHaveLength(0)

      const docNode = result.nodes[0]
      const playgroundNode = docNode.children[0]
      expect(playgroundNode.name).toBe('playground')
      expect(playgroundNode.properties._docContent).toContain('Button background')
      expect(playgroundNode.properties._docContent).toContain('Card vertical')
    })

    it('handles multiple text blocks with breakout strings', () => {
      const code = `doc
  text
'$h1 First Section'

  text
'$h1 Second Section'`

      const result = parse(code)
      const parseErrors = result.errors.filter(e => !e.includes('Warning'))
      expect(parseErrors).toHaveLength(0)

      const docNode = result.nodes[0]
      expect(docNode.children).toHaveLength(2)

      expect(docNode.children[0].name).toBe('text')
      expect(docNode.children[0].properties._docContent).toContain('First Section')

      expect(docNode.children[1].name).toBe('text')
      expect(docNode.children[1].properties._docContent).toContain('Second Section')
    })

    it('does not break other component parsing', () => {
      const code = `doc
  Header horizontal between
    Logo "Mirror"
    Nav
      Button "Home"
  text
'$p Introduction paragraph.'
  Footer
    Link "About"`

      const result = parse(code)
      const parseErrors = result.errors.filter(e => !e.includes('Warning'))
      expect(parseErrors).toHaveLength(0)

      const docNode = result.nodes[0]
      expect(docNode.children.length).toBeGreaterThanOrEqual(3)

      const headerNode = docNode.children.find(c => c.name === 'Header')
      expect(headerNode).toBeDefined()

      const textNode = docNode.children.find(c => c.name === 'text')
      expect(textNode).toBeDefined()
      expect(textNode!.properties._docContent).toContain('Introduction')

      const footerNode = docNode.children.find(c => c.name === 'Footer')
      expect(footerNode).toBeDefined()
    })
  })
})
