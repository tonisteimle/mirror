/**
 * Bootstrap Integration Example
 *
 * This file demonstrates how to wire up the new hexagonal Drag & Drop architecture
 * in the Studio application. It shows the complete integration pattern including:
 *
 * 1. Creating DOM adapters for production use
 * 2. Setting up the DragDropController
 * 3. Integrating NativeDragAdapter for ComponentPanel drag
 * 4. Registering canvas elements for dragging
 * 5. Proper cleanup on disposal
 *
 * This is a REFERENCE IMPLEMENTATION - adapt it to your specific needs.
 */

import type { SourceMap } from '../../../compiler/ir/source-map'
import type { CodeModifier } from '../../../compiler/studio'
import type { LayoutRect } from '../../core/state'
import {
  DragDropController,
  createDragDropController,
  createDOMPorts,
  createDOMEventPort,
  createNativeDragAdapter,
  type DOMEventPort,
  type DOMPortsConfig,
  type NativeDragAdapter,
  type CleanupFn,
} from './index'

// ============================================
// Configuration Types
// ============================================

export interface DragDropBootstrapConfig {
  /** Container element where dragging happens (preview container) */
  container: HTMLElement

  /** Get current source code (for code executor) */
  getSource: () => string

  /** Get resolved source (prelude + current file) */
  getResolvedSource: () => string

  /** Get prelude offset for code position adjustment */
  getPreludeOffset: () => number

  /** Get current SourceMap */
  getSourceMap: () => SourceMap | null

  /** Get current filename */
  getCurrentFile: () => string

  /** Apply modified source to editor */
  applyChange: (newSource: string) => void

  /** Trigger recompile after modification */
  recompile: () => void

  /** Create CodeModifier instance */
  createModifier: (source: string, sourceMap: SourceMap) => CodeModifier

  /** Optional: Get cached layout info */
  getLayoutInfo?: () => Map<string, LayoutRect> | null

  /** Optional: Enable Alt+Drop duplicate */
  enableAltDuplicate?: boolean

  /** Optional: Callbacks for drag lifecycle */
  onDragStart?: (source: any) => void
  onDrop?: (source: any, result: any) => void
  onDragEnd?: (source: any, success: boolean) => void
}

export interface DragDropBootstrapResult {
  /** The main controller - exposes state and test APIs */
  controller: DragDropController

  /** The DOM event port - use for registering draggable elements */
  eventPort: DOMEventPort

  /** The native drag adapter - handles ComponentPanel drags */
  nativeAdapter: NativeDragAdapter

  /** Register a canvas element for dragging */
  registerCanvasElement: (nodeId: string, element: HTMLElement) => CleanupFn

  /** Disable drag operations (e.g., during compile) */
  disable: () => void

  /** Enable drag operations */
  enable: () => void

  /** Check if drag is disabled */
  isDisabled: () => boolean

  /** Clean up all resources */
  dispose: () => void
}

// ============================================
// Bootstrap Function
// ============================================

/**
 * Initialize the new hexagonal Drag & Drop system.
 *
 * This wires up all components:
 * - DOMPorts for production use
 * - DragDropController as the main orchestrator
 * - NativeDragAdapter for ComponentPanel integration
 *
 * @example
 * ```typescript
 * const dragDrop = bootstrapDragDrop({
 *   container: previewContainer,
 *   getSource: () => editorController.getContent(),
 *   getResolvedSource: () => state.get().resolvedSource,
 *   getPreludeOffset: () => state.get().preludeOffset,
 *   getSourceMap: () => state.get().sourceMap,
 *   getCurrentFile: () => 'index.mir',
 *   applyChange: (newSource) => {
 *     editor.dispatch({ changes: { from: 0, to: editor.length, insert: newSource } })
 *   },
 *   recompile: () => events.emit('compile:requested', {}),
 *   createModifier: (source, sourceMap) => new CodeModifier(source, sourceMap),
 * })
 *
 * // Register existing canvas elements
 * document.querySelectorAll('[data-node-id]').forEach(el => {
 *   const nodeId = el.getAttribute('data-node-id')
 *   if (nodeId) {
 *     dragDrop.registerCanvasElement(nodeId, el as HTMLElement)
 *   }
 * })
 *
 * // Disable during compile
 * events.on('compile:requested', () => dragDrop.disable())
 * events.on('compile:completed', () => dragDrop.enable())
 *
 * // Cleanup on unmount
 * onUnmount(() => dragDrop.dispose())
 * ```
 */
export function bootstrapDragDrop(config: DragDropBootstrapConfig): DragDropBootstrapResult {
  const cleanupFns: CleanupFn[] = []

  // ----------------------------------------
  // 1. Create DOM Event Port
  // ----------------------------------------
  // This handles Pragmatic DnD events for canvas elements
  const eventPort = createDOMEventPort() as DOMEventPort

  // ----------------------------------------
  // 2. Create DOM Ports Configuration
  // ----------------------------------------
  const portsConfig: DOMPortsConfig = {
    container: config.container,
    nodeIdAttr: 'data-node-id',
    getLayoutInfo: config.getLayoutInfo,
    executorDeps: {
      getSource: config.getSource,
      getResolvedSource: config.getResolvedSource,
      getPreludeOffset: config.getPreludeOffset,
      getSourceMap: config.getSourceMap,
      getCurrentFile: config.getCurrentFile,
      applyChange: config.applyChange,
      recompile: async () => { config.recompile() },
      createModifier: config.createModifier,
    },
  }

  // ----------------------------------------
  // 3. Create All DOM Ports
  // ----------------------------------------
  // This creates all ports except events (which we created separately)
  const ports = createDOMPorts(portsConfig)

  // Replace events port with our extended version
  const fullPorts = {
    ...ports,
    events: eventPort,
  }

  // ----------------------------------------
  // 4. Create DragDropController
  // ----------------------------------------
  const controller = createDragDropController(fullPorts, {
    enableAltDuplicate: config.enableAltDuplicate ?? true,
    onDragStart: config.onDragStart,
    onDrop: config.onDrop,
    onDragEnd: config.onDragEnd,
  })

  // Initialize the controller (binds event handlers)
  controller.init()

  // ----------------------------------------
  // 5. Create NativeDragAdapter
  // ----------------------------------------
  // This bridges HTML5 drag events from ComponentPanel
  const nativeAdapter = createNativeDragAdapter({
    container: config.container,
    eventPort,
    isDisabled: () => controller.isDisabled(),
  })

  // Initialize native adapter
  nativeAdapter.init()
  cleanupFns.push(() => nativeAdapter.dispose())

  // ----------------------------------------
  // 6. Build Public API
  // ----------------------------------------
  return {
    controller,
    eventPort,
    nativeAdapter,

    registerCanvasElement(nodeId: string, element: HTMLElement): CleanupFn {
      const cleanup = eventPort.registerCanvasDrag(nodeId, element)
      cleanupFns.push(cleanup)
      return cleanup
    },

    disable(): void {
      controller.disable()
    },

    enable(): void {
      controller.enable()
    },

    isDisabled(): boolean {
      return controller.isDisabled()
    },

    dispose(): void {
      controller.dispose()
      for (const cleanup of cleanupFns) {
        cleanup()
      }
      cleanupFns.length = 0
    },
  }
}

// ============================================
// Integration with RenderPipeline
// ============================================

/**
 * Create a render pipeline integration that automatically
 * registers canvas elements after each render.
 *
 * @example
 * ```typescript
 * const dragDrop = bootstrapDragDrop(config)
 *
 * // Auto-register elements after each render
 * const unsubscribe = createRenderIntegration(
 *   dragDrop,
 *   () => previewContainer.querySelectorAll('[data-node-id]')
 * )
 * ```
 */
export function createRenderIntegration(
  bootstrap: DragDropBootstrapResult,
  getElements: () => NodeListOf<Element> | Element[]
): CleanupFn {
  const registrations = new Map<string, CleanupFn>()

  // This would be called after each render
  function updateRegistrations(): void {
    const elements = getElements()
    const currentNodeIds = new Set<string>()

    // Register new elements
    elements.forEach((el) => {
      const nodeId = el.getAttribute('data-node-id')
      if (!nodeId) return

      currentNodeIds.add(nodeId)

      // Skip if already registered
      if (registrations.has(nodeId)) return

      // Register new element
      const cleanup = bootstrap.registerCanvasElement(nodeId, el as HTMLElement)
      registrations.set(nodeId, cleanup)
    })

    // Unregister removed elements
    for (const [nodeId, cleanup] of registrations) {
      if (!currentNodeIds.has(nodeId)) {
        cleanup()
        registrations.delete(nodeId)
      }
    }
  }

  // Initial registration
  updateRegistrations()

  // Return cleanup function
  return () => {
    for (const cleanup of registrations.values()) {
      cleanup()
    }
    registrations.clear()
  }
}

// ============================================
// Test Utilities
// ============================================

/**
 * Create a test-friendly bootstrap with mock ports.
 * Useful for unit tests that don't need real DOM.
 *
 * @example
 * ```typescript
 * const { controller, mockPorts } = createTestBootstrap()
 *
 * // Simulate a drag operation
 * controller.simulateMove({
 *   sourceNodeId: 'node1',
 *   targetNodeId: 'node2',
 *   placement: 'after',
 *   container: testContainer,
 * })
 *
 * // Verify execution was called
 * expect(mockPorts.execution.execute).toHaveBeenCalled()
 * ```
 */
export function createTestBootstrap() {
  // Import mock adapters dynamically to avoid bundling in production
  const { createMockPorts } = require('./adapters/mock-adapters')

  const mockPorts = createMockPorts()
  const controller = createDragDropController(mockPorts)

  return {
    controller,
    mockPorts,
    dispose: () => controller.dispose(),
  }
}
