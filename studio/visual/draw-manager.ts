/**
 * DrawManager - Click-to-draw interaction system
 *
 * Allows users to create positioned components in absolute containers
 * by clicking a component and dragging to define size and position.
 */

import type { ComponentItem } from '../panels/components/types'
import type { CodeModifier, ModificationResult } from '../code-modifier/code-modifier'
import type { SourceMap } from '../../compiler/ir/source-map'
import type { LayoutRect } from '../core/state'
import { detectLayout } from '../code-modifier/utils/layout-detection'
import { DrawRectRenderer } from './draw-rect-renderer'
import { SnapIntegration, createSnapIntegration } from './snap-integration'
import { GuideRenderer } from './smart-guides/guide-renderer'
import { events } from '../core/events'
import { createLogger } from '../../compiler/utils/logger'
import { readGridGeometry } from './grid-overlay/grid-detector'
import { pointerToCell, cellRange, cellRangeToRect, type GridCell } from './snap/grid-cell-snap'
import type { GridGeometry } from './grid-overlay/grid-detector'

const log = createLogger('DrawManager')

const MIN_SIZE = 10 // Minimum width/height in pixels

export type DrawMode = 'idle' | 'ready' | 'drawing'

/** Which container layout the active draw is happening in. Picked at
 *  mousedown time; the rest of the lifecycle branches on it. */
export type DrawTargetType = 'absolute' | 'grid'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Modifiers {
  shift: boolean // Constrain to square
  alt: boolean // Draw from center
  meta: boolean // Disable snapping (Cmd/Ctrl)
}

export interface DrawState {
  component: ComponentItem
  containerElement: HTMLElement
  containerNodeId: string
  containerRect: DOMRect
  startPoint: Point
  currentPoint: Point
  currentRect: Rect
  modifiers: Modifiers
  scale: number
  lastClientX: number
  lastClientY: number
  /** Which path is active. Absolute: existing px-snap logic. Grid: cell-
   *  snap, output written as `x A, y B, w C, h D` (1-indexed cells). */
  targetType: DrawTargetType
  /** Grid-only: live geometry captured at mousedown so cell-math stays
   *  consistent across the drag (column/row sizes can shift if siblings
   *  resize, but for a single drag we want a stable target). */
  gridGeometry?: GridGeometry
  startCell?: GridCell
  currentCell?: GridCell
}

export interface DrawResult {
  success: boolean
  nodeId?: string
  properties: {
    x: number
    y: number
    w: number
    h: number
  }
  modificationResult?: ModificationResult
  error?: string
}

export interface DrawManagerConfig {
  container: HTMLElement
  getCodeModifier: () => CodeModifier
  sourceMap: () => SourceMap | null
  /** Get cached layout info from state (Phase 5 optimization) */
  getLayoutInfo?: () => Map<string, LayoutRect> | null
  gridSize?: number
  enableSmartGuides?: boolean
  snapTolerance?: number
  minSize?: number
}

export class DrawManager {
  private mode: DrawMode = 'idle'
  private componentToDraw: ComponentItem | null = null
  private drawState: DrawState | null = null
  private config: Required<
    Omit<DrawManagerConfig, 'sourceMap' | 'getCodeModifier' | 'getLayoutInfo'>
  > & {
    sourceMap: () => SourceMap | null
    getCodeModifier: () => CodeModifier
    getLayoutInfo: () => Map<string, LayoutRect> | null
  }

  private renderer: DrawRectRenderer
  private snapIntegration: SnapIntegration
  private guideRenderer: GuideRenderer
  private rafId: number | null = null
  private isDisposed: boolean = false

  // Event handlers (bound)
  private boundHandleMouseDown: (e: MouseEvent) => void
  private boundHandleMouseMove: (e: MouseEvent) => void
  private boundHandleMouseUp: (e: MouseEvent) => void
  private boundHandleKeyDown: (e: KeyboardEvent) => void
  private boundHandleKeyUp: (e: KeyboardEvent) => void

  // Callbacks
  public onDrawComplete?: (result: DrawResult) => void
  public onDrawCancel?: () => void
  public onError?: (error: Error) => void

  constructor(config: DrawManagerConfig) {
    this.config = {
      container: config.container,
      getCodeModifier: config.getCodeModifier,
      sourceMap: config.sourceMap,
      getLayoutInfo: config.getLayoutInfo ?? (() => null),
      gridSize: config.gridSize ?? 0,
      enableSmartGuides: config.enableSmartGuides ?? false,
      snapTolerance: config.snapTolerance ?? 4,
      minSize: config.minSize ?? MIN_SIZE,
    }

    this.renderer = new DrawRectRenderer(config.container)

    // Initialize snap integration
    this.snapIntegration = createSnapIntegration({
      gridSize: this.config.gridSize,
      enableSmartGuides: this.config.enableSmartGuides,
      snapTolerance: this.config.snapTolerance,
      disableSnapping: false,
    })

    // Initialize guide renderer
    this.guideRenderer = new GuideRenderer(config.container)

    // Bind event handlers
    this.boundHandleMouseDown = this.handleMouseDown.bind(this)
    this.boundHandleMouseMove = this.handleMouseMove.bind(this)
    this.boundHandleMouseUp = this.handleMouseUp.bind(this)
    this.boundHandleKeyDown = this.handleKeyDown.bind(this)
    this.boundHandleKeyUp = this.handleKeyUp.bind(this)
  }

  /**
   * Enter draw mode for a component
   */
  enterDrawMode(component: ComponentItem): void {
    if (this.mode !== 'idle') {
      log.warn(' Already in draw mode')
      return
    }

    this.componentToDraw = component
    this.transitionTo('ready')

    log.info(' Entered draw mode:', component.name)
  }

  /**
   * Cancel current drawing operation
   */
  cancel(): void {
    log.info(' Cancelling draw mode')
    this.cleanup()
    this.transitionTo('idle')
    this.onDrawCancel?.()
  }

  /**
   * Check if in draw mode
   */
  isInDrawMode(): boolean {
    return this.mode !== 'idle'
  }

  /**
   * Get current mode
   */
  getMode(): DrawMode {
    return this.mode
  }

  /**
   * Dispose manager
   */
  dispose(): void {
    this.isDisposed = true
    this.cancel()
    this.renderer.dispose()
    this.guideRenderer.dispose()
  }

  /**
   * Transition to new state.
   *
   * Emits `draw:state-changed` so peripheral UI (GridOverlay et al.) can
   * react. We emit *after* applying the local side-effects so that any
   * synchronous listener observing the new mode also sees the matching
   * cursor / listener attachments.
   */
  private transitionTo(newMode: DrawMode): void {
    const oldMode = this.mode
    this.mode = newMode

    log.debug(`${oldMode} → ${newMode}`)

    // State exit actions
    if (oldMode === 'ready') {
      this.detachReadyListeners()
    } else if (oldMode === 'drawing') {
      this.detachDrawingListeners()
    }

    // State entry actions
    if (newMode === 'ready') {
      this.attachReadyListeners()
      this.setCursor('crosshair')
    } else if (newMode === 'drawing') {
      this.attachDrawingListeners()
    } else if (newMode === 'idle') {
      this.setCursor('default')
      this.componentToDraw = null
    }

    if (oldMode !== newMode) {
      events.emit('draw:state-changed', { mode: newMode, previous: oldMode })
    }
  }

  /**
   * Attach listeners for ready state
   */
  private attachReadyListeners(): void {
    document.addEventListener('mousedown', this.boundHandleMouseDown, true)
    document.addEventListener('keydown', this.boundHandleKeyDown)
  }

  /**
   * Detach listeners for ready state
   */
  private detachReadyListeners(): void {
    document.removeEventListener('mousedown', this.boundHandleMouseDown, true)
    document.removeEventListener('keydown', this.boundHandleKeyDown)
  }

  /**
   * Attach listeners for drawing state
   */
  private attachDrawingListeners(): void {
    document.addEventListener('mousemove', this.boundHandleMouseMove)
    document.addEventListener('mouseup', this.boundHandleMouseUp)
    document.addEventListener('keydown', this.boundHandleKeyDown)
    document.addEventListener('keyup', this.boundHandleKeyUp)
  }

  /**
   * Detach listeners for drawing state
   */
  private detachDrawingListeners(): void {
    document.removeEventListener('mousemove', this.boundHandleMouseMove)
    document.removeEventListener('mouseup', this.boundHandleMouseUp)
    document.removeEventListener('keydown', this.boundHandleKeyDown)
    document.removeEventListener('keyup', this.boundHandleKeyUp)
  }

  /**
   * Handle mousedown (start drawing).
   *
   * Branches on container layout type. Grid containers take the cell-aware
   * path (snap to cell boundaries, write `x N, y M, w P, h Q`). Absolute
   * containers take the legacy pixel-based path. Anything else errors.
   */
  private handleMouseDown(e: MouseEvent): void {
    if (this.mode !== 'ready') return

    e.preventDefault()
    e.stopPropagation()

    // Find container at point
    const containerElement = this.findContainerAtPoint(e.clientX, e.clientY)
    if (!containerElement) {
      this.showError('No container found at this position')
      return
    }

    const layout = detectLayout(containerElement)

    if (layout.type === 'grid') {
      this.startGridDraw(e, containerElement)
      return
    }

    if (layout.type === 'absolute') {
      this.startAbsoluteDraw(e, containerElement, layout.scale)
      return
    }

    this.showError('Can only draw in absolute or grid containers')
  }

  /**
   * Start an absolute-container draw (legacy px-based path).
   */
  private startAbsoluteDraw(e: MouseEvent, containerElement: HTMLElement, scale: number): void {
    const containerNodeId = containerElement.dataset.mirrorId!
    const containerRect = containerElement.getBoundingClientRect()

    const startPoint = this.screenToContainerCoords(e.clientX, e.clientY, containerRect, scale)

    this.drawState = {
      targetType: 'absolute',
      component: this.componentToDraw!,
      containerElement,
      containerNodeId,
      containerRect,
      startPoint,
      currentPoint: startPoint,
      currentRect: { x: startPoint.x, y: startPoint.y, width: 0, height: 0 },
      modifiers: { shift: e.shiftKey, alt: e.altKey, meta: e.metaKey || e.ctrlKey },
      scale,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
    }

    this.transitionTo('drawing')
  }

  /**
   * Start a grid-container draw. The cursor's start cell is captured;
   * subsequent mousemove computes the current cell, and the bounding
   * cell-range becomes the draft rectangle.
   *
   * `gridGeometry` is read once and stashed in the draw state — within a
   * single drag the grid's track sizes are stable, and re-reading on
   * every mousemove would just create avoidable layout thrash.
   */
  private startGridDraw(e: MouseEvent, containerElement: HTMLElement): void {
    const gridGeometry = readGridGeometry(containerElement)
    if (!gridGeometry) {
      this.showError('Grid geometry could not be read (named lines or non-px tracks?)')
      return
    }

    const containerNodeId = containerElement.dataset.mirrorId!
    const containerRect = containerElement.getBoundingClientRect()
    const startCell = pointerToCell({ x: e.clientX, y: e.clientY }, gridGeometry)

    this.drawState = {
      targetType: 'grid',
      component: this.componentToDraw!,
      containerElement,
      containerNodeId,
      containerRect,
      // startPoint/currentPoint stay zero; grid path uses startCell/currentCell.
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      currentRect: { x: 0, y: 0, width: 0, height: 0 },
      modifiers: { shift: e.shiftKey, alt: e.altKey, meta: e.metaKey || e.ctrlKey },
      scale: 1,
      lastClientX: e.clientX,
      lastClientY: e.clientY,
      gridGeometry,
      startCell,
      currentCell: startCell,
    }

    this.transitionTo('drawing')
  }

  /**
   * Handle mousemove (update drawing)
   */
  private handleMouseMove(e: MouseEvent): void {
    if (this.mode !== 'drawing' || !this.drawState || this.isDisposed) return
    if (this.rafId !== null) return // RAF throttle
    this.rafId = requestAnimationFrame(() => {
      if (this.isDisposed || !this.drawState) {
        this.rafId = null
        return
      }
      this.updateDrawing(e.clientX, e.clientY, e.shiftKey, e.altKey, e.metaKey || e.ctrlKey)
      this.rafId = null
    })
  }

  /**
   * Handle mouseup (finish drawing)
   */
  private handleMouseUp(e: MouseEvent): void {
    if (this.mode !== 'drawing') return

    e.preventDefault()
    e.stopPropagation()

    this.finishDrawing()
  }

  /**
   * Handle keydown
   */
  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      this.cancel()
      return
    }

    // Update modifiers during drawing
    if (this.mode === 'drawing' && this.drawState) {
      const oldModifiers = { ...this.drawState.modifiers }
      this.drawState.modifiers = {
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey || e.ctrlKey,
      }

      // Re-render if modifiers changed
      if (JSON.stringify(oldModifiers) !== JSON.stringify(this.drawState.modifiers)) {
        this.updateDrawing(
          this.drawState.lastClientX,
          this.drawState.lastClientY,
          e.shiftKey,
          e.altKey,
          e.metaKey || e.ctrlKey
        )
      }
    }
  }

  /**
   * Handle keyup
   */
  private handleKeyUp(e: KeyboardEvent): void {
    if (this.mode === 'drawing' && this.drawState) {
      this.drawState.modifiers = {
        shift: e.shiftKey,
        alt: e.altKey,
        meta: e.metaKey || e.ctrlKey,
      }
    }
  }

  /**
   * Update drawing — dispatch to the path picked at mousedown.
   */
  private updateDrawing(
    clientX: number,
    clientY: number,
    shift: boolean,
    alt: boolean,
    meta: boolean
  ): void {
    if (!this.drawState) return
    if (this.drawState.targetType === 'grid') {
      this.updateGridDrawing(clientX, clientY)
    } else {
      this.updateAbsoluteDrawing(clientX, clientY, shift, alt, meta)
    }
  }

  /**
   * Absolute-container draw update (legacy px path).
   */
  private updateAbsoluteDrawing(
    clientX: number,
    clientY: number,
    shift: boolean,
    alt: boolean,
    meta: boolean
  ): void {
    if (!this.drawState) return
    const { containerRect, scale, startPoint, containerElement } = this.drawState

    this.drawState.lastClientX = clientX
    this.drawState.lastClientY = clientY

    const currentPoint = this.screenToContainerCoords(clientX, clientY, containerRect, scale)
    this.drawState.currentPoint = currentPoint
    this.drawState.modifiers = { shift, alt, meta }

    let rect = this.calculateRect(startPoint, currentPoint, this.drawState.modifiers)

    const siblings = this.getSiblings(containerElement)
    const snapResult = this.snapIntegration.snap(rect, siblings, containerRect, meta)
    rect = snapResult.rect
    this.drawState.currentRect = rect

    this.renderer.render(rect, containerRect, scale)
    this.guideRenderer.render(snapResult.guides)
  }

  /**
   * Grid-container draw update.
   *
   * Maps the cursor to a cell, then computes the bounding cell-range
   * between startCell and currentCell. The preview rectangle snaps
   * exactly to cell edges — there is no sub-cell precision and there are
   * no smart-guides (cells are already the snap target).
   */
  private updateGridDrawing(clientX: number, clientY: number): void {
    if (!this.drawState) return
    const ds = this.drawState
    const geo = ds.gridGeometry
    const start = ds.startCell
    if (!geo || !start) return

    ds.lastClientX = clientX
    ds.lastClientY = clientY

    const cur = pointerToCell({ x: clientX, y: clientY }, geo)
    ds.currentCell = cur

    const cellRect = cellRangeToRect(geo, start, cur)
    ds.currentRect = cellRect

    const range = cellRange(start, cur)
    // Pass geo.rect (inner content rect, viewport coords) as the
    // "container" anchor and scale=1: rect coordinates are already in
    // viewport-pixel offsets relative to that anchor.
    this.renderer.render(cellRect, geo.rect, 1, range)
    // Grid path doesn't use smart-guides — cell snapping is the alignment.
    this.guideRenderer.clear()
  }

  /**
   * Finish drawing — dispatch on target type. Grid uses cell-indexed
   * coordinates; absolute uses pixels.
   */
  private finishDrawing(): void {
    if (!this.drawState) return
    if (this.drawState.targetType === 'grid') {
      this.finishGridDrawing()
    } else {
      this.finishAbsoluteDrawing()
    }
  }

  /**
   * Absolute path: emit `x N, y N, w N, h N` in pixels (legacy).
   */
  private finishAbsoluteDrawing(): void {
    if (!this.drawState) return
    const { currentRect, containerNodeId, component } = this.drawState

    if (currentRect.width < this.config.minSize || currentRect.height < this.config.minSize) {
      this.showError(`Element too small (minimum ${this.config.minSize}×${this.config.minSize})`)
      this.cleanup()
      this.transitionTo('ready')
      return
    }

    const x = Math.round(currentRect.x)
    const y = Math.round(currentRect.y)
    const w = Math.round(currentRect.width)
    const h = Math.round(currentRect.height)

    const properties = mergePaletteWithPosition(
      component.properties,
      `x ${x}, y ${y}, w ${w}, h ${h}`
    )
    this.commitDraw(containerNodeId, component, properties, { x, y, w, h })
  }

  /**
   * Grid path: emit `x A, y B, w C, h D` in 1-indexed cells. Even a
   * click-without-drag (start == current) produces a 1×1 frame — that
   * keeps the gesture monomorphic: every press/release pair creates one
   * element.
   */
  private finishGridDrawing(): void {
    if (!this.drawState) return
    const ds = this.drawState
    const start = ds.startCell
    const cur = ds.currentCell
    if (!start || !cur) {
      this.cleanup()
      this.transitionTo('idle')
      return
    }
    const range = cellRange(start, cur)
    const properties = mergePaletteWithPosition(
      ds.component.properties,
      `x ${range.x}, y ${range.y}, w ${range.w}, h ${range.h}`
    )
    this.commitDraw(ds.containerNodeId, ds.component, properties, range)
  }

  /**
   * Shared insert+notify path. Both drawing branches funnel through here
   * so error handling and event emission stay in one place.
   */
  private commitDraw(
    containerNodeId: string,
    component: ComponentItem,
    properties: string,
    coords: { x: number; y: number; w: number; h: number }
  ): void {
    try {
      const codeModifier = this.config.getCodeModifier()
      const result = codeModifier.addChild(containerNodeId, component.template, {
        properties,
        textContent: component.textContent,
        position: 'last',
      })

      if (result.success) {
        log.info(' Component created successfully')
        this.onDrawComplete?.({
          success: true,
          nodeId: undefined,
          properties: coords,
          modificationResult: result,
        })
        this.cleanup()
        this.transitionTo('idle')
      } else {
        throw new Error(result.error || 'Failed to create component')
      }
    } catch (error) {
      log.error(' Error creating component:', error)
      this.showError(error instanceof Error ? error.message : 'Failed to create component')
      this.cleanup()
      this.transitionTo('idle')
      this.onError?.(error instanceof Error ? error : new Error(String(error)))
    }
  }

  /**
   * Calculate rectangle from two points
   */
  private calculateRect(start: Point, current: Point, modifiers: Modifiers): Rect {
    // Basic rectangle (handles all 4 corners)
    let x = Math.min(start.x, current.x)
    let y = Math.min(start.y, current.y)
    let width = Math.abs(current.x - start.x)
    let height = Math.abs(current.y - start.y)

    // Enforce minimum size
    width = Math.max(width, this.config.minSize)
    height = Math.max(height, this.config.minSize)

    // Constrain to square (Shift)
    if (modifiers.shift) {
      const size = Math.max(width, height)
      width = size
      height = size
    }

    // Draw from center (Alt)
    if (modifiers.alt) {
      x = start.x - width / 2
      y = start.y - height / 2
    }

    return { x, y, width, height }
  }

  /**
   * Convert screen coordinates to container coordinates
   */
  private screenToContainerCoords(
    screenX: number,
    screenY: number,
    containerRect: DOMRect,
    scale: number
  ): Point {
    return {
      x: (screenX - containerRect.left) / scale,
      y: (screenY - containerRect.top) / scale,
    }
  }

  /**
   * Find container element at point
   */
  private findContainerAtPoint(clientX: number, clientY: number): HTMLElement | null {
    let current = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    if (!current) return null

    // Traverse up until we find a valid absolute container
    while (current) {
      if (current.dataset.mirrorId && this.isValidDrawTarget(current)) {
        return current
      }
      current = current.parentElement
    }

    return null
  }

  /**
   * Get siblings of container for snapping
   */
  private getSiblings(containerElement: HTMLElement): Map<
    string,
    | DOMRect
    | {
        x: number
        y: number
        width: number
        height: number
        top: number
        left: number
        right: number
        bottom: number
      }
  > {
    const siblings = new Map<
      string,
      | DOMRect
      | {
          x: number
          y: number
          width: number
          height: number
          top: number
          left: number
          right: number
          bottom: number
        }
    >()
    const containerNodeId = containerElement.dataset.mirrorId

    // Try to use layoutInfo if available (Phase 5 optimization)
    const layoutInfo = this.config.getLayoutInfo()
    if (layoutInfo && containerNodeId) {
      for (const [nodeId, layout] of layoutInfo) {
        if (layout.parentId === containerNodeId) {
          siblings.set(nodeId, {
            x: layout.x,
            y: layout.y,
            width: layout.width,
            height: layout.height,
            top: layout.y,
            left: layout.x,
            right: layout.x + layout.width,
            bottom: layout.y + layout.height,
          })
        }
      }
      if (siblings.size > 0) {
        return siblings
      }
    }

    // Fallback to DOM reads
    // Get only direct children with mirror-id (not nested descendants)
    const children = containerElement.querySelectorAll(':scope > [data-mirror-id]')
    for (const child of children) {
      const element = child as HTMLElement
      const nodeId = element.dataset.mirrorId
      if (nodeId) {
        siblings.set(nodeId, element.getBoundingClientRect())
      }
    }

    return siblings
  }

  /**
   * Validate if element is a valid draw target.
   *
   * Both absolute and grid containers can host a draw — they map to
   * different coordinate systems but the gesture is the same. Flex/block
   * containers can't represent a "drawn" rectangle without contradicting
   * their layout rules, so we reject those.
   */
  private isValidDrawTarget(element: HTMLElement): boolean {
    if (!element.dataset.mirrorId) {
      return false
    }
    const layout = detectLayout(element)
    return layout.type === 'absolute' || layout.type === 'grid'
  }

  /**
   * Set cursor style
   */
  private setCursor(cursor: 'crosshair' | 'default'): void {
    if (cursor === 'crosshair') {
      document.body.classList.add('draw-cursor-crosshair')
    } else {
      document.body.classList.remove('draw-cursor-crosshair')
    }
  }

  /**
   * Show error message
   */
  private showError(message: string): void {
    log.warn('', message)
    // Emit error event for centralized notification handling
    events.emit('draw:error', { error: message })
  }

  /**
   * Cleanup drawing state
   */
  private cleanup(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.renderer.hide()
    this.guideRenderer.clear()
    this.drawState = null
  }
}

/**
 * Create a DrawManager instance
 */
export function createDrawManager(config: DrawManagerConfig): DrawManager {
  return new DrawManager(config)
}

// =============================================================================
// Property merging
// =============================================================================

/**
 * Properties that the drawn x/y/w/h must override on the palette item.
 *
 * The palette `Frame` ships with `w 100, h 100, bg #27272a, rad 8` — the
 * defaults are great for *click-to-insert*, where the user gets a sensible
 * starting box. But when the user *draws* a rectangle, the drag literally
 * tells us the size and position, so the defaults would conflict.
 *
 * Including alias spellings here matters because the palette source is a
 * raw user-facing string — `w` and `width` are both valid.
 */
const POSITION_OVERRIDDEN_KEYS = new Set(['w', 'width', 'h', 'height', 'x', 'y', 'size'])

/**
 * Merge the palette item's default properties (e.g. `bg`, `rad`) with the
 * draw-derived position string. Position wins on conflicts. Returns just
 * `position` if there are no other defaults to keep.
 */
function mergePaletteWithPosition(paletteProperties: string | undefined, position: string): string {
  if (!paletteProperties || !paletteProperties.trim()) return position
  const kept: string[] = []
  for (const raw of paletteProperties.split(',')) {
    const prop = raw.trim()
    if (!prop) continue
    const key = prop.split(/\s+/)[0]
    if (!POSITION_OVERRIDDEN_KEYS.has(key)) kept.push(prop)
  }
  if (kept.length === 0) return position
  return `${kept.join(', ')}, ${position}`
}
