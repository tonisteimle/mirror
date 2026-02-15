/**
 * usePanelPosition Hook
 *
 * Shared utility for calculating panel positions relative to editor cursor.
 * Used by useColorPanel and usePickerState.
 */

import { useCallback } from 'react'
import type { EditorView } from '@codemirror/view'

export interface PanelPosition {
  x: number
  y: number
}

/** Standard offset below the cursor for panels */
export const PANEL_OFFSET_Y = 4

/**
 * Hook for calculating panel positions from editor cursor.
 *
 * @param editorRef - Ref to the EditorView
 * @returns Function to get current cursor position for panels
 */
export function usePanelPosition(editorRef: React.RefObject<EditorView | null>) {
  /**
   * Get the position for a panel at the current cursor.
   * Returns null if editor is not available or cursor has no coordinates.
   */
  const getCursorPosition = useCallback((): PanelPosition | null => {
    const view = editorRef.current
    if (!view) return null

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return null

    return {
      x: coords.left,
      y: coords.bottom + PANEL_OFFSET_Y,
    }
  }, [editorRef])

  /**
   * Get the current cursor position in the document.
   */
  const getCursorPos = useCallback((): number => {
    const view = editorRef.current
    if (!view) return 0
    return view.state.selection.main.head
  }, [editorRef])

  /**
   * Return focus to the editor.
   */
  const returnFocus = useCallback(() => {
    editorRef.current?.focus()
  }, [editorRef])

  return {
    getCursorPosition,
    getCursorPos,
    returnFocus,
  }
}
