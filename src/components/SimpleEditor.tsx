/**
 * SimpleEditor - Basic CodeMirror editor without AI features
 */
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import { EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { createMinimalExtensions } from '../editor'

export interface SimpleEditorRef {
  getEditorView(): EditorView | null
  focus(): void
  refreshDecorations(): void
}

interface SimpleEditorProps {
  value: string
  onChange: (value: string) => void
  highlightLine?: number
  designTokens?: Map<string, unknown>
}

export const SimpleEditor = forwardRef<SimpleEditorRef, SimpleEditorProps>(function SimpleEditor(
  { value, onChange },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  useImperativeHandle(ref, () => ({
    getEditorView: () => viewRef.current,
    focus: () => viewRef.current?.focus(),
    refreshDecorations: () => {
      // No-op for now
    },
  }))

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return

    const extensions = [
      ...createMinimalExtensions(),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString())
        }
      }),
    ]

    const state = EditorState.create({
      doc: value,
      extensions,
    })

    const view = new EditorView({
      state,
      parent: containerRef.current,
    })

    viewRef.current = view

    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, []) // Only create once

  // Update content when value changes externally
  useEffect(() => {
    const view = viewRef.current
    if (!view) return

    const currentContent = view.state.doc.toString()
    if (currentContent !== value) {
      view.dispatch({
        changes: {
          from: 0,
          to: currentContent.length,
          insert: value,
        },
      })
    }
  }, [value])

  return (
    <div
      ref={containerRef}
      style={{
        height: '100%',
        overflow: 'auto',
        backgroundColor: '#0D0D0D',
      }}
    />
  )
})
