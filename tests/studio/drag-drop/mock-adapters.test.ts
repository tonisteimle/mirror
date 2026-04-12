/**
 * Mock Adapters Tests
 *
 * Verifies that all mock adapters work correctly for testing.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import {
  createMockLayoutPort,
  createMockStylePort,
  createMockEventPort,
  createMockVisualPort,
  createMockExecutionPort,
  createMockTargetDetectionPort,
  createMockPorts,
} from '../../../studio/drag-drop/system/adapters/mock-adapters'
import type { DragSource, DropTarget, DropResult, Rect, VisualHint } from '../../../studio/drag-drop/types'

// ============================================
// Test Data
// ============================================

const mockRect: Rect = { x: 100, y: 100, width: 200, height: 50 }

const mockSource: DragSource = {
  type: 'palette',
  componentName: 'Frame',
}

const mockElement = {} as HTMLElement

const mockTarget: DropTarget = {
  nodeId: 'target-1',
  element: mockElement,
  layoutType: 'flex',
  direction: 'vertical',
  hasChildren: true,
  isPositioned: false,
}

const mockResult: DropResult = {
  target: mockTarget,
  placement: 'after',
  targetId: 'child-1',
  insertionIndex: 2,
}

const mockHint: VisualHint = {
  type: 'line',
  rect: mockRect,
  direction: 'horizontal',
}

// ============================================
// Layout Port Tests
// ============================================

describe('MockLayoutPort', () => {
  it('returns null for unknown nodeId', () => {
    const port = createMockLayoutPort()
    expect(port.getRect('unknown')).toBeNull()
  })

  it('returns set rect for known nodeId', () => {
    const port = createMockLayoutPort()
    port.setRect('node-1', mockRect)
    expect(port.getRect('node-1')).toEqual(mockRect)
  })

  it('returns empty array for unknown parent', () => {
    const port = createMockLayoutPort()
    expect(port.getChildRects(mockElement)).toEqual([])
  })

  it('returns set child rects', () => {
    const port = createMockLayoutPort()
    const childRects = [{ nodeId: 'child-1', rect: mockRect }]
    port.setChildRects(mockElement, childRects)
    expect(port.getChildRects(mockElement)).toEqual(childRects)
  })

  it('returns null for unknown container', () => {
    const port = createMockLayoutPort()
    expect(port.getContainerRect(mockElement)).toBeNull()
  })

  it('returns set container rect', () => {
    const port = createMockLayoutPort()
    port.setContainerRect(mockElement, mockRect)
    expect(port.getContainerRect(mockElement)).toEqual(mockRect)
  })

  it('can be initialized with config', () => {
    const rects = new Map([['node-1', mockRect]])
    const port = createMockLayoutPort({ rects })
    expect(port.getRect('node-1')).toEqual(mockRect)
  })
})

// ============================================
// Style Port Tests
// ============================================

describe('MockStylePort', () => {
  it('returns "none" as default layout type', () => {
    const port = createMockStylePort()
    expect(port.getLayoutType(mockElement)).toBe('none')
  })

  it('returns set layout type', () => {
    const port = createMockStylePort()
    port.setLayoutType(mockElement, 'flex')
    expect(port.getLayoutType(mockElement)).toBe('flex')
  })

  it('returns "horizontal" as default direction', () => {
    const port = createMockStylePort()
    expect(port.getDirection(mockElement)).toBe('horizontal')
  })

  it('returns set direction', () => {
    const port = createMockStylePort()
    port.setDirection(mockElement, 'vertical')
    expect(port.getDirection(mockElement)).toBe('vertical')
  })

  it('returns null by default for elementFromPoint', () => {
    const port = createMockStylePort()
    expect(port.elementFromPoint(100, 100)).toBeNull()
  })

  it('returns set element for elementFromPoint', () => {
    const port = createMockStylePort()
    port.setElementAtPoint(mockElement)
    expect(port.elementFromPoint(100, 100)).toBe(mockElement)
  })

  it('returns mock CSSStyleDeclaration', () => {
    const port = createMockStylePort()
    const style = port.getComputedStyle(mockElement)
    expect(style.display).toBe('flex')
  })
})

// ============================================
// Event Port Tests
// ============================================

describe('MockEventPort', () => {
  it('registers and calls dragStart handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onDragStart(handler)

    port.simulateDragStart(mockSource, { x: 100, y: 100 })

    expect(handler).toHaveBeenCalledWith(mockSource, { x: 100, y: 100 })
  })

  it('registers and calls dragMove handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onDragMove(handler)

    port.simulateDragMove({ x: 200, y: 200 })

    expect(handler).toHaveBeenCalledWith({ x: 200, y: 200 })
  })

  it('registers and calls dragEnd handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onDragEnd(handler)

    port.simulateDragEnd()

    expect(handler).toHaveBeenCalled()
  })

  it('registers and calls dragCancel handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onDragCancel(handler)

    port.simulateDragCancel()

    expect(handler).toHaveBeenCalled()
  })

  it('registers and calls keyDown handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onKeyDown('Alt', handler)

    port.simulateKeyDown('Alt')

    expect(handler).toHaveBeenCalled()
  })

  it('registers and calls keyUp handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    port.onKeyUp('Alt', handler)

    port.simulateKeyUp('Alt')

    expect(handler).toHaveBeenCalled()
  })

  it('cleanup removes handlers', () => {
    const port = createMockEventPort()
    const handler = vi.fn()
    const cleanup = port.onDragStart(handler)

    cleanup()
    port.simulateDragStart(mockSource, { x: 100, y: 100 })

    expect(handler).not.toHaveBeenCalled()
  })

  it('exposes handlers for assertions', () => {
    const port = createMockEventPort()
    port.onDragStart(() => {})
    port.onDragMove(() => {})
    port.onKeyDown('Alt', () => {})

    const handlers = port.getHandlers()
    expect(handlers.dragStart).toHaveLength(1)
    expect(handlers.dragMove).toHaveLength(1)
    expect(handlers.keyDown.get('Alt')).toHaveLength(1)
  })
})

// ============================================
// Visual Port Tests
// ============================================

describe('MockVisualPort', () => {
  it('starts with hidden state', () => {
    const port = createMockVisualPort()
    const state = port.getState()
    expect(state.isHidden).toBe(true)
    expect(state.indicatorHint).toBeNull()
    expect(state.outlineRect).toBeNull()
  })

  it('showIndicator updates state', () => {
    const port = createMockVisualPort()
    port.showIndicator(mockHint)

    const state = port.getState()
    expect(state.isHidden).toBe(false)
    expect(state.indicatorHint).toEqual(mockHint)
  })

  it('showOutline updates state', () => {
    const port = createMockVisualPort()
    port.showOutline(mockRect)

    const state = port.getState()
    expect(state.outlineRect).toEqual(mockRect)
  })

  it('hideAll clears all state', () => {
    const port = createMockVisualPort()
    port.showIndicator(mockHint)
    port.showOutline(mockRect)

    port.hideAll()

    const state = port.getState()
    expect(state.isHidden).toBe(true)
    expect(state.indicatorHint).toBeNull()
    expect(state.outlineRect).toBeNull()
  })

  it('reset clears state', () => {
    const port = createMockVisualPort()
    port.showIndicator(mockHint)
    port.reset()

    const state = port.getState()
    expect(state.isHidden).toBe(true)
    expect(state.indicatorHint).toBeNull()
  })
})

// ============================================
// Execution Port Tests
// ============================================

describe('MockExecutionPort', () => {
  it('returns success by default', () => {
    const port = createMockExecutionPort()
    const result = port.execute(mockSource, mockResult, false)
    expect(result.success).toBe(true)
  })

  it('records execution calls', () => {
    const port = createMockExecutionPort()
    port.execute(mockSource, mockResult, false)
    port.execute(mockSource, mockResult, true)

    const calls = port.getCalls()
    expect(calls).toHaveLength(2)
    expect(calls[0].type).toBe('execute')
    expect(calls[1].type).toBe('duplicate')
  })

  it('canDuplicate returns true by default', () => {
    const port = createMockExecutionPort()
    expect(port.canDuplicate(mockSource)).toBe(true)
  })

  it('setExecuteResult changes return value', () => {
    const port = createMockExecutionPort()
    port.setExecuteResult({ success: false, error: 'Test error' })

    const result = port.execute(mockSource, mockResult, false)
    expect(result.success).toBe(false)
    expect(result.error).toBe('Test error')
  })

  it('setCanDuplicate changes return value', () => {
    const port = createMockExecutionPort()
    port.setCanDuplicate(false)
    expect(port.canDuplicate(mockSource)).toBe(false)
  })

  it('reset clears calls', () => {
    const port = createMockExecutionPort()
    port.execute(mockSource, mockResult, false)
    port.reset()

    expect(port.getCalls()).toHaveLength(0)
  })
})

// ============================================
// Target Detection Port Tests
// ============================================

describe('MockTargetDetectionPort', () => {
  it('returns null for target by default', () => {
    const port = createMockTargetDetectionPort()
    expect(port.findTarget({ x: 100, y: 100 }, mockSource)).toBeNull()
  })

  it('returns set target', () => {
    const port = createMockTargetDetectionPort()
    port.setTarget(mockTarget)
    expect(port.findTarget({ x: 100, y: 100 }, mockSource)).toEqual(mockTarget)
  })

  it('calculateResult returns default result', () => {
    const port = createMockTargetDetectionPort()
    const result = port.calculateResult(
      { x: 100, y: 100 },
      mockTarget,
      mockSource,
      [],
      mockRect
    )
    expect(result.target).toEqual(mockTarget)
    expect(result.placement).toBe('inside')
  })

  it('setResult changes calculateResult return', () => {
    const port = createMockTargetDetectionPort()
    port.setResult(mockResult)

    const result = port.calculateResult(
      { x: 100, y: 100 },
      mockTarget,
      mockSource,
      [],
      mockRect
    )
    expect(result).toEqual(mockResult)
  })

  it('getVisualHint returns null by default', () => {
    const port = createMockTargetDetectionPort()
    expect(port.getVisualHint(mockResult, [], mockRect)).toBeNull()
  })

  it('setVisualHint changes return', () => {
    const port = createMockTargetDetectionPort()
    port.setVisualHint(mockHint)
    expect(port.getVisualHint(mockResult, [], mockRect)).toEqual(mockHint)
  })
})

// ============================================
// Combined Mock Ports Tests
// ============================================

describe('createMockPorts', () => {
  it('creates all ports', () => {
    const ports = createMockPorts()

    expect(ports.layout).toBeDefined()
    expect(ports.style).toBeDefined()
    expect(ports.events).toBeDefined()
    expect(ports.visual).toBeDefined()
    expect(ports.execution).toBeDefined()
    expect(ports.targetDetection).toBeDefined()
  })

  it('all ports are functional', () => {
    const ports = createMockPorts()

    // Layout
    ports.layout.setRect('test', mockRect)
    expect(ports.layout.getRect('test')).toEqual(mockRect)

    // Style
    ports.style.setLayoutType(mockElement, 'positioned')
    expect(ports.style.getLayoutType(mockElement)).toBe('positioned')

    // Events
    const handler = vi.fn()
    ports.events.onDragStart(handler)
    ports.events.simulateDragStart(mockSource, { x: 0, y: 0 })
    expect(handler).toHaveBeenCalled()

    // Visual
    ports.visual.showIndicator(mockHint)
    expect(ports.visual.getState().indicatorHint).toEqual(mockHint)

    // Execution
    ports.execution.execute(mockSource, mockResult, false)
    expect(ports.execution.getCalls()).toHaveLength(1)

    // Target Detection
    ports.targetDetection.setTarget(mockTarget)
    expect(ports.targetDetection.findTarget({ x: 0, y: 0 }, mockSource)).toEqual(mockTarget)
  })
})
