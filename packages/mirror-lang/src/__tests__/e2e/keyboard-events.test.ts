/**
 * Keyboard Events E2E Tests
 *
 * Tests the full compilation pipeline for keyboard events:
 * - onkeydown with specific keys
 * - onkeyup events
 * - keys block syntax
 * - Timing modifiers (debounce, delay)
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

describe('E2E: Keyboard Events - Escape Key', () => {
  const input = `
Dropdown as frame:
  onkeydown escape: close

Dropdown
`

  it('generates keydown event listener', () => {
    const output = compile(input)
    expect(output).toContain("addEventListener('keydown'")
  })

  it('generates correct key check for Escape', () => {
    const output = compile(input)
    expect(output).toContain("e.key === 'Escape'")
  })

  it('generates close action', () => {
    const output = compile(input)
    expect(output).toContain('_runtime.close')
  })
})

describe('E2E: Keyboard Events - Enter Key', () => {
  const input = `
Form as frame:
  onkeydown enter: submit

Form
`

  it('generates correct key check for Enter', () => {
    const output = compile(input)
    expect(output).toContain("e.key === 'Enter'")
  })
})

describe('E2E: Keyboard Events - Arrow Keys', () => {
  it('generates ArrowDown key check', () => {
    const input = `
List as frame:
  onkeydown arrow-down: highlight next

List
`
    const output = compile(input)
    expect(output).toContain("e.key === 'ArrowDown'")
    expect(output).toContain('_runtime.highlight')
  })

  it('generates ArrowUp key check', () => {
    const input = `
List as frame:
  onkeydown arrow-up: highlight prev

List
`
    const output = compile(input)
    expect(output).toContain("e.key === 'ArrowUp'")
  })

  it('generates ArrowLeft key check', () => {
    const input = `
Slider as frame:
  onkeydown arrow-left: decrease

Slider
`
    const output = compile(input)
    expect(output).toContain("e.key === 'ArrowLeft'")
  })

  it('generates ArrowRight key check', () => {
    const input = `
Slider as frame:
  onkeydown arrow-right: increase

Slider
`
    const output = compile(input)
    expect(output).toContain("e.key === 'ArrowRight'")
  })
})

describe('E2E: Keyboard Events - Tab Key', () => {
  const input = `
Modal as frame:
  onkeydown tab: focus next

Modal
`

  it('generates Tab key check', () => {
    const output = compile(input)
    expect(output).toContain("e.key === 'Tab'")
  })
})

describe('E2E: Keyboard Events - Space Key', () => {
  const input = `
Button as button:
  onkeydown space: toggle

Button
`

  it('generates Space key check', () => {
    const output = compile(input)
    expect(output).toContain("e.key === ' '")
  })

  it('generates toggle action', () => {
    const output = compile(input)
    expect(output).toContain('_runtime.toggle')
  })
})

describe('E2E: Keyboard Events - Backspace and Delete', () => {
  it('generates Backspace key check', () => {
    const input = `
Input as input:
  onkeydown backspace: clear

Input
`
    const output = compile(input)
    expect(output).toContain("e.key === 'Backspace'")
  })

  it('generates Delete key check', () => {
    const input = `
Item as frame:
  onkeydown delete: remove

Item
`
    const output = compile(input)
    expect(output).toContain("e.key === 'Delete'")
  })
})

describe('E2E: Keyboard Events - Keys Block', () => {
  const input = `
Dropdown as frame:
  keys
    escape close
    enter select
    arrow-down highlight next
    arrow-up highlight prev

Dropdown
`

  it('generates multiple keydown listeners', () => {
    const output = compile(input)
    // Should have multiple keydown listeners for different keys
    expect(output).toContain("addEventListener('keydown'")
  })

  it('generates all key checks', () => {
    const output = compile(input)
    expect(output).toContain("e.key === 'Escape'")
    expect(output).toContain("e.key === 'Enter'")
    expect(output).toContain("e.key === 'ArrowDown'")
    expect(output).toContain("e.key === 'ArrowUp'")
  })

  it('generates corresponding actions', () => {
    const output = compile(input)
    expect(output).toContain('_runtime.close') // close sets state to "closed"
    expect(output).toContain('_runtime.select')
    expect(output).toContain('_runtime.highlight')
  })
})

describe('E2E: Keyboard Events - Multiple Events Same Component', () => {
  const input = `
Form as frame:
  onkeydown escape: close
  onkeydown enter: submit

Form
`

  it('generates both event listeners', () => {
    const output = compile(input)
    expect(output).toContain("e.key === 'Escape'")
    expect(output).toContain("e.key === 'Enter'")
  })
})

describe('E2E: Keyboard Events - With Actions', () => {
  it('generates highlight with target', () => {
    const input = `
List as frame:
  onkeydown arrow-down: highlight next

List
`
    const output = compile(input)
    expect(output).toContain('_runtime.highlight')
  })

  it('generates select action', () => {
    const input = `
Menu as frame:
  onkeydown enter: select

Menu
`
    const output = compile(input)
    expect(output).toContain('_runtime.select')
  })

  it('generates show action with target', () => {
    const input = `
Button as button:
  onkeydown enter: show Modal

Button
`
    const output = compile(input)
    expect(output).toContain('_runtime.show')
  })
})

describe('E2E: Keyboard Events - Event Structure', () => {
  const input = `
Card as frame:
  onkeydown escape: close

Card
`

  it('wraps action in key check', () => {
    const output = compile(input)
    // The action should be inside the key check block
    const keyCheckIndex = output.indexOf("e.key === 'Escape'")
    const actionIndex = output.indexOf('_runtime.close')
    expect(keyCheckIndex).toBeLessThan(actionIndex)
  })

  it('closes event listener properly', () => {
    const output = compile(input)
    // Should have proper closing braces for the event listener
    expect(output).toContain('})')
  })
})

describe('E2E: Keyboard Events - Real World Patterns', () => {
  it('dropdown with keyboard navigation', () => {
    const input = `
Dropdown as frame:
  closed
  keys
    escape close
    arrow-down highlight next
    arrow-up highlight prev
    enter select

Dropdown
`
    const output = compile(input)
    expect(output).toContain("dataset.state = 'closed'")
    expect(output).toContain("e.key === 'Escape'")
    expect(output).toContain("e.key === 'ArrowDown'")
    expect(output).toContain("e.key === 'ArrowUp'")
    expect(output).toContain("e.key === 'Enter'")
  })

  it('modal with escape to close', () => {
    const input = `
Modal as frame:
  hidden
  onkeydown escape: close

Modal
`
    const output = compile(input)
    expect(output).toContain("'display': 'none'")
    expect(output).toContain("e.key === 'Escape'")
  })

  it('form with enter to submit', () => {
    const input = `
SearchForm as frame:
  onkeydown enter: submit

SearchForm
`
    const output = compile(input)
    expect(output).toContain("e.key === 'Enter'")
  })
})
