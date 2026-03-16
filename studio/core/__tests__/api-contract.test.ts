/**
 * Core Module API Contract Tests
 *
 * These tests ensure the core module exposes all expected APIs.
 * If these fail, we broke the public API that other modules depend on.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  state,
  actions,
  selectors,
  computed,
  events,
  executor,
  // Commands
  SetPropertyCommand,
  RemovePropertyCommand,
  InsertComponentCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  MoveNodeWithLayoutCommand,
  WrapNodesCommand,
  BatchCommand,
  ResizeCommand,
  UpdateSourceCommand,
  // Selection Adapter
  StateSelectionAdapter,
  getStateSelectionAdapter,
  disposeStateSelectionAdapter,
  // Context
  createStudioContext,
  createTestContext,
  getStudioContext,
} from '../index'

describe('Core Module API Contract', () => {
  beforeEach(() => {
    // Reset state for each test
    actions.clearSelection()
    actions.clearMultiSelection()
  })

  describe('state', () => {
    it('exposes get() method', () => {
      expect(typeof state.get).toBe('function')
    })

    it('exposes set() method', () => {
      expect(typeof state.set).toBe('function')
    })

    it('exposes subscribe() method', () => {
      expect(typeof state.subscribe).toBe('function')
    })

    it('get() returns state object with expected properties', () => {
      const s = state.get()
      expect(s).toHaveProperty('source')
      expect(s).toHaveProperty('resolvedSource')
      expect(s).toHaveProperty('selection')
      expect(s).toHaveProperty('multiSelection')
      expect(s).toHaveProperty('preludeOffset')
      expect(s).toHaveProperty('cursor')
      expect(s).toHaveProperty('editorHasFocus')
      expect(s).toHaveProperty('ast')
      expect(s).toHaveProperty('ir')
      expect(s).toHaveProperty('sourceMap')
      expect(s).toHaveProperty('errors')
      expect(s).toHaveProperty('compileVersion')
      expect(s).toHaveProperty('compiling')
    })

    it('selection has nodeId and origin', () => {
      const s = state.get()
      expect(s.selection).toHaveProperty('nodeId')
      expect(s.selection).toHaveProperty('origin')
    })
  })

  describe('actions', () => {
    it('exposes setSource', () => {
      expect(typeof actions.setSource).toBe('function')
    })

    it('exposes setCompiling', () => {
      expect(typeof actions.setCompiling).toBe('function')
    })

    it('exposes setCompileResult', () => {
      expect(typeof actions.setCompileResult).toBe('function')
    })

    it('exposes setSelection', () => {
      expect(typeof actions.setSelection).toBe('function')
    })

    it('exposes clearSelection', () => {
      expect(typeof actions.clearSelection).toBe('function')
    })

    it('exposes setBreadcrumb', () => {
      expect(typeof actions.setBreadcrumb).toBe('function')
    })

    it('exposes setCursor', () => {
      expect(typeof actions.setCursor).toBe('function')
    })

    it('exposes toggleMultiSelection', () => {
      expect(typeof actions.toggleMultiSelection).toBe('function')
    })

    it('exposes setMultiSelection', () => {
      expect(typeof actions.setMultiSelection).toBe('function')
    })

    it('exposes clearMultiSelection', () => {
      expect(typeof actions.clearMultiSelection).toBe('function')
    })

    it('exposes setEditorFocus', () => {
      expect(typeof actions.setEditorFocus).toBe('function')
    })

    it('exposes getCompileVersion', () => {
      expect(typeof actions.getCompileVersion).toBe('function')
    })

    it('exposes isCompiling', () => {
      expect(typeof actions.isCompiling).toBe('function')
    })
  })

  describe('selectors', () => {
    it('exposes getSource', () => {
      expect(typeof selectors.getSource).toBe('function')
    })

    it('exposes getSelection', () => {
      expect(typeof selectors.getSelection).toBe('function')
    })

    it('exposes getCursor', () => {
      expect(typeof selectors.getCursor).toBe('function')
    })

    it('exposes getCompileVersion', () => {
      expect(typeof selectors.getCompileVersion).toBe('function')
    })

    it('exposes isCompiling', () => {
      expect(typeof selectors.isCompiling).toBe('function')
    })

    it('exposes getSourceMap', () => {
      expect(typeof selectors.getSourceMap).toBe('function')
    })

    it('exposes getAST', () => {
      expect(typeof selectors.getAST).toBe('function')
    })
  })

  describe('computed', () => {
    it('exposes getSelectedNode', () => {
      expect(typeof computed.getSelectedNode).toBe('function')
    })

    it('exposes getSelectedNodeParent', () => {
      expect(typeof computed.getSelectedNodeParent).toBe('function')
    })

    it('exposes getMultiSelectedNodes', () => {
      expect(typeof computed.getMultiSelectedNodes).toBe('function')
    })

    it('exposes isValidGroupSelection', () => {
      expect(typeof computed.isValidGroupSelection).toBe('function')
    })

    it('exposes getSelectionBreadcrumb', () => {
      expect(typeof computed.getSelectionBreadcrumb).toBe('function')
    })

    it('exposes getSelectedNodeChildren', () => {
      expect(typeof computed.getSelectedNodeChildren).toBe('function')
    })
  })

  describe('events', () => {
    it('exposes on() method', () => {
      expect(typeof events.on).toBe('function')
    })

    it('exposes off() method', () => {
      expect(typeof events.off).toBe('function')
    })

    it('exposes emit() method', () => {
      expect(typeof events.emit).toBe('function')
    })

    it('on() returns unsubscribe function', () => {
      const unsub = events.on('test:event' as any, () => {})
      expect(typeof unsub).toBe('function')
      unsub()
    })
  })

  describe('executor', () => {
    it('exposes execute() method', () => {
      expect(typeof executor.execute).toBe('function')
    })

    it('exposes undo() method', () => {
      expect(typeof executor.undo).toBe('function')
    })

    it('exposes redo() method', () => {
      expect(typeof executor.redo).toBe('function')
    })

    it('exposes canUndo() method', () => {
      expect(typeof executor.canUndo).toBe('function')
    })

    it('exposes canRedo() method', () => {
      expect(typeof executor.canRedo).toBe('function')
    })

    it('exposes clear() method', () => {
      expect(typeof executor.clear).toBe('function')
    })
  })

  describe('commands exist', () => {
    it('SetPropertyCommand exists', () => {
      expect(SetPropertyCommand).toBeDefined()
    })

    it('RemovePropertyCommand exists', () => {
      expect(RemovePropertyCommand).toBeDefined()
    })

    it('InsertComponentCommand exists', () => {
      expect(InsertComponentCommand).toBeDefined()
    })

    it('DeleteNodeCommand exists', () => {
      expect(DeleteNodeCommand).toBeDefined()
    })

    it('MoveNodeCommand exists', () => {
      expect(MoveNodeCommand).toBeDefined()
    })

    it('MoveNodeWithLayoutCommand exists', () => {
      expect(MoveNodeWithLayoutCommand).toBeDefined()
    })

    it('WrapNodesCommand exists', () => {
      expect(WrapNodesCommand).toBeDefined()
    })

    it('BatchCommand exists', () => {
      expect(BatchCommand).toBeDefined()
    })

    it('ResizeCommand exists', () => {
      expect(ResizeCommand).toBeDefined()
    })

    it('UpdateSourceCommand exists', () => {
      expect(UpdateSourceCommand).toBeDefined()
    })
  })

  describe('StateSelectionAdapter', () => {
    it('StateSelectionAdapter class exists', () => {
      expect(StateSelectionAdapter).toBeDefined()
    })

    it('getStateSelectionAdapter function exists', () => {
      expect(typeof getStateSelectionAdapter).toBe('function')
    })

    it('disposeStateSelectionAdapter function exists', () => {
      expect(typeof disposeStateSelectionAdapter).toBe('function')
    })
  })

  describe('Context', () => {
    it('createStudioContext function exists', () => {
      expect(typeof createStudioContext).toBe('function')
    })

    it('createTestContext function exists', () => {
      expect(typeof createTestContext).toBe('function')
    })

    it('getStudioContext function exists', () => {
      expect(typeof getStudioContext).toBe('function')
    })
  })
})

describe('Core Events Integration', () => {
  beforeEach(() => {
    actions.clearSelection()
    actions.clearMultiSelection()
  })

  it('emits events when actions are called', () => {
    let eventFired = false
    const unsub = events.on('source:changed', () => {
      eventFired = true
    })

    actions.setSource('Box')

    // Event should have fired
    expect(eventFired).toBe(true)
    unsub()
  })

  it('selection change updates state', () => {
    actions.setSelection('test-node', 'editor')
    expect(state.get().selection.nodeId).toBe('test-node')
    expect(state.get().selection.origin).toBe('editor')

    actions.clearSelection()
    expect(state.get().selection.nodeId).toBeNull()
  })

  it('multi-selection works correctly', () => {
    actions.clearMultiSelection()

    actions.toggleMultiSelection('node-1')
    expect(state.get().multiSelection).toContain('node-1')

    actions.toggleMultiSelection('node-2')
    expect(state.get().multiSelection).toContain('node-1')
    expect(state.get().multiSelection).toContain('node-2')

    actions.toggleMultiSelection('node-1')
    expect(state.get().multiSelection).not.toContain('node-1')
    expect(state.get().multiSelection).toContain('node-2')

    actions.clearMultiSelection()
    expect(state.get().multiSelection).toHaveLength(0)
  })

  it('setMultiSelection replaces entire selection', () => {
    actions.setMultiSelection(['node-a', 'node-b', 'node-c'])
    expect(state.get().multiSelection).toEqual(['node-a', 'node-b', 'node-c'])

    actions.setMultiSelection(['node-x'])
    expect(state.get().multiSelection).toEqual(['node-x'])

    actions.clearMultiSelection()
  })

  it('cursor update works', () => {
    actions.setCursor(10, 5)
    const cursor = state.get().cursor
    expect(cursor.line).toBe(10)
    expect(cursor.column).toBe(5)
  })

  it('editor focus state works', () => {
    actions.setEditorFocus(true)
    expect(state.get().editorHasFocus).toBe(true)

    actions.setEditorFocus(false)
    expect(state.get().editorHasFocus).toBe(false)
  })
})
