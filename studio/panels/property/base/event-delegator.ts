/**
 * EventDelegator - Centralized Event Handling
 *
 * Uses event delegation pattern to minimize event listener count.
 * Instead of attaching listeners to individual elements, we attach
 * a single listener to the root and delegate based on selectors.
 */

import type { EventHandler, EventHandlerMap } from '../types'

interface DelegatedHandler {
  selector: string
  handler: EventHandler
}

/**
 * EventDelegator manages event delegation for a container element.
 *
 * Usage:
 * ```ts
 * const delegator = new EventDelegator(container)
 *
 * // Register handlers
 * delegator.on('[data-action="save"]', 'click', (e, target) => {
 *   console.log('Save clicked', target.dataset.action)
 * })
 *
 * // Register multiple handlers at once
 * delegator.registerHandlers({
 *   '[data-action="save"]': { click: handleSave },
 *   '[data-action="delete"]': { click: handleDelete },
 *   '.input-field': { input: handleInput, blur: handleBlur }
 * })
 *
 * // Clean up
 * delegator.destroy()
 * ```
 */
export class EventDelegator {
  private root: HTMLElement
  private handlers: Map<string, DelegatedHandler[]> = new Map()
  private boundHandlers: Map<string, (e: Event) => void> = new Map()

  constructor(root: HTMLElement) {
    this.root = root
  }

  /**
   * Register a handler for a selector and event type
   */
  on(selector: string, eventType: string, handler: EventHandler): void {
    // Get or create handler list for this event type
    let eventHandlers = this.handlers.get(eventType)
    if (!eventHandlers) {
      eventHandlers = []
      this.handlers.set(eventType, eventHandlers)

      // Create and attach the delegated event listener
      const boundHandler = this.createDelegatedHandler(eventType)
      this.boundHandlers.set(eventType, boundHandler)
      this.root.addEventListener(eventType, boundHandler)
    }

    // Add the handler
    eventHandlers.push({ selector, handler })
  }

  /**
   * Remove a handler for a selector and event type
   */
  off(selector: string, eventType: string): void {
    const eventHandlers = this.handlers.get(eventType)
    if (!eventHandlers) return

    // Filter out handlers matching the selector
    const filtered = eventHandlers.filter(h => h.selector !== selector)

    if (filtered.length === 0) {
      // No more handlers for this event type, remove the listener
      this.handlers.delete(eventType)
      const boundHandler = this.boundHandlers.get(eventType)
      if (boundHandler) {
        this.root.removeEventListener(eventType, boundHandler)
        this.boundHandlers.delete(eventType)
      }
    } else {
      this.handlers.set(eventType, filtered)
    }
  }

  /**
   * Register multiple handlers at once from a handler map
   */
  registerHandlers(handlerMap: EventHandlerMap): void {
    for (const [selector, events] of Object.entries(handlerMap)) {
      for (const [eventType, handler] of Object.entries(events)) {
        this.on(selector, eventType, handler)
      }
    }
  }

  /**
   * Clear all handlers for a specific event type
   */
  clearEventType(eventType: string): void {
    this.handlers.delete(eventType)
    const boundHandler = this.boundHandlers.get(eventType)
    if (boundHandler) {
      this.root.removeEventListener(eventType, boundHandler)
      this.boundHandlers.delete(eventType)
    }
  }

  /**
   * Clear all handlers
   */
  clear(): void {
    Array.from(this.boundHandlers.entries()).forEach(([eventType, boundHandler]) => {
      this.root.removeEventListener(eventType, boundHandler)
    })
    this.handlers.clear()
    this.boundHandlers.clear()
  }

  /**
   * Destroy the delegator and clean up all listeners
   */
  destroy(): void {
    this.clear()
  }

  /**
   * Create the delegated handler function for an event type
   */
  private createDelegatedHandler(eventType: string): (e: Event) => void {
    return (e: Event) => {
      const target = e.target as HTMLElement
      if (!target) return

      const eventHandlers = this.handlers.get(eventType)
      if (!eventHandlers) return

      // Find the matching element by walking up from target
      for (const { selector, handler } of eventHandlers) {
        const matchingElement = this.findMatchingElement(target, selector)
        if (matchingElement) {
          try {
            handler(e, matchingElement)
          } catch (error) {
            console.error(`[EventDelegator] Handler error for "${selector}" on "${eventType}":`, error)
            // Continue with other handlers - don't break the loop
          }
          // Don't break - allow multiple handlers to match
        }
      }
    }
  }

  /**
   * Find the closest element matching the selector, starting from target
   */
  private findMatchingElement(target: HTMLElement, selector: string): HTMLElement | null {
    // Use closest() which handles walking up the DOM tree
    const element = target.closest(selector)

    // Make sure the matching element is within our root
    if (element && this.root.contains(element)) {
      return element as HTMLElement
    }

    return null
  }

  /**
   * Get all registered selectors for debugging
   */
  getRegisteredSelectors(): Map<string, string[]> {
    const result = new Map<string, string[]>()
    Array.from(this.handlers.entries()).forEach(([eventType, handlers]) => {
      result.set(eventType, handlers.map(h => h.selector))
    })
    return result
  }
}
