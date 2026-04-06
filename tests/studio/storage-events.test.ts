/**
 * Storage Events Tests
 *
 * Tests for the StorageEventEmitter class
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { StorageEventEmitter } from '../../studio/storage/events'

// =============================================================================
// TEST SETUP
// =============================================================================

let emitter: StorageEventEmitter

beforeEach(() => {
  emitter = new StorageEventEmitter()
})

// =============================================================================
// BASIC EVENT HANDLING
// =============================================================================

describe('StorageEventEmitter', () => {
  describe('on()', () => {
    it('should register an event listener', () => {
      const callback = vi.fn()
      emitter.on('file:changed', callback)

      emitter.emit('file:changed', { path: 'test.mir', content: 'content' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ path: 'test.mir', content: 'content' })
    })

    it('should allow multiple listeners for same event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      emitter.on('file:created', callback1)
      emitter.on('file:created', callback2)

      emitter.emit('file:created', { path: 'new.mir' })

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })

    it('should return unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = emitter.on('file:deleted', callback)

      emitter.emit('file:deleted', { path: 'old.mir' })
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      emitter.emit('file:deleted', { path: 'another.mir' })
      expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should not call listeners for different events', () => {
      const callback = vi.fn()
      emitter.on('file:created', callback)

      emitter.emit('file:deleted', { path: 'test.mir' })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('once()', () => {
    it('should call listener only once', () => {
      const callback = vi.fn()
      emitter.once('file:created', callback)

      emitter.emit('file:created', { path: 'first.mir' })
      emitter.emit('file:created', { path: 'second.mir' })

      expect(callback).toHaveBeenCalledTimes(1)
      expect(callback).toHaveBeenCalledWith({ path: 'first.mir' })
    })

    it('should return unsubscribe function that works before emission', () => {
      const callback = vi.fn()
      const unsubscribe = emitter.once('file:created', callback)

      unsubscribe()

      emitter.emit('file:created', { path: 'test.mir' })

      expect(callback).not.toHaveBeenCalled()
    })
  })

  describe('emit()', () => {
    it('should pass correct payload to listeners', () => {
      const callback = vi.fn()
      emitter.on('file:renamed', callback)

      emitter.emit('file:renamed', { oldPath: 'old.mir', newPath: 'new.mir' })

      expect(callback).toHaveBeenCalledWith({ oldPath: 'old.mir', newPath: 'new.mir' })
    })

    it('should handle emit with no listeners gracefully', () => {
      // Should not throw
      expect(() => {
        emitter.emit('file:created', { path: 'test.mir' })
      }).not.toThrow()
    })

    it('should catch errors in listeners and continue', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Listener error')
      })
      const successCallback = vi.fn()

      // Suppress console.error for this test
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      emitter.on('file:created', errorCallback)
      emitter.on('file:created', successCallback)

      expect(() => {
        emitter.emit('file:created', { path: 'test.mir' })
      }).not.toThrow()

      expect(errorCallback).toHaveBeenCalled()
      expect(successCallback).toHaveBeenCalled()

      consoleError.mockRestore()
    })
  })

  describe('off()', () => {
    it('should remove all listeners for an event', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      emitter.on('file:changed', callback1)
      emitter.on('file:changed', callback2)

      emitter.off('file:changed')

      emitter.emit('file:changed', { path: 'test.mir', content: '' })

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
    })

    it('should not affect other events', () => {
      const changedCallback = vi.fn()
      const createdCallback = vi.fn()

      emitter.on('file:changed', changedCallback)
      emitter.on('file:created', createdCallback)

      emitter.off('file:changed')

      emitter.emit('file:created', { path: 'test.mir' })

      expect(createdCallback).toHaveBeenCalled()
    })
  })

  describe('clear()', () => {
    it('should remove all listeners for all events', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      emitter.on('file:changed', callback1)
      emitter.on('file:created', callback2)
      emitter.on('file:deleted', callback3)

      emitter.clear()

      emitter.emit('file:changed', { path: 'a.mir', content: '' })
      emitter.emit('file:created', { path: 'b.mir' })
      emitter.emit('file:deleted', { path: 'c.mir' })

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).not.toHaveBeenCalled()
      expect(callback3).not.toHaveBeenCalled()
    })
  })
})

// =============================================================================
// EVENT TYPE TESTS
// =============================================================================

describe('Storage Event Types', () => {
  it('should handle file:created event', () => {
    const callback = vi.fn()
    emitter.on('file:created', callback)

    emitter.emit('file:created', { path: 'new-file.mir' })

    expect(callback).toHaveBeenCalledWith({ path: 'new-file.mir' })
  })

  it('should handle file:changed event', () => {
    const callback = vi.fn()
    emitter.on('file:changed', callback)

    emitter.emit('file:changed', { path: 'file.mir', content: 'Frame "Hello"' })

    expect(callback).toHaveBeenCalledWith({
      path: 'file.mir',
      content: 'Frame "Hello"',
    })
  })

  it('should handle file:deleted event', () => {
    const callback = vi.fn()
    emitter.on('file:deleted', callback)

    emitter.emit('file:deleted', { path: 'deleted.mir' })

    expect(callback).toHaveBeenCalledWith({ path: 'deleted.mir' })
  })

  it('should handle file:renamed event', () => {
    const callback = vi.fn()
    emitter.on('file:renamed', callback)

    emitter.emit('file:renamed', { oldPath: 'old.mir', newPath: 'new.mir' })

    expect(callback).toHaveBeenCalledWith({
      oldPath: 'old.mir',
      newPath: 'new.mir',
    })
  })

  it('should handle folder:created event', () => {
    const callback = vi.fn()
    emitter.on('folder:created', callback)

    emitter.emit('folder:created', { path: 'components' })

    expect(callback).toHaveBeenCalledWith({ path: 'components' })
  })

  it('should handle folder:deleted event', () => {
    const callback = vi.fn()
    emitter.on('folder:deleted', callback)

    emitter.emit('folder:deleted', { path: 'old-folder' })

    expect(callback).toHaveBeenCalledWith({ path: 'old-folder' })
  })

  it('should handle tree:changed event', () => {
    const callback = vi.fn()
    emitter.on('tree:changed', callback)

    const tree = [
      { type: 'file' as const, name: 'index.mir', path: 'index.mir' },
    ]
    emitter.emit('tree:changed', { tree })

    expect(callback).toHaveBeenCalledWith({ tree })
  })

  it('should handle project:opened event', () => {
    const callback = vi.fn()
    emitter.on('project:opened', callback)

    const project = { id: '123', name: 'My Project' }
    emitter.emit('project:opened', { project })

    expect(callback).toHaveBeenCalledWith({ project })
  })

  it('should handle project:closed event', () => {
    const callback = vi.fn()
    emitter.on('project:closed', callback)

    emitter.emit('project:closed', {})

    expect(callback).toHaveBeenCalledWith({})
  })

  it('should handle error event', () => {
    const callback = vi.fn()
    emitter.on('error', callback)

    const error = new Error('Test error')
    emitter.emit('error', {
      error,
      operation: 'readFile',
      path: 'test.mir',
      recoverable: true,
    })

    expect(callback).toHaveBeenCalledWith({
      error,
      operation: 'readFile',
      path: 'test.mir',
      recoverable: true,
    })
  })
})
