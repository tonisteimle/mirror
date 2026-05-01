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
// VISIBILITY & TOGGLE — re-exported from visibility.ts (single source of truth)
// ============================================

export { show, hide, toggle, close } from './visibility'

// ============================================
// OVERLAYS & POSITIONING — re-exported from overlay.ts (single source of truth)
// ============================================

import { showAt, showBelow, showAbove, showLeft, showRight, showModal, dismiss } from './overlay'
export type { OverlayPosition, PositionOptions } from './types'
export { showAt, showBelow, showAbove, showLeft, showRight, showModal, dismiss }

// ============================================
// SCROLL FUNCTIONS — re-exported from scroll.ts (single source of truth)
// ============================================

export type { ScrollToOptions } from './scroll'
export { scrollTo, scrollBy, scrollToTop, scrollToBottom } from './scroll'

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
// CLIPBOARD — re-exported from clipboard.ts (single source of truth)
// ============================================

export { copy } from './clipboard'

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
