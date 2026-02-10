/**
 * Hook for managing picker state in the PromptPanel.
 * Consolidates 9 separate picker states into a single unified state manager.
 */

import { useState, useCallback } from 'react'
import type { EditorView } from '@codemirror/view'
import type { PickerType, PickerContext, PickerState, InsertOptions } from '../types/picker'

// Re-export types for backwards compatibility
export type { PickerType, PickerContext, PickerState, InsertOptions }

export interface UsePickerManagerReturn {
  // State
  state: PickerState

  // Check if specific picker is open
  isOpen: (type: PickerType) => boolean

  // Open a picker at cursor position
  open: (type: PickerType, context?: Partial<PickerContext>) => void

  // Close current picker
  close: () => void

  // Close all and open specific picker
  openExclusive: (type: PickerType, context?: Partial<PickerContext>) => void

  // Update context for current picker
  updateContext: (context: Partial<PickerContext>) => void

  // Get cursor coordinates from editor
  getCursorCoords: () => { x: number; y: number } | null

  // Insert value at cursor position
  insertAtCursor: (value: string, options?: InsertOptions) => void
}

const initialState: PickerState = {
  active: null,
  position: { x: 0, y: 0 },
  context: {}
}

export function usePickerManager(
  editorRef: React.RefObject<EditorView | null>
): UsePickerManagerReturn {
  const [state, setState] = useState<PickerState>(initialState)

  // Get cursor coordinates from editor
  const getCursorCoords = useCallback(() => {
    const view = editorRef.current
    if (!view) return null

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)

    if (!coords) return null

    return { x: coords.left, y: coords.bottom + 4 }
  }, [editorRef])

  // Check if specific picker is open
  const isOpen = useCallback((type: PickerType) => {
    return state.active === type
  }, [state.active])

  // Open a picker
  const open = useCallback((type: PickerType, context?: Partial<PickerContext>) => {
    const coords = getCursorCoords()
    if (!coords) return

    setState({
      active: type,
      position: coords,
      context: context || {}
    })
  }, [getCursorCoords])

  // Close current picker
  const close = useCallback(() => {
    setState(initialState)
  }, [])

  // Close all and open specific picker (exclusive mode)
  const openExclusive = useCallback((type: PickerType, context?: Partial<PickerContext>) => {
    const coords = getCursorCoords()
    if (!coords) return

    setState({
      active: type,
      position: coords,
      context: context || {}
    })
  }, [getCursorCoords])

  // Update context for current picker
  const updateContext = useCallback((context: Partial<PickerContext>) => {
    setState(prev => ({
      ...prev,
      context: { ...prev.context, ...context }
    }))
  }, [])

  // Insert value at cursor position
  const insertAtCursor = useCallback((value: string, options?: InsertOptions) => {
    const view = editorRef.current
    if (!view) return

    let { from, to } = view.state.selection.main

    // Handle replaceRange option
    if (options?.replaceRange) {
      from = options.replaceRange.from
      to = options.replaceRange.to
    }

    // Handle removePrecedingChar option
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

  return {
    state,
    isOpen,
    open,
    close,
    openExclusive,
    updateContext,
    getCursorCoords,
    insertAtCursor
  }
}

// Helper to detect color at cursor position
export function detectColorAtCursor(view: EditorView): string | undefined {
  const cursorPos = view.state.selection.main.head
  const line = view.state.doc.lineAt(cursorPos)
  const lineText = line.text
  const posInLine = cursorPos - line.from

  const colorRegex = /#[0-9A-Fa-f]{3,6}/g
  let match

  while ((match = colorRegex.exec(lineText)) !== null) {
    if (posInLine >= match.index && posInLine <= match.index + match[0].length) {
      return match[0].toUpperCase()
    }
  }

  return undefined
}

// Helper to find color range at cursor for replacement
export function findColorRangeAtCursor(view: EditorView): { from: number; to: number } | null {
  const cursorPos = view.state.selection.main.head
  const line = view.state.doc.lineAt(cursorPos)
  const lineText = line.text
  const posInLine = cursorPos - line.from

  const colorRegex = /#[0-9A-Fa-f]{3,6}/g
  let match

  while ((match = colorRegex.exec(lineText)) !== null) {
    if (posInLine >= match.index && posInLine <= match.index + match[0].length) {
      return {
        from: line.from + match.index,
        to: line.from + match.index + match[0].length
      }
    }
  }

  return null
}
