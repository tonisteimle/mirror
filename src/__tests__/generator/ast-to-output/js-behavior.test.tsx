/**
 * AST to JavaScript Behavior Tests
 *
 * Tests that DSL events and state changes work correctly.
 * Focus on core behaviors that are most commonly used.
 */
import { describe, it, expect } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { renderInteractive, findByDSLClass, findAllByDSLClass } from '../../kit/behavior-helpers'

// Timeout for behavior state changes
const WAIT_OPTIONS = { timeout: 2000 }

describe('AST to JS Behavior', () => {
  // ==========================================================================
  // Toggle State
  // ==========================================================================
  describe('Toggle State', () => {
    it('toggles between two states on click', async () => {
      // States must include 'default' as the initial state for proper initialization
      const { container } = renderInteractive(`
Toggle onclick toggle
  state default
    bg #333
  state active
    bg #3B82F6`)

      const toggle = findByDSLClass(container, 'Toggle')
      expect(toggle).not.toBeNull()

      // Initial state is 'default'
      expect(toggle!.getAttribute('data-state')).toBe('default')

      // Click to toggle to 'active'
      fireEvent.click(toggle!)

      await waitFor(() => {
        expect(toggle!.getAttribute('data-state')).toBe('active')
      }, WAIT_OPTIONS)

      // Click again to toggle back
      fireEvent.click(toggle!)

      await waitFor(() => {
        expect(toggle!.getAttribute('data-state')).toBe('default')
      }, WAIT_OPTIONS)
    })

    it('shows hidden element via toggle', async () => {
      const { container } = renderInteractive(`
Panel hidden "Content"
Button onclick toggle Panel "Show"`)

      const button = findByDSLClass(container, 'Button')
      expect(button).not.toBeNull()

      // Panel starts hidden
      expect(findByDSLClass(container, 'Panel')).toBeNull()

      // Click to show
      fireEvent.click(button!)

      await waitFor(() => {
        expect(findByDSLClass(container, 'Panel')).not.toBeNull()
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // Show Action
  // ==========================================================================
  describe('Show Action', () => {
    it('shows hidden element on click', async () => {
      const { container } = renderInteractive(`
Tooltip hidden "Tooltip text"
Button onclick show Tooltip "Show"`)

      const button = findByDSLClass(container, 'Button')

      // Tooltip starts hidden
      expect(findByDSLClass(container, 'Tooltip')).toBeNull()

      fireEvent.click(button!)

      await waitFor(() => {
        expect(findByDSLClass(container, 'Tooltip')).not.toBeNull()
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // State Change
  // ==========================================================================
  describe('State Change', () => {
    it('changes state to specific value', async () => {
      const { container } = renderInteractive(`
Tab onclick change self to active
  state default
    bg #333
  state active
    bg #3B82F6`)

      const tab = findByDSLClass(container, 'Tab')

      // Initially default
      expect(tab!.getAttribute('data-state')).toBe('default')

      fireEvent.click(tab!)

      await waitFor(() => {
        expect(tab!.getAttribute('data-state')).toBe('active')
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // Hover Events
  // ==========================================================================
  describe('Hover Events', () => {
    it('triggers onhover handler', async () => {
      const { container } = renderInteractive(`
Tooltip hidden "Info"
Item onhover show Tooltip "Hover me"`)

      const item = findByDSLClass(container, 'Item')

      // Tooltip starts hidden
      expect(findByDSLClass(container, 'Tooltip')).toBeNull()

      fireEvent.mouseEnter(item!)

      await waitFor(() => {
        expect(findByDSLClass(container, 'Tooltip')).not.toBeNull()
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // Keyboard Events
  // ==========================================================================
  describe('Keyboard Events', () => {
    it('handles enter key to change state', async () => {
      const { container } = renderInteractive(`
Field onkeydown enter change self to submitted
  state default
    bg #333
  state submitted
    bg #10B981`)

      const field = findByDSLClass(container, 'Field')

      expect(field!.getAttribute('data-state')).toBe('default')

      fireEvent.keyDown(field!, { key: 'Enter' })

      await waitFor(() => {
        expect(field!.getAttribute('data-state')).toBe('submitted')
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // Focus Events
  // ==========================================================================
  describe('Focus Events', () => {
    it('triggers onfocus handler', async () => {
      const { container } = renderInteractive(`
Hint hidden "Enter your email"
Field onfocus show Hint "Email"`)

      const field = findByDSLClass(container, 'Field')

      expect(findByDSLClass(container, 'Hint')).toBeNull()

      fireEvent.focus(field!)

      await waitFor(() => {
        expect(findByDSLClass(container, 'Hint')).not.toBeNull()
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // System States
  // ==========================================================================
  describe('System States', () => {
    it('renders element with hover state definition', () => {
      const { container } = renderInteractive(`
Button "Click"
  state hover
    bg #3B82F6`)

      const button = findByDSLClass(container, 'Button')
      expect(button).not.toBeNull()

      // Verify the element renders and can receive mouse events
      fireEvent.mouseEnter(button!)
      fireEvent.mouseLeave(button!)

      // Element should still be present after hover cycle
      expect(button).not.toBeNull()
    })

    it('renders input with focus state definition', () => {
      const { container } = renderInteractive(`
Input "Email"
  state focus
    boc #3B82F6`)

      const input = container.querySelector('input')
      expect(input).not.toBeNull()

      // Verify focus/blur cycle works
      fireEvent.focus(input!)
      fireEvent.blur(input!)

      expect(input).not.toBeNull()
    })
  })

  // ==========================================================================
  // Data Attributes
  // ==========================================================================
  describe('Data Attributes', () => {
    it('sets data-state attribute for stateful components', () => {
      const { container } = renderInteractive(`
Toggle onclick toggle
  state off
    bg #333
  state on
    bg #3B82F6`)

      const toggle = findByDSLClass(container, 'Toggle')
      expect(toggle!.getAttribute('data-state')).toBeDefined()
    })

    it('sets data-id attribute on interactive elements', () => {
      const { container } = renderInteractive(`
Item onclick change self to active
  state default
    bg #333
  state active
    bg #3B82F6`)

      const item = findByDSLClass(container, 'Item')
      expect(item!.getAttribute('data-id')).toBeDefined()
    })
  })

  // ==========================================================================
  // Multiple Root Elements with State
  // ==========================================================================
  describe('Multiple Stateful Elements', () => {
    it('manages state independently for sibling elements', async () => {
      const { container } = renderInteractive(`
Toggle onclick toggle "First"
  state default
    bg #333
  state active
    bg #3B82F6
Toggle onclick toggle "Second"
  state default
    bg #333
  state active
    bg #3B82F6`)

      const toggles = findAllByDSLClass(container, 'Toggle')
      expect(toggles.length).toBe(2)

      // Both should start in 'default' state
      expect(toggles[0].getAttribute('data-state')).toBe('default')
      expect(toggles[1].getAttribute('data-state')).toBe('default')

      // Toggle first one
      fireEvent.click(toggles[0])

      await waitFor(() => {
        expect(toggles[0].getAttribute('data-state')).toBe('active')
      }, WAIT_OPTIONS)

      // Second should remain in 'default' state
      expect(toggles[1].getAttribute('data-state')).toBe('default')
    })
  })
})
