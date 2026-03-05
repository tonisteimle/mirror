/**
 * Mirror Compiler E2E Tests
 *
 * Tests the full compilation pipeline:
 * Mirror Code → Parser → IR → DOM Backend → Generated JS
 *
 * Each test defines:
 * - input: Mirror source code
 * - expects: What should appear in the generated output
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

describe('E2E: Simple Component', () => {
  const input = `
Card as frame:
  pad 20, bg #1a1a23, rad 8

Card
`

  it('generates correct HTML element', () => {
    const output = compile(input)
    // frame → div
    expect(output).toContain("document.createElement('div')")
  })

  it('generates correct padding style', () => {
    const output = compile(input)
    expect(output).toContain("'padding': '20px'")
  })

  it('generates correct background style', () => {
    const output = compile(input)
    expect(output).toContain("'background': '#1a1a23'")
  })

  it('generates correct border-radius style', () => {
    const output = compile(input)
    expect(output).toContain("'border-radius': '8px'")
  })

  it('generates flex layout for frame', () => {
    const output = compile(input)
    expect(output).toContain("'display': 'flex'")
    expect(output).toContain("'flex-direction': 'column'")
  })
})

describe('E2E: Component with Children', () => {
  const input = `
Card as frame:
  pad 16, gap 12

Title as text:
  weight 600

Card
  Title "Hello World"
`

  it('generates parent element', () => {
    const output = compile(input)
    expect(output).toContain("// Card")
    expect(output).toContain("document.createElement('div')")
  })

  it('generates child text element', () => {
    const output = compile(input)
    // text → span
    expect(output).toContain("document.createElement('span')")
  })

  it('generates text content', () => {
    const output = compile(input)
    expect(output).toContain('textContent = "Hello World"')
  })

  it('generates gap style', () => {
    const output = compile(input)
    expect(output).toContain("'gap': '12px'")
  })

  it('appends child to parent', () => {
    const output = compile(input)
    // Child should be appended to parent
    expect(output).toMatch(/node_\d+\.appendChild\(node_\d+\)/)
  })
})

describe('E2E: Design Tokens', () => {
  const input = `
primary: #3B82F6
surface: #1a1a23

Card as frame:
  bg surface

Card
`

  it('generates CSS variables', () => {
    const output = compile(input)
    expect(output).toContain('--primary: #3B82F6')
    expect(output).toContain('--surface: #1a1a23')
  })

  it('uses CSS variable for token reference', () => {
    const output = compile(input)
    expect(output).toContain("'background': 'var(--surface)'")
  })

  it('generates tokens object', () => {
    const output = compile(input)
    expect(output).toContain('"primary": "#3B82F6"')
    expect(output).toContain('"surface": "#1a1a23"')
  })
})

describe('E2E: Hover State', () => {
  const input = `
Button as button:
  bg #3B82F6
  hover
    bg #2563EB

Button "Click"
`

  it('generates base background style', () => {
    const output = compile(input)
    expect(output).toContain("'background': '#3B82F6'")
  })

  it('generates CSS :hover rule', () => {
    const output = compile(input)
    expect(output).toMatch(/\[data-mirror-id="[^"]+"\]:hover/)
    expect(output).toContain('background: #2563EB !important')
  })

  it('generates button element', () => {
    const output = compile(input)
    expect(output).toContain("document.createElement('button')")
  })

  it('generates button text content', () => {
    const output = compile(input)
    expect(output).toContain('textContent = "Click"')
  })
})

describe('E2E: Events and Actions', () => {
  const input = `
Modal as frame:
  hidden

Button as button:
  onclick show Modal

Button "Open"
Modal
`

  it('generates event listener', () => {
    const output = compile(input)
    expect(output).toContain("addEventListener('click'")
  })

  it('generates show action', () => {
    const output = compile(input)
    expect(output).toContain('_runtime.show')
  })

  it('generates hidden style', () => {
    const output = compile(input)
    expect(output).toContain("'display': 'none'")
  })
})

describe('E2E: Named Instances', () => {
  const input = `
Button as button:
  pad 12

Button named saveBtn "Save"
`

  it('stores named instance in _elements', () => {
    const output = compile(input)
    expect(output).toContain("_elements['saveBtn']")
  })

  it('exposes named instance in API', () => {
    const output = compile(input)
    expect(output).toContain('get saveBtn()')
  })
})

// ============================================
// DROPDOWN FEATURES E2E TESTS
// ============================================

describe('E2E: Initial State (Dropdown)', () => {
  const input = `
Dropdown as frame:
  closed
  pad 8

Dropdown
`

  it('generates data-state attribute', () => {
    const output = compile(input)
    expect(output).toContain("dataset.state = 'closed'")
  })

  it('generates _initialState property', () => {
    const output = compile(input)
    expect(output).toContain("_initialState = 'closed'")
  })

  it('supports open initial state', () => {
    const openInput = `
Panel as frame:
  open

Panel
`
    const output = compile(openInput)
    expect(output).toContain("dataset.state = 'open'")
  })

  it('supports collapsed/expanded states', () => {
    const collapsedInput = `
Accordion as frame:
  collapsed

Accordion
`
    const expandedInput = `
Accordion as frame:
  expanded

Accordion
`
    expect(compile(collapsedInput)).toContain("dataset.state = 'collapsed'")
    expect(compile(expandedInput)).toContain("dataset.state = 'expanded'")
  })
})

describe('E2E: Click Outside Event', () => {
  const input = `
Dropdown as frame:
  onclick-outside close

Dropdown
`

  it('generates document click listener', () => {
    const output = compile(input)
    expect(output).toContain("document.addEventListener('click'")
  })

  it('generates contains check', () => {
    const output = compile(input)
    expect(output).toContain('.contains(e.target)')
  })

  it('generates close action', () => {
    const output = compile(input)
    expect(output).toContain('_runtime.close') // close sets state to "closed"
  })

  it('stores handler for cleanup', () => {
    const output = compile(input)
    expect(output).toContain('_clickOutsideHandler')
  })
})

describe('E2E: Visible When State', () => {
  const input = `
Menu as frame:
  if (open)
  pad 8

Menu
`

  it('generates visibleWhen metadata', () => {
    const output = compile(input)
    expect(output).toContain("_visibleWhen = 'open'")
  })

  it('generates initial hidden state', () => {
    const output = compile(input)
    expect(output).toContain("style.display = 'none'")
  })

  it('handles complex conditions', () => {
    const complexInput = `
Panel as frame:
  if (open && hasItems)

Panel
`
    const output = compile(complexInput)
    expect(output).toContain("_visibleWhen = '(open && hasItems)'")
  })
})

describe('E2E: Selection Binding', () => {
  const input = `
Menu as frame:
  selection $selected

Menu
`

  it('generates selection binding metadata', () => {
    const output = compile(input)
    expect(output).toContain("_selectionBinding = 'selected'")
  })
})

describe('E2E: Toggle with Dropdown States', () => {
  const input = `
Dropdown as frame:
  closed
  onclick toggle

Dropdown
`

  it('generates toggle event listener', () => {
    const output = compile(input)
    expect(output).toContain("addEventListener('click'")
    expect(output).toContain('_runtime.toggle')
  })

  it('toggle runtime handles open/closed states', () => {
    const output = compile(input)
    // The runtime toggle method should handle open/closed
    expect(output).toContain('currentState === "closed"')
    expect(output).toContain('currentState === "open"')
    expect(output).toContain('setState(el, newState)')
  })
})

describe('E2E: Runtime Visibility Update', () => {
  const input = `
Card as frame:
`

  it('generates updateVisibility method', () => {
    const output = compile(input)
    expect(output).toContain('updateVisibility(el)')
  })

  it('setState calls updateVisibility', () => {
    const output = compile(input)
    expect(output).toContain('this.updateVisibility(el)')
  })

  it('updateVisibility checks _visibleWhen', () => {
    const output = compile(input)
    expect(output).toContain('child._visibleWhen')
  })
})

describe('E2E: Cleanup Method', () => {
  const input = `
Card as frame:
`

  it('generates destroy method', () => {
    const output = compile(input)
    expect(output).toContain('destroy(el)')
  })

  it('destroy removes click-outside handler', () => {
    const output = compile(input)
    expect(output).toContain("removeEventListener('click', el._clickOutsideHandler)")
  })

  it('destroy recursively cleans children', () => {
    const output = compile(input)
    expect(output).toContain('this.destroy(child)')
  })
})

describe('E2E: Complete Dropdown Pattern', () => {
  const input = `
$selected: "Select..."

Item as frame:
  pad 8 12
  cursor pointer
  onhover highlight
  onclick select
  highlighted:
    bg #333

Dropdown as frame:
  closed
  onclick-outside close

Dropdown named dropdown1
  - Item "Option 1"
  - Item "Option 2"
  - Item "Option 3"
`

  it('compiles without errors', () => {
    expect(() => compile(input)).not.toThrow()
  })

  it('generates dropdown with initialState', () => {
    const output = compile(input)
    expect(output).toContain("dataset.state = 'closed'")
  })

  it('generates onclick-outside handler', () => {
    const output = compile(input)
    expect(output).toContain("document.addEventListener('click'")
    expect(output).toContain('.contains(e.target)')
  })

  it('generates items with hover highlight', () => {
    const output = compile(input)
    expect(output).toContain("addEventListener('mouseenter'")
    expect(output).toContain('_runtime.highlight')
  })

  it('generates items with click select', () => {
    const output = compile(input)
    expect(output).toContain('_runtime.select')
  })

  it('generates highlighted state styles', () => {
    const output = compile(input)
    expect(output).toContain("'highlighted'")
    expect(output).toContain("'background': '#333'")
  })

  it('generates named instance accessor', () => {
    const output = compile(input)
    expect(output).toContain('get dropdown1()')
  })

  it('generates token for selection variable', () => {
    const output = compile(input)
    // Token $selected is stored with $ prefix
    expect(output).toContain('--$selected')
    expect(output).toContain('"Select..."')
  })
})
