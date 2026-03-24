/**
 * State Robustness Tests
 *
 * Tests for the P1 fixes:
 * 1. Atomic compile result updates (setCompileResult)
 * 2. Selection validation (setSelection)
 * 3. Compile status tracking (setCompiling)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { state, actions, selectors } from '../state'
import { events } from '../events'
import type { SourceMap } from '../../../src/ir/source-map'
import type { AST } from '../../../src/parser/ast'
import type { IR } from '../../../src/ir/types'

// Mock SourceMap with hierarchy support
interface MockNodeConfig {
  nodeId: string
  parentId?: string
  line?: number
  componentName?: string
}

function createMockSourceMap(nodeIds: string[]): SourceMap {
  const nodes = new Map()
  nodeIds.forEach((id, index) => {
    nodes.set(id, {
      nodeId: id,
      componentName: 'Box',
      position: { line: index + 1, column: 0, endLine: index + 1, endColumn: 10 },
      properties: new Map(),
      isDefinition: false,
    })
  })

  return {
    getNodeById: (id: string) => nodes.get(id) || null,
    getAllNodeIds: () => Array.from(nodes.keys()),
    getNodeAtLine: (line: number) => Array.from(nodes.values()).find(n => n.position.line === line) || null,
    getChildren: () => [],
    getRootNodes: () => Array.from(nodes.values()).filter(n => !n.parentId),
    getSiblings: () => [],
    getNextSibling: () => null,
    getPreviousSibling: () => null,
    getParent: () => null,
    isTemplateInstance: () => false,
    getTemplateId: () => null,
  } as unknown as SourceMap
}

// Mock SourceMap with full hierarchy
function createHierarchicalMockSourceMap(configs: MockNodeConfig[]): SourceMap {
  const nodes = new Map()
  configs.forEach((config, index) => {
    nodes.set(config.nodeId, {
      nodeId: config.nodeId,
      parentId: config.parentId,
      componentName: config.componentName ?? 'Box',
      position: { line: config.line ?? index + 1, column: 0, endLine: (config.line ?? index + 1), endColumn: 10 },
      properties: new Map(),
      isDefinition: false,
    })
  })

  return {
    getNodeById: (id: string) => nodes.get(id) || null,
    getAllNodeIds: () => Array.from(nodes.keys()),
    getNodeAtLine: (line: number) => Array.from(nodes.values()).find(n => n.position.line === line) || null,
    getChildren: (parentId: string) => {
      return Array.from(nodes.values())
        .filter(n => n.parentId === parentId)
        .sort((a, b) => a.position.line - b.position.line)
    },
    getRootNodes: () => {
      return Array.from(nodes.values())
        .filter(n => !n.parentId)
        .sort((a, b) => a.position.line - b.position.line)
    },
    getSiblings: (nodeId: string) => {
      const node = nodes.get(nodeId)
      if (!node) return []
      const parentId = node.parentId
      const siblings = parentId
        ? Array.from(nodes.values()).filter(n => n.parentId === parentId)
        : Array.from(nodes.values()).filter(n => !n.parentId)
      return siblings
        .filter(n => n.nodeId !== nodeId)
        .sort((a, b) => a.position.line - b.position.line)
    },
    getNextSibling: (nodeId: string) => {
      const node = nodes.get(nodeId)
      if (!node) return null
      const parentId = node.parentId
      const siblings = parentId
        ? Array.from(nodes.values()).filter(n => n.parentId === parentId)
        : Array.from(nodes.values()).filter(n => !n.parentId)
      const sorted = siblings.sort((a, b) => a.position.line - b.position.line)
      return sorted.find(s => s.position.line > node.position.line) || null
    },
    getPreviousSibling: (nodeId: string) => {
      const node = nodes.get(nodeId)
      if (!node) return null
      const parentId = node.parentId
      const siblings = parentId
        ? Array.from(nodes.values()).filter(n => n.parentId === parentId)
        : Array.from(nodes.values()).filter(n => !n.parentId)
      const before = siblings
        .filter(s => s.position.line < node.position.line)
        .sort((a, b) => a.position.line - b.position.line)
      return before.length > 0 ? before[before.length - 1] : null
    },
    getParent: (nodeId: string) => {
      const node = nodes.get(nodeId)
      if (!node || !node.parentId) return null
      return nodes.get(node.parentId) || null
    },
    isTemplateInstance: () => false,
    getTemplateId: () => null,
  } as unknown as SourceMap
}

// Mock AST
function createMockAST(): AST {
  return {
    components: [],
    instances: [],
    tokens: [],
    data: [],
    errors: [],
  } as AST
}

// Mock IR
function createMockIR(): IR {
  return {
    nodes: [],
    components: new Map(),
  } as unknown as IR
}

// Reset state before each test
beforeEach(() => {
  // Reset to initial state
  state.set({
    source: '',
    resolvedSource: '',
    ast: null,
    ir: null,
    sourceMap: null,
    errors: [],
    compileVersion: 0,
    compileTimestamp: 0,
    compiling: false,
    selection: { nodeId: null, origin: 'editor' },
    multiSelection: [],
    breadcrumb: [],
    cursor: { line: 1, column: 1 },
    editorHasFocus: true,
    currentFile: 'index.mirror',
    files: {},
    fileTypes: {},
    panels: { left: true, right: true },
    mode: 'mirror',
    preludeOffset: 0,
  })
})

describe('Compile Status Tracking', () => {
  it('setCompiling(true) sets compiling to true', () => {
    actions.setCompiling(true)
    expect(state.get().compiling).toBe(true)
  })

  it('setCompiling(false) sets compiling to false', () => {
    actions.setCompiling(true)
    actions.setCompiling(false)
    expect(state.get().compiling).toBe(false)
  })

  it('emits compile:started when setCompiling(true)', () => {
    const handler = vi.fn()
    events.on('compile:started', handler)

    actions.setCompiling(true)

    expect(handler).toHaveBeenCalled()
  })

  it('emits compile:idle when setCompiling(false)', () => {
    const handler = vi.fn()
    events.on('compile:idle', handler)

    actions.setCompiling(false)

    expect(handler).toHaveBeenCalled()
  })

  it('isCompiling() returns current compile status', () => {
    expect(actions.isCompiling()).toBe(false)
    actions.setCompiling(true)
    expect(actions.isCompiling()).toBe(true)
  })
})

describe('Atomic Compile Result Updates', () => {
  it('setCompileResult updates all fields atomically', () => {
    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap(['node-1', 'node-2'])
    const errors = [{ message: 'test', line: 1, column: 0 }]

    actions.setCompileResult({ ast, ir, sourceMap, errors })

    const s = state.get()
    expect(s.ast).toBe(ast)
    expect(s.ir).toBe(ir)
    expect(s.sourceMap).toBe(sourceMap)
    expect(s.errors).toEqual(errors)
  })

  it('increments compileVersion on each compile', () => {
    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap([])

    expect(state.get().compileVersion).toBe(0)

    actions.setCompileResult({ ast, ir, sourceMap, errors: [] })
    expect(state.get().compileVersion).toBe(1)

    actions.setCompileResult({ ast, ir, sourceMap, errors: [] })
    expect(state.get().compileVersion).toBe(2)

    actions.setCompileResult({ ast, ir, sourceMap, errors: [] })
    expect(state.get().compileVersion).toBe(3)
  })

  it('sets compileTimestamp', () => {
    const before = Date.now()
    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap([])

    actions.setCompileResult({ ast, ir, sourceMap, errors: [] })

    const after = Date.now()
    const timestamp = state.get().compileTimestamp

    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })

  it('sets compiling to false', () => {
    actions.setCompiling(true)
    expect(state.get().compiling).toBe(true)

    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap([])

    actions.setCompileResult({ ast, ir, sourceMap, errors: [] })

    expect(state.get().compiling).toBe(false)
  })

  it('emits compile:completed with all data', () => {
    const handler = vi.fn()
    events.on('compile:completed', handler)

    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap([])

    actions.setCompileResult({ ast, ir, sourceMap, errors: [] })

    expect(handler).toHaveBeenCalledWith({
      ast,
      ir,
      sourceMap,
      version: 1,
      hasErrors: false,
    })
  })

  it('hasErrors is true when errors present', () => {
    const handler = vi.fn()
    events.on('compile:completed', handler)

    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap([])
    const errors = [{ message: 'error', line: 1, column: 0 }]

    actions.setCompileResult({ ast, ir, sourceMap, errors })

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({ hasErrors: true })
    )
  })

  it('invalidates selection when node no longer exists', () => {
    // First, set up a selection
    const sourceMap1 = createMockSourceMap(['node-1', 'node-2'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap1,
      errors: [],
    })

    actions.setSelection('node-1', 'editor')
    expect(state.get().selection.nodeId).toBe('node-1')

    // Now compile with node-1 removed
    const invalidatedHandler = vi.fn()
    events.on('selection:invalidated', invalidatedHandler)

    const sourceMap2 = createMockSourceMap(['node-2']) // node-1 is gone
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap2,
      errors: [],
    })

    // Selection should fall back to first root (node-2), not null
    expect(state.get().selection.nodeId).toBe('node-2')
    expect(invalidatedHandler).toHaveBeenCalledWith({ nodeId: 'node-1' })
  })

  it('keeps selection when node still exists', () => {
    const sourceMap1 = createMockSourceMap(['node-1', 'node-2'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap1,
      errors: [],
    })

    actions.setSelection('node-1', 'editor')

    // Compile with node-1 still present
    const sourceMap2 = createMockSourceMap(['node-1', 'node-3'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap2,
      errors: [],
    })

    expect(state.get().selection.nodeId).toBe('node-1')
  })
})

describe('Selection Validation', () => {
  beforeEach(() => {
    // Set up a SourceMap with some nodes
    const sourceMap = createMockSourceMap(['node-1', 'node-2', 'node-3'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap,
      errors: [],
    })
  })

  it('allows selecting existing nodes', () => {
    actions.setSelection('node-1', 'editor')
    expect(state.get().selection.nodeId).toBe('node-1')
  })

  it('allows selecting null (clearing selection)', () => {
    actions.setSelection('node-1', 'editor')
    actions.setSelection(null, 'editor')
    expect(state.get().selection.nodeId).toBeNull()
  })

  it('rejects selecting non-existent nodes', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    actions.setSelection('node-999', 'editor')

    expect(state.get().selection.nodeId).toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Cannot select non-existent node')
    )

    warnSpy.mockRestore()
  })

  it('emits selection:changed for valid selections', () => {
    const handler = vi.fn()
    events.on('selection:changed', handler)

    actions.setSelection('node-1', 'preview')

    expect(handler).toHaveBeenCalledWith({
      nodeId: 'node-1',
      origin: 'preview',
    })
  })

  it('does not emit selection:changed for invalid selections', () => {
    const handler = vi.fn()
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    events.on('selection:changed', handler)

    actions.setSelection('node-999', 'editor')

    expect(handler).not.toHaveBeenCalled()
  })

  it('queues selection during compile when SourceMap missing', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Clear sourceMap to simulate pre-compile state
    state.set({ sourceMap: null })
    actions.setCompiling(true)
    actions.setSelection('new-node', 'editor')

    // Selection should be deferred, not applied immediately
    expect(state.get().deferredSelection).toEqual({ type: 'nodeId', nodeId: 'new-node', origin: 'editor' })
    // Also check legacy queuedSelection for backward compatibility
    expect(state.get().queuedSelection).toEqual({ nodeId: 'new-node', origin: 'editor' })
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Deferring selection during compile')
    )

    logSpy.mockRestore()
  })

  it('clearSelection convenience method works', () => {
    actions.setSelection('node-1', 'editor')
    actions.clearSelection('preview')

    expect(state.get().selection.nodeId).toBeNull()
    expect(state.get().selection.origin).toBe('preview')
  })
})

describe('Selectors', () => {
  it('getCompileVersion returns current version', () => {
    expect(selectors.getCompileVersion()).toBe(0)

    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: createMockSourceMap([]),
      errors: [],
    })

    expect(selectors.getCompileVersion()).toBe(1)
  })

  it('isCompiling returns compile status', () => {
    expect(selectors.isCompiling()).toBe(false)

    actions.setCompiling(true)
    expect(selectors.isCompiling()).toBe(true)
  })

  it('getSourceMap returns current SourceMap', () => {
    expect(selectors.getSourceMap()).toBeNull()

    const sourceMap = createMockSourceMap(['node-1'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap,
      errors: [],
    })

    expect(selectors.getSourceMap()).toBe(sourceMap)
  })

  it('getAST returns current AST', () => {
    expect(selectors.getAST()).toBeNull()

    const ast = createMockAST()
    actions.setCompileResult({
      ast,
      ir: createMockIR(),
      sourceMap: createMockSourceMap([]),
      errors: [],
    })

    expect(selectors.getAST()).toBe(ast)
  })
})

describe('Race Condition Prevention', () => {
  it('rapid setCompileResult calls increment version correctly', () => {
    const ast = createMockAST()
    const ir = createMockIR()
    const sourceMap = createMockSourceMap([])

    // Simulate rapid compiles
    for (let i = 0; i < 10; i++) {
      actions.setCompileResult({ ast, ir, sourceMap, errors: [] })
    }

    expect(state.get().compileVersion).toBe(10)
  })

  it('selection validation uses latest SourceMap', () => {
    // Initial state with node-1
    const sourceMap1 = createMockSourceMap(['node-1'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap1,
      errors: [],
    })

    actions.setSelection('node-1', 'editor')
    expect(state.get().selection.nodeId).toBe('node-1')

    // Update to new SourceMap without node-1
    const sourceMap2 = createMockSourceMap(['node-2'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap2,
      errors: [],
    })

    // Selection should fall back to first root (node-2)
    expect(state.get().selection.nodeId).toBe('node-2')

    // Trying to select node-1 now should fail (doesn't exist in new SourceMap)
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    actions.setSelection('node-1', 'editor')
    // Selection should stay on fallback since node-1 doesn't exist
    expect(state.get().selection.nodeId).toBe('node-2')
  })
})

describe('Fallback Selection', () => {
  beforeEach(() => {
    state.set({
      selection: { nodeId: null, origin: 'editor' },
      multiSelection: [],
      sourceMap: null,
      compiling: false,
      queuedSelection: null,
    })
  })

  it('findFallbackSelection returns first root when available', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'root-1', line: 1 },
      { nodeId: 'root-2', line: 5 },
    ])

    const fallback = actions.findFallbackSelection('deleted-node', sourceMap)
    expect(fallback).toBe('root-1')
  })

  it('findFallbackSelection returns null for empty sourceMap', () => {
    const sourceMap = createMockSourceMap([])
    const fallback = actions.findFallbackSelection('deleted-node', sourceMap)
    expect(fallback).toBeNull()
  })

  it('findFallbackWithInfo prefers next sibling', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
      { nodeId: 'child-2', parentId: 'parent', line: 3 },
      { nodeId: 'child-3', parentId: 'parent', line: 4 },
    ])

    const fallback = actions.findFallbackWithInfo(
      { nextSiblingId: 'child-3', prevSiblingId: 'child-1', parentId: 'parent' },
      sourceMap
    )
    expect(fallback).toBe('child-3')
  })

  it('findFallbackWithInfo falls back to previous sibling', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
    ])

    const fallback = actions.findFallbackWithInfo(
      { nextSiblingId: 'deleted', prevSiblingId: 'child-1', parentId: 'parent' },
      sourceMap
    )
    expect(fallback).toBe('child-1')
  })

  it('findFallbackWithInfo falls back to parent', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
    ])

    const fallback = actions.findFallbackWithInfo(
      { nextSiblingId: 'deleted', prevSiblingId: 'also-deleted', parentId: 'parent' },
      sourceMap
    )
    expect(fallback).toBe('parent')
  })

  it('findFallbackWithInfo falls back to first root', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'root-1', line: 1 },
      { nodeId: 'root-2', line: 5 },
    ])

    const fallback = actions.findFallbackWithInfo(
      { nextSiblingId: 'deleted', prevSiblingId: 'also-deleted', parentId: 'also-gone' },
      sourceMap
    )
    expect(fallback).toBe('root-1')
  })

  it('setCompileResult uses fallback when selection invalidated', () => {
    // Set up initial state with selection
    const sourceMap1 = createHierarchicalMockSourceMap([
      { nodeId: 'root', line: 1 },
      { nodeId: 'child-1', parentId: 'root', line: 2 },
      { nodeId: 'child-2', parentId: 'root', line: 3 },
    ])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap1,
      errors: [],
    })
    actions.setSelection('child-1', 'editor')
    expect(state.get().selection.nodeId).toBe('child-1')

    // Now compile with child-1 removed - should fallback to root
    const sourceMap2 = createHierarchicalMockSourceMap([
      { nodeId: 'root', line: 1 },
      { nodeId: 'child-2', parentId: 'root', line: 3 },
    ])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap: sourceMap2,
      errors: [],
    })

    // Should select first root as fallback
    expect(state.get().selection.nodeId).toBe('root')
  })

  it('queued selection resolves after compile', () => {
    // Queue a selection during compile
    state.set({ sourceMap: null, compiling: true })
    actions.setSelection('node-1', 'keyboard')

    expect(state.get().queuedSelection).toEqual({ nodeId: 'node-1', origin: 'keyboard' })

    // Now complete compile with the node present
    const sourceMap = createMockSourceMap(['node-1', 'node-2'])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap,
      errors: [],
    })

    expect(state.get().selection.nodeId).toBe('node-1')
    expect(state.get().queuedSelection).toBeNull()
  })

  it('queued selection falls back when node not found', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})

    // Queue a selection during compile
    state.set({ sourceMap: null, compiling: true })
    actions.setSelection('deleted-node', 'keyboard')

    expect(state.get().queuedSelection).toEqual({ nodeId: 'deleted-node', origin: 'keyboard' })

    // Now complete compile WITHOUT the queued node
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'root', line: 1 },
      { nodeId: 'other', line: 2 },
    ])
    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap,
      errors: [],
    })

    // Should fallback to first root
    expect(state.get().selection.nodeId).toBe('root')
    expect(state.get().queuedSelection).toBeNull()
  })
})

describe('Deferred Selection (unified API)', () => {
  beforeEach(() => {
    state.set({
      selection: { nodeId: null, origin: 'editor' },
      sourceMap: null,
      compiling: false,
      deferredSelection: null,
      queuedSelection: null,
      pendingSelection: null,
      preludeOffset: 0,
    })
  })

  it('setDeferredSelection sets nodeId-based deferred selection', () => {
    actions.setDeferredSelection({ type: 'nodeId', nodeId: 'test-node', origin: 'preview' })

    expect(state.get().deferredSelection).toEqual({
      type: 'nodeId',
      nodeId: 'test-node',
      origin: 'preview',
    })
  })

  it('setDeferredSelection sets line-based deferred selection', () => {
    actions.setDeferredSelection({
      type: 'line',
      line: 5,
      componentName: 'Button',
      origin: 'drag-drop',
    })

    expect(state.get().deferredSelection).toEqual({
      type: 'line',
      line: 5,
      componentName: 'Button',
      origin: 'drag-drop',
    })
  })

  it('resolveDeferredSelection resolves nodeId-based selection', async () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'target-node', componentName: 'Box', line: 1 },
    ])
    state.set({ sourceMap })

    actions.setDeferredSelection({ type: 'nodeId', nodeId: 'target-node', origin: 'preview' })

    const resolvedId = actions.resolveDeferredSelection()

    expect(resolvedId).toBe('target-node')
    expect(state.get().selection.nodeId).toBe('target-node')
    expect(state.get().selection.origin).toBe('preview')
    expect(state.get().deferredSelection).toBeNull()
  })

  it('resolveDeferredSelection resolves line-based selection', async () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'button-1', componentName: 'Button', line: 5 },
    ])
    state.set({ sourceMap, preludeOffset: 0 })

    actions.setDeferredSelection({
      type: 'line',
      line: 5,
      componentName: 'Button',
      origin: 'drag-drop',
    })

    const resolvedId = actions.resolveDeferredSelection()

    expect(resolvedId).toBe('button-1')
    expect(state.get().selection.nodeId).toBe('button-1')
    expect(state.get().deferredSelection).toBeNull()
  })

  it('setCompileResult resolves deferred selection', async () => {
    actions.setDeferredSelection({ type: 'nodeId', nodeId: 'new-node', origin: 'preview' })

    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'new-node', componentName: 'Text', line: 1 },
    ])

    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap,
      errors: [],
    })

    // Wait for microtask to resolve
    await Promise.resolve()

    expect(state.get().selection.nodeId).toBe('new-node')
    expect(state.get().deferredSelection).toBeNull()
  })

  it('deferred selection with invalid nodeId falls back to root', async () => {
    actions.setDeferredSelection({ type: 'nodeId', nodeId: 'nonexistent', origin: 'preview' })

    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'root', componentName: 'Box', line: 1 },
    ])

    actions.setCompileResult({
      ast: createMockAST(),
      ir: createMockIR(),
      sourceMap,
      errors: [],
    })

    // Wait for microtask to resolve
    await Promise.resolve()

    expect(state.get().selection.nodeId).toBe('root')
    expect(state.get().deferredSelection).toBeNull()
  })

  it('clearDeferredSelection clears without resolving', () => {
    actions.setDeferredSelection({ type: 'nodeId', nodeId: 'test', origin: 'preview' })
    expect(state.get().deferredSelection).not.toBeNull()

    actions.clearDeferredSelection()
    expect(state.get().deferredSelection).toBeNull()
  })
})

describe('Hierarchy Navigation Helpers', () => {
  it('hierarchical mock sourceMap returns correct children', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
      { nodeId: 'child-2', parentId: 'parent', line: 3 },
      { nodeId: 'other', line: 10 },
    ])

    const children = sourceMap.getChildren('parent')
    expect(children.length).toBe(2)
    expect(children[0].nodeId).toBe('child-1')
    expect(children[1].nodeId).toBe('child-2')
  })

  it('hierarchical mock sourceMap returns correct siblings', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
      { nodeId: 'child-2', parentId: 'parent', line: 3 },
      { nodeId: 'child-3', parentId: 'parent', line: 4 },
    ])

    const siblings = sourceMap.getSiblings('child-2')
    expect(siblings.length).toBe(2)
    expect(siblings.map(s => s.nodeId)).toContain('child-1')
    expect(siblings.map(s => s.nodeId)).toContain('child-3')
  })

  it('hierarchical mock sourceMap returns next sibling', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
      { nodeId: 'child-2', parentId: 'parent', line: 3 },
      { nodeId: 'child-3', parentId: 'parent', line: 4 },
    ])

    const next = sourceMap.getNextSibling('child-1')
    expect(next?.nodeId).toBe('child-2')

    const nextOfLast = sourceMap.getNextSibling('child-3')
    expect(nextOfLast).toBeNull()
  })

  it('hierarchical mock sourceMap returns previous sibling', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
      { nodeId: 'child-2', parentId: 'parent', line: 3 },
      { nodeId: 'child-3', parentId: 'parent', line: 4 },
    ])

    const prev = sourceMap.getPreviousSibling('child-3')
    expect(prev?.nodeId).toBe('child-2')

    const prevOfFirst = sourceMap.getPreviousSibling('child-1')
    expect(prevOfFirst).toBeNull()
  })

  it('hierarchical mock sourceMap returns parent', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'parent', line: 1 },
      { nodeId: 'child-1', parentId: 'parent', line: 2 },
    ])

    const parent = sourceMap.getParent('child-1')
    expect(parent?.nodeId).toBe('parent')

    const rootParent = sourceMap.getParent('parent')
    expect(rootParent).toBeNull()
  })

  it('hierarchical mock sourceMap returns root nodes', () => {
    const sourceMap = createHierarchicalMockSourceMap([
      { nodeId: 'root-1', line: 1 },
      { nodeId: 'child', parentId: 'root-1', line: 2 },
      { nodeId: 'root-2', line: 5 },
    ])

    const roots = sourceMap.getRootNodes()
    expect(roots.length).toBe(2)
    expect(roots[0].nodeId).toBe('root-1')
    expect(roots[1].nodeId).toBe('root-2')
  })
})
