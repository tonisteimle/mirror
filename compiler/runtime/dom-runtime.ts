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
// OVERLAYS & POSITIONING — re-exported from overlay.ts (single source of truth)
// ============================================

import { showAt, showBelow, showAbove, showLeft, showRight, showModal, dismiss } from './overlay'
export type { OverlayPosition, PositionOptions } from './types'
export { showAt, showBelow, showAbove, showLeft, showRight, showModal, dismiss }

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
