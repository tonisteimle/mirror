/**
 * useComponentPanel Hook
 *
 * Manages inline component property panel state for the editor.
 * Triggered by: ComponentName + space or "as Type" + space
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import type { PickerType } from './useEditorTriggers'

export interface ComponentPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  triggerPos: number
  /** The component name or type */
  componentType: string
  /** Which picker to show */
  pickerType: PickerType
  /** Current line content */
  lineContent: string
  /** Line range for replacement */
  lineFrom: number
  lineTo: number
}

const initialState: ComponentPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  componentType: '',
  pickerType: null,
  lineContent: '',
  lineFrom: 0,
  lineTo: 0,
}

export interface UseComponentPanelReturn {
  state: ComponentPanelState
  /** Open panel at cursor position (for typing trigger) */
  open: (componentName: string, pickerType: PickerType) => void
  /** Open panel for a specific line (for double-click) */
  openForLine: (componentName: string, pickerType: PickerType, lineFrom: number, lineTo: number) => void
  close: () => void
  updateCode: (newLineContent: string) => void
}

export function useComponentPanel(
  editorViewRef: React.RefObject<EditorView | null>
): UseComponentPanelReturn {
  const [state, setState] = useState<ComponentPanelState>(initialState)
  const stateRef = useRef(state)
  stateRef.current = state

  const open = useCallback((componentName: string, pickerType: PickerType) => {
    const view = editorViewRef.current
    if (!view) return

    const cursorPos = view.state.selection.main.head
    const line = view.state.doc.lineAt(cursorPos)
    const lineContent = line.text

    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + 8 },
      triggerPos: cursorPos,
      componentType: componentName,
      pickerType,
      lineContent,
      lineFrom: line.from,
      lineTo: line.to,
    })
  }, [editorViewRef])

  // Open for a specific line (used by double-click)
  const openForLine = useCallback((componentName: string, pickerType: PickerType, lineFrom: number, lineTo: number) => {
    const view = editorViewRef.current
    if (!view) return

    const lineContent = view.state.doc.sliceString(lineFrom, lineTo)
    const coords = view.coordsAtPos(lineFrom)
    if (!coords) return

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + 8 },
      triggerPos: lineFrom,
      componentType: componentName,
      pickerType,
      lineContent,
      lineFrom,
      lineTo,
    })
  }, [editorViewRef])

  const close = useCallback(() => {
    setState(initialState)
  }, [])

  const updateCode = useCallback((newLineContent: string) => {
    const view = editorViewRef.current
    if (!view || !stateRef.current.isOpen) return

    // Update the line in the editor
    view.dispatch({
      changes: {
        from: stateRef.current.lineFrom,
        to: stateRef.current.lineTo,
        insert: newLineContent,
      },
    })

    // Update our state with the new content and range
    const newLineTo = stateRef.current.lineFrom + newLineContent.length
    setState(prev => ({
      ...prev,
      lineContent: newLineContent,
      lineTo: newLineTo,
    }))
  }, [editorViewRef])

  return {
    state,
    open,
    openForLine,
    close,
    updateCode,
  }
}
