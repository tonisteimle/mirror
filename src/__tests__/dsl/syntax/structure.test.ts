/**
 * DSL Structure Tests
 *
 * Tests for structural DSL features:
 * - Indentation (2-space hierarchy)
 * - Comments
 * - Newlines and whitespace
 * - List items with dash prefix
 */

import { describe, it, expect } from 'vitest'
import { runSyntaxTests, type SyntaxTest } from '../_infrastructure'
import { parse } from '../../../parser/parser'
import { generate, getStyle, getChildren } from '../../test-utils'

// ============================================
// Indentation (Hierarchy)
// ============================================

describe('Indentation', () => {
  describe('2-space indentation', () => {
    it('creates parent-child relationship', () => {
      const dsl = `Parent
  Child`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(1)
      expect(result.nodes[0].name).toBe('Parent')
      expect(result.nodes[0].children.length).toBe(1)
      expect(result.nodes[0].children[0].name).toBe('Child')
    })

    it('handles multiple children', () => {
      const dsl = `Parent
  Child1
  Child2
  Child3`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(3)
    })

    it('handles nested hierarchy', () => {
      const dsl = `GrandParent
  Parent
    Child`
      const result = parse(dsl)
      expect(result.nodes[0].name).toBe('GrandParent')
      expect(result.nodes[0].children[0].name).toBe('Parent')
      expect(result.nodes[0].children[0].children[0].name).toBe('Child')
    })

    it('handles deep nesting', () => {
      const dsl = `Level1
  Level2
    Level3
      Level4`
      const result = parse(dsl)
      expect(result.nodes[0].children[0].children[0].children[0].name).toBe('Level4')
    })
  })

  describe('sibling elements', () => {
    it('same indentation = siblings', () => {
      const dsl = `Parent
  Child1
  Child2`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(2)
      expect(result.nodes[0].children[0].name).toBe('Child1')
      expect(result.nodes[0].children[1].name).toBe('Child2')
    })

    it('back to parent level', () => {
      const dsl = `Parent1
  Child
Parent2`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(2)
      expect(result.nodes[0].name).toBe('Parent1')
      expect(result.nodes[1].name).toBe('Parent2')
    })
  })

  describe('complex hierarchy', () => {
    it('handles mixed depths', () => {
      const dsl = `Root
  Branch1
    Leaf1
    Leaf2
  Branch2
    Leaf3`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(2)
      expect(result.nodes[0].children[0].children.length).toBe(2)
      expect(result.nodes[0].children[1].children.length).toBe(1)
    })
  })
})

// ============================================
// Comments
// ============================================

describe('Comments', () => {
  describe('line comments', () => {
    it('ignores full-line comments', () => {
      const dsl = `// This is a comment
Box pad 16`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(1)
      expect(result.nodes[0].name).toBe('Box')
    })

    it('ignores inline comments', () => {
      const dsl = `Box pad 16 // Padding`
      const result = parse(dsl)
      expect(result.nodes[0].properties.pad).toBe(16)
    })

    it('handles multiple comment lines', () => {
      const dsl = `// Comment 1
// Comment 2
Box pad 16
// Comment 3`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(1)
    })

    it('comment does not break hierarchy', () => {
      const dsl = `Parent
  // Comment about child
  Child`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(1)
      expect(result.nodes[0].children[0].name).toBe('Child')
    })
  })
})

// ============================================
// Whitespace
// ============================================

describe('Whitespace', () => {
  describe('blank lines', () => {
    it('ignores blank lines', () => {
      const dsl = `Box1

Box2`
      const result = parse(dsl)
      expect(result.nodes.length).toBe(2)
    })

    it('blank lines do not break hierarchy', () => {
      const dsl = `Parent

  Child1

  Child2`
      const result = parse(dsl)
      expect(result.nodes[0].children.length).toBe(2)
    })
  })

  describe('trailing whitespace', () => {
    it('handles trailing spaces', () => {
      const dsl = `Box pad 16   `
      const result = parse(dsl)
      expect(result.nodes[0].properties.pad).toBe(16)
    })
  })
})

// ============================================
// List Items (Dash Prefix)
// ============================================

describe('List Items', () => {
  describe('basic list items', () => {
    it('dash creates new instance', () => {
      const dsl = `Container
  - Item "First"
  - Item "Second"`
      const result = parse(dsl)
      const container = result.nodes[0]
      const items = container.children.filter(c => c.name === 'Item')
      expect(items.length).toBe(2)
    })

    it('each dash item is independent', () => {
      const dsl = `Item: bg #FF0000
Container
  - Item "First"
  - Item bg #00FF00 "Second"`
      const result = parse(dsl)
      const items = result.nodes[0].children.filter(c => c.name === 'Item')
      expect(items[0].properties.bg).toBe('#FF0000')
      expect(items[1].properties.bg).toBe('#00FF00')
    })
  })

  describe('named list items', () => {
    it('dash with named instance', () => {
      const dsl = `Nav
  - Button named Btn1 "First"
  - Button named Btn2 "Second"`
      const result = parse(dsl)
      const buttons = result.nodes[0].children.filter(c => c.name === 'Button')
      expect(buttons[0].instanceName).toBe('Btn1')
      expect(buttons[1].instanceName).toBe('Btn2')
    })
  })

  describe('nested list items', () => {
    it('list items can have children', () => {
      const dsl = `List
  - Item
      Icon "check"
      Text "Done"`
      const result = parse(dsl)
      const item = result.nodes[0].children[0]
      expect(item.children.length).toBe(2)
    })
  })
})

// ============================================
// Multiple Root Elements
// ============================================

describe('Multiple Root Elements', () => {
  it('parses multiple root elements', () => {
    const dsl = `Header pad 16
Main pad 32
Footer pad 16`
    const result = parse(dsl)
    expect(result.nodes.length).toBe(3)
    expect(result.nodes[0].name).toBe('Header')
    expect(result.nodes[1].name).toBe('Main')
    expect(result.nodes[2].name).toBe('Footer')
  })

  it('each root can have children', () => {
    const dsl = `Header
  Logo
Main
  Content
Footer
  Links`
    const result = parse(dsl)
    expect(result.nodes.length).toBe(3)
    expect(result.nodes[0].children[0].name).toBe('Logo')
    expect(result.nodes[1].children[0].name).toBe('Content')
    expect(result.nodes[2].children[0].name).toBe('Links')
  })
})

// ============================================
// Line Continuation
// ============================================

describe('Line Handling', () => {
  it('properties and text on same line', () => {
    const dsl = `Button pad 12 bg #3B82F6 "Click me"`
    const result = parse(dsl)
    expect(result.nodes[0].properties.pad).toBe(12)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
    // Text is stored as a _text child node, not directly on content
    expect(result.nodes[0].children[0]?.content).toBe('Click me')
  })

  it('handles many properties on line', () => {
    const dsl = `Box w 200 h 100 pad 16 bg #1E1E2E rad 8 gap 8 hor`
    const result = parse(dsl)
    expect(result.nodes[0].properties.w).toBe(200)
    expect(result.nodes[0].properties.h).toBe(100)
    expect(result.nodes[0].properties.pad).toBe(16)
    expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
    expect(result.nodes[0].properties.rad).toBe(8)
    expect(result.nodes[0].properties.gap).toBe(8)
    expect(result.nodes[0].properties.hor).toBe(true)
  })
})

// ============================================
// Empty / Minimal DSL
// ============================================

describe('Minimal DSL', () => {
  it('parses single component', () => {
    const result = parse('Box')
    expect(result.nodes.length).toBe(1)
    expect(result.nodes[0].name).toBe('Box')
  })

  it('parses empty input', () => {
    const result = parse('')
    expect(result.nodes.length).toBe(0)
  })

  it('parses whitespace only', () => {
    const result = parse('   \n   \n   ')
    expect(result.nodes.length).toBe(0)
  })

  it('parses comment only', () => {
    const result = parse('// Just a comment')
    expect(result.nodes.length).toBe(0)
  })
})
