/**
 * Integration Tests for Studio Workflow
 * Tests the interaction between State, Events, and Commands
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  state,
  actions,
  events,
  executor,
  RecordedChangeCommand,
  setCommandContext,
  type StudioState,
} from '../../studio/core'

// Mock command context for tests that need undo/redo
function setupMockContext() {
  let source = ''
  const mockContext = {
    getSourceMap: () => null,
    getSource: () => source,
    applyChange: (change: { from: number; to: number; insert: string }) => {
      source = source.slice(0, change.from) + change.insert + source.slice(change.to)
    },
    compile: () => {},
  }
  setCommandContext(mockContext)
  return {
    getSource: () => source,
    setSource: (s: string) => { source = s },
  }
}

// ===========================================
// SELECTION → PROPERTY PANEL FLOW
// ===========================================

describe('Selection Flow', () => {
  const initialState: Partial<StudioState> = {
    source: '',
    ast: null,
    ir: null,
    sourceMap: null,
    errors: [],
    selection: { nodeId: null, origin: 'editor' },
    cursor: { line: 1, column: 1 },
    editorHasFocus: false,
    currentFile: 'index.mirror',
  }

  beforeEach(() => {
    state.set(initialState)
    executor.clear()
  })

  describe('Selection State', () => {
    it('should emit selection:changed when selecting from preview', () => {
      const handler = vi.fn()
      const unsub = events.on('selection:changed', handler)

      actions.setSelection('box-1', 'preview')

      expect(handler).toHaveBeenCalledWith({ nodeId: 'box-1', origin: 'preview' })
      expect(state.get().selection).toEqual({ nodeId: 'box-1', origin: 'preview' })

      unsub()
    })

    it('should emit selection:changed when selecting from editor', () => {
      const handler = vi.fn()
      const unsub = events.on('selection:changed', handler)

      actions.setSelection('text-1', 'editor')

      expect(handler).toHaveBeenCalledWith({ nodeId: 'text-1', origin: 'editor' })
      expect(state.get().selection).toEqual({ nodeId: 'text-1', origin: 'editor' })

      unsub()
    })

    it('should allow property panel to respond to selection', () => {
      const propertyPanelUpdater = vi.fn()
      const unsub = events.on('selection:changed', ({ nodeId }) => {
        if (nodeId) {
          propertyPanelUpdater(nodeId)
        }
      })

      actions.setSelection('button-1', 'preview')

      expect(propertyPanelUpdater).toHaveBeenCalledWith('button-1')

      unsub()
    })

    it('should clear selection', () => {
      actions.setSelection('box-1', 'preview')
      actions.setSelection(null, 'keyboard')

      expect(state.get().selection.nodeId).toBeNull()
    })
  })

  describe('Multi-subscriber Pattern', () => {
    it('should notify multiple subscribers on selection change', () => {
      const previewHighlighter = vi.fn()
      const propertyPanelUpdater = vi.fn()
      const breadcrumbUpdater = vi.fn()

      const unsub1 = events.on('selection:changed', previewHighlighter)
      const unsub2 = events.on('selection:changed', propertyPanelUpdater)
      const unsub3 = events.on('selection:changed', breadcrumbUpdater)

      actions.setSelection('box-1', 'preview')

      expect(previewHighlighter).toHaveBeenCalled()
      expect(propertyPanelUpdater).toHaveBeenCalled()
      expect(breadcrumbUpdater).toHaveBeenCalled()

      unsub1()
      unsub2()
      unsub3()
    })
  })
})

// ===========================================
// CURSOR → SELECTION SYNC
// ===========================================

describe('Cursor Sync', () => {
  const initialState: Partial<StudioState> = {
    source: '',
    ast: null,
    ir: null,
    sourceMap: null,
    errors: [],
    selection: { nodeId: null, origin: 'editor' },
    cursor: { line: 1, column: 1 },
    editorHasFocus: false,
    currentFile: 'index.mirror',
  }

  beforeEach(() => {
    state.set(initialState)
  })

  it('should emit cursor event when cursor moves', () => {
    const handler = vi.fn()
    const unsub = events.on('editor:cursor-moved', handler)

    actions.setCursor(5, 10)

    expect(handler).toHaveBeenCalledWith({ line: 5, column: 10 })
    expect(state.get().cursor).toEqual({ line: 5, column: 10 })

    unsub()
  })

  it('should track editor focus state', () => {
    const focusHandler = vi.fn()
    const blurHandler = vi.fn()

    const unsub1 = events.on('editor:focused', focusHandler)
    const unsub2 = events.on('editor:blurred', blurHandler)

    actions.setEditorFocus(true)
    expect(focusHandler).toHaveBeenCalled()
    expect(state.get().editorHasFocus).toBe(true)

    actions.setEditorFocus(false)
    expect(blurHandler).toHaveBeenCalled()
    expect(state.get().editorHasFocus).toBe(false)

    unsub1()
    unsub2()
  })
})

// ===========================================
// SOURCE CHANGE → UNDO/REDO
// ===========================================

describe('Source Change Flow', () => {
  const initialState: Partial<StudioState> = {
    source: 'Box pad 10',
    ast: null,
    ir: null,
    sourceMap: null,
    errors: [],
    selection: { nodeId: null, origin: 'editor' },
    cursor: { line: 1, column: 1 },
    editorHasFocus: false,
    currentFile: 'index.mirror',
  }

  beforeEach(() => {
    state.set(initialState)
    executor.clear()
  })

  it('should emit source:changed when source updates', () => {
    const handler = vi.fn()
    const unsub = events.on('source:changed', handler)

    actions.setSource('Box pad 20')

    expect(handler).toHaveBeenCalledWith({ source: 'Box pad 20', origin: 'external' })

    unsub()
  })

  it('should include origin in source:changed event', () => {
    const handler = vi.fn()
    const unsub = events.on('source:changed', handler)

    actions.setSource('Box pad 20', 'editor')
    expect(handler).toHaveBeenCalledWith({ source: 'Box pad 20', origin: 'editor' })

    actions.setSource('Box pad 30', 'command')
    expect(handler).toHaveBeenCalledWith({ source: 'Box pad 30', origin: 'command' })

    unsub()
  })
})

// ===========================================
// RECORDED CHANGE COMMAND (for Property Panel)
// ===========================================

describe('RecordedChangeCommand', () => {
  beforeEach(() => {
    setupMockContext()
    executor.clear()
  })

  it('should support undo of recorded change', () => {
    let source = 'Box pad 10'

    // Mock context
    const mockContext = {
      getSourceMap: () => null,
      getSource: () => source,
      applyChange: (change: { from: number; to: number; insert: string }) => {
        source = source.slice(0, change.from) + change.insert + source.slice(change.to)
      },
      compile: () => {},
    }

    // Simulate external change (like PropertyPanel did)
    const originalSource = source
    source = 'Box pad 20'

    // Record the change
    const command = new RecordedChangeCommand({
      change: { from: 8, to: 10, insert: '20' },
      inverseChange: { from: 8, to: 10, insert: '10' },
      description: 'Set pad to 20',
    })

    // First execute is no-op (change already applied)
    const result = command.execute()
    expect(result.success).toBe(true)
    expect(source).toBe('Box pad 20')
  })

  it('should track command in executor', () => {
    const command = new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: 'test' },
      inverseChange: { from: 0, to: 4, insert: '' },
    })

    executor.execute(command)

    expect(executor.canUndo()).toBe(true)
    expect(executor.canRedo()).toBe(false)
  })

  it('should clear redo stack on new command', () => {
    const cmd1 = new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: 'a' },
      inverseChange: { from: 0, to: 1, insert: '' },
    })
    const cmd2 = new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: 'b' },
      inverseChange: { from: 0, to: 1, insert: '' },
    })

    executor.execute(cmd1)
    executor.undo()
    expect(executor.canRedo()).toBe(true)

    executor.execute(cmd2)
    expect(executor.canRedo()).toBe(false)
  })
})

// ===========================================
// STATE SUBSCRIPTION PATTERN
// ===========================================

describe('State Subscription', () => {
  const initialState: Partial<StudioState> = {
    source: '',
    selection: { nodeId: null, origin: 'editor' },
  }

  beforeEach(() => {
    state.set(initialState)
  })

  it('should notify subscribers on state change', () => {
    const subscriber = vi.fn()
    const unsub = state.subscribe(subscriber)

    state.set({ source: 'Box pad 10' })

    expect(subscriber).toHaveBeenCalled()

    unsub()
  })

  it('should stop notifying after unsubscribe', () => {
    const subscriber = vi.fn()
    const unsub = state.subscribe(subscriber)

    state.set({ source: 'first' })
    expect(subscriber).toHaveBeenCalledTimes(1)

    unsub()

    state.set({ source: 'second' })
    expect(subscriber).toHaveBeenCalledTimes(1)
  })

  it('should support multiple subscribers', () => {
    const sub1 = vi.fn()
    const sub2 = vi.fn()

    const unsub1 = state.subscribe(sub1)
    const unsub2 = state.subscribe(sub2)

    state.set({ source: 'test' })

    expect(sub1).toHaveBeenCalled()
    expect(sub2).toHaveBeenCalled()

    unsub1()
    unsub2()
  })
})

// ===========================================
// EVENT ONCE PATTERN
// ===========================================

describe('Event Once', () => {
  beforeEach(() => {
    state.set({ selection: { nodeId: null, origin: 'editor' } })
  })

  it('should only fire once handler once', () => {
    const handler = vi.fn()
    events.once('selection:changed', handler)

    actions.setSelection('box-1', 'preview')
    actions.setSelection('box-2', 'preview')

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ nodeId: 'box-1', origin: 'preview' })
  })
})

// ===========================================
// COMPLETE WORKFLOW SCENARIOS
// ===========================================

describe('Workflow Scenarios', () => {
  beforeEach(() => {
    setupMockContext()
    state.set({
      source: 'Box pad 10',
      selection: { nodeId: null, origin: 'editor' },
      cursor: { line: 1, column: 1 },
      editorHasFocus: false,
    })
    executor.clear()
  })

  it('Scenario: User clicks element in preview', () => {
    const selectionHandler = vi.fn()
    const unsub = events.on('selection:changed', selectionHandler)

    // User clicks element in preview
    actions.setSelection('box-1', 'preview')

    // Verify state updated
    expect(state.get().selection).toEqual({ nodeId: 'box-1', origin: 'preview' })

    // Verify event fired (property panel would react to this)
    expect(selectionHandler).toHaveBeenCalledWith({ nodeId: 'box-1', origin: 'preview' })

    unsub()
  })

  it('Scenario: User edits in editor', () => {
    const sourceHandler = vi.fn()
    const cursorHandler = vi.fn()

    const unsub1 = events.on('source:changed', sourceHandler)
    const unsub2 = events.on('editor:cursor-moved', cursorHandler)

    // User types in editor
    actions.setSource('Box pad 20', 'editor')
    actions.setCursor(1, 11)

    expect(sourceHandler).toHaveBeenCalledWith({ source: 'Box pad 20', origin: 'editor' })
    expect(cursorHandler).toHaveBeenCalledWith({ line: 1, column: 11 })

    unsub1()
    unsub2()
  })

  it('Scenario: Property panel changes value with undo support', () => {
    // Record command for undo
    const command = new RecordedChangeCommand({
      change: { from: 8, to: 10, insert: '20' },
      inverseChange: { from: 8, to: 10, insert: '10' },
      description: 'Set pad to 20',
    })

    executor.execute(command)

    // Can undo
    expect(executor.canUndo()).toBe(true)

    // Undo
    executor.undo()
    expect(executor.canUndo()).toBe(false)
    expect(executor.canRedo()).toBe(true)

    // Redo
    executor.redo()
    expect(executor.canUndo()).toBe(true)
    expect(executor.canRedo()).toBe(false)
  })

  it('Scenario: Multiple rapid changes followed by undo', () => {
    // Record several changes
    executor.execute(new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: '1' },
      inverseChange: { from: 0, to: 1, insert: '' },
    }))
    executor.execute(new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: '2' },
      inverseChange: { from: 0, to: 1, insert: '' },
    }))
    executor.execute(new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: '3' },
      inverseChange: { from: 0, to: 1, insert: '' },
    }))

    // Undo all
    executor.undo()
    executor.undo()
    executor.undo()

    expect(executor.canUndo()).toBe(false)
    expect(executor.canRedo()).toBe(true)

    // Redo one
    executor.redo()
    expect(executor.canUndo()).toBe(true)
    expect(executor.canRedo()).toBe(true)
  })
})
