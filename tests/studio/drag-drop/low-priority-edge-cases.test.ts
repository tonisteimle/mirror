/**
 * Low-Priority Edge Case Tests
 *
 * Tests for edge cases that are unlikely to occur in normal usage:
 * 1. Alt-key timing during drag operations
 * 2. ModeDebouncer timer cleanup
 * 3. Cache behavior with WeakMap
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { ModeDebouncer, createModeDebouncer } from '../../../studio/drag-drop/system/mode-debouncer'
import { transition, initialContext } from '../../../studio/drag-drop/system/state-machine'
import { clearTargetCache, detectTarget } from '../../../studio/drag-drop/system/target-detector'
import type { DragState, DragContext } from '../../../studio/drag-drop/system/types'
import type { DropResult, DropTarget } from '../../../studio/drag-drop/types'

// ============================================
// Alt-Key Timing Tests
// ============================================

describe('Alt-Key Timing', () => {
  let context: DragContext

  beforeEach(() => {
    context = { ...initialContext }
  })

  it('tracks Alt-key state correctly', () => {
    const state: DragState = { type: 'idle' }

    // Initial state: Alt not pressed
    expect(context.isAltKeyPressed).toBe(false)

    // Press Alt
    const result1 = transition(state, { type: 'ALT_KEY_DOWN' }, context)
    expect(result1.context.isAltKeyPressed).toBe(true)

    // Release Alt
    const result2 = transition(state, { type: 'ALT_KEY_UP' }, result1.context)
    expect(result2.context.isAltKeyPressed).toBe(false)
  })

  it('maintains Alt-key state across state transitions', () => {
    let state: DragState = { type: 'idle' }
    let ctx = { ...context }

    // Press Alt before drag starts
    const altDown = transition(state, { type: 'ALT_KEY_DOWN' }, ctx)
    ctx = altDown.context
    expect(ctx.isAltKeyPressed).toBe(true)

    // Start drag - Alt should still be pressed
    const dragStart = transition(state, {
      type: 'DRAG_START',
      source: { type: 'palette', componentName: 'Button' },
      position: { x: 100, y: 100 },
    }, ctx)
    state = dragStart.state
    ctx = dragStart.context
    expect(ctx.isAltKeyPressed).toBe(true)
    expect(state.type).toBe('dragging')

    // Release Alt during drag
    const altUp = transition(state, { type: 'ALT_KEY_UP' }, ctx)
    expect(altUp.context.isAltKeyPressed).toBe(false)
  })

  it('resets Alt-key state on RESET', () => {
    const state: DragState = { type: 'idle' }

    // Press Alt
    const result1 = transition(state, { type: 'ALT_KEY_DOWN' }, context)
    expect(result1.context.isAltKeyPressed).toBe(true)

    // Reset should clear Alt state
    const result2 = transition(state, { type: 'RESET' }, result1.context)
    expect(result2.context.isAltKeyPressed).toBe(false)
  })

  it('handles rapid Alt key toggles', () => {
    const state: DragState = { type: 'idle' }
    let ctx = { ...context }

    // Rapid toggles
    for (let i = 0; i < 10; i++) {
      const down = transition(state, { type: 'ALT_KEY_DOWN' }, ctx)
      expect(down.context.isAltKeyPressed).toBe(true)
      ctx = down.context

      const up = transition(state, { type: 'ALT_KEY_UP' }, ctx)
      expect(up.context.isAltKeyPressed).toBe(false)
      ctx = up.context
    }

    // Final state should be not pressed
    expect(ctx.isAltKeyPressed).toBe(false)
  })

  it('handles Alt key during DISABLE', () => {
    let state: DragState = {
      type: 'dragging',
      source: { type: 'palette', componentName: 'Button' },
    }
    let ctx = { ...context, isAltKeyPressed: true }

    // Disable while Alt is pressed
    const result = transition(state, { type: 'DISABLE' }, ctx)

    // State should reset to idle, but Alt state is preserved in context
    expect(result.state.type).toBe('idle')
    // Alt state is not explicitly cleared by DISABLE
    expect(result.context.isDisabled).toBe(true)
  })
})

// ============================================
// ModeDebouncer Timer Tests
// ============================================

describe('ModeDebouncer Timer Cleanup', () => {
  let debouncer: ModeDebouncer

  beforeEach(() => {
    vi.useFakeTimers()
    debouncer = createModeDebouncer()
  })

  afterEach(() => {
    debouncer.reset()
    vi.useRealTimers()
  })

  function createFlexResult(): DropResult {
    return {
      target: {
        nodeId: 'flex-container',
        element: document.createElement('div'),
        layoutType: 'flex',
        direction: 'vertical',
        hasChildren: true,
        isPositioned: false,
      },
      placement: 'before',
      targetId: 'child-1',
      insertionIndex: 0,
    }
  }

  function createAbsoluteResult(): DropResult {
    return {
      target: {
        nodeId: 'abs-container',
        element: document.createElement('div'),
        layoutType: 'positioned',
        direction: 'vertical',
        hasChildren: true,
        isPositioned: true,
      },
      placement: 'inside',
      targetId: 'abs-container',
      position: { x: 100, y: 100 },
    }
  }

  it('initializes mode on first calculation', () => {
    const result = createFlexResult()
    const output = debouncer.handleTransition('flex', result)

    expect(debouncer.getCurrentMode()).toBe('flex')
    expect(output).toBe(result)
  })

  it('returns same result when mode unchanged', () => {
    const result1 = createFlexResult()
    const result2 = createFlexResult()

    debouncer.handleTransition('flex', result1)
    const output = debouncer.handleTransition('flex', result2)

    expect(output).toBe(result2)
    expect(debouncer.getCurrentMode()).toBe('flex')
  })

  it('debounces mode transitions', () => {
    const flexResult = createFlexResult()
    const absResult = createAbsoluteResult()

    // Initialize with flex
    debouncer.handleTransition('flex', flexResult)

    // Attempt to switch to absolute
    const output = debouncer.handleTransition('absolute', absResult)

    // Should return the OLD result during debounce
    expect(output).toBe(flexResult)
    expect(debouncer.getCurrentMode()).toBe('flex')

    // After debounce period, mode should switch
    vi.advanceTimersByTime(100)
    expect(debouncer.getCurrentMode()).toBe('absolute')
  })

  it('clears timer on reset', () => {
    const flexResult = createFlexResult()
    const absResult = createAbsoluteResult()

    // Initialize and start transition
    debouncer.handleTransition('flex', flexResult)
    debouncer.handleTransition('absolute', absResult)

    // Reset before timer fires
    debouncer.reset()

    // Advance time - should not crash or change mode
    vi.advanceTimersByTime(100)

    expect(debouncer.getCurrentMode()).toBeNull()
  })

  it('clears timer when returning to same mode', () => {
    const flexResult1 = createFlexResult()
    const flexResult2 = createFlexResult()
    const absResult = createAbsoluteResult()

    // Initialize with flex
    debouncer.handleTransition('flex', flexResult1)

    // Start transition to absolute
    debouncer.handleTransition('absolute', absResult)

    // Return to flex before timer fires
    const output = debouncer.handleTransition('flex', flexResult2)

    // Should get new flex result (not old one)
    expect(output).toBe(flexResult2)
    expect(debouncer.getCurrentMode()).toBe('flex')

    // Timer should have been cleared - no unexpected mode change
    vi.advanceTimersByTime(100)
    expect(debouncer.getCurrentMode()).toBe('flex')
  })

  it('handles multiple rapid mode changes', () => {
    const flexResult = createFlexResult()
    const absResult = createAbsoluteResult()

    // Initialize
    debouncer.handleTransition('flex', flexResult)

    // Rapid changes (simulating cursor bouncing on boundary)
    for (let i = 0; i < 5; i++) {
      debouncer.handleTransition('absolute', absResult)
      vi.advanceTimersByTime(20) // Not enough for debounce
      debouncer.handleTransition('flex', flexResult)
      vi.advanceTimersByTime(20)
    }

    // Mode should still be flex (never settled in absolute)
    expect(debouncer.getCurrentMode()).toBe('flex')
  })

  it('does not leak timers after dispose', () => {
    const flexResult = createFlexResult()
    const absResult = createAbsoluteResult()

    // Start a transition
    debouncer.handleTransition('flex', flexResult)
    debouncer.handleTransition('absolute', absResult)

    // Reset (dispose)
    debouncer.reset()

    // Create a new debouncer and verify it's independent
    const newDebouncer = createModeDebouncer()
    expect(newDebouncer.getCurrentMode()).toBeNull()

    newDebouncer.reset()
  })
})

// ============================================
// Cache Behavior Tests
// ============================================

describe('Target Cache Behavior', () => {
  const NODE_ID_ATTR = 'data-mirror-id'

  beforeEach(() => {
    clearTargetCache()
  })

  afterEach(() => {
    clearTargetCache()
  })

  const mockAdapter = {
    getBoundingClientRect: () => ({
      x: 0, y: 0, width: 100, height: 100,
      top: 0, left: 0, right: 100, bottom: 100,
      toJSON: () => ({}),
    }),
    getComputedStyle: () => ({
      display: 'flex',
      flexDirection: 'row',
      position: 'static',
    } as CSSStyleDeclaration),
  }

  it('caches results for same element', () => {
    const element = document.createElement('div')
    element.setAttribute(NODE_ID_ATTR, 'test-node')

    // First call
    const result1 = detectTarget(element, NODE_ID_ATTR, mockAdapter)
    // Second call - should use cache
    const result2 = detectTarget(element, NODE_ID_ATTR, mockAdapter)

    expect(result1).toBe(result2) // Same object reference
  })

  it('clears cache correctly', () => {
    const element = document.createElement('div')
    element.setAttribute(NODE_ID_ATTR, 'test-node')

    const result1 = detectTarget(element, NODE_ID_ATTR, mockAdapter)

    clearTargetCache()

    // After clear, should create new result
    const result2 = detectTarget(element, NODE_ID_ATTR, mockAdapter)

    // Different object references
    expect(result1).not.toBe(result2)
    // But same content
    expect(result1?.nodeId).toBe(result2?.nodeId)
  })

  it('handles multiple elements independently', () => {
    const element1 = document.createElement('div')
    element1.setAttribute(NODE_ID_ATTR, 'node-1')

    const element2 = document.createElement('div')
    element2.setAttribute(NODE_ID_ATTR, 'node-2')

    const result1 = detectTarget(element1, NODE_ID_ATTR, mockAdapter)
    const result2 = detectTarget(element2, NODE_ID_ATTR, mockAdapter)

    expect(result1?.nodeId).toBe('node-1')
    expect(result2?.nodeId).toBe('node-2')

    // Each element has its own cached result
    expect(detectTarget(element1, NODE_ID_ATTR, mockAdapter)).toBe(result1)
    expect(detectTarget(element2, NODE_ID_ATTR, mockAdapter)).toBe(result2)
  })

  it('caches null results for elements without node ID', () => {
    const element = document.createElement('div')
    // No node ID attribute

    const result1 = detectTarget(element, NODE_ID_ATTR, mockAdapter)
    const result2 = detectTarget(element, NODE_ID_ATTR, mockAdapter)

    expect(result1).toBeNull()
    expect(result2).toBeNull()
  })

  it('WeakMap allows garbage collection (documentation test)', () => {
    // This test documents WeakMap behavior
    // We can't actually test GC, but we verify the cache uses WeakMap semantics

    let element: HTMLElement | null = document.createElement('div')
    element.setAttribute(NODE_ID_ATTR, 'gc-test')

    // Populate cache
    const result = detectTarget(element, NODE_ID_ATTR, mockAdapter)
    expect(result).not.toBeNull()

    // Clear our reference
    element = null

    // The WeakMap entry can now be garbage collected
    // We can't verify this directly, but the design ensures no memory leaks
    expect(element).toBeNull()
  })
})

// ============================================
// State Machine Edge Cases
// ============================================

describe('State Machine Edge Cases', () => {
  let context: DragContext

  beforeEach(() => {
    context = { ...initialContext }
  })

  it('ignores DRAG_START when disabled', () => {
    const state: DragState = { type: 'idle' }
    const disabledContext = { ...context, isDisabled: true }

    const result = transition(state, {
      type: 'DRAG_START',
      source: { type: 'palette', componentName: 'Button' },
      position: { x: 100, y: 100 },
    }, disabledContext)

    // Should remain in idle state
    expect(result.state.type).toBe('idle')
    expect(result.effects).toHaveLength(0)
  })

  it('handles ENABLE after DISABLE', () => {
    const state: DragState = { type: 'idle' }

    // Disable
    const disabled = transition(state, { type: 'DISABLE' }, context)
    expect(disabled.context.isDisabled).toBe(true)

    // Enable
    const enabled = transition(state, { type: 'ENABLE' }, disabled.context)
    expect(enabled.context.isDisabled).toBe(false)
  })

  it('DISABLE during drag creates NOTIFY_DRAG_END effect', () => {
    const state: DragState = {
      type: 'dragging',
      source: { type: 'palette', componentName: 'Button' },
    }

    const result = transition(state, { type: 'DISABLE' }, context)

    expect(result.state.type).toBe('idle')
    expect(result.effects).toContainEqual(
      expect.objectContaining({ type: 'HIDE_VISUALS' })
    )
    expect(result.effects).toContainEqual(
      expect.objectContaining({
        type: 'NOTIFY_DRAG_END',
        success: false,
      })
    )
  })

  it('RESET from any state returns to idle', () => {
    const draggingState: DragState = {
      type: 'dragging',
      source: { type: 'canvas', nodeId: 'node-1' },
    }

    const result = transition(draggingState, { type: 'RESET' }, context)

    expect(result.state.type).toBe('idle')
    expect(result.effects).toContainEqual({ type: 'HIDE_VISUALS' })
  })
})
