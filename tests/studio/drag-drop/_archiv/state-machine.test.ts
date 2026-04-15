/**
 * Drag & Drop State Machine Tests
 *
 * Tests für die pure State Machine - kein DOM, keine Side Effects.
 * Alle Tests sind synchron und deterministisch.
 */

import { describe, it, expect } from 'vitest'
import {
  transition,
  initialState,
  initialContext,
  isIdle,
  isDragging,
  isOverTarget,
  isDropped,
  getSource,
  getTarget,
  getResult,
  getCursor,
  canDrop,
  type DragState,
  type DragContext,
  type DragEvent,
} from '../../../studio/drag-drop/system/state-machine'

// ============================================
// Test Fixtures
// ============================================

const mockSource = {
  type: 'palette' as const,
  componentName: 'Button',
}

const mockCanvasSource = {
  type: 'canvas' as const,
  nodeId: 'node-1',
}

const mockTarget = {
  nodeId: 'target-1',
  element: {} as HTMLElement,
  layoutType: 'flex' as const,
  direction: 'vertical' as const,
  hasChildren: true,
  isPositioned: false,
}

const mockResult = {
  target: mockTarget,
  placement: 'after' as const,
  targetId: 'child-1',
  insertionIndex: 2,
}

const mockChildRects = [
  { nodeId: 'child-1', rect: { x: 0, y: 0, width: 100, height: 50 } },
  { nodeId: 'child-2', rect: { x: 0, y: 50, width: 100, height: 50 } },
]

const mockContainerRect = { x: 0, y: 0, width: 100, height: 100 }

const mockCursor = { x: 50, y: 75 }

// ============================================
// State Transitions: idle
// ============================================

describe('State Machine: idle', () => {
  it('starts in idle state', () => {
    expect(initialState.type).toBe('idle')
    expect(isIdle(initialState)).toBe(true)
  })

  it('transitions to dragging on DRAG_START', () => {
    const event: DragEvent = {
      type: 'DRAG_START',
      source: mockSource,
      cursor: mockCursor,
    }

    const { state, effects } = transition(initialState, event, initialContext)

    expect(state.type).toBe('dragging')
    expect(isDragging(state)).toBe(true)
    if (state.type === 'dragging') {
      expect(state.source).toEqual(mockSource)
      expect(state.cursor).toEqual(mockCursor)
    }
    expect(effects).toContainEqual({ type: 'NOTIFY_DRAG_START', source: mockSource })
  })

  it('ignores DRAG_START when disabled', () => {
    const event: DragEvent = {
      type: 'DRAG_START',
      source: mockSource,
      cursor: mockCursor,
    }
    const disabledContext = { ...initialContext, isDisabled: true }

    const { state } = transition(initialState, event, disabledContext)

    expect(state.type).toBe('idle')
  })

  it('ignores irrelevant events', () => {
    const events: DragEvent[] = [
      { type: 'DRAG_MOVE', cursor: mockCursor },
      { type: 'DRAG_END' },
      { type: 'TARGET_LOST' },
    ]

    for (const event of events) {
      const { state } = transition(initialState, event, initialContext)
      expect(state.type).toBe('idle')
    }
  })
})

// ============================================
// State Transitions: dragging
// ============================================

describe('State Machine: dragging', () => {
  const draggingState: DragState = {
    type: 'dragging',
    source: mockSource,
    cursor: { x: 0, y: 0 },
  }

  it('updates cursor on DRAG_MOVE', () => {
    const event: DragEvent = { type: 'DRAG_MOVE', cursor: mockCursor }

    const { state } = transition(draggingState, event, initialContext)

    expect(state.type).toBe('dragging')
    if (state.type === 'dragging') {
      expect(state.cursor).toEqual(mockCursor)
    }
  })

  it('transitions to over-target on TARGET_FOUND', () => {
    const event: DragEvent = {
      type: 'TARGET_FOUND',
      target: mockTarget,
      result: mockResult,
      childRects: mockChildRects,
      containerRect: mockContainerRect,
    }

    const { state } = transition(draggingState, event, initialContext)

    expect(state.type).toBe('over-target')
    expect(isOverTarget(state)).toBe(true)
    if (state.type === 'over-target') {
      expect(state.target).toEqual(mockTarget)
      expect(state.result).toEqual(mockResult)
      expect(state.childRects).toEqual(mockChildRects)
      expect(state.containerRect).toEqual(mockContainerRect)
    }
  })

  it('transitions to idle on DRAG_END without target', () => {
    const event: DragEvent = { type: 'DRAG_END' }

    const { state, effects } = transition(draggingState, event, initialContext)

    expect(state.type).toBe('idle')
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
    expect(effects).toContainEqual({
      type: 'NOTIFY_DRAG_END',
      source: mockSource,
      success: false,
    })
  })

  it('transitions to idle on DRAG_CANCEL', () => {
    const event: DragEvent = { type: 'DRAG_CANCEL' }

    const { state, effects } = transition(draggingState, event, initialContext)

    expect(state.type).toBe('idle')
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
  })
})

// ============================================
// State Transitions: over-target
// ============================================

describe('State Machine: over-target', () => {
  const overTargetState: DragState = {
    type: 'over-target',
    source: mockSource,
    cursor: mockCursor,
    target: mockTarget,
    result: mockResult,
    childRects: mockChildRects,
    containerRect: mockContainerRect,
  }

  it('updates cursor on DRAG_MOVE', () => {
    const newCursor = { x: 100, y: 100 }
    const event: DragEvent = { type: 'DRAG_MOVE', cursor: newCursor }

    const { state } = transition(overTargetState, event, initialContext)

    expect(state.type).toBe('over-target')
    if (state.type === 'over-target') {
      expect(state.cursor).toEqual(newCursor)
    }
  })

  it('updates target on TARGET_FOUND', () => {
    const newTarget = { ...mockTarget, nodeId: 'target-2' }
    const newResult = { ...mockResult, targetId: 'child-3' }
    const event: DragEvent = {
      type: 'TARGET_FOUND',
      target: newTarget,
      result: newResult,
      childRects: mockChildRects,
      containerRect: mockContainerRect,
    }

    const { state } = transition(overTargetState, event, initialContext)

    expect(state.type).toBe('over-target')
    if (state.type === 'over-target') {
      expect(state.target).toEqual(newTarget)
      expect(state.result).toEqual(newResult)
    }
  })

  it('updates result on TARGET_UPDATED', () => {
    const newResult = { ...mockResult, insertionIndex: 5 }
    const event: DragEvent = { type: 'TARGET_UPDATED', result: newResult }

    const { state } = transition(overTargetState, event, initialContext)

    expect(state.type).toBe('over-target')
    if (state.type === 'over-target') {
      expect(state.result).toEqual(newResult)
    }
  })

  it('transitions to dragging on TARGET_LOST', () => {
    const event: DragEvent = { type: 'TARGET_LOST' }

    const { state, effects } = transition(overTargetState, event, initialContext)

    expect(state.type).toBe('dragging')
    if (state.type === 'dragging') {
      expect(state.source).toEqual(mockSource)
      expect(state.cursor).toEqual(mockCursor)
    }
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
  })

  it('transitions to dropped on DRAG_END', () => {
    const event: DragEvent = { type: 'DRAG_END' }

    const { state, effects } = transition(overTargetState, event, initialContext)

    expect(state.type).toBe('dropped')
    expect(isDropped(state)).toBe(true)
    if (state.type === 'dropped') {
      expect(state.source).toEqual(mockSource)
      expect(state.result).toEqual(mockResult)
    }
    expect(effects).toContainEqual({
      type: 'EXECUTE_DROP',
      source: mockSource,
      result: mockResult,
    })
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
    expect(effects).toContainEqual({
      type: 'NOTIFY_DRAG_END',
      source: mockSource,
      success: true,
    })
  })

  it('transitions to idle on DRAG_CANCEL', () => {
    const event: DragEvent = { type: 'DRAG_CANCEL' }

    const { state, effects } = transition(overTargetState, event, initialContext)

    expect(state.type).toBe('idle')
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
    expect(effects).toContainEqual({
      type: 'NOTIFY_DRAG_END',
      source: mockSource,
      success: false,
    })
  })
})

// ============================================
// State Transitions: dropped
// ============================================

describe('State Machine: dropped', () => {
  const droppedState: DragState = {
    type: 'dropped',
    source: mockSource,
    result: mockResult,
  }

  it('transitions to dragging on new DRAG_START', () => {
    const event: DragEvent = {
      type: 'DRAG_START',
      source: mockCanvasSource,
      cursor: mockCursor,
    }

    const { state, effects } = transition(droppedState, event, initialContext)

    expect(state.type).toBe('dragging')
    if (state.type === 'dragging') {
      expect(state.source).toEqual(mockCanvasSource)
    }
    expect(effects).toContainEqual({ type: 'NOTIFY_DRAG_START', source: mockCanvasSource })
  })

  it('transitions to idle on other events', () => {
    const events: DragEvent[] = [
      { type: 'DRAG_MOVE', cursor: mockCursor },
      { type: 'DRAG_END' },
      { type: 'TARGET_LOST' },
    ]

    for (const event of events) {
      const { state } = transition(droppedState, event, initialContext)
      expect(state.type).toBe('idle')
    }
  })
})

// ============================================
// Context: Alt Key
// ============================================

describe('State Machine: Alt Key', () => {
  it('tracks ALT_KEY_DOWN', () => {
    const event: DragEvent = { type: 'ALT_KEY_DOWN' }

    const { context } = transition(initialState, event, initialContext)

    expect(context.isAltKeyPressed).toBe(true)
  })

  it('tracks ALT_KEY_UP', () => {
    const altDownContext = { ...initialContext, isAltKeyPressed: true }
    const event: DragEvent = { type: 'ALT_KEY_UP' }

    const { context } = transition(initialState, event, altDownContext)

    expect(context.isAltKeyPressed).toBe(false)
  })

  it('preserves Alt key state across transitions', () => {
    let state: DragState = initialState
    let context: DragContext = initialContext

    // Alt key down
    ;({ state, context } = transition(state, { type: 'ALT_KEY_DOWN' }, context))
    expect(context.isAltKeyPressed).toBe(true)

    // Start drag
    ;({ state, context } = transition(
      state,
      { type: 'DRAG_START', source: mockSource, cursor: mockCursor },
      context
    ))
    expect(state.type).toBe('dragging')
    expect(context.isAltKeyPressed).toBe(true)

    // Alt key still tracked in dragging state
    ;({ state, context } = transition(state, { type: 'ALT_KEY_UP' }, context))
    expect(context.isAltKeyPressed).toBe(false)
  })
})

// ============================================
// Context: Disable/Enable
// ============================================

describe('State Machine: Disable/Enable', () => {
  it('cancels active drag on DISABLE', () => {
    const draggingState: DragState = {
      type: 'dragging',
      source: mockSource,
      cursor: mockCursor,
    }
    const event: DragEvent = { type: 'DISABLE' }

    const { state, context, effects } = transition(draggingState, event, initialContext)

    expect(state.type).toBe('idle')
    expect(context.isDisabled).toBe(true)
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
    expect(effects).toContainEqual({
      type: 'NOTIFY_DRAG_END',
      source: mockSource,
      success: false,
    })
  })

  it('sets disabled flag on DISABLE in idle', () => {
    const event: DragEvent = { type: 'DISABLE' }

    const { state, context } = transition(initialState, event, initialContext)

    expect(state.type).toBe('idle')
    expect(context.isDisabled).toBe(true)
  })

  it('clears disabled flag on ENABLE', () => {
    const disabledContext = { ...initialContext, isDisabled: true }
    const event: DragEvent = { type: 'ENABLE' }

    const { context } = transition(initialState, event, disabledContext)

    expect(context.isDisabled).toBe(false)
  })
})

// ============================================
// RESET
// ============================================

describe('State Machine: RESET', () => {
  it('resets from any state to idle', () => {
    const states: DragState[] = [
      { type: 'dragging', source: mockSource, cursor: mockCursor },
      {
        type: 'over-target',
        source: mockSource,
        cursor: mockCursor,
        target: mockTarget,
        result: mockResult,
        childRects: mockChildRects,
        containerRect: mockContainerRect,
      },
      { type: 'dropped', source: mockSource, result: mockResult },
    ]

    for (const fromState of states) {
      const { state, effects } = transition(fromState, { type: 'RESET' }, initialContext)
      expect(state.type).toBe('idle')
      expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
    }
  })

  it('clears Alt key state on RESET', () => {
    const altDownContext = { ...initialContext, isAltKeyPressed: true }

    const { context } = transition(initialState, { type: 'RESET' }, altDownContext)

    expect(context.isAltKeyPressed).toBe(false)
  })
})

// ============================================
// State Queries
// ============================================

describe('State Queries', () => {
  const draggingState: DragState = {
    type: 'dragging',
    source: mockSource,
    cursor: mockCursor,
  }

  const overTargetState: DragState = {
    type: 'over-target',
    source: mockSource,
    cursor: mockCursor,
    target: mockTarget,
    result: mockResult,
    childRects: mockChildRects,
    containerRect: mockContainerRect,
  }

  const droppedState: DragState = {
    type: 'dropped',
    source: mockSource,
    result: mockResult,
  }

  describe('isIdle', () => {
    it('returns true for idle state', () => {
      expect(isIdle(initialState)).toBe(true)
    })

    it('returns false for other states', () => {
      expect(isIdle(draggingState)).toBe(false)
      expect(isIdle(overTargetState)).toBe(false)
      expect(isIdle(droppedState)).toBe(false)
    })
  })

  describe('isDragging', () => {
    it('returns true for dragging and over-target', () => {
      expect(isDragging(draggingState)).toBe(true)
      expect(isDragging(overTargetState)).toBe(true)
    })

    it('returns false for idle and dropped', () => {
      expect(isDragging(initialState)).toBe(false)
      expect(isDragging(droppedState)).toBe(false)
    })
  })

  describe('isOverTarget', () => {
    it('returns true only for over-target state', () => {
      expect(isOverTarget(overTargetState)).toBe(true)
      expect(isOverTarget(initialState)).toBe(false)
      expect(isOverTarget(draggingState)).toBe(false)
      expect(isOverTarget(droppedState)).toBe(false)
    })
  })

  describe('getSource', () => {
    it('returns source for active states', () => {
      expect(getSource(draggingState)).toEqual(mockSource)
      expect(getSource(overTargetState)).toEqual(mockSource)
      expect(getSource(droppedState)).toEqual(mockSource)
    })

    it('returns null for idle', () => {
      expect(getSource(initialState)).toBeNull()
    })
  })

  describe('getTarget', () => {
    it('returns target for over-target state', () => {
      expect(getTarget(overTargetState)).toEqual(mockTarget)
    })

    it('returns null for other states', () => {
      expect(getTarget(initialState)).toBeNull()
      expect(getTarget(draggingState)).toBeNull()
      expect(getTarget(droppedState)).toBeNull()
    })
  })

  describe('getResult', () => {
    it('returns result for over-target and dropped', () => {
      expect(getResult(overTargetState)).toEqual(mockResult)
      expect(getResult(droppedState)).toEqual(mockResult)
    })

    it('returns null for idle and dragging', () => {
      expect(getResult(initialState)).toBeNull()
      expect(getResult(draggingState)).toBeNull()
    })
  })

  describe('getCursor', () => {
    it('returns cursor for dragging and over-target', () => {
      expect(getCursor(draggingState)).toEqual(mockCursor)
      expect(getCursor(overTargetState)).toEqual(mockCursor)
    })

    it('returns null for idle and dropped', () => {
      expect(getCursor(initialState)).toBeNull()
      expect(getCursor(droppedState)).toBeNull()
    })
  })

  describe('canDrop', () => {
    it('returns true for over-target without isNoOp', () => {
      expect(canDrop(overTargetState)).toBe(true)
    })

    it('returns false when isNoOp is true', () => {
      const noOpState: DragState = {
        ...overTargetState,
        result: { ...mockResult, isNoOp: true },
      }
      expect(canDrop(noOpState)).toBe(false)
    })

    it('returns false for other states', () => {
      expect(canDrop(initialState)).toBe(false)
      expect(canDrop(draggingState)).toBe(false)
      expect(canDrop(droppedState)).toBe(false)
    })
  })
})

// ============================================
// Full Drag Sequence
// ============================================

describe('Full Drag Sequence', () => {
  it('completes a successful drag and drop', () => {
    let state: DragState = initialState
    let context: DragContext = initialContext
    let effects: any[]

      // 1. Start drag
    ;({ state, context, effects } = transition(
      state,
      { type: 'DRAG_START', source: mockSource, cursor: { x: 0, y: 0 } },
      context
    ))
    expect(state.type).toBe('dragging')
    expect(effects).toHaveLength(1)
    expect(effects[0].type).toBe('NOTIFY_DRAG_START')

    // 2. Move cursor
    ;({ state, context, effects } = transition(
      state,
      { type: 'DRAG_MOVE', cursor: { x: 50, y: 50 } },
      context
    ))
    expect(state.type).toBe('dragging')
    expect(getCursor(state)).toEqual({ x: 50, y: 50 })

    // 3. Find target
    ;({ state, context, effects } = transition(
      state,
      {
        type: 'TARGET_FOUND',
        target: mockTarget,
        result: mockResult,
        childRects: mockChildRects,
        containerRect: mockContainerRect,
      },
      context
    ))
    expect(state.type).toBe('over-target')
    expect(getTarget(state)).toEqual(mockTarget)

    // 4. Drop
    ;({ state, context, effects } = transition(state, { type: 'DRAG_END' }, context))
    expect(state.type).toBe('dropped')
    expect(effects).toContainEqual({ type: 'EXECUTE_DROP', source: mockSource, result: mockResult })
    expect(effects).toContainEqual({ type: 'NOTIFY_DRAG_END', source: mockSource, success: true })

    // 5. Reset
    ;({ state, context, effects } = transition(state, { type: 'RESET' }, context))
    expect(state.type).toBe('idle')
  })

  it('handles cancelled drag', () => {
    let state: DragState = initialState
    let context: DragContext = initialContext
    let effects: any[]

      // Start drag
    ;({ state, context } = transition(
      state,
      { type: 'DRAG_START', source: mockSource, cursor: { x: 0, y: 0 } },
      context
    ))

    // Find target
    ;({ state, context } = transition(
      state,
      {
        type: 'TARGET_FOUND',
        target: mockTarget,
        result: mockResult,
        childRects: mockChildRects,
        containerRect: mockContainerRect,
      },
      context
    ))

    // Cancel
    ;({ state, context, effects } = transition(state, { type: 'DRAG_CANCEL' }, context))

    expect(state.type).toBe('idle')
    expect(effects).toContainEqual({ type: 'HIDE_VISUALS' })
    expect(effects).toContainEqual({ type: 'NOTIFY_DRAG_END', source: mockSource, success: false })
  })

  it('handles drop without target', () => {
    let state: DragState = initialState
    let context: DragContext = initialContext
    let effects: any[]

      // Start drag
    ;({ state, context } = transition(
      state,
      { type: 'DRAG_START', source: mockSource, cursor: { x: 0, y: 0 } },
      context
    ))

    // Drop without finding target
    ;({ state, context, effects } = transition(state, { type: 'DRAG_END' }, context))

    expect(state.type).toBe('idle')
    expect(effects).not.toContainEqual(expect.objectContaining({ type: 'EXECUTE_DROP' }))
    expect(effects).toContainEqual({ type: 'NOTIFY_DRAG_END', source: mockSource, success: false })
  })
})
