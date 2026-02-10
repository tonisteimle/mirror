/**
 * Tests for HeaderBar component.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HeaderBar } from '../components/HeaderBar'

describe('HeaderBar', () => {
  const defaultProps = {
    onImport: vi.fn(),
    onExport: vi.fn(),
    onOpenSettings: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render logo', () => {
      render(<HeaderBar {...defaultProps} />)
      const logo = screen.getByAltText('mirror')
      expect(logo).toBeDefined()
    })

    it('should render Tutorial button', () => {
      render(<HeaderBar {...defaultProps} />)
      const tutorialButton = screen.getByTitle('Tutorial')
      expect(tutorialButton).toBeDefined()
    })

    it('should render Import button', () => {
      render(<HeaderBar {...defaultProps} />)
      expect(screen.getByTitle('Import')).toBeDefined()
    })

    it('should render Export button', () => {
      render(<HeaderBar {...defaultProps} />)
      expect(screen.getByTitle('Export')).toBeDefined()
    })

    it('should render Settings button', () => {
      render(<HeaderBar {...defaultProps} />)
      expect(screen.getByTitle('Einstellungen')).toBeDefined()
    })
  })

  describe('Button Interactions', () => {
    it('should call onImport when Import button clicked', () => {
      render(<HeaderBar {...defaultProps} />)
      fireEvent.click(screen.getByTitle('Import'))
      expect(defaultProps.onImport).toHaveBeenCalledTimes(1)
    })

    it('should call onExport when Export button clicked', () => {
      render(<HeaderBar {...defaultProps} />)
      fireEvent.click(screen.getByTitle('Export'))
      expect(defaultProps.onExport).toHaveBeenCalledTimes(1)
    })

    it('should call onOpenSettings when Settings button clicked', () => {
      render(<HeaderBar {...defaultProps} />)
      fireEvent.click(screen.getByTitle('Einstellungen'))
      expect(defaultProps.onOpenSettings).toHaveBeenCalledTimes(1)
    })
  })
})
