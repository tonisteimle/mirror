/**
 * Tests for inline data object parsing
 *
 * Data objects allow defining structured data directly in .mir files
 * using the same indentation-based syntax as the rest of Mirror.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../compiler/parser'

describe('Parser: Data Objects', () => {
  describe('Basic data object', () => {
    it('parses simple attributes', () => {
      const code = `
$user:
  name: "Max"
  age: 25
  active: true
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('$user')
      expect(token.attributes).toHaveLength(3)
      expect(token.attributes![0]).toEqual({ key: 'name', value: 'Max', line: expect.any(Number) })
      expect(token.attributes![1]).toEqual({ key: 'age', value: 25, line: expect.any(Number) })
      expect(token.attributes![2]).toEqual({ key: 'active', value: true, line: expect.any(Number) })
    })

    it('parses array values', () => {
      const code = `
$post:
  title: "Artikel"
  tags: [news, tech, mirror]
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(2)
      expect(token.attributes![1].key).toBe('tags')
      expect(token.attributes![1].value).toEqual(['news', 'tech', 'mirror'])
    })

    it('parses external file reference', () => {
      const code = `
$post:
  title: "Artikel"
  body: @artikel-body
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(2)
      expect(token.attributes![1].key).toBe('body')
      expect(token.attributes![1].value).toBe('@artikel-body')
    })
  })

  describe('Markdown blocks', () => {
    it('parses simple markdown block', () => {
      const code = `
$post:
  title: "Artikel"
  @intro
    Eine **kurze** Einleitung.
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(1)
      expect(token.blocks).toHaveLength(1)
      expect(token.blocks![0].name).toBe('intro')
      expect(token.blocks![0].content).toContain('Eine')
      expect(token.blocks![0].content).toContain('**kurze**')
    })

    it('parses multiple markdown blocks', () => {
      const code = `
$post:
  title: "Artikel"
  @intro
    Kurze Einleitung.
  @body
    # Hauptteil
    Mehr Text hier.
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.blocks).toHaveLength(2)
      expect(token.blocks![0].name).toBe('intro')
      expect(token.blocks![1].name).toBe('body')
      expect(token.blocks![1].content).toContain('# Hauptteil')
    })

    it('handles multiline markdown content', () => {
      const code = `
$post:
  @content
    # Überschrift

    Ein Paragraph mit **bold** text.

    - Liste 1
    - Liste 2
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.blocks).toHaveLength(1)
      const content = token.blocks![0].content
      expect(content).toContain('# Überschrift')
      expect(content).toContain('**bold**')
      expect(content).toContain('- Liste 1')
    })
  })

  describe('Mixed attributes and blocks', () => {
    it('parses attributes followed by blocks', () => {
      const code = `
$article:
  title: "Mein Artikel"
  author: "Max"
  date: "2024-01-15"
  @excerpt
    Eine kurze Zusammenfassung.
  @content
    # Der vollständige Artikel
    Hier steht der Inhalt.
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.name).toBe('$article')
      expect(token.attributes).toHaveLength(3)
      expect(token.blocks).toHaveLength(2)

      expect(token.attributes![0].key).toBe('title')
      expect(token.attributes![1].key).toBe('author')
      expect(token.attributes![2].key).toBe('date')

      expect(token.blocks![0].name).toBe('excerpt')
      expect(token.blocks![1].name).toBe('content')
    })
  })

  describe('Multiple data objects', () => {
    it('parses multiple data objects in same file', () => {
      const code = `
$user:
  name: "Max"
  role: "Admin"

$settings:
  theme: "dark"
  notifications: true

Frame pad 20
  Text $user.name
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(2)

      expect(ast.tokens[0].name).toBe('$user')
      expect(ast.tokens[1].name).toBe('$settings')

      // Also has an instance (Frame)
      expect(ast.instances).toHaveLength(1)
    })
  })

  describe('Coexistence with regular tokens', () => {
    it('parses data objects alongside regular tokens', () => {
      const code = `
$primary.bg: #2563eb
$card.rad: 8

$user:
  name: "Max"
  email: "max@example.com"

Frame bg $primary, rad $card
  Text $user.name
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      // Regular tokens
      const regularTokens = ast.tokens.filter(t => t.value !== undefined)
      expect(regularTokens).toHaveLength(2)

      // Data object
      const dataObjects = ast.tokens.filter(t => t.attributes !== undefined)
      expect(dataObjects).toHaveLength(1)
      expect(dataObjects[0].name).toBe('$user')
    })
  })
})
