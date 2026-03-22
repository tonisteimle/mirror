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
import type { AlignmentZoneResult } from '../models/alignment-zone'
import { CodeModifier, ModificationResult } from '../../../src/studio/code-modifier'
import { SourceMap } from '../../../src/studio/source-map'
import { getDefaultSize } from '../renderers/ghost-factory'

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
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.detach()
    this.renderer.dispose()
    this.codeModifier = null
    this.sourceMap = null
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
      const nodeId = element.dataset.mirrorId!
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
        alignmentZone: null, // TODO: Detect alignment zone
      }

      // Render visual feedback
      this.renderer.render({
        ghostRect,
        indicatorRect: this.calculateIndicatorRect(x, y, element),
        indicatorDirection: 'horizontal',
        alignmentZone: null,
        guides: [],
        isActive: true,
        // Pass component info for ghost rendering
        componentName: this.paletteDragData?.componentName,
        componentProperties: this.paletteDragData?.properties,
        componentTextContent: this.paletteDragData?.textContent,
      })

      this.callbacks.onDragOver?.(state)
    } else {
      this.renderer.clear()
      this.callbacks.onDragOver?.(null)
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
      this.renderer.clear()
      this.callbacks.onDragLeave?.()
    }
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault()
    this.isDraggingFlag = false
    this.pendingDragOver = null
    this.paletteDragData = null
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
    const result = this.performDrop(dragData, element, e.clientX, e.clientY)
    this.callbacks.onDrop?.(result)
  }

  // --------------------------------------------------------------------------
  // Drop Handling
  // --------------------------------------------------------------------------

  private performDrop(
    dragData: DragData,
    element: HTMLElement,
    x: number,
    y: number
  ): StudioDropResult {
    const targetId = element.dataset.mirrorId!
    const { componentName, properties, textContent, sourceNodeId, isMove } = dragData

    // Handle move operation
    if (isMove && sourceNodeId) {
      const modification = this.codeModifier!.moveNode(sourceNodeId, targetId, 'inside')
      return {
        success: modification.success,
        modification,
        error: modification.error,
        source: { type: 'element', nodeId: sourceNodeId },
      }
    }

    // Handle insert operation
    const modification = this.codeModifier!.addChild(targetId, componentName, {
      position: 'last',
      properties,
      textContent,
    })

    return {
      success: modification.success,
      modification,
      error: modification.error,
      source: { type: 'palette', componentName },
    }
  }

  private insertAtRoot(dragData: DragData, rootId: string): StudioDropResult {
    const { componentName, properties, textContent } = dragData

    const modification = this.codeModifier!.addChild(rootId, componentName, {
      position: 'last',
      properties,
      textContent,
    })

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
          const nodeId = htmlEl.getAttribute('data-mirror-id')
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
