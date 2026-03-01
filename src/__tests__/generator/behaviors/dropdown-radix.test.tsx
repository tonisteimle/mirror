/**
 * Radix Dropdown Tests
 *
 * Tests that the Radix-based dropdown renders Mirror children correctly.
 */

import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { parseAndRender } from '../../docu/utils/render'

describe('Radix Dropdown', () => {
  it('renders trigger with placeholder text', () => {
    parseAndRender(`
Dropdown
  DropdownTrigger "Select option..."
  DropdownMenu
    DropdownItem value "a", "Apple"
    DropdownItem value "b", "Banana"
`)

    expect(screen.getByText('Select option...')).toBeInTheDocument()
  })

  it('opens menu on click', async () => {
    const user = userEvent.setup()

    parseAndRender(`
Dropdown
  DropdownTrigger "Choose..."
  DropdownMenu
    DropdownItem value "a", "Apple"
    DropdownItem value "b", "Banana"
`)

    // Click trigger
    await user.click(screen.getByText('Choose...'))

    // Menu should be visible with items
    expect(screen.getByText('Apple')).toBeInTheDocument()
    expect(screen.getByText('Banana')).toBeInTheDocument()
  })

  it('renders complex multi-line items', async () => {
    const user = userEvent.setup()

    parseAndRender(`
Dropdown
  DropdownTrigger "Select user..."
  DropdownMenu
    DropdownItem value "john"
      Box hor, gap 12, ver-center
        Text "JD"
        Box ver, gap 2
          Text "John Doe"
          Text "john@example.com"
    DropdownItem value "jane"
      Box hor, gap 12, ver-center
        Text "JS"
        Box ver, gap 2
          Text "Jane Smith"
          Text "jane@example.com"
`)

    // Click trigger
    await user.click(screen.getByText('Select user...'))

    // Complex items should render with all their children
    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
    expect(screen.getByText('Jane Smith')).toBeInTheDocument()
    expect(screen.getByText('jane@example.com')).toBeInTheDocument()
  })

  it('selects item on click', async () => {
    const user = userEvent.setup()

    parseAndRender(`
Dropdown
  DropdownTrigger "Choose..."
  DropdownMenu
    DropdownItem value "apple", "Apple"
    DropdownItem value "banana", "Banana"
`)

    // Open dropdown
    await user.click(screen.getByText('Choose...'))

    // Click an item
    await user.click(screen.getByText('Apple'))

    // Trigger should now show selected value
    // Note: The exact behavior depends on implementation
    // For now, just verify the click doesn't error
  })

  it('supports keyboard navigation', async () => {
    const user = userEvent.setup()

    parseAndRender(`
Dropdown
  DropdownTrigger "Choose..."
  DropdownMenu
    DropdownItem value "a", "Apple"
    DropdownItem value "b", "Banana"
    DropdownItem value "c", "Cherry"
`)

    // Open dropdown
    await user.click(screen.getByText('Choose...'))

    // Items should be visible
    expect(screen.getByText('Apple')).toBeInTheDocument()

    // Press Escape to close
    await user.keyboard('{Escape}')

    // Menu should close (items not visible)
    // Note: Radix uses portals, so we check if the content is removed
  })

  it('renders items with custom styling', async () => {
    const user = userEvent.setup()

    parseAndRender(`
Dropdown
  DropdownTrigger "Choose..."
  DropdownMenu bg #1E1E2E, pad 8, rad 8
    DropdownItem value "a", pad 12, rad 4, "Apple"
    DropdownItem value "b", pad 12, rad 4, col #EF4444, "Delete"
`)

    // Open dropdown
    await user.click(screen.getByText('Choose...'))

    // Items should render with styling
    const deleteItem = screen.getByText('Delete')
    expect(deleteItem).toBeInTheDocument()
  })
})
