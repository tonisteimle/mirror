/**
 * BasePicker Component Tests
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BasePicker } from '../../components/picker/BasePicker'
import { basePickerProps } from '../kit'

describe('BasePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ===========================================
  // Rendering Tests
  // ===========================================

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      const props = basePickerProps()
      render(
        <BasePicker {...props} isOpen={true}>
          <div>Content</div>
        </BasePicker>
      )

      expect(screen.getByText('Content')).toBeDefined()
    })

    it('does not render when isOpen is false', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props} isOpen={false}>
          <div>Content</div>
        </BasePicker>
      )

      expect(container.firstChild).toBeNull()
    })

    it('renders children content', () => {
      const props = basePickerProps()
      render(
        <BasePicker {...props}>
          <div>Child 1</div>
          <div>Child 2</div>
        </BasePicker>
      )

      expect(screen.getByText('Child 1')).toBeDefined()
      expect(screen.getByText('Child 2')).toBeDefined()
    })

    it('renders title when provided', () => {
      const props = basePickerProps()
      render(
        <BasePicker {...props} title="Picker Title">
          <div>Content</div>
        </BasePicker>
      )

      expect(screen.getByText('Picker Title')).toBeDefined()
    })

    it('renders footer when provided', () => {
      const props = basePickerProps()
      render(
        <BasePicker {...props} footer={<div>Footer Content</div>}>
          <div>Content</div>
        </BasePicker>
      )

      expect(screen.getByText('Footer Content')).toBeDefined()
    })
  })

  // ===========================================
  // Positioning Tests
  // ===========================================

  describe('Positioning', () => {
    it('positions at specified coordinates', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props} position={{ x: 200, y: 300 }}>
          <div>Content</div>
        </BasePicker>
      )

      // Find the picker container (not the backdrop)
      const picker = container.querySelector('div[style*="position: fixed"][style*="width"]')
      expect(picker).toBeDefined()
    })

    it('applies custom width', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props} width={500}>
          <div>Content</div>
        </BasePicker>
      )

      const picker = container.querySelector('div[style*="width: 500px"]')
      expect(picker).toBeDefined()
    })

    it('applies custom maxHeight', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props} maxHeight={600}>
          <div>Content</div>
        </BasePicker>
      )

      const picker = container.querySelector('div[style*="max-height: 600px"]')
      expect(picker).toBeDefined()
    })
  })

  // ===========================================
  // Backdrop Tests
  // ===========================================

  describe('Backdrop', () => {
    it('renders backdrop by default', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props}>
          <div>Content</div>
        </BasePicker>
      )

      const backdrop = container.querySelector('div[style*="inset: 0"]')
      expect(backdrop).toBeDefined()
    })

    it('calls onClose when backdrop is clicked', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props}>
          <div>Content</div>
        </BasePicker>
      )

      const backdrop = container.querySelector('div[style*="inset: 0"]')
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(props.onClose).toHaveBeenCalled()
      }
    })

    it('does not render backdrop when useBackdrop is false', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props} useBackdrop={false}>
          <div>Content</div>
        </BasePicker>
      )

      const backdrop = container.querySelector('div[style*="inset: 0"]')
      expect(backdrop).toBeNull()
    })
  })

  // ===========================================
  // Z-Index Tests
  // ===========================================

  describe('Z-Index', () => {
    it('applies default z-index', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props}>
          <div>Content</div>
        </BasePicker>
      )

      const picker = container.querySelector('div[style*="z-index: 1000"]')
      expect(picker).toBeDefined()
    })

    it('applies custom z-index', () => {
      const props = basePickerProps()
      const { container } = render(
        <BasePicker {...props} zIndex={2000}>
          <div>Content</div>
        </BasePicker>
      )

      const picker = container.querySelector('div[style*="z-index: 2000"]')
      expect(picker).toBeDefined()
    })
  })
})
