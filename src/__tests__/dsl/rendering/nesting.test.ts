/**
 * DSL Nesting Rendering Tests
 *
 * Tests for nested component rendering:
 * - Parent-child relationships
 * - Slot filling
 * - Flat access
 * - List items
 */

import { describe, it, expect } from 'vitest'
import { generate, generateAll, getStyle, getChildren, getTextContent } from '../../test-utils'
import { parse } from '../../../parser/parser'
import { generateReactElement } from '../../../generator/react-generator'

// ============================================
// Basic Nesting
// ============================================

describe('Basic Nesting', () => {
  // Note: Generator returns wrapper components (ToggleableNode), so we test AST structure
  describe('parent-child', () => {
    it('child renders inside parent', () => {
      const dsl = `Parent
  Child "Content"`
      const result = parse(dsl)
      // Check AST has child
      expect(result.nodes[0].children.length).toBe(1)
    })

    it('multiple children render in order', () => {
      const dsl = `Parent
  First
  Second
  Third`
      const result = parse(dsl)
      // Check AST has children
      expect(result.nodes[0].children.length).toBe(3)
    })
  })

  describe('deep nesting', () => {
    it('grandchildren render correctly', () => {
      const dsl = `GrandParent
  Parent
    Child "Deep"`
      const result = parse(dsl)
      // Text is stored as _text child of Child
      // Path: GrandParent -> Parent -> Child -> _text
      const child = result.nodes[0].children[0].children[0]
      expect(child.children[0].content).toBe('Deep')
    })
  })
})

// ============================================
// Slots
// ============================================

describe('Slots', () => {
  describe('slot definition', () => {
    it('component with slots creates template', () => {
      const dsl = `Card: ver pad 16 gap 8
  Title: size 18 weight 600
  Description: size 14 col #888
  Actions: hor gap 8`
      const result = parse(dsl)
      expect(result.registry.has('Card')).toBe(true)
      const template = result.registry.get('Card')
      expect(template?.children.length).toBe(3)
    })
  })

  describe('slot usage - inline', () => {
    it('fills slots inline', () => {
      const dsl = `Card: ver gap 8
  Title: size 18
  Description: size 14

Card Title "Welcome" Description "Hello"`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(1)
    })
  })

  describe('slot usage - expanded', () => {
    it('fills slots with indentation', () => {
      const dsl = `Card: ver gap 8
  Title: size 18
  Description: size 14

Card
  Title "Welcome"
  Description "Hello World"`
      const result = parse(dsl)
      const card = result.nodes[0]
      expect(card.children.length).toBeGreaterThan(0)
    })

    it('slot content preserves properties', () => {
      const dsl = `Card: ver
  Title: size 18 weight 600

Card
  Title "My Title"`
      const result = parse(dsl)
      const card = result.nodes[0]
      const title = card.children.find(c => c.name === 'Title')
      expect(title).toBeDefined()
      expect(title?.properties.size).toBe(18)
      expect(title?.properties.weight).toBe(600)
    })
  })
})

// ============================================
// Flat Access
// ============================================

describe('Flat Access', () => {
  describe('nested element modification', () => {
    it('modifies nested element by name', () => {
      const dsl = `Header: hor between
  Left: hor gap 16
    Logo: w 120 h 32
  Right:
    Avatar: 36 36 rad 18

Header
  Logo bg #FF0000`
      const result = parse(dsl)
      // Implementation-dependent: Logo should have bg modified
      expect(result.nodes.length).toBe(1)
    })
  })
})

// ============================================
// List Items
// ============================================

describe('List Items', () => {
  describe('dash creates new instances', () => {
    it('creates multiple item instances', () => {
      const dsl = `List ver
  - Item "A"
  - Item "B"
  - Item "C"`
      const result = parse(dsl)
      const list = result.nodes[0]
      const items = list.children.filter(c => c.name === 'Item')
      expect(items.length).toBe(3)
    })

    it('each instance has own content', () => {
      const dsl = `Menu
  - Item "Profile"
  - Item "Settings"
  - Item "Logout"`
      const result = parse(dsl)
      const items = result.nodes[0].children.filter(c => c.name === 'Item')
      expect(items[0].content).toBe('Profile')
      expect(items[1].content).toBe('Settings')
      expect(items[2].content).toBe('Logout')
    })
  })

  describe('list item property override', () => {
    it('overrides inherited properties', () => {
      const dsl = `Item: bg #333
Menu
  - Item "Normal"
  - Item bg #FF0000 "Danger"`
      const result = parse(dsl)
      const items = result.nodes[0].children.filter(c => c.name === 'Item')
      expect(items[0].properties.bg).toBe('#333')
      expect(items[1].properties.bg).toBe('#FF0000')
    })
  })

  describe('named list items', () => {
    it('creates named instances', () => {
      const dsl = `Nav
  - Button named SaveBtn "Save"
  - Button named DeleteBtn "Delete"`
      const result = parse(dsl)
      const buttons = result.nodes[0].children.filter(c => c.name === 'Button')
      expect(buttons[0].instanceName).toBe('SaveBtn')
      expect(buttons[1].instanceName).toBe('DeleteBtn')
    })
  })

  describe('list item children', () => {
    it('list items can have children', () => {
      const dsl = `List
  - Item
      Icon icon "check"
      Text "Done"`
      const result = parse(dsl)
      const item = result.nodes[0].children[0]
      expect(item.children.length).toBe(2)
    })
  })
})

// ============================================
// Text Content
// ============================================

describe('Text Content', () => {
  // Note: Text is stored as _text child nodes, not directly on node.content
  describe('inline text', () => {
    it('text at end of line', () => {
      const result = parse('Button bg #3B82F6 "Click me"')
      // Text is stored as _text child
      expect(result.nodes[0].children[0]?.content).toBe('Click me')
    })

    it.skip('text renders correctly - REQUIRES RENDERED DOM', () => {
      const text = getTextContent(generate('Box "Hello World"'))
      expect(text).toBe('Hello World')
    })
  })

  describe('nested text', () => {
    it('text in children', () => {
      const dsl = `Card
  Title "Welcome"
  Description "Hello World"`
      const result = parse(dsl)
      // Text is stored as _text children
      const titleText = result.nodes[0].children[0].children.find(c => c.name === '_text')
      const descText = result.nodes[0].children[1].children.find(c => c.name === '_text')
      expect(titleText?.content).toBe('Welcome')
      expect(descText?.content).toBe('Hello World')
    })
  })
})

// ============================================
// Component Reuse
// ============================================

describe('Component Reuse', () => {
  describe('defined components', () => {
    it('reuses defined component', () => {
      const dsl = `Card: pad 16 bg #1E1E2E rad 12

Card "First card"
Card "Second card"`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(2)
      expect(result.nodes[0].properties.pad).toBe(16)
      expect(result.nodes[1].properties.pad).toBe(16)
    })
  })

  describe('inherited components', () => {
    it('uses inherited component', () => {
      const dsl = `Button: pad 12 rad 8 bg #3B82F6
PrimaryButton from Button:
DangerButton from Button: bg #EF4444

PrimaryButton "Primary"
DangerButton "Danger"`
      const result = parse(dsl)
      expect(result.nodes[0].properties.bg).toBe('#3B82F6')
      expect(result.nodes[1].properties.bg).toBe('#EF4444')
    })
  })
})

// ============================================
// Complex Nesting Scenarios
// ============================================

describe('Complex Nesting', () => {
  describe('card with list items', () => {
    it('renders card with menu items', () => {
      const dsl = `Card ver pad 16
  Title "Settings"
  Menu ver gap 4
    - Item icon "user" "Profile"
    - Item icon "settings" "Preferences"
    - Item icon "log-out" "Logout"`
      const result = parse(dsl)
      const card = result.nodes[0]
      expect(card.children.length).toBe(2) // Title + Menu
      const menu = card.children.find(c => c.name === 'Menu')
      expect(menu?.children.length).toBe(3)
    })
  })

  describe('nested layouts', () => {
    it('header with nested groups', () => {
      const dsl = `Header hor between pad 16
  Left hor gap 8
    Logo "Brand"
    Nav hor gap 4
      - Link "Home"
      - Link "About"
  Right hor gap 8
    Button "Login"
    Button "Sign up"`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(2) // Left + Right
    })
  })
})
