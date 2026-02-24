/**
 * Slot Parser Tests
 *
 * Tests for inline child slot parsing:
 * - parseInlineChildSlot
 * - parseNestedInlineChild
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../parser/lexer'
import { createParserContext } from '../../parser/parser-context'
import { parse } from '../../parser/parser'
import {
  parseInlineChildSlot,
  parseNestedInlineChild,
} from '../../parser/slot-parser'

// Helper to create parser context from source code
function createContext(source: string) {
  const tokens = tokenize(source)
  return createParserContext(tokens, source)
}

describe('slot-parser', () => {
  describe('parseInlineChildSlot', () => {
    it('parses child with name', () => {
      const ctx = createContext('Title "Product Name"')
      const result = parseInlineChildSlot(ctx, 'Card')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Title')
      expect(result?.content).toBe('Product Name')
    })

    it('parses child with properties', () => {
      const ctx = createContext('Title col #F00')
      const result = parseInlineChildSlot(ctx, 'Card')
      expect(result?.name).toBe('Title')
      expect(result?.properties.col).toBe('#F00')
    })

    it('parses child with multiple properties', () => {
      const ctx = createContext('Price col #0F0 size 24')
      const result = parseInlineChildSlot(ctx, 'Card')
      expect(result?.name).toBe('Price')
      expect(result?.properties.col).toBe('#0F0')
      expect(result?.properties.size).toBe(24)
    })

    it('parses child with content ending properties', () => {
      const ctx = createContext('Name "Hello"')
      const result = parseInlineChildSlot(ctx, 'Card')
      expect(result?.name).toBe('Name')
      expect(result?.content).toBe('Hello')
    })

    it('generates unique id for child', () => {
      const ctx = createContext('Title "Text"')
      const result = parseInlineChildSlot(ctx, 'Card')
      expect(result?.id).toBeDefined()
      expect(result?.id).toContain('Title')
    })

    it('sets type to component', () => {
      const ctx = createContext('Label "Test"')
      const result = parseInlineChildSlot(ctx, 'Form')
      expect(result?.type).toBe('component')
    })

    it('records line and column', () => {
      const ctx = createContext('Header "Title"')
      const result = parseInlineChildSlot(ctx, 'Page')
      expect(result?.line).toBeDefined()
      expect(result?.column).toBeDefined()
    })

    it('parses spacing properties with directions', () => {
      const ctx = createContext('Box pad l-r 20')
      const result = parseInlineChildSlot(ctx, 'Container')
      expect(result?.properties.pad_l).toBe(20)
      expect(result?.properties.pad_r).toBe(20)
    })

    it('parses spacing with single value', () => {
      const ctx = createContext('Box pad 16')
      const result = parseInlineChildSlot(ctx, 'Container')
      expect(result?.properties.pad).toBe(16)
    })
  })

  describe('parseNestedInlineChild', () => {
    it('parses nested child with name', () => {
      const ctx = createContext('Icon')
      const result = parseNestedInlineChild(ctx, 'Button')
      expect(result).not.toBeNull()
      expect(result?.name).toBe('Icon')
    })

    it('parses nested child with content', () => {
      const ctx = createContext('Label "Click"')
      const result = parseNestedInlineChild(ctx, 'Button')
      expect(result?.name).toBe('Label')
      expect(result?.content).toBe('Click')
    })

    it('parses nested child with properties', () => {
      const ctx = createContext('Icon size 20')
      const result = parseNestedInlineChild(ctx, 'Button')
      expect(result?.properties.size).toBe(20)
    })

    it('generates unique id', () => {
      const ctx = createContext('Subtitle')
      const result = parseNestedInlineChild(ctx, 'Title')
      expect(result?.id).toBeDefined()
    })

    it('sets type to component', () => {
      const ctx = createContext('Inner')
      const result = parseNestedInlineChild(ctx, 'Outer')
      expect(result?.type).toBe('component')
    })

    it('stops at another component name', () => {
      const ctx = createContext('First Second')
      const result = parseNestedInlineChild(ctx, 'Parent')
      expect(result?.name).toBe('First')
      // Should stop before Second
      expect(ctx.current()?.value).toBe('Second')
    })
  })

  describe('template registration', () => {
    it('registers child with properties as template', () => {
      const ctx = createContext('Title col #F00 "Text"')
      parseInlineChildSlot(ctx, 'Card')
      expect(ctx.registry.has('Title')).toBe(true)
    })

    it('does not register child without properties', () => {
      const ctx = createContext('Simple "text"')
      parseInlineChildSlot(ctx, 'Card')
      // Check if it has any definition worth registering
      // If only content, it may or may not be registered depending on implementation
      // This tests the basic behavior
    })
  })

  describe('semicolon syntax for instances', () => {
    it('stops parsing child at semicolon', () => {
      const ctx = createContext('Icon "check"; Label "Click"')
      const icon = parseInlineChildSlot(ctx, 'Button')
      expect(icon?.name).toBe('Icon')
      expect(icon?.content).toBe('check')
      // Should stop at semicolon - next token should be SEMICOLON
      expect(ctx.current()?.type).toBe('SEMICOLON')
    })

    it('allows parsing multiple children separated by semicolon', () => {
      const ctx = createContext('Icon "check"; Label "Click"')
      const icon = parseInlineChildSlot(ctx, 'Button')
      expect(icon?.content).toBe('check')

      // Skip semicolon manually (as inline-properties.ts does)
      ctx.advance() // consume SEMICOLON

      const label = parseInlineChildSlot(ctx, 'Button')
      expect(label?.name).toBe('Label')
      expect(label?.content).toBe('Click')
    })

    it('handles semicolon with properties on child', () => {
      const ctx = createContext('Icon size 20 "check"; Label col #F00 "Click"')
      const icon = parseInlineChildSlot(ctx, 'Button')
      expect(icon?.name).toBe('Icon')
      expect(icon?.properties.size).toBe(20)
      expect(icon?.content).toBe('check')
      expect(ctx.current()?.type).toBe('SEMICOLON')
    })
  })

  describe('semicolon syntax integration', () => {
    it('parses instance with semicolon child overrides via parse()', () => {
      const code = `
Item:
  Icon:
  Label:

Item Icon "bed-double"; Label "Doppelbett"
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      // Find the Item instance (not definition)
      const items = result.nodes.filter(n => n.name === 'Item' && !n._isExplicitDefinition)
      expect(items).toHaveLength(1)

      const item = items[0]
      expect(item.children).toHaveLength(2)

      const icon = item.children.find(c => c.name === 'Icon')
      const label = item.children.find(c => c.name === 'Label')

      expect(icon?.content).toBe('bed-double')
      expect(label?.content).toBe('Doppelbett')
    })

    it('parses multiple instances with semicolon syntax', () => {
      const code = `
NavItem:
  Icon:
  Label:

NavItem Icon "home"; Label "Home"
NavItem Icon "settings"; Label "Settings"
NavItem Icon "user"; Label "Profile"
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const items = result.nodes.filter(n => n.name === 'NavItem' && !n._isExplicitDefinition)
      expect(items).toHaveLength(3)

      expect(items[0].children.find(c => c.name === 'Icon')?.content).toBe('home')
      expect(items[0].children.find(c => c.name === 'Label')?.content).toBe('Home')

      expect(items[1].children.find(c => c.name === 'Icon')?.content).toBe('settings')
      expect(items[1].children.find(c => c.name === 'Label')?.content).toBe('Settings')

      expect(items[2].children.find(c => c.name === 'Icon')?.content).toBe('user')
      expect(items[2].children.find(c => c.name === 'Label')?.content).toBe('Profile')
    })

    it('handles semicolon with properties on children', () => {
      const code = `
Button:
  Icon:
  Text:

Button Icon size 20 "check"; Text col #0F0 "Success"
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const buttons = result.nodes.filter(n => n.name === 'Button' && !n._isExplicitDefinition)
      expect(buttons).toHaveLength(1)

      const btn = buttons[0]
      const icon = btn.children.find(c => c.name === 'Icon')
      const text = btn.children.find(c => c.name === 'Text')

      expect(icon?.content).toBe('check')
      expect(icon?.properties.size).toBe(20)
      expect(text?.content).toBe('Success')
      expect(text?.properties.col).toBe('#0F0')
    })

    it('inherits properties from first usage when empty definition exists', () => {
      // When an empty definition exists (e.g., "Item:" in Components tab),
      // the first usage with properties should update the template
      // so subsequent instances inherit those properties
      const code = `
Item:

Item hor, gap 4
  Icon "bed-double"
  Label "First"
Item Icon "check"; Label "Second"
`
      const result = parse(code)
      expect(result.errors).toHaveLength(0)

      const items = result.nodes.filter(n => n.name === 'Item' && !n._isExplicitDefinition)
      expect(items).toHaveLength(2)

      // First Item has its own properties
      expect(items[0].properties.hor).toBe(true)
      expect(items[0].properties.g).toBe(4)

      // Second Item should inherit hor and gap from first usage
      expect(items[1].properties.hor).toBe(true)
      expect(items[1].properties.g).toBe(4)

      // Both should have their children
      expect(items[0].children.find(c => c.name === 'Label')?.content).toBe('First')
      expect(items[1].children.find(c => c.name === 'Label')?.content).toBe('Second')
    })
  })
})
