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
      // New syntax: No $ at definition, only at usage
      const code = `
user:
  name: "Max"
  age: 25
  active: true
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('user')  // Stored without $
      expect(token.attributes).toHaveLength(3)
      expect(token.attributes![0]).toEqual({ key: 'name', value: 'Max', line: expect.any(Number) })
      expect(token.attributes![1]).toEqual({ key: 'age', value: 25, line: expect.any(Number) })
      expect(token.attributes![2]).toEqual({ key: 'active', value: true, line: expect.any(Number) })
    })

    it('parses array values', () => {
      const code = `
post:
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
post:
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
post:
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
post:
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
post:
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
article:
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
      expect(token.name).toBe('article')  // Stored without $
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
user:
  name: "Max"
  role: "Admin"

settings:
  theme: "dark"
  notifications: true

Frame pad 20
  Text $user.name
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(2)

      expect(ast.tokens[0].name).toBe('user')  // Stored without $
      expect(ast.tokens[1].name).toBe('settings')  // Stored without $

      // Also has an instance (Frame)
      expect(ast.instances).toHaveLength(1)
    })
  })

  describe('Coexistence with regular tokens', () => {
    it('parses data objects alongside regular tokens', () => {
      // New syntax: No $ at definition for both tokens and data objects
      const code = `
primary.bg: #2563eb
card.rad: 8

user:
  name: "Max"
  email: "max@example.com"

Frame bg $primary, rad $card
  Text $user.name
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      // Regular tokens (stored without $)
      const regularTokens = ast.tokens.filter(t => t.value !== undefined)
      expect(regularTokens).toHaveLength(2)

      // Data object (stored without $)
      const dataObjects = ast.tokens.filter(t => t.attributes !== undefined)
      expect(dataObjects).toHaveLength(1)
      expect(dataObjects[0].name).toBe('user')  // Stored without $
    })
  })

  describe('Legacy syntax support', () => {
    it('still accepts $ prefix for backwards compatibility', () => {
      const code = `
$user:
  name: "Max"
  age: 25
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      // Even with $ in source, stored without $
      const token = ast.tokens[0]
      expect(token.name).toBe('user')
    })
  })

  describe('Nested data objects', () => {
    it('parses one level of nesting', () => {
      const code = `
method:
  name: "Agile"
  steps:
    planning:
      title: "Sprint Planning"
      duration: "2h"
    standup:
      title: "Daily Standup"
      duration: "15min"
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('method')
      expect(token.attributes).toHaveLength(2)

      // First attribute is simple
      expect(token.attributes![0].key).toBe('name')
      expect(token.attributes![0].value).toBe('Agile')

      // Second attribute is nested
      const steps = token.attributes![1]
      expect(steps.key).toBe('steps')
      expect(steps.value).toBeUndefined()
      expect(steps.children).toHaveLength(2)

      // First nested child: planning
      const planning = steps.children![0]
      expect(planning.key).toBe('planning')
      expect(planning.children).toHaveLength(2)
      expect(planning.children![0].key).toBe('title')
      expect(planning.children![0].value).toBe('Sprint Planning')
      expect(planning.children![1].key).toBe('duration')
      expect(planning.children![1].value).toBe('2h')

      // Second nested child: standup
      const standup = steps.children![1]
      expect(standup.key).toBe('standup')
      expect(standup.children).toHaveLength(2)
      expect(standup.children![0].key).toBe('title')
      expect(standup.children![0].value).toBe('Daily Standup')
    })

    it('parses deeply nested objects (3 levels)', () => {
      const code = `
config:
  database:
    primary:
      host: "localhost"
      port: 5432
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.name).toBe('config')

      const db = token.attributes![0]
      expect(db.key).toBe('database')
      expect(db.children).toHaveLength(1)

      const primary = db.children![0]
      expect(primary.key).toBe('primary')
      expect(primary.children).toHaveLength(2)

      expect(primary.children![0].key).toBe('host')
      expect(primary.children![0].value).toBe('localhost')
      expect(primary.children![1].key).toBe('port')
      expect(primary.children![1].value).toBe(5432)
    })

    it('mixes nested and simple attributes', () => {
      const code = `
project:
  name: "Website"
  version: 2
  settings:
    debug: true
    theme: "dark"
  active: true
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(4)

      expect(token.attributes![0].key).toBe('name')
      expect(token.attributes![0].value).toBe('Website')

      expect(token.attributes![1].key).toBe('version')
      expect(token.attributes![1].value).toBe(2)

      expect(token.attributes![2].key).toBe('settings')
      expect(token.attributes![2].children).toHaveLength(2)

      expect(token.attributes![3].key).toBe('active')
      expect(token.attributes![3].value).toBe(true)
    })
  })

  describe('Relations (References)', () => {
    it('parses single reference', () => {
      const code = `
task:
  title: "Aufgabe"
  assignee: $users.toni
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(2)
      expect(token.attributes![0].key).toBe('title')
      expect(token.attributes![0].value).toBe('Aufgabe')

      // Reference
      expect(token.attributes![1].key).toBe('assignee')
      const ref = token.attributes![1].value as { kind: string; collection: string; entry: string }
      expect(ref.kind).toBe('reference')
      expect(ref.collection).toBe('users')
      expect(ref.entry).toBe('toni')
    })

    it('parses multiple references (reference array)', () => {
      const code = `
project:
  name: "Website"
  members: $users.toni, $users.anna
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(2)

      // Reference array
      expect(token.attributes![1].key).toBe('members')
      const refArray = token.attributes![1].value as { kind: string; references: Array<{ kind: string; collection: string; entry: string }> }
      expect(refArray.kind).toBe('referenceArray')
      expect(refArray.references).toHaveLength(2)
      expect(refArray.references[0].collection).toBe('users')
      expect(refArray.references[0].entry).toBe('toni')
      expect(refArray.references[1].collection).toBe('users')
      expect(refArray.references[1].entry).toBe('anna')
    })

    it('parses references from different collections', () => {
      const code = `
task:
  title: "Aufgabe"
  project: $projects.website
  assignee: $users.toni
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(3)

      const projectRef = token.attributes![1].value as { kind: string; collection: string; entry: string }
      expect(projectRef.kind).toBe('reference')
      expect(projectRef.collection).toBe('projects')
      expect(projectRef.entry).toBe('website')

      const assigneeRef = token.attributes![2].value as { kind: string; collection: string; entry: string }
      expect(assigneeRef.kind).toBe('reference')
      expect(assigneeRef.collection).toBe('users')
      expect(assigneeRef.entry).toBe('toni')
    })

    it('mixes references with regular values', () => {
      const code = `
task:
  title: "Aufgabe"
  priority: 1
  done: false
  assignee: $users.toni
  tags: [urgent, frontend]
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      const token = ast.tokens[0]
      expect(token.attributes).toHaveLength(5)

      expect(token.attributes![0].value).toBe('Aufgabe')
      expect(token.attributes![1].value).toBe(1)
      expect(token.attributes![2].value).toBe(false)
      expect((token.attributes![3].value as { kind: string }).kind).toBe('reference')
      expect(token.attributes![4].value).toEqual(['urgent', 'frontend'])
    })
  })
})

describe('Parser: Property Sets (Mixins)', () => {
  describe('Basic property sets', () => {
    it('parses simple property set', () => {
      const code = `
standardtext: fs 14, col #888, weight 500
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('standardtext')
      expect(token.properties).toBeDefined()
      expect(token.properties).toHaveLength(3)

      expect(token.properties![0].name).toBe('fs')
      expect(token.properties![0].values).toEqual(['14'])

      expect(token.properties![1].name).toBe('col')
      expect(token.properties![1].values).toEqual(['#888'])

      expect(token.properties![2].name).toBe('weight')
      expect(token.properties![2].values).toEqual(['500'])
    })

    it('parses property set with multiple value types', () => {
      const code = `
cardstyle: bg #1a1a1a, pad 16, rad 8, gap 8
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('cardstyle')
      expect(token.properties).toHaveLength(4)

      expect(token.properties![0].name).toBe('bg')
      expect(token.properties![1].name).toBe('pad')
      expect(token.properties![2].name).toBe('rad')
      expect(token.properties![3].name).toBe('gap')
    })

    it('parses property set with boolean properties', () => {
      const code = `
centeredbox: hor, center, gap 12
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('centeredbox')
      expect(token.properties).toHaveLength(3)

      expect(token.properties![0].name).toBe('hor')
      expect(token.properties![1].name).toBe('center')
      expect(token.properties![2].name).toBe('gap')
    })

    it('parses property set with multi-value properties', () => {
      const code = `
buttonpad: pad 12 24
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      const token = ast.tokens[0]
      expect(token.name).toBe('buttonpad')
      expect(token.properties).toHaveLength(1)

      expect(token.properties![0].name).toBe('pad')
      expect(token.properties![0].values).toEqual(['12', '24'])
    })
  })

  describe('Property sets with tokens', () => {
    it('parses property set referencing tokens', () => {
      const code = `
$primary.bg: #2563eb

danger: bg $primary, col white
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(2)

      // First is the regular token
      expect(ast.tokens[0].name).toBe('primary.bg')
      expect(ast.tokens[0].value).toBe('#2563eb')

      // Second is the property set
      const propSet = ast.tokens[1]
      expect(propSet.name).toBe('danger')
      expect(propSet.properties).toHaveLength(2)

      // Check that $primary is parsed as token reference
      expect(propSet.properties![0].name).toBe('bg')
      expect(propSet.properties![0].values[0]).toEqual({ kind: 'token', name: 'primary' })

      expect(propSet.properties![1].name).toBe('col')
      expect(propSet.properties![1].values).toEqual(['white'])
    })
  })

  describe('Legacy $ prefix support', () => {
    it('still accepts $ prefix for backwards compatibility', () => {
      const code = `
$standardtext: fs 14, col #888
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)
      expect(ast.tokens).toHaveLength(1)

      // Even with $ in source, stored without $
      const token = ast.tokens[0]
      expect(token.name).toBe('standardtext')
      expect(token.properties).toHaveLength(2)
    })
  })

  describe('Coexistence with other token types', () => {
    it('parses property sets alongside regular tokens and data objects', () => {
      const code = `
$primary.bg: #2563eb

standardtext: fs 14, col #888

user:
  name: "Max"
  age: 25

Frame bg $primary
  Text "Hello", $standardtext
`
      const ast = parse(code)
      expect(ast.errors).toHaveLength(0)

      // Regular token
      const regularTokens = ast.tokens.filter(t => t.value !== undefined)
      expect(regularTokens).toHaveLength(1)
      expect(regularTokens[0].name).toBe('primary.bg')

      // Property set
      const propertySets = ast.tokens.filter(t => t.properties !== undefined)
      expect(propertySets).toHaveLength(1)
      expect(propertySets[0].name).toBe('standardtext')

      // Data object
      const dataObjects = ast.tokens.filter(t => t.attributes !== undefined)
      expect(dataObjects).toHaveLength(1)
      expect(dataObjects[0].name).toBe('user')

      // Instances
      expect(ast.instances).toHaveLength(1)
    })
  })
})
