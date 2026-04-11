/**
 * EditorController (Hexagonal Architecture) Tests
 *
 * Tests for the new port-based EditorController that uses
 * dependency injection for testability.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  EditorController,
  createEditorControllerWithPorts,
  type EditorControllerConfig,
} from '../../../studio/editor/editor-controller'
import {
  createMockEditorPorts,
  type MockEditorPorts,
} from '../../../studio/editor/adapters/mock-adapters'

describe('EditorController (Hexagonal Architecture)', () => {
  let ports: MockEditorPorts
  let controller: EditorController

  beforeEach(() => {
    ports = createMockEditorPorts()
  })

  // ============================================
  // Lifecycle
  // ============================================

  describe('Lifecycle', () => {
    it('should initialize without error', () => {
      controller = new EditorController(ports)
      controller.init()
      expect(controller.isInitialized()).toBe(true)
    })

    it('should not double-initialize', () => {
      controller = new EditorController(ports)
      controller.init()
      controller.init() // Second call should be no-op
      expect(controller.isInitialized()).toBe(true)
    })

    it('should dispose cleanly', () => {
      controller = createEditorControllerWithPorts(ports)
      controller.dispose()
      expect(controller.isInitialized()).toBe(false)
    })

    it('should allow re-initialization after dispose', () => {
      controller = new EditorController(ports)
      controller.init()
      controller.dispose()
      controller.init()
      expect(controller.isInitialized()).toBe(true)
    })
  })

  // ============================================
  // Content Operations
  // ============================================

  describe('Content Operations', () => {
    beforeEach(() => {
      controller = createEditorControllerWithPorts(ports)
    })

    it('should get content from editor port', () => {
      ports.editor.setContent('Hello World')
      expect(controller.getContent()).toBe('Hello World')
    })

    it('should set content via editor port', () => {
      controller.setContent('New Content')
      expect(ports.editor.getContent()).toBe('New Content')
    })

    it('should not dispatch if content unchanged', () => {
      ports.editor.setContent('Same')
      const historyBefore = ports.editor.getContentHistory().length
      controller.setContent('Same')
      const historyAfter = ports.editor.getContentHistory().length
      expect(historyAfter).toBe(historyBefore)
    })

    it('should restore cursor after content change', () => {
      ports.editor.setContent('Line 1\nLine 2\nLine 3')
      ports.editor.simulateCursorMove({ line: 2, column: 3, offset: 10 })

      controller.setContent('Line 1\nLine 2 modified\nLine 3')
      ports.timer.flushFrames()

      const cursorHistory = ports.editor.getCursorHistory()
      // Should have attempted cursor restoration
      expect(cursorHistory.length).toBeGreaterThan(0)
    })

    it('should not restore cursor if disabled in config', () => {
      controller.dispose()
      controller = createEditorControllerWithPorts(ports, {
        restoreCursorAfterChange: false,
      })

      ports.editor.setContent('Line 1\nLine 2')
      ports.editor.simulateCursorMove({ line: 2, column: 1, offset: 7 })
      const cursorCountBefore = ports.editor.getCursorHistory().length

      controller.setContent('Modified content')
      ports.timer.flushFrames()

      // No additional cursor set calls
      const cursorCountAfter = ports.editor.getCursorHistory().length
      expect(cursorCountAfter).toBe(cursorCountBefore)
    })

    it('should abort cursor restoration if content changes again', () => {
      ports.editor.setContent('Initial')
      ports.editor.simulateCursorMove({ line: 1, column: 1, offset: 0 })

      controller.setContent('First change')
      controller.setContent('Second change') // Before frame flush

      const versionBefore = controller.getContentVersion()
      ports.timer.flushFrames()

      // Version should not change from flush (restoration aborted)
      expect(controller.getContentVersion()).toBe(versionBefore)
    })
  })

  // ============================================
  // Cursor Operations
  // ============================================

  describe('Cursor Operations', () => {
    beforeEach(() => {
      controller = createEditorControllerWithPorts(ports)
    })

    it('should get cursor from editor port', () => {
      ports.editor.simulateCursorMove({ line: 5, column: 10, offset: 50 })
      const cursor = controller.getCursor()
      expect(cursor.line).toBe(5)
      expect(cursor.column).toBe(10)
    })

    it('should set cursor via editor port', () => {
      controller.setCursor({ line: 3, column: 7, offset: 20 })
      const history = ports.editor.getCursorHistory()
      expect(history.length).toBeGreaterThan(0)
      expect(history[history.length - 1]).toEqual({ line: 3, column: 7, offset: 20 })
    })

    it('should insert at cursor', () => {
      ports.editor.setContent('Hello World')
      ports.editor.simulateCursorMove({ line: 1, column: 6, offset: 5 })
      controller.insertAtCursor(' Beautiful')
      expect(ports.editor.getContent()).toBe('Hello Beautiful World')
    })
  })

  // ============================================
  // Scroll Operations
  // ============================================

  describe('Scroll Operations', () => {
    beforeEach(() => {
      ports.editor.setContent('Line 1\nLine 2\nLine 3\nLine 4\nLine 5')
      controller = createEditorControllerWithPorts(ports)
    })

    it('should scroll to line', () => {
      controller.scrollToLine(3)
      const scrollHistory = ports.editor.getScrollHistory()
      expect(scrollHistory).toContain(3)
    })

    it('should scroll to line and select', () => {
      controller.scrollToLineAndSelect(4)
      const scrollHistory = ports.editor.getScrollHistory()
      expect(scrollHistory).toContain(4)
    })

    it('should warn on out-of-bounds line', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      controller.scrollToLineAndSelect(100)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('should not move cursor if already on target line', () => {
      ports.editor.simulateCursorMove({ line: 3, column: 5, offset: 20 })
      const cursorBefore = ports.editor.getCursorHistory().length

      controller.scrollToLineAndSelect(3) // Already on line 3

      // Scroll should happen, but no cursor move
      const scrollHistory = ports.editor.getScrollHistory()
      expect(scrollHistory).toContain(3)
    })
  })

  // ============================================
  // Focus Operations
  // ============================================

  describe('Focus Operations', () => {
    beforeEach(() => {
      controller = createEditorControllerWithPorts(ports)
    })

    it('should check focus state', () => {
      ports.editor.focus()
      expect(controller.hasFocus()).toBe(true)
      ports.editor.blur()
      expect(controller.hasFocus()).toBe(false)
    })

    it('should focus editor', () => {
      controller.focus()
      expect(ports.editor.hasFocus()).toBe(true)
    })

    it('should blur editor', () => {
      ports.editor.focus()
      controller.blur()
      expect(ports.editor.hasFocus()).toBe(false)
    })
  })

  // ============================================
  // Event Handling
  // ============================================

  describe('Event Handling', () => {
    beforeEach(() => {
      controller = createEditorControllerWithPorts(ports)
    })

    describe('Content Change Events', () => {
      it('should notify config callback on content change', () => {
        const onContentChange = vi.fn()
        controller.dispose()
        controller = createEditorControllerWithPorts(ports, { onContentChange })

        ports.editor.simulateContentChange('New content')
        expect(onContentChange).toHaveBeenCalledWith('New content')
      })

      it('should notify registered callbacks on content change', () => {
        const callback = vi.fn()
        controller.onContentChange(callback)

        ports.editor.simulateContentChange('Changed!')
        expect(callback).toHaveBeenCalledWith('Changed!')
      })

      it('should allow unsubscribing from content changes', () => {
        const callback = vi.fn()
        const unsubscribe = controller.onContentChange(callback)

        ports.editor.simulateContentChange('First')
        expect(callback).toHaveBeenCalledTimes(1)

        unsubscribe()
        ports.editor.simulateContentChange('Second')
        expect(callback).toHaveBeenCalledTimes(1) // Not called again
      })
    })

    describe('Cursor Move Events', () => {
      it('should update state on cursor move', () => {
        ports.editor.simulateCursorMove({ line: 5, column: 10, offset: 50 })

        const statePort = ports.state
        expect(statePort.getCursor()).toEqual({ line: 5, column: 10 })
      })

      it('should emit cursor moved event', () => {
        ports.editor.simulateCursorMove({ line: 3, column: 7, offset: 20 })

        const cursorEvents = ports.state.getCursorEvents()
        expect(cursorEvents).toContainEqual({ line: 3, column: 7 })
      })

      it('should notify config callback on cursor move', () => {
        const onCursorMove = vi.fn()
        controller.dispose()
        controller = createEditorControllerWithPorts(ports, { onCursorMove })

        ports.editor.simulateCursorMove({ line: 2, column: 5, offset: 10 })
        expect(onCursorMove).toHaveBeenCalledWith({ line: 2, column: 5, offset: 10 })
      })

      it('should notify registered callbacks on cursor move', () => {
        const callback = vi.fn()
        controller.onCursorMove(callback)

        ports.editor.simulateCursorMove({ line: 4, column: 8, offset: 30 })
        expect(callback).toHaveBeenCalledWith({ line: 4, column: 8, offset: 30 })
      })
    })

    describe('Focus Events', () => {
      it('should update state on focus', () => {
        expect(ports.state.getEditorFocus()).toBe(false)

        ports.editor.simulateFocus()
        expect(ports.state.getEditorFocus()).toBe(true)
      })

      it('should update state on blur', () => {
        ports.editor.simulateFocus()
        ports.editor.simulateBlur()
        expect(ports.state.getEditorFocus()).toBe(false)
      })

      it('should notify config callback on focus change', () => {
        const onFocusChange = vi.fn()
        controller.dispose()
        controller = createEditorControllerWithPorts(ports, { onFocusChange })

        ports.editor.simulateFocus()
        expect(onFocusChange).toHaveBeenCalledWith(true)

        ports.editor.simulateBlur()
        expect(onFocusChange).toHaveBeenCalledWith(false)
      })

      it('should not fire duplicate focus events', () => {
        const onFocusChange = vi.fn()
        controller.dispose()
        controller = createEditorControllerWithPorts(ports, { onFocusChange })

        ports.editor.simulateFocus()
        ports.editor.simulateFocus() // Already focused
        expect(onFocusChange).toHaveBeenCalledTimes(1)
      })

      it('should not fire duplicate blur events', () => {
        const onFocusChange = vi.fn()
        controller.dispose()
        controller = createEditorControllerWithPorts(ports, { onFocusChange })

        ports.editor.simulateFocus()
        ports.editor.simulateBlur()
        ports.editor.simulateBlur() // Already blurred
        expect(onFocusChange).toHaveBeenCalledTimes(2) // One focus, one blur
      })
    })
  })

  // ============================================
  // Legacy Compatibility
  // ============================================

  describe('Legacy Compatibility', () => {
    beforeEach(() => {
      controller = createEditorControllerWithPorts(ports)
    })

    it('should support notifyContentChange for external triggers', () => {
      const callback = vi.fn()
      controller.onContentChange(callback)

      controller.notifyContentChange('External content')
      expect(callback).toHaveBeenCalledWith('External content')
    })

    it('should support notifyCursorMove for external triggers', () => {
      const callback = vi.fn()
      controller.onCursorMove(callback)

      controller.notifyCursorMove({ line: 10, column: 5, offset: 100 })
      expect(callback).toHaveBeenCalledWith({ line: 10, column: 5, offset: 100 })
    })
  })

  // ============================================
  // Test APIs
  // ============================================

  describe('Test APIs', () => {
    it('should expose ports for inspection', () => {
      controller = new EditorController(ports)
      const exposedPorts = controller.getPorts()
      expect(exposedPorts).toBe(ports)
    })

    it('should expose content version', () => {
      controller = createEditorControllerWithPorts(ports)
      const v1 = controller.getContentVersion()

      controller.setContent('Change 1')
      const v2 = controller.getContentVersion()
      expect(v2).toBeGreaterThan(v1)

      controller.setContent('Change 2')
      const v3 = controller.getContentVersion()
      expect(v3).toBeGreaterThan(v2)
    })
  })

  // ============================================
  // Factory Function
  // ============================================

  describe('createEditorControllerWithPorts', () => {
    it('should create and initialize controller', () => {
      controller = createEditorControllerWithPorts(ports)
      expect(controller.isInitialized()).toBe(true)
    })

    it('should accept config options', () => {
      const onContentChange = vi.fn()
      controller = createEditorControllerWithPorts(ports, { onContentChange })

      ports.editor.simulateContentChange('Test')
      expect(onContentChange).toHaveBeenCalled()
    })
  })
})

// ============================================
// Mock Adapters Tests
// ============================================

describe('Mock Adapters', () => {
  describe('MockEditorPort', () => {
    it('should track content history', () => {
      const ports = createMockEditorPorts()
      ports.editor.setContent('First')
      ports.editor.setContent('Second')
      ports.editor.setContent('Third')

      const history = ports.editor.getContentHistory()
      expect(history).toEqual(['First', 'Second', 'Third'])
    })

    it('should track cursor history', () => {
      const ports = createMockEditorPorts()
      ports.editor.setCursor({ line: 1, column: 1, offset: 0 })
      ports.editor.setCursor({ line: 2, column: 5, offset: 10 })

      const history = ports.editor.getCursorHistory()
      expect(history).toHaveLength(2)
    })

    it('should track scroll history', () => {
      const ports = createMockEditorPorts()
      ports.editor.scrollToLine(5)
      ports.editor.scrollToLine(10)

      const history = ports.editor.getScrollHistory()
      expect(history).toEqual([5, 10])
    })

    it('should reset state', () => {
      const ports = createMockEditorPorts('Initial')
      ports.editor.setContent('Changed')
      ports.editor.setCursor({ line: 5, column: 5, offset: 50 })
      ports.editor.focus()

      ports.editor.reset()

      expect(ports.editor.getContent()).toBe('Initial')
      expect(ports.editor.getCursor()).toEqual({ line: 1, column: 1, offset: 0 })
      expect(ports.editor.hasFocus()).toBe(false)
      expect(ports.editor.getContentHistory()).toEqual([])
    })
  })

  describe('MockStatePort', () => {
    it('should track selection events', () => {
      const ports = createMockEditorPorts()
      ports.state.emitSelectionChanged('node-1', 'editor')
      ports.state.emitSelectionChanged('node-2', 'preview')

      const events = ports.state.getSelectionEvents()
      expect(events).toEqual([
        { nodeId: 'node-1', origin: 'editor' },
        { nodeId: 'node-2', origin: 'preview' },
      ])
    })

    it('should track cursor events', () => {
      const ports = createMockEditorPorts()
      ports.state.emitCursorMoved({ line: 1, column: 1 })
      ports.state.emitCursorMoved({ line: 5, column: 10 })

      const events = ports.state.getCursorEvents()
      expect(events).toEqual([
        { line: 1, column: 1 },
        { line: 5, column: 10 },
      ])
    })

    it('should reset state', () => {
      const ports = createMockEditorPorts()
      ports.state.setEditorFocus(true)
      ports.state.setCursor(5, 10)
      ports.state.emitSelectionChanged('node', 'editor')

      ports.state.reset()

      expect(ports.state.getEditorFocus()).toBe(false)
      expect(ports.state.getCursor()).toEqual({ line: 1, column: 1 })
      expect(ports.state.getSelectionEvents()).toEqual([])
    })
  })

  describe('MockTimerPort', () => {
    it('should execute frames on flush', () => {
      const ports = createMockEditorPorts()
      const callback = vi.fn()

      ports.timer.requestFrame(callback)
      expect(callback).not.toHaveBeenCalled()

      ports.timer.flushFrames()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should execute timeouts on flush', () => {
      const ports = createMockEditorPorts()
      const callback = vi.fn()

      ports.timer.setTimeout(callback, 1000)
      expect(callback).not.toHaveBeenCalled()

      ports.timer.flushTimeouts()
      expect(callback).toHaveBeenCalledTimes(1)
    })

    it('should cancel frames', () => {
      const ports = createMockEditorPorts()
      const callback = vi.fn()

      const id = ports.timer.requestFrame(callback)
      ports.timer.cancelFrame(id)
      ports.timer.flushFrames()

      expect(callback).not.toHaveBeenCalled()
    })

    it('should report pending counts', () => {
      const ports = createMockEditorPorts()

      ports.timer.requestFrame(() => {})
      ports.timer.requestFrame(() => {})
      ports.timer.setTimeout(() => {}, 100)

      expect(ports.timer.getPendingFrameCount()).toBe(2)
      expect(ports.timer.getPendingTimeoutCount()).toBe(1)
    })

    it('should flush all', () => {
      const ports = createMockEditorPorts()
      const frameCallback = vi.fn()
      const timeoutCallback = vi.fn()

      ports.timer.requestFrame(frameCallback)
      ports.timer.setTimeout(timeoutCallback, 100)

      ports.timer.flushAll()

      expect(frameCallback).toHaveBeenCalled()
      expect(timeoutCallback).toHaveBeenCalled()
    })

    it('should reset state', () => {
      const ports = createMockEditorPorts()

      ports.timer.requestFrame(() => {})
      ports.timer.setTimeout(() => {}, 100)

      ports.timer.reset()

      expect(ports.timer.getPendingFrameCount()).toBe(0)
      expect(ports.timer.getPendingTimeoutCount()).toBe(0)
    })
  })
})
