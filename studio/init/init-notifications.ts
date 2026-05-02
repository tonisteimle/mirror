/**
 * Notification & Drag-Drop Event Handler Initialization
 *
 * Extracted from app.ts for modularity. Wires drag-drop events to the
 * studio code-modification pipeline and forces immediate recompilation
 * on `compile:requested` (bypasses the 300ms debounce so drag-drop
 * feels snappy).
 */

import { handleStudioDropNew } from '../drop'
import type { StudioInstance } from '../bootstrap'
import type { EditorView } from '@codemirror/view'
import type { AppGlobals } from '../drop'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('Notifications')

export interface NotificationInitConfig {
  studio: StudioInstance
  editor: EditorView
  compile: (code: string) => void
  debouncedCompile: { cancel?: () => void } | undefined
  debouncedSave: (code: string) => void
  getDropGlobals: () => AppGlobals
}

/**
 * Subscribes to studio drag/drop and compile-request events.
 * Returns a cleanup function (no-op for now — handlers live for the
 * studio lifetime).
 */
export function initNotifications(config: NotificationInitConfig): () => void {
  const { studio, editor, compile, debouncedCompile, debouncedSave, getDropGlobals } = config

  if (!studio?.events) {
    return () => undefined
  }

  studio.events.on('drag:dropped', ({ source, target, dragData }) => {
    if (!target) {
      log.warn('[Drag v3] Missing target')
      return
    }
    // Canvas-only state: editor has no Mirror node tree (just an empty
    // editor or a `canvas …` declaration). Mirror still synthesizes an
    // implicit wrapper node for hit-detection, but it has no source-map
    // entry, so handleStudioDropNew can't insert into it. Fall back to
    // "append as new top-level element" — what the user actually means
    // by dropping a palette item there.
    if (source?.type === 'palette') {
      const before = editor?.state?.doc?.toString() ?? ''
      const trimmed = before.trim()
      const isEmptyOrCanvasOnly = trimmed === '' || /^canvas\b[^\n]*$/i.test(trimmed)
      if (isEmptyOrCanvasOnly) {
        const componentName = (dragData && dragData.componentName) || source.componentName
        let elementCode = (dragData && dragData.mirTemplate) || componentName
        if (dragData && !dragData.mirTemplate) {
          if (dragData.textContent) elementCode += ' "' + dragData.textContent + '"'
          if (dragData.properties) {
            elementCode += dragData.textContent
              ? ', ' + dragData.properties
              : ' ' + dragData.properties
          }
        }
        // Drops on canvas-only state always append as plain top-level
        // elements. A proper alignment-zone-honoring fix needs a
        // Studio-level change in the drop pipeline. Until then, demos
        // that need a centred element should explicitly set `center`
        // via setProperty after the drop.
        const inserted = elementCode
        const appended =
          before.length === 0 ? inserted : before.replace(/\s*$/, '') + '\n\n' + inserted
        const len = editor.state.doc.length
        editor.dispatch({ changes: { from: 0, to: len, insert: appended } })
        // Force an immediate recompile so the SourceMap reflects the
        // newly inserted nodes — without this, subsequent drops into
        // those new nodes get silently rejected because their source-map
        // entries don't exist yet.
        try {
          studio.events.emit('compile:requested', {})
        } catch (_e) {
          /* ignore */
        }
        return
      }
    }

    // Handle canvas element move (type: 'canvas')
    if (source?.type === 'canvas' && source.nodeId) {
      const dropResult: import('../drop/types').DropResult = {
        source: {
          type: 'element',
          nodeId: source.nodeId,
        },
        targetNodeId: target.containerId,
        placement: target.mode === 'absolute' && target.position ? 'absolute' : 'inside',
        insertionIndex: target.insertionIndex,
        absolutePosition: target.position || undefined,
        alignment: target.mode === 'aligned' ? { zone: target.alignmentProperty } : undefined,
      }
      handleStudioDropNew(dropResult, getDropGlobals())
      return
    }

    // Handle palette component insert (type: 'palette')
    if (!dragData) {
      log.warn('[Drag v3] Missing dragData for palette drop')
      return
    }

    const dropResult: import('../drop/types').DropResult = {
      source: {
        type: 'palette',
        componentId: dragData.componentId,
        componentName: dragData.componentName,
        // 'template' is a legacy alias kept for downstream consumers;
        // the typed DropSource doesn't list it but extra fields are
        // accepted via structural typing.
        properties: dragData.properties,
        textContent: dragData.textContent,
        children: dragData.children,
        mirTemplate: dragData.mirTemplate,
        dataBlock: dragData.dataBlock,
      } as import('../drop/types').DropSource,
      targetNodeId: target.containerId,
      placement: target.mode === 'absolute' && target.position ? 'absolute' : 'inside',
      insertionIndex: target.insertionIndex,
      absolutePosition: target.position || undefined,
      alignment: target.mode === 'aligned' ? { zone: target.alignmentProperty } : undefined,
    }

    handleStudioDropNew(dropResult, getDropGlobals()).catch(err => {
      log.error('[Drag v3] handleStudioDropNew failed:', err)
    })
  })

  // Immediate compile when requested (bypasses 300ms debounce for drag-drop
  // operations) — significantly improves perceived performance after drops.
  studio.events.on('compile:requested', () => {
    if (debouncedCompile?.cancel) {
      debouncedCompile.cancel()
    }
    const code = editor?.state?.doc?.toString()
    if (code !== undefined) {
      compile(code)
      debouncedSave(code)
    }
  })

  return () => undefined
}
