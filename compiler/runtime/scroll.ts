/**
 * Scroll Operations
 *
 * Smooth/instant scrolling for elements and the window.
 */

import type { MirrorElement } from './types'

export interface ScrollToOptions {
  behavior?: 'smooth' | 'instant'
  block?: 'start' | 'center' | 'end' | 'nearest'
  inline?: 'start' | 'center' | 'end' | 'nearest'
}

type ScrollBehavior = 'smooth' | 'instant'

function resolveElement(element: MirrorElement | string | null): MirrorElement | null {
  if (!element) return null
  if (typeof element !== 'string') return element
  return document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
}

/**
 * Scroll an element into view
 */
export function scrollTo(element: MirrorElement | string | null, options?: ScrollToOptions): void {
  const el = resolveElement(element)
  if (!el) return
  const { behavior = 'smooth', block = 'start', inline = 'nearest' } = options || {}
  el.scrollIntoView({ behavior, block, inline })
}

/**
 * Scroll within a container by a specific offset
 */
export function scrollBy(
  container: MirrorElement | string | null,
  x: number = 0,
  y: number = 0,
  behavior: ScrollBehavior = 'smooth'
): void {
  const el = resolveElement(container)
  if (!el) return
  el.scrollBy({ left: x, top: y, behavior })
}

/**
 * Scroll to top of an element (or page if no element provided)
 */
export function scrollToTop(
  element?: MirrorElement | string | null,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (!element) {
    window.scrollTo({ top: 0, behavior })
    return
  }
  const el = resolveElement(element)
  if (el) el.scrollTo({ top: 0, behavior })
}

/**
 * Scroll to bottom of an element (or page if no element provided)
 */
export function scrollToBottom(
  element?: MirrorElement | string | null,
  behavior: ScrollBehavior = 'smooth'
): void {
  if (!element) {
    window.scrollTo({ top: document.body.scrollHeight, behavior })
    return
  }
  const el = resolveElement(element)
  if (el) el.scrollTo({ top: el.scrollHeight, behavior })
}
