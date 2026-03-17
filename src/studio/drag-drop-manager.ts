/**
 * DragDropManager - Coordinates drag-and-drop for component insertion
 *
 * Handles:
 * - Drag events on the preview container
 * - Visual feedback via DropZoneCalculator
 * - Code insertion via CodeModifier
 * - Notifies listeners when drop completes
 */

import { DropZoneCalculator, DropZone, SemanticZone, createDropZoneCalculator } from './drop-zone-calculator'
import { CodeModifier, ModificationResult } from './code-modifier'
import { SourceMap } from './source-map'
import { SmartSizingService, createSmartSizingService } from './services/smart-sizing'

/**
 * Timeout for auto-clearing stale drag source (in milliseconds)
 * This prevents drag state from getting stuck if dragend is not fired
 */
const DRAG_SOURCE_CLEANUP_TIMEOUT_MS = 10000

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
  /** Enable smart sizing for new elements (default: true) */
  enableSmartSizing?: boolean
}

/**
 * DragDropManager class
 */
export class DragDropManager {
  private container: HTMLElement
  private dropZoneCalculator: DropZoneCalculator
  private smartSizing: SmartSizingService | null = null
  private options: Required<DragDropManagerOptions> & { enableSmartSizing: boolean }

  private codeModifier: CodeModifier | null = null
  private sourceMap: SourceMap | null = null
  private isDragging = false

  // RAF-throttling for dragover performance
  private pendingDragOver: { x: number; y: number; sourceId?: string } | null = null
  private rafId: number | null = null

  /**
   * Current drag source node ID for move operations.
   *
   * IMPORTANT: This is a workaround for browser security restrictions.
   * During 'dragover' events, dataTransfer.getData() is blocked for security.
   * We store the source node ID here when drag starts, so we can access it
   * during dragover to prevent self-drop and descendant-drop.
   *
   * Set by makeCanvasElementDraggable() on dragstart, cleared on dragend.
   */
  private currentDragSourceId: string | undefined
  private dragSourceCleanupTimer: ReturnType<typeof setTimeout> | null = null

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
      enableSmartSizing: options.enableSmartSizing ?? true,
    }

    this.dropZoneCalculator = createDropZoneCalculator(container, {
      enableSemanticZones: true,
    })

    // Initialize smart sizing if enabled
    if (this.options.enableSmartSizing) {
      this.smartSizing = createSmartSizingService()
    }

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
    this.sourceMap = sourceMap
  }

  /**
   * Validate that the SourceMap is consistent with the DOM.
   * Returns true if validation passes, false if SourceMap is stale.
   *
   * Checks:
   * - SourceMap exists
   * - SourceMap has a main root node
   * - Main root node exists in DOM
   */
  private validateSourceMap(): boolean {
    if (!this.sourceMap) {
      return false
    }

    // Check if main root exists in SourceMap
    const mainRoot = this.sourceMap.getMainRoot()
    if (!mainRoot) {
      console.warn('[DragDropManager] SourceMap has no main root')
      return false
    }

    // Check if main root still exists in DOM
    const rootElement = this.container.querySelector(`[data-mirror-id="${mainRoot.nodeId}"]`)
    if (!rootElement) {
      console.warn('[DragDropManager] SourceMap is stale - root node not found in DOM:', mainRoot.nodeId)
      return false
    }

    return true
  }

  /**
   * Validate that a specific node exists in the DOM.
   * Used to check drop targets before modification.
   */
  private validateNodeInDom(nodeId: string): boolean {
    const element = this.container.querySelector(`[data-mirror-id="${nodeId}"]`)
    if (!element) {
      console.warn('[DragDropManager] Node not found in DOM:', nodeId)
      return false
    }
    return true
  }

  /**
   * Add sizing properties (w, h) to component properties if not already specified.
   * Used by SmartSizing to set initial dimensions for new elements.
   */
  private addSizingProperties(
    properties: string | undefined,
    sizing: { width: string | number; height: string | number }
  ): string {
    // Use regex to match standalone 'w' or 'h' property (not 'maxw', 'minw', etc.)
    // Match: start of string or comma/space followed by w/h followed by space
    const widthPattern = /(^|,\s*)w\s/
    const heightPattern = /(^|,\s*)h\s/

    const hasWidth = properties ? widthPattern.test(properties) : false
    const hasHeight = properties ? heightPattern.test(properties) : false

    if (properties) {
      let result = properties
      if (!hasWidth) {
        result = `${result}, w ${sizing.width}`
      }
      if (!hasHeight) {
        result = `${result}, h ${sizing.height}`
      }
      return result
    } else {
      return `w ${sizing.width}, h ${sizing.height}`
    }
  }

  /**
   * Convert 9-zone alignment values to a SemanticZone.
   *
   * Maps main axis (start/center/end) and cross axis alignment to one of:
   * 'top-left', 'top-center', 'top-right',
   * 'mid-left', 'mid-center', 'mid-right',
   * 'bot-left', 'bot-center', 'bot-right'
   *
   * For vertical containers (column layout):
   * - Main axis = vertical position (top/mid/bot)
   * - Cross axis = horizontal position (left/center/right)
   *
   * For horizontal containers (row layout):
   * - Main axis = horizontal position (left/center/right)
   * - Cross axis = vertical position (top/mid/bot)
   */
  private alignmentToSemanticZone(
    parentDirection: 'horizontal' | 'vertical',
    mainAlignment: 'start' | 'center' | 'end',
    crossAlignment: 'start' | 'center' | 'end'
  ): SemanticZone | null {
    // Map alignment to zone parts
    const mainMap = { start: 'top', center: 'mid', end: 'bot' } as const
    const crossMap = { start: 'left', center: 'center', end: 'right' } as const

    let verticalPart: 'top' | 'mid' | 'bot'
    let horizontalPart: 'left' | 'center' | 'right'

    if (parentDirection === 'vertical') {
      // Vertical container: main = vertical, cross = horizontal
      verticalPart = mainMap[mainAlignment]
      horizontalPart = crossMap[crossAlignment]
    } else {
      // Horizontal container: main = horizontal, cross = vertical
      horizontalPart = crossMap[mainAlignment]
      verticalPart = mainMap[crossAlignment]
    }

    // Build zone name
    const zoneName = `${verticalPart}-${horizontalPart}` as SemanticZone
    return zoneName
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
   *
   * Uses requestAnimationFrame throttling to prevent excessive updates
   * during drag operations. This significantly improves performance
   * especially with many elements on the canvas.
   */
  private handleDragOver(e: DragEvent): void {
    // Check if this is a valid drag
    if (!this.isValidDrag(e)) {
      return
    }

    e.preventDefault()

    // Determine if this is a move or copy operation (lightweight check, always do)
    const isMove = this.isMoveDrag(e)
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = isMove ? 'move' : 'copy'
    }

    // Store pending position for RAF processing
    this.pendingDragOver = {
      x: e.clientX,
      y: e.clientY,
      sourceId: this.getSourceNodeId(e),
    }

    // Schedule RAF update if not already pending
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        this.rafId = null
        if (this.pendingDragOver) {
          try {
            const { x, y, sourceId } = this.pendingDragOver
            const dropZone = this.dropZoneCalculator.updateDropZone(x, y, sourceId)
            this.options.onDragOver(dropZone)
          } catch (error) {
            console.error('[DragDropManager] dragover error:', error)
            this.dropZoneCalculator.clear()
          }
        }
      })
    }
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
      this.pendingDragOver = null // Clear pending RAF state
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
    this.pendingDragOver = null // Clear pending RAF state

    const dropZone = this.dropZoneCalculator.getCurrentDropZone()
    this.dropZoneCalculator.clear()

    try {
      // Get drag data first (needed for both normal and fallback paths)
      const dragData = this.getDragData(e)
      if (!dragData) {
        this.options.onDrop({
          success: false,
          dropZone: null,
          modification: null,
          error: 'No valid drag data',
        })
        return
      }

      // Check if CodeModifier is available
      if (!this.codeModifier) {
        this.options.onDrop({
          success: false,
          dropZone: null,
          modification: null,
          error: 'CodeModifier not initialized. Call setCodeModifier first.',
        })
        return
      }

      // Handle empty canvas case - no drop zone but we have drag data
      if (!dropZone) {
        // Try to find root element to insert into
        if (this.sourceMap) {
          const rootNode = this.sourceMap.getMainRoot()
          if (rootNode) {
            // Find the root element in DOM (if it exists)
            const rootElement = this.container.querySelector(`[data-mirror-id="${rootNode.nodeId}"]`) as HTMLElement | null

            // Create a synthetic drop zone for the root
            const syntheticDropZone: DropZone = {
              targetId: rootNode.nodeId,
              placement: 'inside',
              parentId: rootNode.nodeId,
              element: rootElement || this.container,
            }

            const modification = this.insertComponent(syntheticDropZone, dragData)

            this.options.onDrop({
              success: modification.success,
              dropZone: syntheticDropZone,
              modification,
              error: modification.error,
            })
            return
          }
        }

        // No root found - fail gracefully
        this.options.onDrop({
          success: false,
          dropZone: null,
          modification: null,
          error: 'No valid drop zone and no root element found',
        })
        return
      }

      // Normal case - we have a drop zone
      const modification = this.insertComponent(dropZone, dragData)

      this.options.onDrop({
        success: modification.success,
        dropZone,
        modification,
        error: modification.error,
      })
    } catch (error) {
      console.error('[DragDropManager] drop error:', error)
      this.options.onDrop({
        success: false,
        dropZone,
        modification: null,
        error: error instanceof Error ? error.message : 'Unknown drop error',
      })
    }
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

    // Validate SourceMap consistency
    if (!this.validateSourceMap()) {
      return {
        success: false,
        newSource: '',
        change: { from: 0, to: 0, insert: '' },
        error: 'SourceMap is stale - please refresh the preview',
      }
    }

    // Validate target node exists in DOM
    if (!this.validateNodeInDom(dropZone.targetId)) {
      return {
        success: false,
        newSource: '',
        change: { from: 0, to: 0, insert: '' },
        error: `Target node '${dropZone.targetId}' not found in DOM`,
      }
    }

    const { componentName, textContent, sourceNodeId, isMove } = dragData
    let { properties } = dragData
    const { placement, targetId, semanticZone, parentId, absolutePosition, isAbsoluteContainer } = dropZone

    // Handle move operation
    if (isMove && sourceNodeId) {
      // Validate source node exists in DOM
      if (!this.validateNodeInDom(sourceNodeId)) {
        return {
          success: false,
          newSource: '',
          change: { from: 0, to: 0, insert: '' },
          error: `Source node '${sourceNodeId}' not found in DOM`,
        }
      }

      // For absolute containers, update x/y position instead of reordering
      if (isAbsoluteContainer && absolutePosition) {
        // Check if position actually changed (prevent no-op moves)
        const sourceElement = this.container.querySelector(`[data-mirror-id="${sourceNodeId}"]`) as HTMLElement | null
        if (sourceElement) {
          const currentX = parseInt(sourceElement.style.left || '0', 10)
          const currentY = parseInt(sourceElement.style.top || '0', 10)
          const MOVE_THRESHOLD = 2 // pixels

          // Skip if position change is negligible
          if (Math.abs(absolutePosition.x - currentX) < MOVE_THRESHOLD &&
              Math.abs(absolutePosition.y - currentY) < MOVE_THRESHOLD) {
            return {
              success: true,
              newSource: this.codeModifier.getSource(),
              change: { from: 0, to: 0, insert: '' },
              // No error - this is intentionally a no-op
            }
          }
        }

        // Update x property
        const xResult = this.codeModifier.updateProperty(sourceNodeId, 'x', String(absolutePosition.x))
        if (!xResult.success) {
          return xResult
        }

        // sourceMap is guaranteed to exist here (validated by validateSourceMap above)
        if (!this.sourceMap) {
          return {
            success: false,
            newSource: '',
            change: { from: 0, to: 0, insert: '' },
            error: 'SourceMap not available',
          }
        }

        // Create a new CodeModifier with the updated source for y update
        const updatedModifier = new CodeModifier(xResult.newSource, this.sourceMap)
        const yResult = updatedModifier.updateProperty(sourceNodeId, 'y', String(absolutePosition.y))

        return yResult
      }

      // Handle move with 9-zone alignment for single-child containers
      // When moving the only child within its parent, apply layout based on drop zone
      console.log('[DragDropManager] Move operation:', {
        placement,
        targetId,
        sourceNodeId,
        semanticZone,
        suggestedAlignment: dropZone.suggestedAlignment,
        suggestedCrossAlignment: dropZone.suggestedCrossAlignment,
        parentDirection: dropZone.parentDirection,
      })

      if (placement === 'inside' && this.sourceMap) {
        const targetChildren = this.sourceMap.getChildren(targetId)
        const sourceParent = this.sourceMap.getNodeById(sourceNodeId)?.parentId

        console.log('[DragDropManager] Move inside check:', {
          targetChildrenCount: targetChildren.length,
          targetChildrenIds: targetChildren.map(c => c.nodeId),
          sourceParent,
        })

        // Check if source is the only child of target (repositioning within same parent)
        // OR if target is empty (moving into empty container)
        const isOnlyChildOfTarget = targetChildren.length === 1 &&
          targetChildren[0].nodeId === sourceNodeId
        const isTargetEmpty = targetChildren.length === 0

        console.log('[DragDropManager] Conditions:', {
          isOnlyChildOfTarget,
          isTargetEmpty,
        })

        if (isOnlyChildOfTarget || isTargetEmpty) {
          // Derive semantic zone from alignment suggestions
          let zoneToApply: SemanticZone | null = null

          if (semanticZone) {
            zoneToApply = semanticZone
          } else if (dropZone.suggestedAlignment || dropZone.suggestedCrossAlignment) {
            zoneToApply = this.alignmentToSemanticZone(
              dropZone.parentDirection || 'vertical',
              dropZone.suggestedAlignment || 'start',
              dropZone.suggestedCrossAlignment || 'start'
            )
          }

          console.log('[DragDropManager] Zone to apply:', zoneToApply)

          if (zoneToApply) {
            // Apply layout to container
            const layoutResult = this.codeModifier.applyLayoutToContainer(targetId, zoneToApply)

            console.log('[DragDropManager] Layout result:', {
              success: layoutResult.success,
              hasInsert: !!layoutResult.change.insert,
              insert: layoutResult.change.insert,
              error: layoutResult.error,
            })

            if (layoutResult.success && layoutResult.change.insert) {
              // Layout was applied - if moving within same parent, we're done
              if (isOnlyChildOfTarget && sourceParent === targetId) {
                console.log('[DragDropManager] Returning layout result (same parent)')
                return layoutResult
              }

              // Moving to different container - need to also move the node
              console.log('[DragDropManager] Moving to different container')
              const updatedModifier = new CodeModifier(layoutResult.newSource, this.sourceMap)
              return updatedModifier.moveNode(sourceNodeId, targetId, placement)
            }
          }
        }
      }

      console.log('[DragDropManager] Falling through to simple moveNode')
      return this.codeModifier.moveNode(sourceNodeId, targetId, placement)
    }

    // Only layout containers should get smart sizing - everything else stays "hug"
    // This includes user-defined components, which default to hug for safety
    const LAYOUT_CONTAINERS = ['Box', 'Slot', 'VStack', 'HStack', 'ZStack', 'Grid', 'Sidebar', 'Header/Footer']
    const isLayoutContainer = LAYOUT_CONTAINERS.includes(componentName)

    // Handle absolute positioning - add x/y properties
    if (isAbsoluteContainer && absolutePosition) {
      const absProps = `x ${absolutePosition.x}, y ${absolutePosition.y}`
      if (properties) {
        properties = `${absProps}, ${properties}`
      } else {
        properties = absProps
      }

      // Apply smart sizing only for layout containers in abs containers
      if (this.smartSizing && this.sourceMap && isLayoutContainer) {
        try {
          const sizing = this.smartSizing.calculateInitialSize(
            targetId,
            this.sourceMap,
            this.container
          )
          properties = this.addSizingProperties(properties, sizing)
        } catch (error) {
          console.warn('[DragDropManager] SmartSizing failed for abs container:', error)
          // Continue without smart sizing - element will use default sizes
        }
      }

      // Insert as child of the abs container (no semantic zones for abs layout)
      return this.codeModifier.addChild(targetId, componentName, {
        position: 'last',
        properties,
        textContent,
      })
    }

    // Apply smart sizing only for layout containers (not content primitives or user components)
    if (this.smartSizing && this.sourceMap && !isMove && isLayoutContainer) {
      try {
        // Determine parent for sizing calculation
        const sizingParentId = placement === 'inside' ? targetId : parentId
        const sizing = this.smartSizing.calculateInitialSize(
          sizingParentId,
          this.sourceMap,
          this.container
        )
        properties = this.addSizingProperties(properties, sizing)
      } catch (error) {
        console.warn('[DragDropManager] SmartSizing failed:', error)
        // Continue without smart sizing - element will use default sizes
      }
    }

    // Check if target is a Slot - replace instead of insert
    const targetElement = this.container.querySelector(`[data-mirror-id="${targetId}"]`)
    const isSlot = targetElement?.getAttribute('data-mirror-slot') === 'true'

    if (isSlot) {
      // Replace the Slot with the new component, transferring Slot's properties
      return this.codeModifier.replaceSlot(targetId, componentName, {
        properties,
        textContent,
      })
    }

    // Handle copy/insert operation
    if (placement === 'inside') {
      // Check for semantic zone - generates wrapper if needed
      if (semanticZone) {
        return this.codeModifier.insertWithWrapper(targetId, componentName, semanticZone, {
          position: 'last',
          properties,
          textContent,
        })
      }

      // For empty containers: convert 9-zone alignment to SemanticZone
      // This sets the CONTAINER alignment, so all siblings share the same alignment
      let suggestedAlignment = dropZone.suggestedAlignment
      let suggestedCrossAlignment = dropZone.suggestedCrossAlignment
      const parentDirection = dropZone.parentDirection

      // Fallback: if no alignment was calculated but the container is empty, use top-left
      // This handles edge cases where dragover didn't properly detect the empty container
      if (!suggestedAlignment && !suggestedCrossAlignment) {
        const targetElement = dropZone.element
        const hasChildren = this.hasChildrenWithNodeId(targetElement)
        if (!hasChildren) {
          // Empty container: default to top-left (start, start)
          suggestedAlignment = 'start'
          suggestedCrossAlignment = 'start'
        }
      }

      if (suggestedAlignment || suggestedCrossAlignment) {
        const derivedZone = this.alignmentToSemanticZone(
          parentDirection || 'vertical',
          suggestedAlignment || 'start',
          suggestedCrossAlignment || 'start'
        )

        if (derivedZone) {
          return this.codeModifier.insertWithWrapper(targetId, componentName, derivedZone, {
            position: 'last',
            properties,
            textContent,
          })
        }
      }

      // Insert as child of target (no semantic zone or alignment)
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
   * Set the current drag source for move operations.
   *
   * Called by makeCanvasElementDraggable() on dragstart/dragend.
   * This enables self-drop prevention during dragover when dataTransfer
   * is not accessible due to browser security restrictions.
   *
   * Includes auto-cleanup after 10 seconds to prevent stale state if dragend
   * is not fired (e.g., browser bug, ESC pressed in some browsers).
   *
   * @param nodeId - The node ID being dragged, or undefined to clear
   */
  setDragSource(nodeId: string | undefined): void {
    // Clear any existing cleanup timer
    if (this.dragSourceCleanupTimer) {
      clearTimeout(this.dragSourceCleanupTimer)
      this.dragSourceCleanupTimer = null
    }

    this.currentDragSourceId = nodeId

    // Set auto-cleanup timer when setting a drag source
    if (nodeId) {
      this.dragSourceCleanupTimer = setTimeout(() => {
        if (this.currentDragSourceId === nodeId) {
          console.warn('[DragDropManager] Auto-clearing stale drag source:', nodeId)
          this.currentDragSourceId = undefined
        }
        this.dragSourceCleanupTimer = null
      }, DRAG_SOURCE_CLEANUP_TIMEOUT_MS)
    }
  }

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
   * Extract and validate drag data from event
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

      // Validate required field
      if (typeof data.componentName !== 'string' || !data.componentName.trim()) {
        console.warn('[DragDropManager] Invalid drag data: missing componentName')
        return null
      }

      // Return validated data with safe defaults
      return {
        componentName: data.componentName.trim(),
        properties: typeof data.properties === 'string' ? data.properties : undefined,
        textContent: typeof data.textContent === 'string' ? data.textContent : undefined,
        sourceNodeId: typeof data.sourceNodeId === 'string' ? data.sourceNodeId : undefined,
        isMove: data.isMove === true,
      }
    } catch {
      // If not JSON, treat as component name (must be non-empty string)
      const trimmed = dataStr.trim()
      if (trimmed) {
        return { componentName: trimmed }
      }
      return null
    }
  }

  /**
   * Check if an element has any children with data-mirror-id attribute
   */
  private hasChildrenWithNodeId(element: HTMLElement): boolean {
    for (const child of Array.from(element.children)) {
      if ((child as HTMLElement).hasAttribute?.('data-mirror-id')) {
        return true
      }
    }
    return false
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
    // Clear drag source cleanup timer
    if (this.dragSourceCleanupTimer) {
      clearTimeout(this.dragSourceCleanupTimer)
      this.dragSourceCleanupTimer = null
    }
    this.currentDragSourceId = undefined

    // Cancel any pending RAF
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
    this.pendingDragOver = null

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
