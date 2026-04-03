/**
 * Test API Visibility Module
 *
 * Visibility control and inspection.
 */

import type {
  MirrorElement,
  RuntimeFunctions,
  VisibilityTestAPI,
  VisibilityState,
  VisibilityReason,
} from './types'

/**
 * Create the Visibility Test API
 */
export function createVisibilityAPI(runtime: RuntimeFunctions): VisibilityTestAPI {
  // Helper to get visibility state (used by multiple methods)
  function getVisibilityStateInternal(el: MirrorElement): VisibilityState {
    if (!el) {
      return {
        visible: false,
        display: 'none',
        opacity: 0,
        hidden: true,
        reason: 'hidden' as VisibilityReason,
      }
    }

    const style = window.getComputedStyle(el)
    const display = style.display
    const opacity = parseFloat(style.opacity)
    const hidden = el.hidden
    const visibility = style.visibility

    let reason: VisibilityReason = 'visible'
    let visible = true

    if (display === 'none') {
      visible = false
      reason = 'display'
    } else if (opacity === 0) {
      visible = false
      reason = 'opacity'
    } else if (hidden) {
      visible = false
      reason = 'hidden'
    } else if (visibility === 'hidden') {
      visible = false
      reason = 'visibility'
    }

    return { visible, display, opacity, hidden, reason }
  }

  return {
    // ----------------------------------------
    // Visibility Control
    // ----------------------------------------

    show(el: MirrorElement): void {
      if (!el) return

      // Use runtime.show if available
      if (runtime.show) {
        runtime.show(el)
        return
      }

      // Fallback: remove hidden attribute and set display
      el.hidden = false
      if (el.style.display === 'none') {
        el.style.display = ''
      }

      // If element has a saved display value, restore it
      if ((el as any)._savedDisplay) {
        el.style.display = (el as any)._savedDisplay
      }

      // Update visibility if runtime supports it
      if (runtime.updateVisibility) {
        runtime.updateVisibility(el)
      }
    },

    hide(el: MirrorElement): void {
      if (!el) return

      // Use runtime.hide if available
      if (runtime.hide) {
        runtime.hide(el)
        return
      }

      // Fallback: save display and hide
      const currentDisplay = window.getComputedStyle(el).display
      if (currentDisplay !== 'none') {
        (el as any)._savedDisplay = currentDisplay
      }

      el.style.display = 'none'
      el.hidden = true
    },

    // ----------------------------------------
    // Visibility Checks
    // ----------------------------------------

    isVisible(el: MirrorElement): boolean {
      if (!el) return false
      return getVisibilityStateInternal(el).visible
    },

    isHidden(el: MirrorElement): boolean {
      if (!el) return true
      return !getVisibilityStateInternal(el).visible
    },

    isDisplayNone(el: MirrorElement): boolean {
      if (!el) return true
      return window.getComputedStyle(el).display === 'none'
    },

    isOpacityZero(el: MirrorElement): boolean {
      if (!el) return true
      return parseFloat(window.getComputedStyle(el).opacity) === 0
    },

    hasHiddenAttribute(el: MirrorElement): boolean {
      if (!el) return true
      return el.hidden === true
    },

    // ----------------------------------------
    // Visibility State
    // ----------------------------------------

    getVisibilityState(el: MirrorElement): VisibilityState {
      return getVisibilityStateInternal(el)
    },

    // ----------------------------------------
    // Async Helpers
    // ----------------------------------------

    waitForVisible(el: MirrorElement, timeout: number = 1000): Promise<boolean> {
      return new Promise((resolve) => {
        if (!el) {
          resolve(false)
          return
        }

        // Check immediately
        if (getVisibilityStateInternal(el).visible) {
          resolve(true)
          return
        }

        // Set up polling
        const startTime = Date.now()
        const checkInterval = setInterval(() => {
          if (getVisibilityStateInternal(el).visible) {
            clearInterval(checkInterval)
            resolve(true)
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval)
            resolve(false)
          }
        }, 16) // ~60fps
      })
    },

    waitForHidden(el: MirrorElement, timeout: number = 1000): Promise<boolean> {
      return new Promise((resolve) => {
        if (!el) {
          resolve(true) // null element is "hidden"
          return
        }

        // Check immediately
        if (!getVisibilityStateInternal(el).visible) {
          resolve(true)
          return
        }

        // Set up polling
        const startTime = Date.now()
        const checkInterval = setInterval(() => {
          if (!getVisibilityStateInternal(el).visible) {
            clearInterval(checkInterval)
            resolve(true)
          } else if (Date.now() - startTime > timeout) {
            clearInterval(checkInterval)
            resolve(false)
          }
        }, 16)
      })
    },
  }
}
