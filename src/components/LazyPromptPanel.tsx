/**
 * LazyPromptPanel Component
 *
 * Lazy-loaded wrapper for PromptPanel that code-splits the CodeMirror editor.
 * This reduces the initial bundle size by ~300KB as CodeMirror modules
 * are loaded on-demand when the editor is first rendered.
 */

import { lazy, Suspense, forwardRef, memo } from 'react'
import { EditorSkeleton } from './EditorSkeleton'
import type { PromptPanelRef } from './PromptPanel'
import type { TabType } from '../validation'
import type { PreviewOverride } from '../hooks/useCodeParsing'

// Dynamic import creates a separate chunk for CodeMirror and editor code
const PromptPanel = lazy(() =>
  import('./PromptPanel').then(module => ({ default: module.PromptPanel }))
)

/** Cursor position information */
export interface CursorPosition {
  line: number    // 0-indexed
  column: number  // 0-indexed
}

interface LazyPromptPanelProps {
  value: string
  onChange: (value: string) => void
  selectionPrefix?: string
  highlightLine?: number
  tab?: TabType
  getOtherTabCode?: () => string
  tokensCode?: string
  designTokens?: Map<string, unknown>
  autoCompleteMode?: 'always' | 'delay' | 'off'
  onPreviewChange?: (override: PreviewOverride | null) => void
  /** @deprecated Use onCursorChange instead */
  onCursorLineChange?: (line: number) => void
  /** Called when cursor position changes (line and column, both 0-indexed) */
  onCursorChange?: (pos: CursorPosition) => void
}

/**
 * Lazy-loaded PromptPanel with Suspense fallback.
 * Use this instead of PromptPanel directly for code-splitting benefits.
 */
export const LazyPromptPanel = memo(
  forwardRef<PromptPanelRef, LazyPromptPanelProps>(function LazyPromptPanel(
    props,
    ref
  ) {
    return (
      <Suspense fallback={<EditorSkeleton />}>
        <PromptPanel ref={ref} {...props} />
      </Suspense>
    )
  })
)

export default LazyPromptPanel
