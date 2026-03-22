/**
 * Preview Module - Preview Controller
 */

import { state, actions, events, executor, ResizeCommand, SetPropertyCommand, MoveNodeWithLayoutCommand } from '../core'
import type { SourceMap } from '../../src/studio/source-map'
import { HandleManager, createHandleManager } from './handle-manager'
import { KeyboardHandler, createKeyboardHandler } from './keyboard-handler'
import { ContextMenu, createContextMenu } from './context-menu'
import { OverlayManager, createOverlayManager } from '../visual/overlay-manager'
import { ResizeManager, createResizeManager, type SizingMode } from '../visual/resize-manager'
import { DragDropVisualizer, createDragDropVisualizer, type DropZoneInfo } from '../visual/drag-drop-visualizer'
import { SlotVisibilityService, createSlotVisibilityService } from './slot-visibility'

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
export {
  ContextMenu,
  createContextMenu,
  type ContextMenuConfig,
} from './context-menu'

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
  DragDropVisualizer,
  createDragDropVisualizer,
  type DragDropVisualizerConfig,
  type DropZoneInfo,
} from '../visual/drag-drop-visualizer'

// Re-export slot visibility
export {
  SlotVisibilityService,
  createSlotVisibilityService,
  type SlotVisibilityConfig,
} from './slot-visibility'

// Re-export breadcrumb
export {
  PreviewBreadcrumb,
  createPreviewBreadcrumb,
  type BreadcrumbConfig,
} from './breadcrumb'

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

  // Slot Visibility System
  private slotVisibilityService: SlotVisibilityService | null = null

  constructor(config: PreviewConfig) {
    this.container = config.container
    this.config = {
      container: config.container,
      selectedClass: config.selectedClass ?? 'studio-selected',
      hoverClass: config.hoverClass ?? 'studio-hover',
      nodeIdAttribute: config.nodeIdAttribute ?? 'data-mirror-id',
      enableSelection: config.enableSelection ?? true,
      enableHover: config.enableHover ?? true,
      enableHandles: config.enableHandles ?? false,
      enableKeyboardShortcuts: config.enableKeyboardShortcuts ?? false,
      enableContextMenu: config.enableContextMenu ?? false,
      enableVisualCode: config.enableVisualCode ?? false,
    }
    this.boundHandleClick = this.handleClick.bind(this)
    this.boundHandleDoubleClick = this.handleDoubleClick.bind(this)
    this.boundHandleMouseOver = this.handleMouseOver.bind(this)
    this.boundHandleMouseOut = this.handleMouseOut.bind(this)

    // Initialize handle manager if enabled
    if (this.config.enableHandles) {
      this.handleManager = createHandleManager({ container: this.container })
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
  }

  /** Initialize the Visual Code System (overlay + resize) */
  private initVisualCodeSystem(): void {
    this.overlayManager = createOverlayManager({ container: this.container })
    this.resizeManager = createResizeManager({
      container: this.container,
      overlayManager: this.overlayManager,
      getSourceMap: () => this.sourceMap as any,
    })
    // Note: DragDropVisualizer is now handled by the new DragSystem

    // Listen for resize:end events to execute commands
    events.on('resize:end', (data: { nodeId: string; width: SizingMode; height: SizingMode; x?: number; y?: number }) => {
      // Execute resize command for width/height
      const command = new ResizeCommand({
        nodeId: data.nodeId,
        width: data.width === 'fill' ? 'full' : data.width,
        height: data.height === 'fill' ? 'full' : data.height,
      })
      executor.execute(command)

      // Execute additional commands for x/y position changes (absolute positioned elements)
      if (data.x !== undefined) {
        executor.execute(new SetPropertyCommand({
          nodeId: data.nodeId,
          property: 'x',
          value: String(data.x),
        }))
      }
      if (data.y !== undefined) {
        executor.execute(new SetPropertyCommand({
          nodeId: data.nodeId,
          property: 'y',
          value: String(data.y),
        }))
      }
    })
  }

  attach(): void {
    if (this.config.enableSelection) {
      this.container.addEventListener('click', this.boundHandleClick)
      // Double-click for inline text editing
      this.container.addEventListener('dblclick', this.boundHandleDoubleClick)
    }
    if (this.config.enableHover) {
      this.container.addEventListener('mouseover', this.boundHandleMouseOver)
      this.container.addEventListener('mouseout', this.boundHandleMouseOut)
    }
    // Note: Component drop from Component Panel is handled by DragDropManager in app.js
    // Do NOT add duplicate dragover/drop/dragleave handlers here
    // Start observing slot visibility
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
    // Ensure overlay is in DOM (may have been removed by innerHTML clear)
    this.overlayManager?.ensureOverlay()

    if (this.selectedNodeId) {
      this.highlightElement(this.selectedNodeId)
      this.handleManager?.showHandles(this.selectedNodeId)
      this.resizeManager?.refresh()
    }
    // Also restore multi-selection highlighting
    this.updateMultiSelectionHighlight()
    // Refresh slot visibility (DOM may have been replaced)
    this.slotVisibilityService?.refresh()
  }

  /** Dispose the controller */
  dispose(): void {
    this.detach()
    this.clearSelection()
    this.clearMultiSelectionHighlight()
    this.selectionCallbacks.clear()
    this.hoverCallbacks.clear()
    this.handleManager?.dispose()
    this.keyboardHandler?.dispose()
    this.contextMenu?.dispose()
    this.resizeManager?.dispose()
    this.overlayManager?.dispose()
    // Slot Visibility cleanup
    this.slotVisibilityService?.dispose()
  }

  setSourceMap(sourceMap: SourceMap | null): void {
    this.sourceMap = sourceMap
  }

  select(nodeId: string | null): void {
    if (nodeId === this.selectedNodeId) return
    if (this.selectedNodeId) this.removeHighlight(this.selectedNodeId)
    this.selectedNodeId = nodeId
    if (nodeId) {
      this.highlightElement(nodeId)
      this.handleManager?.showHandles(nodeId)
      this.resizeManager?.showHandles(nodeId)
    } else {
      this.handleManager?.hideHandles()
      this.resizeManager?.hideHandles()
    }
    const element = nodeId ? this.getElementByNodeId(nodeId) : null

    // Set editor focus to false when selecting in preview
    // This ensures the editor cursor will be set when syncing
    if (nodeId && state.get().editorHasFocus) {
      actions.setEditorFocus(false)
    }

    // Notify callbacks - SyncCoordinator will handle state update via handlePreviewClick
    // No direct actions.setSelection here to maintain single point of sync
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
      this.handleManager = createHandleManager({ container: this.container })
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
    this.overlayManager?.dispose()
    this.resizeManager = null
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
    targetRect?: { left: number; top: number; width: number; height: number };
    semanticZone?: string;
    placement?: 'before' | 'after' | 'inside';
    parentDirection?: 'horizontal' | 'vertical';
    // New: insertion line position (calculated by DropZoneCalculator)
    insertionLinePosition?: number;
    // New: container rect for full-width/height lines
    containerRect?: { left: number; top: number; width: number; height: number };
    // Legacy support for rect-only calls
    left?: number;
    top?: number;
    width?: number;
    height?: number;
  }): void {
    // Support both new format (targetRect) and legacy format (direct rect properties)
    const viewportRect = info.targetRect || {
      left: info.left || 0,
      top: info.top || 0,
      width: info.width || 0,
      height: info.height || 0
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
    return this.container.querySelector(`[${this.config.nodeIdAttribute}="${nodeId}"]`) as HTMLElement | null
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

        // Shift+Click = Multi-select
        if (e.shiftKey) {
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
    const target = e.target as HTMLElement
    const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null
    if (!nodeElement) return

    const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
    if (!nodeId) return

    // Emit event for InlineEditController to handle
    events.emit('preview:element-dblclicked', { nodeId, element: nodeElement })
  }

  /**
   * Update visual highlight for multi-selected elements
   */
  private updateMultiSelectionHighlight(): void {
    // Clear existing multi-selection highlights
    this.clearMultiSelectionHighlight()

    // Add highlight to all multi-selected elements
    const multiSelection = state.get().multiSelection
    for (const nodeId of multiSelection) {
      const element = this.getElementByNodeId(nodeId)
      element?.classList.add('studio-multi-selected')
    }
  }

  /**
   * Clear all multi-selection highlights
   */
  private clearMultiSelectionHighlight(): void {
    const elements = this.container.querySelectorAll('.studio-multi-selected')
    elements.forEach(el => el.classList.remove('studio-multi-selected'))
  }

  private handleMouseOver(e: MouseEvent): void {
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
