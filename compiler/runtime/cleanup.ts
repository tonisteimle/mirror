/**
 * Element Cleanup Management
 *
 * Handles automatic cleanup of document-level event listeners
 * when elements are removed from the DOM.
 */

import type { MirrorElement } from './types'

/** Registry of elements with document-level event listeners */
const _elementsWithDocListeners = new WeakSet<MirrorElement>()

/** MutationObserver for automatic cleanup */
let _cleanupObserver: MutationObserver | null = null

/**
 * Register an element for automatic cleanup.
 * The element will be cleaned up when removed from DOM.
 */
export function registerForCleanup(el: MirrorElement): void {
  _elementsWithDocListeners.add(el)
}

/**
 * Clean up click-outside handler
 */
function cleanupClickOutside(el: MirrorElement): void {
  if (el._clickOutsideTimeout) {
    clearTimeout(el._clickOutsideTimeout)
    delete el._clickOutsideTimeout
  }
  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }
}

/**
 * Clean up escape handler
 */
function cleanupEscapeHandler(el: MirrorElement): void {
  if (el._escapeHandler) {
    document.removeEventListener('keydown', el._escapeHandler)
    delete el._escapeHandler
  }
}

/**
 * Clean up auto-select handler
 */
function cleanupAutoSelect(el: MirrorElement): void {
  if (el._autoSelectHandler) {
    el.removeEventListener('focus', el._autoSelectHandler)
    delete el._autoSelectHandler
  }
}

/**
 * Clean up focus trap
 */
function cleanupFocusTrap(el: MirrorElement): void {
  if (el._focusTrap) {
    try {
      el._focusTrap.deactivate()
    } catch {
      // Ignore errors during deactivation
    }
    delete el._focusTrap
  }
}

/**
 * Clean up document-level event listeners for an element.
 * Call this when removing an element from DOM.
 */
export function cleanupElement(el: MirrorElement): void {
  cleanupClickOutside(el)
  cleanupEscapeHandler(el)
  cleanupAutoSelect(el)
  cleanupFocusTrap(el)
  _elementsWithDocListeners.delete(el)
}

/**
 * Process a single removed node for cleanup
 */
function processRemovedNode(node: Node): void {
  if (node.nodeType !== Node.ELEMENT_NODE) return
  const el = node as MirrorElement
  if (_elementsWithDocListeners.has(el)) cleanupElement(el)
  const children = el.querySelectorAll?.('[data-mirror-id]')
  if (!children) return
  for (const child of children) {
    if (_elementsWithDocListeners.has(child as MirrorElement))
      cleanupElement(child as MirrorElement)
  }
}

/**
 * Initialize the cleanup observer (call once on app start).
 * Automatically cleans up document-level listeners when elements are removed.
 */
export function initCleanupObserver(): void {
  if (_cleanupObserver || typeof MutationObserver === 'undefined') return
  _cleanupObserver = new MutationObserver(mutations => {
    mutations.forEach(m => m.removedNodes.forEach(node => processRemovedNode(node)))
  })
  _cleanupObserver.observe(document.body, { childList: true, subtree: true })
}
