/**
 * Drag & Drop System Initialization
 *
 * Extracted from bootstrap.ts for modularity.
 * Handles both NEW components (from palette) and MOVING elements (in preview).
 */

import { state, actions, events } from '../core'
import {
  createCodeExecutor,
  bootstrapDragDrop,
  type DragDropSystem,
  type DragDropBootstrapResult,
  type DragSource,
  type DropResult,
} from '../drag-drop'
import { CodeModifier } from '../../compiler/studio'
import type { EditorController } from '../editor'
import type { EditorView } from '@codemirror/view'
import type { SourceMap } from '../../compiler/ir/source-map'
import { createLogger } from '../../compiler/utils/logger'
import { dragPerf } from '../drag-drop/system/perf-logger'
import { initTestHarness } from '../drag-drop/test-harness'

const log = createLogger('DragDrop')

export interface DragDropInitConfig {
  /** Preview container element */
  container: HTMLElement
  /** CodeMirror editor instance */
  editor: EditorView
  /** Editor controller */
  editorController: EditorController
  /** Get current file name */
  getCurrentFile: () => string
}

export interface DragDropInitResult {
  /** The drag-drop system interface (for legacy compatibility) */
  system: DragDropSystem
  /** The v2 bootstrap result (for direct access) */
  v2: DragDropBootstrapResult
  /** Cleanup function */
  dispose: () => void
}

/**
 * Initialize the Drag & Drop System (Hexagonal Architecture)
 *
 * Creates both the v2 system and a legacy adapter for app.js compatibility.
 * Also exposes test API methods for E2E testing.
 */
export function initDragDrop(config: DragDropInitConfig): DragDropInitResult {
  const { container, editor, editorController, getCurrentFile } = config
  const eventUnsubscribes: Array<() => void> = []

  // Create code executor for drag-drop operations
  const codeExecutor = createCodeExecutor({
    getSource: () => editorController.getContent(),
    getResolvedSource: () => {
      // Resolved source = prelude + current file (matches SourceMap positions)
      const resolved = state.get().resolvedSource
      return resolved || editorController.getContent()
    },
    getPreludeOffset: () => state.get().preludeOffset,
    getSourceMap: () => state.get().sourceMap,
    getCurrentFile,
    applyChange: (newSource: string) => {
      const currentContent = editorController.getContent()
      if (newSource !== currentContent) {
        editor.dispatch({
          changes: { from: 0, to: currentContent.length, insert: newSource },
        })
      }
    },
    recompile: async () => {
      events.emit('compile:requested', {})
    },
    createModifier: (source: string, sourceMap: SourceMap) => {
      return new CodeModifier(source, sourceMap)
    },
  })

  // Bootstrap v2 drag-drop system
  const dragDropV2 = bootstrapDragDrop({
    container,
    getSource: () => editorController.getContent(),
    getResolvedSource: () => state.get().resolvedSource,
    getPreludeOffset: () => state.get().preludeOffset,
    getSourceMap: () => state.get().sourceMap,
    getCurrentFile,
    applyChange: (newSource: string) => {
      editorController.setContent(newSource)
    },
    recompile: () => {
      dragPerf.start('recompile:emit')
      events.emit('compile:requested', {})
      dragPerf.end('recompile:emit')
    },
    createModifier: (source: string, sourceMap: SourceMap) => {
      return new CodeModifier(source, sourceMap)
    },
    getLayoutInfo: () => state.get().layoutInfo,
    enableAltDuplicate: true,
    onDragStart: (source: DragSource) => {
      if (source.type === 'canvas') {
        log.info(' Move started:', source.nodeId)
      } else {
        log.info(' Insert started:', source.componentName)
      }
    },
    onDrop: (source: DragSource, result: DropResult) => {
      log.info(' Drop:', source.type, result.placement, result.targetId)
      if (result.target?.nodeId) {
        actions.setDeferredSelection({
          type: 'nodeId',
          nodeId: result.target.nodeId,
          origin: 'preview',
        })
      }
    },
    onDragEnd: (source: DragSource, success: boolean) => {
      log.info(' End:', success ? 'success' : 'cancelled')
    },
  })

  // Legacy adapter for compatibility with app.js (uses makeElementDraggable)
  // Also exposes test API methods for E2E testing
  const dragDropSystem: DragDropSystem = {
    init: () => {},
    registerPaletteItem: () => () => {},
    enableCanvasDrag: (nodeId: string) => {
      const element = container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement
      if (!element) return () => {}
      return dragDropV2.registerCanvasElement(nodeId, element)
    },
    makeElementDraggable: (element: HTMLElement) => {
      const nodeId = element.getAttribute('data-mirror-id')
      if (!nodeId) {
        log.warn(' makeElementDraggable: element has no data-mirror-id')
        return () => {}
      }
      return dragDropV2.registerCanvasElement(nodeId, element)
    },
    disable: () => dragDropV2.disable(),
    enable: () => dragDropV2.enable(),
    isDisabled: () => dragDropV2.isDisabled(),
    dispose: () => dragDropV2.dispose(),

    // ============================================
    // Test API Methods (for E2E testing)
    // ============================================
    simulateInsert: (params: {
      componentName: string
      targetNodeId: string
      placement: 'before' | 'after' | 'inside'
      properties?: string
      textContent?: string
    }) => {
      return dragDropV2.controller.simulateInsert({
        ...params,
        container,
        nodeIdAttr: 'data-mirror-id',
      })
    },

    simulateInsertAbsolute: (params: {
      componentName: string
      targetNodeId: string
      position: { x: number; y: number }
      properties?: string
      textContent?: string
    }) => {
      return dragDropV2.controller.simulateInsertAbsolute({
        ...params,
        container,
        nodeIdAttr: 'data-mirror-id',
      })
    },

    simulateMove: (params: {
      sourceNodeId: string
      targetNodeId: string
      placement: 'before' | 'after' | 'inside'
    }) => {
      return dragDropV2.controller.simulateMove({
        ...params,
        container,
        nodeIdAttr: 'data-mirror-id',
      })
    },

    simulateDuplicate: (params: {
      sourceNodeId: string
      targetNodeId: string
      placement: 'before' | 'after' | 'inside'
    }) => {
      return dragDropV2.controller.simulateDuplicate({
        ...params,
        container,
        nodeIdAttr: 'data-mirror-id',
      })
    },

    simulateDragTo: (cursor: { x: number; y: number }) => {
      // Create a generic source for position calculation
      const source = {
        type: 'palette' as const,
        componentName: 'Frame',
      }
      return dragDropV2.controller.simulateDragTo(source, cursor)
    },

    getState: () => {
      const dragState = dragDropV2.controller.getState()
      return {
        isActive: dragState.type === 'dragging' || dragState.type === 'over-target',
        source:
          dragState.type === 'dragging' || dragState.type === 'over-target'
            ? dragState.source
            : null,
        currentTarget: dragState.type === 'over-target' ? dragState.target : null,
        currentResult: dragState.type === 'over-target' ? dragState.result : null,
      }
    },

    getVisualState: () => {
      const visualState = dragDropV2.controller.getVisualState()
      return {
        indicatorVisible: visualState.hasIndicator,
        indicatorRect: null, // Would need to query DOM for actual rect
        parentOutlineVisible: visualState.hasOutline,
        parentOutlineRect: null, // Would need to query DOM for actual rect
      }
    },
  } as unknown as DragDropSystem

  // Disable drag during compile to prevent stale SourceMap issues
  eventUnsubscribes.push(
    events.on('compile:requested', () => {
      dragDropSystem.disable()
    })
  )

  eventUnsubscribes.push(
    events.on('compile:completed', () => {
      dragDropSystem.enable()
    })
  )

  // Expose for E2E testing
  if (typeof window !== 'undefined') {
    ;(window as any).__mirrorDragDropV2__ = dragDropV2

    // Initialize test harness for performance testing
    initTestHarness()
  }

  log.info('Drag-drop initialized')

  return {
    system: dragDropSystem,
    v2: dragDropV2,
    dispose: () => {
      for (const unsubscribe of eventUnsubscribes) {
        unsubscribe()
      }
      dragDropV2.dispose()
    },
  }
}
