/**
 * Panel Reducers
 *
 * Pure reducer functions for panel/picker state management.
 * Extracted for independent unit testing and reuse.
 */

import type { ColorPanelState } from './useColorPanel'
import type { AiPanelState } from './useAiPanel'

// ============================================================================
// Color Panel Reducer
// ============================================================================

export type ColorPanelAction =
  | { type: 'OPEN'; position: { x: number; y: number }; triggerPos: number }
  | { type: 'CLOSE' }
  | { type: 'UPDATE_FILTER'; filter: string }
  | { type: 'SET_SELECTED_INDEX'; index: number }
  | { type: 'RESET' }

export const colorPanelInitialState: ColorPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  filter: '',
  selectedIndex: 0,
  triggerPos: 0,
}

/**
 * Pure reducer for color panel state.
 */
export function colorPanelReducer(
  state: ColorPanelState,
  action: ColorPanelAction
): ColorPanelState {
  switch (action.type) {
    case 'OPEN':
      // Don't reopen if already open
      if (state.isOpen) return state
      return {
        isOpen: true,
        position: action.position,
        filter: '',
        selectedIndex: 0,
        triggerPos: action.triggerPos,
      }

    case 'CLOSE':
      return {
        ...state,
        isOpen: false,
      }

    case 'UPDATE_FILTER':
      return {
        ...state,
        filter: action.filter,
        selectedIndex: 0, // Reset selection when filter changes
      }

    case 'SET_SELECTED_INDEX':
      return {
        ...state,
        selectedIndex: action.index,
      }

    case 'RESET':
      return colorPanelInitialState

    default:
      return state
  }
}

// ============================================================================
// AI Panel Reducer
// ============================================================================

export type AiPanelAction =
  | { type: 'OPEN'; position: { x: number; y: number }; triggerPos: number }
  | { type: 'CLOSE' }
  | { type: 'START_GENERATING' }
  | { type: 'STOP_GENERATING' }
  | { type: 'RESET' }

export const aiPanelInitialState: AiPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  isGenerating: false,
}

/**
 * Pure reducer for AI panel state.
 */
export function aiPanelReducer(
  state: AiPanelState,
  action: AiPanelAction
): AiPanelState {
  switch (action.type) {
    case 'OPEN':
      return {
        isOpen: true,
        position: action.position,
        triggerPos: action.triggerPos,
        isGenerating: false,
      }

    case 'CLOSE':
      return {
        ...state,
        isOpen: false,
        isGenerating: false,
      }

    case 'START_GENERATING':
      return {
        ...state,
        isGenerating: true,
      }

    case 'STOP_GENERATING':
      return {
        ...state,
        isGenerating: false,
      }

    case 'RESET':
      return aiPanelInitialState

    default:
      return state
  }
}

// ============================================================================
// Picker State Reducer (already in usePickerState, re-exported here)
// ============================================================================

import type { PickerType, PickerContext, PickerState, Position } from '../types/picker'

export type PickerAction =
  | { type: 'OPEN'; picker: PickerType; position: Position; context?: PickerContext }
  | { type: 'CLOSE' }
  | { type: 'UPDATE_CONTEXT'; context: Partial<PickerContext> }

export const pickerInitialState: PickerState = {
  active: null,
  position: { x: 0, y: 0 },
  context: {},
}

/**
 * Pure reducer for picker state.
 */
export function pickerReducer(
  state: PickerState,
  action: PickerAction
): PickerState {
  switch (action.type) {
    case 'OPEN':
      return {
        active: action.picker,
        position: action.position,
        context: action.context || {},
      }

    case 'CLOSE':
      return pickerInitialState

    case 'UPDATE_CONTEXT':
      return {
        ...state,
        context: { ...state.context, ...action.context },
      }

    default:
      return state
  }
}

// ============================================================================
// State Selectors (pure functions for deriving state)
// ============================================================================

/**
 * Check if a specific picker is currently open.
 */
export function isPickerOpen(state: PickerState, picker: PickerType): boolean {
  return state.active === picker
}

/**
 * Get the position for the active picker.
 */
export function getPickerPosition(state: PickerState): Position {
  return state.position
}

/**
 * Check if any panel is open (for preventing multiple panels).
 */
export function isAnyPanelOpen(
  colorPanel: ColorPanelState,
  aiPanel: AiPanelState,
  picker: PickerState
): boolean {
  return colorPanel.isOpen || aiPanel.isOpen || picker.active !== null
}

/**
 * Validate filter string for color panel.
 * Returns null if valid, error message if invalid.
 */
export function validateColorFilter(filter: string): string | null {
  if (filter.includes('\n')) {
    return 'Filter cannot contain newlines'
  }
  if (filter.includes(' ')) {
    return 'Filter cannot contain spaces'
  }
  return null
}

/**
 * Parse color filter to determine if it's a valid hex input.
 */
export function parseColorFilter(filter: string): {
  isHex: boolean
  normalizedFilter: string
  isComplete: boolean
} {
  const normalized = filter.startsWith('#') ? filter.slice(1) : filter
  const isHex = /^[0-9a-fA-F]*$/.test(normalized)
  const isComplete = isHex && (normalized.length === 3 || normalized.length === 6)

  return {
    isHex,
    normalizedFilter: normalized,
    isComplete,
  }
}
