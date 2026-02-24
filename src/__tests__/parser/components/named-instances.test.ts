/**
 * Parser Tests: Named Instances
 *
 * Tests for named instances and as-syntax.
 * - Component named Name
 * - Name as Type properties
 * - Container bg #333 (implicit Box)
 *
 * NOTE: Some of these features have specific implementations.
 * Tests document expected behavior.
 */

import { describe, it, expect } from 'vitest'
import { parse, parseOne, props } from '../../test-utils'

describe('Named Keyword', () => {
  it('creates named instance with named keyword', () => {
    const node = parseOne('Button named SaveBtn "Save"')
    expect(node.instanceName).toBe('SaveBtn')
    // Content is stored in children, not properties.text
    expect(node.children?.[0]?.content).toBe('Save')
  })

  it('creates named list item', () => {
    const code = `Menu
  - Item named FirstItem "Dashboard"
  - Item named SecondItem "Settings"`
    const result = parse(code)
    const menu = result.nodes[0]
    expect(menu.children[0].instanceName).toBe('FirstItem')
    expect(menu.children[1].instanceName).toBe('SecondItem')
  })

  it('uses named instance in events', () => {
    const code = `SaveBtn as Button, "Save"
CancelBtn as Button, "Cancel", onclick hide SaveBtn`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(2)
  })
})

// As syntax works with component definitions
describe('As Syntax for Primitives', () => {
  it('Email as Input creates Input primitive', () => {
    const code = 'Email as Input, pad 12, "user@example.com"'
    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const node = result.nodes[0]
    expect(node.name).toBe('Email')
    expect(node.properties.pad).toBe(12)
    expect(node.properties.placeholder).toBe('user@example.com')
  })

  it('SearchIcon as Icon creates Icon primitive', () => {
    const code = 'SearchIcon as Icon, size 20, col #3B82F6, "search"'
    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const node = result.nodes[0]
    expect(node.name).toBe('SearchIcon')
  })

  it('Title as Text creates Text primitive', () => {
    const code = 'Title as Text, size 24, weight bold, "Welcome"'
    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const node = result.nodes[0]
    expect(node.name).toBe('Title')
  })

  it('Panel as Box creates Box container', () => {
    const code = 'Panel as Box, bg #333, pad 16'
    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const node = result.nodes[0]
    expect(node.name).toBe('Panel')
    expect(node.properties.bg).toBe('#333')
  })
})

describe('Implicit Box Definition', () => {
  it('Container with props becomes implicit Box', () => {
    const code = 'Container bg #333, pad 16'
    const result = parse(code)
    expect(result.errors).toHaveLength(0)

    const node = result.nodes[0]
    expect(node.name).toBe('Container')
    expect(node.properties.bg).toBe('#333')
  })

  it('implicit definition can be reused', () => {
    const code = `MyCard bg #1E1E2E, pad 24, rad 12
  Text "First"
MyCard
  Text "Second"`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(2)

    // Both should have same styling
    expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
    expect(result.nodes[1].properties.bg).toBe('#1E1E2E')
  })
})

describe('Named Instances with Properties', () => {
  it('named instance with multiple properties', () => {
    const node = parseOne('Button named PrimaryBtn, bg #3B82F6, col #FFF, "Submit"')
    expect(node.instanceName).toBe('PrimaryBtn')
    expect(node.properties.bg).toBe('#3B82F6')
    expect(node.properties.col).toBe('#FFF')
  })

  it('as-defined component registers for reuse', () => {
    const code = `Email as Input, pad 12
Email "another@example.com"`
    const result = parse(code)
    expect(result.errors).toHaveLength(0)
    expect(result.registry.has('Email')).toBe(true)

    // Second instance should inherit properties
    expect(result.nodes[1].properties.pad).toBe(12)
  })
})

describe('Nested As-Syntax', () => {
  it('nested children with as-syntax', () => {
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

    const header = form.children.find((c) => c.name === 'Header')
    expect(header?.properties.bg).toBe('#2A2A3E')
  })
})

describe('Combined named and as', () => {
  it('combines named keyword with regular props', () => {
    const code = 'Input named EmailInput, pad 12, "Enter email"'
    const result = parse(code)
    const node = result.nodes[0]
    expect(node.properties.pad).toBe(12)
  })
})
