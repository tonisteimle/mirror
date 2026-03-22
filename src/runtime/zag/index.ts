/**
 * Zag Runtime Module
 *
 * Provides runtime support for Zag-based behavior components in Mirror.
 * Handles machine lifecycle, DOM binding, and style management.
 *
 * Usage:
 *   import { createZagRuntime } from './runtime/zag'
 *
 *   const runtime = createZagRuntime()
 *   runtime.mount(irZagNode, container)
 *   // ... later
 *   runtime.unmount(irZagNode.id)
 */

import type { IRZagNode, IRItem } from '../../ir/types'
import { MachineRunner, createMachineRunner, type MachineConfig } from './machine-runner'
import { DOMBinder, createDOMBinder } from './dom-binder'
import { StyleManager, createStyleManager } from './style-manager'
import { getSlotElement, isPortaledSlot } from '../../compiler/zag/slots'

// Re-export components
export {
  MachineRunner,
  createMachineRunner,
  type MachineConfig,
} from './machine-runner'

export {
  DOMBinder,
  createDOMBinder,
} from './dom-binder'

export {
  StyleManager,
  createStyleManager,
} from './style-manager'

/**
 * Mounted component tracking
 */
interface MountedComponent {
  nodeId: string
  machineId: string
  rootElement: HTMLElement
  slotElements: Map<string, HTMLElement>
}

/**
 * Zag Runtime
 *
 * Manages all Zag components in a Mirror application.
 */
export class ZagRuntime {
  private machineRunner: MachineRunner
  private domBinder: DOMBinder
  private styleManager: StyleManager
  private mounted = new Map<string, MountedComponent>()

  constructor() {
    this.machineRunner = createMachineRunner()
    this.domBinder = createDOMBinder()
    this.styleManager = createStyleManager()
  }

  /**
   * Mount a Zag component
   *
   * @param node The IR Zag node
   * @param container Container element to mount into
   * @returns The root DOM element
   */
  mount(node: IRZagNode, container: HTMLElement): HTMLElement {
    const machineId = node.id

    // Validate machine type
    const validMachineTypes = ['select'] as const
    if (!validMachineTypes.includes(node.zagType as any)) {
      console.warn(`Zag: Unknown machine type "${node.zagType}", falling back to static rendering`)
    }

    // Build items for collection
    const items: IRItem[] = node.items

    // Create machine configuration
    const config: MachineConfig = {
      id: machineId,
      items,
      ...(node.machineConfig as any),
    }

    // Create and start the machine
    const instance = this.machineRunner.create(node.zagType as any, config)
    if (instance) {
      this.machineRunner.start(machineId)
    }

    // Create root element
    const rootElement = document.createElement('div')
    rootElement.setAttribute('data-mirror-id', node.id)
    rootElement.setAttribute('data-zag-component', node.zagType)

    // Create slot elements
    const slotElements = new Map<string, HTMLElement>()

    for (const [slotName, slot] of Object.entries(node.slots)) {
      const element = document.createElement(slot.element)
      element.setAttribute('data-slot', slotName)
      element.setAttribute('data-mirror-slot', `${node.id}-${slotName}`)

      // Apply base styles
      this.styleManager.applyInlineStyles(element, slot.styles)

      slotElements.set(slotName, element)

      // Mount to appropriate location
      if (slot.portal) {
        this.domBinder.mountPortal(element, machineId)
      } else {
        rootElement.appendChild(element)
      }
    }

    // Subscribe to machine state changes
    this.machineRunner.subscribe(machineId, (api) => {
      this.updateSlotProps(machineId, node, slotElements, api)
    })

    // Inject component CSS
    const css = this.styleManager.generateComponentCSS(node)
    if (css) {
      this.styleManager.inject(node.id, css)
    }

    // Add to container
    container.appendChild(rootElement)

    // Track mounted component
    this.mounted.set(node.id, {
      nodeId: node.id,
      machineId,
      rootElement,
      slotElements,
    })

    return rootElement
  }

  /**
   * Update slot props from machine API
   */
  private updateSlotProps(
    machineId: string,
    node: IRZagNode,
    slotElements: Map<string, HTMLElement>,
    api: any
  ): void {
    if (!api) return

    for (const [slotName, slot] of Object.entries(node.slots)) {
      const element = slotElements.get(slotName)
      if (!element) continue

      // Get props from API with safety check
      const propsMethod = slot.apiMethod
      if (typeof api[propsMethod] !== 'function') {
        continue
      }

      try {
        const props = api[propsMethod]()
        if (props) {
          this.domBinder.bind(element, props, `${machineId}-${slotName}`)
        }
      } catch (e) {
        console.warn(`Zag: Error getting props for slot "${slotName}":`, e)
      }
    }

    // Update items for list-based slots
    const contentElement = slotElements.get('Content')
    if (contentElement && typeof api.getItemProps === 'function') {
      this.updateItems(machineId, node.items, contentElement, api)
    }
  }

  /**
   * Update item elements
   */
  private updateItems(
    machineId: string,
    items: IRItem[],
    container: HTMLElement,
    api: any
  ): void {
    // Clear existing items (simple approach - could be optimized with diffing)
    container.innerHTML = ''

    for (const item of items) {
      const props = api.getItemProps({ item })
      const element = this.domBinder.renderItem(item, props)
      container.appendChild(element)
    }
  }

  /**
   * Unmount a Zag component
   *
   * @param nodeId The node ID to unmount
   */
  unmount(nodeId: string): void {
    const mounted = this.mounted.get(nodeId)
    if (!mounted) return

    // Remove from tracking first to prevent re-entry
    this.mounted.delete(nodeId)

    // Stop the machine
    this.machineRunner.stop(mounted.machineId)

    // Clean up all slot bindings
    for (const [slotName] of mounted.slotElements) {
      this.domBinder.unbind(`${mounted.machineId}-${slotName}`)
    }

    // Clean up item bindings
    const items = this.getItemsForNode(nodeId)
    for (const item of items) {
      this.domBinder.unbind(`item-${item.value}`)
    }

    // Unmount portal elements
    for (const element of mounted.slotElements.values()) {
      this.domBinder.unmountPortal(element)
    }

    // Remove root element
    mounted.rootElement.remove()

    // Remove styles
    this.styleManager.remove(nodeId)
  }

  /**
   * Get items for a mounted node (for cleanup)
   */
  private getItemsForNode(nodeId: string): IRItem[] {
    // Items are stored in the machine config, but we don't have direct access
    // Return empty array - items will be cleaned up when container is removed
    return []
  }

  /**
   * Unmount all components
   */
  unmountAll(): void {
    for (const nodeId of this.mounted.keys()) {
      this.unmount(nodeId)
    }
  }

  /**
   * Hot reload a component
   *
   * Preserves machine state while updating styles and structure.
   *
   * @param node Updated IR node
   */
  hotReload(node: IRZagNode): void {
    const mounted = this.mounted.get(node.id)
    if (!mounted) {
      // Not mounted yet, ignore
      return
    }

    // Update styles
    const css = this.styleManager.generateComponentCSS(node)
    if (css) {
      this.styleManager.inject(node.id, css)
    }

    // Re-bind slots (machine state preserved)
    const api = this.machineRunner.getApi(mounted.machineId)
    if (api) {
      this.updateSlotProps(mounted.machineId, node, mounted.slotElements, api)
    }
  }

  /**
   * Check if a node ID is a mounted Zag component
   *
   * @param nodeId Node ID to check
   * @returns true if mounted
   */
  isMounted(nodeId: string): boolean {
    return this.mounted.has(nodeId)
  }

  /**
   * Get the root element for a mounted component
   *
   * @param nodeId Node ID
   * @returns Root element or undefined
   */
  getElement(nodeId: string): HTMLElement | undefined {
    return this.mounted.get(nodeId)?.rootElement
  }

  /**
   * Dispose of the runtime and clean up all resources
   */
  dispose(): void {
    this.unmountAll()
    this.machineRunner.stopAll()
    this.domBinder.dispose()
    this.styleManager.dispose()
  }
}

/**
 * Create a new Zag runtime
 */
export function createZagRuntime(): ZagRuntime {
  return new ZagRuntime()
}

// Singleton instance for global access
let globalRuntime: ZagRuntime | null = null

/**
 * Get the global Zag runtime instance
 *
 * Creates one if it doesn't exist.
 */
export function getZagRuntime(): ZagRuntime {
  if (!globalRuntime) {
    globalRuntime = createZagRuntime()
  }
  return globalRuntime
}

/**
 * Set the global Zag runtime instance
 */
export function setZagRuntime(runtime: ZagRuntime | null): void {
  if (globalRuntime && globalRuntime !== runtime) {
    globalRuntime.dispose()
  }
  globalRuntime = runtime
}
