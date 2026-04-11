/**
 * Drag & Drop State Machine
 *
 * Pure state machine for drag & drop operations.
 * No DOM, no side effects - fully deterministic and testable.
 */

import type { DragSource, DropTarget, DropResult, Point, Rect } from '../types'
import type { ChildRect } from '../strategies/types'

// ============================================
// State Types
// ============================================

export type DragMachineState =
  | { type: 'idle' }
  | { type: 'dragging'; source: DragSource; cursor: Point }
  | {
      type: 'over-target'
      source: DragSource
      cursor: Point
      target: DropTarget
      result: DropResult
      childRects: ChildRect[]
      containerRect: Rect
    }
  | { type: 'dropped'; source: DragSource; result: DropResult }

// ============================================
// Event Types
// ============================================

export type DragMachineEvent =
  | { type: 'DRAG_START'; source: DragSource; cursor: Point }
  | { type: 'DRAG_MOVE'; cursor: Point }
  | { type: 'DRAG_END' }
  | { type: 'DRAG_CANCEL' }
  | {
      type: 'TARGET_DETECTED'
      target: DropTarget
      result: DropResult
      childRects: ChildRect[]
      containerRect: Rect
    }
  | { type: 'TARGET_LOST' }
  | { type: 'ALT_KEY_DOWN' }
  | { type: 'ALT_KEY_UP' }

// ============================================
// Context (read-only data for transitions)
// ============================================

export interface DragMachineContext {
  isAltKeyPressed: boolean
}

// ============================================
// Pure Transition Function
// ============================================

/**
 * Pure state transition function.
 * Given current state and event, returns new state.
 * No side effects, fully deterministic.
 */
export function transition(
  state: DragMachineState,
  event: DragMachineEvent,
  context: DragMachineContext
): { state: DragMachineState; context: DragMachineContext } {
  switch (state.type) {
    case 'idle':
      return transitionFromIdle(state, event, context)

    case 'dragging':
      return transitionFromDragging(state, event, context)

    case 'over-target':
      return transitionFromOverTarget(state, event, context)

    case 'dropped':
      return transitionFromDropped(state, event, context)
  }
}

function transitionFromIdle(
  state: DragMachineState & { type: 'idle' },
  event: DragMachineEvent,
  context: DragMachineContext
): { state: DragMachineState; context: DragMachineContext } {
  switch (event.type) {
    case 'DRAG_START':
      return {
        state: {
          type: 'dragging',
          source: event.source,
          cursor: event.cursor,
        },
        context,
      }

    case 'ALT_KEY_DOWN':
      return { state, context: { ...context, isAltKeyPressed: true } }

    case 'ALT_KEY_UP':
      return { state, context: { ...context, isAltKeyPressed: false } }

    default:
      return { state, context }
  }
}

function transitionFromDragging(
  state: DragMachineState & { type: 'dragging' },
  event: DragMachineEvent,
  context: DragMachineContext
): { state: DragMachineState; context: DragMachineContext } {
  switch (event.type) {
    case 'DRAG_MOVE':
      return {
        state: { ...state, cursor: event.cursor },
        context,
      }

    case 'TARGET_DETECTED':
      return {
        state: {
          type: 'over-target',
          source: state.source,
          cursor: state.cursor,
          target: event.target,
          result: event.result,
          childRects: event.childRects,
          containerRect: event.containerRect,
        },
        context,
      }

    case 'DRAG_END':
      // Dropped without valid target - return to idle
      return { state: { type: 'idle' }, context }

    case 'DRAG_CANCEL':
      return { state: { type: 'idle' }, context }

    case 'ALT_KEY_DOWN':
      return { state, context: { ...context, isAltKeyPressed: true } }

    case 'ALT_KEY_UP':
      return { state, context: { ...context, isAltKeyPressed: false } }

    default:
      return { state, context }
  }
}

function transitionFromOverTarget(
  state: DragMachineState & { type: 'over-target' },
  event: DragMachineEvent,
  context: DragMachineContext
): { state: DragMachineState; context: DragMachineContext } {
  switch (event.type) {
    case 'DRAG_MOVE':
      return {
        state: { ...state, cursor: event.cursor },
        context,
      }

    case 'TARGET_DETECTED':
      return {
        state: {
          ...state,
          target: event.target,
          result: event.result,
          childRects: event.childRects,
          containerRect: event.containerRect,
        },
        context,
      }

    case 'TARGET_LOST':
      return {
        state: {
          type: 'dragging',
          source: state.source,
          cursor: state.cursor,
        },
        context,
      }

    case 'DRAG_END':
      return {
        state: {
          type: 'dropped',
          source: state.source,
          result: state.result,
        },
        context,
      }

    case 'DRAG_CANCEL':
      return { state: { type: 'idle' }, context }

    case 'ALT_KEY_DOWN':
      return { state, context: { ...context, isAltKeyPressed: true } }

    case 'ALT_KEY_UP':
      return { state, context: { ...context, isAltKeyPressed: false } }

    default:
      return { state, context }
  }
}

function transitionFromDropped(
  _state: DragMachineState & { type: 'dropped' },
  event: DragMachineEvent,
  context: DragMachineContext
): { state: DragMachineState; context: DragMachineContext } {
  switch (event.type) {
    // After drop is processed, reset to idle
    case 'DRAG_START':
      return {
        state: {
          type: 'dragging',
          source: event.source,
          cursor: event.cursor,
        },
        context,
      }

    case 'ALT_KEY_DOWN':
      return { state: { type: 'idle' }, context: { ...context, isAltKeyPressed: true } }

    case 'ALT_KEY_UP':
      return { state: { type: 'idle' }, context: { ...context, isAltKeyPressed: false } }

    default:
      // Any other event resets to idle
      return { state: { type: 'idle' }, context }
  }
}

// ============================================
// Initial State
// ============================================

export const initialState: DragMachineState = { type: 'idle' }

export const initialContext: DragMachineContext = {
  isAltKeyPressed: false,
}

// ============================================
// State Queries (pure functions)
// ============================================

export function isIdle(state: DragMachineState): state is DragMachineState & { type: 'idle' } {
  return state.type === 'idle'
}

export function isDragging(state: DragMachineState): boolean {
  return state.type === 'dragging' || state.type === 'over-target'
}

export function isOverTarget(
  state: DragMachineState
): state is DragMachineState & { type: 'over-target' } {
  return state.type === 'over-target'
}

export function isDropped(
  state: DragMachineState
): state is DragMachineState & { type: 'dropped' } {
  return state.type === 'dropped'
}

export function getSource(state: DragMachineState): DragSource | null {
  if (state.type === 'idle') return null
  return state.source
}

export function getDropResult(state: DragMachineState): DropResult | null {
  if (state.type === 'over-target' || state.type === 'dropped') {
    return state.result
  }
  return null
}

export function getCursor(state: DragMachineState): Point | null {
  if (state.type === 'dragging' || state.type === 'over-target') {
    return state.cursor
  }
  return null
}
