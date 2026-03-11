/**
 * Preview Module - Preview Controller
 */

import { state, actions, events } from '../core'
import type { SourceMap } from '../../src/studio/source-map'

// Re-export renderer
export {
  PreviewRenderer,
  createPreviewRenderer,
  BaseRenderer,
  type PreviewMode,
  type PreviewData,
  type RendererConfig,
} from './renderer'

export interface PreviewConfig {
  container: HTMLElement
  selectedClass?: string
  hoverClass?: string
  nodeIdAttribute?: string
  enableSelection?: boolean
  enableHover?: boolean
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
  private boundHandleMouseOver: (e: MouseEvent) => void
  private boundHandleMouseOut: (e: MouseEvent) => void

  constructor(config: PreviewConfig) {
    this.container = config.container
    this.config = {
      container: config.container,
      selectedClass: config.selectedClass ?? 'studio-selected',
      hoverClass: config.hoverClass ?? 'studio-hover',
      nodeIdAttribute: config.nodeIdAttribute ?? 'data-mirror-id',
      enableSelection: config.enableSelection ?? true,
      enableHover: config.enableHover ?? true,
    }
    this.boundHandleClick = this.handleClick.bind(this)
    this.boundHandleMouseOver = this.handleMouseOver.bind(this)
    this.boundHandleMouseOut = this.handleMouseOut.bind(this)
  }

  attach(): void {
    if (this.config.enableSelection) {
      this.container.addEventListener('click', this.boundHandleClick)
    }
    if (this.config.enableHover) {
      this.container.addEventListener('mouseover', this.boundHandleMouseOver)
      this.container.addEventListener('mouseout', this.boundHandleMouseOut)
    }
  }

  detach(): void {
    this.container.removeEventListener('click', this.boundHandleClick)
    this.container.removeEventListener('mouseover', this.boundHandleMouseOver)
    this.container.removeEventListener('mouseout', this.boundHandleMouseOut)
  }

  /** Re-apply visual selection after preview DOM refresh */
  refresh(): void {
    if (this.selectedNodeId) {
      this.highlightElement(this.selectedNodeId)
    }
  }

  /** Dispose the controller */
  dispose(): void {
    this.detach()
    this.clearSelection()
    this.selectionCallbacks.clear()
    this.hoverCallbacks.clear()
  }

  setSourceMap(sourceMap: SourceMap | null): void {
    this.sourceMap = sourceMap
  }

  select(nodeId: string | null): void {
    if (nodeId === this.selectedNodeId) return
    if (this.selectedNodeId) this.removeHighlight(this.selectedNodeId)
    this.selectedNodeId = nodeId
    if (nodeId) this.highlightElement(nodeId)
    const element = nodeId ? this.getElementByNodeId(nodeId) : null

    // Set editor focus to false when selecting in preview
    // This ensures the editor cursor will be set when syncing
    if (nodeId && state.get().editorHasFocus) {
      actions.setEditorFocus(false)
    }

    for (const cb of this.selectionCallbacks) cb(nodeId, element)
    actions.setSelection(nodeId, 'preview')
  }

  clearSelection(): void {
    this.select(null)
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
    const target = e.target as HTMLElement
    const nodeElement = target.closest(`[${this.config.nodeIdAttribute}]`) as HTMLElement | null
    if (nodeElement) {
      const nodeId = nodeElement.getAttribute(this.config.nodeIdAttribute)
      if (nodeId) {
        e.stopPropagation()
        this.select(nodeId)
      }
    }
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
export function setPreviewController(controller: PreviewController): void {
  globalPreview = controller
}
