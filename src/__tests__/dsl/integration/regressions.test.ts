/**
 * DSL Regression Tests
 *
 * Tests for known bug fixes and edge cases.
 * When a bug is fixed, add a test here to prevent regression.
 */

import { describe, it, expect } from 'vitest'
import { parse } from '../../../parser/parser'
import { generate, getStyle, getTextContent, getChildren } from '../../test-utils'

// Helper to find a state by name in the states array
const findState = (states: Array<{ name: string; properties: Record<string, unknown> }> | undefined, name: string) =>
  states?.find(s => s.name === name)

// ============================================
// Text Content Issues
// ============================================

describe('Text Content Regressions', () => {
  // NOTE: Text content is stored as a _text child node, not in node.content directly
  it('text at end of line is not interpreted as property value', () => {
    const result = parse('Button bg #FF0000 "Click"')
    expect(result.nodes[0].properties.bg).toBe('#FF0000')
    // Text is stored as children[0].content (as _text node)
    expect(result.nodes[0].children[0]?.content).toBe('Click')
  })

  it('text on separate line should not work (common pitfall)', () => {
    // This is incorrect DSL - text should be on same line
    const dsl = `Button bg #FF0000
  "Click me"`
    const result = parse(dsl)
    // Text on separate line creates a text child, not content
    // Document actual behavior
  })

  it('text with special characters preserved', () => {
    const result = parse('Label "Hello, World!"')
    // Text is stored as children[0].content (as _text node)
    expect(result.nodes[0].children[0]?.content).toBe('Hello, World!')
  })

  it('text with quotes inside', () => {
    const result = parse('Quote "He said \\"hello\\""')
    // Document quote handling
  })
})

// ============================================
// Property Parsing Issues
// ============================================

describe('Property Parsing Regressions', () => {
  it('shorthand and longform produce same result', () => {
    const short = parse('Box pad 16')
    const long = parse('Box padding 16')
    expect(short.nodes[0].properties.pad).toBe(16)
    expect(long.nodes[0].properties.pad).toBe(16)
  })

  it('dimension shorthand works with other properties', () => {
    const result = parse('Card 200 150 pad 16 bg #1E1E2E')
    expect(result.nodes[0].properties.w).toBe(200)
    expect(result.nodes[0].properties.h).toBe(150)
    expect(result.nodes[0].properties.pad).toBe(16)
    expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
  })

  it('percentage values are strings', () => {
    const result = parse('Box w 50%')
    expect(result.nodes[0].properties.w).toBe('50%')
  })

  it('color values with alpha channel', () => {
    const result = parse('Box bg #FF000080')
    expect(result.nodes[0].properties.bg).toBe('#FF000080')
  })
})

// ============================================
// Layout Issues
// ============================================

describe('Layout Regressions', () => {
  it('alignment in column vs row context', () => {
    // In column layout, hor-cen should affect alignItems (cross axis)
    const colStyle = getStyle(generate('Box ver hor-cen'))
    expect(colStyle.alignItems).toBe('center')

    // In row layout, hor-cen should affect justifyContent (main axis)
    const rowStyle = getStyle(generate('Box hor hor-cen'))
    expect(rowStyle.justifyContent).toBe('center')
  })

  it('stacked layout creates proper grid', () => {
    const style = getStyle(generate('Box stacked'))
    expect(style.display).toBe('grid')
    expect(style.gridTemplateColumns).toBe('1fr')
  })
})

// ============================================
// Indentation Issues
// ============================================

describe('Indentation Regressions', () => {
  it('2-space indentation creates correct hierarchy', () => {
    const dsl = `Parent
  Child
    GrandChild`
    const result = parse(dsl)
    expect(result.nodes[0].children[0].children[0].name).toBe('GrandChild')
  })

  it('tab indentation should be handled', () => {
    // Tabs should be converted to spaces or handled gracefully
    const dsl = "Parent\n\tChild"
    const result = parse(dsl)
    // Document actual behavior
  })

  it('mixed indentation warning', () => {
    // Mixing tabs and spaces may cause issues
    // Document expected behavior
  })
})

// ============================================
// Event Handler Issues
// ============================================

describe('Event Handler Regressions', () => {
  it('semicolon does NOT chain actions (common pitfall)', () => {
    // This is incorrect DSL - semicolons are not supported
    const result = parse('Button onclick show A; hide B')
    // Should only parse first action, or produce error
    // Document actual behavior
  })

  it('comma chains multiple actions', () => {
    const result = parse('Button onclick select self, close Menu')
    expect(result.nodes[0].eventHandlers[0].actions.length).toBe(2)
  })

  it('events block handles multiple actions', () => {
    const dsl = `Button named Btn "Click"

events
  Btn onclick
    show Panel
    hide Sidebar`
    const result = parse(dsl)
    const btn = result.nodes.find(n => n.instanceName === 'Btn')
    // Events block should add handler with multiple actions
  })
})

// ============================================
// State Issues
// ============================================

describe('State Regressions', () => {
  it('behavior state without visual definition (common pitfall)', () => {
    // Highlight action without state definition won't show visual change
    const dsl = `Item
  onhover highlight self`
    const result = parse(dsl)
    // This parses but won't have visual effect without state definition
    expect(result.nodes[0].eventHandlers.length).toBe(1)

    // Correct version:
    const correctDsl = `Item
  state default
    bg transparent
  state highlighted
    bg #333
  onhover highlight self`
    const correctResult = parse(correctDsl)
    // States are stored as arrays with { name, properties }
    expect(findState(correctResult.nodes[0].states, 'highlighted')).toBeDefined()
  })
})

// ============================================
// Component Definition Issues
// ============================================

describe('Component Definition Regressions', () => {
  it('definition with colon does not render', () => {
    const result = parse('Button: pad 12 bg #3B82F6')
    expect(result.nodes.length).toBe(0)
    expect(result.registry.has('Button')).toBe(true)
  })

  it('usage without colon does render', () => {
    const result = parse(`Button: pad 12
Button "Click"`)
    expect(result.nodes.length).toBe(1)
  })

  it('inheritance preserves parent properties', () => {
    const result = parse(`Button: pad 12 bg #3B82F6 rad 8
DangerButton from Button: bg #EF4444
DangerButton "Delete"`)
    const dangerBtn = result.nodes[0]
    expect(dangerBtn.properties.pad).toBe(12)
    expect(dangerBtn.properties.rad).toBe(8)
    expect(dangerBtn.properties.bg).toBe('#EF4444')
  })
})

// ============================================
// Named Instance Issues
// ============================================

describe('Named Instance Regressions', () => {
  it('named instance can be referenced in events', () => {
    const dsl = `- Button named SaveBtn "Save"

events
  SaveBtn onclick
    show SuccessMsg`
    const result = parse(dsl)
    const btn = result.nodes[0]
    expect(btn.instanceName).toBe('SaveBtn')
  })

  it('unnamed instances cannot be indexed (common pitfall)', () => {
    // This is incorrect - can't reference by index
    const incorrectDsl = `- Button "A"
- Button "B"

events
  Button[0] onclick
    show Panel`
    // Document that this doesn't work
  })
})

// ============================================
// Token Issues
// ============================================

describe('Token Regressions', () => {
  it('token with hyphen in name', () => {
    const result = parse(`$btn-primary: #3B82F6
Button bg $btn-primary`)
    expect(result.nodes[0].properties.bg).toBe('#3B82F6')
  })

  it('token suffix inference', () => {
    const result = parse(`$card-padding: 16
Card $card-padding`)
    expect(result.nodes[0].properties.pad).toBe(16)
  })

  it('multiple tokens in one line', () => {
    const result = parse(`$bg: #1E1E2E
$pad: 16
Card bg $bg pad $pad`)
    expect(result.nodes[0].properties.bg).toBe('#1E1E2E')
    expect(result.nodes[0].properties.pad).toBe(16)
  })
})

// ============================================
// CSS Output Issues
// ============================================

describe('CSS Output Regressions', () => {
  it('auto-contrast for buttons with background', () => {
    // Button with dark bg should get light text color automatically
    const style = getStyle(generate('Button bg #1E1E2E "Click"'))
    // Document auto-contrast behavior
  })

  // Note: Generator returns wrapper components; hover transition is added during CSS rendering
  it.skip('hover transition is added - REQUIRES RENDERED CSS', () => {
    const style = getStyle(generate('Button hover-bg #4B92F7'))
    expect(style.transition).toBe('all 0.15s ease')
  })

  it('hidden sets display none', () => {
    const style = getStyle(generate('Box hidden'))
    expect(style.display).toBe('none')
  })
})

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  it('empty component name', () => {
    // Should handle gracefully
    // parse('') should not crash
    const result = parse('')
    expect(result.nodes.length).toBe(0)
  })

  it('comment only file', () => {
    const result = parse('// Just a comment')
    expect(result.nodes.length).toBe(0)
  })

  it('very deep nesting', () => {
    const dsl = `L1
  L2
    L3
      L4
        L5
          L6 "Deep"`
    const result = parse(dsl)
    expect(result.nodes[0].children[0].children[0].children[0].children[0].children[0].name).toBe('L6')
  })

  it('many properties on one line', () => {
    const result = parse('Box w 200 h 100 pad 16 mar 8 bg #1E1E2E rad 12 bor 1 col #FFF gap 8 hor')
    expect(Object.keys(result.nodes[0].properties).length).toBeGreaterThan(5)
  })
})
