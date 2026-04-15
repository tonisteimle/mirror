/**
 * Clipboard Operations
 *
 * Copy text to clipboard with feedback support.
 */

import type { MirrorElement } from './types'

const FEEDBACK_DURATION = 2000

/**
 * Apply 'copied' state feedback to trigger element
 */
function applyFeedback(el: MirrorElement | undefined): void {
  if (!el) return

  const prevState = el.dataset.state
  el.dataset.state = 'copied'

  if (el._stateStyles?.copied) {
    Object.assign(el.style, el._stateStyles.copied)
  }

  setTimeout(() => {
    restorePreviousState(el, prevState)
  }, FEEDBACK_DURATION)
}

/**
 * Restore element to previous state
 */
function restorePreviousState(el: MirrorElement, prevState: string | undefined): void {
  if (prevState) {
    el.dataset.state = prevState
  } else {
    delete el.dataset.state
  }

  if (el._baseStyles) {
    Object.assign(el.style, el._baseStyles)
  }
}

/**
 * Try modern clipboard API
 */
async function tryModernClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Fallback copy using temporary textarea
 */
function fallbackCopy(text: string): void {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()

  try {
    document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
}

/**
 * Copy text to clipboard
 */
export async function copy(
  text: string | HTMLElement,
  triggerElement?: MirrorElement
): Promise<void> {
  const textToCopy = typeof text === 'string' ? text : text.textContent || ''

  const success = await tryModernClipboard(textToCopy)
  if (!success) {
    fallbackCopy(textToCopy)
  }

  applyFeedback(triggerElement)
}
