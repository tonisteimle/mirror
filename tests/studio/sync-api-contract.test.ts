/**
 * Sync Module API Contract Tests
 *
 * Tests that SyncCoordinator exposes all expected methods.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SyncCoordinator, createSyncCoordinator } from '../../studio/sync/sync-coordinator'

describe('SyncCoordinator API Contract', () => {
  let coordinator: SyncCoordinator

  beforeEach(() => {
    coordinator = createSyncCoordinator()
  })

  describe('required methods', () => {
    it('exposes setSourceMap method', () => {
      expect(typeof coordinator.setSourceMap).toBe('function')
    })

    it('exposes setTargets method', () => {
      expect(typeof coordinator.setTargets).toBe('function')
    })

    it('exposes handleCursorMove method', () => {
      expect(typeof coordinator.handleCursorMove).toBe('function')
    })

    it('exposes handlePreviewClick method', () => {
      expect(typeof coordinator.handlePreviewClick).toBe('function')
    })

    it('exposes handleSelectionChange method', () => {
      expect(typeof coordinator.handleSelectionChange).toBe('function')
    })

    it('exposes clearSelection method', () => {
      expect(typeof coordinator.clearSelection).toBe('function')
    })

    it('exposes lineOffset property', () => {
      expect(coordinator.lineOffset).toBeDefined()
    })
  })

  describe('method behavior without dependencies', () => {
    it('handleCursorMove does not throw without sourceMap', () => {
      expect(() => {
        coordinator.handleCursorMove(5)
      }).not.toThrow()
    })

    it('handlePreviewClick does not throw without sourceMap', () => {
      expect(() => {
        coordinator.handlePreviewClick('node-1')
      }).not.toThrow()
    })

    it('handleSelectionChange does not throw without sourceMap', () => {
      expect(() => {
        coordinator.handleSelectionChange('node-1', 'preview')
      }).not.toThrow()
    })

    it('clearSelection does not throw', () => {
      expect(() => {
        coordinator.clearSelection('editor')
      }).not.toThrow()
    })
  })

  describe('setSourceMap integration', () => {
    it('accepts mock sourceMap object', () => {
      const mockSourceMap = {
        getNodeById: vi.fn(),
        getNodeAtLine: vi.fn(),
        getAllNodes: vi.fn().mockReturnValue([]),
      }

      expect(() => {
        coordinator.setSourceMap(mockSourceMap as any)
      }).not.toThrow()
    })

    it('accepts null sourceMap', () => {
      expect(() => {
        coordinator.setSourceMap(null)
      }).not.toThrow()
    })
  })

  describe('setTargets integration', () => {
    it('accepts target callbacks', () => {
      expect(() => {
        coordinator.setTargets({
          scrollEditorToLine: vi.fn(),
          highlightPreviewElement: vi.fn(),
          updatePropertyPanel: vi.fn(),
        })
      }).not.toThrow()
    })

    it('accepts partial targets', () => {
      expect(() => {
        coordinator.setTargets({
          scrollEditorToLine: vi.fn(),
        })
      }).not.toThrow()
    })

    it('accepts empty targets', () => {
      expect(() => {
        coordinator.setTargets({})
      }).not.toThrow()
    })
  })

  describe('lineOffset service', () => {
    it('lineOffset has getOffset method', () => {
      expect(typeof coordinator.lineOffset.getOffset).toBe('function')
    })

    it('lineOffset has setOffset method', () => {
      expect(typeof coordinator.lineOffset.setOffset).toBe('function')
    })

    it('lineOffset has editorToSourceMap method', () => {
      expect(typeof coordinator.lineOffset.editorToSourceMap).toBe('function')
    })

    it('lineOffset has sourceMapToEditor method', () => {
      expect(typeof coordinator.lineOffset.sourceMapToEditor).toBe('function')
    })
  })

  describe('cursor sync debouncing', () => {
    it('accepts cursorDebounce option', () => {
      const coordinator = createSyncCoordinator({ cursorDebounce: 50 })
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
    })

    it('accepts debug option', () => {
      const coordinator = createSyncCoordinator({ debug: true })
      expect(coordinator).toBeInstanceOf(SyncCoordinator)
    })
  })
})

describe('SyncCoordinator Factory', () => {
  it('createSyncCoordinator returns SyncCoordinator instance', () => {
    const coordinator = createSyncCoordinator()
    expect(coordinator).toBeInstanceOf(SyncCoordinator)
  })

  it('each call creates new instance', () => {
    const c1 = createSyncCoordinator()
    const c2 = createSyncCoordinator()
    expect(c1).not.toBe(c2)
  })

  it('accepts options', () => {
    const coordinator = createSyncCoordinator({
      cursorDebounce: 100,
      debug: false,
    })
    expect(coordinator).toBeInstanceOf(SyncCoordinator)
  })
})
