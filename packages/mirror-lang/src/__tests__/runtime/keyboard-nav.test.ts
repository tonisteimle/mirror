/**
 * Keyboard Navigation Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, afterEach } from 'vitest'
import { parse, generateDOM } from '../../index'

// Helper to compile and execute Mirror code
function compileAndRun(mirrorCode: string): { root: HTMLElement; api: any } {
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

  // Execute generated code
  const fn = new Function(`
    ${js}
    const result = createUI({})
    return result
  `)

  const result = fn()
  container.appendChild(result.root)

  return { root: container, api: result }
}

afterEach(() => {
  const container = document.getElementById('test-container')
  if (container) {
    container.remove()
  }
})

describe('Keyboard Navigation', () => {
  it('highlights next item on ArrowDown', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  closed
  onclick toggle

  keys
    arrow-down highlight next
    arrow-up highlight prev

  if (open)
    Menu as frame:
      Item as frame:
        cursor pointer
        onhover highlight
        state highlighted
          bg #444

      Item "Option A"
      Item "Option B"
      Item "Option C"

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement

    // First, click to open
    dropdown.click()
    expect(dropdown.dataset.state).toBe('open')

    // Focus the dropdown
    dropdown.focus()

    // Check items have cursor pointer (are highlightable)
    const items = root.querySelectorAll('[style*="cursor: pointer"]')
    console.log('Items with cursor pointer:', items.length)

    // Press ArrowDown
    const event = new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })
    dropdown.dispatchEvent(event)

    // Check if any item got highlighted
    const highlighted = root.querySelector('[data-highlighted="true"]')
    expect(highlighted).not.toBeNull()
  })

  it('highlights previous item on ArrowUp', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  open
  onclick toggle

  keys
    arrow-down highlight next
    arrow-up highlight prev

  Menu as frame:
    Item as frame:
      cursor pointer
      onhover highlight
      state highlighted
        bg #444

    Item "Option A"
    Item "Option B"
    Item "Option C"

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    dropdown.focus()

    // Press ArrowDown twice to highlight second item
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    // Press ArrowUp to go back to first item
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }))

    // First item should be highlighted
    const highlighted = root.querySelector('[data-highlighted="true"]')
    expect(highlighted).not.toBeNull()
    expect(highlighted?.textContent).toBe('Option A')
  })

  it('selects highlighted item on Enter', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  open
  onclick toggle

  keys
    arrow-down highlight next
    enter select highlighted

  Menu as frame:
    Item as frame:
      cursor pointer
      onhover highlight
      onclick select
      state highlighted
        bg #444
      state selected
        bg #2563EB

    Item "Option A"
    Item "Option B"

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    dropdown.focus()

    // Press ArrowDown to highlight first item
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))

    // Press Enter to select
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))

    // First item should be selected
    const selected = root.querySelector('[data-selected="true"]')
    expect(selected).not.toBeNull()
    expect(selected?.textContent).toBe('Option A')
  })

  it('closes on Escape', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  closed
  onclick toggle

  keys
    escape close

  if (open)
    Menu as frame:
      Item "Option A"

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement

    // First open the dropdown
    dropdown.click()
    expect(dropdown.dataset.state).toBe('open')

    dropdown.focus()
    dropdown.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))

    // Dropdown should be closed (state = "closed")
    expect(dropdown.dataset.state).toBe('closed')
  })

  it('clears previous selection when selecting new item', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  open

  Menu as frame:
    Item as frame:
      cursor pointer
      onclick select
      state selected
        bg #2563EB

    Item "Option A"
    Item "Option B"

Dropdown
`)
    const items = root.querySelectorAll('[style*="cursor: pointer"]') as NodeListOf<HTMLElement>
    expect(items.length).toBe(2)

    // Click first item
    items[0].click()
    expect(items[0].dataset.selected).toBe('true')

    // Click second item
    items[1].click()
    expect(items[1].dataset.selected).toBe('true')
    expect(items[0].dataset.selected).toBeUndefined()
  })

  it('updates selection binding when selecting', () => {
    const { root } = compileAndRun(`
Dropdown as frame:
  open
  selection $selected

  Menu as frame:
    Item as frame:
      cursor pointer
      onclick select

    Item "Option A"
    Item "Option B"

Dropdown
`)
    const dropdown = root.querySelector('[data-mirror-id]') as HTMLElement
    expect((dropdown as any)._selectionBinding).toBe('selected')

    const items = root.querySelectorAll('[style*="cursor: pointer"]') as NodeListOf<HTMLElement>

    // Click first item
    items[0].click()

    // Check global state was updated
    expect((window as any)._mirrorState?.selected).toBe('Option A')
  })
})
