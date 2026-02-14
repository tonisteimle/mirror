/**
 * useInlinePanel - Generic hook for inline editor panels
 *
 * Unified state management for panels that:
 * - Stay connected to the editor (no focus steal)
 * - Use editor input as filter
 * - Support keyboard navigation via editor keymaps
 *
 * Used for: IconPanel, FontPanel, TokenPanel (and ColorPanel as reference)
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'

export type InlinePanelType = 'icon' | 'font' | 'token' | 'value'

export interface InlinePanelState {
  isOpen: boolean
  type: InlinePanelType | null
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  triggerPos: number // Position where panel was triggered (for replacement)
}

const initialState: InlinePanelState = {
  isOpen: false,
  type: null,
  position: { x: 0, y: 0 },
  filter: '',
  selectedIndex: 0,
  triggerPos: 0,
}

export interface UseInlinePanelOptions {
  editorRef: React.RefObject<EditorView | null>
  /** Callback after a value is selected and inserted. Gets the panel type. */
  onAfterSelect?: (type: InlinePanelType, view: EditorView) => void
}

export function useInlinePanel({ editorRef, onAfterSelect }: UseInlinePanelOptions) {
  const [state, setState] = useState<InlinePanelState>(initialState)
  const { returnFocus } = usePanelPosition(editorRef)

  // Ref to access current state in closures (for keymaps)
  const stateRef = useRef(state)
  stateRef.current = state

  // Ref for the currently selected value (set by panel component)
  const selectedValueRef = useRef<string | null>(null)

  /**
   * Open panel at current cursor position.
   * @param type - Panel type to open
   * @param triggerChar - Optional trigger character to include in triggerPos (e.g., for replacement)
   */
  const open = useCallback((type: InlinePanelType, triggerChar?: string) => {
    // Don't reopen same panel - prevents triggerPos overwrite
    if (state.isOpen && state.type === type) return

    const view = editorRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    // Check if trigger char was typed before cursor - include it in triggerPos
    let triggerPos = cursorPos
    if (triggerChar && cursorPos > 0) {
      const charBefore = view.state.doc.sliceString(cursorPos - 1, cursorPos)
      if (charBefore === triggerChar) {
        triggerPos = cursorPos - 1
      }
    }

    setState({
      isOpen: true,
      type,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      filter: '',
      selectedIndex: 0,
      triggerPos,
    })
  }, [editorRef, state.isOpen, state.type])

  /**
   * Close panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, type: null }))
    returnFocus()
  }, [returnFocus])

  /**
   * Select a value and insert it at triggerPos.
   */
  const selectValue = useCallback((value: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, type } = stateRef.current
    const cursorPos = view.state.selection.main.head

    // Insert the value, replacing everything from triggerPos to cursor
    view.dispatch({
      changes: { from: triggerPos, to: cursorPos, insert: value },
      selection: { anchor: triggerPos + value.length },
    })

    close()

    // Call onAfterSelect callback (e.g., to trigger autocomplete with context)
    if (onAfterSelect && type) {
      onAfterSelect(type, view)
    }
  }, [editorRef, close, onAfterSelect])

  /**
   * Update filter text (called when user types).
   */
  const updateFilter = useCallback((filter: string) => {
    setState(prev => ({ ...prev, filter, selectedIndex: 0 }))
  }, [])

  /**
   * Update selected index.
   */
  const setSelectedIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, selectedIndex: index }))
  }, [])

  /**
   * Set currently selected value (called by panel component).
   */
  const setSelectedValue = useCallback((value: string | null) => {
    selectedValueRef.current = value
  }, [])

  /**
   * Get currently selected value.
   */
  const getSelectedValue = useCallback(() => {
    return selectedValueRef.current
  }, [])

  /**
   * Get state ref for keymaps.
   */
  const getState = useCallback(() => stateRef.current, [])

  /**
   * Check if a specific panel type is open.
   */
  const isTypeOpen = useCallback((type: InlinePanelType) => {
    return state.isOpen && state.type === type
  }, [state.isOpen, state.type])

  return {
    state,
    setState,
    stateRef,
    selectedValueRef,
    open,
    close,
    selectValue,
    updateFilter,
    setSelectedIndex,
    setSelectedValue,
    getSelectedValue,
    getState,
    isTypeOpen,
  }
}

/**
 * Get filter text from editor document.
 * Used by keymaps to read current filter.
 */
export function getFilterFromEditor(
  view: EditorView,
  triggerPos: number
): string {
  const cursorPos = view.state.selection.main.head
  return view.state.doc.sliceString(triggerPos, cursorPos)
}
