/**
 * CodeDisplay - Read-only code display with Mirror DSL syntax highlighting
 */

import { useEffect, useRef } from 'react'
import { EditorView } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { dslTheme, dslHighlighter } from '../editor'

interface CodeDisplayProps {
  code: string
  className?: string
  style?: React.CSSProperties
}

export function CodeDisplay({ code, className, style }: CodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Create read-only editor with syntax highlighting
    const state = EditorState.create({
      doc: code,
      extensions: [
        dslTheme,
        dslHighlighter,
        EditorView.editable.of(false),
        EditorView.lineWrapping,
        EditorState.readOnly.of(true),
      ],
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
  }, [])

  // Update code when it changes
  useEffect(() => {
    if (viewRef.current) {
      const currentCode = viewRef.current.state.doc.toString()
      if (currentCode !== code) {
        viewRef.current.dispatch({
          changes: { from: 0, to: currentCode.length, insert: code },
        })
      }
    }
  }, [code])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        fontSize: 13,
        lineHeight: 1.5,
        fontFamily: 'JetBrains Mono, monospace',
        ...style,
      }}
    />
  )
}
