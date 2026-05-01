/**
 * Mirror DOM Runtime
 *
 * Core runtime functions for Mirror-generated DOM code.
 * These functions handle element state, visibility, selection,
 * highlighting, navigation, and other interactive behaviors.
 *
 * This module is designed to be:
 * 1. Bundled with generated code (for standalone builds)
 * 2. Unit-testable in isolation
 * 3. Tree-shakeable for production builds
 */

// Focus trap for modal dialogs - accessibility
import { createFocusTrap, FocusTrap } from 'focus-trap'
// Frame batching — single source of truth in batching.ts
import { batchInFrame } from './batching'
// Visibility primitives — single source of truth in visibility.ts
import { show, hide } from './visibility'
// Cleanup primitives — single source of truth in cleanup.ts
import { registerForCleanup, cleanupElement, initCleanupObserver } from './cleanup'
// Data binding — single source of truth in data-binding.ts
import { bindValue, bindText, bindVisibility, unbindValue, notifyDataChange } from './data-binding'
// Alignment helpers — single source of truth in alignment.ts
import { alignToCSS, getAlign } from './alignment'
// Element wrapper — single source of truth in element-wrapper.ts
import { wrap, type ElementWrapper } from './element-wrapper'
// Animations — single source of truth in animations.ts
import type { StateAnimation } from './types'
import { playStateAnimation, setupEnterExitObserver } from './animations'

// ============================================
// TYPES
// ============================================

// Window.Chart is augmented by charts.ts (single source of truth)

/**
 * Extend Window interface for Mirror debug flag
 */
declare global {
  interface Window {
    __MIRROR_DEBUG__?: boolean
  }
}

/** Check if debug mode is enabled */
const isDebug = (): boolean => typeof window !== 'undefined' && window.__MIRROR_DEBUG__ === true

/**
 * Element with Mirror runtime metadata
 */
export interface MirrorElement extends HTMLElement {
  _stateStyles?: Record<string, Record<string, string>>
  _baseStyles?: Record<string, string>
  _initialState?: string
  _visibleWhen?: string
  _visibilityPaths?: string[] // Paths this element's visibility depends on
  _selectionBinding?: string
  _textBinding?: string
  _textPlaceholder?: string
  _savedDisplay?: string
  _clickOutsideHandler?: (e: MouseEvent) => void
  _clickOutsideTimeout?: ReturnType<typeof setTimeout>
  _autoSelectHandler?: () => void
  _escapeHandler?: (e: KeyboardEvent) => void
  _focusTrap?: FocusTrap
  _previouslyFocused?: Element | null
  _isTransitioning?: boolean
  _baseDisplay?: string
  _valueBinding?: string
  _textTemplate?: () => string
  _eachConfig?: {
    itemVar: string
    collection: string
    filter?: string
    /** Compiled filter predicate (replaces `filter` once parsed). */
    filterFn?: (item: Record<string, unknown>, index: number) => boolean
    /** Sort key (object-property name on each item). */
    orderBy?: string
    /** True for descending sort. */
    orderDesc?: boolean
    renderItem: (item: unknown, index: number) => HTMLElement
  }
  _conditionalConfig?: {
    condition: () => boolean
    renderThen: () => DocumentFragment
    renderElse?: () => DocumentFragment
  }
  // Loop item stored on template elements for bind/exclusive()
  _loopItem?: unknown
  // State machine (interaction model)
  _stateMachine?: {
    initial: string
    current: string
    states: Record<
      string,
      {
        styles: Record<string, string>
        children?: () => HTMLElement[] // Factory function to create state children
        enter?: StateAnimation // Animation when entering this state
        exit?: StateAnimation // Animation when leaving this state
      }
    >
    transitions: Array<{
      to: string
      trigger: string
      key?: string
      modifier?: 'exclusive' | 'toggle' | 'initial'
    }>
  }
  // Base children (before any state change)
  _baseChildren?: HTMLElement[]
}

/**
 * Mirror property to CSS mapping
 */
export const PROP_MAP: Record<string, string> = {
  bg: 'background',
  col: 'color',
  pad: 'padding',
  rad: 'borderRadius',
  gap: 'gap',
  w: 'width',
  h: 'height',
  opacity: 'opacity',
}

// ============================================
// EVENT LISTENER CLEANUP
// ============================================
// registerForCleanup, cleanupElement, initCleanupObserver — re-exported from cleanup.ts (single source of truth)
export { registerForCleanup, cleanupElement, initCleanupObserver }

// ============================================
// ELEMENT RESOLUTION
// ============================================

/**
 * Resolve an element by name string or return the element directly.
 * @param element Element or name string (data-mirror-name attribute)
 */
function resolveElementByName(element: MirrorElement | string | null): MirrorElement | null {
  if (!element) return null
  if (typeof element === 'string') {
    return document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
  }
  return element
}

// alignToCSS, getAlign, wrap, ElementWrapper — re-exported from alignment.ts and element-wrapper.ts (single source of truth)
export { alignToCSS, getAlign, wrap }
export type { ElementWrapper }

// ============================================
// VISIBILITY & TOGGLE
// ============================================

const STATE_PAIRS: Record<string, string> = {
  closed: 'open',
  open: 'closed',
  collapsed: 'expanded',
  expanded: 'collapsed',
}

/**
 * Toggle element visibility or state
 */
export function toggle(el: MirrorElement | null): void {
  if (!el) return
  if (el._stateMachine) {
    stateMachineToggle(el)
    return
  }
  const currentState = el.dataset.state || el._initialState
  const newState = STATE_PAIRS[currentState as string]
  if (newState) {
    setState(el, newState)
    return
  }
  el.hidden = !el.hidden
  applyState(el, el.hidden ? 'off' : 'on')
}

// show/hide — re-exported from visibility.ts (single source of truth)
export { show, hide }

/**
 * Close an element (set to closed/collapsed state or hide)
 */
export function close(el: MirrorElement | null): void {
  if (!el) return
  const states = [el._initialState, el.dataset.state]
  if (states.some(s => s === 'open' || s === 'closed')) {
    setState(el, 'closed')
    return
  }
  if (states.some(s => s === 'expanded' || s === 'collapsed')) {
    setState(el, 'collapsed')
    return
  }
  hide(el)
}

// ============================================
// OVERLAYS & POSITIONING
// ============================================

/**
 * Position options for overlay positioning
 */
export type OverlayPosition = 'below' | 'above' | 'left' | 'right' | 'center'

export interface PositionOptions {
  offset?: number
  flip?: boolean
  align?: 'start' | 'center' | 'end'
}

/**
 * Calculate position for an overlay relative to a trigger element
 */
function calculateOverlayPosition(
  element: HTMLElement,
  trigger: HTMLElement,
  position: OverlayPosition,
  options: PositionOptions = {}
): { top: number; left: number } {
  const { offset = 4, flip = true, align = 'start' } = options
  const triggerRect = trigger.getBoundingClientRect()
  const viewport = { width: window.innerWidth, height: window.innerHeight }

  // We need element dimensions - temporarily make visible if hidden
  const wasHidden = element.style.display === 'none' || element.hidden
  if (wasHidden) {
    element.style.visibility = 'hidden'
    element.style.display = ''
    element.hidden = false
  }
  const elementRect = element.getBoundingClientRect()
  if (wasHidden) {
    element.style.visibility = ''
    element.style.display = 'none'
    element.hidden = true
  }

  let top: number
  let left: number

  // Calculate horizontal alignment
  function getHorizontalPosition(): number {
    switch (align) {
      case 'center':
        return triggerRect.left + (triggerRect.width - elementRect.width) / 2
      case 'end':
        return triggerRect.right - elementRect.width
      case 'start':
      default:
        return triggerRect.left
    }
  }

  // Calculate vertical alignment
  function getVerticalPosition(): number {
    switch (align) {
      case 'center':
        return triggerRect.top + (triggerRect.height - elementRect.height) / 2
      case 'end':
        return triggerRect.bottom - elementRect.height
      case 'start':
      default:
        return triggerRect.top
    }
  }

  switch (position) {
    case 'below':
      top = triggerRect.bottom + offset
      left = getHorizontalPosition()
      // Flip to above if no space below
      if (flip && top + elementRect.height > viewport.height) {
        const flippedTop = triggerRect.top - elementRect.height - offset
        if (flippedTop >= 0) {
          top = flippedTop
        }
      }
      break

    case 'above':
      top = triggerRect.top - elementRect.height - offset
      left = getHorizontalPosition()
      // Flip to below if no space above
      if (flip && top < 0) {
        const flippedTop = triggerRect.bottom + offset
        if (flippedTop + elementRect.height <= viewport.height) {
          top = flippedTop
        }
      }
      break

    case 'left':
      top = getVerticalPosition()
      left = triggerRect.left - elementRect.width - offset
      // Flip to right if no space left
      if (flip && left < 0) {
        const flippedLeft = triggerRect.right + offset
        if (flippedLeft + elementRect.width <= viewport.width) {
          left = flippedLeft
        }
      }
      break

    case 'right':
      top = getVerticalPosition()
      left = triggerRect.right + offset
      // Flip to left if no space right
      if (flip && left + elementRect.width > viewport.width) {
        const flippedLeft = triggerRect.left - elementRect.width - offset
        if (flippedLeft >= 0) {
          left = flippedLeft
        }
      }
      break

    case 'center':
      // Center in viewport
      top = (viewport.height - elementRect.height) / 2
      left = (viewport.width - elementRect.width) / 2
      break

    default:
      top = triggerRect.bottom + offset
      left = triggerRect.left
  }

  // Clamp to viewport bounds
  left = Math.max(8, Math.min(left, viewport.width - elementRect.width - 8))
  top = Math.max(8, Math.min(top, viewport.height - elementRect.height - 8))

  return { top, left }
}

/**
 * Show element positioned relative to trigger
 * @param element Element to show (or name string)
 * @param trigger Trigger element (optional, uses event.target if not provided)
 * @param position Position relative to trigger: 'below' | 'above' | 'left' | 'right' | 'center'
 * @param options Positioning options: { offset?, flip?, align? }
 */
export function showAt(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  position: OverlayPosition = 'below',
  options?: PositionOptions
): void {
  const el = resolveElementByName(element)
  if (!el) return
  const triggerEl = trigger || (window.event?.target as MirrorElement) || null
  if (!triggerEl && position !== 'center') {
    console.warn('showAt: No trigger element provided and no event context')
    return
  }

  // Store original position style
  if (!el.dataset.originalPosition) {
    el.dataset.originalPosition = el.style.position || ''
  }

  // Position the element
  if (position === 'center') {
    // Center in viewport (modal-style)
    el.style.position = 'fixed'
    const viewport = { width: window.innerWidth, height: window.innerHeight }

    // Make visible to get dimensions
    const wasHidden = el.style.display === 'none' || el.hidden
    if (wasHidden) {
      el.style.visibility = 'hidden'
      el.style.display = ''
      el.hidden = false
    }
    const rect = el.getBoundingClientRect()

    el.style.top = `${(viewport.height - rect.height) / 2}px`
    el.style.left = `${(viewport.width - rect.width) / 2}px`

    if (wasHidden) {
      el.style.visibility = ''
    }
  } else if (triggerEl) {
    const pos = calculateOverlayPosition(el, triggerEl, position, options)
    el.style.position = 'fixed'
    el.style.top = `${pos.top}px`
    el.style.left = `${pos.left}px`
  }

  // Show the element
  show(el)

  // Store trigger reference for dismiss
  el.dataset.triggerId = triggerEl?.dataset.mirrorId || ''

  // Setup click-outside handler for auto-dismiss
  setupClickOutsideHandler(el, triggerEl)
}

/**
 * Show element positioned below trigger (convenience function)
 */
export function showBelow(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  offset?: number
): void {
  showAt(element, trigger, 'below', { offset, flip: true })
}

/**
 * Show element positioned above trigger (convenience function)
 */
export function showAbove(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  offset?: number
): void {
  showAt(element, trigger, 'above', { offset, flip: true })
}

/**
 * Show element positioned to the left of trigger
 */
export function showLeft(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  offset?: number
): void {
  showAt(element, trigger, 'left', { offset, flip: true })
}

/**
 * Show element positioned to the right of trigger
 */
export function showRight(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  offset?: number
): void {
  showAt(element, trigger, 'right', { offset, flip: true })
}

/**
 * Show element as centered modal with optional backdrop
 */
export function showModal(element: MirrorElement | string | null, backdrop: boolean = true): void {
  const el = resolveElementByName(element)
  if (!el) return

  // Create backdrop if requested
  if (backdrop) {
    let backdropEl = document.querySelector('[data-mirror-backdrop]') as HTMLElement
    if (!backdropEl) {
      backdropEl = document.createElement('div')
      backdropEl.dataset.mirrorBackdrop = 'true'
      backdropEl.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
      `
      document.body.appendChild(backdropEl)
    }
    backdropEl.style.display = ''

    // Click backdrop to dismiss
    backdropEl.onclick = () => dismiss(el)

    // Store backdrop reference
    el.dataset.hasBackdrop = 'true'
  }

  // Position and show modal
  el.style.position = 'fixed'
  el.style.zIndex = '1000'

  // Center the modal
  const wasHidden = el.style.display === 'none' || el.hidden
  if (wasHidden) {
    el.style.visibility = 'hidden'
    el.style.display = ''
    el.hidden = false
  }

  const rect = el.getBoundingClientRect()
  const viewport = { width: window.innerWidth, height: window.innerHeight }

  el.style.top = `${Math.max(20, (viewport.height - rect.height) / 2)}px`
  el.style.left = `${Math.max(20, (viewport.width - rect.width) / 2)}px`

  if (wasHidden) {
    el.style.visibility = ''
  }

  show(el)

  // Store previously focused element for restoration
  el._previouslyFocused = document.activeElement

  // Setup focus trap for accessibility
  // This keeps keyboard focus within the modal
  // Only attempt if we're in a browser environment with MutationObserver (required by focus-trap)
  const isBrowserEnv = typeof MutationObserver !== 'undefined'

  if (isBrowserEnv) {
    try {
      el._focusTrap = createFocusTrap(el, {
        escapeDeactivates: true,
        allowOutsideClick: true,
        returnFocusOnDeactivate: true,
        // Find the first focusable element, or the modal itself
        initialFocus: () => {
          const autofocus = el.querySelector('[autofocus]') as HTMLElement
          if (autofocus) return autofocus
          const firstFocusable = el.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement
          return firstFocusable || el
        },
        // When escape is pressed, dismiss the modal
        onDeactivate: () => {
          dismiss(el)
        },
        // Prevent scroll on body when modal is open
        preventScroll: true,
      })
      el._focusTrap.activate()
    } catch (err) {
      // Fallback: focus trap creation failed, use manual escape handler
      console.warn('[Accessibility] Focus trap creation failed:', err)
      setupFallbackEscapeHandler(el)
    }
  } else {
    // Non-browser environment: use simple escape handler
    setupFallbackEscapeHandler(el)
  }

  function setupFallbackEscapeHandler(element: MirrorElement) {
    const escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        dismiss(element)
        document.removeEventListener('keydown', escapeHandler)
      }
    }
    document.addEventListener('keydown', escapeHandler)
    element._escapeHandler = escapeHandler
  }

  registerForCleanup(el)
}

/**
 * Dismiss/close an overlay element
 * Cleans up positioning, backdrop, and event handlers
 */
export function dismiss(element: MirrorElement | string | null): void {
  const el = resolveElementByName(element)
  if (!el) return

  // Hide the element
  hide(el)

  // Restore original position
  if (el.dataset.originalPosition !== undefined) {
    el.style.position = el.dataset.originalPosition
    delete el.dataset.originalPosition
  }

  // Remove backdrop if present
  if (el.dataset.hasBackdrop) {
    const backdrop = document.querySelector('[data-mirror-backdrop]') as HTMLElement
    if (backdrop) {
      backdrop.style.display = 'none'
    }
    delete el.dataset.hasBackdrop
  }

  // Clean up click-outside handler and pending timeout
  if (el._clickOutsideTimeout) {
    clearTimeout(el._clickOutsideTimeout)
    delete el._clickOutsideTimeout
  }
  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }

  // Clean up focus trap
  if (el._focusTrap) {
    try {
      el._focusTrap.deactivate({ returnFocus: false })
    } catch {
      // Ignore errors during deactivation
    }
    delete el._focusTrap
  }

  // Restore focus to previously focused element
  if (
    el._previouslyFocused &&
    typeof el._previouslyFocused === 'object' &&
    'focus' in el._previouslyFocused
  ) {
    ;(el._previouslyFocused as HTMLElement).focus()
    delete el._previouslyFocused
  }

  // Clean up escape handler (fallback when focus-trap not available)
  if (el._escapeHandler) {
    document.removeEventListener('keydown', el._escapeHandler)
    delete el._escapeHandler
  }

  // Clear positioning styles
  el.style.top = ''
  el.style.left = ''
  el.style.zIndex = ''

  // Clear trigger reference
  delete el.dataset.triggerId
}

// ============================================
// OVERLAY HANDLERS
// ============================================

/**
 * Setup click-outside handler for auto-dismissing overlays
 */
function setupClickOutsideHandler(element: MirrorElement, trigger: MirrorElement | null): void {
  // Remove existing handler
  if (element._clickOutsideHandler) {
    document.removeEventListener('click', element._clickOutsideHandler)
    delete element._clickOutsideHandler
  }

  // Cancel any pending handler setup (prevents race condition)
  if (element._clickOutsideTimeout) {
    clearTimeout(element._clickOutsideTimeout)
    delete element._clickOutsideTimeout
  }

  // Register for cleanup BEFORE setting timeout to ensure cleanup if element is removed
  // while timeout is pending (prevents memory leak)
  registerForCleanup(element)

  // Create new handler with delay to avoid immediate trigger
  element._clickOutsideTimeout = setTimeout(() => {
    delete element._clickOutsideTimeout

    // Safety: Verify element is still in DOM before adding listener
    if (!element.isConnected) {
      return
    }

    element._clickOutsideHandler = (e: MouseEvent) => {
      const target = e.target

      // Guard: target must be a valid Element (not null, not text node)
      if (!target || !(target instanceof Element)) return

      // Don't dismiss if click is inside the overlay
      if (element.contains(target)) return

      // Don't dismiss if click is on the trigger
      if (trigger && trigger.contains(target)) return

      dismiss(element)
    }

    document.addEventListener('click', element._clickOutsideHandler)
  }, 10)
}

// ============================================
// SCROLL FUNCTIONS
// ============================================

/**
 * Scroll options for scrollTo
 */
export interface ScrollToOptions {
  behavior?: 'smooth' | 'instant'
  block?: 'start' | 'center' | 'end' | 'nearest'
  inline?: 'start' | 'center' | 'end' | 'nearest'
}

/**
 * Scroll an element into view
 * @param element Element to scroll to (or name string)
 * @param options Scroll options: { behavior?, block?, inline? }
 */
export function scrollTo(element: MirrorElement | string | null, options?: ScrollToOptions): void {
  const el = resolveElementByName(element)
  if (!el) return
  const { behavior = 'smooth', block = 'start', inline = 'nearest' } = options || {}
  el.scrollIntoView({ behavior, block, inline })
}

/**
 * Scroll within a container by a specific offset
 * @param container Container element to scroll (or name string)
 * @param x Horizontal scroll offset (positive = right)
 * @param y Vertical scroll offset (positive = down)
 * @param behavior Scroll behavior: 'smooth' | 'instant'
 */
export function scrollBy(
  container: MirrorElement | string | null,
  x: number = 0,
  y: number = 0,
  behavior: 'smooth' | 'instant' = 'smooth'
): void {
  const el = resolveElementByName(container)
  if (!el) return
  el.scrollBy({ left: x, top: y, behavior })
}

/**
 * Scroll to top of an element or page
 * @param element Optional element to scroll to top of. If not provided, scrolls page to top.
 * @param behavior Scroll behavior: 'smooth' | 'instant'
 */
export function scrollToTop(
  element?: MirrorElement | string | null,
  behavior: 'smooth' | 'instant' = 'smooth'
): void {
  if (!element) {
    window.scrollTo({ top: 0, behavior })
    return
  }
  const el = resolveElementByName(element)
  if (el) el.scrollTo({ top: 0, behavior })
}

/**
 * Scroll to bottom of an element or page
 * @param element Optional element to scroll to bottom of. If not provided, scrolls page to bottom.
 * @param behavior Scroll behavior: 'smooth' | 'instant'
 */
export function scrollToBottom(
  element?: MirrorElement | string | null,
  behavior: 'smooth' | 'instant' = 'smooth'
): void {
  if (!element) {
    window.scrollTo({ top: document.body.scrollHeight, behavior })
    return
  }
  const el = resolveElementByName(element)
  if (el) el.scrollTo({ top: el.scrollHeight, behavior })
}

// ============================================
// VALUE FUNCTIONS + CRUD — re-exported from data.ts (single source of truth)
// ============================================

import {
  type CounterOptions,
  get,
  set,
  increment,
  decrement,
  reset,
  add,
  remove,
  create,
  save,
  deleteItem,
  revert,
  updateField,
  setupEditable,
  refreshEachLoops,
  refreshAllEachLoops,
} from './data'
export type { CounterOptions }
export {
  get,
  set,
  increment,
  decrement,
  reset,
  add,
  remove,
  create,
  save,
  deleteItem,
  revert,
  updateField,
  setupEditable,
  refreshEachLoops,
  refreshAllEachLoops,
}

// ============================================
// CLIPBOARD
// ============================================

/**
 * Copy text to clipboard
 * @param text - Text to copy (string or element whose textContent will be copied)
 * @param triggerElement - Optional element to apply 'copied' state to
 */
export async function copy(
  text: string | HTMLElement,
  triggerElement?: MirrorElement
): Promise<void> {
  const textToCopy = typeof text === 'string' ? text : text.textContent || ''

  const applyFeedback = () => {
    if (triggerElement) {
      // Store previous state to restore later
      const prevState = triggerElement.dataset.state
      triggerElement.dataset.state = 'copied'
      // Apply copied styles if defined
      if (triggerElement._stateStyles?.copied) {
        Object.assign(triggerElement.style, triggerElement._stateStyles.copied)
      }
      // Auto-reset after 2 seconds
      setTimeout(() => {
        if (prevState) {
          triggerElement.dataset.state = prevState
        } else {
          delete triggerElement.dataset.state
        }
        // Restore base styles
        if (triggerElement._baseStyles) {
          Object.assign(triggerElement.style, triggerElement._baseStyles)
        }
      }, 2000)
    }
  }

  try {
    await navigator.clipboard.writeText(textToCopy)
    applyFeedback()
  } catch (err) {
    // Fallback for older browsers or restricted contexts
    const textarea = document.createElement('textarea')
    textarea.value = textToCopy
    textarea.style.position = 'fixed'
    textarea.style.left = '-9999px'
    document.body.appendChild(textarea)
    textarea.select()
    try {
      document.execCommand('copy')
      applyFeedback()
    } finally {
      document.body.removeChild(textarea)
    }
  }
}

// ============================================
// FEEDBACK: TOAST — re-exported from toast.ts (single source of truth)
// ============================================

export { toast, dismissToast } from './toast'

// ============================================
// INPUT CONTROL — re-exported from input-control.ts (single source of truth)
// ============================================

export { focus, blur, clear, selectText, setError, clearError } from './input-control'

// ============================================
// NAVIGATION: BROWSER — re-exported from navigation.ts (single source of truth)
// ============================================

export { back, forward, openUrl } from './navigation'

// ============================================
// SELECTION + HIGHLIGHTING + ACTIVATION — re-exported from selection.ts (single source of truth)
// ============================================

export {
  select,
  deselect,
  selectHighlighted,
  highlight,
  unhighlight,
  highlightNext,
  highlightPrev,
  highlightFirst,
  highlightLast,
  getHighlightableItems,
  activate,
  deactivate,
} from './selection'

// ============================================
// STATE MANAGEMENT — re-exported from state-machine.ts (single source of truth)
// ============================================

import {
  applyState,
  removeState,
  setState,
  toggleState,
  stateMachineToggle,
  transitionTo,
  exclusiveTransition,
  watchStates,
  updateVisibility,
} from './state-machine'
export {
  applyState,
  removeState,
  setState,
  toggleState,
  stateMachineToggle,
  transitionTo,
  exclusiveTransition,
  watchStates,
  updateVisibility,
}

// ============================================
// NAVIGATION — re-exported from component-navigation.ts (single source of truth)
// ============================================

export {
  navigate,
  updateNavSelection,
  navigateToPage,
  getPageContainer,
} from './component-navigation'

// ============================================
// SELECTION BINDING — re-exported from selection.ts (single source of truth)
// ============================================

export { updateSelectionBinding, updateBoundElements } from './selection'

// ============================================
// ICONS — re-exported from icons.ts (single source of truth)
// ============================================

export { registerIcon, loadIcon, preloadIcons } from './icons'

// ============================================
// ANIMATIONS — re-exported from animations.ts (single source of truth)
// ============================================

export type { StateAnimation }
export { playStateAnimation, setupEnterExitObserver }

// ============================================
// TWO-WAY DATA BINDING
// ============================================
// bindValue, bindText, bindVisibility, unbindValue, notifyDataChange — re-exported from data-binding.ts (single source of truth)
export { bindValue, bindText, bindVisibility, unbindValue, notifyDataChange }

// ============================================
// CHARTS — re-exported from charts.ts (single source of truth)
// ============================================

export type { ChartConfig, ChartSlotConfig } from './charts'
export { createChart, updateChart, parseChartData } from './charts'

// ============================================
// TEST API
// ============================================

import { initTestAPI as initTestAPIFromModule, type MirrorTestAPI } from './test-api/index'
import { navigate, navigateToPage, getPageContainer } from './component-navigation'

/**
 * Initialize Test API on window object
 * Always available for testing purposes (minimal overhead)
 */
export function initTestAPI(): MirrorTestAPI {
  return initTestAPIFromModule({
    // State Machine
    transitionTo,
    stateMachineToggle,
    exclusiveTransition,
    // Visibility
    show,
    hide,
    updateVisibility,
    // Overlays & Positioning
    showAt,
    showBelow,
    showAbove,
    showLeft,
    showRight,
    showModal,
    dismiss,
    // Navigation
    navigate,
    navigateToPage,
    getPageContainer,
  })
}

// Auto-initialize when running in browser
if (typeof window !== 'undefined') {
  initTestAPI()
}
