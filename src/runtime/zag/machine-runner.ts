/**
 * Zag Machine Runner
 *
 * Manages the lifecycle of Zag state machines for Mirror components.
 * Handles creation, starting, stopping, and API access for machines.
 */

import * as select from '@zag-js/select'
import { createListCollection } from '@zag-js/select'
import type { IRItem } from '../../ir/types'

// Machine types supported by the runner
const MACHINES = {
  select,
} as const

type MachineType = keyof typeof MACHINES
type MachineService = ReturnType<typeof select.machine.create>
type MachineApi = ReturnType<typeof select.connect>

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
export type MachineSubscriber = (api: MachineApi) => void

/**
 * Manages Zag machine instances
 */
export class MachineRunner {
  private services = new Map<string, MachineService>()
  private apis = new Map<string, MachineApi>()
  private subscribers = new Map<string, Set<MachineSubscriber>>()
  private cleanups = new Map<string, () => void>()

  /**
   * Create a new machine instance
   *
   * @param type Machine type (e.g., 'select')
   * @param config Machine configuration
   * @returns The machine service
   */
  create(type: MachineType, config: MachineConfig): MachineService | null {
    const machine = MACHINES[type]
    if (!machine) {
      console.warn(`Unknown machine type: ${type}`)
      return null
    }

    // Build collection for list-based machines
    const collection = config.items
      ? createListCollection({
          items: config.items,
          itemToString: (item) => item.label,
          itemToValue: (item) => item.value,
        })
      : undefined

    // Create machine context
    const context: any = {
      id: config.id,
      collection,
      placeholder: config.placeholder,
      multiple: config.multiple,
      disabled: config.disabled,
      onValueChange: config.onValueChange,
      onOpenChange: config.onOpenChange,
    }

    // Set initial value if provided
    if (config.defaultValue) {
      context.value = Array.isArray(config.defaultValue)
        ? config.defaultValue
        : [config.defaultValue]
    }

    // Create the machine
    const service = machine.machine(context)
    this.services.set(config.id, service)

    return service
  }

  /**
   * Start a machine
   *
   * @param id Machine ID
   */
  start(id: string): void {
    const service = this.services.get(id)
    if (!service) {
      console.warn(`Machine not found: ${id}`)
      return
    }

    // Start the machine and subscribe to state changes
    const cleanup = service.subscribe((state: any) => {
      // Update API on state change
      const api = select.connect(state, service.send, normalizeProps)
      this.apis.set(id, api)

      // Notify subscribers
      const subs = this.subscribers.get(id)
      if (subs) {
        for (const callback of subs) {
          callback(api)
        }
      }
    })

    this.cleanups.set(id, cleanup)
    service.start()

    // Initial API creation
    const api = select.connect(service.getState(), service.send, normalizeProps)
    this.apis.set(id, api)
  }

  /**
   * Stop a machine
   *
   * @param id Machine ID
   */
  stop(id: string): void {
    const service = this.services.get(id)
    if (service) {
      service.stop()
    }

    const cleanup = this.cleanups.get(id)
    if (cleanup) {
      cleanup()
    }

    this.services.delete(id)
    this.apis.delete(id)
    this.subscribers.delete(id)
    this.cleanups.delete(id)
  }

  /**
   * Get the API for a machine
   *
   * @param id Machine ID
   * @returns The machine API or undefined
   */
  getApi(id: string): MachineApi | undefined {
    return this.apis.get(id)
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
    const api = this.apis.get(id)
    if (api) {
      callback(api)
    }

    return () => {
      this.subscribers.get(id)?.delete(callback)
    }
  }

  /**
   * Stop all machines
   */
  stopAll(): void {
    for (const id of this.services.keys()) {
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
    return this.services.has(id)
  }
}

/**
 * Normalize props for DOM binding
 *
 * Zag uses this to adapt props for different frameworks.
 * For vanilla DOM, we just pass through.
 */
function normalizeProps(props: Record<string, any>): Record<string, any> {
  return props
}

/**
 * Create a new MachineRunner instance
 */
export function createMachineRunner(): MachineRunner {
  return new MachineRunner()
}
