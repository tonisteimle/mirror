/**
 * Shared DOM lookup helpers for the Mirror runtime.
 *
 * Mirror lets users target elements by their declared name attribute
 * (`data-mirror-name`), so most runtime APIs accept either a real
 * HTMLElement or a string name. This module owns the resolution logic
 * — keep it cheap and side-effect-free so it can be stamped into the
 * runtime template alongside the consumers.
 */

import type { MirrorElement } from './types'

/**
 * Resolve a Mirror element reference: pass-through HTMLElement, or look
 * up by data-mirror-name attribute when given a string. Returns null
 * for null/undefined input or when the lookup misses.
 */
export function resolveElement(element: MirrorElement | string | null): MirrorElement | null {
  if (!element) return null
  if (typeof element !== 'string') return element
  return document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement | null
}
