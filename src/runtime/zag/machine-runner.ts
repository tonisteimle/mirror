/**
 * Zag Machine Runner
 *
 * Manages the lifecycle of Zag state machines for Mirror components.
 * Handles creation, starting, stopping, and API access for machines.
 */

import * as select from '@zag-js/select'
import { createNormalizer } from '@zag-js/types'
import type { IRItem } from '../../ir/types'

// Normalizer for DOM props (vanilla JS)
const normalizeProps = createNormalizer((props: Record<string, any>) => props)

// Machine types supported by the runner
const MACHINES = {
  select,
} as const

type MachineType = keyof typeof MACHINES

/**
 * Configuration for creating a Zag machine
 */
export interface MachineConfig {
  id: string
  placeholder?: string
  multiple?: boolean
  searchable?: boolean
  clearable?: boolean
  disabled?: boolean
  value?: string | string[]
  defaultValue?: string | string[]
  items?: IRItem[]
  onValueChange?: (details: { value: string[] }) => void
  onOpenChange?: (details: { open: boolean }) => void
}

/**
 * Subscription callback for machine state changes
 */
export type MachineSubscriber = (api: any) => void

/**
 * Machine instance tracking
 */
interface MachineInstance {
  type: MachineType
  config: MachineConfig
  machine: any
  service: any
  api: any
  cleanup?: () => void
}

/**
 * Manages Zag machine instances
 */
export class MachineRunner {
  private instances = new Map<string, MachineInstance>()
  private subscribers = new Map<string, Set<MachineSubscriber>>()

  /**
   * Create a new machine instance
   *
   * @param type Machine type (e.g., 'select')
   * @param config Machine configuration
   * @returns The machine instance or null
   */
  create(type: MachineType, config: MachineConfig): MachineInstance | null {
    const machineModule = MACHINES[type]
    if (!machineModule) {
      console.warn(`Unknown machine type: ${type}`)
      return null
    }

    // Build collection for list-based machines
    const items = config.items ?? []
    const collectionItems = items.map((item) => ({
      value: item.value,
      label: item.label,
      disabled: item.disabled,
    }))

    // Create collection using Zag's collection helper
    const itemCollection = select.collection({
      items: collectionItems,
      itemToString: (item: { label: string }) => item.label,
      itemToValue: (item: { value: string }) => item.value,
    })

    // Create machine context
    const machineContext: any = {
      id: config.id,
      collection: itemCollection,
      disabled: config.disabled,
      multiple: config.multiple,
      onValueChange: config.onValueChange,
      onOpenChange: config.onOpenChange,
    }

    // Set initial value if provided
    if (config.defaultValue) {
      machineContext.value = Array.isArray(config.defaultValue)
        ? config.defaultValue
        : [config.defaultValue]
    }

    // Create the machine
    const machine = machineModule.machine(machineContext)

    // Create instance tracking
    const instance: MachineInstance = {
      type,
      config,
      machine,
      service: null,
      api: null,
    }

    this.instances.set(config.id, instance)

    return instance
  }

  /**
   * Start a machine
   *
   * @param id Machine ID
   */
  start(id: string): void {
    const instance = this.instances.get(id)
    if (!instance) {
      console.warn(`Machine not found: ${id}`)
      return
    }

    const machineModule = MACHINES[instance.type]

    // Create and start the service (actor)
    const service = instance.machine.createActor?.()
    if (!service) {
      // Fallback for older Zag versions
      console.warn(`Could not create actor for machine: ${id}`)
      instance.api = this.createMockApi(instance)
      this.notifySubscribers(id, instance.api)
      return
    }

    instance.service = service

    // Subscribe to state changes
    const unsubscribe = service.subscribe((state: any) => {
      // Connect to get the API
      instance.api = machineModule.connect(state, service.send, normalizeProps)
      this.notifySubscribers(id, instance.api)
    })

    // Store cleanup function
    instance.cleanup = () => {
      unsubscribe()
      service.stop()
    }

    // Start the service
    service.start()
  }

  /**
   * Notify all subscribers of state change
   */
  private notifySubscribers(id: string, api: any): void {
    const subs = this.subscribers.get(id)
    if (subs) {
      for (const callback of subs) {
        callback(api)
      }
    }
  }

  /**
   * Create a mock API for fallback
   *
   * Used when the real Zag service can't be created.
   */
  private createMockApi(instance: MachineInstance): any {
    const id = instance.config.id
    const items = instance.config.items ?? []

    return {
      // Root props
      getRootProps: () => ({
        id,
        'data-scope': 'select',
        'data-part': 'root',
      }),

      // Trigger props
      getTriggerProps: () => ({
        id: `${id}-trigger`,
        'data-scope': 'select',
        'data-part': 'trigger',
        'aria-haspopup': 'listbox',
        'aria-expanded': false,
        role: 'combobox',
      }),

      // Content props
      getContentProps: () => ({
        id: `${id}-content`,
        'data-scope': 'select',
        'data-part': 'content',
        role: 'listbox',
        hidden: true,
      }),

      // Item props
      getItemProps: (opts: { item: { value: string } }) => ({
        id: `${id}-item-${opts.item.value}`,
        'data-scope': 'select',
        'data-part': 'item',
        'data-value': opts.item.value,
        role: 'option',
      }),

      // State
      open: false,
      value: [],
      highlightedValue: null,
    }
  }

  /**
   * Stop a machine
   *
   * @param id Machine ID
   */
  stop(id: string): void {
    const instance = this.instances.get(id)
    if (instance?.cleanup) {
      instance.cleanup()
    }

    this.instances.delete(id)
    this.subscribers.delete(id)
  }

  /**
   * Get the API for a machine
   *
   * @param id Machine ID
   * @returns The machine API or undefined
   */
  getApi(id: string): any | undefined {
    return this.instances.get(id)?.api
  }

  /**
   * Subscribe to machine state changes
   *
   * @param id Machine ID
   * @param callback Callback to invoke on state change
   * @returns Unsubscribe function
   */
  subscribe(id: string, callback: MachineSubscriber): () => void {
    if (!this.subscribers.has(id)) {
      this.subscribers.set(id, new Set())
    }

    this.subscribers.get(id)!.add(callback)

    // Immediately call with current API if available
    const instance = this.instances.get(id)
    if (instance?.api) {
      callback(instance.api)
    }

    return () => {
      this.subscribers.get(id)?.delete(callback)
    }
  }

  /**
   * Stop all machines
   */
  stopAll(): void {
    for (const id of this.instances.keys()) {
      this.stop(id)
    }
  }

  /**
   * Check if a machine is running
   *
   * @param id Machine ID
   * @returns true if the machine is running
   */
  isRunning(id: string): boolean {
    return this.instances.has(id)
  }
}

/**
 * Create a new MachineRunner instance
 */
export function createMachineRunner(): MachineRunner {
  return new MachineRunner()
}
