/**
 * Input Control Functions
 *
 * Focus, blur, clear, and error handling for form inputs.
 *
 * Each public function accepts either a real HTMLElement or a Mirror
 * element name (string). Self-contained — type guards and error-DOM
 * helpers are nested inside the public functions so the runtime
 * template can stamp each one verbatim via .toString() with no
 * external references.
 *
 * State management note: the previous version called `applyState`/
 * `removeState` from state-machine.ts, which was inconsistent with the
 * template that just toggled dataset.state directly. Aligning on the
 * direct-dataset approach: simpler, no state-machine round-trip, and
 * matches what production runtime has always actually shipped.
 */

import type { MirrorElement } from './types'
import { resolveElement } from './dom-lookup'

/**
 * Focus an input element (or focusable element with tabindex).
 */
export function focus(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  const isFormElement =
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement
  if (isFormElement) {
    ;(target as HTMLInputElement).focus()
  } else if (target.tabIndex >= 0 || target.hasAttribute('tabindex')) {
    target.focus()
  }
}

/**
 * Remove focus from an element.
 */
export function blur(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  target.blur()
}

/**
 * Clear the value of an input element.
 */
export function clear(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  if (isTextInput) {
    ;(target as HTMLInputElement).value = ''
    target.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/**
 * Select all text in an input element.
 */
export function selectText(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  if (isTextInput) {
    ;(target as HTMLInputElement).select()
  }
}

/**
 * Set error state on an element with optional message. Sets
 * dataset.state='invalid', sets aria-invalid, sets custom validity
 * on form inputs, and renders/updates a sibling error-message span.
 */
export function setError(el: MirrorElement | string | null, message?: string): void {
  const target = resolveElement(el)
  if (!target) return
  target.dataset.invalid = 'true'
  target.dataset.state = 'invalid'
  target.setAttribute('aria-invalid', 'true')

  const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  if (isTextInput) {
    ;(target as HTMLInputElement).setCustomValidity(message || 'Invalid')
  }

  if (message) {
    const errorId = target.dataset.errorId || `${target.id || target.dataset.name || 'field'}-error`
    target.dataset.errorId = errorId

    let errorEl = document.getElementById(errorId)
    if (!errorEl) {
      errorEl = document.createElement('span')
      errorEl.id = errorId
      errorEl.className = 'mirror-error-message'
      errorEl.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;'
      target.parentNode?.insertBefore(errorEl, target.nextSibling)
    }
    errorEl.textContent = message
    errorEl.style.display = 'block'
    target.setAttribute('aria-describedby', errorId)
  }
}

/**
 * Clear error state from an element.
 */
export function clearError(el: MirrorElement | string | null): void {
  const target = resolveElement(el)
  if (!target) return
  delete target.dataset.invalid
  if (target.dataset.state === 'invalid') {
    delete target.dataset.state
  }
  target.removeAttribute('aria-describedby')
  target.removeAttribute('aria-invalid')

  const isTextInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
  if (isTextInput) {
    ;(target as HTMLInputElement).setCustomValidity('')
  }

  const errorId = target.dataset.errorId
  if (errorId) {
    const errorEl = document.getElementById(errorId)
    if (errorEl) {
      errorEl.style.display = 'none'
    }
  }
}
