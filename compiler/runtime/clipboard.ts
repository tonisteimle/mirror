/**
 * Clipboard Operations
 *
 * Copy text to clipboard with feedback support (modern API + textarea fallback).
 */

import type { MirrorElement } from './types'

const FEEDBACK_DURATION = 2000

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

function applyFeedback(el: MirrorElement | undefined): void {
  if (!el) return

  const prevState = el.dataset.state
  el.dataset.state = 'copied'

  if (el._stateStyles?.copied) {
    Object.assign(el.style, el._stateStyles.copied)
  }

  setTimeout(() => restorePreviousState(el, prevState), FEEDBACK_DURATION)
}

async function tryModernClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

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
 * Copy text (string or element textContent) to clipboard. Optional triggerElement
 * receives a 'copied' state for FEEDBACK_DURATION ms.
 */
export async function copy(
  text: string | HTMLElement,
  triggerElement?: MirrorElement
): Promise<void> {
  const textToCopy = typeof text === 'string' ? text : text.textContent || ''

  const success = await tryModernClipboard(textToCopy)
  if (!success) fallbackCopy(textToCopy)

  applyFeedback(triggerElement)
}
