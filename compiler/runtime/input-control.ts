/**
 * Input Control Functions
 *
 * Focus, blur, clear, and error handling for form inputs.
 */

import type { MirrorElement } from './types'
import { applyState, removeState } from './state-machine'

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if element is a focusable form element
 */
function isFormElement(
  el: unknown
): el is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    el instanceof HTMLSelectElement ||
    el instanceof HTMLButtonElement
  )
}

/**
 * Check if element is a text input
 */
function isTextInput(el: unknown): el is HTMLInputElement | HTMLTextAreaElement {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement
}

// ============================================
// FOCUS CONTROL
// ============================================

/**
 * Focus an input element
 */
export function focus(el: MirrorElement | null): void {
  if (!el) return

  if (isFormElement(el)) {
    el.focus()
  } else if (el.tabIndex >= 0 || el.hasAttribute('tabindex')) {
    el.focus()
  }
}

/**
 * Remove focus from an input element
 */
export function blur(el: MirrorElement | null): void {
  if (!el) return
  el.blur()
}

/**
 * Clear the value of an input element
 */
export function clear(el: MirrorElement | null): void {
  if (!el) return

  if (isTextInput(el)) {
    el.value = ''
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/**
 * Select all text in an input element
 */
export function selectText(el: MirrorElement | null): void {
  if (!el) return

  if (isTextInput(el)) {
    el.select()
  }
}

// ============================================
// ERROR HANDLING
// ============================================

/**
 * Apply visual error state to element
 */
function applyErrorState(el: MirrorElement): void {
  el.dataset.invalid = 'true'
  applyState(el, 'invalid')
}

/**
 * Set custom validity on form element
 */
function setFormValidity(el: MirrorElement, message: string): void {
  if (isTextInput(el)) {
    el.setCustomValidity(message)
  }
}

/**
 * Create error message element
 */
function createErrorElement(id: string): HTMLSpanElement {
  const errorEl = document.createElement('span')
  errorEl.id = id
  errorEl.className = 'mirror-error-message'
  errorEl.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;'
  return errorEl
}

/**
 * Get or create error element for input
 */
function getOrCreateErrorElement(el: MirrorElement): HTMLElement {
  const errorId = el.dataset.errorId || `${el.id || el.dataset.name || 'field'}-error`
  el.dataset.errorId = errorId

  let errorEl = document.getElementById(errorId)
  if (!errorEl) {
    errorEl = createErrorElement(errorId)
    el.parentNode?.insertBefore(errorEl, el.nextSibling)
  }

  return errorEl
}

/**
 * Set accessibility attributes for error
 */
function setErrorAccessibility(el: MirrorElement, errorId: string): void {
  el.setAttribute('aria-describedby', errorId)
  el.setAttribute('aria-invalid', 'true')
}

/**
 * Set error state on an element with optional message
 */
export function setError(el: MirrorElement | null, message?: string): void {
  if (!el) return

  applyErrorState(el)
  setFormValidity(el, message || 'Invalid')

  if (message) {
    const errorEl = getOrCreateErrorElement(el)
    errorEl.textContent = message
    errorEl.style.display = 'block'
    setErrorAccessibility(el, errorEl.id)
  }
}

/**
 * Remove visual error state from element
 */
function removeErrorState(el: MirrorElement): void {
  delete el.dataset.invalid
  removeState(el, 'invalid')
}

/**
 * Clear custom validity on form element
 */
function clearFormValidity(el: MirrorElement): void {
  if (isTextInput(el)) {
    el.setCustomValidity('')
  }
}

/**
 * Hide error message element
 */
function hideErrorElement(el: MirrorElement): void {
  const errorId = el.dataset.errorId
  if (errorId) {
    const errorEl = document.getElementById(errorId)
    if (errorEl) {
      errorEl.style.display = 'none'
    }
  }
}

/**
 * Clear accessibility attributes
 */
function clearErrorAccessibility(el: MirrorElement): void {
  el.removeAttribute('aria-describedby')
  el.removeAttribute('aria-invalid')
}

/**
 * Clear error state from an element
 */
export function clearError(el: MirrorElement | null): void {
  if (!el) return

  removeErrorState(el)
  clearFormValidity(el)
  hideErrorElement(el)
  clearErrorAccessibility(el)
}
