/**
 * Drag & Drop State Machine
 *
 * Pure state machine - keine DOM-Abhängigkeiten, keine Side Effects.
 * Alle Zustandsübergänge sind deterministisch und testbar.
 */

import type { DragSource, DropTarget, DropResult, Point, Rect } from '../types'
import type { ChildRect } from '../strategies/types'

// ============================================
// State
// ============================================

export interface IdleState {
  type: 'idle'
}

export interface DraggingState {
  type: 'dragging'
  source: DragSource
  cursor: Point
}

export interface OverTargetState {
  type: 'over-target'
  source: DragSource
  cursor: Point
  target: DropTarget
  result: DropResult
  childRects: ChildRect[]
  containerRect: Rect
}

export interface DroppedState {
  type: 'dropped'
  source: DragSource
  result: DropResult
}

export type DragState = IdleState | DraggingState | OverTargetState | DroppedState

// ============================================
// Context
// ============================================

export interface DragContext {
  isAltKeyPressed: boolean
  isDisabled: boolean
}

// ============================================
// Events
// ============================================

export type DragEvent =
  | { type: 'DRAG_START'; source: DragSource; cursor: Point }
  | { type: 'DRAG_MOVE'; cursor: Point }
  | { type: 'DRAG_END' }
  | { type: 'DRAG_CANCEL' }
  | {
      type: 'TARGET_FOUND'
      target: DropTarget
      result: DropResult
      childRects: ChildRect[]
      containerRect: Rect
    }
  | { type: 'TARGET_LOST' }
  | { type: 'TARGET_UPDATED'; result: DropResult }
  | { type: 'ALT_KEY_DOWN' }
  | { type: 'ALT_KEY_UP' }
  | { type: 'DISABLE' }
  | { type: 'ENABLE' }
  | { type: 'RESET' }

// ============================================
// Effects (Side Effects für den Orchestrator)
// ============================================

export type Effect =
  | { type: 'HIDE_VISUALS' }
  | { type: 'EXECUTE_DROP'; source: DragSource; result: DropResult }
  | { type: 'NOTIFY_DRAG_START'; source: DragSource }
  | { type: 'NOTIFY_DRAG_END'; source: DragSource; success: boolean }

// ============================================
// Transition Result
// ============================================

export interface TransitionResult {
  state: DragState
  context: DragContext
  effects: Effect[]
}

// ============================================
// Initial Values
// ============================================

export const initialState: DragState = { type: 'idle' }

export const initialContext: DragContext = {
  isAltKeyPressed: false,
  isDisabled: false,
}

// ============================================
// Pure Transition Function
// ============================================

export function transition(
  state: DragState,
  event: DragEvent,
  context: DragContext
): TransitionResult {
  // Global events (unabhängig vom State)
  switch (event.type) {
    case 'ALT_KEY_DOWN':
      return { state, context: { ...context, isAltKeyPressed: true }, effects: [] }

    case 'ALT_KEY_UP':
      return { state, context: { ...context, isAltKeyPressed: false }, effects: [] }

    case 'DISABLE': {
      if (state.type !== 'idle') {
        const source = getSource(state)!
        return {
          state: { type: 'idle' },
          context: { ...context, isDisabled: true },
          effects: [
            { type: 'HIDE_VISUALS' },
            { type: 'NOTIFY_DRAG_END', source, success: false },
          ],
        }
      }
      return { state, context: { ...context, isDisabled: true }, effects: [] }
    }

    case 'ENABLE':
      return { state, context: { ...context, isDisabled: false }, effects: [] }

    case 'RESET':
      return {
        state: { type: 'idle' },
        context: { ...context, isAltKeyPressed: false },
        effects: [{ type: 'HIDE_VISUALS' }],
      }
  }

  // Ignore DRAG_START when disabled
  if (context.isDisabled && event.type === 'DRAG_START') {
    return { state, context, effects: [] }
  }

  // State-specific transitions
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
  state: IdleState,
  event: DragEvent,
  context: DragContext
): TransitionResult {
  if (event.type === 'DRAG_START') {
    return {
      state: {
        type: 'dragging',
        source: event.source,
        cursor: event.cursor,
      },
      context,
      effects: [{ type: 'NOTIFY_DRAG_START', source: event.source }],
    }
  }
  return { state, context, effects: [] }
}

function transitionFromDragging(
  state: DraggingState,
  event: DragEvent,
  context: DragContext
): TransitionResult {
  switch (event.type) {
    case 'DRAG_MOVE':
      return {
        state: { ...state, cursor: event.cursor },
        context,
        effects: [],
      }

    case 'TARGET_FOUND':
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
        effects: [],
      }

    case 'DRAG_END':
      return {
        state: { type: 'idle' },
        context,
        effects: [
          { type: 'HIDE_VISUALS' },
          { type: 'NOTIFY_DRAG_END', source: state.source, success: false },
        ],
      }

    case 'DRAG_CANCEL':
      return {
        state: { type: 'idle' },
        context,
        effects: [
          { type: 'HIDE_VISUALS' },
          { type: 'NOTIFY_DRAG_END', source: state.source, success: false },
        ],
      }

    default:
      return { state, context, effects: [] }
  }
}

function transitionFromOverTarget(
  state: OverTargetState,
  event: DragEvent,
  context: DragContext
): TransitionResult {
  switch (event.type) {
    case 'DRAG_MOVE':
      return {
        state: { ...state, cursor: event.cursor },
        context,
        effects: [],
      }

    case 'TARGET_FOUND':
      return {
        state: {
          ...state,
          target: event.target,
          result: event.result,
          childRects: event.childRects,
          containerRect: event.containerRect,
        },
        context,
        effects: [],
      }

    case 'TARGET_UPDATED':
      return {
        state: { ...state, result: event.result },
        context,
        effects: [],
      }

    case 'TARGET_LOST':
      return {
        state: {
          type: 'dragging',
          source: state.source,
          cursor: state.cursor,
        },
        context,
        effects: [{ type: 'HIDE_VISUALS' }],
      }

    case 'DRAG_END':
      return {
        state: {
          type: 'dropped',
          source: state.source,
          result: state.result,
        },
        context,
        effects: [
          { type: 'EXECUTE_DROP', source: state.source, result: state.result },
          { type: 'HIDE_VISUALS' },
          { type: 'NOTIFY_DRAG_END', source: state.source, success: true },
        ],
      }

    case 'DRAG_CANCEL':
      return {
        state: { type: 'idle' },
        context,
        effects: [
          { type: 'HIDE_VISUALS' },
          { type: 'NOTIFY_DRAG_END', source: state.source, success: false },
        ],
      }

    default:
      return { state, context, effects: [] }
  }
}

function transitionFromDropped(
  _state: DroppedState,
  event: DragEvent,
  context: DragContext
): TransitionResult {
  if (event.type === 'DRAG_START') {
    return {
      state: {
        type: 'dragging',
        source: event.source,
        cursor: event.cursor,
      },
      context,
      effects: [{ type: 'NOTIFY_DRAG_START', source: event.source }],
    }
  }
  return { state: { type: 'idle' }, context, effects: [] }
}

// ============================================
// State Queries
// ============================================

export function isIdle(state: DragState): state is IdleState {
  return state.type === 'idle'
}

export function isDragging(state: DragState): boolean {
  return state.type === 'dragging' || state.type === 'over-target'
}

export function isOverTarget(state: DragState): state is OverTargetState {
  return state.type === 'over-target'
}

export function isDropped(state: DragState): state is DroppedState {
  return state.type === 'dropped'
}

export function getSource(state: DragState): DragSource | null {
  if (state.type === 'idle') return null
  return state.source
}

export function getTarget(state: DragState): DropTarget | null {
  if (state.type === 'over-target') return state.target
  return null
}

export function getResult(state: DragState): DropResult | null {
  if (state.type === 'over-target' || state.type === 'dropped') {
    return state.result
  }
  return null
}

export function getCursor(state: DragState): Point | null {
  if (state.type === 'dragging' || state.type === 'over-target') {
    return state.cursor
  }
  return null
}

export function canDrop(state: DragState): boolean {
  return state.type === 'over-target' && !state.result.isNoOp
}
