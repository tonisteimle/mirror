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
 * Also updates any trigger elements bound to show the selected text
 */
export function updateSelectionBinding(el: MirrorElement): void {
  if (!el) return

  let parent = el.parentElement as MirrorElement | null
  const value = el.textContent?.trim() || ''

  while (parent) {
    if (parent._selectionBinding) {
      const varName = parent._selectionBinding

      const mirrorState = ((window as { _mirrorState?: Record<string, string> })._mirrorState ||=
        {})
      mirrorState[varName] = value

      updateBoundElements(varName, value)
    }

    // Update trigger elements that display the selected value
    if (parent._triggerBinding) {
      updateTriggerText(parent, value)
    }

    parent = parent.parentElement as MirrorElement | null
  }
}

/**
 * Update trigger element text to show selected value.
 * Exported so the runtime template can stamp it alongside the
 * public selection API (it's referenced by name from
 * updateSelectionBinding).
 */
export function updateTriggerText(container: MirrorElement, selectedText: string): void {
  // Find the trigger element within the container
  // Try both data-trigger attribute and data-mirror-name="Trigger"
  const trigger = (container.querySelector('[data-trigger]') ||
    container.querySelector('[data-mirror-name="Trigger"]')) as MirrorElement | null

  if (trigger) {
    // Find the text element within the trigger (span or element with data-text)
    const textEl = trigger.querySelector('span, [data-text]') as HTMLElement | null
    if (textEl) {
      textEl.textContent = selectedText
    } else {
      // If no text element, update the trigger's first text node
      const textNode = Array.from(trigger.childNodes).find(
        node => node.nodeType === Node.TEXT_NODE && node.textContent?.trim()
      )
      if (textNode) {
        textNode.textContent = selectedText
      }
    }
  }
}

/**
 * Bind a container to update its trigger text on selection
 */
export function bindTriggerText(container: MirrorElement | null): void {
  if (!container) return
  container._triggerBinding = 'true'
}

// ============================================
// SELECTION
// ============================================

/**
 * Deselect siblings of element. Exported for runtime-template stamping
 * (referenced by name from select()).
 */
export function deselectSiblings(el: MirrorElement): void {
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
 * Unhighlight siblings of element. Exported for runtime-template
 * stamping (referenced by name from highlight()).
 */
export function unhighlightSiblings(el: MirrorElement): void {
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
 * Find current highlight index. Exported so the runtime template can
 * stamp it as a top-level helper — `highlightNext`/`highlightPrev`
 * reference it by name, so it must exist at runtime.
 */
export function findHighlightIndex(items: MirrorElement[]): number {
  return items.findIndex(el => el.dataset.highlighted === 'true')
}

/**
 * Check if container has loop-focus enabled. Exported so the runtime
 * template can stamp it (referenced by `highlightNext`/`highlightPrev`).
 */
export function hasLoopFocus(container: MirrorElement): boolean {
  return container._loopFocus === true || container.dataset.loopFocus === 'true'
}

/**
 * Highlight the next item in a container
 * With loop-focus: wraps around to first item at end
 */
export function highlightNext(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = findHighlightIndex(items)
  const loop = hasLoopFocus(container)

  let next: number
  if (current === -1) {
    next = 0
  } else if (loop) {
    next = (current + 1) % items.length
  } else {
    next = Math.min(current + 1, items.length - 1)
  }

  highlight(items[next])
}

/**
 * Highlight the previous item in a container
 * With loop-focus: wraps around to last item at beginning
 */
export function highlightPrev(container: MirrorElement | null): void {
  if (!container) return

  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = findHighlightIndex(items)
  const loop = hasLoopFocus(container)

  let prev: number
  if (current === -1) {
    prev = items.length - 1
  } else if (loop) {
    prev = (current - 1 + items.length) % items.length
  } else {
    prev = Math.max(current - 1, 0)
  }

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
 * Check if element is highlightable. Exported so the runtime template
 * can stamp it (referenced by `findHighlightableItems`).
 */
export function isHighlightable(el: MirrorElement, requireHighlightState: boolean): boolean {
  if (el._stateStyles?.highlighted) return true
  if (!requireHighlightState && el.style.cursor === 'pointer') return true
  return false
}

/**
 * Recursively find highlightable items. Exported so the runtime template
 * can stamp it (referenced by `getHighlightableItems`).
 */
export function findHighlightableItems(
  el: HTMLElement,
  requireHighlightState: boolean
): MirrorElement[] {
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
// TYPEAHEAD
// ============================================

/**
 * Setup typeahead for a container — typing characters jumps to the
 * first item whose text starts with the typed prefix. Buffer clears
 * after 500ms of no typing.
 *
 * Self-contained: per-container typing buffer is captured in the
 * keydown listener's closure (one closure per container, guarded by
 * `_typeaheadEnabled` so we don't double-bind). No module-level
 * WeakMap — keeps the function stampable into the runtime template
 * via .toString().
 */
export function setupTypeahead(container: MirrorElement): void {
  if (container._typeaheadEnabled) return
  container._typeaheadEnabled = true

  // Per-container typing buffer + timeout id, closed over by the
  // listener below. Outlives individual keypresses; dies with the
  // container (which holds the listener via addEventListener).
  const state = { text: '', timeout: 0 }

  container.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only handle printable characters
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return

    const items = getHighlightableItems(container)
    if (!items.length) return

    if (state.timeout) clearTimeout(state.timeout)
    state.text += e.key.toLowerCase()

    const searchText = state.text
    const match = items.find(item => {
      const text = item.textContent?.trim().toLowerCase() || ''
      return text.startsWith(searchText)
    })

    if (match) {
      highlight(match)
      match.scrollIntoView({ block: 'nearest' })
    }

    state.timeout = window.setTimeout(() => {
      state.text = ''
    }, 500)
  })
}

/**
 * Enable typeahead on a container (can be called from DSL).
 */
export function typeahead(container: MirrorElement | null): void {
  if (!container) return
  setupTypeahead(container)
}

/**
 * Setup hover-to-highlight on a container's items.
 *
 * Mouse-driven UX expectation: when the user moves the mouse over an
 * Item in a Select/Menu/Combobox, that item becomes the "current"
 * highlighted item. This lets keyboard arrow keys pick up where the
 * mouse left off, and gives a clear visual cue under the cursor.
 *
 * The container hosts the listener (a single delegated handler is
 * cheaper than one-per-item and survives DOM swaps inside the
 * container). We only treat elements as items when
 * `getHighlightableItems` recognises them (explicit `highlighted:`
 * state, or `cursor: pointer` fallback).
 */
export function setupHoverHighlight(container: MirrorElement): void {
  if (container._hoverHighlightEnabled) return
  container._hoverHighlightEnabled = true

  container.addEventListener('mouseover', (e: MouseEvent) => {
    const target = e.target as HTMLElement | null
    if (!target) return
    const items = getHighlightableItems(container)
    const item = items.find(it => it === target || it.contains(target))
    if (item) highlight(item as MirrorElement)
  })
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
