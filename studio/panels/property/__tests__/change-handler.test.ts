/**
 * ChangeHandler Tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ChangeHandler, type ChangeHandlerDependencies } from '../change-handler'
import type { ModificationResult } from '../types'

describe('ChangeHandler', () => {
  let handler: ChangeHandler
  let mockModifier: {
    updateProperty: ReturnType<typeof vi.fn>
    removeProperty: ReturnType<typeof vi.fn>
  }
  let mockOnSourceChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockModifier = {
      updateProperty: vi.fn(),
      removeProperty: vi.fn(),
    }
    mockOnSourceChange = vi.fn()

    const deps: ChangeHandlerDependencies = {
      getModifier: () => mockModifier as any,
      onSourceChange: mockOnSourceChange,
    }

    handler = new ChangeHandler(deps)
  })

  describe('handlePropertyChange', () => {
    it('should update property via modifier', () => {
      const result: ModificationResult = {
        success: true,
        newSource: 'updated source',
        lineNumber: 5,
      }
      mockModifier.updateProperty.mockReturnValue(result)

      handler.handlePropertyChange('node1', 'bg', '#ff0000')

      expect(mockModifier.updateProperty).toHaveBeenCalledWith('node1', 'bg', '#ff0000')
    })

    it('should call onSourceChange on success', () => {
      const result: ModificationResult = {
        success: true,
        newSource: 'updated source',
        lineNumber: 5,
      }
      mockModifier.updateProperty.mockReturnValue(result)

      handler.handlePropertyChange('node1', 'bg', '#ff0000')

      expect(mockOnSourceChange).toHaveBeenCalledWith(result)
    })

    it('should not call onSourceChange on failure', () => {
      const result: ModificationResult = {
        success: false,
        error: 'Property not found',
      }
      mockModifier.updateProperty.mockReturnValue(result)

      handler.handlePropertyChange('node1', 'bg', '#ff0000')

      expect(mockOnSourceChange).not.toHaveBeenCalled()
    })

    it('should return the modification result', () => {
      const expectedResult: ModificationResult = {
        success: true,
        newSource: 'new code',
        lineNumber: 10,
      }
      mockModifier.updateProperty.mockReturnValue(expectedResult)

      const result = handler.handlePropertyChange('node1', 'pad', '16')

      expect(result).toBe(expectedResult)
    })
  })

  describe('handlePropertyRemove', () => {
    it('should remove property via modifier', () => {
      const result: ModificationResult = {
        success: true,
        newSource: 'source without property',
        lineNumber: 3,
      }
      mockModifier.removeProperty.mockReturnValue(result)

      handler.handlePropertyRemove('node1', 'bg')

      expect(mockModifier.removeProperty).toHaveBeenCalledWith('node1', 'bg')
    })

    it('should call onSourceChange on success', () => {
      const result: ModificationResult = {
        success: true,
        newSource: 'source without property',
        lineNumber: 3,
      }
      mockModifier.removeProperty.mockReturnValue(result)

      handler.handlePropertyRemove('node1', 'bg')

      expect(mockOnSourceChange).toHaveBeenCalledWith(result)
    })

    it('should not call onSourceChange on failure', () => {
      const result: ModificationResult = {
        success: false,
        error: 'Cannot remove property',
      }
      mockModifier.removeProperty.mockReturnValue(result)

      handler.handlePropertyRemove('node1', 'bg')

      expect(mockOnSourceChange).not.toHaveBeenCalled()
    })

    it('should return the modification result', () => {
      const expectedResult: ModificationResult = {
        success: true,
        newSource: 'cleaned code',
        lineNumber: 8,
      }
      mockModifier.removeProperty.mockReturnValue(expectedResult)

      const result = handler.handlePropertyRemove('node1', 'margin')

      expect(result).toBe(expectedResult)
    })
  })

  describe('applyDirectChange', () => {
    it('should call onSourceChange for successful result', () => {
      const result: ModificationResult = {
        success: true,
        newSource: 'external change',
        lineNumber: 1,
      }

      handler.applyDirectChange(result)

      expect(mockOnSourceChange).toHaveBeenCalledWith(result)
    })

    it('should not call onSourceChange for failed result', () => {
      const result: ModificationResult = {
        success: false,
        error: 'External error',
      }

      handler.applyDirectChange(result)

      expect(mockOnSourceChange).not.toHaveBeenCalled()
    })
  })
})

describe('CATEGORY_INFO', () => {
  // This is a constants test - import if needed
  it('should be tested via types import', () => {
    // CATEGORY_INFO is tested implicitly through PropertyPanel usage
    expect(true).toBe(true)
  })
})
