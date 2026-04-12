/**
 * DrawManager Initialization
 *
 * Extracted from bootstrap.ts for modularity.
 * Handles component drawing (click-and-drag to create elements).
 */

import { state, events } from '../core'
import { DrawManager, createDrawManager } from '../visual/draw-manager'
import { CodeModifier } from '../../compiler/studio'
import type { EditorController } from '../editor'

export interface DrawManagerInitConfig {
  /** Preview container element */
  container: HTMLElement
  /** CodeMirror editor instance */
  editor: any
  /** Editor controller */
  editorController: EditorController
}

export interface DrawManagerInitResult {
  /** The draw manager instance */
  drawManager: DrawManager
  /** Cleanup function */
  dispose: () => void
}

/**
 * Initialize the DrawManager for component drawing
 */
export function initDrawManager(config: DrawManagerInitConfig): DrawManagerInitResult {
  const { container, editor, editorController } = config

  const drawManager = createDrawManager({
    container,
    getCodeModifier: () => {
      const source = state.get().source
      const sourceMap = state.get().sourceMap
      if (!sourceMap) {
        throw new Error('SourceMap not available')
      }
      return new CodeModifier(source, sourceMap)
    },
    sourceMap: () => state.get().sourceMap,
    gridSize: 8,  // 8px grid snapping
    enableSmartGuides: true,  // Enable alignment guides
    snapTolerance: 4,  // 4px snap threshold
    // Phase 5: Use cached layoutInfo instead of DOM reads
    getLayoutInfo: () => state.get().layoutInfo,
  })

  drawManager.onDrawComplete = (result) => {
    if (result.success && result.modificationResult) {
      console.log('[DrawManager] Component created:', result.nodeId)

      // Apply code change to editor (adjust for prelude offset)
      const preludeOffset = state.get().preludeOffset
      const change = result.modificationResult.change

      const adjustedChange = {
        from: change.from - preludeOffset,
        to: change.to - preludeOffset,
        insert: change.insert
      }

      // Validate adjusted change range
      const docLength = editorController.getContent().length
      if (adjustedChange.from >= 0 && adjustedChange.to <= docLength && adjustedChange.from <= adjustedChange.to) {
        // Apply change to editor
        editor.dispatch({
          changes: adjustedChange
        })

        // Compile will be triggered automatically by editor change
        console.log('[DrawManager] Editor updated')
      } else {
        console.warn('[DrawManager] Invalid change range, forcing recompile', {
          original: change,
          adjusted: adjustedChange,
          preludeOffset,
          docLength
        })
        // Force recompile
        events.emit('compile:requested', {})
      }
    }
  }

  drawManager.onDrawCancel = () => {
    console.log('[DrawManager] Drawing cancelled')
  }

  drawManager.onError = (error) => {
    console.error('[DrawManager] Error:', error)
  }

  return {
    drawManager,
    dispose: () => {
      // DrawManager doesn't have a dispose method currently
      // but we include it for consistency
    },
  }
}
