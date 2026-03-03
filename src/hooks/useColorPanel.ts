/**
 * useColorPanel Hook
 *
 * Manages inline color panel state for the editor.
 * Keeps focus in the editor while showing color selection panel.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { prepareInsertText, getCharBefore, getTextBeforeCursor } from '../editor/utils'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'
import { findPropertyContext } from '../editor/trigger-handlers'

export interface ColorPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  triggerPos: number
  /** Range to replace when updating (tracks inserted color) */
  replaceRange: { from: number; to: number } | null
  /** Current selected value (triggers effect updates for live preview) */
  selectedValue: string | null
  /** Property context for filtering tokens (e.g., "bg", "col") */
  propertyContext: string | null
}

const initialState: ColorPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  filter: '',
  selectedIndex: 0,
  triggerPos: 0,
  replaceRange: null,
  selectedValue: null,
  propertyContext: null,
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
   * Automatically detects property context (e.g., "bg", "col") for token filtering.
   */
  const open = useCallback(() => {
    // Don't reopen if already open - prevents triggerPos from being overwritten
    // K3 fix: Use stateRef.current to avoid stale closure
    if (stateRef.current.isOpen) return

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

    // Detect property context (e.g., "bg #" → propertyContext = "bg")
    const textBefore = getTextBeforeCursor(view)
    const propertyContext = findPropertyContext(textBefore.slice(0, -1)) || null

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      filter: '',
      selectedIndex: 0,
      triggerPos,
      replaceRange: null,
      selectedValue: null,
      propertyContext,
    })
  }, [editorRef])

  /**
   * Close the color panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, replaceRange: null }))
    returnFocus()
  }, [returnFocus])

  /**
   * Handle color selection from the panel (mouse click).
   */
  const selectColor = useCallback((color: string) => {
    const view = editorRef.current
    if (!view) return

    // H3 fix: Use stateRef.current to avoid stale closure
    const { triggerPos } = stateRef.current
    const cursorPos = view.state.selection.main.head
    const insertText = prepareInsertText(view, color, triggerPos)

    view.dispatch({
      changes: { from: triggerPos, to: cursorPos, insert: insertText },
    })

    close()
  }, [editorRef, close])

  /**
   * Update code live without closing (for live sync).
   */
  const updateCode = useCallback((color: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, replaceRange } = stateRef.current

    // Determine what to replace
    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : view.state.selection.main.head

    const insertText = prepareInsertText(view, color, from)

    view.dispatch({
      changes: { from, to, insert: insertText },
      selection: { anchor: from + insertText.length },
    })

    // Update replaceRange to track the new color position
    setState(prev => ({
      ...prev,
      replaceRange: { from, to: from + insertText.length },
    }))
  }, [editorRef])

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
   * Updates both ref (for immediate access) and state (for effect triggers).
   */
  const setSelectedValue = useCallback((value: string | null) => {
    selectedValueRef.current = value
    setState(prev => ({ ...prev, selectedValue: value }))
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
    updateCode,
    updateFilter,
    setSelectedIndex,
    setSelectedValue,
    getSelectedValue,
    getStateRef,
  }
}
