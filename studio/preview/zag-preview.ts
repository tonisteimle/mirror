/**
 * Zag Preview Manager
 *
 * Handles rendering and interaction of Zag components in the Studio preview.
 * Provides preview-specific functionality like selection context and hot reload.
 */

import type { IRZagNode, SourcePosition } from '../../src/ir/types'
import { isIRZagNode } from '../../src/ir/types'
import { ZagRuntime, createZagRuntime } from '../../src/runtime/zag'
import { MIRROR_ID_ATTR } from './constants'
import { state } from '../core/state'

/**
 * Selection context returned when clicking on a Zag component part
 */
export interface ZagSelectionContext {
  /** The Zag component's node ID */
  nodeId: string
  /** The slot that was clicked (if applicable) */
  slotName?: string
  /** The item value that was clicked (if applicable) */
  itemValue?: string
  /** Source position for editor sync */
  sourcePosition?: SourcePosition
}

/**
 * Configuration for the Zag preview manager
 */
export interface ZagPreviewConfig {
  /** Container element for rendering */
  container: HTMLElement
  /** Callback when a Zag element is clicked */
  onSelect?: (context: ZagSelectionContext) => void
}

/**
 * Zag Preview Manager
 *
 * Manages Zag components specifically for the Studio preview environment.
 */
export class ZagPreviewManager {
  private config: ZagPreviewConfig
  private runtime: ZagRuntime
  private mountedNodes = new Map<string, IRZagNode>()
  private boundClickHandler: (event: MouseEvent) => void

  constructor(config: ZagPreviewConfig) {
    this.config = config
    this.runtime = createZagRuntime()
    this.boundClickHandler = this.handlePreviewClick.bind(this)
  }

  /**
   * Initialize the preview manager
   *
   * Attaches event listeners for preview interaction.
   */
  attach(): void {
    this.config.container.addEventListener('click', this.boundClickHandler, true)
  }

  /**
   * Detach event listeners
   */
  detach(): void {
    this.config.container.removeEventListener('click', this.boundClickHandler, true)
  }

  /**
   * Render a Zag component
   *
   * @param node The IR Zag node to render
   * @returns The rendered DOM element
   */
  renderComponent(node: IRZagNode): HTMLElement {
    // Unmount existing instance if present
    if (this.mountedNodes.has(node.id)) {
      this.runtime.unmount(node.id)
    }

    // Track the node for hot reload
    this.mountedNodes.set(node.id, node)

    // Mount the component
    return this.runtime.mount(node, this.config.container)
  }

  /**
   * Handle click events on the preview to determine selection context
   *
   * @param event The click event
   */
  handlePreviewClick(event: MouseEvent): ZagSelectionContext | null {
    // In play mode, let clicks pass through to Zag machines for normal interaction
    if (state.get().playMode) {
      return null
    }

    const target = event.target as HTMLElement

    // Find the nearest Zag component
    const zagElement = target.closest('[data-zag-component]') as HTMLElement
    if (!zagElement) return null

    // Verify it's actually a Zag component (not a regular component that happens to have this attribute)
    const zagType = zagElement.getAttribute('data-zag-component')
    if (!zagType) return null

    const nodeId = zagElement.getAttribute(MIRROR_ID_ATTR)
    if (!nodeId) return null

    // Stop propagation to prevent Zag machine from handling the click
    // This allows selecting the component instead of triggering its behavior
    // Use stopImmediatePropagation to also stop handlers on the same element
    event.stopImmediatePropagation()
    event.preventDefault()

    // Check if we clicked on a specific slot
    const slotElement = target.closest('[data-slot]') as HTMLElement
    const slotName = slotElement?.getAttribute('data-slot') ?? undefined

    // Check if we clicked on an item
    const itemElement = target.closest('[data-mirror-item]') as HTMLElement
    const itemValue = itemElement?.getAttribute('data-mirror-item') ?? undefined

    // Try to get source position from tracked node if available
    let sourcePosition: SourcePosition | undefined
    const node = this.mountedNodes.get(nodeId)

    if (node) {
      // Additional verification: ensure node's zagType matches element's attribute
      if (node.zagType !== zagType) {
        console.warn(`Zag type mismatch: expected "${node.zagType}", got "${zagType}"`)
      }

      sourcePosition = node.sourcePosition

      if (slotName && node.slots[slotName]) {
        sourcePosition = node.slots[slotName].sourcePosition
      }

      if (itemValue) {
        const item = node.items.find(i => i.value === itemValue)
        if (item) {
          sourcePosition = item.sourcePosition
        }
      }
    }
    // Note: If node is not tracked, sourcePosition will be undefined
    // The selection will still work - SourceMap lookup will provide position

    const context: ZagSelectionContext = {
      nodeId,
      slotName,
      itemValue,
      sourcePosition,
    }

    // Notify callback if provided
    this.config.onSelect?.(context)

    return context
  }

  /**
   * Hot reload all mounted components
   *
   * Called when IR is recompiled to update components while preserving state.
   *
   * @param newNodes Updated IR nodes (may include non-Zag nodes)
   */
  hotReload(newNodes: IRZagNode[]): void {
    for (const node of newNodes) {
      if (!isIRZagNode(node)) continue

      if (this.mountedNodes.has(node.id)) {
        // Update tracking
        this.mountedNodes.set(node.id, node)

        // Hot reload the component
        this.runtime.hotReload(node)
      }
    }
  }

  /**
   * Unmount a specific component
   *
   * @param nodeId The node ID to unmount
   */
  unmount(nodeId: string): void {
    this.runtime.unmount(nodeId)
    this.mountedNodes.delete(nodeId)
  }

  /**
   * Unmount all components
   */
  unmountAll(): void {
    this.runtime.unmountAll()
    this.mountedNodes.clear()
  }

  /**
   * Check if a node ID is a mounted Zag component
   *
   * @param nodeId Node ID to check
   * @returns true if this is a mounted Zag component
   */
  isZagComponent(nodeId: string): boolean {
    return this.mountedNodes.has(nodeId)
  }

  /**
   * Get the DOM element for a Zag component
   *
   * @param nodeId Node ID
   * @returns The root element or null
   */
  getElement(nodeId: string): HTMLElement | null {
    return this.runtime.getElement(nodeId) ?? null
  }

  /**
   * Get source position for a Zag component or part
   *
   * @param nodeId Node ID
   * @param slotName Optional slot name
   * @param itemValue Optional item value
   * @returns Source position or undefined
   */
  getSourcePosition(
    nodeId: string,
    slotName?: string,
    itemValue?: string
  ): SourcePosition | undefined {
    const node = this.mountedNodes.get(nodeId)
    if (!node) return undefined

    if (itemValue) {
      const item = node.items.find(i => i.value === itemValue)
      if (item?.sourcePosition) return item.sourcePosition
    }

    if (slotName && node.slots[slotName]?.sourcePosition) {
      return node.slots[slotName].sourcePosition
    }

    return node.sourcePosition
  }

  /**
   * Dispose of the preview manager
   */
  dispose(): void {
    this.detach()
    this.runtime.dispose()
    this.mountedNodes.clear()
  }
}

/**
 * Create a Zag preview manager
 */
export function createZagPreviewManager(config: ZagPreviewConfig): ZagPreviewManager {
  return new ZagPreviewManager(config)
}
