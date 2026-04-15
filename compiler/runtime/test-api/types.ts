/**
 * Test API Types
 *
 * Shared types for all Test API modules.
 */

import type { MirrorElement, OverlayPosition, PositionOptions } from '../types'

// Re-export types for convenience
export type { MirrorElement, OverlayPosition, PositionOptions }

// ============================================
// RUNTIME INTERFACE
// ============================================

/**
 * Runtime functions that Test API modules can call
 */
export interface RuntimeFunctions {
  // State Machine
  transitionTo: (el: MirrorElement, state: string) => void
  stateMachineToggle: (el: MirrorElement, states?: string[]) => void
  exclusiveTransition: (el: MirrorElement, state: string) => void

  // Visibility
  show?: (el: MirrorElement) => void
  hide?: (el: MirrorElement) => void
  updateVisibility?: (el: MirrorElement) => void

  // Selection
  select?: (el: MirrorElement) => void
  deselect?: (el: MirrorElement) => void
  highlight?: (el: MirrorElement) => void
  unhighlight?: (el: MirrorElement) => void

  // Overlays & Positioning
  showAt?: (
    element: MirrorElement | string | null,
    trigger?: MirrorElement | null,
    position?: OverlayPosition,
    options?: PositionOptions
  ) => void
  showBelow?: (
    element: MirrorElement | string | null,
    trigger?: MirrorElement | null,
    offset?: number
  ) => void
  showAbove?: (
    element: MirrorElement | string | null,
    trigger?: MirrorElement | null,
    offset?: number
  ) => void
  showLeft?: (
    element: MirrorElement | string | null,
    trigger?: MirrorElement | null,
    offset?: number
  ) => void
  showRight?: (
    element: MirrorElement | string | null,
    trigger?: MirrorElement | null,
    offset?: number
  ) => void
  showModal?: (element: MirrorElement | string | null, backdrop?: boolean) => void
  dismiss?: (element: MirrorElement | string | null) => void

  // Navigation
  navigate?: (target: string, clickedElement: MirrorElement | null) => void
  navigateToPage?: (pageName: string, clickedElement: MirrorElement | null) => void
  getPageContainer?: () => MirrorElement | null
}

// ============================================
// STATE MACHINE TYPES
// ============================================

export interface StateMachineInfo {
  current: string
  initial: string
  states: string[]
  transitions: Array<{
    trigger: string
    to: string
    key?: string
    modifier?: string
  }>
}

// ============================================
// VISIBILITY TYPES
// ============================================

export type VisibilityReason = 'display' | 'opacity' | 'hidden' | 'visibility' | 'visible'

export interface VisibilityState {
  visible: boolean
  display: string
  opacity: number
  hidden: boolean
  reason: VisibilityReason
}

// ============================================
// CORE API INTERFACE
// ============================================

export interface CoreTestAPI {
  // Element Access
  getElement(nodeId: string): MirrorElement | null
  getAllElements(): MirrorElement[]
  findByName(name: string): MirrorElement | null

  // State Inspection
  getState(el: MirrorElement): string
  getAvailableStates(el: MirrorElement): string[]
  getStyles(el: MirrorElement): Record<string, string>
  getBaseStyles(el: MirrorElement): Record<string, string>

  // State Manipulation
  setState(el: MirrorElement, state: string): void
  resetToBase(el: MirrorElement): void

  // Event Simulation
  trigger(el: MirrorElement, event: 'click' | 'hover' | 'focus' | 'blur' | 'change' | 'input'): void
  triggerKey(el: MirrorElement, key: string, eventType?: 'keydown' | 'keyup'): void

  // Built-in Function Calls
  toggle(el: MirrorElement, states?: string[]): void
  exclusive(el: MirrorElement, state?: string): void

  // Debug
  logStateMachine(el: MirrorElement): void
  getStateMachineInfo(el: MirrorElement): StateMachineInfo | null
}

// ============================================
// VISIBILITY API INTERFACE
// ============================================

export interface VisibilityTestAPI {
  // Visibility Control
  show(el: MirrorElement): void
  hide(el: MirrorElement): void

  // Visibility Checks
  isVisible(el: MirrorElement): boolean
  isHidden(el: MirrorElement): boolean
  isDisplayNone(el: MirrorElement): boolean
  isOpacityZero(el: MirrorElement): boolean
  hasHiddenAttribute(el: MirrorElement): boolean

  // Visibility State
  getVisibilityState(el: MirrorElement): VisibilityState

  // Async
  waitForVisible(el: MirrorElement, timeout?: number): Promise<boolean>
  waitForHidden(el: MirrorElement, timeout?: number): Promise<boolean>
}

// ============================================
// NAVIGATION TYPES
// ============================================

export interface NavigationState {
  currentPage: string | null
  history: string[]
  canGoBack: boolean
  canGoForward: boolean
}

export interface ViewInfo {
  element: MirrorElement
  name: string
  active: boolean
}

export interface NavigationTestAPI {
  // Navigation Actions
  navigate(target: string): void
  navigateToPage(pageName: string): Promise<void>
  goBack(): void
  goForward(): void

  // Navigation State
  getCurrentPage(): string | null
  getNavigationHistory(): string[]
  getNavigationState(): NavigationState
  getPageContainer(): MirrorElement | null

  // View Switching (single-page component routing)
  showView(view: MirrorElement): void
  hideView(view: MirrorElement): void
  switchToView(view: MirrorElement): void
  getActiveView(container?: MirrorElement): MirrorElement | null
  getAllViews(container?: MirrorElement): MirrorElement[]
  getViewByName(name: string): MirrorElement | null

  // Async
  waitForNavigation(pageName: string, timeout?: number): Promise<boolean>
  waitForViewChange(view: MirrorElement, timeout?: number): Promise<boolean>
}

// ============================================
// COMBINED API INTERFACE
// ============================================

export interface MirrorTestAPI extends CoreTestAPI, VisibilityTestAPI, NavigationTestAPI {
  // Combined interface - will grow as we add more modules
}

// ============================================
// GLOBAL TYPE DECLARATION
// ============================================

declare global {
  interface Window {
    __MIRROR_TEST__?: MirrorTestAPI
  }
}
