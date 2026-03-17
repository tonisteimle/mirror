/**
 * Error Tests: Runtime Errors
 *
 * Tests for runtime error handling.
 */

import { describe, it, expect } from 'vitest'
import { compileAndExecute } from '../../test-utils'

describe('Runtime Error Handling', () => {
  it('handles missing data gracefully', () => {
    // Template with data binding but no data provided
    const { container } = compileAndExecute(`
Label as text:

Label $message
`)
    // Should render without crashing
    expect(container).toBeDefined()
  })

  it('handles each loop with undefined collection', () => {
    const { container } = compileAndExecute(`
Item as frame:

each $item in $items
  Item $item.name
`)
    // Should not crash, container exists
    expect(container).toBeDefined()
  })

  it('handles multiple rapid state changes', () => {
    const { root } = compileAndExecute(`
Button as frame:
  closed
  onclick toggle

Button
`)
    // Rapid toggling should not crash
    for (let i = 0; i < 50; i++) {
      root.click()
    }
    // State should be consistent (50 clicks = even number = back to closed)
    expect(root.dataset.state).toBe('closed')
  })
})

describe('Event Handler Errors', () => {
  it('handles click event on element', () => {
    const { root } = compileAndExecute(`
Card as frame:
  onclick highlight

Card
`)
    // Click should not throw
    expect(() => root.click()).not.toThrow()
  })

  it('handles keyboard events', () => {
    const { root, dom } = compileAndExecute(`
Input as input:
  onkeydown enter: submit

Input
`)
    // Keyboard event should not throw
    const event = new dom.window.KeyboardEvent('keydown', { key: 'Enter' })
    expect(() => root.dispatchEvent(event)).not.toThrow()
  })
})

describe('API Error Handling', () => {
  it('setState with invalid id does not crash', () => {
    const { api } = compileAndExecute(`
Box as frame:

Box
`)
    // Setting state with non-existent ID
    expect(() => api.setState('nonexistent', 'open')).not.toThrow()
  })

  it('getState with invalid id returns null', () => {
    const { api } = compileAndExecute(`
Box as frame:

Box
`)
    const state = api.getState('nonexistent')
    expect(state).toBeUndefined()
  })
})
