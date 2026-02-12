/**
 * useEditorTriggers Hook
 *
 * Handles trigger character detection and panel state updates during editing.
 * Creates the update listener extension for the editor.
 */

import { useCallback, useMemo, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { getCharBefore } from '../editor/utils'
import { handleTriggerCharacter, type TriggerHandlers, type TriggerState } from '../editor/trigger-handlers'
import type { ColorPanelState } from './useColorPanel'

export interface EditorTriggerConfig {
  /** Callback for document changes */
  onChange: (value: string) => void
  /** Get current trigger handlers */
  getTriggerHandlers: () => TriggerHandlers
  /** Get current trigger state (which panels are open) */
  getTriggerState: () => TriggerState
  /** Get current color panel state */
  getColorPanelState: () => ColorPanelState
  /** Close the color panel */
  closeColorPanel: () => void
  /** Update color panel filter */
  updateColorPanelFilter: (filter: string) => void
}

export interface UseEditorTriggersReturn {
  /** Extension to add to the editor for trigger handling */
  triggerExtension: Extension
  /** Schedule a trigger callback with cleanup on unmount */
  scheduleTrigger: (fn: () => void, delay: number) => void
  /** Clear all pending triggers */
  clearTriggers: () => void
  /** Ref for autocomplete timeout management */
  autoCompleteTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>
}

/**
 * Hook for managing editor trigger characters and panel updates.
 *
 * @param config - Configuration for trigger handling
 * @returns Extension and utilities for trigger management
 */
export function useEditorTriggers(config: EditorTriggerConfig): UseEditorTriggersReturn {
  // Store config in ref so the extension always uses current values
  const configRef = useRef(config)
  configRef.current = config

  const triggerTimeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set())
  const autoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInternalChangeRef = useRef(false)

  // Schedule a trigger timeout that will be cleaned up
  const scheduleTrigger = useCallback((fn: () => void, delay: number) => {
    const timeoutId = setTimeout(() => {
      triggerTimeoutsRef.current.delete(timeoutId)
      fn()
    }, delay)
    triggerTimeoutsRef.current.add(timeoutId)
  }, [])

  // Clear all pending triggers
  const clearTriggers = useCallback(() => {
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current)
      autoCompleteTimeoutRef.current = null
    }
    for (const timeoutId of triggerTimeoutsRef.current) {
      clearTimeout(timeoutId)
    }
    triggerTimeoutsRef.current.clear()
  }, [])

  // Create the update listener extension (uses configRef for current values)
  // Must be memoized to prevent editor recreation on every render
  const triggerExtension = useMemo(() => EditorView.updateListener.of((update) => {
    if (update.docChanged && !isInternalChangeRef.current) {
      const {
        onChange,
        getTriggerHandlers,
        getTriggerState,
        getColorPanelState,
        closeColorPanel,
        updateColorPanelFilter,
      } = configRef.current

      // Notify of content change
      onChange(update.state.doc.toString())

      // Cancel pending autocomplete timeout
      if (autoCompleteTimeoutRef.current) {
        clearTimeout(autoCompleteTimeoutRef.current)
        autoCompleteTimeoutRef.current = null
      }

      // Detect trigger characters
      const cursorPos = update.state.selection.main.head
      if (cursorPos > 0) {
        const charBefore = getCharBefore(update.view, cursorPos)
        const line = update.state.doc.lineAt(cursorPos)
        const textBefore = line.text.slice(0, cursorPos - line.from)

        handleTriggerCharacter(
          charBefore,
          textBefore,
          getTriggerHandlers(),
          getTriggerState(),
          scheduleTrigger
        )
      }

      // Update color panel filter if open
      const colorPanelState = getColorPanelState()
      if (colorPanelState.isOpen) {
        const doc = update.state.doc

        if (cursorPos < colorPanelState.triggerPos) {
          closeColorPanel()
          return
        }

        let filter = doc.sliceString(colorPanelState.triggerPos, cursorPos)
        if (filter.startsWith('#')) {
          filter = filter.slice(1)
        }

        if (filter.includes('\n') || filter.includes(' ')) {
          closeColorPanel()
          return
        }

        updateColorPanelFilter(filter)
      }
    }
  }), [scheduleTrigger])

  return {
    triggerExtension,
    scheduleTrigger,
    clearTriggers,
    autoCompleteTimeoutRef,
  }
}
