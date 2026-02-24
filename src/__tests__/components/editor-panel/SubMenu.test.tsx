/**
 * SubMenu Component Tests
 *
 * Tests for the SubMenu component:
 * - Rendering items
 * - Selection handling
 * - Hover state (delete button visibility)
 * - Double-click rename
 * - Keyboard handling (Enter, Escape)
 * - Delete functionality
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SubMenu } from '../../../components/editor-panel/SubMenu'

// Test fixtures
const mockItems = [
  { id: '1', name: 'Header' },
  { id: '2', name: 'Main' },
  { id: '3', name: 'Footer' },
]

describe('SubMenu', () => {
  // ==========================================================================
  // Basic Rendering
  // ==========================================================================
  describe('rendering', () => {
    it('renders all items', () => {
      render(<SubMenu items={mockItems} />)

      expect(screen.getByText('Header')).toBeDefined()
      expect(screen.getByText('Main')).toBeDefined()
      expect(screen.getByText('Footer')).toBeDefined()
    })

    it('renders empty when no items', () => {
      const { container } = render(<SubMenu items={[]} />)

      const menu = container.firstChild as HTMLElement
      expect(menu.children.length).toBe(0)
    })

    it('renders with correct container styles', () => {
      const { container } = render(<SubMenu items={mockItems} />)

      const menu = container.firstChild as HTMLElement
      expect(menu.style.display).toBe('flex')
      expect(menu.style.flexDirection).toBe('column')
    })
  })

  // ==========================================================================
  // Selection
  // ==========================================================================
  describe('selection', () => {
    it('calls onSelect when clicking item', () => {
      const onSelect = vi.fn()
      render(<SubMenu items={mockItems} onSelect={onSelect} />)

      fireEvent.click(screen.getByText('Main'))
      expect(onSelect).toHaveBeenCalledWith('2')
    })

    it('does not call onSelect when not provided', () => {
      // Should not throw
      render(<SubMenu items={mockItems} />)
      fireEvent.click(screen.getByText('Main'))
    })

    it('highlights active item with different color', () => {
      render(<SubMenu items={mockItems} activeId="2" />)

      const mainItem = screen.getByText('Main').closest('div') as HTMLElement
      const headerItem = screen.getByText('Header').closest('div') as HTMLElement

      // Active item should have text color, inactive should have muted color
      expect(mainItem.style.color).not.toBe(headerItem.style.color)
    })

    it('has pointer cursor when onSelect is provided', () => {
      render(<SubMenu items={mockItems} onSelect={() => {}} />)

      const item = screen.getByText('Main').closest('div') as HTMLElement
      expect(item.style.cursor).toBe('pointer')
    })

    it('has default cursor when onSelect is not provided', () => {
      render(<SubMenu items={mockItems} />)

      const item = screen.getByText('Main').closest('div') as HTMLElement
      expect(item.style.cursor).toBe('default')
    })
  })

  // ==========================================================================
  // Hover State
  // ==========================================================================
  describe('hover state', () => {
    it('shows delete button on hover when canDelete returns true', () => {
      const canDelete = vi.fn().mockReturnValue(true)
      const onDelete = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)

      // Delete button should appear
      const deleteButton = item.querySelector('button')
      expect(deleteButton).toBeDefined()
      expect(deleteButton?.textContent).toBe('✕')
    })

    it('hides delete button when not hovered', () => {
      const canDelete = vi.fn().mockReturnValue(true)
      const onDelete = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )

      // No delete button should be visible initially
      const deleteButtons = document.querySelectorAll('button')
      expect(deleteButtons.length).toBe(0)
    })

    it('does not show delete button when canDelete returns false', () => {
      const canDelete = vi.fn().mockReturnValue(false)
      const onDelete = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)

      const deleteButton = item.querySelector('button')
      expect(deleteButton).toBeNull()
    })

    it('does not show delete button when onDelete is not provided', () => {
      const canDelete = vi.fn().mockReturnValue(true)

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)

      const deleteButton = item.querySelector('button')
      expect(deleteButton).toBeNull()
    })

    it('clears hover state on mouse leave', () => {
      const canDelete = vi.fn().mockReturnValue(true)
      const onDelete = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)
      fireEvent.mouseLeave(item)

      const deleteButton = item.querySelector('button')
      expect(deleteButton).toBeNull()
    })
  })

  // ==========================================================================
  // Delete Functionality
  // ==========================================================================
  describe('delete functionality', () => {
    it('calls onDelete when delete button clicked', () => {
      const canDelete = vi.fn().mockReturnValue(true)
      const onDelete = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)

      const deleteButton = item.querySelector('button')!
      fireEvent.click(deleteButton)

      expect(onDelete).toHaveBeenCalledWith('2')
    })

    it('stops propagation when delete button clicked', () => {
      const canDelete = vi.fn().mockReturnValue(true)
      const onDelete = vi.fn()
      const onSelect = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          canDelete={canDelete}
          onDelete={onDelete}
          onSelect={onSelect}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)

      const deleteButton = item.querySelector('button')!
      fireEvent.click(deleteButton)

      // onSelect should NOT be called due to stopPropagation
      expect(onDelete).toHaveBeenCalled()
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  // ==========================================================================
  // Double-click Rename
  // ==========================================================================
  describe('rename functionality', () => {
    it('enters edit mode on double-click when onRename is provided', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      // Input should appear
      const input = item.querySelector('input')
      expect(input).toBeDefined()
      expect(input?.value).toBe('Main')
    })

    it('does not enter edit mode when onRename is not provided', () => {
      render(<SubMenu items={mockItems} />)

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      const input = item.querySelector('input')
      expect(input).toBeNull()
    })

    it('calls onRename on blur', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      const input = item.querySelector('input')!
      fireEvent.change(input, { target: { value: 'Content' } })
      fireEvent.blur(input)

      expect(onRename).toHaveBeenCalledWith('2', 'Content')
    })

    it('calls onRename on Enter key', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      const input = item.querySelector('input')!
      fireEvent.change(input, { target: { value: 'Content' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onRename).toHaveBeenCalledWith('2', 'Content')
    })

    it('cancels edit on Escape key', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      const input = item.querySelector('input')!
      fireEvent.change(input, { target: { value: 'Changed' } })
      fireEvent.keyDown(input, { key: 'Escape' })

      // Should exit edit mode without calling onRename
      expect(onRename).not.toHaveBeenCalled()
      expect(item.querySelector('input')).toBeNull()
      expect(screen.getByText('Main')).toBeDefined()
    })

    it('does not call onRename with empty string', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      const input = item.querySelector('input')!
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.blur(input)

      expect(onRename).not.toHaveBeenCalled()
    })

    it('trims whitespace from renamed value', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      const input = item.querySelector('input')!
      fireEvent.change(input, { target: { value: '  Content  ' } })
      fireEvent.blur(input)

      expect(onRename).toHaveBeenCalledWith('2', 'Content')
    })

    it('has text cursor during edit mode', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)

      expect(item.style.cursor).toBe('text')
    })

    it('does not call onSelect during edit mode', () => {
      const onRename = vi.fn()
      const onSelect = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
          onSelect={onSelect}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(item)
      fireEvent.click(item)

      expect(onSelect).not.toHaveBeenCalled()
    })

    it('does not show delete button during edit mode', () => {
      const onRename = vi.fn()
      const canDelete = vi.fn().mockReturnValue(true)
      const onDelete = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
          canDelete={canDelete}
          onDelete={onDelete}
        />
      )

      const item = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.mouseEnter(item)
      fireEvent.doubleClick(item)

      const deleteButton = item.querySelector('button')
      expect(deleteButton).toBeNull()
    })
  })

  // ==========================================================================
  // Edge Cases
  // ==========================================================================
  describe('edge cases', () => {
    it('handles single item', () => {
      const onSelect = vi.fn()
      render(<SubMenu items={[{ id: '1', name: 'Only' }]} onSelect={onSelect} />)

      fireEvent.click(screen.getByText('Only'))
      expect(onSelect).toHaveBeenCalledWith('1')
    })

    it('handles long item names with ellipsis', () => {
      const longName = 'This is a very long section name that should be truncated'
      render(<SubMenu items={[{ id: '1', name: longName }]} />)

      const span = screen.getByText(longName)
      expect(span.style.textOverflow).toBe('ellipsis')
      expect(span.style.overflow).toBe('hidden')
    })

    it('can edit multiple items sequentially', () => {
      const onRename = vi.fn()

      render(
        <SubMenu
          items={mockItems}
          onRename={onRename}
        />
      )

      // Edit first item
      const headerItem = screen.getByText('Header').closest('div') as HTMLElement
      fireEvent.doubleClick(headerItem)
      const input1 = headerItem.querySelector('input')!
      fireEvent.change(input1, { target: { value: 'Header2' } })
      fireEvent.blur(input1)

      expect(onRename).toHaveBeenCalledWith('1', 'Header2')

      // Edit second item
      const mainItem = screen.getByText('Main').closest('div') as HTMLElement
      fireEvent.doubleClick(mainItem)
      const input2 = mainItem.querySelector('input')!
      fireEvent.change(input2, { target: { value: 'Main2' } })
      fireEvent.blur(input2)

      expect(onRename).toHaveBeenCalledWith('2', 'Main2')
    })
  })
})
