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
import type { SourceMap } from '../../../src/studio/source-map'
import type { AST } from '../../../src/parser/ast'
import type { IR } from '../../../src/ir/types'

// Mock SourceMap
function createMockSourceMap(nodeIds: string[]): SourceMap {
  const nodes = new Map()
  nodeIds.forEach(id => {
    nodes.set(id, {
      nodeId: id,
      componentName: 'Box',
      position: { line: 1, column: 0, endLine: 1, endColumn: 10 },
      properties: new Map(),
    })
  })

  return {
    getNodeById: (id: string) => nodes.get(id) || null,
    getAllNodeIds: () => Array.from(nodes.keys()),
    getNodeAtLine: () => null,
    getChildren: () => [],
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

    expect(state.get().selection.nodeId).toBeNull()
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

  it('warns when selecting during compile', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    actions.setCompiling(true)
    actions.setSelection('node-1', 'editor')

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Selection during compile may be stale')
    )

    warnSpy.mockRestore()
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

    // Selection should be cleared
    expect(state.get().selection.nodeId).toBeNull()

    // Trying to select node-1 now should fail
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    actions.setSelection('node-1', 'editor')
    expect(state.get().selection.nodeId).toBeNull()
  })
})
