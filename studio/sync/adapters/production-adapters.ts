/**
 * Production Sync Adapters
 *
 * Production implementations of all sync ports that wrap the real
 * studio infrastructure (events, state, DOM, timing).
 */

import type {
  EventBusPort,
  StateStorePort,
  DOMQueryPort,
  ClockPort,
  SourceMapPort,
  SyncPorts,
  SelectionChangedEvent,
  SelectionOrigin,
  BreadcrumbItem,
  PreviewElement,
  SourceMapNode,
  SourceMapDefinition,
  CleanupFn,
} from '../ports'
import { state, actions, events } from '../../core'
import type { SourceMap } from '../../../compiler'

// ============================================
// Production Event Bus Port
// ============================================

export function createEventBusPort(): EventBusPort {
  return {
    onSelectionChanged(handler: (data: SelectionChangedEvent) => void): CleanupFn {
      return events.on('selection:changed', handler)
    },

    emitDefinitionSelected(componentName: string, origin: 'editor'): void {
      events.emit('definition:selected', { componentName, origin })
    },
  }
}

// ============================================
// Production State Store Port
// ============================================

export function createStateStorePort(): StateStorePort {
  return {
    getSelection(): { nodeId: string | null; origin: SelectionOrigin } {
      const selection = state.get().selection
      return { nodeId: selection.nodeId, origin: selection.origin as SelectionOrigin }
    },

    setSelection(nodeId: string | null, origin: SelectionOrigin): void {
      actions.setSelection(nodeId, origin)
    },

    setBreadcrumb(breadcrumb: BreadcrumbItem[]): void {
      actions.setBreadcrumb(breadcrumb)
    },
  }
}

// ============================================
// Production DOM Query Port
// ============================================

export interface DOMQueryPortConfig {
  /** CSS selector for the preview container. Defaults to '#preview' */
  previewSelector?: string
  /** Class name that marks the preview boundary. Defaults to 'mirror-root' */
  boundaryClass?: string
}

export function createDOMQueryPort(config: DOMQueryPortConfig = {}): DOMQueryPort {
  const { previewSelector = '#preview', boundaryClass = 'mirror-root' } = config

  return {
    findRootMirrorElement(): { nodeId: string } | null {
      const rootElement = document.querySelector(`${previewSelector} [data-mirror-id]`)
      if (!rootElement) return null

      const nodeId = rootElement.getAttribute('data-mirror-id')
      if (!nodeId) return null

      return { nodeId }
    },

    findElementByMirrorId(nodeId: string): PreviewElement | null {
      const element = document.querySelector(`[data-mirror-id="${nodeId}"]`)
      if (!element) return null

      return {
        nodeId,
        _ref: element, // Store DOM reference for parent traversal
      }
    },

    getParentWithMirrorId(element: PreviewElement): PreviewElement | null {
      const domElement = element._ref as Element | undefined
      if (!domElement) return null

      let current: Element | null = domElement.parentElement

      while (current) {
        const mirrorId = current.getAttribute('data-mirror-id')
        if (mirrorId) {
          return {
            nodeId: mirrorId,
            _ref: current,
          }
        }

        // Stop at preview boundary
        if (current.id === previewSelector.replace('#', '') || current.classList.contains(boundaryClass)) {
          break
        }

        current = current.parentElement
      }

      return null
    },

    isPreviewBoundary(element: PreviewElement): boolean {
      const domElement = element._ref as Element | undefined
      if (!domElement) return false

      return (
        domElement.id === previewSelector.replace('#', '') ||
        domElement.classList.contains(boundaryClass)
      )
    },
  }
}

// ============================================
// Production Clock Port
// ============================================

export function createClockPort(): ClockPort {
  return {
    setTimeout(callback: () => void, delay: number): number {
      return window.setTimeout(callback, delay) as unknown as number
    },

    clearTimeout(id: number): void {
      window.clearTimeout(id)
    },

    requestAnimationFrame(callback: () => void): number {
      return window.requestAnimationFrame(callback)
    },

    cancelAnimationFrame(id: number): void {
      window.cancelAnimationFrame(id)
    },
  }
}

// ============================================
// Production SourceMap Port
// ============================================

/**
 * Creates a SourceMap port that wraps a SourceMap instance.
 * The sourceMap can be updated via the returned setter.
 */
export interface SourceMapPortWithSetter extends SourceMapPort {
  setSourceMap(sourceMap: SourceMap | null): void
}

export function createSourceMapPort(initialSourceMap?: SourceMap | null): SourceMapPortWithSetter {
  let sourceMap: SourceMap | null = initialSourceMap ?? null

  return {
    getNodeById(nodeId: string): SourceMapNode | null {
      if (!sourceMap) return null

      const node = sourceMap.getNodeById(nodeId)
      if (!node) return null

      return {
        nodeId: node.nodeId,
        componentName: node.componentName,
        position: node.position,
      }
    },

    getNodeAtLine(line: number): SourceMapNode | null {
      if (!sourceMap) return null

      const node = sourceMap.getNodeAtLine(line)
      if (!node) return null

      return {
        nodeId: node.nodeId,
        componentName: node.componentName,
        position: node.position,
      }
    },

    getDefinitionAtLine(line: number): SourceMapDefinition | null {
      if (!sourceMap) return null

      const definition = sourceMap.getDefinitionAtLine(line)
      if (!definition) return null

      return {
        componentName: definition.componentName,
        position: definition.position ?? { line: 0, column: 0 },
      }
    },

    setSourceMap(newSourceMap: SourceMap | null): void {
      sourceMap = newSourceMap
    },
  }
}

// ============================================
// Combined Production Ports Factory
// ============================================

export interface ProductionSyncPortsConfig {
  dom?: DOMQueryPortConfig
  sourceMap?: SourceMap | null
}

export interface ProductionSyncPorts extends SyncPorts {
  sourceMap: SourceMapPortWithSetter
}

export function createProductionSyncPorts(config: ProductionSyncPortsConfig = {}): ProductionSyncPorts {
  return {
    eventBus: createEventBusPort(),
    stateStore: createStateStorePort(),
    domQuery: createDOMQueryPort(config.dom),
    clock: createClockPort(),
    sourceMap: createSourceMapPort(config.sourceMap),
  }
}
