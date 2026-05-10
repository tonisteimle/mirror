/**
 * Scroll Operations
 *
 * Smooth/instant scrolling for elements and the window.
 */

import type { MirrorElement } from './types'
import { resolveElement } from './dom-lookup'

// Re-export so the runtime template can keep importing `resolveElement`
// from this module — it physically lives in dom-lookup now (shared with
// input-control and other consumers).
export { resolveElement }

export interface ScrollToOptions {
  behavior?: 'smooth' | 'instant'
  block?: 'start' | 'center' | 'end' | 'nearest'
  inline?: 'start' | 'center' | 'end' | 'nearest'
}

type ScrollBehavior = 'smooth' | 'instant'

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

/**
 * Walk up the parent chain from `start` and return the first ancestor
 * that has `overflow-y: auto|scroll` *and* actual overflow content
 * (`scrollHeight > clientHeight`). Returns `null` when none is found —
 * caller should fall back to window scroll. `start` itself is not
 * considered: the click source is usually a button which is not
 * scrollable; we want the scrollable container around it.
 */
export function findScrollableAncestor(start: HTMLElement | null): HTMLElement | null {
  if (!start) return null
  let cur: HTMLElement | null = start.parentElement
  while (cur && cur !== document.body && cur !== document.documentElement) {
    const style = getComputedStyle(cur)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && cur.scrollHeight > cur.clientHeight) {
      return cur
    }
    cur = cur.parentElement
  }
  return null
}

/**
 * Context-aware companion to `scrollToTop`: when no explicit target was
 * given in DSL (`Button "↑", scrollToTop()`), the click source is passed
 * here. We walk up to find the closest scrollable ancestor and scroll
 * *that*, falling back to window. Pre-fix the no-arg form always hit
 * `window.scrollTo`, which was useless inside a `Frame h 150, scroll`
 * container — see findings.md "scrollToTop/Bottom Container-Scroll".
 */
export function scrollContainerToTop(
  context?: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
): void {
  const ancestor = findScrollableAncestor(context ?? null)
  if (ancestor) {
    ancestor.scrollTo({ top: 0, behavior })
    return
  }
  window.scrollTo({ top: 0, behavior })
}

export function scrollContainerToBottom(
  context?: HTMLElement | null,
  behavior: ScrollBehavior = 'smooth'
): void {
  const ancestor = findScrollableAncestor(context ?? null)
  if (ancestor) {
    ancestor.scrollTo({ top: ancestor.scrollHeight, behavior })
    return
  }
  window.scrollTo({ top: document.body.scrollHeight, behavior })
}
