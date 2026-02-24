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
export type IconLibrary = 'lucide' | 'material' | 'phosphor'

export interface InlinePanelState {
  isOpen: boolean
  type: InlinePanelType | null
  position: { x: number; y: number }
  filter: string
  selectedIndex: number
  triggerPos: number // Position where panel was triggered (for replacement)
  iconLibrary: IconLibrary // Selected icon library for icon picker
  replaceRange: { from: number; to: number } | null // Optional range to replace (for double-click edit)
}

const initialState: InlinePanelState = {
  isOpen: false,
  type: null,
  position: { x: 0, y: 0 },
  filter: '',
  selectedIndex: 0,
  triggerPos: 0,
  iconLibrary: 'lucide',
  replaceRange: null,
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
   * @param options - Optional config: triggerChar or replaceRange for editing existing values
   */
  const open = useCallback((
    type: InlinePanelType,
    options?: string | { replaceRange?: { from: number; to: number } }
  ) => {
    // Don't reopen same panel - prevents triggerPos overwrite
    // K4 fix: Use stateRef.current to avoid stale closure
    const currentState = stateRef.current
    if (currentState.isOpen && currentState.type === type) return

    const view = editorRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    // Parse options - can be string (triggerChar) or object with replaceRange
    const triggerChar = typeof options === 'string' ? options : undefined
    const replaceRange = typeof options === 'object' ? options?.replaceRange ?? null : null

    // Check if trigger char was typed before cursor - include it in triggerPos
    let triggerPos = cursorPos
    if (triggerChar && cursorPos > 0) {
      const charBefore = view.state.doc.sliceString(cursorPos - 1, cursorPos)
      if (charBefore === triggerChar) {
        triggerPos = cursorPos - 1
      }
    }

    setState(prev => ({
      ...prev,
      isOpen: true,
      type,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      filter: '',
      selectedIndex: 0,
      triggerPos,
      replaceRange,
    }))
  }, [editorRef])

  /**
   * Close panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, type: null, replaceRange: null }))
    returnFocus()
  }, [returnFocus])

  /**
   * Select a value and insert it at triggerPos (or replaceRange if set).
   */
  const selectValue = useCallback((value: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, type, replaceRange } = stateRef.current
    const cursorPos = view.state.selection.main.head

    // Use replaceRange if set (for double-click edit), otherwise triggerPos to cursor
    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : cursorPos

    // Insert the value
    view.dispatch({
      changes: { from, to, insert: value },
      selection: { anchor: from + value.length },
    })

    close()

    // Call onAfterSelect callback (e.g., to trigger autocomplete with context)
    if (onAfterSelect && type) {
      onAfterSelect(type, view)
    }
  }, [editorRef, close, onAfterSelect])

  /**
   * Update code live without closing (for live sync).
   */
  const updateCode = useCallback((value: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos, replaceRange } = stateRef.current

    // Use replaceRange if set, otherwise triggerPos to cursor
    const from = replaceRange ? replaceRange.from : triggerPos
    const to = replaceRange ? replaceRange.to : view.state.selection.main.head

    // Insert the value
    view.dispatch({
      changes: { from, to, insert: value },
      selection: { anchor: from + value.length },
    })

    // Update replaceRange to track the new position
    setState(prev => ({
      ...prev,
      replaceRange: { from, to: from + value.length },
    }))
  }, [editorRef])

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

  /**
   * Set icon library (lucide or material).
   */
  const setIconLibrary = useCallback((library: IconLibrary) => {
    setState(prev => ({ ...prev, iconLibrary: library, selectedIndex: 0 }))
  }, [])

  return {
    state,
    setState,
    stateRef,
    selectedValueRef,
    open,
    close,
    selectValue,
    updateCode,
    updateFilter,
    setSelectedIndex,
    setSelectedValue,
    getSelectedValue,
    getState,
    isTypeOpen,
    setIconLibrary,
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
