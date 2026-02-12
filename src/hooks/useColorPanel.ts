/**
 * useColorPanel Hook
 *
 * Manages inline color panel state for the editor.
 * Keeps focus in the editor while showing color selection panel.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { prepareInsertText, getCharBefore } from '../editor/utils'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'

export interface ColorPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  triggerPos: number
}

const initialState: ColorPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  filter: '',
  selectedIndex: 0,
  triggerPos: 0,
}

export function useColorPanel(editorRef: React.RefObject<EditorView | null>) {
  const [state, setState] = useState<ColorPanelState>(initialState)
  const { returnFocus } = usePanelPosition(editorRef)

  // Ref to access current state in closures
  const stateRef = useRef(state)
  stateRef.current = state

  // Ref for the currently selected value (set by InlineColorPanel)
  const selectedValueRef = useRef<string | null>(null)

  /**
   * Open the color panel at the current cursor position.
   */
  const open = useCallback(() => {
    // Don't reopen if already open - prevents triggerPos from being overwritten
    if (state.isOpen) return

    const view = editorRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    // Check if # was typed before cursor - include it in triggerPos
    let triggerPos = cursorPos
    if (cursorPos > 0 && getCharBefore(view, cursorPos) === '#') {
      triggerPos = cursorPos - 1
    }

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      filter: '',
      selectedIndex: 0,
      triggerPos,
    })
  }, [editorRef, state.isOpen])

  /**
   * Close the color panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false }))
    returnFocus()
  }, [returnFocus])

  /**
   * Handle color selection from the panel (mouse click).
   */
  const selectColor = useCallback((color: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos } = state
    const cursorPos = view.state.selection.main.head
    const insertText = prepareInsertText(view, color, triggerPos)

    view.dispatch({
      changes: { from: triggerPos, to: cursorPos, insert: insertText },
    })

    close()
  }, [editorRef, close, state])

  /**
   * Update the filter text (called when user types after #).
   */
  const updateFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, filter, selectedIndex: 0 }))
  }, [])

  /**
   * Update the selected index.
   */
  const setSelectedIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }))
  }, [])

  /**
   * Set the currently selected value (called by InlineColorPanel).
   */
  const setSelectedValue = useCallback((value: string | null) => {
    selectedValueRef.current = value
  }, [])

  /**
   * Get the currently selected value.
   */
  const getSelectedValue = useCallback(() => {
    return selectedValueRef.current
  }, [])

  /**
   * Get current state ref (for use in closures).
   */
  const getStateRef = useCallback(() => stateRef, [])

  return {
    state,
    setState,
    stateRef,
    selectedValueRef,
    open,
    close,
    selectColor,
    updateFilter,
    setSelectedIndex,
    setSelectedValue,
    getSelectedValue,
    getStateRef,
  }
}
