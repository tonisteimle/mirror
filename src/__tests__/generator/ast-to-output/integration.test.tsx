/**
 * AST to Output Integration Tests
 *
 * Tests complex component scenarios that combine structure, styles, and behavior.
 */
import { describe, it, expect } from 'vitest'
import { fireEvent, waitFor } from '@testing-library/react'
import { parse } from '../../../parser/parser'
import { propertiesToStyle } from '../../../utils/style-converter'
import { getGeneratedStyle, expectDSLStyles } from '../../kit/style-assertions'
import { renderInteractive, findByDSLClass, findAllByDSLClass } from '../../kit/behavior-helpers'

// Timeout for behavior state changes
const WAIT_OPTIONS = { timeout: 2000 }

describe('Integration Tests', () => {
  // ==========================================================================
  // Card Component
  // ==========================================================================
  describe('Card Component', () => {
    it('renders complete card with styles', () => {
      // Use getGeneratedStyle for pure style testing
      expectDSLStyles('Card 300 bg #1A1A23 pad 24 rad 12', {
        width: '300px',
        backgroundColor: '#1A1A23',
        padding: '24px',
        borderRadius: '12px',
      })
    })

    it('renders card structure in DOM', () => {
      const { container } = renderInteractive(`
Card 300 bg #1A1A23 pad 24 rad 12
  Title size 20 weight 600 "Project Alpha"
  Text col #9CA3AF "Description"`)

      const card = container.querySelector('.Card')
      expect(card).not.toBeNull()

      const title = card?.querySelector('.Title')
      const text = card?.querySelector('.Text')

      expect(title?.textContent).toBe('Project Alpha')
      expect(text?.textContent).toBe('Description')
    })

    it('renders card with interactive button', async () => {
      const { container } = renderInteractive(`
Card 300 bg #1A1A23 pad 24 rad 12
  Title size 20 weight 600 "Project"
  Actions hor gap 8
    Button bg #3B82F6 onclick change self to active "Submit"
      state default
        bg #3B82F6
      state active
        bg #10B981`)

      const button = findByDSLClass(container, 'Button')
      expect(button).not.toBeNull()

      fireEvent.click(button!)

      await waitFor(() => {
        expect(button!.getAttribute('data-state')).toBe('active')
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // Navigation Component
  // ==========================================================================
  describe('Navigation Component', () => {
    it('renders nav with tabs', () => {
      const { container } = renderInteractive(`
Nav hor gap 4 bg #1E1E1E pad 4 rad 8
  Tab pad 12 rad 6 "Dashboard"
  Tab pad 12 rad 6 "Settings"
  Tab pad 12 rad 6 "Profile"`)

      const tabs = container.querySelectorAll('.Tab')
      expect(tabs.length).toBe(3)
    })
  })

  // ==========================================================================
  // Toggle Component
  // ==========================================================================
  describe('Toggle Component', () => {
    it('renders toggle with knob', () => {
      const { container } = renderInteractive(`
Toggle w 52 h 28 rad 14 onclick toggle
  state default
    bg #333
  state active
    bg #3B82F6
  Knob 24 24 rad 12 bg white`)

      const toggle = findByDSLClass(container, 'Toggle')
      const knob = findByDSLClass(container, 'Knob')

      expect(toggle).not.toBeNull()
      expect(knob).not.toBeNull()
    })

    it('toggles state on click', async () => {
      const { container } = renderInteractive(`
Toggle onclick toggle
  state default
    bg #333
  state active
    bg #3B82F6`)

      const toggle = findByDSLClass(container, 'Toggle')

      fireEvent.click(toggle!)

      await waitFor(() => {
        expect(toggle!.getAttribute('data-state')).toBe('active')
      }, WAIT_OPTIONS)
    })
  })

  // ==========================================================================
  // Form Component
  // ==========================================================================
  describe('Form Component', () => {
    it('renders form with inputs', () => {
      const { container } = renderInteractive(`
Form vertical gap 16
  Field vertical gap 4
    Label size 14 weight 500 "Email"
    Input pad 12 rad 8 bor 1 boc #333 "Enter email"
  Field vertical gap 4
    Label size 14 weight 500 "Password"
    Input type password pad 12 rad 8 bor 1 boc #333 "Enter password"
  Button bg #3B82F6 pad 12 rad 8 "Submit"`)

      const inputs = container.querySelectorAll('input')
      expect(inputs.length).toBe(2)

      const labels = container.querySelectorAll('.Label')
      expect(labels.length).toBe(2)
    })
  })

  // ==========================================================================
  // Accordion Component
  // ==========================================================================
  describe('Accordion Component', () => {
    it('renders accordion with items', () => {
      const { container } = renderInteractive(`
Accordion vertical gap 2
  - AccordionItem bg #1E1E1E pad 16 "Section 1"
  - AccordionItem bg #1E1E1E pad 16 "Section 2"`)

      const items = findAllByDSLClass(container, 'AccordionItem')
      expect(items.length).toBe(2)
    })
  })

  // ==========================================================================
  // Token Usage
  // ==========================================================================
  describe('Token Usage', () => {
    it('applies token values to styles', () => {
      const result = parse(`
$primary: #3B82F6
$spacing: 16
$radius: 8

Button bg $primary pad $spacing rad $radius "Click me"`)

      const node = result.nodes[0]
      expect(node).toBeDefined()

      const style = propertiesToStyle(node.properties, false, node.name)
      expect(style.backgroundColor).toBe('#3B82F6')
      expect(style.padding).toBe('16px')
      expect(style.borderRadius).toBe('8px')
    })
  })

  // ==========================================================================
  // Component Inheritance
  // ==========================================================================
  describe('Component Inheritance', () => {
    it('inherits properties from parent component', () => {
      const result = parse(`
Button: pad 12 rad 8 bg #3B82F6

PrimaryButton from Button: bg #10B981
PrimaryButton "Success"`)

      // Find the rendered node
      const node = result.nodes[0]
      expect(node).toBeDefined()
      expect(node.name).toBe('PrimaryButton')

      const style = propertiesToStyle(node.properties, false, node.name)
      // Should have inherited padding and radius from Button
      expect(style.padding).toBe('12px')
      expect(style.borderRadius).toBe('8px')
      // Should have overridden backgroundColor
      expect(style.backgroundColor).toBe('#10B981')
    })
  })

  // ==========================================================================
  // Complex Layout
  // ==========================================================================
  describe('Complex Layout', () => {
    it('renders dashboard layout', () => {
      const { container } = renderInteractive(`
Dashboard hor gap 16
  Sidebar w 250 ver bg #1E1E1E pad 16
    Logo h 48 bg #333 rad 8 "Logo"
    Nav ver gap 4
      NavItem pad 12 rad 6 "Dashboard"
      NavItem pad 12 rad 6 "Projects"
  Main grow ver gap 16
    Header hor between pad 16 bg #1E1E1E rad 8
      Title size 24 weight 600 "Dashboard"`)

      // Check structure
      const sidebar = container.querySelector('.Sidebar')
      const main = container.querySelector('.Main')

      expect(sidebar).not.toBeNull()
      expect(main).not.toBeNull()

      // Check Logo in sidebar
      expect(sidebar?.querySelector('.Logo')).not.toBeNull()

      // Check NavItems
      const navItems = container.querySelectorAll('.NavItem')
      expect(navItems.length).toBe(2)
    })
  })

  // ==========================================================================
  // Grid Layout
  // ==========================================================================
  describe('Grid Layout', () => {
    it('renders grid with multiple cards', () => {
      const { container } = renderInteractive(`
Content grid 3 gap 16
  Card pad 16 bg #1E1E1E rad 8 "Card 1"
  Card pad 16 bg #1E1E1E rad 8 "Card 2"
  Card pad 16 bg #1E1E1E rad 8 "Card 3"`)

      const content = container.querySelector('.Content')
      expect(content).not.toBeNull()

      const cards = container.querySelectorAll('.Card')
      expect(cards.length).toBe(3)
    })

    it('applies grid styles correctly', () => {
      const style = getGeneratedStyle('Grid grid 3 gap 16')
      expect(style.display).toBe('grid')
      expect(style.gridTemplateColumns).toBe('repeat(3, 1fr)')
      expect(style.gap).toBe('16px')
    })
  })

  // ==========================================================================
  // Combined Styles
  // ==========================================================================
  describe('Combined Styles', () => {
    it('handles complete button styling', () => {
      // Note: Multi-value padding is expanded to individual directions
      expectDSLStyles('Button bg #3B82F6 pad 12 rad 8 cursor pointer', {
        backgroundColor: '#3B82F6',
        padding: '12px',
        borderRadius: '8px',
        cursor: 'pointer',
      })
    })

    it('handles complete card styling', () => {
      expectDSLStyles('Card w 300 h 200 bg #1E1E1E pad 24 rad 12 shadow', {
        width: '300px',
        height: '200px',
        backgroundColor: '#1E1E1E',
        padding: '24px',
        borderRadius: '12px',
      })
    })

    it('handles input styling', () => {
      expectDSLStyles('Input pad 12 rad 8 bor 1 boc #333', {
        padding: '12px',
        borderRadius: '8px',
        border: '1px solid',
        borderColor: '#333',
      })
    })
  })
})
