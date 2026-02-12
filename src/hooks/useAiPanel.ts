/**
 * useAiPanel Hook
 *
 * Manages inline AI panel state for the editor.
 * Handles AI-powered code generation within the editor context.
 */
import { useState, useCallback, useRef } from 'react'
import type { EditorView } from '@codemirror/view'
import { generateDSLViaJSON } from '../lib/ai'
import { logger } from '../services/logger'
import { usePanelPosition, PANEL_OFFSET_Y } from './usePanelPosition'

export interface AiPanelState {
  isOpen: boolean
  position: { x: number; y: number }
  triggerPos: number
  isGenerating: boolean
}

const initialState: AiPanelState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  triggerPos: 0,
  isGenerating: false,
}

export function useAiPanel(editorRef: React.RefObject<EditorView | null>) {
  const [state, setState] = useState<AiPanelState>(initialState)
  const { getCursorPos, returnFocus } = usePanelPosition(editorRef)

  // Ref to access current state in closures
  const stateRef = useRef(state)
  stateRef.current = state

  /**
   * Open the AI panel at the current cursor position.
   */
  const open = useCallback(() => {
    const view = editorRef.current
    if (!view) return

    const cursorPos = getCursorPos()
    const coords = view.coordsAtPos(cursorPos)
    if (!coords) return

    setState({
      isOpen: true,
      position: { x: coords.left, y: coords.bottom + PANEL_OFFSET_Y },
      triggerPos: cursorPos,
      isGenerating: false,
    })
  }, [editorRef, getCursorPos])

  /**
   * Close the AI panel and return focus to editor.
   */
  const close = useCallback(() => {
    setState(prev => ({ ...prev, isOpen: false, isGenerating: false }))
    returnFocus()
  }, [returnFocus])

  /**
   * Handle AI generation and insert result at cursor.
   */
  const generate = useCallback(async (prompt: string) => {
    const view = editorRef.current
    if (!view) return

    const { triggerPos } = state

    // Show generating state
    setState(prev => ({ ...prev, isGenerating: true }))

    try {
      const generated = await generateDSLViaJSON(prompt)

      if (generated.layout) {
        // Get current line info for proper indentation
        const line = view.state.doc.lineAt(triggerPos)
        const lineText = line.text
        const indentMatch = lineText.match(/^(\s*)/)
        const indent = indentMatch ? indentMatch[1] : ''

        // Add indentation to each line of generated code
        const indentedCode = generated.layout
          .split('\n')
          .map((l, i) => i === 0 ? l : indent + l)
          .join('\n')

        // Remove the ? character and insert generated code
        const insertFrom = triggerPos > 0 &&
          view.state.doc.sliceString(triggerPos - 1, triggerPos) === '?'
          ? triggerPos - 1
          : triggerPos

        view.dispatch({
          changes: { from: insertFrom, to: triggerPos, insert: indentedCode },
        })
      }
    } catch (err) {
      logger.ai.error('Generation error', err)
    } finally {
      close()
    }
  }, [editorRef, close, state])

  /**
   * Get state ref for use in closures.
   */
  const getStateRef = useCallback(() => stateRef, [])

  return {
    state,
    stateRef,
    open,
    close,
    generate,
    getStateRef,
  }
}
