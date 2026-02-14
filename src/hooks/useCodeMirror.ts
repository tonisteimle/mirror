/**
 * useCodeMirror Hook
 *
 * Manages CodeMirror editor lifecycle: creation, updates, and destruction.
 * Extracted from PromptPanel for reusability and testability.
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { logger } from '../services/logger'

export interface UseCodeMirrorConfig {
  /** Initial document content */
  initialValue: string
  /** Called when document changes (internal edits only) */
  onChange: (value: string) => void
  /** Extensions to apply to the editor */
  extensions: Extension[]
}

export interface UseCodeMirrorReturn {
  /** Ref to attach to the container element */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** Ref to the EditorView instance */
  editorRef: React.RefObject<EditorView | null>
  /** Error if editor initialization failed */
  error: Error | null
  /** Clear the error to retry initialization */
  clearError: () => void
  /** Navigate to a specific line (0-indexed) */
  goToLine: (line: number) => void
  /** Update the editor content externally */
  setValue: (value: string) => void
}

/**
 * Hook for managing a CodeMirror editor instance.
 *
 * @example
 * ```tsx
 * const { containerRef, editorRef, error } = useCodeMirror({
 *   initialValue: 'Box "Hello"',
 *   onChange: (value) => console.log('Changed:', value),
 *   extensions: [lineNumbers(), dslTheme],
 * })
 *
 * return <div ref={containerRef} />
 * ```
 */
export function useCodeMirror({
  initialValue,
  onChange,
  extensions,
}: UseCodeMirrorConfig): UseCodeMirrorReturn {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const editorRef = useRef<EditorView | null>(null)
  const isInternalChange = useRef(false)
  const [error, setError] = useState<Error | null>(null)

  // Store latest onChange in ref to avoid re-creating editor on every change
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Store latest value for external updates
  const valueRef = useRef(initialValue)

  // Go to a specific line (0-indexed) and select it
  const goToLine = useCallback((line: number) => {
    const view = editorRef.current
    if (!view) return

    const doc = view.state.doc
    if (line >= doc.lines) return

    const lineInfo = doc.line(line + 1) // doc.line is 1-indexed

    view.dispatch({
      selection: { anchor: lineInfo.from, head: lineInfo.to },
      scrollIntoView: true,
    })
    view.focus()
  }, [])

  // Update editor content externally
  const setValue = useCallback((value: string) => {
    const view = editorRef.current
    if (!view) return

    const currentValue = view.state.doc.toString()
    if (currentValue === value) return

    isInternalChange.current = true
    view.dispatch({
      changes: { from: 0, to: currentValue.length, insert: value },
    })
    isInternalChange.current = false
    valueRef.current = value
  }, [])

  // Clear error to retry initialization
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Initialize editor
  useEffect(() => {
    if (!containerRef.current) return

    // Create update listener that calls onChange for non-internal changes
    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isInternalChange.current) {
        const newValue = update.state.doc.toString()
        valueRef.current = newValue
        onChangeRef.current(newValue)
      }
    })

    // Combine provided extensions with update listener
    const allExtensions = [...extensions, updateListener]

    let view: EditorView | null = null
    try {
      const state = EditorState.create({
        doc: initialValue,
        extensions: allExtensions,
      })

      view = new EditorView({
        state,
        parent: containerRef.current,
      })

      editorRef.current = view
      setError(null)
    } catch (err) {
      logger.ui.error('Editor initialization failed', err)
      setError(err instanceof Error ? err : new Error('Editor initialization failed'))
      return
    }

    return () => {
      view?.destroy()
      editorRef.current = null
    }
    // Note: We intentionally only depend on initialValue for creation.
    // Extensions changes require full re-mount which is handled by parent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue])

  return {
    containerRef,
    editorRef,
    error,
    clearError,
    goToLine,
    setValue,
  }
}
