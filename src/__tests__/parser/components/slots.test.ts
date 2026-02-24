/**
 * Parser Tests: Slots
 *
 * Tests for slot definitions and flat access pattern.
 * - Slot: creates placeholder
 * - Flat access finds nested slots
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne, findNode } from '../../test-utils'

describe('Basic Slot Definition', () => {
  it('defines slots with colon syntax', () => {
    const code = `Card:
  Title:
  Description:`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const template = result.registry.get('Card')
    expect(template).toBeDefined()
    expect(template?.children).toHaveLength(2)
    expect(template?.children[0].name).toBe('Title')
    expect(template?.children[1].name).toBe('Description')
  })

  it('fills slots when using component', () => {
    const code = `Card:
  Title:
  Description:

Card
  Title "Welcome"
  Description "Get started with our platform"`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)

    const card = result.nodes[0]
    const title = card.children.find((c) => c.name === 'Title')
    const desc = card.children.find((c) => c.name === 'Description')

    expect(title?.content || title?.properties.text).toBe('Welcome')
    expect(desc?.content || desc?.properties.text).toBe('Get started with our platform')
  })
})

describe('Slots with Properties', () => {
  it('slots can have default properties', () => {
    const code = `Card:
  Title: text-size 24, weight bold
  Subtitle: text-size 14, col #999

Card
  Title "Main Title"
  Subtitle "Secondary text"`

    const result = parse(code)
    const card = result.nodes[0]

    const title = card.children.find((c) => c.name === 'Title')
    expect(title?.properties['text-size']).toBe(24)
    expect(title?.properties.weight).toBe(700)
  })

  it('slot properties can be overridden', () => {
    const code = `Card:
  Title: text-size 24

Card
  Title text-size 32, "Big Title"`

    const result = parse(code)
    const card = result.nodes[0]

    const title = card.children.find((c) => c.name === 'Title')
    expect(title?.properties['text-size']).toBe(32)
  })
})

describe('Nested Slots', () => {
  it('supports nested slot structure', () => {
    const code = `Header:
  Left:
    Logo:
  Right:
    Actions:`

    const result = parse(code)
    const template = result.registry.get('Header')

    expect(template?.children).toHaveLength(2)
    expect(template?.children[0].name).toBe('Left')
    expect(template?.children[1].name).toBe('Right')

    // Nested slots
    const left = template?.children[0]
    expect(left?.children[0].name).toBe('Logo')
  })
})

describe('Flat Access Pattern', () => {
  it('finds nested slot directly', () => {
    const code = `Header:
  Left:
    Logo: w 100

Header
  Logo bg #F00`

    const result = parse(code)
    const header = result.nodes[0]

    // Should find Logo even though it's nested in Left
    const left = header.children.find((c) => c.name === 'Left')
    const logo = left?.children.find((c) => c.name === 'Logo')

    expect(logo).toBeDefined()
    expect(logo?.properties.bg).toBe('#F00')
    expect(logo?.properties.w).toBe(100) // inherited from slot
  })

  it('flat access with multiple nested levels', () => {
    const code = `Layout:
  Container:
    Main:
      Content:

Layout
  Content pad 24, "Main content"`

    const result = parse(code)
    const layout = result.nodes[0]

    // Find Content through the nesting
    const container = layout.children.find((c) => c.name === 'Container')
    const main = container?.children.find((c) => c.name === 'Main')
    const content = main?.children.find((c) => c.name === 'Content')

    expect(content).toBeDefined()
    expect(content?.properties.pad).toBe(24)
  })
})

describe('Slot with Different Content Types', () => {
  it('slot filled with text', () => {
    const code = `Alert:
  Message:

Alert
  Message "Operation successful!"`

    const result = parse(code)
    const alert = result.nodes[0]
    const message = alert.children.find((c) => c.name === 'Message')

    expect(message?.content || message?.properties.text).toBe('Operation successful!')
  })

})

describe('Optional Slots', () => {
  it('unfilled slots remain empty', () => {
    const code = `Card:
  Header:
  Body:
  Footer:

Card
  Body
    Text "Only body content"`

    const result = parse(code)
    const card = result.nodes[0]

    // Body should have content
    const body = card.children.find((c) => c.name === 'Body')
    expect(body?.children).toHaveLength(1)

    // Header and Footer should exist but be empty
    const header = card.children.find((c) => c.name === 'Header')
    const footer = card.children.find((c) => c.name === 'Footer')
    expect(header?.children.length || 0).toBe(0)
    expect(footer?.children.length || 0).toBe(0)
  })
})

describe('Slot Edge Cases', () => {
  it('slot with same name as primitive', () => {
    const code = `Custom:
  Button:
  Input:

Custom
  Button "Click"
  Input "placeholder"`

    const result = parse(code)
    const custom = result.nodes[0]

    const button = custom.children.find((c) => c.name === 'Button')
    const input = custom.children.find((c) => c.name === 'Input')

    expect(button).toBeDefined()
    expect(input).toBeDefined()
  })
})
