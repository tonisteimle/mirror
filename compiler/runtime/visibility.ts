/**
 * Visibility Control Functions
 *
 * Functions for showing, hiding, and toggling element visibility.
 */

import type { MirrorElement } from './types'
import { batchInFrame } from './batching'

/**
 * Show an element by restoring its display value
 */
export function show(el: MirrorElement | null): void {
  if (!el) return
  batchInFrame(() => {
    el.style.display = el._savedDisplay || ''
    el.hidden = false
  })
}

/**
 * Hide an element by setting display to none
 */
export function hide(el: MirrorElement | null): void {
  if (!el) return
  if (el.style.display !== 'none') {
    el._savedDisplay = el.style.display
  }
  batchInFrame(() => {
    el.style.display = 'none'
    el.hidden = true
  })
}
