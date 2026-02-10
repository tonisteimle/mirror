/**
 * Consolidated picker state management for PromptPanel.
 * Replaces 10 separate picker states with a single unified state.
 */

import { useReducer, useCallback } from 'react'
import type { EditorView } from '@codemirror/view'
import type { PickerType, PickerContext, PickerState, Position } from '../types/picker'

// Re-export types for backwards compatibility
export type { PickerType, PickerContext, PickerState, Position }

// Action types
type PickerAction =
  | { type: 'OPEN'; picker: PickerType; position: Position; context?: PickerContext }
  | { type: 'CLOSE' }
  | { type: 'UPDATE_CONTEXT'; context: Partial<PickerContext> }

// Initial state
const initialState: PickerState = {
  active: null,
  position: { x: 0, y: 0 },
  context: {}
}

// Reducer
function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case 'OPEN':
      return {
        active: action.picker,
        position: action.position,
        context: action.context || {}
      }
    case 'CLOSE':
      return initialState
    case 'UPDATE_CONTEXT':
      return {
        ...state,
        context: { ...state.context, ...action.context }
      }
    default:
      return state
  }
}

// Hook return type
export interface UsePickerStateReturn {
  // State accessors
  isOpen: (picker: PickerType) => boolean
  getPosition: () => Position
  getContext: () => PickerContext

  // Individual picker open states (for backwards compatibility)
  colorPickerOpen: boolean
  commandPaletteOpen: boolean
  fontPickerOpen: boolean
  iconPickerOpen: boolean
  spacingPickerOpen: boolean
  tokenPickerOpen: boolean
  propertyPickerOpen: boolean
  valuePickerOpen: boolean

  // Position getters (for backwards compatibility)
  colorPickerPosition: Position
  commandPalettePosition: Position
  fontPickerPosition: Position
  iconPickerPosition: Position
  spacingPickerPosition: Position
  tokenPickerPosition: Position
  propertyPickerPosition: Position
  valuePickerPosition: Position

  // Context values (for backwards compatibility)
  currentColor: string | undefined
  commandPaletteQuery: string
  spacingPickerProperty: 'pad' | 'mar' | 'gap'
  propertyPickerQuery: string
  propertyPickerReplaceRange: { from: number; to: number } | null
  valuePickerProperty: string
  tokenPickerPropertyContext: string | undefined

  // Actions
  openPicker: (picker: PickerType, context?: PickerContext) => void
  closePicker: () => void
  updateContext: (context: Partial<PickerContext>) => void

  // Helper to get cursor coordinates
  getCursorCoords: () => Position | null

  // Insert value at cursor
  insertAtCursor: (value: string, options?: { removePrecedingChar?: string; replaceRange?: { from: number; to: number } }) => void
}

export function usePickerState(editorRef: React.RefObject<EditorView | null>): UsePickerStateReturn {
  const [state, dispatch] = useReducer(pickerReducer, initialState)

  // Get cursor coordinates from editor
  const getCursorCoords = useCallback((): Position | null => {
    const view = editorRef.current
    if (!view) return null

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)

    if (!coords) return null
    return { x: coords.left, y: coords.bottom + 4 }
  }, [editorRef])

  // Open a picker
  const openPicker = useCallback((picker: PickerType, context?: PickerContext) => {
    const coords = getCursorCoords()
    if (!coords) return

    dispatch({ type: 'OPEN', picker, position: coords, context })
  }, [getCursorCoords])

  // Close current picker and return focus to editor
  const closePicker = useCallback(() => {
    dispatch({ type: 'CLOSE' })
    // Return focus to editor so user can continue typing
    setTimeout(() => {
      editorRef.current?.focus()
    }, 0)
  }, [editorRef])

  // Update context
  const updateContext = useCallback((context: Partial<PickerContext>) => {
    dispatch({ type: 'UPDATE_CONTEXT', context })
  }, [])

  // Check if specific picker is open
  const isOpen = useCallback((picker: PickerType) => state.active === picker, [state.active])

  // Get current position
  const getPosition = useCallback(() => state.position, [state.position])

  // Get current context
  const getContext = useCallback(() => state.context, [state.context])

  // Insert value at cursor position
  const insertAtCursor = useCallback((
    value: string,
    options?: { removePrecedingChar?: string; replaceRange?: { from: number; to: number } }
  ) => {
    const view = editorRef.current
    if (!view) return

    let { from, to } = view.state.selection.main

    if (options?.replaceRange) {
      from = options.replaceRange.from
      to = options.replaceRange.to
    }

    if (options?.removePrecedingChar && from > 0) {
      const doc = view.state.doc
      const charBefore = doc.sliceString(from - 1, from)
      if (charBefore === options.removePrecedingChar) {
        from = from - 1
      }
    }

    view.dispatch({
      changes: { from, to, insert: value }
    })
    view.focus()
  }, [editorRef])

  // Pre-compute active picker and position once
  const { active, position, context } = state
  const defaultPosition: Position = { x: 0, y: 0 }

  // Compute open states once
  const colorPickerOpen = active === 'color'
  const commandPaletteOpen = active === 'command'
  const fontPickerOpen = active === 'font'
  const iconPickerOpen = active === 'icon'
  const spacingPickerOpen = active === 'spacing'
  const tokenPickerOpen = active === 'token'
  const propertyPickerOpen = active === 'property'
  const valuePickerOpen = active === 'value'

  return {
    // State accessors
    isOpen,
    getPosition,
    getContext,

    // Backwards-compatible open states (pre-computed)
    colorPickerOpen,
    commandPaletteOpen,
    fontPickerOpen,
    iconPickerOpen,
    spacingPickerOpen,
    tokenPickerOpen,
    propertyPickerOpen,
    valuePickerOpen,

    // Backwards-compatible positions (use pre-computed booleans)
    colorPickerPosition: colorPickerOpen ? position : defaultPosition,
    commandPalettePosition: commandPaletteOpen ? position : defaultPosition,
    fontPickerPosition: fontPickerOpen ? position : defaultPosition,
    iconPickerPosition: iconPickerOpen ? position : defaultPosition,
    spacingPickerPosition: spacingPickerOpen ? position : defaultPosition,
    tokenPickerPosition: tokenPickerOpen ? position : defaultPosition,
    propertyPickerPosition: propertyPickerOpen ? position : defaultPosition,
    valuePickerPosition: valuePickerOpen ? position : defaultPosition,

    // Backwards-compatible context values
    currentColor: context.currentColor,
    commandPaletteQuery: context.query || '',
    spacingPickerProperty: context.spacingProperty || 'pad',
    propertyPickerQuery: context.query || '',
    propertyPickerReplaceRange: context.replaceRange || null,
    valuePickerProperty: context.valueProperty || '',
    tokenPickerPropertyContext: context.propertyContext,

    // Actions
    openPicker,
    closePicker,
    updateContext,
    getCursorCoords,
    insertAtCursor,
  }
}
