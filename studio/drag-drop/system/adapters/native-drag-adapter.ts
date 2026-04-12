/**
 * Native Drag Adapter
 *
 * Bridges native HTML5 drag events (from ComponentPanel) to the EventPort interface.
 * This enables the DragDropController to handle both:
 * - Pragmatic DnD events (canvas element dragging)
 * - Native HTML5 drag events (palette component dragging)
 *
 * Architecture:
 * ```
 * ComponentPanel (dragstart)
 *       │
 *       ▼ dataTransfer.setData('application/mirror-component', ...)
 *       │
 * NativeDragAdapter (dragover/drop on container)
 *       │
 *       ▼ triggerDragStart/Move/End/Cancel
 *       │
 * EventPort → DragDropController
 * ```
 */

import type { DragSource, Point } from '../../types'
import type { EventPort } from '../ports'

// ============================================
// Types
// ============================================

export const MIRROR_COMPONENT_MIME = 'application/mirror-component'

/**
 * Data transferred during native HTML5 drag operations.
 * Similar to ComponentDragData from panels/components/types but simplified.
 */
export interface NativeComponentDragData {
  componentId: string
  componentName: string
  properties?: string
  textContent?: string
  children?: any[]
  fromComponentPanel?: boolean
}

export interface NativeDragAdapterConfig {
  /** Container element to listen for drag events on */
  container: HTMLElement

  /** Event port to trigger drag events on */
  eventPort: EventPort & {
    triggerDragStart(source: DragSource, cursor: Point): void
    triggerDragMove(cursor: Point): void
    triggerDragEnd(): void
    triggerDragCancel(): void
  }

  /** Optional: Check if drag handling is disabled */
  isDisabled?: () => boolean

  /** Optional: Default component size for ghost rendering */
  getDefaultSize?: (componentName: string) => { width: number; height: number }
}

export interface NativeDragAdapter {
  /** Start listening for native drag events */
  init(): void

  /** Stop listening and clean up */
  dispose(): void

  /** Check if currently handling a native drag */
  isActive(): boolean
}

// ============================================
// Default Size Provider
// ============================================

const DEFAULT_COMPONENT_SIZES: Record<string, { width: number; height: number }> = {
  Frame: { width: 100, height: 100 },
  Text: { width: 100, height: 24 },
  Button: { width: 100, height: 40 },
  Input: { width: 200, height: 40 },
  default: { width: 100, height: 40 },
}

function getDefaultComponentSize(componentName: string): { width: number; height: number } {
  return DEFAULT_COMPONENT_SIZES[componentName] || DEFAULT_COMPONENT_SIZES.default
}

// ============================================
// Native Drag Adapter Implementation
// ============================================

export function createNativeDragAdapter(config: NativeDragAdapterConfig): NativeDragAdapter {
  const { container, eventPort, isDisabled, getDefaultSize = getDefaultComponentSize } = config

  let active = false
  let currentSource: DragSource | null = null
  let abortController: AbortController | null = null

  // ----------------------------------------
  // Event Handlers
  // ----------------------------------------

  function handleDragOver(e: DragEvent): void {
    if (isDisabled?.()) return
    if (!isMirrorComponentDrag(e)) return

    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy'
    }

    const cursor = { x: e.clientX, y: e.clientY }

    // First dragover starts the drag
    if (!active) {
      const source = extractDragSource(e)
      if (!source) return

      active = true
      currentSource = source
      eventPort.triggerDragStart(source, cursor)
    } else {
      // Subsequent dragovers are moves
      eventPort.triggerDragMove(cursor)
    }
  }

  function handleDragEnter(e: DragEvent): void {
    if (isDisabled?.()) return
    if (!isMirrorComponentDrag(e)) return

    e.preventDefault()
  }

  function handleDragLeave(e: DragEvent): void {
    if (isDisabled?.()) return
    if (!isMirrorComponentDrag(e)) return

    // Only cancel if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement | null
    if (relatedTarget && container.contains(relatedTarget)) return

    if (active) {
      eventPort.triggerDragCancel()
      resetState()
    }
  }

  function handleDrop(e: DragEvent): void {
    if (isDisabled?.()) return
    if (!isMirrorComponentDrag(e)) return

    e.preventDefault()

    // Re-extract source from actual drop data (may have more complete data)
    const source = extractDragSourceFromData(e)
    if (source && active) {
      // Update source with complete data from drop
      currentSource = source
    }

    if (active) {
      eventPort.triggerDragEnd()
      resetState()
    }
  }

  // ----------------------------------------
  // Helper Functions
  // ----------------------------------------

  function isMirrorComponentDrag(e: DragEvent): boolean {
    return e.dataTransfer?.types.includes(MIRROR_COMPONENT_MIME) ?? false
  }

  function extractDragSource(e: DragEvent): DragSource | null {
    // During dragover, we can only access types, not data
    // We use a minimal source that will be enriched on drop
    // Try to get data if available (some browsers allow it)
    const source = extractDragSourceFromData(e)
    if (source) return source

    // Fallback: create a generic palette source
    // This will be updated with real data on drop
    return {
      type: 'palette',
      componentName: 'Frame', // Placeholder, will be updated
    }
  }

  function extractDragSourceFromData(e: DragEvent): DragSource | null {
    if (!e.dataTransfer) return null

    try {
      const jsonData = e.dataTransfer.getData(MIRROR_COMPONENT_MIME)
      if (!jsonData) return null

      const data: NativeComponentDragData = JSON.parse(jsonData)
      const size = getDefaultSize(data.componentName)

      return {
        type: 'palette',
        componentId: data.componentId,
        componentName: data.componentName,
        properties: data.properties,
        textContent: data.textContent,
        children: data.children,
        size,
      }
    } catch (error) {
      console.warn('[DragDrop] Failed to parse component drag data:', error)
      return null
    }
  }

  function resetState(): void {
    active = false
    currentSource = null
  }

  // ----------------------------------------
  // Public API
  // ----------------------------------------

  return {
    init(): void {
      abortController = new AbortController()
      const signal = abortController.signal

      container.addEventListener('dragover', handleDragOver, { signal })
      container.addEventListener('dragenter', handleDragEnter, { signal })
      container.addEventListener('dragleave', handleDragLeave, { signal })
      container.addEventListener('drop', handleDrop, { signal })
    },

    dispose(): void {
      abortController?.abort()
      abortController = null
      resetState()
    },

    isActive(): boolean {
      return active
    },
  }
}

// ============================================
// Test Utilities
// ============================================

/**
 * Create a mock DragEvent for testing
 */
export function createMockDragEvent(
  type: 'dragover' | 'dragenter' | 'dragleave' | 'drop',
  options: {
    clientX?: number
    clientY?: number
    types?: string[]
    data?: Record<string, string>
    relatedTarget?: HTMLElement | null
  } = {}
): DragEvent {
  const {
    clientX = 100,
    clientY = 100,
    types = [MIRROR_COMPONENT_MIME],
    data = {},
    relatedTarget = null,
  } = options

  const mockDataTransfer = {
    types,
    dropEffect: 'none' as string,
    getData: (mime: string) => data[mime] ?? '',
    setData: () => {},
  }

  const event = new Event(type, { bubbles: true, cancelable: true }) as DragEvent

  Object.defineProperty(event, 'clientX', { value: clientX })
  Object.defineProperty(event, 'clientY', { value: clientY })
  Object.defineProperty(event, 'dataTransfer', { value: mockDataTransfer })
  Object.defineProperty(event, 'relatedTarget', { value: relatedTarget })

  return event
}

/**
 * Create mock component drag data
 */
export function createMockComponentData(
  componentName: string,
  options: Partial<NativeComponentDragData> = {}
): string {
  const data: NativeComponentDragData = {
    componentId: options.componentId ?? componentName.toLowerCase(),
    componentName,
    properties: options.properties,
    textContent: options.textContent,
    children: options.children,
    fromComponentPanel: options.fromComponentPanel ?? true,
  }
  return JSON.stringify(data)
}
