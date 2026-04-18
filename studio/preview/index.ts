/**
 * Preview Module - Preview Controller
 */

import {
  state,
  actions,
  events,
  executor,
  ResizeCommand,
  SetPropertyCommand,
  MoveNodeWithLayoutCommand,
  createLayoutService,
  setLayoutService,
  type LayoutService,
} from '../core'
import type { SourceMap } from '../../compiler/ir/source-map'
import { HandleManager, createHandleManager } from './handle-manager'
import { KeyboardHandler, createKeyboardHandler } from './keyboard-handler'
import { ContextMenu, createContextMenu } from './context-menu'
import { OverlayManager, createOverlayManager } from '../visual/overlay-manager'
import { ResizeManager, createResizeManager, type SizingMode } from '../visual/resize-manager'
import { PaddingManager, createPaddingManager, type PaddingHandle } from '../visual/padding-manager'
import { MarginManager, createMarginManager, type MarginHandle } from '../visual/margin-manager'
import { SlotVisibilityService, createSlotVisibilityService } from './slot-visibility'
import { DragPreview, createDragPreview } from './drag-preview'

// Re-export renderer
export {
  PreviewRenderer,
  createPreviewRenderer,
  BaseRenderer,
  type PreviewMode,
  type PreviewData,
  type RendererConfig,
} from './renderer'

// Re-export handle manager
export {
  HandleManager,
  createHandleManager,
  type Handle,
  type HandleType,
  type HandleDirection,
  type HandleManagerConfig,
} from './handle-manager'

// Re-export keyboard handler
export {
  KeyboardHandler,
  createKeyboardHandler,
  type KeyboardHandlerConfig,
} from './keyboard-handler'

// Re-export context menu
export { ContextMenu, createContextMenu, type ContextMenuConfig } from './context-menu'

// Re-export visual code system
export {
  OverlayManager,
  createOverlayManager,
  type OverlayManagerConfig,
  type SemanticZone,
} from '../visual/overlay-manager'

export {
  ResizeManager,
  createResizeManager,
  type ResizeManagerConfig,
  type ResizeHandle,
  type ResizeState,
  type SizingMode,
} from '../visual/resize-manager'

export {
  PaddingManager,
  createPaddingManager,
  type PaddingManagerConfig,
  type PaddingHandle,
  type PaddingState,
} from '../visual/padding-manager'

// Re-export slot visibility
export {
  SlotVisibilityService,
  createSlotVisibilityService,
  type SlotVisibilityConfig,
} from './slot-visibility'

// Re-export constants
export {
  MIRROR_ID_ATTR,
  MIRROR_ID_SELECTOR,
  COMPONENT_ATTR,
  LINE_ATTR,
  NAME_ATTR,
  LAYOUT_ATTR,
  STACKED_ATTR,
  mirrorIdSelector,
} from './constants'

// Re-export breadcrumb
export { PreviewBreadcrumb, createPreviewBreadcrumb, type BreadcrumbConfig } from './breadcrumb'

export interface PreviewConfig {
  container: HTMLElement
  selectedClass?: string
  hoverClass?: string
  nodeIdAttribute?: string
  enableSelection?: boolean
  enableHover?: boolean
  /** Enable direct manipulation handles for padding, gap, radius */
  enableHandles?: boolean
  /** Enable keyboard shortcuts (Cmd/Ctrl+G for grouping, etc.) */
  enableKeyboardShortcuts?: boolean
  /** Enable context menu (right-click menu for group, ungroup, delete, etc.) */
  enableContextMenu?: boolean
  /** Enable visual code system (resize handles, drop zones) */
  enableVisualCode?: boolean
}

export type SelectionCallback = (nodeId: string | null, element: HTMLElement | null) => void
export type HoverCallback = (nodeId: string | null, element: HTMLElement | null) => void

export class PreviewController {
  private container: HTMLElement
  private config: Required<PreviewConfig>
  private sourceMap: SourceMap | null = null
  private sourceMapVersion: number = 0
  private selectedNodeId: string | null = null
  private hoveredNodeId: string | null = null
  private selectionCallbacks: Set<SelectionCallback> = new Set()
  private hoverCallbacks: Set<HoverCallback> = new Set()
  private boundHandleClick: (e: MouseEvent) => void
  private boundHandleDoubleClick: (e: MouseEvent) => void
  private boundHandleMouseOver: (e: MouseEvent) => void
  private boundHandleMouseOut: (e: MouseEvent) => void
  private handleManager: HandleManager | null = null
  private keyboardHandler: KeyboardHandler | null = null
  private contextMenu: ContextMenu | null = null

  // Visual Code System
  private overlayManager: OverlayManager | null = null
  private resizeManager: ResizeManager | null = null
  private paddingManager: PaddingManager | null = null
  private marginManager: MarginManager | null = null
  private handleMode: 'resize' | 'padding' | 'margin' = 'resize'

  // Slot Visibility System
  private slotVisibilityService: SlotVisibilityService | null = null

  // Drag Preview (component ghost when dragging over canvas)
  private dragPreview: DragPreview | null = null

  // Layout Service for unified layout cache access
  private layoutService: LayoutService | null = null

  // Event subscriptions
  private unsubscribeCompile: (() => void) | null = null
  private unsubscribeMultiSelection: (() => void) | null = null
  private unsubscribeResize: (() => void) | null = null
  private unsubscribePaddingToggle: (() => void) | null = null
  private unsubscribePaddingEnd: (() => void) | null = null
  private unsubscribeMarginToggle: (() => void) | null = null
  private unsubscribeMarginEnd: (() => void) | null = null
  private unsubscribeZoom: (() => void) | null = null
  private unsubscribePreviewRendered: (() => void) | null = null

  // Layout invalidation handlers
  private boundHandleScroll: () => void
  private boundHandleWindowResize: () => void

  // Debounce timer for window resize (avoids excessive invalidation)
  private resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null
  private static readonly RESIZE_DEBOUNCE_MS = 100

  // Multi-selection tracking for consistent highlighting
  private highlightedNodeIds: Set<string> = new Set()

  constructor(config: PreviewConfig) {
    this.container = config.container
    this.config = {
      container: config.container,
      selectedClass: config.selectedClass ?? 'studio-selected',
      hoverClass: config.hoverClass ?? 'studio-hover',
      nodeIdAttribute: config.nodeIdAttribute ?? 'data-mirror-id',
      enableSelection: config.enableSelection ?? true,
      enableHover: config.enableHover ?? true,
      enableHandles: config.enableHandles ?? true,
      enableKeyboardShortcuts: config.enableKeyboardShortcuts ?? false,
      enableContextMenu: config.enableContextMenu ?? false,
      enableVisualCode: config.enableVisualCode ?? false,
    }
    this.boundHandleClick = this.handleClick.bind(this)
    this.boundHandleDoubleClick = this.handleDoubleClick.bind(this)
    this.boundHandleMouseOver = this.handleMouseOver.bind(this)
    this.boundHandleMouseOut = this.handleMouseOut.bind(this)

    // Layout invalidation handlers
    this.boundHandleScroll = this.handleContainerScroll.bind(this)
    this.boundHandleWindowResize = this.handleWindowResize.bind(this)

    // Initialize LayoutService for unified layout cache access
    this.layoutService = createLayoutService({
      container: this.container,
      nodeIdAttribute: this.config.nodeIdAttribute,
    })
    setLayoutService(this.layoutService)

    // Initialize handle manager if enabled
    if (this.config.enableHandles) {
      this.handleManager = createHandleManager({
        container: this.container,
      })
    }

    // Initialize keyboard handler if enabled
    if (this.config.enableKeyboardShortcuts) {
      this.keyboardHandler = createKeyboardHandler({ container: this.container })
      this.keyboardHandler.attach()
    }

    // Initialize context menu if enabled
    if (this.config.enableContextMenu) {
      this.contextMenu = createContextMenu({ container: this.container })
      this.contextMenu.attach()
    }

    // Initialize Visual Code System if enabled
    if (this.config.enableVisualCode) {
      this.initVisualCodeSystem()
    }

    // Initialize Slot Visibility Service (always enabled)
    this.slotVisibilityService = createSlotVisibilityService({
      container: this.container,
    })

    // Initialize Drag Preview (always enabled)
    this.dragPreview = createDragPreview({
      container: this.container,
    })
    this.dragPreview.attach()

    // Subscribe to compile:completed for automatic refresh
    // This ensures handles and highlights stay in sync with DOM changes
    this.unsubscribeCompile = events.on('compile:completed', () => {
      this.setSourceMap(state.get().sourceMap)
      // Invalidate layout cache BEFORE refresh - DOM has changed, cached positions are stale
      actions.invalidateLayoutInfo('manual')
      this.refresh()
    })

    // Subscribe to multiselection:changed for consistent highlight updates
    // This ensures multi-selection UI stays in sync when changed via commands/undo
    this.unsubscribeMultiSelection = events.on('multiselection:changed', () => {
      this.updateMultiSelectionHighlight()
    })

    // Subscribe to preview:zoom for layout cache invalidation and handle refresh
    this.unsubscribeZoom = events.on('preview:zoom', () => {
      actions.invalidateLayoutInfo('zoom')
      // Refresh resize handles to update their positions after zoom
      // Use requestAnimationFrame to ensure DOM has been updated
      requestAnimationFrame(() => {
        this.resizeManager?.refresh()
        this.paddingManager?.refresh()
        this.marginManager?.refresh()
      })
    })

    // Subscribe to preview:rendered to ensure handles are in sync after DOM updates
    // This catches cases where layout changes happen through the render pipeline
    this.unsubscribePreviewRendered = events.on('preview:rendered', ({ success }) => {
      if (success && this.selectedNodeId) {
        // Double RAF to ensure layout extraction has completed
        // (render pipeline uses RAF, we need to wait for that + one more frame)
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.resizeManager?.refresh()
            this.paddingManager?.refresh()
          })
        })
      }
    })

    // Add scroll listener on container for layout cache invalidation
    this.container.addEventListener('scroll', this.boundHandleScroll, { passive: true })

    // Add window resize listener for layout cache invalidation
    window.addEventListener('resize', this.boundHandleWindowResize, { passive: true })
  }

  /**
   * Handle container scroll - invalidates layout cache and refreshes handles
   */
  private handleContainerScroll(): void {
    actions.invalidateLayoutInfo('scroll')
    // Refresh resize handles to update their positions after scroll
    this.resizeManager?.refresh()
    this.paddingManager?.refresh()
    this.marginManager?.refresh()
  }

  /**
   * Handle window resize - invalidates layout cache and refreshes handles (debounced)
   *
   * Debouncing prevents excessive invalidation during continuous resize events
   * (e.g., when user drags window edge). Invalidates once after resize settles.
   */
  private handleWindowResize(): void {
    // Clear pending debounce
    if (this.resizeDebounceTimer !== null) {
      clearTimeout(this.resizeDebounceTimer)
    }

    // Debounce: invalidate after resize settles
    this.resizeDebounceTimer = setTimeout(() => {
      this.resizeDebounceTimer = null
      actions.invalidateLayoutInfo('resize')
      // Refresh resize handles to update their positions after window resize
      this.resizeManager?.refresh()
      this.paddingManager?.refresh()
      this.marginManager?.refresh()
    }, PreviewController.RESIZE_DEBOUNCE_MS)
  }

  /** Initialize the Visual Code System (overlay + resize + padding + inline align) */
  private initVisualCodeSystem(): void {
    this.overlayManager = createOverlayManager({ container: this.container })
    this.resizeManager = createResizeManager({
      container: this.container,
      overlayManager: this.overlayManager,
      getSourceMap: () => this.sourceMap as any,
      // LayoutService is now used via global singleton (getLayoutService())
    })
    this.paddingManager = createPaddingManager({
      container: this.container,
      overlayManager: this.overlayManager,
      getSourceMap: () => this.sourceMap as any,
    })
    this.marginManager = createMarginManager({
      container: this.container,
      overlayManager: this.overlayManager,
      getSourceMap: () => this.sourceMap as any,
    })

    // Listen for resize:end events to execute commands
    this.unsubscribeResize = events.on(
      'resize:end',
      (data: {
        nodeId: string
        width?: SizingMode
        height?: SizingMode
        x?: number
        y?: number
      }) => {
        // Execute resize command for width/height (only if at least one dimension is specified)
        if (data.width !== undefined || data.height !== undefined) {
          const command = new ResizeCommand({
            nodeId: data.nodeId,
            width:
              data.width === undefined ? undefined : data.width === 'fill' ? 'full' : data.width,
            height:
              data.height === undefined ? undefined : data.height === 'fill' ? 'full' : data.height,
          })
          executor.execute(command)
        }

        // Execute additional commands for x/y position changes (absolute positioned elements)
        if (data.x !== undefined) {
          executor.execute(
            new SetPropertyCommand({
              nodeId: data.nodeId,
              property: 'x',
              value: String(data.x),
            })
          )
        }
        if (data.y !== undefined) {
          executor.execute(
            new SetPropertyCommand({
              nodeId: data.nodeId,
              property: 'y',
              value: String(data.y),
            })
          )
        }
      }
    )

    // Listen for padding toggle events (P key)
    this.unsubscribePaddingToggle = events.on(
      'handles:toggle-padding',
      (data: { nodeId: string }) => {
        this.toggleHandleMode(data.nodeId)
      }
    )

    // Listen for padding:end events to execute commands
    this.unsubscribePaddingEnd = events.on(
      'padding:end',
      (data: { nodeId: string; handle: PaddingHandle; mode: string; padding: number }) => {
        // Determine property based on mode:
        // - single: pad-t, pad-r, pad-b, pad-l (individual side)
        // - all: pad (all sides uniform)
        // - axis: pad-x or pad-y (horizontal or vertical pair)
        let property: string
        if (data.mode === 'all') {
          property = 'pad'
        } else if (data.mode === 'axis') {
          property = data.handle === 'top' || data.handle === 'bottom' ? 'pad-y' : 'pad-x'
        } else {
          // Single side: map handle to directional property
          const singlePropertyMap: Record<PaddingHandle, string> = {
            top: 'pad-t',
            right: 'pad-r',
            bottom: 'pad-b',
            left: 'pad-l',
          }
          property = singlePropertyMap[data.handle]
        }

        executor.execute(
          new SetPropertyCommand({
            nodeId: data.nodeId,
            property,
            value: String(data.padding),
          })
        )

        // Refresh property panel to show updated padding value
        events.emit('selection:refresh', { nodeId: data.nodeId })
      }
    )

    // Listen for margin toggle events (M key)
    this.unsubscribeMarginToggle = events.on(
      'handles:toggle-margin',
      (data: { nodeId: string }) => {
        this.toggleMarginMode(data.nodeId)
      }
    )

    // Listen for margin:end events to execute commands
    this.unsubscribeMarginEnd = events.on(
      'margin:end',
      (data: { nodeId: string; handle: MarginHandle; mode: string; margin: number }) => {
        // Determine property based on mode:
        // - single: mar-t, mar-r, mar-b, mar-l (individual side)
        // - all: mar (all sides uniform)
        // - axis: mar-x or mar-y (horizontal or vertical pair)
        let property: string
        if (data.mode === 'all') {
          property = 'mar'
        } else if (data.mode === 'axis') {
          property = data.handle === 'top' || data.handle === 'bottom' ? 'mar-y' : 'mar-x'
        } else {
          // Single side: map handle to directional property
          const singlePropertyMap: Record<MarginHandle, string> = {
            top: 'mar-t',
            right: 'mar-r',
            bottom: 'mar-b',
            left: 'mar-l',
          }
          property = singlePropertyMap[data.handle]
        }

        executor.execute(
          new SetPropertyCommand({
            nodeId: data.nodeId,
            property,
            value: String(data.margin),
          })
        )

        // Refresh property panel to show updated margin value
        events.emit('selection:refresh', { nodeId: data.nodeId })
      }
    )
  }

  /**
   * Toggle between resize and padding handle modes (P key)
   * - From resize → padding
   * - From margin → padding (direct switch)
   * - From padding → resize
   */
  private toggleHandleMode(nodeId: string): void {
    if (this.handleMode === 'resize' || this.handleMode === 'margin') {
      // Switch to padding mode (from resize or margin)
      this.handleMode = 'padding'
      this.resizeManager?.hideHandles()
      this.marginManager?.hideHandles()
      this.paddingManager?.showHandles(nodeId)
    } else {
      // Switch back to resize mode (from padding)
      this.handleMode = 'resize'
      this.paddingManager?.hideHandles()
      this.marginManager?.hideHandles()
      this.resizeManager?.showHandles(nodeId)
    }
  }

  /**
   * Toggle between resize and margin handle modes (M key)
   * - From resize → margin
   * - From padding → margin (direct switch)
   * - From margin → resize
   */
  private toggleMarginMode(nodeId: string): void {
    if (this.handleMode === 'resize' || this.handleMode === 'padding') {
      // Switch to margin mode (from resize or padding)
      this.handleMode = 'margin'
      this.resizeManager?.hideHandles()
      this.paddingManager?.hideHandles()
      this.marginManager?.showHandles(nodeId)
    } else {
      // Switch back to resize mode (from margin)
      this.handleMode = 'resize'
      this.paddingManager?.hideHandles()
      this.marginManager?.hideHandles()
      this.resizeManager?.showHandles(nodeId)
    }
  }

  attach(): void {
    this.detach()

    // Make container focusable for keyboard event routing
    // tabIndex=-1 allows programmatic focus but not Tab navigation
    if (this.container.tabIndex < 0) {
      this.container.tabIndex = -1
    }
    // Remove outline when focused (visual focus is shown via selection highlight)
    this.container.style.outline = 'none'

    if (this.config.enableSelection) {
      this.container.addEventListener('click', this.boundHandleClick)
      this.container.addEventListener('dblclick', this.boundHandleDoubleClick)
    }
    if (this.config.enableHover) {
      this.container.addEventListener('mouseover', this.boundHandleMouseOver)
      this.container.addEventListener('mouseout', this.boundHandleMouseOut)
    }
    this.slotVisibilityService?.attach()
  }

  detach(): void {
    this.container.removeEventListener('click', this.boundHandleClick)
    this.container.removeEventListener('dblclick', this.boundHandleDoubleClick)
    this.container.removeEventListener('mouseover', this.boundHandleMouseOver)
    this.container.removeEventListener('mouseout', this.boundHandleMouseOut)
    // Stop observing slot visibility
    this.slotVisibilityService?.detach()
  }

  /** Re-apply visual selection after preview DOM refresh */
  refresh(): void {
    this.overlayManager?.ensureOverlay()
    this.refreshSelection()
    this.updateMultiSelectionHighlight()
    this.slotVisibilityService?.refresh()
  }

  /** Re-show selection highlight and handles for current selection */
  private refreshSelection(): void {
    if (this.selectedNodeId) this.showSelectionUI(this.selectedNodeId)
  }

  /** Dispose the controller */
  dispose(): void {
    // Unsubscribe from events
    this.unsubscribeCompile?.()
    this.unsubscribeCompile = null
    this.unsubscribeMultiSelection?.()
    this.unsubscribeMultiSelection = null
    this.unsubscribeResize?.()
    this.unsubscribeResize = null
    this.unsubscribePaddingToggle?.()
    this.unsubscribePaddingToggle = null
    this.unsubscribePaddingEnd?.()
    this.unsubscribePaddingEnd = null
    this.unsubscribeMarginToggle?.()
    this.unsubscribeMarginToggle = null
    this.unsubscribeMarginEnd?.()
    this.unsubscribeMarginEnd = null
    this.unsubscribeZoom?.()
    this.unsubscribeZoom = null
    this.unsubscribePreviewRendered?.()
    this.unsubscribePreviewRendered = null

    // Cancel pending resize debounce
    if (this.resizeDebounceTimer !== null) {
      clearTimeout(this.resizeDebounceTimer)
      this.resizeDebounceTimer = null
    }

    // Remove layout invalidation listeners
    this.container.removeEventListener('scroll', this.boundHandleScroll)
    window.removeEventListener('resize', this.boundHandleWindowResize)

    this.detach()
    this.clearSelection()
    this.clearMultiSelectionHighlight()
    this.selectionCallbacks.clear()
    this.hoverCallbacks.clear()
    this.highlightedNodeIds.clear()
    this.handleManager?.dispose()
    this.keyboardHandler?.dispose()
    this.contextMenu?.dispose()
    this.resizeManager?.dispose()
    this.paddingManager?.dispose()
    this.marginManager?.dispose()
    this.overlayManager?.dispose()
    // Slot Visibility cleanup
    this.slotVisibilityService?.dispose()
    // Drag Preview cleanup
    this.dragPreview?.dispose()
    this.dragPreview = null
    // Clear global LayoutService reference
    setLayoutService(null)
    this.layoutService = null
  }

  setSourceMap(sourceMap: SourceMap | null): void {
    this.sourceMapVersion++
    this.sourceMap = sourceMap

    // Invalidate caches - handles will be repositioned on next refresh
    this.handleManager?.hideHandles()
    this.resizeManager?.hideHandles()
    this.paddingManager?.hideHandles()
    this.marginManager?.hideHandles()
  }

  /** Get current SourceMap version for staleness detection */
  getSourceMapVersion(): number {
    return this.sourceMapVersion
  }

  select(nodeId: string | null): void {
    if (nodeId === this.selectedNodeId) return
    this.clearCurrentSelection()
    this.selectedNodeId = nodeId
    nodeId ? this.showSelectionUI(nodeId) : this.hideAllHandles()
    this.updateEditorFocusForSelection(nodeId)

    // Focus the container to capture keyboard events when selecting an element
    // This ensures P/H/V/F shortcuts work and keystrokes don't go to editor
    if (nodeId) {
      this.container.focus()
    }

    this.notifySelectionChanged(nodeId)
  }

  private clearCurrentSelection(): void {
    if (this.selectedNodeId) this.removeHighlight(this.selectedNodeId)
  }

  private showSelectionUI(nodeId: string): void {
    this.highlightElement(nodeId)

    // Hide all handles if multiselection is active (2+ elements)
    const multiSelection = state.get().multiSelection
    if (multiSelection.length >= 2) {
      this.hideAllHandles()
      return
    }

    this.handleManager?.showHandles(nodeId)
    // Show handles based on current mode
    if (this.handleMode === 'padding') {
      this.resizeManager?.hideHandles()
      this.marginManager?.hideHandles()
      this.paddingManager?.showHandles(nodeId)
    } else if (this.handleMode === 'margin') {
      this.resizeManager?.hideHandles()
      this.paddingManager?.hideHandles()
      this.marginManager?.showHandles(nodeId)
    } else {
      this.paddingManager?.hideHandles()
      this.marginManager?.hideHandles()
      this.resizeManager?.showHandles(nodeId)
    }
  }

  private hideAllHandles(): void {
    this.handleManager?.hideHandles()
    this.resizeManager?.hideHandles()
    this.paddingManager?.hideHandles()
    this.marginManager?.hideHandles()
    // Reset to resize mode when hiding all handles
    this.handleMode = 'resize'
  }

  private updateEditorFocusForSelection(nodeId: string | null): void {
    if (nodeId && state.get().editorHasFocus) actions.setEditorFocus(false)
  }

  private notifySelectionChanged(nodeId: string | null): void {
    const element = nodeId ? this.getElementByNodeId(nodeId) : null
    for (const cb of this.selectionCallbacks) cb(nodeId, element)
  }

  clearSelection(): void {
    this.select(null)
  }

  /** Get the handle manager (if enabled) */
  getHandleManager(): HandleManager | null {
    return this.handleManager
  }

  /** Enable handles after construction */
  enableHandles(): void {
    if (!this.handleManager) {
      this.handleManager = createHandleManager({
        container: this.container,
      })
      if (this.selectedNodeId) {
        this.handleManager.showHandles(this.selectedNodeId)
      }
    }
  }

  /** Disable handles */
  disableHandles(): void {
    if (this.handleManager) {
      this.handleManager.dispose()
      this.handleManager = null
    }
  }

  /** Get the resize manager (if Visual Code System is enabled) */
  getResizeManager(): ResizeManager | null {
    return this.resizeManager
  }

  /** Get the overlay manager (if Visual Code System is enabled) */
  getOverlayManager(): OverlayManager | null {
    return this.overlayManager
  }

  /** Enable Visual Code System after construction */
  enableVisualCode(): void {
    if (!this.overlayManager) {
      this.initVisualCodeSystem()
      if (this.selectedNodeId) {
        this.resizeManager?.showHandles(this.selectedNodeId)
      }
    }
  }

  /** Disable Visual Code System */
  disableVisualCode(): void {
    this.resizeManager?.dispose()
    this.paddingManager?.dispose()
    this.marginManager?.dispose()
    this.overlayManager?.dispose()
    this.resizeManager = null
    this.paddingManager = null
    this.marginManager = null
    this.overlayManager = null
  }

  /**
   * Show drop zone indicator (used by component palette drag/drop)
   *
   * Always shows a line indicating where the element will be inserted:
   * - For 'before'/'after': Line at the insertion position between siblings
   * - For 'inside' (empty container): Line in the center of the container
   */
  showDropZone(info: {
    targetRect?: { left: number; top: number; width: number; height: number }
    semanticZone?: string
    placement?: 'before' | 'after' | 'inside'
    parentDirection?: 'horizontal' | 'vertical'
    // New: insertion line position (calculated by DropZoneCalculator)
    insertionLinePosition?: number
    // New: container rect for full-width/height lines
    containerRect?: { left: number; top: number; width: number; height: number }
    // Legacy support for rect-only calls
    left?: number
    top?: number
    width?: number
    height?: number
  }): void {
    // Support both new format (targetRect) and legacy format (direct rect properties)
    const viewportRect = info.targetRect || {
      left: info.left || 0,
      top: info.top || 0,
      width: info.width || 0,
      height: info.height || 0,
    }

    // Convert viewport coordinates to container-relative coordinates
    const previewContainerRect = this.container.getBoundingClientRect()
    const relRect = {
      left: viewportRect.left - previewContainerRect.left,
      top: viewportRect.top - previewContainerRect.top,
      width: viewportRect.width,
      height: viewportRect.height,
    }

    if (!this.overlayManager) return

    const placement = info.placement || 'inside'
    const direction = info.parentDirection || 'vertical'

    // Always hide semantic dots - we only show lines now
    this.overlayManager.hideSemanticDots()

    // Always show a line indicating where the element will be inserted
    if (placement === 'inside') {
      // For empty containers, show line in center
      // The line spans the full width/height of the container
      if (direction === 'horizontal') {
        // Vertical line in center
        const centerX = relRect.left + relRect.width / 2
        this.overlayManager.showSiblingLine(
          { left: centerX, top: relRect.top, width: 0, height: relRect.height },
          'before',
          'horizontal'
        )
      } else {
        // Horizontal line in center
        const centerY = relRect.top + relRect.height / 2
        this.overlayManager.showSiblingLine(
          { left: relRect.left, top: centerY, width: relRect.width, height: 0 },
          'before',
          'vertical'
        )
      }
    } else {
      // Show sibling insertion line for 'before'/'after' placement
      this.overlayManager.showSiblingLine(relRect, placement, direction)
    }
  }

  /**
   * Hide drop zone indicator
   */
  hideDropZone(): void {
    this.overlayManager?.hideDropZone()
    this.overlayManager?.hideSemanticDots()
    this.overlayManager?.hideSiblingLine()
  }

  getElementByNodeId(nodeId: string): HTMLElement | null {
    return this.container.querySelector(
      `[${this.config.nodeIdAttribute}="${nodeId}"]`
    ) as HTMLElement | null
  }

  onSelect(callback: SelectionCallback): () => void {
    this.selectionCallbacks.add(callback)
    return () => this.selectionCallbacks.delete(callback)
  }

  onHover(callback: HoverCallback): () => void {
    this.hoverCallbacks.add(callback)
    return () => this.hoverCallbacks.delete(callback)
  }

  private handleClick(e: MouseEvent): void {
    // In play mode or Alt+Click, let clicks pass through to components for interaction
    if (state.get().playMode || e.altKey) {
      return
    }

    // Suppress selection changes during inline editing
    if (state.get().inlineEditActive) {
      return
    }

    const target = e.target as HTMLElement
    const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
      if (nodeId) {
        e.stopPropagation()

        // Cmd/Ctrl+Click or Shift+Click = Multi-select toggle
        const isMultiSelectModifier = e.shiftKey || e.metaKey || e.ctrlKey
        if (isMultiSelectModifier) {
          // If there's a current single selection, add it to multi-selection first
          const currentSelection = state.get().selection.nodeId
          const multiSelection = state.get().multiSelection
          if (currentSelection && !multiSelection.includes(currentSelection)) {
            actions.toggleMultiSelection(currentSelection)
          }
          actions.toggleMultiSelection(nodeId)
          this.updateMultiSelectionHighlight()
        } else {
          // Normal click = Single select, clear multi
          actions.clearMultiSelection()
          this.clearMultiSelectionHighlight()
          this.select(nodeId)
        }
      }
    }
  }

  /**
   * Handle double-click for inline text editing
   */
  private handleDoubleClick(e: MouseEvent): void {
    if (state.get().playMode) return
    const nodeElement = (e.target as HTMLElement).closest(
      `[${this.config.nodeIdAttribute}]`
    ) as HTMLElement | null
    if (!nodeElement) return
    const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
    if (nodeId) events.emit('preview:element-dblclicked', { nodeId, element: nodeElement })
  }

  /**
   * Update visual highlight for multi-selected elements
   *
   * Uses explicit nodeId tracking (highlightedNodeIds Set) instead of DOM queries
   * to ensure consistency after DOM re-renders.
   */
  private updateMultiSelectionHighlight(): void {
    // Clear existing multi-selection highlights using tracked nodeIds
    this.clearMultiSelectionHighlight()

    // Add highlight to all multi-selected elements
    const multiSelection = state.get().multiSelection
    for (const nodeId of multiSelection) {
      const element = this.getElementByNodeId(nodeId)
      if (element) {
        element.classList.add('studio-multi-selected')
        this.highlightedNodeIds.add(nodeId)
      }
    }

    // Hide handles when multiselection is active (2+ elements)
    if (multiSelection.length >= 2) {
      this.hideAllHandles()
    } else if (this.selectedNodeId) {
      // Restore handles for single selection
      this.showSelectionUI(this.selectedNodeId)
    }
  }

  /**
   * Clear all multi-selection highlights
   *
   * Uses the tracked highlightedNodeIds Set for reliable cleanup,
   * avoiding stale DOM queries after re-renders.
   */
  private clearMultiSelectionHighlight(): void {
    // Remove highlights using tracked nodeIds (not DOM query)
    for (const nodeId of this.highlightedNodeIds) {
      const element = this.getElementByNodeId(nodeId)
      element?.classList.remove('studio-multi-selected')
    }
    this.highlightedNodeIds.clear()

    // Fallback: Also clear any orphaned highlights from previous DOM
    // This handles edge cases where DOM was replaced entirely
    const orphanedElements = this.container.querySelectorAll('.studio-multi-selected')
    orphanedElements.forEach(el => el.classList.remove('studio-multi-selected'))
  }

  private handleMouseOver(e: MouseEvent): void {
    // In play mode, disable hover highlighting
    if (state.get().playMode) {
      return
    }

    const target = e.target as HTMLElement
    const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
      if (nodeId && nodeId !== this.hoveredNodeId) {
        if (this.hoveredNodeId) this.removeHoverHighlight(this.hoveredNodeId)
        this.hoveredNodeId = nodeId
        this.addHoverHighlight(nodeId)
        for (const cb of this.hoverCallbacks) cb(nodeId, nodeElement)
        events.emit('preview:element-hovered', { nodeId, element: nodeElement })
      }
    }
  }

  private handleMouseOut(e: MouseEvent): void {
    const target = e.target as HTMLElement
    const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null
    if (nodeElement && this.hoveredNodeId) {
      const relatedTarget = e.relatedTarget as HTMLElement | null
      const newNodeElement = relatedTarget?.closest(`[${this.config.nodeIdAttribute}]`)
      if (!newNodeElement || newNodeElement !== nodeElement) {
        this.removeHoverHighlight(this.hoveredNodeId)
        this.hoveredNodeId = null
        for (const cb of this.hoverCallbacks) cb(null, null)
        events.emit('preview:element-hovered', { nodeId: null, element: null })
      }
    }
  }

  private highlightElement(nodeId: string): void {
    const element = this.getElementByNodeId(nodeId)
    element?.classList.add(this.config.selectedClass)
  }

  private removeHighlight(nodeId: string): void {
    const element = this.getElementByNodeId(nodeId)
    element?.classList.remove(this.config.selectedClass)
  }

  private addHoverHighlight(nodeId: string): void {
    const element = this.getElementByNodeId(nodeId)
    element?.classList.add(this.config.hoverClass)
  }

  private removeHoverHighlight(nodeId: string): void {
    const element = this.getElementByNodeId(nodeId)
    element?.classList.remove(this.config.hoverClass)
  }
}

export function createPreviewController(config: PreviewConfig): PreviewController {
  return new PreviewController(config)
}

let globalPreview: PreviewController | null = null

/**
 * @deprecated Use getStudioContext().preview instead
 */
export function getPreviewController(): PreviewController | null {
  return globalPreview
}

/**
 * @deprecated Use setStudioContext() with context.preview instead
 */
export function setPreviewController(controller: PreviewController | null): void {
  // Dispose old controller to prevent memory leaks
  if (globalPreview && globalPreview !== controller) {
    globalPreview.dispose()
  }
  globalPreview = controller
}
