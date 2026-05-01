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
// __MIRROR_DEBUG__ flag is augmented by debug.ts (single source of truth)
import { isDebug } from './debug'

// Re-export so legacy callers that imported isDebug from this module still work.
export { isDebug }

// MirrorElement lives in `./types` (single source of truth); re-exported here
// so legacy callers importing it from `dom-runtime.ts` keep working.
export type { MirrorElement } from './types'

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
