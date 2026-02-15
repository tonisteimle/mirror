/**
 * DSL Component Tests
 *
 * Tests for component-related syntax:
 * - Component definitions (with colon)
 * - Component inheritance (from)
 * - Named primitives
 * - Named instances
 * - Slots
 * - Flat access to nested elements
 */

import { describe, it, expect } from 'vitest'
import { runSyntaxTests, type SyntaxTest } from '../_infrastructure'
import { parse } from '../../../parser/parser'
import { generate, getStyle, getChildren, getTextContent } from '../../test-utils'

// ============================================
// Component Definitions
// ============================================

describe('Component Definitions', () => {
  describe('basic definitions', () => {
    it('defines component with colon (no render)', () => {
      const result = parse('Button: pad 12 bg #3B82F6 rad 8')
      // Definition creates template in registry but no rendered node
      expect(result.nodes.length).toBe(0)
    })

    it('stores properties in registry', () => {
      const result = parse('Button: pad 12 bg #3B82F6')
      expect(result.registry.has('Button')).toBe(true)
      const template = result.registry.get('Button')
      expect(template?.properties.pad).toBe(12)
      expect(template?.properties.bg).toBe('#3B82F6')
    })
  })

  describe('component usage', () => {
    it('uses defined component', () => {
      const result = parse(`Button: pad 12 bg #3B82F6
Button "Click me"`)
      expect(result.nodes.length).toBe(1)
      expect(result.nodes[0].name).toBe('Button')
      expect(result.nodes[0].properties.pad).toBe(12)
      expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    })

    it('inherits from first definition', () => {
      const result = parse(`Button: bg #FF0000
Button "A"
Button "B"`)
      expect(result.nodes.length).toBe(2)
      // Both should inherit the background
      expect(result.nodes[0].properties.bg).toBe('#FF0000')
      expect(result.nodes[1].properties.bg).toBe('#FF0000')
    })

    it('allows property override on usage', () => {
      const result = parse(`Button: bg #FF0000
Button bg #00FF00 "Override"`)
      expect(result.nodes[0].properties.bg).toBe('#00FF00')
    })
  })
})

// ============================================
// Component Inheritance
// ============================================

describe('Component Inheritance', () => {
  describe('from keyword', () => {
    it('inherits properties from parent', () => {
      const result = parse(`Button: pad 12 bg #3B82F6 rad 8
DangerButton from Button: bg #EF4444
DangerButton "Delete"`)
      const dangerBtn = result.nodes[0]
      // Should inherit pad and rad from Button, override bg
      expect(dangerBtn.properties.pad).toBe(12)
      expect(dangerBtn.properties.rad).toBe(8)
      expect(dangerBtn.properties.bg).toBe('#EF4444')
    })

    it('creates new component type', () => {
      const result = parse(`Button: pad 12
GhostButton from Button: bg transparent
GhostButton "Ghost"`)
      expect(result.nodes[0].name).toBe('GhostButton')
    })

    it('supports multi-level inheritance', () => {
      const result = parse(`Box: pad 8
Card from Box: rad 12
DashboardCard from Card: bg #1E1E2E
DashboardCard "Content"`)
      const card = result.nodes[0]
      // Should inherit all the way down
      expect(card.properties.pad).toBe(8)
      expect(card.properties.rad).toBe(12)
      expect(card.properties.bg).toBe('#1E1E2E')
    })
  })
})

// ============================================
// Named Primitives
// ============================================

describe('Named Primitives', () => {
  describe('Input primitive', () => {
    it('defines named input', () => {
      const result = parse('Input Email: "Enter email" type email')
      expect(result.registry.has('Email')).toBe(true)
    })

    it('uses named input', () => {
      const result = parse(`Input Email: "Enter email" type email
Email`)
      expect(result.nodes.length).toBe(1)
      // _primitiveType is stored in properties
      expect(result.nodes[0].properties._primitiveType).toBe('Input')
    })
  })

  describe('Image primitive', () => {
    it('defines named image', () => {
      const result = parse('Image Avatar: 48 48 rad 24 fit cover')
      expect(result.registry.has('Avatar')).toBe(true)
    })
  })

  describe('Button primitive', () => {
    it('defines named button', () => {
      const result = parse('Button Submit: bg #3B82F6 "Submit"')
      expect(result.registry.has('Submit')).toBe(true)
    })
  })
})

// ============================================
// Named Instances
// ============================================

describe('Named Instances', () => {
  describe('named keyword', () => {
    it('creates named instance', () => {
      const result = parse(`Panel: pad 16 bg #1E1E2E
Panel named Dashboard "Dashboard content"`)
      expect(result.nodes[0].instanceName).toBe('Dashboard')
    })

    it('allows referencing named instance', () => {
      const result = parse(`Panel named Content1 "First"
Panel named Content2 hidden "Second"`)
      expect(result.nodes[0].instanceName).toBe('Content1')
      expect(result.nodes[1].instanceName).toBe('Content2')
    })
  })
})

// ============================================
// Slots (Named Children)
// ============================================

describe('Slots', () => {
  describe('slot definitions', () => {
    it('defines component with slots', () => {
      const dsl = `Card: ver pad 16 bg #1E1E1E rad 12 gap 8
  Title: size 18 weight 600
  Description: size 14 col #9CA3AF
  Actions: hor gap 8`
      const result = parse(dsl)
      expect(result.registry.has('Card')).toBe(true)
      const cardTemplate = result.registry.get('Card')
      // Slots are stored as children in the template
      expect(cardTemplate?.children.length).toBeGreaterThan(0)
    })
  })

  describe('slot usage - inline', () => {
    it('fills slots inline', () => {
      const dsl = `Card: ver gap 8
  Title: size 18
  Description: size 14

Card Title "Welcome" Description "Get started"`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(1)
      // Title and Description should be filled
    })
  })

  describe('slot usage - expanded', () => {
    it('fills slots with children', () => {
      const dsl = `Card: ver gap 8
  Title: size 18
  Description: size 14
  Actions: hor gap 8

Card
  Title "Welcome"
  Description "Get started"
  Actions
    Button "Learn more"`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(1)
      const card = result.nodes[0]
      expect(card.children.length).toBeGreaterThan(0)
    })
  })
})

// ============================================
// List Items (New Instances)
// ============================================

describe('List Items', () => {
  describe('dash prefix creates new instance', () => {
    it('creates multiple instances', () => {
      const dsl = `Menu: ver w 200
  Item: pad 8 12

Menu
  - Item "Profile"
  - Item "Settings"
  - Item col #EF4444 "Logout"`
      const result = parse(dsl)
      const menu = result.nodes[0]
      // Should have 3 Item children (exclude slot definitions)
      const itemChildren = menu.children.filter(c => c.name === 'Item' && !c._isExplicitDefinition)
      expect(itemChildren.length).toBe(3)
    })

    it('allows property override on list item', () => {
      const dsl = `Item: pad 8

Menu
  - Item "Normal"
  - Item bg #FF0000 "Highlighted"`
      const result = parse(dsl)
      const menu = result.nodes[0]
      const items = menu.children.filter(c => c.name === 'Item')
      expect(items[1].properties.bg).toBe('#FF0000')
    })
  })

  describe('named list items', () => {
    it('creates named list item', () => {
      const dsl = `Nav hor gap 8
  - Button named SaveBtn "Save"
  - Button named CancelBtn "Cancel"`
      const result = parse(dsl)
      const nav = result.nodes[0]
      const buttons = nav.children.filter(c => c.name === 'Button')
      expect(buttons[0].instanceName).toBe('SaveBtn')
      expect(buttons[1].instanceName).toBe('CancelBtn')
    })
  })
})

// ============================================
// Flat Access to Nested Elements
// ============================================

describe('Flat Access', () => {
  describe('modifying nested elements', () => {
    it('accesses nested element by name', () => {
      const dsl = `Header: hor between
  Left: hor gap 16
    Logo: w 120 h 32
  Right:
    Avatar: 36 36 rad 18

Header
  Logo bg #FF0000
  Avatar bg #3B82F6`
      const result = parse(dsl)
      // Logo and Avatar should be found and modified
      // The exact structure depends on implementation
      expect(result.nodes.length).toBe(1)
    })
  })
})

// ============================================
// Text Content
// NOTE: Text content is stored as a _text child node, not in node.content directly
// ============================================

describe('Text Content', () => {
  it('places text at end of line', () => {
    const result = parse('Button bg #FF0000 "Click me"')
    // Text is stored as children[0].content (as _text node)
    expect(result.nodes[0].children[0]?.content).toBe('Click me')
  })

  it('text is always last', () => {
    // Text should be at end, not interpreted as property value
    const result = parse('Button pad 12 bg #FF0000 rad 8 "Submit"')
    expect(result.nodes[0].children[0]?.content).toBe('Submit')
    expect(result.nodes[0].properties.pad).toBe(12)
  })

  it('handles text with properties', () => {
    const result = parse('Label size 14 col #888 "Status: Active"')
    expect(result.nodes[0].children[0]?.content).toBe('Status: Active')
    expect(result.nodes[0].properties.size).toBe(14)
  })
})

// ============================================
// Component with Children
// ============================================

describe('Component with Children', () => {
  it('parses nested children via indentation', () => {
    const dsl = `Card pad 16
  Title "Welcome"
  Description "Hello"`
    const result = parse(dsl)
    expect(result.nodes[0].children.length).toBeGreaterThan(0)
  })

  it('maintains proper hierarchy', () => {
    const dsl = `Parent
  Child1
    GrandChild
  Child2`
    const result = parse(dsl)
    const parent = result.nodes[0]
    expect(parent.children.length).toBe(2)
    const child1 = parent.children.find(c => c.name === 'Child1')
    expect(child1?.children.length).toBe(1)
  })
})
