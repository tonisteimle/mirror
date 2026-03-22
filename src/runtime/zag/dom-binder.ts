/**
 * Zag DOM Binder
 *
 * Binds Zag machine API props to DOM elements.
 * Handles applying attributes, event listeners, and ARIA properties.
 */

import type { IRSlot, IRItem } from '../../ir/types'

/**
 * Props returned by Zag API methods
 */
export interface ZagProps {
  [key: string]: any
}

/**
 * Bound element tracking
 */
interface BoundElement {
  element: HTMLElement
  cleanup: () => void
}

/**
 * DOM Binder for Zag components
 *
 * Applies Zag API props to DOM elements and manages cleanup.
 */
export class DOMBinder {
  private boundElements = new Map<string, BoundElement>()
  private portalContainer: HTMLElement | null = null

  /**
   * Bind Zag props to a DOM element
   *
   * @param element The DOM element
   * @param props Props from Zag API (e.g., api.getTriggerProps())
   * @param id Unique ID for tracking
   */
  bind(element: HTMLElement, props: ZagProps, id: string): void {
    // Validate props
    if (!props || typeof props !== 'object') {
      return
    }

    // Clean up existing bindings for this ID
    this.unbind(id)

    const cleanups: Array<() => void> = []

    // ARIA attributes that should use string "true"/"false" instead of presence/absence
    const ariaStringAttrs = new Set([
      'aria-expanded', 'aria-selected', 'aria-checked', 'aria-pressed',
      'aria-hidden', 'aria-disabled', 'aria-readonly', 'aria-required',
      'aria-invalid', 'aria-busy', 'aria-live', 'aria-atomic',
    ])

    for (const [key, value] of Object.entries(props)) {
      if (key.startsWith('on') && typeof value === 'function') {
        // Event listener
        const eventName = key.slice(2).toLowerCase()
        element.addEventListener(eventName, value)
        cleanups.push(() => element.removeEventListener(eventName, value))
      } else if (key === 'style' && typeof value === 'object' && value !== null) {
        // Style object
        const originalStyles: Record<string, string> = {}
        for (const [styleProp, styleValue] of Object.entries(value as Record<string, string>)) {
          originalStyles[styleProp] = (element.style as any)[styleProp]
          ;(element.style as any)[styleProp] = styleValue
        }
        cleanups.push(() => {
          for (const [styleProp, styleValue] of Object.entries(originalStyles)) {
            ;(element.style as any)[styleProp] = styleValue
          }
        })
      } else if (typeof value === 'boolean') {
        // Boolean attribute - ARIA attrs use string values
        if (ariaStringAttrs.has(key)) {
          element.setAttribute(key, String(value))
          cleanups.push(() => element.removeAttribute(key))
        } else if (value) {
          element.setAttribute(key, '')
          cleanups.push(() => element.removeAttribute(key))
        }
        // For false non-ARIA booleans, don't set the attribute at all
      } else if (value != null) {
        // Regular attribute
        element.setAttribute(key, String(value))
        cleanups.push(() => element.removeAttribute(key))
      }
    }

    this.boundElements.set(id, {
      element,
      cleanup: () => cleanups.forEach(c => c()),
    })
  }

  /**
   * Unbind a specific element
   *
   * @param id Element ID
   */
  unbind(id: string): void {
    const bound = this.boundElements.get(id)
    if (bound) {
      // Delete from map first to prevent re-entry
      this.boundElements.delete(id)
      try {
        bound.cleanup()
      } catch (e) {
        console.warn(`Failed to cleanup bindings for ${id}:`, e)
      }
    }
  }

  /**
   * Unbind all elements
   */
  unbindAll(): void {
    // Iterate over a copy to allow safe deletion
    const entries = [...this.boundElements.entries()]
    this.boundElements.clear()

    for (const [id, bound] of entries) {
      try {
        bound.cleanup()
      } catch (e) {
        console.warn(`Failed to cleanup bindings for ${id}:`, e)
      }
    }
  }

  /**
   * Create a portal container for portaled elements (dropdowns, etc.)
   *
   * @returns The portal container element
   */
  createPortal(): HTMLElement {
    if (!this.portalContainer) {
      this.portalContainer = document.createElement('div')
      this.portalContainer.id = 'mirror-zag-portal'
      this.portalContainer.setAttribute('data-zag-portal', '')
      document.body.appendChild(this.portalContainer)
    }
    return this.portalContainer
  }

  /**
   * Mount a portaled element
   *
   * @param element Element to portal
   * @param parentId ID of the parent machine (for tracking)
   */
  mountPortal(element: HTMLElement, parentId: string): void {
    const portal = this.createPortal()

    // Mark element with parent reference for click-outside handling
    element.setAttribute('data-parent-machine', parentId)

    portal.appendChild(element)
  }

  /**
   * Unmount a portaled element
   *
   * @param element Element to unmount
   */
  unmountPortal(element: HTMLElement): void {
    if (element.parentElement?.id === 'mirror-zag-portal') {
      element.remove()

      // Clean up portal container if empty
      if (this.portalContainer && this.portalContainer.children.length === 0) {
        this.portalContainer.remove()
        this.portalContainer = null
      }
    }
  }

  /**
   * Render an item element
   *
   * @param item IR item definition
   * @param props Props from Zag API
   * @param template Optional template function
   * @returns The rendered DOM element
   */
  renderItem(
    item: IRItem,
    props: ZagProps,
    template?: (item: IRItem) => HTMLElement
  ): HTMLElement {
    const element = template ? template(item) : document.createElement('div')

    // Apply Zag props
    this.bind(element, props, `item-${item.value}`)

    // Set default content if no template
    if (!template) {
      element.textContent = item.label
      element.setAttribute('data-mirror-item', item.value)
    }

    return element
  }

  /**
   * Dispose of the binder and clean up all resources
   */
  dispose(): void {
    this.unbindAll()

    if (this.portalContainer) {
      this.portalContainer.remove()
      this.portalContainer = null
    }
  }
}

/**
 * Create a new DOM binder
 */
export function createDOMBinder(): DOMBinder {
  return new DOMBinder()
}
