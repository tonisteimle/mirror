/**
 * Demo: New Test Infrastructure
 *
 * Shows how easy it is to write tests with the new utilities.
 */
import { describe, it, expect } from 'vitest'
import {
  // Core parsing
  parse,
  parseOne,
  parseAll,
  parseErrors,

  // Property/Style extraction
  props,
  style,
  childStyle,

  // AST navigation
  findNode,
  findAllNodes,
  child,
  getStates,
  getEvents,

  // Code builder
  mirror,

  // Low-level
  context,
  lex,

  // Mocks
  mockEditor,

  // Snapshot
  snapshotAST,
} from '../test-utils'

// =============================================================================
// Basic Parsing Tests - OLD vs NEW
// =============================================================================

describe('Basic Parsing (comparison)', () => {
  // OLD WAY: 6 lines, custom helper per file
  it('OLD: manually parse and check', () => {
    const result = parse('Box bg #333')
    expect(result.errors).toHaveLength(0)
    expect(result.nodes).toHaveLength(1)
    expect(result.nodes[0].properties.bg).toBe('#333')
  })

  // NEW WAY: 1 line with custom matcher
  it('NEW: custom matcher', () => {
    expect('Box bg #333').toParseWithProps({ bg: '#333' })
  })

  // NEW WAY: props() helper
  it('NEW: props() helper', () => {
    expect(props('Box bg #333').bg).toBe('#333')
  })
})

// =============================================================================
// Style Tests - Clean and Simple
// =============================================================================

describe('Style Tests', () => {
  it('extracts CSS styles directly', () => {
    expect(style('Box pad 12').padding).toBe('12px')
    expect(style('Box bg #333').backgroundColor).toBe('#333')
    expect(style('Text fs 16').fontSize).toBe('16px')
  })

  it('custom matcher for styles', () => {
    expect('Box pad 12, bg #333').toParseWithStyle({
      padding: '12px',
      backgroundColor: '#333',
    })
  })

  it('child styles', () => {
    const s = childStyle(`
      Box
        Text col #FFF
    `, 0)
    expect(s.color).toBe('#FFF')
  })
})

// =============================================================================
// AST Navigation - Find Nodes Easily
// =============================================================================

describe('AST Navigation', () => {
  it('finds nested nodes', () => {
    const root = parseOne(`
      Card
        Header bg #333
        Body pad 12
    `)

    const header = findNode(root, 'Header')
    expect(header?.properties.bg).toBe('#333')

    const body = findNode(root, 'Body')
    expect(body?.properties.pad).toBe(12)
  })

  it('finds all matching nodes', () => {
    const root = parseOne(`
      Box
        Button bg #111
        Button bg #222
        Button bg #333
    `)

    const buttons = findAllNodes(root, 'Button')
    expect(buttons).toHaveLength(3)
  })

  it('navigates with child()', () => {
    const root = parseOne(`
      Box
        Text col #FFF
        Text col #000
    `)

    expect(child(root, 0).properties.col).toBe('#FFF')
    expect(child(root, 1).properties.col).toBe('#000')
  })
})

// =============================================================================
// State Tests - Clear Assertions
// =============================================================================

describe('State Tests', () => {
  it('custom matcher for states', () => {
    const node = parseOne(`
      Button
        hover
          bg #555
    `)

    expect(node).toHaveState('hover', { bg: '#555' })
  })

  it('extracts all states', () => {
    const node = parseOne(`
      Button
        hover
          bg #555
        active
          bg #333
    `)

    const states = getStates(node)
    expect(states.hover.bg).toBe('#555')
    expect(states.active.bg).toBe('#333')
  })
})

// =============================================================================
// Event Tests
// =============================================================================

describe('Event Tests', () => {
  it('custom matcher for events', () => {
    const node = parseOne('Button onclick toggle')
    expect(node).toHaveEventHandler('onclick')
  })

  it('extracts events', () => {
    const node = parseOne('Button onclick toggle, onhover highlight')
    const events = getEvents(node)
    expect(events.onclick).toBeDefined()
    expect(events.onhover).toBeDefined()
  })
})

// =============================================================================
// Error Testing
// =============================================================================

describe('Error Testing', () => {
  it('asserts parsing succeeds', () => {
    expect('Box bg #333').toParseWithoutErrors()
  })

  it('asserts parsing fails', () => {
    // Invalid syntax should error
    expect('Box {{invalid}}').toParseWithErrors()
  })

  it('gets error details', () => {
    const errors = parseErrors('Box {{invalid}}')
    expect(errors.length).toBeGreaterThan(0)
  })
})

// =============================================================================
// Code Builder - Fluent API
// =============================================================================

describe('Code Builder', () => {
  it('builds simple component', () => {
    const code = mirror()
      .component('Button', { bg: '#3B82F6', pad: 12 })
      .build()

    expect(code).toContain('Button')
    expect(code).toParseWithProps({ bg: '#3B82F6', pad: 12 })
  })

  it('builds with tokens', () => {
    const code = mirror()
      .token('primary', '#3B82F6')
      .token('spacing', 16)
      .component('Box', 'bg $primary, pad $spacing')
      .build()

    expect(code).toParseWithoutErrors()
  })

  it('builds nested structure', () => {
    const code = mirror()
      .component('Card')
      .child()
        .component('Header')
        .child()
          .text('Title')
        .parent()
      .parent()
      .build()

    const node = parseOne(code)
    expect(node).toHaveChild('Header')
  })

  it('builds definitions', () => {
    const code = mirror()
      .define('PrimaryButton', { bg: '#3B82F6', col: '#FFF', pad: 12 })
      .component('PrimaryButton', '"Click me"')
      .build()

    expect(code).toParseWithoutErrors()
  })
})

// =============================================================================
// Mock Editor - For Hook Tests
// =============================================================================

describe('Mock Editor', () => {
  it('creates mock with dispatch spy', () => {
    const { editorRef, dispatch } = mockEditor('Button ')

    // Simulate what a hook would do
    editorRef.current.dispatch({ changes: { from: 0, to: 7, insert: 'Button pad 12' } })

    expect(dispatch).toHaveBeenCalledWith({
      changes: { from: 0, to: 7, insert: 'Button pad 12' },
    })
  })

  it('provides cursor position', () => {
    const { editorRef } = mockEditor('Button ', 3)

    expect(editorRef.current.state.selection.main.head).toBe(3)
  })
})

// =============================================================================
// Snapshot Testing
// =============================================================================

describe('Snapshot Testing', () => {
  it('creates clean AST snapshot', () => {
    const node = parseOne('Box bg #333, pad 12')
    const clean = snapshotAST(node)

    // Just verify it has the expected structure (no position info)
    expect(clean).toHaveProperty('name', 'Box')
    expect(clean).toHaveProperty('properties')
    // Position fields should be removed
    expect(clean).not.toHaveProperty('line')
    expect(clean).not.toHaveProperty('column')
  })
})

// =============================================================================
// Table-Driven Tests
// =============================================================================

describe('Table-Driven Tests', () => {
  // Multiple test cases in one block
  const paddingCases: [string, Record<string, unknown>][] = [
    ['Box pad 12', { pad: 12 }],
    ['Box pad 8', { pad: 8 }],
    ['Box padding 16', { pad: 16 }],
  ]

  it.each(paddingCases)('%s → %o', (code, expected) => {
    expect(code).toParseWithProps(expected)
  })

  // Style cases
  const styleCases: [string, React.CSSProperties][] = [
    ['Box pad 12', { padding: '12px' }],
    ['Box bg #333', { backgroundColor: '#333' }],
    ['Box rad 8', { borderRadius: '8px' }],
  ]

  it.each(styleCases)('%s → CSS', (code, expected) => {
    expect(code).toParseWithStyle(expected)
  })
})
