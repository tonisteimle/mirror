/**
 * Mock Adapters für Tests
 *
 * Diese Adapters simulieren alle externen Abhängigkeiten des Drag & Drop Systems.
 * Vollständig in-memory, keine DOM-Abhängigkeiten.
 */

import type {
  DragSource,
  DropTarget,
  DropResult,
  Point,
  Rect,
  LayoutType,
  Direction,
  VisualHint,
  ExecutionResult,
} from '../../types'
import type { ChildRect } from '../../strategies/types'
import type {
  LayoutPort,
  StylePort,
  EventPort,
  VisualPort,
  ExecutionPort,
  TargetDetectionPort,
  DragStartHandler,
  DragMoveHandler,
  DragEndHandler,
  DragCancelHandler,
  KeyHandler,
  CleanupFn,
} from '../ports'

// ============================================
// Mock Layout Port
// ============================================

export interface MockLayoutPortConfig {
  rects?: Map<string, Rect>
  childRects?: Map<HTMLElement, ChildRect[]>
  containerRects?: Map<HTMLElement, Rect>
}

export function createMockLayoutPort(config: MockLayoutPortConfig = {}): LayoutPort & {
  setRect(nodeId: string, rect: Rect): void
  setChildRects(parent: HTMLElement, rects: ChildRect[]): void
  setContainerRect(element: HTMLElement, rect: Rect): void
} {
  const rects = config.rects ?? new Map<string, Rect>()
  const childRects = config.childRects ?? new Map<HTMLElement, ChildRect[]>()
  const containerRects = config.containerRects ?? new Map<HTMLElement, Rect>()

  return {
    getRect(nodeId: string): Rect | null {
      return rects.get(nodeId) ?? null
    },

    getChildRects(parentElement: HTMLElement): ChildRect[] {
      return childRects.get(parentElement) ?? []
    },

    getContainerRect(element: HTMLElement): Rect | null {
      return containerRects.get(element) ?? null
    },

    // Test helpers
    setRect(nodeId: string, rect: Rect): void {
      rects.set(nodeId, rect)
    },

    setChildRects(parent: HTMLElement, rects: ChildRect[]): void {
      childRects.set(parent, rects)
    },

    setContainerRect(element: HTMLElement, rect: Rect): void {
      containerRects.set(element, rect)
    },
  }
}

// ============================================
// Mock Style Port
// ============================================

export interface MockStylePortConfig {
  layoutTypes?: Map<HTMLElement, LayoutType>
  directions?: Map<HTMLElement, Direction>
  elementAtPoint?: HTMLElement | null
}

export function createMockStylePort(config: MockStylePortConfig = {}): StylePort & {
  setLayoutType(element: HTMLElement, type: LayoutType): void
  setDirection(element: HTMLElement, direction: Direction): void
  setElementAtPoint(element: HTMLElement | null): void
} {
  const layoutTypes = config.layoutTypes ?? new Map<HTMLElement, LayoutType>()
  const directions = config.directions ?? new Map<HTMLElement, Direction>()
  let elementAtPoint = config.elementAtPoint ?? null

  return {
    getLayoutType(element: HTMLElement): LayoutType {
      return layoutTypes.get(element) ?? 'none'
    },

    getDirection(element: HTMLElement): Direction {
      return directions.get(element) ?? 'horizontal'
    },

    elementFromPoint(_x: number, _y: number): HTMLElement | null {
      return elementAtPoint
    },

    getComputedStyle(_element: HTMLElement): CSSStyleDeclaration {
      // Return a minimal mock CSSStyleDeclaration
      return {
        display: 'flex',
        flexDirection: 'row',
        position: 'relative',
      } as CSSStyleDeclaration
    },

    // Test helpers
    setLayoutType(element: HTMLElement, type: LayoutType): void {
      layoutTypes.set(element, type)
    },

    setDirection(element: HTMLElement, direction: Direction): void {
      directions.set(element, direction)
    },

    setElementAtPoint(element: HTMLElement | null): void {
      elementAtPoint = element
    },
  }
}

// ============================================
// Mock Event Port
// ============================================

export interface MockEventPortHandlers {
  dragStart: DragStartHandler[]
  dragMove: DragMoveHandler[]
  dragEnd: DragEndHandler[]
  dragCancel: DragCancelHandler[]
  keyDown: Map<string, KeyHandler[]>
  keyUp: Map<string, KeyHandler[]>
}

export function createMockEventPort(): EventPort & {
  /** Simuliert einen Drag-Start Event */
  simulateDragStart(source: DragSource, cursor: Point): void
  /** Simuliert einen Drag-Move Event */
  simulateDragMove(cursor: Point): void
  /** Simuliert einen Drag-End Event */
  simulateDragEnd(): void
  /** Simuliert einen Drag-Cancel Event */
  simulateDragCancel(): void
  /** Simuliert einen Key-Down Event */
  simulateKeyDown(key: string): void
  /** Simuliert einen Key-Up Event */
  simulateKeyUp(key: string): void
  /** Gibt die registrierten Handler zurück (für Assertions) */
  getHandlers(): MockEventPortHandlers
} {
  const handlers: MockEventPortHandlers = {
    dragStart: [],
    dragMove: [],
    dragEnd: [],
    dragCancel: [],
    keyDown: new Map(),
    keyUp: new Map(),
  }

  return {
    onDragStart(handler: DragStartHandler): CleanupFn {
      handlers.dragStart.push(handler)
      return () => {
        const idx = handlers.dragStart.indexOf(handler)
        if (idx !== -1) handlers.dragStart.splice(idx, 1)
      }
    },

    onDragMove(handler: DragMoveHandler): CleanupFn {
      handlers.dragMove.push(handler)
      return () => {
        const idx = handlers.dragMove.indexOf(handler)
        if (idx !== -1) handlers.dragMove.splice(idx, 1)
      }
    },

    onDragEnd(handler: DragEndHandler): CleanupFn {
      handlers.dragEnd.push(handler)
      return () => {
        const idx = handlers.dragEnd.indexOf(handler)
        if (idx !== -1) handlers.dragEnd.splice(idx, 1)
      }
    },

    onDragCancel(handler: DragCancelHandler): CleanupFn {
      handlers.dragCancel.push(handler)
      return () => {
        const idx = handlers.dragCancel.indexOf(handler)
        if (idx !== -1) handlers.dragCancel.splice(idx, 1)
      }
    },

    onKeyDown(key: string, handler: KeyHandler): CleanupFn {
      if (!handlers.keyDown.has(key)) {
        handlers.keyDown.set(key, [])
      }
      handlers.keyDown.get(key)!.push(handler)
      return () => {
        const arr = handlers.keyDown.get(key)
        if (arr) {
          const idx = arr.indexOf(handler)
          if (idx !== -1) arr.splice(idx, 1)
        }
      }
    },

    onKeyUp(key: string, handler: KeyHandler): CleanupFn {
      if (!handlers.keyUp.has(key)) {
        handlers.keyUp.set(key, [])
      }
      handlers.keyUp.get(key)!.push(handler)
      return () => {
        const arr = handlers.keyUp.get(key)
        if (arr) {
          const idx = arr.indexOf(handler)
          if (idx !== -1) arr.splice(idx, 1)
        }
      }
    },

    // Test helpers
    simulateDragStart(source: DragSource, cursor: Point): void {
      handlers.dragStart.forEach((h) => h(source, cursor))
    },

    simulateDragMove(cursor: Point): void {
      handlers.dragMove.forEach((h) => h(cursor))
    },

    simulateDragEnd(): void {
      handlers.dragEnd.forEach((h) => h())
    },

    simulateDragCancel(): void {
      handlers.dragCancel.forEach((h) => h())
    },

    simulateKeyDown(key: string): void {
      handlers.keyDown.get(key)?.forEach((h) => h())
    },

    simulateKeyUp(key: string): void {
      handlers.keyUp.get(key)?.forEach((h) => h())
    },

    getHandlers(): MockEventPortHandlers {
      return handlers
    },
  }
}

// ============================================
// Mock Visual Port
// ============================================

export interface MockVisualPortState {
  indicatorHint: VisualHint | null
  outlineRect: Rect | null
  isHidden: boolean
}

export function createMockVisualPort(): VisualPort & {
  getState(): MockVisualPortState
  reset(): void
} {
  const state: MockVisualPortState = {
    indicatorHint: null,
    outlineRect: null,
    isHidden: true,
  }

  return {
    showIndicator(hint: VisualHint): void {
      state.indicatorHint = hint
      state.isHidden = false
    },

    showOutline(rect: Rect): void {
      state.outlineRect = rect
    },

    hideAll(): void {
      state.indicatorHint = null
      state.outlineRect = null
      state.isHidden = true
    },

    // Test helpers
    getState(): MockVisualPortState {
      return { ...state }
    },

    reset(): void {
      state.indicatorHint = null
      state.outlineRect = null
      state.isHidden = true
    },
  }
}

// ============================================
// Mock Execution Port
// ============================================

export interface MockExecutionPortConfig {
  executeResult?: ExecutionResult
  canDuplicateResult?: boolean
}

export interface MockExecutionCall {
  source: DragSource
  result: DropResult
  isAltKey: boolean
  type: 'execute' | 'duplicate'
}

export function createMockExecutionPort(config: MockExecutionPortConfig = {}): ExecutionPort & {
  getCalls(): MockExecutionCall[]
  setExecuteResult(result: ExecutionResult): void
  setCanDuplicate(canDuplicate: boolean): void
  reset(): void
} {
  let executeResult = config.executeResult ?? { success: true }
  let canDuplicateResult = config.canDuplicateResult ?? true
  const calls: MockExecutionCall[] = []

  return {
    execute(source: DragSource, result: DropResult, isAltKey: boolean): ExecutionResult {
      calls.push({ source, result, isAltKey, type: isAltKey ? 'duplicate' : 'execute' })
      return executeResult
    },

    canDuplicate(_source: DragSource): boolean {
      return canDuplicateResult
    },

    // Test helpers
    getCalls(): MockExecutionCall[] {
      return [...calls]
    },

    setExecuteResult(result: ExecutionResult): void {
      executeResult = result
    },

    setCanDuplicate(canDuplicate: boolean): void {
      canDuplicateResult = canDuplicate
    },

    reset(): void {
      calls.length = 0
    },
  }
}

// ============================================
// Mock Target Detection Port
// ============================================

export interface MockTargetDetectionPortConfig {
  target?: DropTarget | null
  result?: DropResult
  visualHint?: VisualHint | null
}

export function createMockTargetDetectionPort(
  config: MockTargetDetectionPortConfig = {}
): TargetDetectionPort & {
  setTarget(target: DropTarget | null): void
  setResult(result: DropResult): void
  setVisualHint(hint: VisualHint | null): void
} {
  let currentTarget = config.target ?? null
  let currentResult = config.result ?? null
  let currentHint = config.visualHint ?? null

  return {
    findTarget(_cursor: Point, _source: DragSource): DropTarget | null {
      return currentTarget
    },

    calculateResult(
      _cursor: Point,
      target: DropTarget,
      _source: DragSource,
      _childRects: ChildRect[],
      _containerRect: Rect
    ): DropResult {
      return (
        currentResult ?? {
          target,
          placement: 'inside',
          targetId: target.nodeId,
        }
      )
    },

    getVisualHint(
      _result: DropResult,
      _childRects: ChildRect[],
      _containerRect: Rect
    ): VisualHint | null {
      return currentHint
    },

    // Test helpers
    setTarget(target: DropTarget | null): void {
      currentTarget = target
    },

    setResult(result: DropResult): void {
      currentResult = result
    },

    setVisualHint(hint: VisualHint | null): void {
      currentHint = hint
    },
  }
}

// ============================================
// Combined Mock Ports Factory
// ============================================

export interface MockPorts {
  layout: ReturnType<typeof createMockLayoutPort>
  style: ReturnType<typeof createMockStylePort>
  events: ReturnType<typeof createMockEventPort>
  visual: ReturnType<typeof createMockVisualPort>
  execution: ReturnType<typeof createMockExecutionPort>
  targetDetection: ReturnType<typeof createMockTargetDetectionPort>
}

export function createMockPorts(): MockPorts {
  return {
    layout: createMockLayoutPort(),
    style: createMockStylePort(),
    events: createMockEventPort(),
    visual: createMockVisualPort(),
    execution: createMockExecutionPort(),
    targetDetection: createMockTargetDetectionPort(),
  }
}
