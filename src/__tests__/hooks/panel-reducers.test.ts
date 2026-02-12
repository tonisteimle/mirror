/**
 * Panel Reducers Unit Tests
 *
 * Tests for pure reducer functions - these are fully synchronous
 * and don't require any mocking.
 */

import { describe, it, expect } from 'vitest'
import {
  colorPanelReducer,
  colorPanelInitialState,
  aiPanelReducer,
  aiPanelInitialState,
  pickerReducer,
  pickerInitialState,
  validateColorFilter,
  parseColorFilter,
  isPickerOpen,
  isAnyPanelOpen,
  type ColorPanelAction,
  type AiPanelAction,
  type PickerAction,
} from '../../hooks/panel-reducers'

describe('colorPanelReducer', () => {
  describe('OPEN action', () => {
    it('should open the panel with position and triggerPos', () => {
      const action: ColorPanelAction = {
        type: 'OPEN',
        position: { x: 100, y: 200 },
        triggerPos: 42,
      }

      const result = colorPanelReducer(colorPanelInitialState, action)

      expect(result.isOpen).toBe(true)
      expect(result.position).toEqual({ x: 100, y: 200 })
      expect(result.triggerPos).toBe(42)
      expect(result.filter).toBe('')
      expect(result.selectedIndex).toBe(0)
    })

    it('should not reopen if already open', () => {
      const openState = {
        ...colorPanelInitialState,
        isOpen: true,
        triggerPos: 10,
      }
      const action: ColorPanelAction = {
        type: 'OPEN',
        position: { x: 200, y: 300 },
        triggerPos: 99,
      }

      const result = colorPanelReducer(openState, action)

      // Should return same state, not update triggerPos
      expect(result).toBe(openState)
      expect(result.triggerPos).toBe(10)
    })
  })

  describe('CLOSE action', () => {
    it('should close the panel while preserving other state', () => {
      const openState = {
        isOpen: true,
        position: { x: 100, y: 200 },
        filter: 'FF',
        selectedIndex: 5,
        triggerPos: 42,
      }

      const result = colorPanelReducer(openState, { type: 'CLOSE' })

      expect(result.isOpen).toBe(false)
      expect(result.filter).toBe('FF') // Preserved
      expect(result.selectedIndex).toBe(5) // Preserved
    })
  })

  describe('UPDATE_FILTER action', () => {
    it('should update filter and reset selectedIndex', () => {
      const state = {
        ...colorPanelInitialState,
        isOpen: true,
        selectedIndex: 5,
      }

      const result = colorPanelReducer(state, {
        type: 'UPDATE_FILTER',
        filter: 'FF00',
      })

      expect(result.filter).toBe('FF00')
      expect(result.selectedIndex).toBe(0) // Reset
    })
  })

  describe('SET_SELECTED_INDEX action', () => {
    it('should update selectedIndex', () => {
      const state = { ...colorPanelInitialState, isOpen: true }

      const result = colorPanelReducer(state, {
        type: 'SET_SELECTED_INDEX',
        index: 7,
      })

      expect(result.selectedIndex).toBe(7)
    })
  })

  describe('RESET action', () => {
    it('should reset to initial state', () => {
      const modifiedState = {
        isOpen: true,
        position: { x: 100, y: 200 },
        filter: 'test',
        selectedIndex: 10,
        triggerPos: 50,
      }

      const result = colorPanelReducer(modifiedState, { type: 'RESET' })

      expect(result).toEqual(colorPanelInitialState)
    })
  })
})

describe('aiPanelReducer', () => {
  describe('OPEN action', () => {
    it('should open the panel with position and triggerPos', () => {
      const action: AiPanelAction = {
        type: 'OPEN',
        position: { x: 150, y: 250 },
        triggerPos: 33,
      }

      const result = aiPanelReducer(aiPanelInitialState, action)

      expect(result.isOpen).toBe(true)
      expect(result.position).toEqual({ x: 150, y: 250 })
      expect(result.triggerPos).toBe(33)
      expect(result.isGenerating).toBe(false)
    })
  })

  describe('CLOSE action', () => {
    it('should close and stop generating', () => {
      const state = {
        isOpen: true,
        position: { x: 100, y: 200 },
        triggerPos: 10,
        isGenerating: true,
      }

      const result = aiPanelReducer(state, { type: 'CLOSE' })

      expect(result.isOpen).toBe(false)
      expect(result.isGenerating).toBe(false)
    })
  })

  describe('START_GENERATING action', () => {
    it('should set isGenerating to true', () => {
      const state = { ...aiPanelInitialState, isOpen: true }

      const result = aiPanelReducer(state, { type: 'START_GENERATING' })

      expect(result.isGenerating).toBe(true)
    })
  })

  describe('STOP_GENERATING action', () => {
    it('should set isGenerating to false', () => {
      const state = {
        ...aiPanelInitialState,
        isOpen: true,
        isGenerating: true,
      }

      const result = aiPanelReducer(state, { type: 'STOP_GENERATING' })

      expect(result.isGenerating).toBe(false)
    })
  })
})

describe('pickerReducer', () => {
  describe('OPEN action', () => {
    it('should open a picker with position and context', () => {
      const action: PickerAction = {
        type: 'OPEN',
        picker: 'font',
        position: { x: 100, y: 200 },
        context: { propertyContext: 'font' },
      }

      const result = pickerReducer(pickerInitialState, action)

      expect(result.active).toBe('font')
      expect(result.position).toEqual({ x: 100, y: 200 })
      expect(result.context).toEqual({ propertyContext: 'font' })
    })

    it('should use empty context if not provided', () => {
      const action: PickerAction = {
        type: 'OPEN',
        picker: 'icon',
        position: { x: 50, y: 100 },
      }

      const result = pickerReducer(pickerInitialState, action)

      expect(result.context).toEqual({})
    })
  })

  describe('CLOSE action', () => {
    it('should reset to initial state', () => {
      const openState = {
        active: 'color' as const,
        position: { x: 100, y: 200 },
        context: { currentColor: '#FF0000' },
      }

      const result = pickerReducer(openState, { type: 'CLOSE' })

      expect(result).toEqual(pickerInitialState)
    })
  })

  describe('UPDATE_CONTEXT action', () => {
    it('should merge context', () => {
      const state = {
        active: 'token' as const,
        position: { x: 100, y: 200 },
        context: { propertyContext: 'col' },
      }

      const result = pickerReducer(state, {
        type: 'UPDATE_CONTEXT',
        context: { query: 'default' },
      })

      expect(result.context).toEqual({
        propertyContext: 'col',
        query: 'default',
      })
    })
  })
})

describe('validateColorFilter', () => {
  it('should return null for valid filters', () => {
    expect(validateColorFilter('FF0000')).toBeNull()
    expect(validateColorFilter('abc')).toBeNull()
    expect(validateColorFilter('')).toBeNull()
  })

  it('should return error for filters with newlines', () => {
    expect(validateColorFilter('FF\n00')).toBe('Filter cannot contain newlines')
  })

  it('should return error for filters with spaces', () => {
    expect(validateColorFilter('FF 00')).toBe('Filter cannot contain spaces')
  })
})

describe('parseColorFilter', () => {
  it('should parse hex filter without hash', () => {
    const result = parseColorFilter('FF0000')

    expect(result.isHex).toBe(true)
    expect(result.normalizedFilter).toBe('FF0000')
    expect(result.isComplete).toBe(true)
  })

  it('should parse hex filter with hash', () => {
    const result = parseColorFilter('#FF0')

    expect(result.isHex).toBe(true)
    expect(result.normalizedFilter).toBe('FF0')
    expect(result.isComplete).toBe(true)
  })

  it('should detect incomplete hex', () => {
    const result = parseColorFilter('FF')

    expect(result.isHex).toBe(true)
    expect(result.isComplete).toBe(false)
  })

  it('should detect non-hex input', () => {
    const result = parseColorFilter('red')

    expect(result.isHex).toBe(false)
    expect(result.isComplete).toBe(false)
  })
})

describe('isPickerOpen', () => {
  it('should return true when specified picker is active', () => {
    const state = { ...pickerInitialState, active: 'font' as const }

    expect(isPickerOpen(state, 'font')).toBe(true)
    expect(isPickerOpen(state, 'color')).toBe(false)
  })

  it('should return false when no picker is active', () => {
    expect(isPickerOpen(pickerInitialState, 'font')).toBe(false)
  })
})

describe('isAnyPanelOpen', () => {
  it('should return true when color panel is open', () => {
    const colorPanel = { ...colorPanelInitialState, isOpen: true }
    const aiPanel = aiPanelInitialState
    const picker = pickerInitialState

    expect(isAnyPanelOpen(colorPanel, aiPanel, picker)).toBe(true)
  })

  it('should return true when AI panel is open', () => {
    const colorPanel = colorPanelInitialState
    const aiPanel = { ...aiPanelInitialState, isOpen: true }
    const picker = pickerInitialState

    expect(isAnyPanelOpen(colorPanel, aiPanel, picker)).toBe(true)
  })

  it('should return true when picker is active', () => {
    const colorPanel = colorPanelInitialState
    const aiPanel = aiPanelInitialState
    const picker = { ...pickerInitialState, active: 'font' as const }

    expect(isAnyPanelOpen(colorPanel, aiPanel, picker)).toBe(true)
  })

  it('should return false when nothing is open', () => {
    expect(isAnyPanelOpen(
      colorPanelInitialState,
      aiPanelInitialState,
      pickerInitialState
    )).toBe(false)
  })
})
