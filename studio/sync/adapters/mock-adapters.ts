/**
 * Mock Sync Adapters
 *
 * Mock implementations of all sync ports for testing.
 * These run entirely in-memory without DOM, events, or global state.
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

// ============================================
// Mock Event Bus Port
// ============================================

export interface MockEventBusPortState {
  selectionHandlers: Set<(data: SelectionChangedEvent) => void>
  emittedDefinitions: Array<{ componentName: string; origin: 'editor' }>
}

export interface MockEventBusPort extends EventBusPort {
  // Test helpers - simulation
  simulateSelectionChanged(data: SelectionChangedEvent): void

  // Test helpers - inspection
  getState(): MockEventBusPortState
  getEmittedDefinitions(): Array<{ componentName: string; origin: 'editor' }>

  // Test helpers - reset
  reset(): void
}

export function createMockEventBusPort(): MockEventBusPort {
  const selectionHandlers = new Set<(data: SelectionChangedEvent) => void>()
  const emittedDefinitions: Array<{ componentName: string; origin: 'editor' }> = []

  return {
    // ----------------------------------------
    // EventBusPort Implementation
    // ----------------------------------------

    onSelectionChanged(handler: (data: SelectionChangedEvent) => void): CleanupFn {
      selectionHandlers.add(handler)
      return () => selectionHandlers.delete(handler)
    },

    emitDefinitionSelected(componentName: string, origin: 'editor'): void {
      emittedDefinitions.push({ componentName, origin })
    },

    // ----------------------------------------
    // Test Helpers - Simulation
    // ----------------------------------------

    simulateSelectionChanged(data: SelectionChangedEvent): void {
      selectionHandlers.forEach((handler) => handler(data))
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getState(): MockEventBusPortState {
      return {
        selectionHandlers: new Set(selectionHandlers),
        emittedDefinitions: [...emittedDefinitions],
      }
    },

    getEmittedDefinitions(): Array<{ componentName: string; origin: 'editor' }> {
      return [...emittedDefinitions]
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      selectionHandlers.clear()
      emittedDefinitions.length = 0
    },
  }
}

// ============================================
// Mock State Store Port
// ============================================

export interface MockStateStorePortState {
  selection: { nodeId: string | null; origin: SelectionOrigin }
  breadcrumb: BreadcrumbItem[]
  selectionHistory: Array<{ nodeId: string | null; origin: SelectionOrigin }>
  breadcrumbHistory: BreadcrumbItem[][]
}

export interface MockStateStorePort extends StateStorePort {
  // Test helpers - inspection
  getState(): MockStateStorePortState
  getSelectionHistory(): Array<{ nodeId: string | null; origin: SelectionOrigin }>
  getBreadcrumbHistory(): BreadcrumbItem[][]

  // Test helpers - reset
  reset(): void
}

export function createMockStateStorePort(): MockStateStorePort {
  let selection: { nodeId: string | null; origin: SelectionOrigin } = {
    nodeId: null,
    origin: 'editor',
  }
  let breadcrumb: BreadcrumbItem[] = []
  const selectionHistory: Array<{ nodeId: string | null; origin: SelectionOrigin }> = []
  const breadcrumbHistory: BreadcrumbItem[][] = []

  return {
    // ----------------------------------------
    // StateStorePort Implementation
    // ----------------------------------------

    getSelection(): { nodeId: string | null; origin: SelectionOrigin } {
      return { ...selection }
    },

    setSelection(nodeId: string | null, origin: SelectionOrigin): void {
      selection = { nodeId, origin }
      selectionHistory.push({ nodeId, origin })
    },

    setBreadcrumb(newBreadcrumb: BreadcrumbItem[]): void {
      breadcrumb = [...newBreadcrumb]
      breadcrumbHistory.push([...newBreadcrumb])
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getState(): MockStateStorePortState {
      return {
        selection: { ...selection },
        breadcrumb: [...breadcrumb],
        selectionHistory: [...selectionHistory],
        breadcrumbHistory: breadcrumbHistory.map((b) => [...b]),
      }
    },

    getSelectionHistory(): Array<{ nodeId: string | null; origin: SelectionOrigin }> {
      return [...selectionHistory]
    },

    getBreadcrumbHistory(): BreadcrumbItem[][] {
      return breadcrumbHistory.map((b) => [...b])
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      selection = { nodeId: null, origin: 'editor' }
      breadcrumb = []
      selectionHistory.length = 0
      breadcrumbHistory.length = 0
    },
  }
}

// ============================================
// Mock DOM Query Port
// ============================================

export interface MockDOMElement {
  nodeId: string
  name: string
  parent?: MockDOMElement
  isRoot?: boolean
  isBoundary?: boolean
}

export interface MockDOMQueryPortState {
  elements: Map<string, MockDOMElement>
  rootElement: MockDOMElement | null
}

export interface MockDOMQueryPort extends DOMQueryPort {
  // Test helpers - setup
  setRootElement(element: MockDOMElement | null): void
  addElement(element: MockDOMElement): void
  setElementHierarchy(elements: MockDOMElement[]): void

  // Test helpers - inspection
  getState(): MockDOMQueryPortState

  // Test helpers - reset
  reset(): void
}

export function createMockDOMQueryPort(): MockDOMQueryPort {
  const elements = new Map<string, MockDOMElement>()
  let rootElement: MockDOMElement | null = null

  return {
    // ----------------------------------------
    // DOMQueryPort Implementation
    // ----------------------------------------

    findRootMirrorElement(): { nodeId: string } | null {
      if (!rootElement) return null
      return { nodeId: rootElement.nodeId }
    },

    findElementByMirrorId(nodeId: string): PreviewElement | null {
      const element = elements.get(nodeId)
      if (!element) return null
      return {
        nodeId: element.nodeId,
        _ref: element, // Store reference for parent traversal
      }
    },

    getParentWithMirrorId(element: PreviewElement): PreviewElement | null {
      const mockElement = element._ref as MockDOMElement | undefined
      if (!mockElement?.parent) return null

      return {
        nodeId: mockElement.parent.nodeId,
        _ref: mockElement.parent,
      }
    },

    isPreviewBoundary(element: PreviewElement): boolean {
      const mockElement = element._ref as MockDOMElement | undefined
      return mockElement?.isBoundary ?? false
    },

    // ----------------------------------------
    // Test Helpers - Setup
    // ----------------------------------------

    setRootElement(element: MockDOMElement | null): void {
      rootElement = element
      if (element) {
        element.isRoot = true
        elements.set(element.nodeId, element)
      }
    },

    addElement(element: MockDOMElement): void {
      elements.set(element.nodeId, element)
    },

    /**
     * Set up a hierarchy of elements.
     * Each element can have a parent reference.
     * The first element with isRoot=true becomes the root.
     */
    setElementHierarchy(newElements: MockDOMElement[]): void {
      elements.clear()
      rootElement = null

      for (const el of newElements) {
        elements.set(el.nodeId, el)
        if (el.isRoot) {
          rootElement = el
        }
      }
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getState(): MockDOMQueryPortState {
      return {
        elements: new Map(elements),
        rootElement,
      }
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      elements.clear()
      rootElement = null
    },
  }
}

// ============================================
// Mock Clock Port
// ============================================

export interface MockClockPort extends ClockPort {
  // Test helpers - execution
  flushTimeouts(): void
  flushAnimationFrames(): void
  flushAll(): void
  advanceTime(ms: number): void

  // Test helpers - inspection
  getPendingTimeoutCount(): number
  getPendingFrameCount(): number

  // Test helpers - reset
  reset(): void
}

export function createMockClockPort(): MockClockPort {
  let timeoutId = 0
  let frameId = 0
  const pendingTimeouts = new Map<number, { callback: () => void; delay: number; scheduledAt: number }>()
  const pendingFrames = new Map<number, () => void>()
  let currentTime = 0

  return {
    // ----------------------------------------
    // ClockPort Implementation
    // ----------------------------------------

    setTimeout(callback: () => void, delay: number): number {
      const id = ++timeoutId
      pendingTimeouts.set(id, { callback, delay, scheduledAt: currentTime })
      return id
    },

    clearTimeout(id: number): void {
      pendingTimeouts.delete(id)
    },

    requestAnimationFrame(callback: () => void): number {
      const id = ++frameId
      pendingFrames.set(id, callback)
      return id
    },

    cancelAnimationFrame(id: number): void {
      pendingFrames.delete(id)
    },

    // ----------------------------------------
    // Test Helpers - Execution
    // ----------------------------------------

    flushTimeouts(): void {
      const callbacks = [...pendingTimeouts.values()].map((t) => t.callback)
      pendingTimeouts.clear()
      callbacks.forEach((cb) => cb())
    },

    flushAnimationFrames(): void {
      const callbacks = [...pendingFrames.values()]
      pendingFrames.clear()
      callbacks.forEach((cb) => cb())
    },

    flushAll(): void {
      // Flush frames first (usually higher priority)
      this.flushAnimationFrames()
      this.flushTimeouts()
    },

    /**
     * Advance time and execute any timeouts that have elapsed.
     */
    advanceTime(ms: number): void {
      currentTime += ms

      // Find and execute elapsed timeouts
      const elapsed: Array<{ id: number; callback: () => void }> = []

      for (const [id, timeout] of pendingTimeouts) {
        if (currentTime >= timeout.scheduledAt + timeout.delay) {
          elapsed.push({ id, callback: timeout.callback })
        }
      }

      // Remove and execute
      for (const { id, callback } of elapsed) {
        pendingTimeouts.delete(id)
        callback()
      }
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getPendingTimeoutCount(): number {
      return pendingTimeouts.size
    },

    getPendingFrameCount(): number {
      return pendingFrames.size
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      pendingTimeouts.clear()
      pendingFrames.clear()
      timeoutId = 0
      frameId = 0
      currentTime = 0
    },
  }
}

// ============================================
// Mock SourceMap Port
// ============================================

export interface MockSourceMapPortState {
  nodes: Map<string, SourceMapNode>
  lineIndex: Map<number, SourceMapNode>
  definitions: Map<number, SourceMapDefinition>
}

export interface MockSourceMapPort extends SourceMapPort {
  // Test helpers - setup
  addNode(node: SourceMapNode): void
  addDefinition(line: number, definition: SourceMapDefinition): void
  setNodes(nodes: SourceMapNode[]): void

  // Test helpers - inspection
  getState(): MockSourceMapPortState

  // Test helpers - reset
  reset(): void
}

export function createMockSourceMapPort(): MockSourceMapPort {
  const nodes = new Map<string, SourceMapNode>()
  const lineIndex = new Map<number, SourceMapNode>()
  const definitions = new Map<number, SourceMapDefinition>()

  return {
    // ----------------------------------------
    // SourceMapPort Implementation
    // ----------------------------------------

    getNodeById(nodeId: string): SourceMapNode | null {
      return nodes.get(nodeId) ?? null
    },

    getNodeAtLine(line: number): SourceMapNode | null {
      return lineIndex.get(line) ?? null
    },

    getDefinitionAtLine(line: number): SourceMapDefinition | null {
      return definitions.get(line) ?? null
    },

    // ----------------------------------------
    // Test Helpers - Setup
    // ----------------------------------------

    addNode(node: SourceMapNode): void {
      nodes.set(node.nodeId, node)
      if (node.position) {
        lineIndex.set(node.position.line, node)
      }
    },

    addDefinition(line: number, definition: SourceMapDefinition): void {
      definitions.set(line, definition)
    },

    setNodes(newNodes: SourceMapNode[]): void {
      nodes.clear()
      lineIndex.clear()
      for (const node of newNodes) {
        nodes.set(node.nodeId, node)
        if (node.position) {
          lineIndex.set(node.position.line, node)
        }
      }
    },

    // ----------------------------------------
    // Test Helpers - Inspection
    // ----------------------------------------

    getState(): MockSourceMapPortState {
      return {
        nodes: new Map(nodes),
        lineIndex: new Map(lineIndex),
        definitions: new Map(definitions),
      }
    },

    // ----------------------------------------
    // Test Helpers - Reset
    // ----------------------------------------

    reset(): void {
      nodes.clear()
      lineIndex.clear()
      definitions.clear()
    },
  }
}

// ============================================
// Combined Mock Ports Factory
// ============================================

export interface MockSyncPorts {
  eventBus: MockEventBusPort
  stateStore: MockStateStorePort
  domQuery: MockDOMQueryPort
  clock: MockClockPort
  sourceMap: MockSourceMapPort
}

export function createMockSyncPorts(): MockSyncPorts {
  return {
    eventBus: createMockEventBusPort(),
    stateStore: createMockStateStorePort(),
    domQuery: createMockDOMQueryPort(),
    clock: createMockClockPort(),
    sourceMap: createMockSourceMapPort(),
  }
}
