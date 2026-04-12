/**
 * DOM Adapters
 *
 * Production implementations of the Port interfaces.
 * These adapters wrap existing DOM-based code to work with the new architecture.
 *
 * Architecture:
 * - Each adapter implements one Port interface
 * - Wraps existing target-detector, visual-system, etc.
 * - Provides clean dependency injection for the DragDropController
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
import type { ChildRect, DropStrategy } from '../../strategies/types'
import type { LayoutRect } from '../../../core/state'
import type {
  LayoutPort,
  StylePort,
  EventPort,
  ExtendedEventPort,
  VisualPort,
  ExecutionPort,
  TargetDetectionPort,
  DragDropPorts,
  DragStartHandler,
  DragMoveHandler,
  DragEndHandler,
  DragCancelHandler,
  KeyHandler,
  CleanupFn,
} from '../ports'
import {
  draggable,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter'
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview'
import type { DOMAdapter } from '../dom-adapter'
import { getDefaultDOMAdapter } from '../dom-adapter'
import {
  detectTarget,
  findClosestTarget,
  getChildRects as getChildRectsFromDOM,
  getContainerRect as getContainerRectFromDOM,
  detectLayoutType,
  detectDirection,
} from '../target-detector'
import { VisualSystem } from '../../visual/system'
import { StrategyRegistry, createWebflowRegistry } from '../../strategies/registry'
import { CodeExecutor } from '../../executor/code-executor'
import type { SourceMap } from '../../../../compiler/ir/source-map'
import type { CodeModifier } from '../../../../compiler/studio/code-modifier'

// ============================================
// Default Size Provider
// ============================================

const DEFAULT_COMPONENT_SIZES: Record<string, { width: number; height: number }> = {
  Frame: { width: 100, height: 100 },
  Text: { width: 100, height: 24 },
  Button: { width: 100, height: 40 },
  Input: { width: 200, height: 40 },
  Textarea: { width: 200, height: 80 },
  Icon: { width: 24, height: 24 },
  Image: { width: 100, height: 100 },
  default: { width: 100, height: 40 },
}

function getDefaultComponentSize(componentName: string): { width: number; height: number } {
  return DEFAULT_COMPONENT_SIZES[componentName] || DEFAULT_COMPONENT_SIZES.default
}

// ============================================
// Configuration
// ============================================

export interface DOMAdaptersConfig {
  /** Container element for the preview (drop target area) */
  container: HTMLElement

  /** Attribute name for node IDs */
  nodeIdAttr?: string

  /** Optional cached layout info from state */
  getLayoutInfo?: () => Map<string, LayoutRect> | null

  /** DOM adapter for testability */
  domAdapter?: DOMAdapter

  /** Code executor dependencies */
  executorDeps?: ExecutorDependencies
}

export interface ExecutorDependencies {
  getSource(): string
  getResolvedSource(): string
  getPreludeOffset(): number
  getSourceMap(): SourceMap | null
  applyChange(newSource: string): void
  recompile(): Promise<void>
  getCurrentFile?(): string
  createModifier(source: string, sourceMap: SourceMap): CodeModifier
}

// ============================================
// DOM Layout Port
// ============================================

/**
 * Extended LayoutPort with cache invalidation for drag operations.
 * Cache is cleared at drag end to ensure fresh data for next drag.
 */
export interface CacheableLayoutPort extends LayoutPort {
  /** Clear all cached data (call on drag end) */
  clearCache(): void
}

export function createDOMLayoutPort(config: DOMAdaptersConfig): CacheableLayoutPort {
  const {
    container,
    nodeIdAttr = 'data-mirror-id',
    getLayoutInfo,
    domAdapter = getDefaultDOMAdapter(),
  } = config

  // Drag-scoped cache: cleared on drag end
  // Key: nodeId of parent element
  let childRectsCache = new Map<string, ChildRect[]>()
  let containerRectCache = new Map<string, Rect>()

  return {
    clearCache(): void {
      childRectsCache.clear()
      containerRectCache.clear()
    },

    getRect(nodeId: string): Rect | null {
      // Try cached layoutInfo first
      const layoutInfo = getLayoutInfo?.()
      if (layoutInfo) {
        const layout = layoutInfo.get(nodeId)
        if (layout) {
          return {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
          }
        }
      }

      // Fallback to DOM query
      const element = container.querySelector(`[${nodeIdAttr}="${nodeId}"]`) as HTMLElement
      if (!element) return null

      const rect = domAdapter.getBoundingClientRect(element)
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }
    },

    getChildRects(parentElement: HTMLElement): ChildRect[] {
      // Check drag-scoped cache first
      const parentNodeId = parentElement.getAttribute(nodeIdAttr)
      if (parentNodeId) {
        const cached = childRectsCache.get(parentNodeId)
        if (cached) {
          return cached
        }
      }

      // Compute and cache
      const layoutInfo = getLayoutInfo?.()
      const result = getChildRectsFromDOM(parentElement, nodeIdAttr, layoutInfo, domAdapter)

      if (parentNodeId) {
        childRectsCache.set(parentNodeId, result)
      }

      return result
    },

    getContainerRect(element: HTMLElement): Rect | null {
      // Check drag-scoped cache first
      const nodeId = element.getAttribute(nodeIdAttr)
      if (nodeId) {
        const cached = containerRectCache.get(nodeId)
        if (cached) {
          return cached
        }
      }

      // Compute and cache
      const layoutInfo = getLayoutInfo?.()
      const rect = getContainerRectFromDOM(element, layoutInfo, nodeIdAttr, domAdapter)
      const result: Rect = {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      }

      if (nodeId) {
        containerRectCache.set(nodeId, result)
      }

      return result
    },
  }
}

// ============================================
// DOM Style Port
// ============================================

export function createDOMStylePort(config: DOMAdaptersConfig): StylePort {
  const { domAdapter = getDefaultDOMAdapter() } = config

  return {
    getLayoutType(element: HTMLElement): LayoutType {
      const style = domAdapter.getComputedStyle(element)
      return detectLayoutType(element, style)
    },

    getDirection(element: HTMLElement): Direction {
      const style = domAdapter.getComputedStyle(element)
      return detectDirection(style)
    },

    elementFromPoint(x: number, y: number): HTMLElement | null {
      return document.elementFromPoint(x, y) as HTMLElement | null
    },

    getComputedStyle(element: HTMLElement): CSSStyleDeclaration {
      return domAdapter.getComputedStyle(element)
    },
  }
}

// ============================================
// DOM Event Port
// ============================================

// Type guards for validating drag source data
function isValidCanvasSourceData(data: unknown): data is { type: 'canvas'; nodeId: string } {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'canvas' &&
    typeof (data as Record<string, unknown>).nodeId === 'string'
  )
}

function isValidPaletteSourceData(data: unknown): data is {
  type: 'palette'
  componentName: string
  componentId?: string
  properties?: string
  textContent?: string
  children?: unknown
} {
  return (
    typeof data === 'object' &&
    data !== null &&
    (data as Record<string, unknown>).type === 'palette' &&
    typeof (data as Record<string, unknown>).componentName === 'string'
  )
}

/**
 * Extended type for DOM Event Port with trigger methods and drag registration.
 */
export type DOMEventPort = ExtendedEventPort & {
  // Methods to trigger events (called by actual event sources)
  triggerDragStart(source: DragSource, cursor: Point): void
  triggerDragMove(cursor: Point): void
  triggerDragEnd(): void
  triggerDragCancel(): void
}

/**
 * Creates a DOM Event Port with full Pragmatic DnD integration.
 *
 * Features:
 * - Keyboard event handling (Alt key for duplicate)
 * - Canvas drag registration (via Pragmatic DnD)
 * - Palette drag registration (via Pragmatic DnD)
 * - Event trigger methods (for external sources like NativeDragAdapter)
 */
export function createDOMEventPort(): DOMEventPort {
  const handlers = {
    dragStart: [] as DragStartHandler[],
    dragMove: [] as DragMoveHandler[],
    dragEnd: [] as DragEndHandler[],
    dragCancel: [] as DragCancelHandler[],
    keyDown: new Map<string, KeyHandler[]>(),
    keyUp: new Map<string, KeyHandler[]>(),
  }

  // Track registered draggables for cleanup
  const draggableCleanups: CleanupFn[] = []

  // Global monitor cleanup
  let monitorCleanup: CleanupFn | null = null

  // Keyboard event listeners
  let keyDownListener: ((e: KeyboardEvent) => void) | null = null
  let keyUpListener: ((e: KeyboardEvent) => void) | null = null

  function ensureKeyboardListeners() {
    if (!keyDownListener) {
      keyDownListener = (e: KeyboardEvent) => {
        const key = e.key
        handlers.keyDown.get(key)?.forEach((h) => h())
      }
      document.addEventListener('keydown', keyDownListener)
    }

    if (!keyUpListener) {
      keyUpListener = (e: KeyboardEvent) => {
        const key = e.key
        handlers.keyUp.get(key)?.forEach((h) => h())
      }
      document.addEventListener('keyup', keyUpListener)
    }
  }

  function ensureMonitor() {
    if (monitorCleanup) return

    monitorCleanup = monitorForElements({
      onDragStart: ({ source, location }) => {
        const data = source.data
        let dragSource: DragSource | null = null

        // Use type guards for safe data extraction
        if (isValidCanvasSourceData(data)) {
          const element = source.element as HTMLElement
          const rect = element.getBoundingClientRect()
          dragSource = {
            type: 'canvas',
            nodeId: data.nodeId,
            element,
            // Include actual element size for ghost indicator
            size: {
              width: rect.width,
              height: rect.height,
            },
          }
        } else if (isValidPaletteSourceData(data)) {
          dragSource = {
            type: 'palette',
            componentId: data.componentId,
            componentName: data.componentName,
            properties: data.properties,
            textContent: data.textContent,
            children: data.children as DragSource['children'],
            // Use default size based on component type for ghost indicator
            size: getDefaultComponentSize(data.componentName),
          }
        }

        if (dragSource) {
          const cursor = {
            x: location.current.input.clientX,
            y: location.current.input.clientY,
          }
          handlers.dragStart.forEach((h) => h(dragSource!, cursor))
        }
      },

      onDrag: ({ location }) => {
        const cursor = {
          x: location.current.input.clientX,
          y: location.current.input.clientY,
        }
        handlers.dragMove.forEach((h) => h(cursor))
      },

      onDrop: () => {
        handlers.dragEnd.forEach((h) => h())
      },
    })
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
      ensureKeyboardListeners()
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
      ensureKeyboardListeners()
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

    // Extended: Register canvas element as draggable
    registerCanvasDrag(nodeId: string, element: HTMLElement): CleanupFn {
      ensureMonitor()

      const cleanup = draggable({
        element,
        getInitialData: () => ({
          type: 'canvas' as const,
          nodeId,
        }),
        onGenerateDragPreview: ({ nativeSetDragImage }) => {
          // Create minimal transparent preview
          setCustomNativeDragPreview({
            nativeSetDragImage,
            render: ({ container }) => {
              Object.assign(container.style, {
                width: '1px',
                height: '1px',
                opacity: '0',
              })
            },
          })
        },
      })

      draggableCleanups.push(cleanup)
      return cleanup
    },

    // Extended: Register palette item as draggable
    registerPaletteDrag(element: HTMLElement, data: {
      componentId?: string
      componentName: string
      properties?: string
      textContent?: string
      children?: any[]
    }): CleanupFn {
      ensureMonitor()

      const cleanup = draggable({
        element,
        getInitialData: () => ({
          type: 'palette' as const,
          ...data,
        }),
      })

      draggableCleanups.push(cleanup)
      return cleanup
    },

    // Trigger methods (called by external event sources like NativeDragAdapter)
    triggerDragStart(source: DragSource, cursor: Point): void {
      handlers.dragStart.forEach((h) => h(source, cursor))
    },

    triggerDragMove(cursor: Point): void {
      handlers.dragMove.forEach((h) => h(cursor))
    },

    triggerDragEnd(): void {
      handlers.dragEnd.forEach((h) => h())
    },

    triggerDragCancel(): void {
      handlers.dragCancel.forEach((h) => h())
    },
  }
}

// ============================================
// DOM Visual Port
// ============================================

export function createDOMVisualPort(container: HTMLElement): VisualPort {
  const visualSystem = new VisualSystem(container)

  return {
    showIndicator(hint: VisualHint): void {
      visualSystem.showIndicator(hint)
    },

    showOutline(rect: Rect): void {
      visualSystem.showParentOutline(rect)
    },

    hideAll(): void {
      visualSystem.clear()
    },
  }
}

// ============================================
// DOM Execution Port
// ============================================

export function createDOMExecutionPort(deps: ExecutorDependencies): ExecutionPort {
  const executor = new CodeExecutor(deps)

  return {
    execute(source: DragSource, result: DropResult, shouldDuplicate: boolean): ExecutionResult {
      if (shouldDuplicate && source.type === 'canvas') {
        return executor.duplicate(source, result)
      }
      return executor.execute(source, result)
    },

    canDuplicate(source: DragSource): boolean {
      // Only canvas items can be duplicated
      return source.type === 'canvas'
    },
  }
}

// ============================================
// DOM Target Detection Port
// ============================================

/** Threshold in pixels for container redirect */
const CONTAINER_REDIRECT_THRESHOLD = 30

export function createDOMTargetDetectionPort(config: DOMAdaptersConfig): TargetDetectionPort {
  const {
    container,
    nodeIdAttr = 'data-mirror-id',
    getLayoutInfo,
    domAdapter = getDefaultDOMAdapter(),
  } = config

  // Create strategy registry
  const registry = createWebflowRegistry()

  return {
    findTarget(cursor: Point, source: DragSource): DropTarget | null {
      // Find element under cursor
      const element = document.elementFromPoint(cursor.x, cursor.y) as HTMLElement | null
      if (!element) return null

      // Find closest valid target
      const target = findClosestTarget(element, nodeIdAttr, domAdapter)
      if (!target) return null

      // For canvas drags, check if we're dragging to self
      if (source.type === 'canvas' && source.nodeId === target.nodeId) {
        // Can't drop on self - try parent
        if (target.element.parentElement) {
          return findClosestTarget(target.element.parentElement, nodeIdAttr, domAdapter)
        }
        return null
      }

      return target
    },

    calculateResult(
      cursor: Point,
      target: DropTarget,
      source: DragSource,
      childRects: ChildRect[],
      containerRect: Rect
    ): DropResult {
      // Find matching strategy
      const strategy = registry.findStrategy(target)
      if (!strategy) {
        // Fallback result
        return {
          target,
          placement: 'inside',
          targetId: target.nodeId,
        }
      }

      // Calculate result using strategy
      return strategy.calculate(cursor, target, source, childRects, containerRect)
    },

    getVisualHint(
      result: DropResult,
      childRects: ChildRect[],
      containerRect: Rect
    ): VisualHint | null {
      // Skip hint for no-op
      if (result.isNoOp) return null

      // Find matching strategy
      const strategy = registry.findStrategy(result.target)
      if (!strategy) return null

      // Get hint from strategy
      return strategy.getVisualHint(result, childRects, containerRect)
    },

    /**
     * Check if drop should be redirected to a sibling container.
     *
     * When the user drags just below a flex container, redirect the drop
     * to insert at the end of that container instead of before the next sibling.
     */
    checkContainerRedirect(
      cursor: Point,
      target: DropTarget,
      result: DropResult,
      childRects: ChildRect[]
    ): { target: DropTarget; result: DropResult } | null {
      // Only check for 'before' placement (not first child)
      if (result.placement !== 'before') return null
      if (result.insertionIndex === undefined || result.insertionIndex <= 0) return null

      // Find the previous sibling element
      const prevIndex = result.insertionIndex - 1
      if (prevIndex < 0 || prevIndex >= childRects.length) return null

      const prevChildRect = childRects[prevIndex]
      const prevElement = target.element.querySelector(
        `[${nodeIdAttr}="${prevChildRect.nodeId}"]`
      ) as HTMLElement | null
      if (!prevElement) return null

      // Check if previous sibling is a flex container
      const prevStyle = domAdapter.getComputedStyle(prevElement)
      const isFlexContainer =
        prevStyle.display === 'flex' ||
        prevStyle.display === 'inline-flex' ||
        prevStyle.display === 'grid' ||
        prevStyle.display === 'inline-grid'
      if (!isFlexContainer) return null

      // Check if cursor is within the redirect threshold below the container
      const prevRect = prevChildRect.rect
      const containerBottom = prevRect.y + prevRect.height

      // Only redirect if cursor is below the container but within threshold
      if (cursor.y < containerBottom || cursor.y > containerBottom + CONTAINER_REDIRECT_THRESHOLD) {
        return null
      }

      // Also check cursor is horizontally within the container bounds
      if (cursor.x < prevRect.x || cursor.x > prevRect.x + prevRect.width) {
        return null
      }

      // Create a new target for the previous sibling container
      const redirectTarget = detectTarget(prevElement, nodeIdAttr, domAdapter)
      if (!redirectTarget || redirectTarget.layoutType !== 'flex') return null

      // Get child rects for the redirect target
      const layoutInfo = getLayoutInfo?.()
      const redirectChildRects = getChildRectsFromDOM(prevElement, nodeIdAttr, layoutInfo, domAdapter)

      // Calculate new result: insert after last child
      const newResult: DropResult = {
        target: redirectTarget,
        placement: 'inside',
        targetId: redirectTarget.nodeId,
        insertionIndex: redirectChildRects.length,
      }

      return { target: redirectTarget, result: newResult }
    },
  }
}

// ============================================
// Combined DOM Ports Factory
// ============================================

export interface DOMPortsConfig extends DOMAdaptersConfig {
  executorDeps: ExecutorDependencies
}

export function createDOMPorts(config: DOMPortsConfig): DragDropPorts {
  return {
    layout: createDOMLayoutPort(config),
    style: createDOMStylePort(config),
    events: createDOMEventPort(),
    visual: createDOMVisualPort(config.container),
    execution: createDOMExecutionPort(config.executorDeps),
    targetDetection: createDOMTargetDetectionPort(config),
  }
}
