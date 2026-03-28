/**
 * Element Selection E2E Tests
 *
 * Tests that the DOM generator outputs the correct data attributes
 * for element selection (data-mirror-id, data-mirror-name)
 */

import { describe, it, expect } from 'vitest'
import { parse, generateDOM } from '../../index'

// Helper to compile Mirror code to JS
function compile(mirrorCode: string): string {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  return generateDOM(ast)
}

describe('E2E: Element Selection - data-mirror-id', () => {
  it('generates data-mirror-id for simple components', () => {
    const input = `
Card as frame:
  pad 20

Card
`
    const output = compile(input)
    expect(output).toContain("dataset.mirrorId = 'node-")
  })

  it('generates data-mirror-id for nested children', () => {
    const input = `
Card as frame:
  pad 20

Title as text:
  weight 600

Card
  Title "Hello"
`
    const output = compile(input)
    // Both Card and Title should have mirrorId
    const mirrorIdMatches = output.match(/dataset\.mirrorId = 'node-/g)
    expect(mirrorIdMatches?.length).toBeGreaterThanOrEqual(2)
  })

  it('generates data-mirror-id for deeply nested components', () => {
    const input = `
App as frame:
Header as frame:
Content as frame:
Title as text:

App
  Header
    Title "Header"
  Content
    Title "Body"
`
    const output = compile(input)
    // Should have IDs for App, Header, Content, and both Title instances
    const mirrorIdMatches = output.match(/dataset\.mirrorId = 'node-/g)
    expect(mirrorIdMatches?.length).toBeGreaterThanOrEqual(5)
  })
})

describe('E2E: Element Selection - data-mirror-name', () => {
  it('generates data-mirror-name for components with names', () => {
    const input = `
Card as frame:
  pad 20

Card
`
    const output = compile(input)
    expect(output).toContain("dataset.mirrorName = 'Card'")
  })

  it('generates data-mirror-name for nested children', () => {
    const input = `
Card as frame:
Title as text:

Card
  Title "Hello"
`
    const output = compile(input)
    expect(output).toContain("dataset.mirrorName = 'Card'")
    expect(output).toContain("dataset.mirrorName = 'Title'")
  })

  it('generates data-mirror-name for primitives', () => {
    const input = `
Button "Click me"
Input "placeholder"
`
    const output = compile(input)
    expect(output).toContain("dataset.mirrorName = 'Button'")
    expect(output).toContain("dataset.mirrorName = 'Input'")
  })
})

describe('E2E: Element Selection - Conditionals', () => {
  const input = `
$showFooter: true

App as frame:
Footer as frame:
  pad 10

App
  if $showFooter
    Footer
`

  it('generates data-mirror-id for conditional content', () => {
    const output = compile(input)
    // Footer inside conditional should have mirrorId
    expect(output).toContain("dataset.mirrorId = 'node-")
  })

  it('generates data-mirror-name for conditional content', () => {
    const output = compile(input)
    expect(output).toContain("dataset.mirrorName = 'Footer'")
  })

  it('generates visibleWhen for conditional elements', () => {
    const output = compile(input)
    expect(output).toContain("_visibleWhen = '$showFooter'")
  })
})

describe('E2E: Element Selection - Each Loop', () => {
  const input = `
Item as frame:
  pad 8

List as frame:
  gap 4

List
  each item in items
    Item
`

  it('generates data-mirror-name for each template items', () => {
    const output = compile(input)
    // Item inside each should have mirrorName
    expect(output).toContain("dataset.mirrorName = 'Item'")
  })

  it('generates data-each-container for each loop containers', () => {
    const output = compile(input)
    // The runtime queries for data-each-container
    expect(output).toContain("data-each-container")
  })

  it('generates eachConfig with renderItem function', () => {
    const output = compile(input)
    expect(output).toContain("_eachConfig")
    expect(output).toContain("renderItem")
  })

  // Note: data-each-item is set at runtime, not in generated code
  // The runtime renderItem function handles this
})

describe('E2E: Element Selection - Complex Hierarchy', () => {
  const input = `
App as frame:
Header as frame:
Nav as frame:
NavItem as frame:
  cursor pointer
Content as frame:
Card as frame:
  pad 16
Title as text:

App
  Header
    Nav
      NavItem "Home"
      NavItem "About"
  Content
    Card
      Title "Welcome"
`

  it('generates unique IDs for all elements', () => {
    const output = compile(input)
    // Extract all node IDs
    const idMatches = output.match(/dataset\.mirrorId = '(node-\d+)'/g)
    expect(idMatches).not.toBeNull()

    // All IDs should be unique
    const ids = idMatches!.map(m => m.match(/'(node-\d+)'/)![1])
    const uniqueIds = new Set(ids)
    expect(uniqueIds.size).toBe(ids.length)
  })

  it('generates component names for all elements', () => {
    const output = compile(input)
    expect(output).toContain("dataset.mirrorName = 'App'")
    expect(output).toContain("dataset.mirrorName = 'Header'")
    expect(output).toContain("dataset.mirrorName = 'Nav'")
    expect(output).toContain("dataset.mirrorName = 'NavItem'")
    expect(output).toContain("dataset.mirrorName = 'Content'")
    expect(output).toContain("dataset.mirrorName = 'Card'")
    expect(output).toContain("dataset.mirrorName = 'Title'")
  })
})

describe('E2E: Element Selection - Named Instances', () => {
  it('generates data-mirror-name for named instances', () => {
    const input = `
Button as button:
  pad 12

Button named saveBtn "Save"
Button named cancelBtn "Cancel"
`
    const output = compile(input)
    // Both named buttons should have mirrorName
    expect(output).toContain("dataset.mirrorName = 'Button'")
    // Named instances should be stored in _elements
    expect(output).toContain("_elements['saveBtn']")
    expect(output).toContain("_elements['cancelBtn']")
  })
})

describe('E2E: Element Selection - Mixed Content', () => {
  it('handles components, conditionals and each together', () => {
    const input = `
App as frame:
Header as frame:
Card as frame:
  pad 16
Text as text:

$showHeader: true

App
  if $showHeader
    Header
      Text "Header"
  each card in cards
    Card
      Text card.title
`
    const output = compile(input)

    // Regular components should have ID and name
    expect(output).toContain("dataset.mirrorName = 'App'")

    // Conditional content should have ID and name
    expect(output).toContain("dataset.mirrorName = 'Header'")

    // Each template content should have name
    expect(output).toContain("dataset.mirrorName = 'Card'")

    // Each loop should have container and config
    expect(output).toContain("data-each-container")
    expect(output).toContain("_eachConfig")
  })
})
