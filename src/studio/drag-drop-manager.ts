/**
 * DragDropManager - Coordinates drag-and-drop for component insertion
 *
 * Handles:
 * - Drag events on the preview container
 * - Visual feedback via DropZoneCalculator
 * - Code insertion via CodeModifier
 * - Notifies listeners when drop completes
 */

import { DropZoneCalculator, DropZone, createDropZoneCalculator } from './drop-zone-calculator'
import { CodeModifier, ModificationResult } from './code-modifier'
import { SourceMap } from './source-map'

/**
 * Data transferred during drag operation
 */
export interface DragData {
  /** The component name to insert */
  componentName: string
  /** Optional properties string */
  properties?: string
  /** Optional text content */
  textContent?: string
  /** Source node ID for move operations (from canvas) */
  sourceNodeId?: string
  /** Whether this is a move operation (vs copy) */
  isMove?: boolean
}

/**
 * Result of a drop operation
 */
export interface DropResult {
  success: boolean
  dropZone: DropZone | null
  modification: ModificationResult | null
  error?: string
}

/**
 * Callback when drop completes
 */
export type DropCallback = (result: DropResult) => void

/**
 * Options for DragDropManager
 */
export interface DragDropManagerOptions {
  /** Custom data type for drag/drop (default: 'application/mirror-component') */
  dataType?: string
  /** Callback when drop completes */
  onDrop?: DropCallback
  /** Callback when drag enters the container */
  onDragEnter?: () => void
  /** Callback when drag leaves the container */
  onDragLeave?: () => void
  /** Callback during drag (with current drop zone) */
  onDragOver?: (dropZone: DropZone | null) => void
}

/**
 * DragDropManager class
 */
export class DragDropManager {
  private container: HTMLElement
  private dropZoneCalculator: DropZoneCalculator
  private options: Required<DragDropManagerOptions>

  private codeModifier: CodeModifier | null = null
  private isDragging = false

  private boundHandleDragOver: (e: DragEvent) => void
  private boundHandleDragEnter: (e: DragEvent) => void
  private boundHandleDragLeave: (e: DragEvent) => void
  private boundHandleDrop: (e: DragEvent) => void

  constructor(container: HTMLElement, options: DragDropManagerOptions = {}) {
    this.container = container
    this.options = {
      dataType: options.dataType || 'application/mirror-component',
      onDrop: options.onDrop || (() => {}),
      onDragEnter: options.onDragEnter || (() => {}),
      onDragLeave: options.onDragLeave || (() => {}),
      onDragOver: options.onDragOver || (() => {}),
    }

    this.dropZoneCalculator = createDropZoneCalculator(container)

    // Bind event handlers
    this.boundHandleDragOver = this.handleDragOver.bind(this)
    this.boundHandleDragEnter = this.handleDragEnter.bind(this)
    this.boundHandleDragLeave = this.handleDragLeave.bind(this)
    this.boundHandleDrop = this.handleDrop.bind(this)

    this.attach()
  }

  /**
   * Update the CodeModifier (call after source/sourceMap changes)
   */
  setCodeModifier(source: string, sourceMap: SourceMap): void {
    this.codeModifier = new CodeModifier(source, sourceMap)
  }

  /**
   * Attach event listeners
   */
  attach(): void {
    this.container.addEventListener('dragover', this.boundHandleDragOver)
    this.container.addEventListener('dragenter', this.boundHandleDragEnter)
    this.container.addEventListener('dragleave', this.boundHandleDragLeave)
    this.container.addEventListener('drop', this.boundHandleDrop)
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    this.container.removeEventListener('dragover', this.boundHandleDragOver)
    this.container.removeEventListener('dragenter', this.boundHandleDragEnter)
    this.container.removeEventListener('dragleave', this.boundHandleDragLeave)
    this.container.removeEventListener('drop', this.boundHandleDrop)

    this.dropZoneCalculator.clear()
  }

  /**
   * Handle dragover event
   */
  private handleDragOver(e: DragEvent): void {
    // Check if this is a valid drag
    if (!this.isValidDrag(e)) {
      return
    }

    e.preventDefault()

    // Determine if this is a move or copy operation
    const isMove = this.isMoveDrag(e)
    e.dataTransfer!.dropEffect = isMove ? 'move' : 'copy'

    // Update drop zone indicators, passing source node for self-drop prevention
    const sourceNodeId = this.getSourceNodeId(e)
    const dropZone = this.dropZoneCalculator.updateDropZone(e.clientX, e.clientY, sourceNodeId)
    this.options.onDragOver(dropZone)
  }

  /**
   * Handle dragenter event
   */
  private handleDragEnter(e: DragEvent): void {
    if (!this.isValidDrag(e)) {
      return
    }

    if (!this.isDragging) {
      this.isDragging = true
      this.options.onDragEnter()
    }
  }

  /**
   * Handle dragleave event
   */
  private handleDragLeave(e: DragEvent): void {
    const relatedTarget = e.relatedTarget as HTMLElement | null

    // Only trigger leave if actually leaving the container
    if (!relatedTarget || !this.container.contains(relatedTarget)) {
      this.isDragging = false
      this.dropZoneCalculator.clear()
      this.options.onDragLeave()
    }
  }

  /**
   * Handle drop event
   */
  private handleDrop(e: DragEvent): void {
    e.preventDefault()
    this.isDragging = false

    const dropZone = this.dropZoneCalculator.getCurrentDropZone()
    this.dropZoneCalculator.clear()

    if (!dropZone) {
      this.options.onDrop({
        success: false,
        dropZone: null,
        modification: null,
        error: 'No valid drop zone',
      })
      return
    }

    // Get drag data
    const dragData = this.getDragData(e)
    if (!dragData) {
      this.options.onDrop({
        success: false,
        dropZone,
        modification: null,
        error: 'No valid drag data',
      })
      return
    }

    // Check if CodeModifier is available
    if (!this.codeModifier) {
      this.options.onDrop({
        success: false,
        dropZone,
        modification: null,
        error: 'CodeModifier not initialized. Call setCodeModifier first.',
      })
      return
    }

    // Perform the code modification
    const modification = this.insertComponent(dropZone, dragData)

    this.options.onDrop({
      success: modification.success,
      dropZone,
      modification,
      error: modification.error,
    })
  }

  /**
   * Insert or move a component based on drop zone
   */
  private insertComponent(dropZone: DropZone, dragData: DragData): ModificationResult {
    if (!this.codeModifier) {
      return {
        success: false,
        newSource: '',
        change: { from: 0, to: 0, insert: '' },
        error: 'CodeModifier not available',
      }
    }

    const { componentName, properties, textContent, sourceNodeId, isMove } = dragData
    const { placement, targetId } = dropZone

    // Handle move operation
    if (isMove && sourceNodeId) {
      return this.codeModifier.moveNode(sourceNodeId, targetId, placement)
    }

    // Handle copy/insert operation
    if (placement === 'inside') {
      // Insert as child of target
      return this.codeModifier.addChild(targetId, componentName, {
        position: 'last',
        properties,
        textContent,
      })
    } else {
      // Insert as sibling (before or after)
      return this.codeModifier.addChildRelativeTo(
        targetId,
        componentName,
        placement,
        { properties, textContent }
      )
    }
  }

  /**
   * Check if this is a move operation (from canvas)
   */
  private isMoveDrag(e: DragEvent): boolean {
    if (!e.dataTransfer) return false
    // Check for move data type
    const types = Array.from(e.dataTransfer.types)
    return types.includes('application/mirror-move')
  }

  /**
   * Get source node ID from drag event (for move operations)
   */
  private getSourceNodeId(e: DragEvent): string | undefined {
    if (!e.dataTransfer) return undefined
    // During dragover, we can't access data directly due to security
    // But we store the sourceNodeId in a global state when drag starts
    return this.currentDragSourceId
  }

  /**
   * Set the current drag source (called from makeCanvasElementDraggable)
   */
  setDragSource(nodeId: string | undefined): void {
    this.currentDragSourceId = nodeId
  }

  private currentDragSourceId: string | undefined

  /**
   * Check if the drag event is valid for this manager
   */
  private isValidDrag(e: DragEvent): boolean {
    if (!e.dataTransfer) return false

    // Check for our custom data type
    const types = Array.from(e.dataTransfer.types)
    return types.includes(this.options.dataType) || types.includes('text/plain')
  }

  /**
   * Extract drag data from event
   */
  private getDragData(e: DragEvent): DragData | null {
    if (!e.dataTransfer) return null

    // Try custom data type first
    let dataStr = e.dataTransfer.getData(this.options.dataType)

    // Fall back to text/plain
    if (!dataStr) {
      dataStr = e.dataTransfer.getData('text/plain')
    }

    if (!dataStr) return null

    try {
      // Try parsing as JSON
      const data = JSON.parse(dataStr)
      if (data.componentName) {
        return data as DragData
      }
    } catch {
      // If not JSON, treat as component name
      return { componentName: dataStr }
    }

    return null
  }

  /**
   * Get the current drop zone (for external queries)
   */
  getCurrentDropZone(): DropZone | null {
    return this.dropZoneCalculator.getCurrentDropZone()
  }

  /**
   * Ensure indicator elements exist in the DOM
   * Call this after preview content updates (which may remove indicators)
   */
  ensureIndicators(): void {
    this.dropZoneCalculator.ensureIndicators()
  }

  /**
   * Dispose the manager
   */
  dispose(): void {
    this.detach()
    this.dropZoneCalculator.dispose()
    this.codeModifier = null
  }
}

/**
 * Create a DragDropManager for a container
 */
export function createDragDropManager(
  container: HTMLElement,
  options?: DragDropManagerOptions
): DragDropManager {
  return new DragDropManager(container, options)
}

/**
 * Helper to make an element draggable with component data
 *
 * Usage:
 * ```
 * makeDraggable(iconElement, {
 *   componentName: 'Button',
 *   properties: 'bg #3B82F6',
 *   textContent: 'Click me'
 * })
 * ```
 */
export function makeDraggable(
  element: HTMLElement,
  dragData: DragData,
  dataType = 'application/mirror-component'
): void {
  element.draggable = true

  element.addEventListener('dragstart', (e: DragEvent) => {
    if (e.dataTransfer) {
      // Set both custom type and text/plain for compatibility
      const dataStr = JSON.stringify(dragData)
      e.dataTransfer.setData(dataType, dataStr)
      e.dataTransfer.setData('text/plain', dataStr)
      e.dataTransfer.effectAllowed = 'copy'
    }
  })
}

/**
 * Helper to make a canvas element draggable for move operations
 *
 * Usage:
 * ```
 * makeCanvasElementDraggable(element, 'node-5', dragDropManager)
 * ```
 */
export function makeCanvasElementDraggable(
  element: HTMLElement,
  nodeId: string,
  manager: DragDropManager,
  dataType = 'application/mirror-component'
): () => void {
  element.draggable = true

  const handleDragStart = (e: DragEvent) => {
    // CRITICAL: Stop propagation to prevent parent elements from being dragged
    e.stopPropagation()

    if (e.dataTransfer) {
      // Get component name from element
      const componentName = element.dataset.mirrorName || element.tagName.toLowerCase()

      const dragData: DragData = {
        componentName,
        sourceNodeId: nodeId,
        isMove: true,
      }

      const dataStr = JSON.stringify(dragData)
      e.dataTransfer.setData(dataType, dataStr)
      e.dataTransfer.setData('application/mirror-move', nodeId)
      e.dataTransfer.setData('text/plain', dataStr)
      e.dataTransfer.effectAllowed = 'move'

      // Webflow-style: Use transparent drag image (only show drop indicator line)
      const transparentImg = new Image()
      transparentImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
      e.dataTransfer.setDragImage(transparentImg, 0, 0)

      // Notify manager of drag source for self-drop prevention
      manager.setDragSource(nodeId)

      // Add dragging style - reduce opacity of source element
      element.style.opacity = '0.4'
      element.style.outline = '2px dashed #3B82F6'
    }
  }

  const handleDragEnd = () => {
    // Clear drag source
    manager.setDragSource(undefined)
    // Restore styles
    element.style.opacity = ''
    element.style.outline = ''
  }

  element.addEventListener('dragstart', handleDragStart)
  element.addEventListener('dragend', handleDragEnd)

  // Return cleanup function
  return () => {
    element.removeEventListener('dragstart', handleDragStart)
    element.removeEventListener('dragend', handleDragEnd)
    element.draggable = false
  }
}
