/**
 * Comprehensive Tests for Studio Core Architecture
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  state,
  actions,
  events,
  executor,
  SetPropertyCommand,
  RemovePropertyCommand,
  BatchCommand,
  RecordedChangeCommand,
  InsertComponentCommand,
  DeleteNodeCommand,
  MoveNodeCommand,
  UpdateSourceCommand,
  setCommandContext,
  type CommandContext,
  type StudioState,
} from '../../studio/core'

// ===========================================
// STATE STORE TESTS
// ===========================================

describe('State Store', () => {
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

  describe('Basic Operations', () => {
    it('should get initial state', () => {
      const s = state.get()
      expect(s.source).toBe('')
      expect(s.selection.nodeId).toBeNull()
    })

    it('should update state with set', () => {
      state.set({ source: 'Box' })
      expect(state.get().source).toBe('Box')
    })

    it('should preserve other state properties on partial update', () => {
      state.set({ source: 'Box', currentFile: 'test.mirror' })
      state.set({ source: 'Text' })
      expect(state.get().source).toBe('Text')
      expect(state.get().currentFile).toBe('test.mirror')
    })

    it('should handle nested object updates', () => {
      state.set({ selection: { nodeId: 'box-1', origin: 'preview' } })
      expect(state.get().selection.nodeId).toBe('box-1')
      expect(state.get().selection.origin).toBe('preview')
    })

    it('should handle array updates', () => {
      state.set({ errors: [{ message: 'Error 1', line: 1 }] as any })
      expect(state.get().errors).toHaveLength(1)
    })
  })

  describe('Subscriptions', () => {
    it('should notify subscribers on change', () => {
      const handler = vi.fn()
      const unsubscribe = state.subscribe(handler)

      state.set({ source: 'Text "hello"' })

      expect(handler).toHaveBeenCalled()
      unsubscribe()
    })

    it('should provide prevState to subscribers', () => {
      let capturedPrevState: any = null
      const handler = vi.fn((s, prevState) => {
        capturedPrevState = prevState
      })
      const unsubscribe = state.subscribe(handler)

      state.set({ source: 'Box' })
      expect(capturedPrevState.source).toBe('')

      state.set({ source: 'Text' })
      expect(capturedPrevState.source).toBe('Box')

      unsubscribe()
    })

    it('should support multiple subscribers', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      const unsub1 = state.subscribe(handler1)
      const unsub2 = state.subscribe(handler2)
      const unsub3 = state.subscribe(handler3)

      state.set({ source: 'Test' })

      expect(handler1).toHaveBeenCalledTimes(1)
      expect(handler2).toHaveBeenCalledTimes(1)
      expect(handler3).toHaveBeenCalledTimes(1)

      unsub1()
      unsub2()
      unsub3()
    })

    it('should not notify after unsubscribe', () => {
      const handler = vi.fn()
      const unsubscribe = state.subscribe(handler)

      state.set({ source: 'First' })
      expect(handler).toHaveBeenCalledTimes(1)

      unsubscribe()
      state.set({ source: 'Second' })
      expect(handler).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should handle unsubscribe during notification', () => {
      let unsubscribe: () => void
      const handler = vi.fn(() => {
        unsubscribe()
      })
      unsubscribe = state.subscribe(handler)

      // Should not throw
      expect(() => state.set({ source: 'Test' })).not.toThrow()
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty updates', () => {
      const handler = vi.fn()
      const unsub = state.subscribe(handler)

      state.set({})
      expect(handler).toHaveBeenCalled()

      unsub()
    })

    it('should handle null values', () => {
      state.set({ ast: { type: 'test' } as any })
      expect(state.get().ast).not.toBeNull()

      state.set({ ast: null })
      expect(state.get().ast).toBeNull()
    })

    it('should handle rapid state changes', () => {
      const handler = vi.fn()
      const unsub = state.subscribe(handler)

      for (let i = 0; i < 100; i++) {
        state.set({ source: `Source ${i}` })
      }

      expect(handler).toHaveBeenCalledTimes(100)
      expect(state.get().source).toBe('Source 99')

      unsub()
    })
  })
})

// ===========================================
// ACTIONS TESTS
// ===========================================

describe('Actions', () => {
  beforeEach(() => {
    state.set({
      source: '',
      ast: null,
      ir: null,
      sourceMap: null,
      errors: [],
      selection: { nodeId: null, origin: 'editor' },
      cursor: { line: 1, column: 1 },
      editorHasFocus: false,
      currentFile: 'index.mirror',
    })
  })

  describe('setSelection', () => {
    it('should set selection with nodeId and origin', () => {
      actions.setSelection('box-1', 'preview')
      const s = state.get()
      expect(s.selection.nodeId).toBe('box-1')
      expect(s.selection.origin).toBe('preview')
    })

    it('should clear selection with null', () => {
      actions.setSelection('box-1', 'preview')
      actions.setSelection(null, 'keyboard')
      expect(state.get().selection.nodeId).toBeNull()
    })

    it('should handle different origins', () => {
      const origins: Array<'editor' | 'preview' | 'panel' | 'keyboard'> = ['editor', 'preview', 'panel', 'keyboard']

      origins.forEach(origin => {
        actions.setSelection('test-node', origin)
        expect(state.get().selection.origin).toBe(origin)
      })
    })

    it('should emit selection:changed event', () => {
      const handler = vi.fn()
      const unsub = events.on('selection:changed', handler)

      actions.setSelection('test-node', 'preview')

      expect(handler).toHaveBeenCalledWith({
        nodeId: 'test-node',
        origin: 'preview'
      })

      unsub()
    })
  })

  describe('setCursor', () => {
    it('should set cursor position', () => {
      actions.setCursor(10, 5)
      const s = state.get()
      expect(s.cursor.line).toBe(10)
      expect(s.cursor.column).toBe(5)
    })

    it('should handle line 1 column 1', () => {
      actions.setCursor(1, 1)
      const s = state.get()
      expect(s.cursor.line).toBe(1)
      expect(s.cursor.column).toBe(1)
    })

    it('should handle large line numbers', () => {
      actions.setCursor(10000, 500)
      const s = state.get()
      expect(s.cursor.line).toBe(10000)
      expect(s.cursor.column).toBe(500)
    })

    it('should emit editor:cursor-moved event', () => {
      const handler = vi.fn()
      const unsub = events.on('editor:cursor-moved', handler)

      actions.setCursor(5, 10)

      expect(handler).toHaveBeenCalledWith({ line: 5, column: 10 })

      unsub()
    })
  })

  describe('setEditorFocus', () => {
    it('should set editor focus to true', () => {
      expect(state.get().editorHasFocus).toBe(false)
      actions.setEditorFocus(true)
      expect(state.get().editorHasFocus).toBe(true)
    })

    it('should set editor focus to false', () => {
      actions.setEditorFocus(true)
      actions.setEditorFocus(false)
      expect(state.get().editorHasFocus).toBe(false)
    })

    it('should emit editor:focused event when gaining focus', () => {
      const handler = vi.fn()
      const unsub = events.on('editor:focused', handler)

      actions.setEditorFocus(true)
      expect(handler).toHaveBeenCalled()

      unsub()
    })

    it('should emit editor:blurred event when losing focus', () => {
      const handler = vi.fn()
      const unsub = events.on('editor:blurred', handler)

      actions.setEditorFocus(true)
      actions.setEditorFocus(false)
      expect(handler).toHaveBeenCalled()

      unsub()
    })
  })

  describe('setSource', () => {
    it('should update source code', () => {
      actions.setSource('Box pad 10')
      expect(state.get().source).toBe('Box pad 10')
    })

    it('should handle empty source', () => {
      actions.setSource('Some code')
      actions.setSource('')
      expect(state.get().source).toBe('')
    })

    it('should handle multiline source', () => {
      const multiline = `Box pad 10
  Text "Hello"
  Button "Click"`
      actions.setSource(multiline)
      expect(state.get().source).toBe(multiline)
    })
  })

})

// ===========================================
// EVENT BUS TESTS
// ===========================================

describe('Event Bus', () => {
  describe('Basic emit/on', () => {
    it('should emit and receive events', () => {
      const handler = vi.fn()
      const unsubscribe = events.on('selection:changed', handler)

      events.emit('selection:changed', { nodeId: 'test', origin: 'preview' })

      expect(handler).toHaveBeenCalledWith({ nodeId: 'test', origin: 'preview' })
      unsubscribe()
    })

    it('should pass correct event data', () => {
      const handler = vi.fn()
      const unsub = events.on('source:changed', handler)

      const eventData = { source: 'Box pad 10', origin: 'editor', change: { from: 0, to: 0, insert: 'Box' } }
      events.emit('source:changed', eventData)

      expect(handler).toHaveBeenCalledWith(eventData)
      unsub()
    })
  })

  describe('once', () => {
    it('should only fire once', () => {
      const handler = vi.fn()
      events.once('source:changed', handler)

      events.emit('source:changed', { source: 'first', origin: 'editor' })
      events.emit('source:changed', { source: 'second', origin: 'editor' })
      events.emit('source:changed', { source: 'third', origin: 'editor' })

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler).toHaveBeenCalledWith({ source: 'first', origin: 'editor' })
    })
  })

  describe('Multiple listeners', () => {
    it('should handle multiple listeners for same event', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()
      const handler3 = vi.fn()

      const unsub1 = events.on('command:executed', handler1)
      const unsub2 = events.on('command:executed', handler2)
      const unsub3 = events.on('command:executed', handler3)

      events.emit('command:executed', { command: {} as any })

      expect(handler1).toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()
      expect(handler3).toHaveBeenCalled()

      unsub1()
      unsub2()
      unsub3()
    })

    it('should not affect other listeners when one unsubscribes', () => {
      const handler1 = vi.fn()
      const handler2 = vi.fn()

      const unsub1 = events.on('selection:changed', handler1)
      const unsub2 = events.on('selection:changed', handler2)

      unsub1()
      events.emit('selection:changed', { nodeId: 'test', origin: 'editor' })

      expect(handler1).not.toHaveBeenCalled()
      expect(handler2).toHaveBeenCalled()

      unsub2()
    })
  })

  describe('Unsubscribe', () => {
    it('should unsubscribe correctly', () => {
      const handler = vi.fn()
      const unsubscribe = events.on('editor:focused', handler)

      unsubscribe()
      events.emit('editor:focused', undefined)

      expect(handler).not.toHaveBeenCalled()
    })

    it('should handle double unsubscribe gracefully', () => {
      const handler = vi.fn()
      const unsubscribe = events.on('editor:focused', handler)

      unsubscribe()
      expect(() => unsubscribe()).not.toThrow()
    })
  })

  describe('Event Types', () => {
    it('should handle all defined event types', () => {
      const eventTypes = [
        'selection:changed',
        'source:changed',
        'cursor:moved',
        'command:executed',
        'command:undone',
        'command:redone',
        'editor:focused',
        'editor:blurred',
        'preview:element-hovered',
        'compile:requested',
      ] as const

      eventTypes.forEach(eventType => {
        const handler = vi.fn()
        const unsub = events.on(eventType, handler)
        events.emit(eventType, {} as any)
        expect(handler).toHaveBeenCalled()
        unsub()
      })
    })
  })
})

// ===========================================
// COMMAND EXECUTOR TESTS
// ===========================================

describe('Command Executor', () => {
  beforeEach(() => {
    executor.clear()
    // Set up command context for executor tests
    setCommandContext({
      getSourceMap: () => null,
      getSource: () => 'test source',
      getResolvedSource: () => 'test source',
      getPreludeOffset: () => 0,
      applyChange: vi.fn(),
      compile: vi.fn(),
    })
  })

  describe('Initial State', () => {
    it('should start with empty undo/redo stacks', () => {
      expect(executor.canUndo()).toBe(false)
      expect(executor.canRedo()).toBe(false)
    })
  })

  describe('Execute', () => {
    it('should execute command and add to undo stack', () => {
      const mockCommand = {
        type: 'TEST',
        description: 'Test command',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)

      expect(mockCommand.execute).toHaveBeenCalled()
      expect(executor.canUndo()).toBe(true)
    })

    it('should emit command:executed event', () => {
      const handler = vi.fn()
      const unsub = events.on('command:executed', handler)

      const mockCommand = {
        type: 'TEST',
        description: 'Test command',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)

      expect(handler).toHaveBeenCalled()
      unsub()
    })

    it('should clear redo stack on new execute', () => {
      const cmd1 = {
        type: 'TEST1',
        description: 'Test 1',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }
      const cmd2 = {
        type: 'TEST2',
        description: 'Test 2',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(cmd1)
      executor.undo()
      expect(executor.canRedo()).toBe(true)

      executor.execute(cmd2)
      expect(executor.canRedo()).toBe(false) // Redo stack cleared
    })

    it('should not add to undo stack if execute fails', () => {
      const mockCommand = {
        type: 'TEST',
        description: 'Failing command',
        execute: vi.fn().mockReturnValue({ success: false, error: 'Failed' }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)

      expect(executor.canUndo()).toBe(false)
    })
  })

  describe('Undo/Redo', () => {
    it('should handle basic undo/redo cycle', () => {
      const mockCommand = {
        type: 'TEST',
        description: 'Test command',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)
      expect(executor.canUndo()).toBe(true)
      expect(executor.canRedo()).toBe(false)

      executor.undo()
      expect(mockCommand.undo).toHaveBeenCalled()
      expect(executor.canUndo()).toBe(false)
      expect(executor.canRedo()).toBe(true)

      executor.redo()
      expect(mockCommand.execute).toHaveBeenCalledTimes(2)
      expect(executor.canUndo()).toBe(true)
      expect(executor.canRedo()).toBe(false)
    })

    it('should emit command:undone event', () => {
      const handler = vi.fn()
      const unsub = events.on('command:undone', handler)

      const mockCommand = {
        type: 'TEST',
        description: 'Test',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)
      executor.undo()

      expect(handler).toHaveBeenCalled()
      unsub()
    })

    it('should emit command:redone event', () => {
      const handler = vi.fn()
      const unsub = events.on('command:redone', handler)

      const mockCommand = {
        type: 'TEST',
        description: 'Test',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)
      executor.undo()
      executor.redo()

      expect(handler).toHaveBeenCalled()
      unsub()
    })

    it('should handle multiple undo/redo operations', () => {
      const commands = Array.from({ length: 5 }, (_, i) => ({
        type: `TEST${i}`,
        description: `Test ${i}`,
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }))

      // Execute all
      commands.forEach(cmd => executor.execute(cmd))
      expect(executor.canUndo()).toBe(true)

      // Undo all
      for (let i = 0; i < 5; i++) {
        executor.undo()
      }
      expect(executor.canUndo()).toBe(false)
      expect(executor.canRedo()).toBe(true)

      // Redo all
      for (let i = 0; i < 5; i++) {
        executor.redo()
      }
      expect(executor.canUndo()).toBe(true)
      expect(executor.canRedo()).toBe(false)
    })

    it('should do nothing when undo called with empty stack', () => {
      expect(() => executor.undo()).not.toThrow()
      expect(executor.canUndo()).toBe(false)
    })

    it('should do nothing when redo called with empty stack', () => {
      expect(() => executor.redo()).not.toThrow()
      expect(executor.canRedo()).toBe(false)
    })
  })

  describe('Clear', () => {
    it('should clear both stacks', () => {
      const mockCommand = {
        type: 'TEST',
        description: 'Test',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      executor.execute(mockCommand)
      executor.undo()

      expect(executor.canUndo()).toBe(false)
      expect(executor.canRedo()).toBe(true)

      executor.clear()

      expect(executor.canUndo()).toBe(false)
      expect(executor.canRedo()).toBe(false)
    })
  })

  describe('History Limit', () => {
    it('should respect max history limit', () => {
      // Create many commands
      for (let i = 0; i < 150; i++) {
        executor.execute({
          type: `TEST${i}`,
          description: `Test ${i}`,
          execute: vi.fn().mockReturnValue({ success: true }),
          undo: vi.fn().mockReturnValue({ success: true }),
        })
      }

      // Should still be able to undo (but limited to max)
      let undoCount = 0
      while (executor.canUndo()) {
        executor.undo()
        undoCount++
      }

      // Max history is 100 by default
      expect(undoCount).toBeLessThanOrEqual(100)
    })
  })
})

// ===========================================
// BATCH COMMAND TESTS
// ===========================================

describe('BatchCommand', () => {
  describe('Execute', () => {
    it('should execute multiple commands in sequence', () => {
      const order: number[] = []
      const cmd1 = {
        type: 'TEST1',
        description: 'Test 1',
        execute: vi.fn().mockImplementation(() => { order.push(1); return { success: true } }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }
      const cmd2 = {
        type: 'TEST2',
        description: 'Test 2',
        execute: vi.fn().mockImplementation(() => { order.push(2); return { success: true } }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }
      const cmd3 = {
        type: 'TEST3',
        description: 'Test 3',
        execute: vi.fn().mockImplementation(() => { order.push(3); return { success: true } }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      const batch = new BatchCommand({ commands: [cmd1, cmd2, cmd3] })
      const result = batch.execute()

      expect(result.success).toBe(true)
      expect(order).toEqual([1, 2, 3])
    })

    it('should use provided description', () => {
      const batch = new BatchCommand({
        commands: [],
        description: 'Custom batch description'
      })

      expect(batch.description).toBe('Custom batch description')
    })
  })

  describe('Rollback', () => {
    it('should rollback on failure', () => {
      const cmd1 = {
        type: 'TEST1',
        description: 'Test 1',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }
      const cmd2 = {
        type: 'TEST2',
        description: 'Test 2',
        execute: vi.fn().mockReturnValue({ success: false, error: 'Failed' }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      const batch = new BatchCommand({ commands: [cmd1, cmd2] })
      const result = batch.execute()

      expect(result.success).toBe(false)
      expect(cmd1.undo).toHaveBeenCalled()
    })

    it('should rollback multiple commands on failure', () => {
      const undoOrder: number[] = []
      const cmd1 = {
        type: 'TEST1',
        description: 'Test 1',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockImplementation(() => { undoOrder.push(1); return { success: true } }),
      }
      const cmd2 = {
        type: 'TEST2',
        description: 'Test 2',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockImplementation(() => { undoOrder.push(2); return { success: true } }),
      }
      const cmd3 = {
        type: 'TEST3',
        description: 'Test 3',
        execute: vi.fn().mockReturnValue({ success: false, error: 'Failed' }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      const batch = new BatchCommand({ commands: [cmd1, cmd2, cmd3] })
      batch.execute()

      // Should rollback in reverse order
      expect(undoOrder).toEqual([2, 1])
    })
  })

  describe('Undo', () => {
    it('should undo in reverse order', () => {
      const order: number[] = []
      const cmd1 = {
        type: 'TEST1',
        description: 'Test 1',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockImplementation(() => { order.push(1); return { success: true } }),
      }
      const cmd2 = {
        type: 'TEST2',
        description: 'Test 2',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockImplementation(() => { order.push(2); return { success: true } }),
      }
      const cmd3 = {
        type: 'TEST3',
        description: 'Test 3',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockImplementation(() => { order.push(3); return { success: true } }),
      }

      const batch = new BatchCommand({ commands: [cmd1, cmd2, cmd3] })
      batch.execute()
      batch.undo()

      expect(order).toEqual([3, 2, 1])
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty command list', () => {
      const batch = new BatchCommand({ commands: [] })
      const result = batch.execute()

      expect(result.success).toBe(true)
    })

    it('should handle single command', () => {
      const cmd = {
        type: 'TEST',
        description: 'Test',
        execute: vi.fn().mockReturnValue({ success: true }),
        undo: vi.fn().mockReturnValue({ success: true }),
      }

      const batch = new BatchCommand({ commands: [cmd] })
      const result = batch.execute()

      expect(result.success).toBe(true)
      expect(cmd.execute).toHaveBeenCalled()
    })
  })
})

// ===========================================
// RECORDED CHANGE COMMAND TESTS
// ===========================================

describe('RecordedChangeCommand', () => {
  let applyChangeMock: ReturnType<typeof vi.fn>
  let compileMock: ReturnType<typeof vi.fn>
  let ctx: CommandContext

  beforeEach(() => {
    applyChangeMock = vi.fn()
    compileMock = vi.fn()
    ctx = {
      getSourceMap: () => null,
      getSource: () => 'test source',
      getResolvedSource: () => 'test source',
      getPreludeOffset: () => 0,
      applyChange: applyChangeMock,
      compile: compileMock,
    }
    setCommandContext(ctx)
  })

  describe('First Execute', () => {
    it('should not apply change on first execute (change already applied)', () => {
      const cmd = new RecordedChangeCommand({
        change: { from: 0, to: 5, insert: 'hello' },
        inverseChange: { from: 0, to: 5, insert: 'world' },
        description: 'Test change'
      })

      const result = cmd.execute(ctx)

      expect(result.success).toBe(true)
      expect(applyChangeMock).not.toHaveBeenCalled()
    })

    it('should return the change in result', () => {
      const change = { from: 0, to: 5, insert: 'hello' }
      const cmd = new RecordedChangeCommand({
        change,
        inverseChange: { from: 0, to: 5, insert: 'world' },
        description: 'Test change'
      })

      const result = cmd.execute(ctx)

      expect(result.change).toEqual(change)
    })
  })

  describe('Undo', () => {
    it('should apply inverse change on undo', () => {
      const inverseChange = { from: 0, to: 5, insert: 'world' }
      const cmd = new RecordedChangeCommand({
        change: { from: 0, to: 5, insert: 'hello' },
        inverseChange,
        description: 'Test change'
      })

      cmd.execute(ctx)
      const result = cmd.undo(ctx)

      expect(result.success).toBe(true)
      expect(applyChangeMock).toHaveBeenCalledWith(inverseChange)
    })

    it('should return inverse change in result', () => {
      const inverseChange = { from: 0, to: 5, insert: 'world' }
      const cmd = new RecordedChangeCommand({
        change: { from: 0, to: 5, insert: 'hello' },
        inverseChange,
        description: 'Test change'
      })

      cmd.execute(ctx)
      const result = cmd.undo(ctx)

      expect(result.change).toEqual(inverseChange)
    })
  })

  describe('Redo', () => {
    it('should apply original change on redo (second execute)', () => {
      const change = { from: 0, to: 5, insert: 'hello' }
      const cmd = new RecordedChangeCommand({
        change,
        inverseChange: { from: 0, to: 5, insert: 'world' },
        description: 'Test change'
      })

      cmd.execute(ctx)
      cmd.undo(ctx)
      applyChangeMock.mockClear()

      const result = cmd.execute(ctx)

      expect(result.success).toBe(true)
      expect(applyChangeMock).toHaveBeenCalledWith(change)
    })
  })

  describe('Multiple Undo/Redo Cycles', () => {
    it('should handle multiple undo/redo cycles', () => {
      const change = { from: 0, to: 5, insert: 'hello' }
      const inverseChange = { from: 0, to: 5, insert: 'world' }
      const cmd = new RecordedChangeCommand({
        change,
        inverseChange,
        description: 'Test change'
      })

      // First execute (no-op)
      cmd.execute(ctx)
      expect(applyChangeMock).not.toHaveBeenCalled()

      // First undo
      cmd.undo(ctx)
      expect(applyChangeMock).toHaveBeenCalledWith(inverseChange)
      applyChangeMock.mockClear()

      // First redo
      cmd.execute(ctx)
      expect(applyChangeMock).toHaveBeenCalledWith(change)
      applyChangeMock.mockClear()

      // Second undo
      cmd.undo(ctx)
      expect(applyChangeMock).toHaveBeenCalledWith(inverseChange)
      applyChangeMock.mockClear()

      // Second redo
      cmd.execute(ctx)
      expect(applyChangeMock).toHaveBeenCalledWith(change)
    })
  })

  describe('Description', () => {
    it('should use provided description', () => {
      const cmd = new RecordedChangeCommand({
        change: { from: 0, to: 5, insert: 'hello' },
        inverseChange: { from: 0, to: 5, insert: 'world' },
        description: 'My custom description'
      })

      expect(cmd.description).toBe('My custom description')
    })

    it('should use default description if not provided', () => {
      const cmd = new RecordedChangeCommand({
        change: { from: 0, to: 5, insert: 'hello' },
        inverseChange: { from: 0, to: 5, insert: 'world' },
      })

      expect(cmd.description).toBe('Recorded change')
    })
  })
})

// ===========================================
// SET PROPERTY COMMAND TESTS
// ===========================================

describe('SetPropertyCommand', () => {
  let applyChangeMock: ReturnType<typeof vi.fn>
  let mockSourceMap: any

  beforeEach(() => {
    applyChangeMock = vi.fn()
    mockSourceMap = {
      getNodePosition: vi.fn().mockReturnValue({
        start: { line: 1, column: 0, offset: 0 },
        end: { line: 1, column: 10, offset: 10 },
      }),
      getPropertyPosition: vi.fn().mockReturnValue({
        start: { offset: 4 },
        end: { offset: 10 },
        hasValue: true,
      }),
    }
    setCommandContext({
      getSourceMap: () => mockSourceMap,
      getSource: () => 'Box bg #fff',
      applyChange: applyChangeMock,
      compile: vi.fn(),
    })
  })

  it('should have correct type', () => {
    const cmd = new SetPropertyCommand({
      nodeId: 'box-1',
      property: 'bg',
      value: '#000',
    })

    expect(cmd.type).toBe('SET_PROPERTY')
  })

  it('should have descriptive description', () => {
    const cmd = new SetPropertyCommand({
      nodeId: 'box-1',
      property: 'bg',
      value: '#000',
    })

    expect(cmd.description).toContain('bg')
    expect(cmd.description).toContain('#000')
  })
})

// ===========================================
// INTEGRATION: EXECUTOR WITH COMMANDS
// ===========================================

describe('Integration: Executor with Commands', () => {
  beforeEach(() => {
    executor.clear()
    setCommandContext({
      getSourceMap: () => null,
      getSource: () => 'test source',
      applyChange: vi.fn(),
      compile: vi.fn(),
    })
  })

  it('should execute RecordedChangeCommand and allow undo/redo', () => {
    const applyChangeMock = vi.fn()
    setCommandContext({
      getSourceMap: () => null,
      getSource: () => 'test source',
      applyChange: applyChangeMock,
      compile: vi.fn(),
    })

    const cmd = new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: 'Box' },
      inverseChange: { from: 0, to: 3, insert: '' },
      description: 'Add Box'
    })

    executor.execute(cmd)
    expect(executor.canUndo()).toBe(true)

    executor.undo()
    expect(applyChangeMock).toHaveBeenCalledWith({ from: 0, to: 3, insert: '' })
    expect(executor.canRedo()).toBe(true)

    executor.redo()
    expect(applyChangeMock).toHaveBeenCalledWith({ from: 0, to: 0, insert: 'Box' })
  })

  it('should handle multiple commands in sequence', () => {
    const changes: string[] = []
    setCommandContext({
      getSourceMap: () => null,
      getSource: () => 'test source',
      applyChange: (c: any) => changes.push(c.insert),
      compile: vi.fn(),
    })

    const cmd1 = new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: 'A' },
      inverseChange: { from: 0, to: 1, insert: '' },
    })
    const cmd2 = new RecordedChangeCommand({
      change: { from: 1, to: 1, insert: 'B' },
      inverseChange: { from: 1, to: 2, insert: '' },
    })
    const cmd3 = new RecordedChangeCommand({
      change: { from: 2, to: 2, insert: 'C' },
      inverseChange: { from: 2, to: 3, insert: '' },
    })

    executor.execute(cmd1)
    executor.execute(cmd2)
    executor.execute(cmd3)

    // Undo all
    executor.undo() // Undo C
    executor.undo() // Undo B
    executor.undo() // Undo A

    expect(changes).toEqual(['', '', ''])

    // Redo all
    changes.length = 0
    executor.redo() // Redo A
    executor.redo() // Redo B
    executor.redo() // Redo C

    expect(changes).toEqual(['A', 'B', 'C'])
  })

  it('should execute BatchCommand and allow single undo', () => {
    const applyChangeMock = vi.fn()
    setCommandContext({
      getSourceMap: () => null,
      getSource: () => 'test source',
      applyChange: applyChangeMock,
      compile: vi.fn(),
    })

    const cmd1 = new RecordedChangeCommand({
      change: { from: 0, to: 0, insert: 'A' },
      inverseChange: { from: 0, to: 1, insert: '' },
    })
    const cmd2 = new RecordedChangeCommand({
      change: { from: 1, to: 1, insert: 'B' },
      inverseChange: { from: 1, to: 2, insert: '' },
    })

    const batch = new BatchCommand({ commands: [cmd1, cmd2] })
    executor.execute(batch)

    expect(executor.canUndo()).toBe(true)
    executor.undo()

    // Both should be undone with single undo
    expect(applyChangeMock).toHaveBeenCalledTimes(2)
    expect(executor.canUndo()).toBe(false)
  })
})
