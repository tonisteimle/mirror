/**
 * Tests for inline define + render feature
 *
 * This feature allows components to be defined and rendered in one step:
 * - `Email as Input, pad 12` → defines Email as Input AND renders
 * - `Container bg #333` → implicitly defines Container as Box AND renders
 * - Children inherit the define+render behavior
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../parser/parser'

describe('Inline Define + Render', () => {
  describe('as syntax for primitives', () => {
    it('Email as Input creates definition + renders', () => {
      const code = `Email as Input, pad 12, "test@example.com"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const node = result.nodes[0]
      expect(node.name).toBe('Email')
      expect(node.instanceName).toBe('Email')
      expect(node.properties._primitiveType).toBe('Input')
      expect(node.properties.pad).toBe(12)
      // For Input primitives, string content becomes placeholder
      expect(node.properties.placeholder).toBe('test@example.com')

      // Should be registered as template for reuse
      expect(result.registry.has('Email')).toBe(true)
    })

    it('Email reuses the definition', () => {
      const code = `Email as Input, pad 12, "test@example.com"
Email "other@example.com"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(2)

      // First instance
      const first = result.nodes[0]
      expect(first.name).toBe('Email')
      expect(first.properties._primitiveType).toBe('Input')
      expect(first.properties.pad).toBe(12)
      expect(first.properties.placeholder).toBe('test@example.com')

      // Second instance - inherits pad and _primitiveType from template
      const second = result.nodes[1]
      expect(second.name).toBe('Email')
      expect(second.properties._primitiveType).toBe('Input')
      expect(second.properties.pad).toBe(12)
      // Template placeholder is inherited
      expect(second.properties.placeholder).toBe('test@example.com')
      // New content is stored in a _text child (separate from placeholder)
      const textChild = second.children.find(c => c.name === '_text')
      expect(textChild?.content).toBe('other@example.com')
    })

    it('Label as Text sets primitive type', () => {
      const code = `Label as Text, size 14, col #999, "Username"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const node = result.nodes[0]
      expect(node.name).toBe('Label')
      expect(node.properties._primitiveType).toBe('Text')
      // 'size' on Text components is context-dependent → text-size
      expect(node.properties['text-size']).toBe(14)
    })

    it('MyIcon as Icon sets primitive type', () => {
      const code = `SearchIcon as Icon, size 20, col #3B82F6, "search"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const node = result.nodes[0]
      expect(node.name).toBe('SearchIcon')
      expect(node.properties._primitiveType).toBe('Icon')
    })

    it('Container as Box explicitly sets box type', () => {
      const code = `Panel as Box, bg #333, pad 16`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const node = result.nodes[0]
      expect(node.name).toBe('Panel')
      expect(node.properties._primitiveType).toBe('Box')
      expect(node.properties.bg).toBe('#333')
    })
  })

  describe('implicit Box for unknown components', () => {
    it('unknown component with props creates implicit definition', () => {
      const code = `MyCard bg #1E1E2E, pad 24, rad 12`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const node = result.nodes[0]
      expect(node.name).toBe('MyCard')
      expect(node.properties.bg).toBe('#1E1E2E')

      // Should be registered for reuse
      expect(result.registry.has('MyCard')).toBe(true)
    })

    it('second usage inherits from implicit definition', () => {
      const code = `MyCard bg #1E1E2E, pad 24, rad 12
  Text "First"
MyCard
  Text "Second"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(2)

      // First instance
      const first = result.nodes[0]
      expect(first.properties.bg).toBe('#1E1E2E')
      expect(first.properties.pad).toBe(24)

      // Second instance - inherits styling
      const second = result.nodes[1]
      expect(second.properties.bg).toBe('#1E1E2E')
      expect(second.properties.pad).toBe(24)
    })
  })

  describe('children inherit define+render behavior', () => {
    it('children of as-defined parent are saved as slots', () => {
      const code = `Form as Box, ver, gap 16, pad 24
  Header as Box, bg #2A2A3E, pad 12
    Title as Text, size 20, "Form Title"
  Content as Box, pad 16
    EmailField as Input, pad 12`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(1)

      const form = result.nodes[0]
      expect(form.name).toBe('Form')
      expect(form.children.length).toBeGreaterThanOrEqual(2)

      // Header slot
      const header = form.children.find(c => c.name === 'Header')
      expect(header).toBeDefined()
      expect(header?.properties.bg).toBe('#2A2A3E')

      // Title in header
      const title = header?.children.find(c => c.name === 'Title')
      expect(title).toBeDefined()
      expect(title?.properties._primitiveType).toBe('Text')

      // Content slot
      const content = form.children.find(c => c.name === 'Content')
      expect(content).toBeDefined()

      // EmailField in content
      const emailField = content?.children.find(c => c.name === 'EmailField')
      expect(emailField).toBeDefined()
      expect(emailField?.properties._primitiveType).toBe('Input')
    })

    it('reusing parent applies child slots', () => {
      const code = `Card bg #1E1E2E, pad 16
  Header pad 8
    Title as Text, size 18
  Body pad 12

Card
  Header
    Title "My Title"
  Body
    Text "Content"`
      const result = parse(code)

      expect(result.errors).toHaveLength(0)
      expect(result.nodes).toHaveLength(2)

      // Second Card should have structure from first
      const second = result.nodes[1]
      expect(second.properties.bg).toBe('#1E1E2E')

      const header = second.children.find(c => c.name === 'Header')
      expect(header).toBeDefined()
      expect(header?.properties.pad).toBe(8)

      const title = header?.children.find(c => c.name === 'Title')
      expect(title).toBeDefined()
      expect(title?.properties._primitiveType).toBe('Text')
      // For content components (title, label, etc.), content is stored directly on the node
      expect(title?.content).toBe('My Title')
    })
  })

  describe('explicit definition vs inline define+render', () => {
    it('colon syntax creates definition only (no render)', () => {
      // "Field:" creates a definition that is stored in registry but NOT rendered.
      // Only the instance "Field" is rendered.
      const code = `Field: ver, gap 4
  Label: size 14
  Input: pad 12

Field
  Label "Name"
  Input "placeholder"`
      const result = parse(code)

      // Only the instance should be in nodes (definition is not rendered)
      expect(result.nodes.length).toBe(1)

      // The instance uses the definition from registry
      const instance = result.nodes[0]
      expect(instance.name).toBe('Field')
      expect(instance.properties.ver).toBe(true) // inherited from definition

      // Definition exists in registry
      expect(result.registry.has('Field')).toBe(true)
      const definition = result.registry.get('Field')
      expect(definition?.properties.ver).toBe(true)
    })

    it('as syntax creates definition AND renders', () => {
      const code = `Field as Box, ver, gap 4
  Label as Text, size 14, "Name"
  EmailInput as Input, pad 12, "email"`
      const result = parse(code)

      // Should render the Field
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].name).toBe('Field')

      // But also register for reuse
      expect(result.registry.has('Field')).toBe(true)
    })
  })
})
