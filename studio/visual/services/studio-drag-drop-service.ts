/**
 * StudioDragDropService - Production drag-drop service for Mirror Studio
 *
 * This service:
 * - Supports both HTML5 drag API and custom mouse events
 * - Uses testable models for all calculations
 * - Integrates with CodeModifier for code changes
 * - Provides backward-compatible API with legacy DragDropManager
 */

import { DragController, createDragController, type DragMoveState } from '../controllers/drag-controller'
import { DragRenderer, createDragRenderer, type RenderState } from '../renderers/drag-renderer'
import type { DragResult, DragSource, Point, Rect } from '../models/drag-state'
import type { DropZone } from '../models/drop-zone'
import type { AlignmentZoneResult, ZoneId, HorizontalZone, VerticalZone } from '../models/alignment-zone'
import { CodeModifier, ModificationResult } from '../../../src/studio/code-modifier'
import { SourceMap } from '../../../src/studio/source-map'
import { getDefaultSize } from '../renderers/ghost-factory'
import { getDefaultRegistry } from '../../../src/studio/drop-strategies/registry'
import type { LayoutDropResult, FlexDropResult, DropContext } from '../../../src/studio/drop-strategies/types'
import type { SemanticZone } from '../../../src/studio/drop-zone-calculator'
import { getComponentTemplate } from '../../../src/schema/component-templates'
import { deriveSemanticZone } from '../../../src/studio/drop-strategies/flex-strategy'

// ============================================================================
// Types
// ============================================================================

export interface StudioDragDropConfig {
  /** Grid size for snapping (0 = disabled) */
  gridSize?: number
  /** Enable smart guides */
  enableGuides?: boolean
  /** Enable 9-zone alignment */
  enableAlignmentZones?: boolean
  /** Data type for HTML5 drag (default: 'application/mirror-component') */
  dataType?: string
}

export interface StudioDragDropCallbacks {
  /** Called when a drop completes */
  onDrop?: (result: StudioDropResult) => void
  /** Called when drag enters the container */
  onDragEnter?: () => void
  /** Called when drag leaves the container */
  onDragLeave?: () => void
  /** Called during drag (with current state) */
  onDragOver?: (state: DragOverState | null) => void
}

export interface StudioDropResult {
  success: boolean
  modification: ModificationResult | null
  error?: string
  /** Source component or node info */
  source?: {
    type: 'palette' | 'element'
    componentName?: string
    nodeId?: string
  }
}

export interface DragOverState {
  /** Target element */
  element: HTMLElement
  /** Target node ID */
  nodeId: string
  /** Ghost rect for visual feedback */
  ghostRect: Rect
  /** Whether aligned to a zone */
  alignmentZone: AlignmentZoneResult | null
}

// Internal drag data from HTML5 events
interface DragData {
  componentName: string
  properties?: string
  textContent?: string
  sourceNodeId?: string
  isMove?: boolean
}

// Palette drag data (set when drag starts from component panel)
export interface PaletteDragData {
  componentName: string
  properties?: string
  textContent?: string
  defaultSize?: { width: number; height: number }
}

// ============================================================================
// StudioDragDropService
// ============================================================================

export class StudioDragDropService {
  private container: HTMLElement
  private config: StudioDragDropConfig
  private callbacks: StudioDragDropCallbacks
  private dataType: string

  // Code modification
  private codeModifier: CodeModifier | null = null
  private sourceMap: SourceMap | null = null

  // Visual feedback
  private renderer: DragRenderer

  // State
  private isDraggingFlag = false
  private currentDragData: DragData | null = null
  private currentDragSourceId: string | undefined
  private pendingDragOver: { x: number; y: number } | null = null
  private rafId: number | null = null

  // Palette drag data (cached from component panel drag start)
  private paletteDragData: PaletteDragData | null = null

  // Current drop result from strategy calculation (persists between dragover and drop)
  private currentDropResult: LayoutDropResult | null = null

  // Bound event handlers for HTML5 drag
  private boundHandleDragOver: (e: DragEvent) => void
  private boundHandleDragEnter: (e: DragEvent) => void
  private boundHandleDragLeave: (e: DragEvent) => void
  private boundHandleDrop: (e: DragEvent) => void

  constructor(
    container: HTMLElement,
    config: StudioDragDropConfig = {},
    callbacks: StudioDragDropCallbacks = {}
  ) {
    this.container = container
    this.config = config
    this.callbacks = callbacks
    this.dataType = config.dataType ?? 'application/mirror-component'

    // Create renderer for visual feedback
    this.renderer = createDragRenderer(container)

    // Bind HTML5 drag event handlers
    this.boundHandleDragOver = this.handleDragOver.bind(this)
    this.boundHandleDragEnter = this.handleDragEnter.bind(this)
    this.boundHandleDragLeave = this.handleDragLeave.bind(this)
    this.boundHandleDrop = this.handleDrop.bind(this)

    this.attach()
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  /**
   * Update CodeModifier (call after source/sourceMap changes)
   */
  setCodeModifier(source: string, sourceMap: SourceMap): void {
    this.codeModifier = new CodeModifier(source, sourceMap)
    this.sourceMap = sourceMap
  }

  /**
   * Set drag source for move operations (used by makeCanvasElementDraggable)
   */
  setDragSource(nodeId: string | undefined): void {
    this.currentDragSourceId = nodeId
  }

  /**
   * Set palette drag data (called when drag starts from component panel)
   * This enables the ghost preview during drag
   */
  setPaletteDragData(data: PaletteDragData | null): void {
    this.paletteDragData = data
  }

  /**
   * Update grid size
   */
  setGridSize(size: number): void {
    this.config.gridSize = size
  }

  /**
   * Check if currently dragging
   */
  isDragging(): boolean {
    return this.isDraggingFlag
  }

  /**
   * Ensure indicator elements exist (call after preview updates)
   */
  ensureIndicators(): void {
    // Renderer manages its own elements, no action needed
  }

  /**
   * Dispose service
   */
  dispose(): void {
    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    // Detach event listeners (catch and log errors)
    try {
      this.detach()
    } catch (e) {
      console.warn('[StudioDragDropService] Detach failed:', e)
    }

    // Cleanup renderer (catch and log errors)
    try {
      this.renderer.dispose()
    } catch (e) {
      console.warn('[StudioDragDropService] Renderer dispose failed:', e)
    }

    // Clear references
    this.codeModifier = null
    this.sourceMap = null
    this.paletteDragData = null
    this.pendingDragOver = null
    this.currentDropResult = null
  }

  // --------------------------------------------------------------------------
  // Event Attachment
  // --------------------------------------------------------------------------

  private attach(): void {
    this.container.addEventListener('dragover', this.boundHandleDragOver)
    this.container.addEventListener('dragenter', this.boundHandleDragEnter)
    this.container.addEventListener('dragleave', this.boundHandleDragLeave)
    this.container.addEventListener('drop', this.boundHandleDrop)
  }

  private detach(): void {
    this.container.removeEventListener('dragover', this.boundHandleDragOver)
    this.container.removeEventListener('dragenter', this.boundHandleDragEnter)
    this.container.removeEventListener('dragleave', this.boundHandleDragLeave)
    this.container.removeEventListener('drop', this.boundHandleDrop)
    this.renderer.clear()
  }

  // --------------------------------------------------------------------------
  // HTML5 Drag Event Handlers
  // --------------------------------------------------------------------------

  private handleDragOver(e: DragEvent): void {
    if (!this.isValidDrag(e)) return

    e.preventDefault()

    // Set drop effect
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = this.currentDragSourceId ? 'move' : 'copy'
    }

    // Store pending position for RAF processing
    this.pendingDragOver = { x: e.clientX, y: e.clientY }

    // Schedule RAF update if not already pending
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        // Capture pending position BEFORE clearing rafId
        // This prevents race conditions where a new RAF is scheduled
        // while processDragOver is still executing
        const pending = this.pendingDragOver
        this.pendingDragOver = null
        this.rafId = null

        if (pending) {
          this.processDragOver(pending.x, pending.y)
        }
      })
    }
  }

  private processDragOver(x: number, y: number): void {
    // Find target element at position
    const element = this.findDropTarget(x, y)

    if (element) {
      const nodeId = element.dataset.mirrorId
      if (!nodeId) {
        console.warn('[DragOver] Element missing data-mirror-id, skipping')
        return
      }
      const rect = element.getBoundingClientRect()

      // Calculate ghost rect for palette drags
      let ghostRect: Rect | null = null
      if (this.paletteDragData) {
        const size = this.paletteDragData.defaultSize ||
          getDefaultSize(this.paletteDragData.componentName)
        ghostRect = {
          x: x - size.width / 2,
          y: y - size.height / 2,
          width: size.width,
          height: size.height,
        }
      }

      // Calculate drop zone using strategy
      const dropResult = this.calculateDropZone(element, x, y)
      this.currentDropResult = dropResult

      // Determine indicator based on drop result
      let indicatorRect: Rect
      let indicatorDirection: 'horizontal' | 'vertical' = 'horizontal'
      let alignmentZone: AlignmentZoneResult | null = null

      if (dropResult) {
        // Type-safe access to flex-specific properties
        const isFlexResult = dropResult.layoutType === 'flex'
        const direction = isFlexResult ? (dropResult as FlexDropResult).direction : 'vertical'
        const suggestedAlignment = isFlexResult ? (dropResult as FlexDropResult).suggestedAlignment : undefined

        if (dropResult.placement === 'inside' && suggestedAlignment) {
          // Empty container: show zone indicator
          alignmentZone = this.buildAlignmentZoneResult(
            dropResult as FlexDropResult,
            rect
          )
          indicatorRect = { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        } else if (dropResult.placement === 'before' || dropResult.placement === 'after') {
          // Sibling insertion: show line indicator
          // Find the sibling element that the drop is relative to
          const siblingElement = this.findElementByNodeId(dropResult.targetId)
          if (siblingElement) {
            indicatorRect = this.calculateSiblingIndicatorRect(dropResult, siblingElement, direction)
          } else {
            // Sibling not found - this can happen during rapid DOM updates
            // Fall back to hover element position
            console.warn(`[DragDrop] Sibling element not found: ${dropResult.targetId}, using hover target`)
            indicatorRect = this.calculateSiblingIndicatorRect(dropResult, element, direction)
          }
          indicatorDirection = direction === 'horizontal' ? 'vertical' : 'horizontal'
        } else {
          // Default: simple indicator
          indicatorRect = this.calculateIndicatorRect(x, y, element)
        }
      } else {
        indicatorRect = this.calculateIndicatorRect(x, y, element)
      }

      // Build drag over state
      const state: DragOverState = {
        element,
        nodeId,
        ghostRect: ghostRect || {
          x: rect.left,
          y: rect.top,
          width: rect.width,
          height: rect.height,
        },
        alignmentZone,
      }

      // Render visual feedback
      this.renderer.render({
        ghostRect,
        indicatorRect,
        indicatorDirection,
        alignmentZone,
        guides: [],
        isActive: true,
        // Pass component info for ghost rendering
        componentName: this.paletteDragData?.componentName,
        componentProperties: this.paletteDragData?.properties,
        componentTextContent: this.paletteDragData?.textContent,
      })

      this.callbacks.onDragOver?.(state)
    } else {
      this.currentDropResult = null
      this.renderer.clear()
      this.callbacks.onDragOver?.(null)
    }
  }

  /**
   * Calculate drop zone using layout strategy
   */
  private calculateDropZone(element: HTMLElement, x: number, y: number): LayoutDropResult | null {
    const registry = getDefaultRegistry()
    const strategy = registry.getStrategy(element)

    if (!strategy) {
      return null
    }

    // Build context for strategy
    const children = this.getChildElements(element)
    const containerRect = element.getBoundingClientRect()

    const context: DropContext = {
      clientX: x,
      clientY: y,
      containerRect,
      children,
      sourceNodeId: this.currentDragSourceId,
    }

    return strategy.calculateDropZone(element, context)
  }

  /**
   * Get child elements with their node IDs
   */
  private getChildElements(container: HTMLElement): Array<{ element: HTMLElement; nodeId: string }> {
    const children: Array<{ element: HTMLElement; nodeId: string }> = []

    for (const child of Array.from(container.children)) {
      if (child instanceof HTMLElement && child.dataset.mirrorId) {
        children.push({
          element: child,
          nodeId: child.dataset.mirrorId,
        })
      }
    }

    return children
  }

  /**
   * Build alignment zone result for visual feedback
   */
  private buildAlignmentZoneResult(
    flexResult: FlexDropResult,
    containerRect: DOMRect
  ): AlignmentZoneResult {
    // Map start/center/end to zone position
    const xMap = { start: 0.15, center: 0.5, end: 0.85 }
    const yMap = { start: 0.15, center: 0.5, end: 0.85 }

    const direction = flexResult.direction || 'vertical'
    const isHorizontal = direction === 'horizontal'
    const mainAlign = flexResult.suggestedAlignment || 'center'
    const crossAlign = flexResult.suggestedCrossAlignment || 'center'

    const xRatio = isHorizontal ? xMap[mainAlign] : xMap[crossAlign]
    const yRatio = isHorizontal ? yMap[crossAlign] : yMap[mainAlign]

    // Map start/center/end to horizontal/vertical
    const horizontalAlign = isHorizontal ? mainAlign : crossAlign
    const verticalAlign = isHorizontal ? crossAlign : mainAlign
    const horizontalMap: Record<'start' | 'center' | 'end', HorizontalZone> = {
      start: 'left',
      center: 'center',
      end: 'right',
    }
    const verticalMap: Record<'start' | 'center' | 'end', VerticalZone> = {
      start: 'top',
      center: 'center',
      end: 'bottom',
    }
    const horizontal = horizontalMap[horizontalAlign]
    const vertical = verticalMap[verticalAlign]

    // Build zone ID (AlignmentZoneResult uses "center-center" not "center")
    const zoneId = `${vertical}-${horizontal}` as ZoneId

    return {
      zone: zoneId,
      horizontal,
      vertical,
      alignProperty: deriveSemanticZone(mainAlign, crossAlign, direction) || 'center',
      indicatorPosition: {
        x: containerRect.left + containerRect.width * xRatio,
        y: containerRect.top + containerRect.height * yRatio,
      },
    }
  }

  /**
   * Calculate indicator rect for sibling insertion
   */
  private calculateSiblingIndicatorRect(
    dropResult: LayoutDropResult,
    element: HTMLElement,
    direction: 'horizontal' | 'vertical'
  ): Rect {
    const rect = element.getBoundingClientRect()
    const thickness = 3

    if (direction === 'horizontal') {
      // Vertical line for horizontal layout
      const xPos = dropResult.placement === 'before' ? rect.left : rect.right
      return {
        x: xPos - thickness / 2,
        y: rect.top,
        width: thickness,
        height: rect.height,
      }
    } else {
      // Horizontal line for vertical layout
      const yPos = dropResult.placement === 'before' ? rect.top : rect.bottom
      return {
        x: rect.left,
        y: yPos - thickness / 2,
        width: rect.width,
        height: thickness,
      }
    }
  }

  private handleDragEnter(e: DragEvent): void {
    if (!this.isValidDrag(e)) return

    if (!this.isDraggingFlag) {
      this.isDraggingFlag = true
      this.callbacks.onDragEnter?.()
    }
  }

  private handleDragLeave(e: DragEvent): void {
    const relatedTarget = e.relatedTarget as HTMLElement | null

    // Only trigger leave if actually leaving the container
    if (!relatedTarget || !this.container.contains(relatedTarget)) {
      this.isDraggingFlag = false
      this.pendingDragOver = null
      this.paletteDragData = null
      this.currentDropResult = null
      // Cancel any pending RAF to prevent stale updates
      if (this.rafId !== null) {
        cancelAnimationFrame(this.rafId)
        this.rafId = null
      }
      this.renderer.clear()
      this.callbacks.onDragLeave?.()
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault()
    this.isDraggingFlag = false
    this.pendingDragOver = null
    this.paletteDragData = null
    // Capture drop result before clearing (needed for performDrop)
    const dropResult = this.currentDropResult
    this.currentDropResult = null
    // Cancel any pending RAF to prevent stale updates after drop
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.renderer.clear()

    // Get drag data
    const dragData = this.getDragData(e)
    if (!dragData) {
      this.callbacks.onDrop?.({
        success: false,
        modification: null,
        error: 'No valid drag data',
      })
      return
    }

    // Check CodeModifier
    if (!this.codeModifier || !this.sourceMap) {
      this.callbacks.onDrop?.({
        success: false,
        modification: null,
        error: 'CodeModifier not initialized',
      })
      return
    }

    // Find drop target
    const element = this.findDropTarget(e.clientX, e.clientY)
    if (!element) {
      // Try root element
      const rootNode = this.sourceMap.getMainRoot()
      if (rootNode) {
        const result = this.insertAtRoot(dragData, rootNode.nodeId)
        this.callbacks.onDrop?.(result)
        return
      }

      this.callbacks.onDrop?.({
        success: false,
        modification: null,
        error: 'No valid drop target',
      })
      return
    }

    // Perform the drop
    const result = this.performDrop(dragData, element, dropResult)
    this.callbacks.onDrop?.(result)
  }

  // --------------------------------------------------------------------------
  // Drop Handling
  // --------------------------------------------------------------------------

  private performDrop(
    dragData: DragData,
    element: HTMLElement,
    dropResult: LayoutDropResult | null
  ): StudioDropResult {
    const { componentName, properties, textContent, sourceNodeId, isMove } = dragData

    // Handle move operation
    if (isMove && sourceNodeId) {
      return this.performMoveOperation(sourceNodeId, dropResult, element)
    }

    // Handle insert operation with strategy-based placement
    return this.performInsertOperation(componentName, dropResult, element, properties, textContent)
  }

  /**
   * Perform move operation (element being repositioned)
   */
  private performMoveOperation(
    sourceNodeId: string,
    dropResult: LayoutDropResult | null,
    element: HTMLElement
  ): StudioDropResult {
    const targetId = element.dataset.mirrorId
    if (!targetId) {
      return {
        success: false,
        modification: null,
        error: 'Drop target missing data-mirror-id',
      }
    }

    // Determine placement from drop result
    let placement: 'before' | 'after' | 'inside' = 'inside'
    let moveTargetId = targetId

    if (dropResult) {
      placement = dropResult.placement
      moveTargetId = dropResult.targetId
    }

    const modification = this.codeModifier!.moveNode(sourceNodeId, moveTargetId, placement)
    return {
      success: modification.success,
      modification,
      error: modification.error,
      source: { type: 'element', nodeId: sourceNodeId },
    }
  }

  /**
   * Perform insert operation (new component from palette)
   */
  private performInsertOperation(
    componentName: string,
    dropResult: LayoutDropResult | null,
    element: HTMLElement,
    properties?: string,
    textContent?: string
  ): StudioDropResult {
    const targetId = element.dataset.mirrorId
    if (!targetId) {
      return {
        success: false,
        modification: null,
        error: 'Drop target missing data-mirror-id',
      }
    }

    // Check if component has a multi-line template
    const template = getComponentTemplate(componentName)

    // If no drop result, fallback to simple addChild
    if (!dropResult) {
      const modification = template
        ? this.codeModifier!.addChildWithTemplate(targetId, template.code, { position: 'last' })
        : this.codeModifier!.addChild(targetId, componentName, { position: 'last', properties, textContent })
      return {
        success: modification.success,
        modification,
        error: modification.error,
        source: { type: 'palette', componentName },
      }
    }

    // Type-safe access to flex-specific properties
    const isFlexResult = dropResult.layoutType === 'flex'
    const direction = isFlexResult ? (dropResult as FlexDropResult).direction : 'vertical'
    const suggestedAlignment = isFlexResult ? (dropResult as FlexDropResult).suggestedAlignment : undefined
    const suggestedCrossAlignment = isFlexResult ? (dropResult as FlexDropResult).suggestedCrossAlignment : undefined
    let modification: ModificationResult

    if (dropResult.placement === 'inside') {
      // Inside placement: check for semantic zone (empty container with alignment)
      if (suggestedAlignment) {
        // Derive semantic zone from alignment
        const semanticZone = deriveSemanticZone(
          suggestedAlignment,
          suggestedCrossAlignment || 'center',
          direction
        ) || 'center'

        // Zone other than center: apply layout + insert
        if (semanticZone !== 'center') {
          if (template) {
            // First apply layout, then insert template
            const layoutResult = this.codeModifier!.applyLayoutToContainer(dropResult.targetId, semanticZone)
            if (!layoutResult.success) {
              return {
                success: false,
                modification: layoutResult,
                error: layoutResult.error,
                source: { type: 'palette', componentName },
              }
            }
            modification = this.codeModifier!.addChildWithTemplate(dropResult.targetId, template.code, { position: 'last' })
          } else {
            // Use insertWithWrapper for single-line components
            modification = this.codeModifier!.insertWithWrapper(
              dropResult.targetId,
              componentName,
              semanticZone,
              { properties, textContent }
            )
          }
        } else {
          // Center zone: simple insert
          modification = template
            ? this.codeModifier!.addChildWithTemplate(dropResult.targetId, template.code, { position: 'last' })
            : this.codeModifier!.addChild(dropResult.targetId, componentName, { position: 'last', properties, textContent })
        }
      } else {
        // No alignment (container with children): simple insert
        modification = template
          ? this.codeModifier!.addChildWithTemplate(dropResult.targetId, template.code, { position: 'last' })
          : this.codeModifier!.addChild(dropResult.targetId, componentName, { position: 'last', properties, textContent })
      }
    } else {
      // Before/after placement: sibling insertion
      modification = template
        ? this.codeModifier!.addChildWithTemplateRelativeTo(dropResult.targetId, template.code, dropResult.placement)
        : this.codeModifier!.addChildRelativeTo(dropResult.targetId, componentName, dropResult.placement, { properties, textContent })
    }

    return {
      success: modification.success,
      modification,
      error: modification.error,
      source: { type: 'palette', componentName },
    }
  }

  private insertAtRoot(dragData: DragData, rootId: string): StudioDropResult {
    const { componentName, properties, textContent } = dragData

    // Check for template
    const template = getComponentTemplate(componentName)

    const modification = template
      ? this.codeModifier!.addChildWithTemplate(rootId, template.code, { position: 'last' })
      : this.codeModifier!.addChild(rootId, componentName, { position: 'last', properties, textContent })

    return {
      success: modification.success,
      modification,
      error: modification.error,
      source: { type: 'palette', componentName },
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private isValidDrag(e: DragEvent): boolean {
    if (!e.dataTransfer) return false
    const types = Array.from(e.dataTransfer.types)
    return types.includes(this.dataType) || types.includes('text/plain')
  }

  private getDragData(e: DragEvent): DragData | null {
    if (!e.dataTransfer) return null

    let dataStr = e.dataTransfer.getData(this.dataType)
    if (!dataStr) {
      dataStr = e.dataTransfer.getData('text/plain')
    }
    if (!dataStr) return null

    try {
      const data = JSON.parse(dataStr)
      if (typeof data.componentName !== 'string' || !data.componentName.trim()) {
        return null
      }
      return {
        componentName: data.componentName.trim(),
        properties: typeof data.properties === 'string' ? data.properties : undefined,
        textContent: typeof data.textContent === 'string' ? data.textContent : undefined,
        sourceNodeId: typeof data.sourceNodeId === 'string' ? data.sourceNodeId : undefined,
        isMove: data.isMove === true,
      }
    } catch {
      const trimmed = dataStr.trim()
      if (trimmed) {
        return { componentName: trimmed }
      }
      return null
    }
  }

  private findDropTarget(x: number, y: number): HTMLElement | null {
    // Find deepest element with data-mirror-id at position
    // Use elementsFromPoint if available (not in older JSDOM versions)
    try {
      if (typeof document.elementsFromPoint === 'function') {
        const elements = document.elementsFromPoint(x, y)
        for (const el of elements) {
          if (el instanceof HTMLElement && el.dataset.mirrorId) {
            // Skip the drag source itself
            if (this.currentDragSourceId && el.dataset.mirrorId === this.currentDragSourceId) {
              continue
            }
            return el
          }
        }
      } else if (typeof document.elementFromPoint === 'function') {
        // Fallback: use elementFromPoint
        let el = document.elementFromPoint(x, y)
        while (el) {
          if (el instanceof HTMLElement && el.dataset.mirrorId) {
            if (this.currentDragSourceId && el.dataset.mirrorId === this.currentDragSourceId) {
              el = el.parentElement
              continue
            }
            return el
          }
          el = el.parentElement
        }
      }
    } catch {
      // JSDOM or test environment may not support these methods
      // Fall through to container-based fallback
    }

    // Final fallback: search container for elements at position
    const elements = this.container.querySelectorAll('[data-mirror-id]')
    for (const el of Array.from(elements).reverse()) {
      const htmlEl = el as HTMLElement
      if (typeof htmlEl.getBoundingClientRect === 'function') {
        const rect = htmlEl.getBoundingClientRect()
        if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
          // Use dataset instead of getAttribute for better performance
          const nodeId = htmlEl.dataset.mirrorId
          if (this.currentDragSourceId && nodeId === this.currentDragSourceId) {
            continue
          }
          return htmlEl
        }
      }
    }

    return null
  }

  private calculateIndicatorRect(x: number, y: number, element: HTMLElement): Rect {
    const rect = element.getBoundingClientRect()
    // Simple horizontal line at drop position
    return {
      x: rect.left,
      y: y,
      width: rect.width,
      height: 2,
    }
  }

  /**
   * Find element by node ID
   */
  private findElementByNodeId(nodeId: string): HTMLElement | null {
    return this.container.querySelector(`[data-mirror-id="${nodeId}"]`) as HTMLElement | null
  }
}

// ============================================================================
// Factory
// ============================================================================

export function createStudioDragDropService(
  container: HTMLElement,
  config?: StudioDragDropConfig,
  callbacks?: StudioDragDropCallbacks
): StudioDragDropService {
  return new StudioDragDropService(container, config, callbacks)
}

// ============================================================================
// Helper: Make palette item draggable (HTML5 drag API)
// ============================================================================

export function makePaletteDraggable(
  element: HTMLElement,
  dragData: { componentName: string; properties?: string; textContent?: string },
  dataType = 'application/mirror-component'
): void {
  element.draggable = true

  element.addEventListener('dragstart', (e: DragEvent) => {
    if (e.dataTransfer) {
      const dataStr = JSON.stringify(dragData)
      e.dataTransfer.setData(dataType, dataStr)
      e.dataTransfer.setData('text/plain', dataStr)
      e.dataTransfer.effectAllowed = 'copy'
    }
  })
}

// ============================================================================
// Helper: Make canvas element draggable for moves (HTML5 drag API)
// ============================================================================

export function makeCanvasElementDraggable(
  element: HTMLElement,
  nodeId: string,
  service: StudioDragDropService,
  dataType = 'application/mirror-component'
): () => void {
  element.draggable = true

  const handleDragStart = (e: DragEvent) => {
    e.stopPropagation()

    if (e.dataTransfer) {
      const componentName = element.dataset.mirrorName || element.tagName.toLowerCase()

      const dragData = {
        componentName,
        sourceNodeId: nodeId,
        isMove: true,
      }

      const dataStr = JSON.stringify(dragData)
      e.dataTransfer.setData(dataType, dataStr)
      e.dataTransfer.setData('application/mirror-move', nodeId)
      e.dataTransfer.setData('text/plain', dataStr)
      e.dataTransfer.effectAllowed = 'move'

      // Transparent drag image
      const transparentImg = new Image()
      transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      e.dataTransfer.setDragImage(transparentImg, 0, 0)

      // Notify service
      service.setDragSource(nodeId)

      // Visual feedback
      element.style.opacity = '0.4'
      element.style.outline = '2px dashed #3B82F6'
    }
  }

  const handleDragEnd = () => {
    service.setDragSource(undefined)
    element.style.opacity = ''
    element.style.outline = ''
  }

  element.addEventListener('dragstart', handleDragStart)
  element.addEventListener('dragend', handleDragEnd)

  return () => {
    element.removeEventListener('dragstart', handleDragStart)
    element.removeEventListener('dragend', handleDragEnd)
    element.draggable = false
  }
}
