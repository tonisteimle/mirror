/**
 * Mock Factories for Sync Testing
 *
 * Provides mock implementations for SyncCoordinator and related components.
 */

import { vi } from 'vitest'
import type { SourceMap, NodeMapping } from '../../../compiler/ir/source-map'
import type { SelectionOrigin } from '../../../studio/core/state'

// Use ReturnType to get correct Mock type
type MockFn<T extends (...args: any[]) => any> = ReturnType<typeof vi.fn<T>>

// ============================================
// TYPES
// ============================================

export interface MockSourceMap {
  getNodeById: MockFn<(nodeId: string) => NodeMapping | undefined>
  getNodeAtLine: MockFn<(line: number) => NodeMapping | undefined>
  getDefinitionAtLine: MockFn<(line: number) => { componentName: string } | undefined>
  getAllNodes: MockFn<() => NodeMapping[]>
  _nodes: Map<string, NodeMapping>
  _setNode: (nodeId: string, mapping: Partial<NodeMapping>) => void
  _setNodeAtLine: (line: number, nodeId: string) => void
}

export interface MockSyncTargets {
  scrollEditorToLine: MockFn<(line: number) => void>
  highlightPreviewElement: MockFn<(nodeId: string | null) => void>
  _scrollHistory: number[]
  _highlightHistory: (string | null)[]
}

export interface MockLineOffsetService {
  editorToSourceMap: MockFn<(editorLine: number) => number>
  sourceMapToEditor: MockFn<(sourceMapLine: number) => number>
  isInCurrentFile: MockFn<(sourceMapLine: number) => boolean>
  getOffset: MockFn<() => number>
  setOffset: MockFn<(offset: number) => void>
  _offset: number
}

export interface MockEditor {
  scrollToLine: MockFn<(line: number) => void>
  setCursor: MockFn<(line: number, column?: number) => void>
  setContent: MockFn<(content: string) => void>
  getContent: MockFn<() => string>
  _scrolledToLine: number | null
  _cursorLine: number
  _cursorColumn: number
  _content: string
}

export interface MockPreview {
  highlight: MockFn<(nodeId: string | null) => void>
  click: MockFn<(nodeId: string) => void>
  _highlightedElement: string | null
  _clickHistory: string[]
}

// ============================================
// MOCK FACTORIES
// ============================================

/**
 * Creates a mock SourceMap for testing
 */
export function createMockSourceMap(): MockSourceMap {
  const nodes = new Map<string, NodeMapping>()
  const lineToNodeId = new Map<number, string>()

  const mock: MockSourceMap = {
    _nodes: nodes,

    getNodeById: vi.fn((nodeId: string) => nodes.get(nodeId)),

    getNodeAtLine: vi.fn((line: number) => {
      const nodeId = lineToNodeId.get(line)
      return nodeId ? nodes.get(nodeId) : undefined
    }),

    getDefinitionAtLine: vi.fn(() => undefined),

    getAllNodes: vi.fn(() => Array.from(nodes.values())),

    _setNode(nodeId: string, mapping: Partial<NodeMapping>) {
      const fullMapping: NodeMapping = {
        nodeId,
        componentName: mapping.componentName || 'Frame',
        position: mapping.position || { line: 1, column: 0, offset: 0 },
        parentId: mapping.parentId,
        ...mapping,
      }
      nodes.set(nodeId, fullMapping)
      if (fullMapping.position) {
        lineToNodeId.set(fullMapping.position.line, nodeId)
      }
    },

    _setNodeAtLine(line: number, nodeId: string) {
      lineToNodeId.set(line, nodeId)
    },
  }

  return mock
}

/**
 * Creates mock sync targets (editor scroll, preview highlight)
 */
export function createMockSyncTargets(): MockSyncTargets {
  const scrollHistory: number[] = []
  const highlightHistory: (string | null)[] = []

  return {
    _scrollHistory: scrollHistory,
    _highlightHistory: highlightHistory,

    scrollEditorToLine: vi.fn((line: number) => {
      scrollHistory.push(line)
    }),

    highlightPreviewElement: vi.fn((nodeId: string | null) => {
      highlightHistory.push(nodeId)
    }),
  }
}

/**
 * Creates a mock LineOffsetService
 */
export function createMockLineOffsetService(initialOffset = 0): MockLineOffsetService {
  let offset = initialOffset

  return {
    _offset: offset,

    editorToSourceMap: vi.fn((editorLine: number) => editorLine + offset),

    sourceMapToEditor: vi.fn((sourceMapLine: number) => sourceMapLine - offset),

    isInCurrentFile: vi.fn((sourceMapLine: number) => sourceMapLine > offset),

    getOffset: vi.fn(() => offset),

    setOffset: vi.fn((newOffset: number) => {
      offset = newOffset
    }),
  }
}

/**
 * Creates a mock Editor for integration testing
 */
export function createMockEditor(): MockEditor {
  let content = ''
  let cursorLine = 1
  let cursorColumn = 1
  let scrolledToLine: number | null = null

  return {
    _scrolledToLine: scrolledToLine,
    _cursorLine: cursorLine,
    _cursorColumn: cursorColumn,
    _content: content,

    scrollToLine: vi.fn((line: number) => {
      scrolledToLine = line
    }),

    setCursor: vi.fn((line: number, column = 1) => {
      cursorLine = line
      cursorColumn = column
    }),

    setContent: vi.fn((newContent: string) => {
      content = newContent
    }),

    getContent: vi.fn(() => content),
  }
}

/**
 * Creates a mock Preview for integration testing
 */
export function createMockPreview(): MockPreview {
  let highlightedElement: string | null = null
  const clickHistory: string[] = []

  return {
    _highlightedElement: highlightedElement,
    _clickHistory: clickHistory,

    highlight: vi.fn((nodeId: string | null) => {
      highlightedElement = nodeId
    }),

    click: vi.fn((nodeId: string) => {
      clickHistory.push(nodeId)
    }),
  }
}

// ============================================
// PRESET CONFIGURATIONS
// ============================================

/**
 * Creates a standard test scenario with 3 sibling elements
 */
export function createStandardTestScenario(): {
  sourceMap: MockSourceMap
  targets: MockSyncTargets
  lineOffset: MockLineOffsetService
} {
  const sourceMap = createMockSourceMap()
  const targets = createMockSyncTargets()
  const lineOffset = createMockLineOffsetService(50) // 50 lines prelude

  // Setup standard nodes
  sourceMap._setNode('node-1', {
    componentName: 'Frame',
    position: { line: 52, column: 0, offset: 500 },
  })
  sourceMap._setNode('node-2', {
    componentName: 'Text',
    position: { line: 53, column: 2, offset: 520 },
    parentId: 'node-1',
  })
  sourceMap._setNode('node-3', {
    componentName: 'Text',
    position: { line: 54, column: 2, offset: 540 },
    parentId: 'node-1',
  })
  sourceMap._setNode('node-4', {
    componentName: 'Text',
    position: { line: 55, column: 2, offset: 560 },
    parentId: 'node-1',
  })

  return { sourceMap, targets, lineOffset }
}

/**
 * Creates a nested test scenario with containers
 */
export function createNestedTestScenario(): {
  sourceMap: MockSourceMap
  targets: MockSyncTargets
  lineOffset: MockLineOffsetService
} {
  const sourceMap = createMockSourceMap()
  const targets = createMockSyncTargets()
  const lineOffset = createMockLineOffsetService(50)

  // Root Frame
  sourceMap._setNode('node-1', {
    componentName: 'Frame',
    position: { line: 52, column: 0, offset: 500 },
  })

  // Nested Frame
  sourceMap._setNode('node-2', {
    componentName: 'Frame',
    position: { line: 53, column: 2, offset: 520 },
    parentId: 'node-1',
  })

  // Text inside nested Frame
  sourceMap._setNode('node-3', {
    componentName: 'Text',
    position: { line: 54, column: 4, offset: 540 },
    parentId: 'node-2',
  })

  // Sibling Frame
  sourceMap._setNode('node-4', {
    componentName: 'Frame',
    position: { line: 56, column: 2, offset: 580 },
    parentId: 'node-1',
  })

  // Text inside sibling Frame
  sourceMap._setNode('node-5', {
    componentName: 'Text',
    position: { line: 57, column: 4, offset: 600 },
    parentId: 'node-4',
  })

  return { sourceMap, targets, lineOffset }
}
