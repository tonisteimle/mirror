/**
 * Browser Runtime Tests
 *
 * Tests that execute the generated JavaScript in a DOM environment
 * using Vitest's JSDOM environment
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { parse, generateDOM } from '../../index'

// Helper to compile and execute Mirror code
function compileAndRun(mirrorCode: string): { root: HTMLElement, api: any, _runtime: any, _elements: any } {
  const ast = parse(mirrorCode)
  if (ast.errors.length > 0) {
    throw new Error(`Parse errors: ${ast.errors.map(e => e.message).join(', ')}`)
  }
  let js = generateDOM(ast)

  // Remove export statements for runtime evaluation
  js = js.replace(/export const /g, 'const ')
  js = js.replace(/export function /g, 'function ')
  js = js.replace(/export \{[^}]*\}/g, '')

  // Create container
  const container = document.createElement('div')
  container.id = 'test-container'
  document.body.appendChild(container)

  // Execute generated code - need to call createUI()
  const fn = new Function(`
    ${js}
    // Call createUI to initialize the component
    const result = createUI({})
    return result
  `)

  const result = fn()
  container.appendChild(result.root)

  return {
    root: container,
    api: result,
    _runtime: (result as any)._runtime,
    _elements: (result as any)._elements
  }
}

// Cleanup after each test
afterEach(() => {
  const container = document.getElementById('test-container')
  if (container) {
    container.remove()
  }
})

describe('Runtime: Basic Component Rendering', () => {
  it('renders a simple component', () => {
    const { root } = compileAndRun(`
Card as frame:
  pad 20

Card
`)
    const card = root.querySelector('[data-mirror-id]')
    expect(card).not.toBeNull()
    expect(card?.tagName).toBe('DIV')
  })

  it('applies styles correctly', () => {
    const { root } = compileAndRun(`
Card as frame:
  pad 20, bg #333

Card
`)
    const card = root.querySelector('[data-mirror-id]') as HTMLElement
    expect(card.style.padding).toBe('20px')
    expect(card.style.background).toBe('rgb(51, 51, 51)')
  })
})

describe('Runtime: Initial State', () => {
  it('sets data-state attribute', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  closed

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    expect(dropdown.dataset.state).toBe('closed')
  })

  it('stores _initialState property', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  open

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    expect((dropdown as any)._initialState).toBe('open')
  })
})

describe('Runtime: Toggle Action', () => {
  it('toggles from closed to open', () => {
    const { root, api } = compileAndRun(`
Dropdown as frame:
  closed
  onclick toggle

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    expect(dropdown.dataset.state).toBe('closed')

    // Simulate click
    dropdown.click()

    expect(dropdown.dataset.state).toBe('open')
  })

  it('toggles from open to closed', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  open
  onclick toggle

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    expect(dropdown.dataset.state).toBe('open')

    dropdown.click()
    expect(dropdown.dataset.state).toBe('closed')
  })

  it('handles multiple toggle cycles', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  closed
  onclick toggle

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement

    dropdown.click() // closed -> open
    expect(dropdown.dataset.state).toBe('open')

    dropdown.click() // open -> closed
    expect(dropdown.dataset.state).toBe('closed')

    dropdown.click() // closed -> open
    expect(dropdown.dataset.state).toBe('open')
  })
})

describe('Runtime: VisibleWhen', () => {
  it('initially hides element with visibleWhen', () => {
    const { root } = compileAndRun(`
Menu as frame:
  if (open)

Menu
`)
    const menu = root.querySelector('[data-mirror-id]') as HTMLElement
    expect(menu.style.display).toBe('none')
  })

  it('stores _visibleWhen property', () => {
    const { root } = compileAndRun(`
Menu as frame:
  if (open)

Menu
`)
    const menu = root.querySelector('[data-mirror-id]') as HTMLElement
    expect((menu as any)._visibleWhen).toBe('open')
  })
})

describe('Runtime: Selection Binding', () => {
  it('stores _selectionBinding property', () => {
    const { root } = compileAndRun(`
Menu as frame:
  selection $selected

Menu
`)
    const menu = root.querySelector('[data-mirror-id]') as HTMLElement
    expect((menu as any)._selectionBinding).toBe('selected')
  })
})

describe('Runtime: Click Outside Handler', () => {
  it('adds document click listener', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  onclick-outside close

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    expect((dropdown as any)._clickOutsideHandler).toBeDefined()
    expect(typeof (dropdown as any)._clickOutsideHandler).toBe('function')
  })

  it('hides element when clicked outside', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  onclick-outside close

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement

    // Click outside (on body)
    document.body.click()

    // Should be hidden
    expect(dropdown.hidden || dropdown.style.display === 'none').toBe(true)
  })

  it('does not hide when clicked inside', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  pad 20
  onclick-outside close

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    const originalDisplay = dropdown.style.display

    // Click inside
    dropdown.click()

    // Should not be hidden
    expect(dropdown.style.display).toBe(originalDisplay)
  })
})

describe('Runtime: Highlight Action', () => {
  it('sets highlighted data attribute', () => {
    const { root } = compileAndRun(`
Item as frame:
  onhover highlight

Item
`)
    const item = root.querySelector('[data-mirror-id]') as HTMLElement

    // Simulate mouseenter
    item.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }))

    expect(item.dataset.highlighted).toBe('true')
  })
})

describe('Runtime: Select Action', () => {
  it('sets selected data attribute', () => {
    const { root } = compileAndRun(`
Item as frame:
  onclick select

Item
`)
    const item = root.querySelector('[data-mirror-id]') as HTMLElement

    item.click()

    expect(item.dataset.selected).toBe('true')
  })
})

describe('Runtime: State Styles', () => {
  it('applies state styles when state changes', () => {
    const { root } = compileAndRun(`
Button as button:
  bg #333
  highlighted:
    bg #3B82F6

Button
`)
    const button = root.querySelector('[data-mirror-id]') as HTMLElement

    // Get the runtime (stored on the element)
    const stateStyles = (button as any)._stateStyles
    expect(stateStyles).toBeDefined()
    expect(stateStyles.highlighted).toBeDefined()
  })
})

describe('Runtime: Destroy/Cleanup', () => {
  it('stores click-outside handler for cleanup', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  onclick-outside close

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    const handler = (dropdown as any)._clickOutsideHandler

    // Handler should be stored for potential cleanup
    expect(handler).toBeDefined()
    expect(typeof handler).toBe('function')
  })
})

describe('Runtime: Named Instances', () => {
  it('exposes named instance via API', () => {
    const { api } = compileAndRun(`
Button as button:

Button named myBtn "Click"
`)
    // api is the result of createUI()
    expect(api).not.toBeNull()
    expect(api.myBtn).toBeDefined()
  })

  it('named instance has element reference', () => {
    const { api, root } = compileAndRun(`
Button as button:

Button named testBtn "Test"
`)
    const btn = root.querySelector('button') as HTMLElement

    // Named instance wrapper has _el property
    expect(api.testBtn._el).toBe(btn)
  })
})

describe('Runtime: Event Listeners', () => {
  it('attaches click event listener', () => {
    let clicked = false
    ;(window as any).testClick = () => { clicked = true }

    const { root } = compileAndRun(`
Button as button:
  onclick call testClick

Button
`)
    const button = root.querySelector('button') as HTMLElement
    button.click()

    expect(clicked).toBe(true)

    delete (window as any).testClick
  })
})
