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
 * Update trigger element text to show selected value
 */
function updateTriggerText(container: MirrorElement, selectedText: string): void {
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
 * Check if container has loop-focus enabled
 */
function hasLoopFocus(container: MirrorElement): boolean {
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
// TYPEAHEAD
// ============================================

// Typeahead state per container
const typeaheadBuffers = new WeakMap<MirrorElement, { text: string; timeout: number }>()

/**
 * Setup typeahead for a container
 * Typing characters jumps to matching item
 */
export function setupTypeahead(container: MirrorElement): void {
  if (container._typeaheadEnabled) return
  container._typeaheadEnabled = true

  container.addEventListener('keydown', (e: KeyboardEvent) => {
    // Only handle printable characters
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return

    const char = e.key.toLowerCase()
    handleTypeahead(container, char)
  })
}

/**
 * Handle typeahead character input
 */
function handleTypeahead(container: MirrorElement, char: string): void {
  const items = getHighlightableItems(container)
  if (!items.length) return

  // Get or create buffer
  let state = typeaheadBuffers.get(container)
  if (!state) {
    state = { text: '', timeout: 0 }
    typeaheadBuffers.set(container, state)
  }

  // Clear previous timeout
  if (state.timeout) {
    clearTimeout(state.timeout)
  }

  // Add character to buffer
  state.text += char

  // Find matching item
  const searchText = state.text.toLowerCase()
  const match = items.find(item => {
    const text = item.textContent?.trim().toLowerCase() || ''
    return text.startsWith(searchText)
  })

  if (match) {
    highlight(match)
    // Scroll into view if needed
    match.scrollIntoView({ block: 'nearest' })
  }

  // Clear buffer after 500ms of no typing
  state.timeout = window.setTimeout(() => {
    state!.text = ''
  }, 500)
}

/**
 * Enable typeahead on a container (can be called from DSL)
 */
export function typeahead(container: MirrorElement | null): void {
  if (!container) return
  setupTypeahead(container)
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
