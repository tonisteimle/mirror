/**
 * Selection & Highlighting System
 *
 * Element selection, highlighting, and keyboard navigation.
 */

import type { MirrorElement } from './types'
import { applyState, removeState } from './state-machine'

// ============================================
// SELECTION BINDING
// ============================================

/**
 * Update all elements bound to a variable
 */
export function updateBoundElements(varName: string, value: string): void {
  const elements = document.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>

  for (const el of elements) {
    if (el._textBinding === varName) {
      el.textContent = value || el._textPlaceholder || ''
    }
  }
}

/**
 * Update the selection variable when an item is selected
 */
export function updateSelectionBinding(el: MirrorElement): void {
  if (!el) return

  let parent = el.parentElement as MirrorElement | null

  while (parent) {
    if (parent._selectionBinding) {
      const value = el.textContent?.trim() || ''
      const varName = parent._selectionBinding

      const mirrorState = ((window as { _mirrorState?: Record<string, string> })._mirrorState ||=
        {})
      mirrorState[varName] = value

      updateBoundElements(varName, value)
      return
    }
    parent = parent.parentElement as MirrorElement | null
  }
}

// ============================================
// SELECTION
// ============================================

/**
 * Deselect siblings of element
 */
function deselectSiblings(el: MirrorElement): void {
  if (!el.parentElement) return

  for (const sibling of el.parentElement.children) {
    if (sibling !== el && (sibling as HTMLElement).dataset.selected) {
      deselect(sibling as MirrorElement)
    }
  }
}

/**
 * Select an element (and deselect siblings)
 */
export function select(el: MirrorElement | null): void {
  if (!el) return

  deselectSiblings(el)
  el.dataset.selected = 'true'
  applyState(el, 'selected')
  updateSelectionBinding(el)
}

/**
 * Deselect an element
 */
export function deselect(el: MirrorElement | null): void {
  if (!el) return
  delete el.dataset.selected
  removeState(el, 'selected')
}

/**
 * Select the currently highlighted element
 */
export function selectHighlighted(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  const highlighted = items.find(el => el.dataset.highlighted === 'true')

  if (highlighted) select(highlighted)
}

// ============================================
// HIGHLIGHTING
// ============================================

/**
 * Unhighlight siblings of element
 */
function unhighlightSiblings(el: MirrorElement): void {
  if (!el.parentElement) return

  for (const sibling of el.parentElement.children) {
    if (sibling !== el && (sibling as HTMLElement).dataset.highlighted) {
      unhighlight(sibling as MirrorElement)
    }
  }
}

/**
 * Highlight an element (and unhighlight siblings)
 */
export function highlight(el: MirrorElement | null): void {
  if (!el) return

  unhighlightSiblings(el)
  el.dataset.highlighted = 'true'
  applyState(el, 'highlighted')
}

/**
 * Remove highlight from an element
 */
export function unhighlight(el: MirrorElement | null): void {
  if (!el) return
  delete el.dataset.highlighted
  removeState(el, 'highlighted')
}

// ============================================
// HIGHLIGHT NAVIGATION
// ============================================

/**
 * Find current highlight index
 */
function findHighlightIndex(items: MirrorElement[]): number {
  return items.findIndex(el => el.dataset.highlighted === 'true')
}

/**
 * Highlight the next item in a container
 */
export function highlightNext(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = findHighlightIndex(items)
  const next = current === -1 ? 0 : Math.min(current + 1, items.length - 1)
  highlight(items[next])
}

/**
 * Highlight the previous item in a container
 */
export function highlightPrev(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = findHighlightIndex(items)
  const prev = current === -1 ? items.length - 1 : Math.max(current - 1, 0)
  highlight(items[prev])
}

/**
 * Highlight the first item in a container
 */
export function highlightFirst(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  if (items.length) highlight(items[0])
}

/**
 * Highlight the last item in a container
 */
export function highlightLast(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  if (items.length) highlight(items[items.length - 1])
}

// ============================================
// HIGHLIGHTABLE ITEMS DETECTION
// ============================================

/**
 * Check if element is highlightable
 */
function isHighlightable(el: MirrorElement, requireHighlightState: boolean): boolean {
  if (el._stateStyles?.highlighted) return true
  if (!requireHighlightState && el.style.cursor === 'pointer') return true
  return false
}

/**
 * Recursively find highlightable items
 */
function findHighlightableItems(el: HTMLElement, requireHighlightState: boolean): MirrorElement[] {
  const items: MirrorElement[] = []

  for (const child of el.children) {
    const mirrorChild = child as MirrorElement

    if (isHighlightable(mirrorChild, requireHighlightState)) {
      items.push(mirrorChild)
    } else {
      items.push(...findHighlightableItems(mirrorChild, requireHighlightState))
    }
  }

  return items
}

/**
 * Get all highlightable items in a container
 */
export function getHighlightableItems(container: MirrorElement): MirrorElement[] {
  // First try items with explicit highlight state
  let items = findHighlightableItems(container, true)

  // Fallback to items with cursor:pointer
  if (!items.length) {
    items = findHighlightableItems(container, false)
  }

  return items
}

// ============================================
// ACTIVATION
// ============================================

/**
 * Activate an element
 */
export function activate(el: MirrorElement | null): void {
  if (!el) return
  el.dataset.active = 'true'
  applyState(el, 'active')
}

/**
 * Deactivate an element
 */
export function deactivate(el: MirrorElement | null): void {
  if (!el) return
  delete el.dataset.active
  removeState(el, 'active')
}
