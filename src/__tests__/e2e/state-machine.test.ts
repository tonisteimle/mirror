/**
 * State Machine Tests
 *
 * Tests for state transitions, cycles, and edge cases in the runtime
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

describe('State Machine: Toggle Cycles', () => {
  const input = `
Dropdown as frame:
  closed
  onclick toggle

Dropdown
`

  it('generates toggle that changes closed to open', () => {
    const output = compile(input)
    expect(output).toContain("currentState === 'closed'")
    expect(output).toContain("'open' : 'closed'")
  })

  it('generates toggle that changes open to closed', () => {
    const output = compile(input)
    expect(output).toContain("currentState === 'open'")
  })

  it('handles collapsed/expanded toggle cycle', () => {
    const accordionInput = `
Accordion as frame:
  collapsed
  onclick toggle

Accordion
`
    const output = compile(accordionInput)
    expect(output).toContain("currentState === 'collapsed'")
    expect(output).toContain("currentState === 'expanded'")
    expect(output).toContain("'expanded' : 'collapsed'")
  })
})

describe('State Machine: setState Behavior', () => {
  it('generates setState method', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('setState(el, stateName)')
  })

  it('setState stores base styles before first change', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('el._baseStyles')
    expect(output).toContain('if (!el._baseStyles && el._stateStyles)')
  })

  it('setState restores base styles before applying new state', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('if (el._baseStyles) Object.assign(el.style, el._baseStyles)')
  })

  it('setState sets dataset.state', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('el.dataset.state = stateName')
  })

  it('setState applies state styles if defined', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('el._stateStyles[stateName]')
  })
})

describe('State Machine: toggleState Behavior', () => {
  it('generates toggleState method', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('toggleState(el, state1, state2)')
  })

  it('toggleState defaults second state to "default"', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain("state2 = state2 || 'default'")
  })

  it('toggleState switches between two states', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('const next = current === state1 ? state2 : state1')
  })
})

describe('State Machine: Visibility Updates', () => {
  it('setState triggers updateVisibility', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('this.updateVisibility(el)')
  })

  it('updateVisibility checks children for _visibleWhen', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('child._visibleWhen')
  })

  it('updateVisibility handles simple state match', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('visible = state === condition')
  })

  it('updateVisibility handles complex conditions', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain("condition.includes('&&')")
    expect(output).toContain("condition.includes('||')")
  })

  it('updateVisibility sets display based on visibility', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain("child.style.display = visible ? '' : 'none'")
  })
})

describe('State Machine: Initial State Handling', () => {
  it('generates _initialState property', () => {
    const input = `
Dropdown as frame:
  closed

Dropdown
`
    const output = compile(input)
    expect(output).toContain("_initialState = 'closed'")
  })

  it('toggle uses _initialState as fallback', () => {
    const output = compile(`Card as frame:`)
    expect(output).toContain('el.dataset.state || el._initialState')
  })

  it('generates data-state attribute', () => {
    const input = `
Dropdown as frame:
  open

Dropdown
`
    const output = compile(input)
    expect(output).toContain("dataset.state = 'open'")
  })
})

describe('State Machine: State Styles Integration', () => {
  const input = `
Button as button:
  bg #333
  selected:
    bg #3B82F6
    col white

Button
`

  it('generates _stateStyles object', () => {
    const output = compile(input)
    expect(output).toContain('_stateStyles')
    expect(output).toContain("'selected'")
  })

  it('state styles contain correct properties', () => {
    const output = compile(input)
    expect(output).toContain("'background': '#3B82F6'")
    expect(output).toContain("'color': 'white'")
  })

  it('applyState applies state styles', () => {
    const output = compile(input)
    expect(output).toContain('applyState(el, state)')
    expect(output).toContain('Object.assign(el.style, el._stateStyles[state])')
  })
})

describe('State Machine: Multiple State Definitions', () => {
  const input = `
Tab as frame:
  highlighted:
    bg #333
  selected:
    bg #3B82F6

Tab
`

  it('supports multiple state definitions', () => {
    const output = compile(input)
    expect(output).toContain("'highlighted'")
    expect(output).toContain("'selected'")
  })

  it('each state has its own styles', () => {
    const output = compile(input)
    expect(output).toContain("'#333'") // highlighted
    expect(output).toContain("'#3B82F6'") // selected
  })
})

describe('State Machine: Edge Cases', () => {
  it('handles component with no state', () => {
    const input = `
Card as frame:
  pad 8

Card
`
    expect(() => compile(input)).not.toThrow()
  })

  it('handles visibleWhen without parent state', () => {
    const input = `
Menu as frame:
  if (open)

Menu
`
    const output = compile(input)
    expect(output).toContain("_visibleWhen = 'open'")
  })

  it('handles state with no styles', () => {
    const input = `
Button as button:
  loading:
    // No styles for this state

Button
`
    // Should not throw, loading state just has no effect
    expect(() => compile(input)).not.toThrow()
  })
})
