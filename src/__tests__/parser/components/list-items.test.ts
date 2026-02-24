/**
 * Parser Tests: List Items
 *
 * Tests for list item syntax using the - prefix.
 * Creates new instances of components.
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne } from '../../test-utils'

describe('Basic List Items', () => {
  it('creates list items with - prefix', () => {
    const code = `Menu
  - Item "Profile"
  - Item "Settings"
  - Item "Logout"`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const menu = result.nodes[0]
    expect(menu.children).toHaveLength(3)
    expect(menu.children[0].name).toBe('Item')
    expect(menu.children[1].name).toBe('Item')
    expect(menu.children[2].name).toBe('Item')
  })

  it('list items have text content', () => {
    const code = `List
  - Item "First"
  - Item "Second"`

    const result = parse(code)
    const list = result.nodes[0]

    expect(list.children[0].content || list.children[0].properties.text).toBe('First')
    expect(list.children[1].content || list.children[1].properties.text).toBe('Second')
  })
})

describe('List Items with Properties', () => {
  it('list item with color override', () => {
    const code = `Menu
  - Item "Normal"
  - Item col #EF4444, "Danger"`

    const result = parse(code)
    const menu = result.nodes[0]

    expect(menu.children[0].properties.col).toBeUndefined()
    expect(menu.children[1].properties.col).toBe('#EF4444')
  })

  it('list items with multiple properties', () => {
    const code = `ButtonGroup
  - Button bg #3B82F6, "Primary"
  - Button bg #22C55E, "Success"
  - Button bg #EF4444, "Danger"`

    const result = parse(code)
    const group = result.nodes[0]

    expect(group.children[0].properties.bg).toBe('#3B82F6')
    expect(group.children[1].properties.bg).toBe('#22C55E')
    expect(group.children[2].properties.bg).toBe('#EF4444')
  })
})

describe('Named List Items', () => {
  it('list items can be named', () => {
    const code = `Nav
  - Item named HomeLink "Home"
  - Item named AboutLink "About"`

    const result = parse(code)
    const nav = result.nodes[0]

    expect(nav.children[0].instanceName).toBe('HomeLink')
    expect(nav.children[1].instanceName).toBe('AboutLink')
  })
})

describe('List Items with Events', () => {
  it('list item with onclick', () => {
    const code = `Menu
  - Item onclick page Settings, "Settings"
  - Item onclick page Profile, "Profile"`

    const result = parse(code)
    const menu = result.nodes[0]

    expect(menu.children[0].eventHandlers?.length).toBeGreaterThan(0)
    expect(menu.children[0].eventHandlers?.[0].event).toBe('onclick')
  })
})

describe('Nested List Items', () => {
  it('list items can have children', () => {
    const code = `List
  - Card
      Title "Card 1"
      Text "Description 1"
  - Card
      Title "Card 2"
      Text "Description 2"`

    const result = parse(code)
    const list = result.nodes[0]

    expect(list.children).toHaveLength(2)
    expect(list.children[0].children.length).toBeGreaterThanOrEqual(2)
  })
})

describe('List Items from Definition', () => {
  it('uses defined component as list item', () => {
    const code = `NavItem: hor, pad 8, gap 8
  icon "home"
  label "Menu"

Nav
  - NavItem
      icon "home"
      label "Home"
  - NavItem
      icon "settings"
      label "Settings"`

    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const nav = result.nodes[0]
    expect(nav.children).toHaveLength(2)

    // Should inherit properties from definition
    expect(nav.children[0].properties.hor).toBe(true)
    expect(nav.children[0].properties.pad).toBe(8)
  })
})

describe('List Items with Different Component Types', () => {
  it('mixes different components', () => {
    const code = `Container
  - Text "Header"
  - Button "Action"
  - Input "Placeholder"`

    const result = parse(code)
    const container = result.nodes[0]

    expect(container.children[0].name).toBe('Text')
    expect(container.children[1].name).toBe('Button')
    expect(container.children[2].name).toBe('Input')
  })
})

describe('Edge Cases', () => {
  it('handles empty list', () => {
    const code = 'List'
    const result = parse(code)
    expect(result.nodes[0].children).toHaveLength(0)
  })

  it('handles single list item', () => {
    const code = `List
  - Item "Only one"`
    const result = parse(code)
    expect(result.nodes[0].children).toHaveLength(1)
  })

  it('list item with long text', () => {
    const code = `List
  - Text "This is a very long text"`
    const result = parse(code)
    const text = result.nodes[0].children[0]
    // Text content may be in children[0].content for Text component
    expect(
      text.content ||
        text.properties.text ||
        text.children[0]?.content
    ).toContain('very long text')
  })
})
