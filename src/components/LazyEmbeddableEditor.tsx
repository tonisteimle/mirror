/**
 * LazyEmbeddableEditor Component
 *
 * Lazy-loaded wrapper for EmbeddableEditor that code-splits the CodeMirror editor.
 * Use this for documentation pages where the editor may not be immediately needed.
 */

import { lazy, Suspense, memo } from 'react'
import { EditorSkeleton } from './EditorSkeleton'

// Dynamic import creates a separate chunk
const EmbeddableEditor = lazy(() => import('./EmbeddableEditor'))

export interface LazyEmbeddableEditorProps {
  /** Initial Mirror code */
  initialCode: string
  /** Hidden prelude code (tokens, definitions) - parsed but not shown in editor */
  prelude?: string
  /** Height of the preview area (default: 200) */
  previewHeight?: number
  /** Whether the editor is read-only */
  readOnly?: boolean
}

/**
 * Lazy-loaded EmbeddableEditor with Suspense fallback.
 * Use this instead of EmbeddableEditor directly for code-splitting benefits.
 */
export const LazyEmbeddableEditor = memo(function LazyEmbeddableEditor(
  props: LazyEmbeddableEditorProps
) {
  return (
    <Suspense
      fallback={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          <EditorSkeleton lines={6} />
          <div
            style={{
              minHeight: props.previewHeight || 120,
              backgroundColor: '#0D0D0D',
              borderRadius: '0 0 8px 8px',
            }}
          />
        </div>
      }
    >
      <EmbeddableEditor {...props} />
    </Suspense>
  )
})

export default LazyEmbeddableEditor
