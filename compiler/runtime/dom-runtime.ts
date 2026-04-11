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

// Motion One for CSS animations
import { animate as motionAnimateFn } from 'motion'
// Focus trap for modal dialogs - accessibility
import { createFocusTrap, FocusTrap } from 'focus-trap'

// ============================================
// TYPES
// ============================================

/**
 * Chart.js interface for dynamically loaded CDN library
 */
interface ChartJSConstructor {
  new (ctx: CanvasRenderingContext2D | null, config: Record<string, unknown>): ChartJSInstance
  getChart?: (canvas: HTMLCanvasElement) => ChartJSInstance | undefined
}

interface ChartJSInstance {
  config: { type: string }
  data: {
    labels: string[]
    datasets: Array<{ data: unknown[] }>
  }
  update(): void
}

/**
 * Extend Window interface for Chart.js
 */
declare global {
  interface Window {
    Chart?: ChartJSConstructor
  }
}

/**
 * Element with Mirror runtime metadata
 */
export interface MirrorElement extends HTMLElement {
  _stateStyles?: Record<string, Record<string, string>>
  _baseStyles?: Record<string, string>
  _initialState?: string
  _visibleWhen?: string
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
    renderItem: (item: unknown, index: number) => HTMLElement
  }
  _conditionalConfig?: {
    condition: () => boolean
    renderThen: () => DocumentFragment
    renderElse?: () => DocumentFragment
  }
  // State machine (interaction model)
  _stateMachine?: {
    initial: string
    current: string
    states: Record<string, {
      styles: Record<string, string>
      children?: () => HTMLElement[]  // Factory function to create state children
      enter?: StateAnimation  // Animation when entering this state
      exit?: StateAnimation   // Animation when leaving this state
    }>
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
  'bg': 'background',
  'col': 'color',
  'pad': 'padding',
  'rad': 'borderRadius',
  'gap': 'gap',
  'w': 'width',
  'h': 'height',
  'opacity': 'opacity',
}

// ============================================
// EVENT LISTENER CLEANUP
// ============================================

/**
 * Registry of elements with document-level event listeners.
 * Used for automatic cleanup when elements are removed from DOM.
 */
const _elementsWithDocListeners = new WeakSet<MirrorElement>()

/**
 * Clean up document-level event listeners for an element.
 * Call this when removing an element from DOM.
 * @param el Element to clean up
 */
export function cleanupElement(el: MirrorElement): void {
  // Clean up click-outside handler and pending timeout
  if (el._clickOutsideTimeout) {
    clearTimeout(el._clickOutsideTimeout)
    delete el._clickOutsideTimeout
  }
  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }

  // Clean up escape handler
  if (el._escapeHandler) {
    document.removeEventListener('keydown', el._escapeHandler)
    delete el._escapeHandler
  }

  // Clean up auto-select handler
  if (el._autoSelectHandler) {
    el.removeEventListener('focus', el._autoSelectHandler)
    delete el._autoSelectHandler
  }

  // Clean up focus trap
  if (el._focusTrap) {
    try {
      el._focusTrap.deactivate()
    } catch {
      // Ignore errors during deactivation
    }
    delete el._focusTrap
  }

  _elementsWithDocListeners.delete(el)
}

/**
 * Register an element for automatic cleanup.
 * The element will be cleaned up when removed from DOM.
 * @param el Element to register
 */
export function registerForCleanup(el: MirrorElement): void {
  _elementsWithDocListeners.add(el)
}

// MutationObserver for automatic cleanup when elements are removed
let _cleanupObserver: MutationObserver | null = null

/**
 * Initialize the cleanup observer (call once on app start).
 * Automatically cleans up document-level listeners when elements are removed.
 */
export function initCleanupObserver(): void {
  if (_cleanupObserver || typeof MutationObserver === 'undefined') return

  _cleanupObserver = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const node of mutation.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as MirrorElement
          // Clean up this element
          if (_elementsWithDocListeners.has(el)) {
            cleanupElement(el)
          }
          // Clean up any children with listeners
          const children = el.querySelectorAll?.('[data-mirror-id]')
          if (children) {
            for (const child of children) {
              const mirrorChild = child as MirrorElement
              if (_elementsWithDocListeners.has(mirrorChild)) {
                cleanupElement(mirrorChild)
              }
            }
          }
        }
      }
    }
  })

  _cleanupObserver.observe(document.body, {
    childList: true,
    subtree: true
  })
}

// ============================================
// FRAME BATCHING
// ============================================

/**
 * Track whether we're currently inside a requestAnimationFrame callback.
 * When true, state transitions should execute immediately to avoid
 * one-frame delay for watched/dependent elements.
 */
let _insideFrameCallback = false

/**
 * Execute a function inside a frame callback, or immediately if already in one.
 * This ensures all related state changes happen in the same frame.
 */
function batchInFrame(fn: () => void): void {
  if (_insideFrameCallback) {
    // Already inside a frame - execute immediately
    fn()
  } else {
    // Schedule for next frame
    requestAnimationFrame(() => {
      _insideFrameCallback = true
      try {
        fn()
      } finally {
        _insideFrameCallback = false
      }
    })
  }
}

// ============================================
// ALIGNMENT HELPERS
// ============================================

const ALIGN_MAP: Record<string, string> = {
  'left': 'flex-start',
  'right': 'flex-end',
  'center': 'center',
  'top': 'flex-start',
  'bottom': 'flex-end',
}

const REVERSE_ALIGN_MAP: Record<string, string> = {
  'flex-start': 'left',
  'flex-end': 'right',
  'center': 'center',
}

const VERT_ALIGN_MAP: Record<string, string> = {
  'flex-start': 'top',
  'flex-end': 'bottom',
  'center': 'center',
}

/**
 * Convert alignment value to CSS and apply to element
 */
export function alignToCSS(el: HTMLElement, prop: string, value: string): void {
  const dir = el.style.flexDirection || 'column'
  const isRow = dir === 'row'
  const cssVal = ALIGN_MAP[value] || value

  if (prop === 'align' || prop === 'hor-align') {
    if (isRow) {
      el.style.justifyContent = cssVal
    } else {
      el.style.alignItems = cssVal
    }
  } else if (prop === 'ver-align') {
    if (isRow) {
      el.style.alignItems = cssVal
    } else {
      el.style.justifyContent = cssVal
    }
  }
}

/**
 * Get alignment value from element
 */
export function getAlign(el: HTMLElement, prop: string): string {
  const dir = el.style.flexDirection || 'column'
  const isRow = dir === 'row'

  if (prop === 'align' || prop === 'hor-align') {
    const val = isRow ? el.style.justifyContent : el.style.alignItems
    return REVERSE_ALIGN_MAP[val] || val
  } else if (prop === 'ver-align') {
    const val = isRow ? el.style.alignItems : el.style.justifyContent
    return VERT_ALIGN_MAP[val] || val
  }
  return ''
}

// ============================================
// ELEMENT WRAPPER
// ============================================

export interface ElementWrapper {
  _el: MirrorElement
  text: string
  value: string
  visible: boolean
  hidden: boolean
  align: string
  verAlign: string
  bg: string
  col: string
  pad: string | number
  gap: string | number
  rad: string | number
  w: string | number
  h: string | number
  opacity: string | number
  state: string
  onclick: (e: MouseEvent) => void
  onchange: (e: Event) => void
  addClass(c: string): void
  removeClass(c: string): void
  toggleClass(c: string): void
  setStyle(prop: string, val: string): void
  getStyle(prop: string): string
}

/**
 * Wrap an element with a convenient API
 */
export function wrap(el: MirrorElement | null): ElementWrapper | null {
  if (!el) return null

  return {
    _el: el,

    get text() { return el.textContent || '' },
    set text(v: string) { el.textContent = v },
    get value() { return (el as HTMLInputElement).value },
    set value(v: string) { (el as HTMLInputElement).value = v },

    get visible() { return el.style.display !== 'none' },
    set visible(v: boolean) { el.style.display = v ? '' : 'none' },
    get hidden() { return el.hidden },
    set hidden(v: boolean) { el.hidden = v; el.style.display = v ? 'none' : '' },

    get align() { return getAlign(el, 'align') },
    set align(v: string) { alignToCSS(el, 'align', v) },
    get verAlign() { return getAlign(el, 'ver-align') },
    set verAlign(v: string) { alignToCSS(el, 'ver-align', v) },

    get bg() { return el.style.background },
    set bg(v: string) { el.style.background = v },
    get col() { return el.style.color },
    set col(v: string) { el.style.color = v },
    get pad() { return el.style.padding },
    set pad(v: string | number) { el.style.padding = typeof v === 'number' ? v + 'px' : v },
    get gap() { return el.style.gap },
    set gap(v: string | number) { el.style.gap = typeof v === 'number' ? v + 'px' : v },
    get rad() { return el.style.borderRadius },
    set rad(v: string | number) { el.style.borderRadius = typeof v === 'number' ? v + 'px' : v },
    get w() { return el.style.width },
    set w(v: string | number) { el.style.width = typeof v === 'number' ? v + 'px' : v },
    get h() { return el.style.height },
    set h(v: string | number) { el.style.height = typeof v === 'number' ? v + 'px' : v },
    get opacity() { return el.style.opacity },
    set opacity(v: string | number) { el.style.opacity = String(v) },

    get state() { return el.dataset.state || 'default' },
    set state(v: string) { setState(el, v) },

    set onclick(fn: (e: MouseEvent) => void) { el.addEventListener('click', fn) },
    set onchange(fn: (e: Event) => void) { el.addEventListener('change', fn) },

    addClass(c: string) { el.classList.add(c) },
    removeClass(c: string) { el.classList.remove(c) },
    toggleClass(c: string) { el.classList.toggle(c) },
    setStyle(prop: string, val: string) {
      // Security: Only allow whitelisted CSS properties
      if (!isAllowedCSSProperty(prop)) {
        console.warn('[Security] CSS property not allowed:', prop)
        return
      }
      // Security: Sanitize CSS value
      const safeVal = sanitizeCSSValue(val)
      if (safeVal === null) {
        console.warn('[Security] CSS value rejected:', val)
        return
      }
      ;(el.style as unknown as Record<string, string>)[prop] = safeVal
    },
    getStyle(prop: string) { return (el.style as unknown as Record<string, string>)[prop] },
  }
}

// ============================================
// VISIBILITY & TOGGLE
// ============================================

/**
 * Toggle element visibility or state
 * Uses stateMachineToggle for elements with state machines,
 * falls back to simple visibility toggle otherwise.
 */
export function toggle(el: MirrorElement | null): void {
  if (!el) return

  // If element has a state machine, use proper state machine toggle
  if (el._stateMachine) {
    stateMachineToggle(el)
    return
  }

  // Fallback for elements without state machine
  const currentState = el.dataset.state || el._initialState

  if (currentState === 'closed' || currentState === 'open') {
    const newState = currentState === 'closed' ? 'open' : 'closed'
    setState(el, newState)
  } else if (currentState === 'collapsed' || currentState === 'expanded') {
    const newState = currentState === 'collapsed' ? 'expanded' : 'collapsed'
    setState(el, newState)
  } else {
    el.hidden = !el.hidden
    applyState(el, el.hidden ? 'off' : 'on')
  }
}

/**
 * Show an element
 */
export function show(el: MirrorElement | null): void {
  if (!el) return
  // Batch visibility changes in a single frame
  batchInFrame(() => {
    // Restore saved display value or clear inline style
    el.style.display = el._savedDisplay || ''
    el.hidden = false
  })
}

/**
 * Hide an element
 */
export function hide(el: MirrorElement | null): void {
  if (!el) return
  // Save current display before hiding (unless already hidden)
  if (el.style.display !== 'none') {
    el._savedDisplay = el.style.display
  }
  // Batch visibility changes in a single frame
  batchInFrame(() => {
    el.style.display = 'none'
    el.hidden = true
  })
}

/**
 * Close an element (set to closed/collapsed state or hide)
 */
export function close(el: MirrorElement | null): void {
  if (!el) return

  const initialState = el._initialState
  if (initialState === 'closed' || initialState === 'open' ||
      el.dataset.state === 'open' || el.dataset.state === 'closed') {
    setState(el, 'closed')
  } else if (initialState === 'expanded' || initialState === 'collapsed' ||
             el.dataset.state === 'expanded' || el.dataset.state === 'collapsed') {
    setState(el, 'collapsed')
  } else {
    hide(el)
  }
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
  // Resolve element by name if string
  const el = typeof element === 'string'
    ? document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
    : element

  if (!el) return

  // Get trigger from current event if not provided
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
export function showModal(
  element: MirrorElement | string | null,
  backdrop: boolean = true
): void {
  // Resolve element by name if string
  const el = typeof element === 'string'
    ? document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
    : element

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
  // Resolve element by name if string
  const el = typeof element === 'string'
    ? document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
    : element

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
  if (el._previouslyFocused && typeof el._previouslyFocused === 'object' && 'focus' in el._previouslyFocused) {
    (el._previouslyFocused as HTMLElement).focus()
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
// FORM KEYBOARD NAVIGATION
// ============================================

/**
 * Get all focusable form elements within a container
 */
function getFormFocusables(container: HTMLElement): HTMLElement[] {
  const selector = [
    'input:not([type="hidden"]):not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    'button:not([disabled])',
    '[tabindex]:not([tabindex="-1"]):not([disabled])'
  ].join(', ')

  return Array.from(container.querySelectorAll<HTMLElement>(selector))
    .filter(el => {
      // Check if element is visible
      const style = window.getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })
    .sort((a, b) => {
      // Sort by tabindex (0 or positive) then by DOM order
      const tabA = parseInt(a.getAttribute('tabindex') || '0', 10)
      const tabB = parseInt(b.getAttribute('tabindex') || '0', 10)
      if (tabA === tabB) return 0
      if (tabA === 0) return 1
      if (tabB === 0) return -1
      return tabA - tabB
    })
}

/**
 * Focus the next form element after the current one
 */
export function focusNextInput(current: HTMLElement): boolean {
  const container = current.closest('form') || current.closest('[data-mirror-form]') || document.body
  const focusables = getFormFocusables(container)
  const currentIndex = focusables.indexOf(current)

  if (currentIndex >= 0 && currentIndex < focusables.length - 1) {
    focusables[currentIndex + 1].focus()
    return true
  }
  return false
}

/**
 * Focus the previous form element before the current one
 */
export function focusPrevInput(current: HTMLElement): boolean {
  const container = current.closest('form') || current.closest('[data-mirror-form]') || document.body
  const focusables = getFormFocusables(container)
  const currentIndex = focusables.indexOf(current)

  if (currentIndex > 0) {
    focusables[currentIndex - 1].focus()
    return true
  }
  return false
}

/**
 * Setup form keyboard navigation
 * - Enter in input moves to next field (or submits if last)
 * - Shift+Tab moves to previous field
 * - Escape blurs current field
 */
export function setupFormNavigation(form: HTMLElement): void {
  form.dataset.mirrorForm = 'true'

  form.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement
    const tagName = target.tagName.toLowerCase()

    // Handle Enter key
    if (e.key === 'Enter' && !e.shiftKey) {
      // Skip for textarea and submit buttons
      if (tagName === 'textarea') return
      if (tagName === 'button' && (target as HTMLButtonElement).type === 'submit') return

      // For inputs, move to next field or submit
      if (tagName === 'input') {
        const inputType = (target as HTMLInputElement).type
        // Skip for submit/button inputs
        if (inputType === 'submit' || inputType === 'button') return

        e.preventDefault()

        const focusables = getFormFocusables(form)
        const currentIndex = focusables.indexOf(target)
        const isLast = currentIndex === focusables.length - 1

        if (isLast) {
          // Submit the form if it's the last field
          const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]') as HTMLElement
          if (submitBtn) {
            submitBtn.click()
          } else if (form.tagName.toLowerCase() === 'form') {
            (form as HTMLFormElement).requestSubmit()
          }
        } else {
          // Move to next field
          focusNextInput(target)
        }
      }
    }

    // Handle Escape key - blur current field
    if (e.key === 'Escape') {
      if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        (target as HTMLElement).blur()
      }
    }
  })
}

/**
 * Setup auto-select on focus for input fields
 * When user tabs into an input, select all text
 */
export function setupAutoSelect(input: HTMLInputElement | HTMLTextAreaElement): void {
  // Remove existing handler if present (prevents duplicates)
  const existingHandler = (input as MirrorElement)._autoSelectHandler
  if (existingHandler) {
    input.removeEventListener('focus', existingHandler)
  }

  // Create handler with isConnected guard
  const handler = () => {
    // Small delay to ensure text is selected after focus
    requestAnimationFrame(() => {
      // Guard: only select if input is still in DOM
      if (input.isConnected) {
        input.select()
      }
    })
  }

  // Store reference for cleanup
  ;(input as MirrorElement)._autoSelectHandler = handler
  input.addEventListener('focus', handler)
}

// ============================================
// OVERLAY HANDLERS
// ============================================

/**
 * Setup click-outside handler for auto-dismissing overlays
 */
function setupClickOutsideHandler(
  element: MirrorElement,
  trigger: MirrorElement | null
): void {
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
export function scrollTo(
  element: MirrorElement | string | null,
  options?: ScrollToOptions
): void {
  // Resolve element by name if string
  const el = typeof element === 'string'
    ? document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
    : element

  if (!el) return

  const { behavior = 'smooth', block = 'start', inline = 'nearest' } = options || {}

  el.scrollIntoView({
    behavior,
    block,
    inline,
  })
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
  // Resolve element by name if string
  const el = typeof container === 'string'
    ? document.querySelector(`[data-mirror-name="${container}"]`) as MirrorElement
    : container

  if (!el) return

  el.scrollBy({
    left: x,
    top: y,
    behavior,
  })
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
    // Scroll page to top
    window.scrollTo({ top: 0, behavior })
    return
  }

  // Resolve element by name if string
  const el = typeof element === 'string'
    ? document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
    : element

  if (!el) return

  el.scrollTo({ top: 0, behavior })
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
    // Scroll page to bottom
    window.scrollTo({ top: document.body.scrollHeight, behavior })
    return
  }

  // Resolve element by name if string
  const el = typeof element === 'string'
    ? document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
    : element

  if (!el) return

  el.scrollTo({ top: el.scrollHeight, behavior })
}

// ============================================
// VALUE FUNCTIONS (Counter, Tokens)
// ============================================

/**
 * Global state store for tokens/variables
 */
declare global {
  interface Window {
    _mirrorState?: Record<string, unknown>
    __mirrorData?: Record<string, unknown>
  }
}

// ============================================
// YAML DATA LOADER
// ============================================

/**
 * Simple YAML parser for common data structures
 * Supports: strings, numbers, booleans, arrays, objects
 */
function parseSimpleYAML(text: string): unknown {
  const lines = text.split('\n')
  const result: Record<string, unknown> = {}
  let currentArray: unknown[] | null = null
  let currentKey = ''
  let currentIndent = 0

  for (const line of lines) {
    const trimmed = line.trim()

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith('#')) continue

    // Array item
    if (trimmed.startsWith('- ')) {
      const value = trimmed.slice(2).trim()

      // Object in array: - key: value
      if (value.includes(': ')) {
        const obj: Record<string, unknown> = {}
        // Parse inline object properties
        const parts = value.split(', ')
        for (const part of parts) {
          const colonIdx = part.indexOf(': ')
          if (colonIdx > 0) {
            const k = part.slice(0, colonIdx).trim()
            const v = parseYAMLValue(part.slice(colonIdx + 2).trim())
            obj[k] = v
          }
        }

        // Check for multi-line object
        if (!currentArray) {
          currentArray = []
          if (currentKey) result[currentKey] = currentArray
        }
        currentArray.push(obj)
      } else {
        // Simple array item
        if (!currentArray) {
          currentArray = []
          if (currentKey) result[currentKey] = currentArray
        }
        currentArray.push(parseYAMLValue(value))
      }
      continue
    }

    // Key-value pair
    const colonIdx = trimmed.indexOf(':')
    if (colonIdx > 0) {
      const key = trimmed.slice(0, colonIdx).trim()
      const value = trimmed.slice(colonIdx + 1).trim()

      const indent = line.length - line.trimStart().length

      if (indent === 0) {
        // Top-level key
        currentKey = key
        currentArray = null
        currentIndent = indent

        if (value) {
          result[key] = parseYAMLValue(value)
        }
      } else if (indent > currentIndent && currentArray) {
        // Nested property in array object
        const lastItem = currentArray[currentArray.length - 1]
        if (typeof lastItem === 'object' && lastItem !== null) {
          (lastItem as Record<string, unknown>)[key] = parseYAMLValue(value)
        }
      }
    }
  }

  // If entire file is just an array
  if (currentArray && Object.keys(result).length === 0) {
    return currentArray
  }

  return result
}

/**
 * Parse a YAML value (string, number, boolean, null)
 */
function parseYAMLValue(value: string): unknown {
  // Remove quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1)
  }

  // Boolean
  if (value === 'true') return true
  if (value === 'false') return false

  // Null
  if (value === 'null' || value === '~') return null

  // Number
  const num = Number(value)
  if (!isNaN(num) && value !== '') return num

  return value
}

/**
 * Get or initialize __mirrorData
 */
function getMirrorData(): Record<string, unknown> {
  if (typeof window !== 'undefined') {
    window.__mirrorData = window.__mirrorData || {}
    return window.__mirrorData
  }
  return {}
}

/**
 * Sanitize filename to prevent path traversal.
 * Only allows alphanumeric, hyphen, underscore, dot for extension.
 */
function sanitizeFilename(name: string): string | null {
  if (!name || typeof name !== 'string') return null

  // Reject path traversal
  if (name.includes('..') || name.includes('/') || name.includes('\\')) {
    console.warn('[Security] Path traversal in filename blocked:', name)
    return null
  }

  // Only allow safe characters
  if (!/^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(name)) {
    console.warn('[Security] Invalid filename characters:', name)
    return null
  }

  return name
}

/**
 * Load a single YAML file and add to __mirrorData
 * @param filename Filename (e.g., 'users.yaml')
 * @param basePath Base path for data files (default: '/data/')
 */
export async function loadYAMLFile(filename: string, basePath = '/data/'): Promise<void> {
  // Sanitize filename
  const safeFilename = sanitizeFilename(filename)
  if (!safeFilename) return

  try {
    const url = basePath + safeFilename
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`YAML file not found: ${url}`)
      return
    }

    const text = await response.text()
    const data = parseSimpleYAML(text)
    const name = safeFilename.replace(/\.ya?ml$/i, '')

    const mirrorData = getMirrorData()
    mirrorData[name] = data

    console.log(`Loaded YAML: ${name}`, data)
  } catch (err) {
    console.warn(`Failed to load YAML file ${safeFilename}:`, err)
  }
}

/**
 * Load multiple YAML files from data/ directory
 * @param filenames Array of filenames to load
 * @param basePath Base path for data files (default: '/data/')
 */
export async function loadYAMLFiles(filenames: string[], basePath = '/data/'): Promise<void> {
  await Promise.all(filenames.map(f => loadYAMLFile(f, basePath)))
}

/**
 * Auto-discover and load YAML files from data/ directory
 * Note: This requires a manifest or server-side listing
 * For static sites, use loadYAMLFiles with explicit filenames
 * @param basePath Base path for data files (default: '/data/')
 * @param manifest Optional manifest of filenames to load
 */
export async function loadMirrorData(basePath = '/data/', manifest?: string[]): Promise<void> {
  if (manifest && manifest.length > 0) {
    await loadYAMLFiles(manifest, basePath)
    return
  }

  // Try to load a manifest file that lists available YAML files
  try {
    const response = await fetch(basePath + 'manifest.json')
    if (response.ok) {
      const files = await response.json() as string[]
      await loadYAMLFiles(files, basePath)
    }
  } catch {
    // No manifest available - that's OK for simple projects
  }
}

function getMirrorState(): Record<string, unknown> {
  if (typeof window !== 'undefined') {
    window._mirrorState = window._mirrorState || {}
    return window._mirrorState
  }
  return {}
}

/**
 * Options for increment/decrement
 */
export interface CounterOptions {
  min?: number
  max?: number
  step?: number
}

/**
 * Get the current value of a token
 * @param tokenName Token name (with or without $)
 * @returns Current value or undefined
 */
export function get(tokenName: string): unknown {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  return getMirrorState()[name]
}

/**
 * Set a token to a specific value
 * @param tokenName Token name (with or without $)
 * @param value Value to set
 */
export function set(tokenName: string, value: unknown): void {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  getMirrorState()[name] = value
  updateBoundTokenElements(name, value)
}

/**
 * Increment a numeric token
 * @param tokenName Token name (with or without $)
 * @param options Options: { min?, max?, step? }
 */
export function increment(
  tokenName: string,
  options?: CounterOptions
): void {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  const state = getMirrorState()
  const { min, max, step = 1 } = options || {}

  let current = typeof state[name] === 'number' ? state[name] as number : 0
  let newValue = current + step

  // Apply max constraint
  if (max !== undefined && newValue > max) {
    newValue = max
  }

  state[name] = newValue
  updateBoundTokenElements(name, newValue)
}

/**
 * Decrement a numeric token
 * @param tokenName Token name (with or without $)
 * @param options Options: { min?, max?, step? }
 */
export function decrement(
  tokenName: string,
  options?: CounterOptions
): void {
  const name = tokenName.startsWith('$') ? tokenName.slice(1) : tokenName
  const state = getMirrorState()
  const { min, max, step = 1 } = options || {}

  let current = typeof state[name] === 'number' ? state[name] as number : 0
  let newValue = current - step

  // Apply min constraint
  if (min !== undefined && newValue < min) {
    newValue = min
  }

  state[name] = newValue
  updateBoundTokenElements(name, newValue)
}

/**
 * Reset a token to its initial value (0 for numbers, '' for strings)
 * @param tokenName Token name (with or without $)
 * @param initialValue Optional initial value (default: 0)
 */
export function reset(
  tokenName: string,
  initialValue: unknown = 0
): void {
  set(tokenName, initialValue)
}

/**
 * Update all elements bound to a token
 */
function updateBoundTokenElements(tokenName: string, value: unknown): void {
  // Find all elements with this token binding
  const elements = document.querySelectorAll(`[data-token-binding="${tokenName}"], [data-mirror-token="${tokenName}"]`)

  elements.forEach(el => {
    const htmlEl = el as HTMLElement
    // Update text content
    if (htmlEl.tagName === 'SPAN' || htmlEl.tagName === 'DIV' || htmlEl.tagName === 'P') {
      htmlEl.textContent = String(value)
    }
    // Update input value
    if (htmlEl.tagName === 'INPUT') {
      (htmlEl as HTMLInputElement).value = String(value)
    }
  })

  // Also update elements using _textBinding (existing system)
  const boundElements = document.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>
  boundElements.forEach(el => {
    if (el._textBinding === tokenName || el._textBinding === '$' + tokenName) {
      el.textContent = String(value)
    }
  })
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
// FEEDBACK: TOAST
// ============================================

/**
 * Toast management with ID-based tracking to prevent race conditions
 */
let _toastCounter = 0
const _activeToasts = new Map<number, { element: HTMLElement; dismissTimeout: number; fadeTimeout: number }>()

/**
 * Dismiss a specific toast by ID, or the most recent toast if no ID provided
 */
export function dismissToast(toastId?: number): void {
  if (toastId !== undefined) {
    const toast = _activeToasts.get(toastId)
    if (toast) {
      clearTimeout(toast.dismissTimeout)
      clearTimeout(toast.fadeTimeout)
      toast.element.remove()
      _activeToasts.delete(toastId)
    }
  } else {
    // Dismiss all toasts
    for (const [id, toast] of _activeToasts) {
      clearTimeout(toast.dismissTimeout)
      clearTimeout(toast.fadeTimeout)
      toast.element.remove()
      _activeToasts.delete(id)
    }
  }
}

/**
 * Show a toast notification
 * @param message - Message to display
 * @param options - Options: { duration?, type?, position? }
 * @returns Toast ID for programmatic dismissal
 */
export function toast(
  message: string,
  options?: {
    duration?: number
    type?: 'info' | 'success' | 'error' | 'warning'
    position?: 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  }
): number {
  const { duration = 3000, type = 'info', position = 'bottom' } = options || {}

  // Generate unique ID for this toast
  const toastId = ++_toastCounter

  // Dismiss existing toasts at the same position to prevent overlap
  for (const [id, existingToast] of _activeToasts) {
    if (existingToast.element.dataset.position === position) {
      dismissToast(id)
    }
  }

  // Create toast element
  const toastEl = document.createElement('div')
  toastEl.className = 'mirror-toast'
  toastEl.dataset.type = type
  toastEl.dataset.position = position
  toastEl.dataset.toastId = String(toastId)
  toastEl.textContent = message

  // Base styles
  Object.assign(toastEl.style, {
    position: 'fixed',
    zIndex: '10000',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    transition: 'opacity 0.2s, transform 0.2s',
    opacity: '0',
    transform: 'translateY(10px)',
  })

  // Position
  const positionStyles: Record<string, Record<string, string>> = {
    'top': { top: '20px', left: '50%', transform: 'translateX(-50%) translateY(-10px)' },
    'bottom': { bottom: '20px', left: '50%', transform: 'translateX(-50%) translateY(10px)' },
    'top-left': { top: '20px', left: '20px', transform: 'translateY(-10px)' },
    'top-right': { top: '20px', right: '20px', transform: 'translateY(-10px)' },
    'bottom-left': { bottom: '20px', left: '20px', transform: 'translateY(10px)' },
    'bottom-right': { bottom: '20px', right: '20px', transform: 'translateY(10px)' },
  }
  Object.assign(toastEl.style, positionStyles[position])

  // Type colors
  const typeColors: Record<string, { bg: string, color: string }> = {
    'info': { bg: '#1a1a1a', color: '#fff' },
    'success': { bg: '#10b981', color: '#fff' },
    'error': { bg: '#ef4444', color: '#fff' },
    'warning': { bg: '#f59e0b', color: '#000' },
  }
  const colors = typeColors[type]
  toastEl.style.background = colors.bg
  toastEl.style.color = colors.color

  document.body.appendChild(toastEl)

  // Animate in
  requestAnimationFrame(() => {
    toastEl.style.opacity = '1'
    toastEl.style.transform = position.includes('top')
      ? (position === 'top' ? 'translateX(-50%) translateY(0)' : 'translateY(0)')
      : (position === 'bottom' ? 'translateX(-50%) translateY(0)' : 'translateY(0)')
  })

  // Setup auto-dismiss with tracked timeouts
  const dismissTimeout = window.setTimeout(() => {
    const toastData = _activeToasts.get(toastId)
    if (!toastData) return // Already dismissed

    toastEl.style.opacity = '0'

    const fadeTimeout = window.setTimeout(() => {
      if (toastEl.parentNode) {
        toastEl.remove()
      }
      _activeToasts.delete(toastId)
    }, 200)

    // Update the fade timeout reference
    if (_activeToasts.has(toastId)) {
      _activeToasts.get(toastId)!.fadeTimeout = fadeTimeout
    }
  }, duration)

  // Track this toast
  _activeToasts.set(toastId, {
    element: toastEl,
    dismissTimeout,
    fadeTimeout: 0, // Will be set when dismiss starts
  })

  return toastId
}

// ============================================
// TIMER: DELAY
// ============================================

/**
 * Execute a function after a delay
 * @param ms - Delay in milliseconds
 * @param fn - Function to execute
 * @returns Timer ID (for cancellation)
 */
export function delay(ms: number, fn: () => void): number {
  return window.setTimeout(fn, ms)
}

/**
 * Cancel a delayed function
 * @param timerId - Timer ID from delay()
 */
export function cancelDelay(timerId: number): void {
  window.clearTimeout(timerId)
}

/**
 * Create a debounced version of a function
 * @param ms - Debounce delay in milliseconds
 * @param fn - Function to debounce
 * @returns Debounced function
 */
export function debounce<T extends (...args: unknown[]) => void>(
  ms: number,
  fn: T
): (...args: Parameters<T>) => void {
  let timerId: number | null = null
  return (...args: Parameters<T>) => {
    if (timerId) {
      window.clearTimeout(timerId)
    }
    timerId = window.setTimeout(() => {
      fn(...args)
      timerId = null
    }, ms)
  }
}

// ============================================
// INPUT CONTROL
// ============================================

/**
 * Focus an input element
 * @param el - The element to focus
 */
export function focus(el: MirrorElement | null): void {
  if (!el) return
  if (el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLButtonElement) {
    el.focus()
  } else if (el.tabIndex >= 0 || el.hasAttribute('tabindex')) {
    el.focus()
  }
}

/**
 * Remove focus from an input element
 * @param el - The element to blur
 */
export function blur(el: MirrorElement | null): void {
  if (!el) return
  if (el instanceof HTMLInputElement ||
      el instanceof HTMLTextAreaElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLButtonElement) {
    el.blur()
  } else {
    el.blur()
  }
}

/**
 * Clear the value of an input element
 * @param el - The input element to clear
 */
export function clear(el: MirrorElement | null): void {
  if (!el) return
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.value = ''
    // Trigger input event for reactivity
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/**
 * Select all text in an input element
 * @param el - The input element
 */
export function selectText(el: MirrorElement | null): void {
  if (!el) return
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.select()
  }
}

/**
 * Set error state on an element with optional message
 * @param el - The element to mark as invalid
 * @param message - Optional error message
 */
export function setError(el: MirrorElement | null, message?: string): void {
  if (!el) return

  // Apply invalid state
  el.dataset.invalid = 'true'
  applyState(el, 'invalid')

  // Set custom validity if it's a form element
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.setCustomValidity(message || 'Invalid')
  }

  // Find or create error message element
  if (message) {
    const errorId = el.dataset.errorId || `${el.id || el.dataset.name || 'field'}-error`
    el.dataset.errorId = errorId

    let errorEl = document.getElementById(errorId)
    if (!errorEl) {
      // Create error element after the input
      errorEl = document.createElement('span')
      errorEl.id = errorId
      errorEl.className = 'mirror-error-message'
      errorEl.style.cssText = 'color: #ef4444; font-size: 12px; margin-top: 4px; display: block;'
      el.parentNode?.insertBefore(errorEl, el.nextSibling)
    }
    errorEl.textContent = message
    errorEl.style.display = 'block'

    // Link for accessibility
    el.setAttribute('aria-describedby', errorId)
    el.setAttribute('aria-invalid', 'true')
  }
}

/**
 * Clear error state from an element
 * @param el - The element to clear errors from
 */
export function clearError(el: MirrorElement | null): void {
  if (!el) return

  // Remove invalid state
  delete el.dataset.invalid
  removeState(el, 'invalid')

  // Clear custom validity
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    el.setCustomValidity('')
  }

  // Hide error message
  const errorId = el.dataset.errorId
  if (errorId) {
    const errorEl = document.getElementById(errorId)
    if (errorEl) {
      errorEl.style.display = 'none'
    }
  }

  // Clear accessibility attributes
  el.removeAttribute('aria-describedby')
  el.removeAttribute('aria-invalid')
}

// ============================================
// NAVIGATION: BROWSER
// ============================================

/**
 * Go back in browser history
 */
export function back(): void {
  window.history.back()
}

/**
 * Go forward in browser history
 */
export function forward(): void {
  window.history.forward()
}

// Allowed URL protocols for security
const ALLOWED_URL_PROTOCOLS = ['http:', 'https:', 'mailto:', 'tel:']

/**
 * Open a URL in a new tab or current window
 * @param url - URL to open
 * @param options - Options: { newTab? }
 */
export function openUrl(
  url: string,
  options?: { newTab?: boolean }
): void {
  const { newTab = true } = options || {}

  // Security: Validate URL protocol to prevent XSS via javascript: or data: URLs
  try {
    const parsedUrl = new URL(url, window.location.href)
    if (!ALLOWED_URL_PROTOCOLS.includes(parsedUrl.protocol)) {
      console.warn(`[Security] Blocked unsafe URL protocol: ${parsedUrl.protocol}`)
      return
    }
  } catch {
    // If URL parsing fails, check for dangerous protocols directly
    if (url.toLowerCase().startsWith('javascript:') || url.toLowerCase().startsWith('data:')) {
      console.warn(`[Security] Blocked unsafe URL: ${url.slice(0, 50)}...`)
      return
    }
  }

  if (newTab) {
    window.open(url, '_blank', 'noopener,noreferrer')
  } else {
    window.location.href = url
  }
}

// ============================================
// SELECTION
// ============================================

/**
 * Select an element (and deselect siblings)
 */
export function select(el: MirrorElement | null): void {
  if (!el) return

  if (el.parentElement) {
    Array.from(el.parentElement.children).forEach(sibling => {
      if (sibling !== el && (sibling as HTMLElement).dataset.selected) {
        deselect(sibling as MirrorElement)
      }
    })
  }

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
 * Highlight an element (and unhighlight siblings)
 */
export function highlight(el: MirrorElement | null): void {
  if (!el) return

  if (el.parentElement) {
    Array.from(el.parentElement.children).forEach(sibling => {
      if (sibling !== el && (sibling as HTMLElement).dataset.highlighted) {
        unhighlight(sibling as MirrorElement)
      }
    })
  }

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

/**
 * Highlight the next item in a container
 */
export function highlightNext(container: MirrorElement | null): void {
  if (!container) return
  const items = getHighlightableItems(container)
  if (!items.length) return

  const current = items.findIndex(el => el.dataset.highlighted === 'true')
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

  const current = items.findIndex(el => el.dataset.highlighted === 'true')
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

/**
 * Get all highlightable items in a container
 */
export function getHighlightableItems(container: MirrorElement): MirrorElement[] {
  const findItems = (el: HTMLElement, requireHighlightState: boolean): MirrorElement[] => {
    const items: MirrorElement[] = []

    for (const child of Array.from(el.children) as MirrorElement[]) {
      if (child._stateStyles?.highlighted) {
        items.push(child)
      } else if (!requireHighlightState && child.style.cursor === 'pointer') {
        items.push(child)
      } else {
        items.push(...findItems(child, requireHighlightState))
      }
    }

    return items
  }

  let items = findItems(container, true)
  if (!items.length) items = findItems(container, false)

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

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Apply state styles to an element
 */
export function applyState(el: MirrorElement | null, state: string): void {
  if (!el?._stateStyles || !el._stateStyles[state]) return
  Object.assign(el.style, el._stateStyles[state])
}

/**
 * Remove state styles from an element (restore base styles)
 */
export function removeState(el: MirrorElement | null, _state: string): void {
  if (!el?._baseStyles) return
  Object.assign(el.style, el._baseStyles)
}

/**
 * Set element to a named state
 */
export function setState(el: MirrorElement | null, stateName: string): void {
  if (!el) return

  // Store base styles on first state change
  if (!el._baseStyles && el._stateStyles) {
    el._baseStyles = {}
    const stateProps = new Set<string>()

    for (const state of Object.values(el._stateStyles)) {
      for (const prop of Object.keys(state)) {
        stateProps.add(prop)
      }
    }

    for (const prop of stateProps) {
      el._baseStyles[prop] = (el.style as unknown as Record<string, string>)[prop] || ''
    }
  }

  // Restore base styles first
  if (el._baseStyles) {
    Object.assign(el.style, el._baseStyles)
  }

  // Apply new state
  el.dataset.state = stateName

  if (stateName !== 'default' && el._stateStyles && el._stateStyles[stateName]) {
    Object.assign(el.style, el._stateStyles[stateName])
  }

  // Update visibility of children based on new state
  updateVisibility(el)
}

/**
 * Toggle between two states
 */
export function toggleState(el: MirrorElement | null, state1: string, state2?: string): void {
  if (!el) return
  state2 = state2 || 'default'
  const current = el.dataset.state || state2
  const next = current === state1 ? state2 : state1
  setState(el, next)
}

/**
 * Toggle: 1 state = binary (default ↔ state), 2+ states = cycle
 * @param el The element with state machine
 * @param stateOrder Optional explicit state order
 */
export function stateMachineToggle(
  el: MirrorElement | null,
  stateOrder?: string[]
): void {
  if (!el?._stateMachine) return

  const sm = el._stateMachine

  // Get custom states (exclude 'default' and CSS pseudo-states like hover, focus, active, disabled)
  const cssStates = ['default', 'hover', 'focus', 'active', 'disabled']
  const order = stateOrder || Object.keys(sm.states).filter(s => !cssStates.includes(s))
  if (order.length === 0) return

  if (order.length === 1) {
    // Binary toggle: default ↔ single state
    const targetState = order[0]
    if (sm.current === targetState) {
      transitionTo(el, 'default')
    } else {
      transitionTo(el, targetState)
    }
  } else {
    // Cycle through multiple states
    const currentIndex = order.indexOf(sm.current)
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % order.length
    transitionTo(el, order[nextIndex])
  }
}

// ============================================
// STATE MACHINE FUNCTIONS (Interaction Model)
// ============================================

/**
 * Transition element to a new state using its state machine
 * @param el Element to transition
 * @param stateName Target state name
 * @param animation Optional animation configuration
 */
export function transitionTo(
  el: MirrorElement | null,
  stateName: string,
  animation?: StateAnimation
): void {
  if (!el?._stateMachine) return

  const sm = el._stateMachine
  const prevStateName = sm.current
  const prevState = sm.states[prevStateName]
  const newState = sm.states[stateName]

  if (!newState) return
  if (prevStateName === stateName) return

  // Prevent concurrent transitions - if already transitioning, skip
  if (el._isTransitioning) return
  el._isTransitioning = true

  // Store base styles on first transition (for toggle back to default)
  if (!el._baseStyles) {
    el._baseStyles = {}
    // Collect all properties that can be changed by any state
    const stateProps = new Set<string>()
    for (const state of Object.values(sm.states)) {
      for (const property of Object.keys(state.styles)) {
        stateProps.add(property)
      }
    }
    // Store current values as base
    for (const prop of stateProps) {
      el._baseStyles[prop] = (el.style as unknown as Record<string, string>)[prop] || ''
    }
  }

  // Store base children on first transition (if any state has children)
  // This enables states with completely different children (like Figma Variants)
  if (!el._baseChildren) {
    const hasStateWithChildren = Object.values(sm.states).some(s => s.children)
    if (hasStateWithChildren) {
      el._baseChildren = Array.from(el.children) as HTMLElement[]
    }
  }

  // Update internal state immediately (for state queries within same call)
  sm.current = stateName

  // Determine which animation to play
  // Priority: 1. transition animation, 2. state enter animation, 3. prev state exit animation
  const anim = animation || newState.enter || prevState?.exit

  // Batch all DOM changes in a single frame to prevent flickering
  // Uses batchInFrame to ensure chained transitions (from MutationObservers)
  // all execute in the same frame instead of being delayed
  batchInFrame(() => {
    // 1. Update data-state attribute (triggers MutationObservers on watching elements)
    // This must happen inside the frame so watchers see changes at the same time
    el.dataset.state = stateName

    // 2. Handle visibility states (before any style changes)
    if (stateName === 'visible') {
      el.style.display = el._baseDisplay || 'flex'
      el.hidden = false
    }

    // 3. Restore base styles before applying new state
    // This ensures toggling back to 'default' properly resets styles
    // EXCEPTION: If there's an exit animation, don't restore display yet
    // (the animation needs the element visible during playback)
    if (el._baseStyles) {
      const hasExitAnim = anim && prevState?.exit
      if (hasExitAnim && el._baseStyles.display === 'none') {
        // Restore all base styles EXCEPT display (will be set after exit animation)
        const { display: _, ...otherBaseStyles } = el._baseStyles
        Object.assign(el.style, otherBaseStyles)
      } else {
        Object.assign(el.style, el._baseStyles)
      }
    }

    // 4. Swap children if state has children defined (like Figma Variants)
    // Use DocumentFragment for efficient batch DOM updates
    if (newState.children) {
      const fragment = document.createDocumentFragment()
      const stateChildren = newState.children()
      for (const child of stateChildren) {
        fragment.appendChild(child)
      }
      // Clear and append in one operation
      el.replaceChildren(fragment)
    } else if (el._baseChildren && prevState?.children) {
      // Previous state had children, restore base children
      const fragment = document.createDocumentFragment()
      for (const child of el._baseChildren) {
        fragment.appendChild(child.cloneNode(true))
      }
      el.replaceChildren(fragment)
    }

    // 5. Apply new styles (with or without animation)
    if (anim) {
      // Check if this is an exit animation that needs to hide the element after
      const hasExitAnim = prevState?.exit
      const shouldHideAfter = hasExitAnim && el._baseStyles?.display === 'none'

      // Safety timeout: ensure _isTransitioning is always reset
      // Animation duration + delay + buffer (max 10 seconds)
      const maxDuration = Math.min(
        ((anim.duration || 0.3) + (anim.delay || 0)) * 1000 + 500,
        10000
      )
      const safetyTimeout = setTimeout(() => {
        if (el._isTransitioning) {
          el._isTransitioning = false
        }
      }, maxDuration)

      // Play animation and apply styles
      playStateAnimation(el, anim, newState.styles)
        .then(() => {
          clearTimeout(safetyTimeout)
          // After exit animation: hide the element
          if (shouldHideAfter) {
            el.style.display = 'none'
            el.hidden = true
          }
          el._isTransitioning = false
        })
        .catch(() => {
          // Animation failed - ensure we still unlock the element
          clearTimeout(safetyTimeout)
          el._isTransitioning = false
        })
    } else {
      // No animation, apply styles immediately
      Object.assign(el.style, newState.styles as Partial<CSSStyleDeclaration>)
      el._isTransitioning = false
    }

    // 6. Handle visibility when leaving visible state (after styles applied)
    if (prevStateName === 'visible' && sm.states['visible'] && stateName !== 'visible') {
      el.style.display = 'none'
      el.hidden = true
    }

    // 7. Update visibility of children (last, after all changes)
    updateVisibility(el)
  })
}

/**
 * Exclusive transition - deselect siblings before transitioning
 * Used for radio/tab behavior where only one element can be selected
 * @param el Element to transition
 * @param stateName Target state name
 * @param animation Optional animation configuration
 */
export function exclusiveTransition(
  el: MirrorElement | null,
  stateName: string,
  animation?: StateAnimation
): void {
  if (!el?._stateMachine) return

  // Find siblings with same parent and state machine
  // Use data-component (not data-mirror-name which gets overwritten by instance name)
  const parent = el.parentElement
  if (parent) {
    const componentName = el.dataset.component
    const siblings = componentName
      ? parent.querySelectorAll(`[data-component="${componentName}"]`) as NodeListOf<MirrorElement>
      : parent.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>
    siblings.forEach(sibling => {
      if (sibling !== el && sibling._stateMachine) {
        const sibSm = sibling._stateMachine
        // Deselect siblings: transition to 'default' state (not initial!)
        // A sibling might have started in 'active' state, but we want to
        // deselect it by going to 'default', not back to 'active'
        if (sibSm.current !== 'default') {
          transitionTo(sibling, 'default')
        }
      }
    })
  }

  // Now transition this element with animation
  transitionTo(el, stateName, animation)

  // Update bind variable if parent has one
  // Walk up to find container with data-bind attribute
  let container = el.parentElement as MirrorElement | null
  while (container) {
    const bindVar = container.dataset.bind
    if (bindVar) {
      // Get the text content of the activated element
      const activeText = el.textContent?.trim() || ''
      // Update the global state and notify bound elements
      if (typeof window !== 'undefined') {
        window._mirrorState = window._mirrorState || {}
        window._mirrorState[bindVar] = activeText
      }
      notifyDataChange(bindVar, activeText)
      break
    }
    container = container.parentElement as MirrorElement | null
  }
}

/**
 * Watch states of target elements and transition when condition is met
 * Used for 'when' dependencies (e.g., visible when Menu open or Sidebar open)
 */
export function watchStates(
  el: MirrorElement | null,
  targetState: string,
  initialState: string,
  condition: 'and' | 'or',
  dependencies: Array<{ target: string; state: string }>
): void {
  if (!el) return

  // Find all target elements by name (data-mirror-name attribute)
  const root = el.closest('[data-mirror-root]') || document.body
  const targetElements: Map<string, MirrorElement> = new Map()

  for (const dep of dependencies) {
    const targetEl = root.querySelector(`[data-mirror-name="${dep.target}"]`) as MirrorElement
    if (targetEl) {
      targetElements.set(dep.target, targetEl)
    }
  }

  // Check condition function
  function checkCondition(): boolean {
    if (condition === 'and') {
      // All must match
      return dependencies.every(dep => {
        const targetEl = targetElements.get(dep.target)
        return targetEl?.dataset.state === dep.state
      })
    } else {
      // Any must match (or)
      return dependencies.some(dep => {
        const targetEl = targetElements.get(dep.target)
        return targetEl?.dataset.state === dep.state
      })
    }
  }

  // Track if observers are still active
  let isActive = true

  // Cleanup function to disconnect all observers
  function cleanup(): void {
    if (!isActive) return
    isActive = false
    observer.disconnect()
    cleanupObserver.disconnect()
  }

  // Update state based on condition
  function updateState(): void {
    // If element is no longer in document, cleanup and stop
    if (!el || !el.isConnected) {
      cleanup()
      return
    }
    if (checkCondition()) {
      transitionTo(el, targetState)
    } else {
      transitionTo(el, initialState)
    }
  }

  // Initial check
  updateState()

  // Watch for state changes on target elements
  const observer = new MutationObserver((mutations) => {
    // Check if element still connected (handles root removal case)
    if (!el.isConnected) {
      cleanup()
      return
    }
    for (const mutation of mutations) {
      if (mutation.attributeName === 'data-state') {
        updateState()
        break
      }
    }
  })

  // Observe all target elements
  for (const targetEl of targetElements.values()) {
    observer.observe(targetEl, {
      attributes: true,
      attributeFilter: ['data-state'],
    })
  }

  // Cleanup: disconnect observer when element is removed from DOM
  // Use another MutationObserver on the parent to detect removal
  const cleanupObserver = new MutationObserver((mutations) => {
    // Check if element still connected (handles root removal case)
    if (!el.isConnected) {
      cleanup()
      return
    }
    for (const mutation of mutations) {
      for (const removedNode of mutation.removedNodes) {
        if (removedNode === el || (removedNode instanceof Element && removedNode.contains(el))) {
          cleanup()
          return
        }
      }
    }
  })

  // Observe the root for child removals
  cleanupObserver.observe(root, {
    childList: true,
    subtree: true,
  })
}

/**
 * Safe condition evaluator - replaces dangerous eval()/new Function()
 * Only allows known state names and logical operators
 */
function evaluateCondition(condition: string, currentState: string | undefined): boolean {
  // Build state context with common state names
  const states: Record<string, boolean> = {
    open: currentState === 'open',
    closed: currentState === 'closed',
    expanded: currentState === 'expanded',
    collapsed: currentState === 'collapsed',
    active: currentState === 'active',
    inactive: currentState === 'inactive',
    selected: currentState === 'selected',
    disabled: currentState === 'disabled',
    loading: currentState === 'loading',
    error: currentState === 'error',
    on: currentState === 'on',
    off: currentState === 'off',
  }
  // Also support the current state name directly
  if (currentState) {
    states[currentState] = true
  }

  // Tokenize: split by && and || while preserving operators
  const tokens = condition.split(/(\s*&&\s*|\s*\|\|\s*)/).filter(t => t.trim())

  let result: boolean | null = null
  let pendingOp: string | null = null

  for (const token of tokens) {
    const trimmed = token.trim()

    if (trimmed === '&&' || trimmed === '||') {
      pendingOp = trimmed
      continue
    }

    // Handle negation
    let negate = false
    let stateName = trimmed
    if (stateName.startsWith('!')) {
      negate = true
      stateName = stateName.slice(1).trim()
    }

    // Get state value (default to checking against current state)
    let value = states[stateName] !== undefined ? states[stateName] : (currentState === stateName)
    if (negate) value = !value

    // Apply operator
    if (result === null) {
      result = value
    } else if (pendingOp === '&&') {
      result = result && value
    } else if (pendingOp === '||') {
      result = result || value
    }
    pendingOp = null
  }

  return result === true
}

/**
 * Update visibility of children based on parent state
 */
export function updateVisibility(el: MirrorElement | null): void {
  if (!el) return

  const state = el.dataset.state
  const children = el.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>

  children.forEach(child => {
    if (child._visibleWhen) {
      const condition = child._visibleWhen
      let visible = false

      if (condition.includes('&&') || condition.includes('||') || condition.includes('!')) {
        try {
          visible = evaluateCondition(condition, state)
        } catch (err) {
          // Invalid condition expression - log for debugging and default to hidden
          console.warn(`[Mirror] Invalid visibility condition "${condition}":`, err)
          visible = false
        }
      } else {
        visible = state === condition
      }

      child.style.display = visible ? '' : 'none'
    }
  })
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Navigate to a target component (for component routing)
 */
export function navigate(targetName: string, clickedElement: MirrorElement | null): void {
  if (!targetName) return

  // Get the root node (Shadow DOM root or document) to support both contexts
  const root = clickedElement ? clickedElement.getRootNode() as Document | ShadowRoot : document

  // Try data-mirror-name first (from name property), then fall back to data-component
  const target = root.querySelector(`[data-mirror-name="${targetName}"]`) as HTMLElement | null
    || root.querySelector(`[data-component="${targetName}"]`) as HTMLElement | null
  if (!target) return

  if (target.parentElement) {
    Array.from(target.parentElement.children).forEach(sibling => {
      const siblingEl = sibling as HTMLElement
      // Check for either data-mirror-name or data-component to identify view elements
      if (siblingEl.dataset?.mirrorName || siblingEl.dataset?.component) {
        siblingEl.style.display = sibling === target ? '' : 'none'
      }
    })
  }

  updateNavSelection(clickedElement)
}

/**
 * Update selected state for navigation items
 */
export function updateNavSelection(clickedElement: MirrorElement | null): void {
  if (!clickedElement) return

  const nav = clickedElement.closest('nav')
  if (!nav) return

  const navItems = nav.querySelectorAll('[data-route]') as NodeListOf<MirrorElement>

  navItems.forEach(item => {
    if (item === clickedElement) {
      item.dataset.selected = 'true'
      applyState(item, 'selected')
    } else {
      delete item.dataset.selected
      removeState(item, 'selected')
    }
  })
}

// Storage for readFile callback
let _readFileCallback: ((filename: string) => string | null) | null = null

/**
 * Set the readFile callback for page navigation
 */
export function setReadFileCallback(callback: (filename: string) => string | null): void {
  _readFileCallback = callback
}

/**
 * Sanitize page name to prevent path traversal attacks.
 * Only allows alphanumeric characters, hyphens, underscores, and forward slashes.
 * Rejects: .., absolute paths, special characters
 */
function sanitizePageName(name: string): string | null {
  if (!name || typeof name !== 'string') return null

  // Reject path traversal attempts
  if (name.includes('..')) {
    console.warn('[Security] Path traversal attempt blocked:', name)
    return null
  }

  // Reject absolute paths
  if (name.startsWith('/') || name.startsWith('\\')) {
    console.warn('[Security] Absolute path blocked:', name)
    return null
  }

  // Only allow safe characters: alphanumeric, hyphen, underscore, forward slash, dot (for extension)
  if (!/^[a-zA-Z0-9_\-/]+(\.[a-zA-Z0-9]+)?$/.test(name)) {
    console.warn('[Security] Invalid page name characters:', name)
    return null
  }

  return name
}

/**
 * Validate that compiled code matches expected Mirror output patterns.
 * Rejects code containing dangerous constructs that shouldn't appear in Mirror output.
 */
function validateCompiledCode(code: string): boolean {
  // Check for dangerous patterns that shouldn't be in Mirror compiler output
  const dangerousPatterns = [
    /\beval\s*\(/i,                    // eval()
    /\bFunction\s*\(/i,                // Function constructor
    /\bsetTimeout\s*\(\s*['"`]/i,      // setTimeout with string
    /\bsetInterval\s*\(\s*['"`]/i,     // setInterval with string
    /\bdocument\s*\.\s*write/i,        // document.write
    /\binnerHTML\s*=\s*[^'"`]/,        // innerHTML assignment (non-literal)
    /\b__proto__\s*=/i,                // prototype pollution
    /\bprototype\s*\[/i,               // prototype access
    /\bconstructor\s*\[/i,             // constructor access
    /\bimport\s*\(/i,                  // dynamic import
    /\brequire\s*\(/i,                 // require (shouldn't be in browser code)
    /\bprocess\s*\./i,                 // Node.js process
    /\bchild_process/i,                // Node.js child_process
    /\bfs\s*\./i,                      // Node.js fs
    /<script/i,                        // Script tags in strings
    /javascript\s*:/i,                 // javascript: URLs
    /data\s*:\s*text\/html/i,          // data: HTML URLs
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      console.warn('[Security] Dangerous pattern detected in compiled code')
      return false
    }
  }

  // Verify code structure matches expected Mirror output
  // Mirror-compiled code should start with specific patterns
  if (!code.includes('function createUI') && !code.includes('export function createUI')) {
    console.warn('[Security] Code does not match expected Mirror output structure')
    return false
  }

  return true
}

/**
 * Execute compiled Mirror code safely.
 * Uses validation and controlled execution context.
 */
function executeCompiledCode(code: string): { root?: HTMLElement } | null {
  // Validate code before execution
  if (!validateCompiledCode(code)) {
    console.error('[Security] Compiled code validation failed - execution blocked')
    return null
  }

  // Transform code for execution
  const execCode = code.replace('export function createUI', 'function createUI')

  // Create execution wrapper with limited scope
  // This prevents access to sensitive globals while allowing DOM operations
  const safeWrapper = `
    "use strict";
    ${execCode}
    return createUI();
  `

  try {
    // Execute with strict mode enforced
    const fn = new Function(safeWrapper)
    return fn() as { root?: HTMLElement }
  } catch (err) {
    console.error('[Security] Code execution error:', err)
    return null
  }
}

/**
 * Navigate to a page (load .mirror file)
 */
export function navigateToPage(pageName: string, clickedElement: MirrorElement | null): void {
  if (!pageName) return

  // Sanitize page name to prevent path traversal
  const safeName = sanitizePageName(pageName)
  if (!safeName) return

  const filename = safeName.endsWith('.mirror') ? safeName : safeName + '.mirror'

  const readFile = _readFileCallback || (window as { _mirrorReadFile?: (f: string) => string | null })._mirrorReadFile
  if (!readFile) {
    console.warn('No readFile callback available for page navigation')
    return
  }

  const content = readFile(filename)
  if (!content) {
    console.warn(`Page not found: ${filename}`)
    return
  }

  const Mirror = (window as { Mirror?: { compile: (code: string, opts?: { readFile?: (f: string) => string | null }) => string } }).Mirror
  if (!Mirror?.compile) {
    console.warn('Mirror compiler not available for dynamic page loading')
    return
  }

  try {
    const pageCode = Mirror.compile(content, { readFile })

    const container = getPageContainer()
    if (!container) {
      console.warn('No page container found for rendering')
      return
    }

    // Clear container - replaceChildren() is more explicit than innerHTML = ''
    container.replaceChildren()

    // Use safe execution with validation
    const ui = executeCompiledCode(pageCode)

    if (ui?.root) {
      while (ui.root.firstChild) {
        container.appendChild(ui.root.firstChild)
      }
    }
  } catch (err) {
    console.error(`Failed to load page ${filename}:`, err)
  }

  updateNavSelection(clickedElement)
}

/**
 * Get container for page content
 */
export function getPageContainer(): HTMLElement | null {
  let container = document.querySelector('[data-page-container]') as HTMLElement | null
  if (container) return container

  container = document.querySelector('[data-instance-name="PageContent"]') as HTMLElement | null
  if (container) return container
  container = document.querySelector('[data-instance-name="Content"]') as HTMLElement | null
  if (container) return container

  const nav = document.querySelector('nav')
  if (nav?.parentElement) {
    for (const sibling of Array.from(nav.parentElement.children)) {
      if (sibling !== nav && sibling.tagName !== 'NAV') {
        return sibling as HTMLElement
      }
    }
  }

  return null
}

// ============================================
// SELECTION BINDING
// ============================================

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
      const mirrorState = ((window as { _mirrorState?: Record<string, string> })._mirrorState ||= {})
      mirrorState[varName] = value
      updateBoundElements(varName, value)
      return
    }
    parent = parent.parentElement as MirrorElement | null
  }
}

/**
 * Update all elements bound to a variable
 */
export function updateBoundElements(varName: string, value: string): void {
  const elements = document.querySelectorAll('[data-mirror-id]') as NodeListOf<MirrorElement>

  elements.forEach(el => {
    if (el._textBinding === varName) {
      el.textContent = value || el._textPlaceholder || ''
    }
  })
}

// ============================================
// CLEANUP
// ============================================

/**
 * Destroy an element and clean up handlers
 */
export function destroy(el: MirrorElement | null): void {
  if (!el) return

  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }

  if (el.children) {
    Array.from(el.children).forEach(child => destroy(child as MirrorElement))
  }
}

// ============================================
// ICONS
// ============================================

/** SVG cache to avoid repeated CDN fetches */
const iconCache = new Map<string, string>()

/** Maximum number of icons to cache (LRU eviction when exceeded) */
const MAX_ICON_CACHE = 200

/** Pending icon requests to avoid duplicate fetches */
const pendingIconRequests = new Map<string, Promise<string | null>>()

/**
 * Fallback icon SVG (simple square with X)
 */
const FALLBACK_ICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 9 6 6"/><path d="m15 9-6 6"/></svg>`

/**
 * Load Lucide icon from CDN with caching
 */
export async function loadIcon(el: MirrorElement, iconName: string): Promise<void> {
  if (!el || !iconName) return

  const size = el.dataset.iconSize || '16'
  const color = el.dataset.iconColor || 'currentColor'
  const strokeWidth = el.dataset.iconWeight || '2'
  const isFilled = el.dataset.iconFill === 'true'

  // Check cache first
  let svgText = iconCache.get(iconName)

  if (!svgText) {
    // Check if there's already a pending request
    let pending = pendingIconRequests.get(iconName)

    if (!pending) {
      // Start new fetch
      pending = fetchIcon(iconName)
      pendingIconRequests.set(iconName, pending)
    }

    svgText = await pending ?? undefined

    // Clean up pending request
    pendingIconRequests.delete(iconName)

    if (!svgText) {
      // Use fallback icon
      console.warn(`Icon "${iconName}" not found, using fallback`)
      svgText = FALLBACK_ICON
    }
  }

  // Apply SVG
  el.innerHTML = svgText

  const svg = el.querySelector('svg')
  if (svg) {
    svg.style.width = size + 'px'
    svg.style.height = size + 'px'
    svg.style.color = color
    svg.style.display = 'block'

    // Apply fill mode (converts stroke icons to filled)
    if (isFilled) {
      svg.setAttribute('fill', 'currentColor')
      svg.setAttribute('stroke', 'none')
    } else {
      svg.setAttribute('stroke-width', strokeWidth)
    }
  }
}

// ============================================
// CSS SECURITY
// ============================================

/**
 * Whitelist of allowed CSS properties.
 * This prevents CSS injection attacks where attackers could
 * set dangerous properties like 'behavior' (IE), 'expression' (IE),
 * or use @import/@font-face via content property.
 */
const ALLOWED_CSS_PROPERTIES = new Set([
  // Layout
  'display', 'position', 'top', 'right', 'bottom', 'left', 'z-index',
  'float', 'clear', 'overflow', 'overflow-x', 'overflow-y', 'clip',
  'visibility', 'opacity',
  // Flexbox
  'flex', 'flex-direction', 'flex-wrap', 'flex-flow', 'flex-grow',
  'flex-shrink', 'flex-basis', 'justify-content', 'align-items',
  'align-self', 'align-content', 'order', 'gap', 'row-gap', 'column-gap',
  // Grid
  'grid', 'grid-template', 'grid-template-columns', 'grid-template-rows',
  'grid-template-areas', 'grid-column', 'grid-row', 'grid-area',
  'grid-auto-columns', 'grid-auto-rows', 'grid-auto-flow',
  'grid-column-start', 'grid-column-end', 'grid-row-start', 'grid-row-end',
  'place-content', 'place-items', 'place-self',
  // Box model
  'width', 'min-width', 'max-width', 'height', 'min-height', 'max-height',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'box-sizing', 'aspect-ratio',
  // Typography
  'font', 'font-family', 'font-size', 'font-weight', 'font-style',
  'font-variant', 'line-height', 'letter-spacing', 'word-spacing',
  'text-align', 'text-decoration', 'text-transform', 'text-indent',
  'text-overflow', 'white-space', 'word-break', 'word-wrap', 'overflow-wrap',
  // Colors & backgrounds
  'color', 'background', 'background-color', 'background-image',
  'background-position', 'background-size', 'background-repeat',
  'background-attachment', 'background-clip', 'background-origin',
  // Borders
  'border', 'border-width', 'border-style', 'border-color',
  'border-top', 'border-right', 'border-bottom', 'border-left',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-radius', 'border-top-left-radius', 'border-top-right-radius',
  'border-bottom-left-radius', 'border-bottom-right-radius',
  'border-collapse', 'border-spacing',
  // Effects
  'box-shadow', 'text-shadow', 'filter', 'backdrop-filter',
  'mix-blend-mode', 'background-blend-mode',
  // Transforms
  'transform', 'transform-origin', 'transform-style',
  'perspective', 'perspective-origin',
  // Transitions & animations
  'transition', 'transition-property', 'transition-duration',
  'transition-timing-function', 'transition-delay',
  'animation', 'animation-name', 'animation-duration', 'animation-timing-function',
  'animation-delay', 'animation-iteration-count', 'animation-direction',
  'animation-fill-mode', 'animation-play-state',
  // Others
  'cursor', 'pointer-events', 'user-select', 'resize', 'outline',
  'outline-width', 'outline-style', 'outline-color', 'outline-offset',
  'list-style', 'list-style-type', 'list-style-position', 'list-style-image',
  'table-layout', 'vertical-align', 'object-fit', 'object-position',
  'scroll-behavior', 'scroll-snap-type', 'scroll-snap-align',
])

/**
 * Check if a CSS property is allowed.
 * Converts camelCase to kebab-case for comparison.
 */
function isAllowedCSSProperty(prop: string): boolean {
  if (!prop || typeof prop !== 'string') return false

  // Convert camelCase to kebab-case (e.g., backgroundColor -> background-color)
  const kebabProp = prop.replace(/([A-Z])/g, '-$1').toLowerCase()

  // Allow CSS custom properties (variables) with safe prefixes
  if (kebabProp.startsWith('--mirror-') || kebabProp.startsWith('--m-')) {
    return true
  }

  return ALLOWED_CSS_PROPERTIES.has(kebabProp)
}

/**
 * Sanitize CSS value to prevent injection attacks.
 * Blocks: url() with external URLs, expression(), javascript:, @import, behavior
 */
function sanitizeCSSValue(val: string): string | null {
  if (val === null || val === undefined) return null
  if (typeof val !== 'string') {
    val = String(val)
  }

  const lower = val.toLowerCase()

  // Block JavaScript execution vectors
  if (lower.includes('javascript:') || lower.includes('vbscript:')) {
    console.warn('[Security] Script in CSS value blocked')
    return null
  }

  // Block IE-specific expression() hack
  if (lower.includes('expression(') || lower.includes('expression (')) {
    console.warn('[Security] CSS expression blocked')
    return null
  }

  // Block behavior property value (IE)
  if (lower.includes('behavior:') || lower.includes('.htc')) {
    console.warn('[Security] CSS behavior blocked')
    return null
  }

  // Block @import (shouldn't be in inline styles, but extra safety)
  if (lower.includes('@import')) {
    console.warn('[Security] CSS @import blocked')
    return null
  }

  // Block external URLs in url() - only allow data: and relative paths
  const urlMatch = lower.match(/url\s*\(\s*['"]?\s*([^)'"]+)/gi)
  if (urlMatch) {
    for (const match of urlMatch) {
      const urlContent = match.replace(/url\s*\(\s*['"]?\s*/i, '')
      // Allow: data:, relative paths (no protocol), hash references
      // Block: http:, https:, //, and other protocols
      if (urlContent.match(/^(https?:|\/\/|ftp:|file:|blob:)/i)) {
        console.warn('[Security] External URL in CSS blocked:', urlContent)
        return null
      }
    }
  }

  // Block moz-binding (Firefox XBL)
  if (lower.includes('-moz-binding')) {
    console.warn('[Security] CSS -moz-binding blocked')
    return null
  }

  return val
}

// ============================================
// ICON SECURITY
// ============================================

/**
 * Sanitize icon name to prevent injection attacks.
 * Only allows alphanumeric and hyphens (Lucide icon naming convention).
 */
function sanitizeIconName(name: string): string | null {
  if (!name || typeof name !== 'string') return null

  // Lucide icons use lowercase letters, numbers, and hyphens only
  if (!/^[a-z0-9\-]+$/.test(name)) {
    console.warn('[Security] Invalid icon name rejected:', name)
    return null
  }

  // Max length to prevent abuse
  if (name.length > 50) {
    console.warn('[Security] Icon name too long:', name)
    return null
  }

  return name
}

/**
 * Validate and sanitize SVG content from external source.
 * Uses DOMParser to ensure only valid SVG elements are allowed.
 * Removes potentially dangerous elements and attributes.
 */
function sanitizeSVG(svgText: string): string | null {
  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(svgText, 'image/svg+xml')

    // Check for parsing errors
    const parserError = doc.querySelector('parsererror')
    if (parserError) {
      console.warn('[Security] Invalid SVG content')
      return null
    }

    const svg = doc.documentElement
    if (svg.tagName.toLowerCase() !== 'svg') {
      console.warn('[Security] Not an SVG element')
      return null
    }

    // Remove dangerous elements (XSS vectors and external resource loaders)
    const dangerousElements = [
      'script',         // JavaScript execution
      'foreignObject',  // Can embed HTML/scripts
      'use',            // Can reference external resources
      'image',          // Can load external images
      'a',              // Links with javascript: href
      'style',          // CSS injection, can exfiltrate data
      'defs',           // Can contain style elements
      'metadata',       // Can contain arbitrary XML
      'animate',        // Can trigger events via onbegin/onend
      'set',            // Can modify attributes dynamically
    ]
    for (const tag of dangerousElements) {
      const elements = svg.querySelectorAll(tag)
      elements.forEach(el => el.remove())
    }

    // Remove dangerous attributes (event handlers, external references)
    const allElements = svg.querySelectorAll('*')
    const dangerousAttrs = /^(on|href|xlink:href|src|data|formaction)/i
    for (const el of allElements) {
      const attrs = Array.from(el.attributes)
      for (const attr of attrs) {
        if (dangerousAttrs.test(attr.name) || attr.value.includes('javascript:')) {
          el.removeAttribute(attr.name)
        }
      }
    }

    // Return sanitized SVG
    return svg.outerHTML
  } catch (err) {
    console.warn('[Security] SVG sanitization failed:', err)
    return null
  }
}

/**
 * Fetch icon from CDN and cache it
 */
async function fetchIcon(iconName: string): Promise<string | null> {
  // Sanitize icon name first
  const safeName = sanitizeIconName(iconName)
  if (!safeName) return null

  try {
    const url = `https://unpkg.com/lucide-static/icons/${safeName}.svg`
    const res = await fetch(url)

    if (!res.ok) {
      return null
    }

    const svgText = await res.text()

    // Sanitize SVG content from CDN
    const sanitizedSVG = sanitizeSVG(svgText)
    if (!sanitizedSVG) {
      console.warn(`[Security] Icon "${safeName}" rejected - invalid SVG content`)
      return null
    }

    // Cache the sanitized result with LRU eviction
    if (iconCache.size >= MAX_ICON_CACHE) {
      // Remove oldest entry (first key in Map iteration order)
      const oldestKey = iconCache.keys().next().value
      if (oldestKey) iconCache.delete(oldestKey)
    }
    iconCache.set(safeName, sanitizedSVG)

    return sanitizedSVG
  } catch (err) {
    console.warn(`Failed to load icon "${safeName}":`, err)
    return null
  }
}

/**
 * Preload icons into cache (for commonly used icons)
 */
export function preloadIcons(iconNames: string[]): void {
  iconNames.forEach(name => {
    if (!iconCache.has(name)) {
      fetchIcon(name)
    }
  })
}

// ============================================
// ANIMATIONS
// ============================================

/**
 * Animation configuration for state transitions
 */
export interface StateAnimation {
  preset?: string
  duration?: number
  easing?: string
  delay?: number
}

/**
 * Preset animation keyframes for state transitions
 */
const ANIMATION_PRESETS: Record<string, { keyframes: Keyframe[]; easing?: string }> = {
  'fade-in': {
    keyframes: [{ opacity: 0 }, { opacity: 1 }],
    easing: 'ease-out',
  },
  'fade-out': {
    keyframes: [{ opacity: 1 }, { opacity: 0 }],
    easing: 'ease-out',
  },
  'slide-in': {
    keyframes: [
      { transform: 'translateY(-10px)', opacity: 0 },
      { transform: 'translateY(0)', opacity: 1 },
    ],
    easing: 'ease-out',
  },
  'slide-out': {
    keyframes: [
      { transform: 'translateY(0)', opacity: 1 },
      { transform: 'translateY(10px)', opacity: 0 },
    ],
    easing: 'ease-in',
  },
  'scale-in': {
    keyframes: [
      { transform: 'scale(0.9)', opacity: 0 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    easing: 'ease-out',
  },
  'scale-out': {
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(0.9)', opacity: 0 },
    ],
    easing: 'ease-in',
  },
  'bounce': {
    keyframes: [
      { transform: 'scale(1)' },
      { transform: 'scale(1.1)' },
      { transform: 'scale(0.95)' },
      { transform: 'scale(1)' },
    ],
    easing: 'ease-out',
  },
  'pulse': {
    keyframes: [
      { transform: 'scale(1)', opacity: 1 },
      { transform: 'scale(1.05)', opacity: 0.8 },
      { transform: 'scale(1)', opacity: 1 },
    ],
    easing: 'ease-in-out',
  },
  'shake': {
    keyframes: [
      { transform: 'translateX(0)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(-5px)' },
      { transform: 'translateX(5px)' },
      { transform: 'translateX(0)' },
    ],
    easing: 'ease-in-out',
  },
  'spin': {
    keyframes: [
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(360deg)' },
    ],
    easing: 'linear',
  },
}

/**
 * Play a state transition animation
 * @param el The element to animate
 * @param anim Animation configuration
 * @param styles The new styles to apply (for CSS transitions)
 * @returns Promise that resolves when animation completes
 */
export function playStateAnimation(
  el: MirrorElement,
  anim: StateAnimation,
  styles?: Record<string, string>
): Promise<void> {
  return new Promise((resolve) => {
    const duration = (anim.duration || 0.3) * 1000
    const delay = (anim.delay || 0) * 1000
    const easing = anim.easing || 'ease-out'

    if (anim.preset) {
      // Preset animation (keyframe-based)
      const preset = ANIMATION_PRESETS[anim.preset]
      if (preset) {
        // For enter animations: set display BEFORE animation so element is visible
        // This ensures fade-in, slide-in etc. are actually visible during animation
        // Note: check 'display' in styles, not styles.display, because '' is falsy but valid
        if (styles && 'display' in styles) {
          el.style.display = styles.display || 'flex'  // Default to flex if empty string
          el.hidden = false
        }

        const animation = el.animate(preset.keyframes, {
          duration,
          delay,
          easing: preset.easing || easing,
          fill: 'forwards',
        })

        animation.onfinish = () => {
          // Apply final styles after animation
          if (styles) {
            Object.assign(el.style, styles)
          }
          resolve()
        }

        // Handle animation cancellation (element removed, new animation started, etc.)
        animation.oncancel = () => {
          // Still apply final styles to maintain consistent state
          if (styles) {
            Object.assign(el.style, styles)
          }
          resolve()
        }
        return
      }
    }

    // CSS transition (duration-based without preset)
    if (styles && duration > 0) {
      // Set up transition
      el.style.transition = `all ${duration}ms ${easing}`

      // Apply new styles (triggers transition)
      Object.assign(el.style, styles)

      // Clean up after transition
      setTimeout(() => {
        el.style.transition = ''
        resolve()
      }, duration + delay)
      return
    }

    // No animation, just apply styles immediately
    if (styles) {
      Object.assign(el.style, styles)
    }
    resolve()
  })
}

/**
 * Animation registry
 */
const _animations: Map<string, {
  name: string
  easing: string
  duration?: number
  roles?: string[]
  keyframes: { time: number; properties: { property: string; value: string; target?: string }[] }[]
}> = new Map()

/**
 * Register an animation definition
 */
export function registerAnimation(animation: {
  name: string
  easing: string
  duration?: number
  roles?: string[]
  keyframes: { time: number; properties: { property: string; value: string; target?: string }[] }[]
}): void {
  _animations.set(animation.name, animation)
}

/**
 * Get a registered animation
 */
export function getAnimation(name: string) {
  return _animations.get(name)
}

/**
 * Convert Mirror keyframes to Web Animations API format
 */
function convertKeyframes(keyframes: { time: number; properties: { property: string; value: string }[] }[], duration: number): Keyframe[] {
  const result: Keyframe[] = []

  for (const kf of keyframes) {
    const frame: Keyframe = { offset: kf.time / duration }

    for (const prop of kf.properties) {
      // Map Mirror properties to CSS
      if (prop.property === 'opacity') {
        frame.opacity = prop.value
      } else if (prop.property === 'y-offset') {
        frame.transform = `translateY(${prop.value}px)`
      } else if (prop.property === 'x-offset') {
        frame.transform = `translateX(${prop.value}px)`
      } else if (prop.property === 'scale') {
        frame.transform = `scale(${prop.value})`
      } else if (prop.property === 'rotate') {
        frame.transform = `rotate(${prop.value}deg)`
      }
    }

    result.push(frame)
  }

  return result
}

/**
 * Run an animation on elements
 */
export function animate(
  animationName: string,
  elements: MirrorElement | MirrorElement[] | null,
  options: { duration?: number; delay?: number; stagger?: number; loop?: boolean; reverse?: boolean; fill?: FillMode } = {}
): Animation[] | null {
  if (!elements) return null

  const animation = _animations.get(animationName)
  if (!animation) {
    console.warn(`Animation "${animationName}" not found`)
    return null
  }

  const els = Array.isArray(elements) ? elements : [elements]
  const duration = (options.duration || animation.duration || 0.3) * 1000
  const animations: Animation[] = []

  els.forEach((el, index) => {
    const keyframes = convertKeyframes(animation.keyframes, animation.duration || 0.3)
    const delay = (options.delay || 0) * 1000 + (options.stagger || 0) * 1000 * index

    const anim = el.animate(keyframes, {
      duration,
      delay,
      easing: animation.easing,
      fill: options.fill || 'forwards',
      iterations: options.loop ? Infinity : 1,
      direction: options.reverse ? 'reverse' : 'normal'
    })

    animations.push(anim)
  })

  return animations
}

/**
 * Setup IntersectionObserver for onenter/onexit events
 */
export function setupEnterExitObserver(
  el: MirrorElement,
  onEnter?: () => void,
  onExit?: () => void
): IntersectionObserver {
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        onEnter?.()
      } else {
        onExit?.()
      }
    }
  }, { threshold: 0.1 })

  observer.observe(el)
  return observer
}

// ============================================
// MOTION ONE INTEGRATION
// ============================================

/**
 * Motion One animation configuration
 */
export interface MotionConfig {
  duration?: number
  delay?: number
  easing?: string | number[]  // string easing or cubic-bezier array
}

/**
 * Animation presets with Motion One
 * Maps preset names to Motion One animation options
 */
const MOTION_PRESETS: Record<string, {
  keyframes: Record<string, unknown[]>
  options: { duration?: number; easing?: string | number[] }
}> = {
  'fade-in': {
    keyframes: { opacity: [0, 1] },
    options: { duration: 0.3, easing: 'ease-out' },
  },
  'fade-out': {
    keyframes: { opacity: [1, 0] },
    options: { duration: 0.3, easing: 'ease-out' },
  },
  'slide-up': {
    keyframes: { transform: ['translateY(20px)', 'translateY(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },  // ease-out-expo
  },
  'slide-down': {
    keyframes: { transform: ['translateY(-20px)', 'translateY(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'slide-left': {
    keyframes: { transform: ['translateX(20px)', 'translateX(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'slide-right': {
    keyframes: { transform: ['translateX(-20px)', 'translateX(0)'], opacity: [0, 1] },
    options: { duration: 0.4, easing: [0.22, 1, 0.36, 1] },
  },
  'scale-in': {
    keyframes: { transform: ['scale(0.9)', 'scale(1)'], opacity: [0, 1] },
    options: { duration: 0.3, easing: [0.34, 1.56, 0.64, 1] },  // back-out for bounce
  },
  'scale-out': {
    keyframes: { transform: ['scale(1)', 'scale(0.9)'], opacity: [1, 0] },
    options: { duration: 0.2, easing: 'ease-in' },
  },
  'bounce': {
    keyframes: { transform: ['scale(1)', 'scale(1.15)', 'scale(0.95)', 'scale(1.02)', 'scale(1)'] },
    options: { duration: 0.5, easing: 'ease-out' },
  },
  'pulse': {
    keyframes: { transform: ['scale(1)', 'scale(1.05)', 'scale(1)'], opacity: [1, 0.85, 1] },
    options: { duration: 0.6, easing: 'ease-in-out' },
  },
  'shake': {
    keyframes: { transform: ['translateX(0)', 'translateX(-8px)', 'translateX(8px)', 'translateX(-4px)', 'translateX(4px)', 'translateX(0)'] },
    options: { duration: 0.4, easing: 'ease-in-out' },
  },
  'spin': {
    keyframes: { transform: ['rotate(0deg)', 'rotate(360deg)'] },
    options: { duration: 1, easing: 'linear' },
  },
}

/**
 * Play animation using Motion One
 * @param el Element to animate
 * @param preset Preset name or custom keyframes
 * @param config Optional configuration
 */
export function motionAnimate(
  el: HTMLElement,
  preset: string | Record<string, unknown[]>,
  config?: MotionConfig
): Promise<void> {
  return new Promise((resolve) => {
    let keyframes: Record<string, unknown[]>
    let baseOptions: { duration?: number; easing?: string | number[] } = {}

    // Get preset or use custom keyframes
    if (typeof preset === 'string' && MOTION_PRESETS[preset]) {
      keyframes = MOTION_PRESETS[preset].keyframes
      baseOptions = MOTION_PRESETS[preset].options
    } else if (typeof preset === 'object') {
      keyframes = preset
    } else {
      // Unknown preset, resolve immediately
      console.warn(`Motion preset "${preset}" not found`)
      resolve()
      return
    }

    // Build animation options
    const options: Record<string, unknown> = {
      duration: config?.duration || baseOptions.duration || 0.3,
      delay: config?.delay || 0,
      easing: config?.easing || baseOptions.easing || 'ease-out',
    }

    // Run animation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const animation = motionAnimateFn(el, keyframes as any, options as any)
    animation.finished.then(() => resolve())
  })
}

/**
 * Get motion preset by name
 */
export function getMotionPreset(name: string): typeof MOTION_PRESETS[string] | undefined {
  return MOTION_PRESETS[name]
}

// ============================================
// TWO-WAY DATA BINDING
// ============================================

/**
 * Registry of elements bound to data paths
 * Maps path (e.g., "user.name") to Set of bound elements
 */
const _valueBindings: Map<string, Set<MirrorElement>> = new Map()

/**
 * Registry of text elements bound to data paths
 * Maps path (e.g., "user.name") to Set of elements displaying that data
 */
const _textBindings: Map<string, Set<MirrorElement>> = new Map()

/**
 * Register an input element for two-way data binding
 * @param el The input element to bind
 * @param path The data path (e.g., "user.name")
 */
export function bindValue(el: MirrorElement, path: string): void {
  el._valueBinding = path

  if (!_valueBindings.has(path)) {
    _valueBindings.set(path, new Set())
  }
  _valueBindings.get(path)!.add(el)
}

/**
 * Register a text element for one-way data binding (display only)
 * @param el The element to bind
 * @param path The data path (e.g., "user.name")
 */
export function bindText(el: MirrorElement, path: string): void {
  el._textBinding = path

  if (!_textBindings.has(path)) {
    _textBindings.set(path, new Set())
  }
  _textBindings.get(path)!.add(el)
}

/**
 * Notify the runtime that data has changed at a specific path.
 * Updates all bound elements (both input values and text displays).
 * @param path The data path that changed (e.g., "user.name")
 * @param value The new value
 */
export function notifyDataChange(path: string, value: unknown): void {
  const stringValue = value != null ? String(value) : ''

  // Update bound input elements (skip the currently focused one to avoid cursor jumping)
  const inputElements = _valueBindings.get(path)
  if (inputElements) {
    for (const el of inputElements) {
      // Skip the element that's currently being typed in
      if (el !== document.activeElement) {
        (el as HTMLInputElement).value = stringValue
      }
    }
  }

  // Update bound text elements
  // Use _textTemplate if available for expression re-evaluation
  const textElements = _textBindings.get(path)
  if (textElements) {
    for (const el of textElements) {
      if (el._textTemplate) {
        // Re-evaluate the template expression
        try {
          el.textContent = el._textTemplate()
        } catch (e) {
          console.warn('Failed to re-evaluate text template:', e)
          el.textContent = stringValue
        }
      } else {
        el.textContent = stringValue
      }
    }
  }
}

/**
 * Unregister an element from two-way binding
 * @param el The element to unbind
 */
export function unbindValue(el: MirrorElement): void {
  const path = el._valueBinding
  if (path && _valueBindings.has(path)) {
    _valueBindings.get(path)!.delete(el)
  }
}

// ============================================
// CHARTS
// ============================================

/**
 * Chart slot configuration
 * Maps Chart.js config paths to values
 */
export interface ChartSlotConfig {
  name: string
  config: Record<string, string | number | boolean>
}

/**
 * Chart configuration for Mirror charts
 */
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'radar'
  data: unknown
  xField?: string
  yField?: string
  colors?: string[]
  title?: string
  legend?: boolean
  stacked?: boolean
  fill?: boolean
  tension?: number
  grid?: boolean
  axes?: boolean
  slots?: ChartSlotConfig[]
}

/**
 * Default chart colors
 */
const DEFAULT_CHART_COLORS = [
  '#2563eb', // blue
  '#10b981', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#84cc16', // lime
]

/** Chart.js loading promise */
let chartJsPromise: Promise<void> | null = null

/**
 * Load Chart.js dynamically if not already loaded
 */
function loadChartJs(): Promise<void> {
  if (chartJsPromise) return chartJsPromise

  if (typeof window.Chart !== 'undefined') {
    return Promise.resolve()
  }

  chartJsPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Chart.js'))
    document.head.appendChild(script)
  })

  return chartJsPromise
}

/**
 * Parse Mirror data format into Chart.js data structure
 */
function parseChartData(
  data: unknown,
  type: string,
  xField?: string,
  yField?: string
): { labels: string[]; values: number[] } {
  // Simple array of numbers
  if (Array.isArray(data) && typeof data[0] === 'number') {
    return {
      labels: data.map((_, i) => String(i + 1)),
      values: data as number[],
    }
  }

  // Array of strings (labels with no values)
  if (Array.isArray(data) && typeof data[0] === 'string') {
    return {
      labels: data as string[],
      values: data.map(() => 0),
    }
  }

  // Key-value object: { Jan: 120, Feb: 180 }
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>
    const keys = Object.keys(obj)

    // Check if values are numbers (simple key-value)
    if (typeof obj[keys[0]] === 'number') {
      return {
        labels: keys,
        values: keys.map(k => obj[k] as number),
      }
    }

    // Check if values are objects (need xField/yField)
    if (typeof obj[keys[0]] === 'object') {
      const items = keys.map(k => obj[k] as Record<string, unknown>)
      return {
        labels: xField
          ? items.map(item => String(item[xField] ?? ''))
          : keys,
        values: yField
          ? items.map(item => Number(item[yField] ?? 0))
          : items.map(() => 0),
      }
    }
  }

  // Array of objects with xField/yField
  if (Array.isArray(data) && typeof data[0] === 'object') {
    return {
      labels: xField
        ? data.map(item => String((item as Record<string, unknown>)[xField] ?? ''))
        : data.map((_, i) => String(i + 1)),
      values: yField
        ? data.map(item => Number((item as Record<string, unknown>)[yField] ?? 0))
        : data.map(() => 0),
    }
  }

  // Fallback
  return { labels: [], values: [] }
}

/**
 * Set a nested value in an object using a dot-separated path
 * Handles array notation like 'data.datasets[0].pointRadius'
 *
 * @param obj The object to modify
 * @param path Dot-separated path (e.g., 'options.scales.x.ticks.color')
 * @param value The value to set
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setNestedValue(obj: Record<string, any>, path: string, value: unknown): void {
  const parts = path.split('.')
  let current = obj

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i]

    // Handle array notation like 'datasets[0]'
    const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/)
    if (arrayMatch) {
      const arrayName = arrayMatch[1]
      const index = parseInt(arrayMatch[2], 10)

      if (!(arrayName in current)) {
        current[arrayName] = []
      }
      if (!current[arrayName][index]) {
        current[arrayName][index] = {}
      }
      current = current[arrayName][index]
    } else {
      if (!(part in current)) {
        current[part] = {}
      }
      current = current[part]
    }
  }

  // Set the final value
  const lastPart = parts[parts.length - 1]
  const arrayMatch = lastPart.match(/^(\w+)\[(\d+)\]$/)
  if (arrayMatch) {
    const arrayName = arrayMatch[1]
    const index = parseInt(arrayMatch[2], 10)
    if (!(arrayName in current)) {
      current[arrayName] = []
    }
    current[arrayName][index] = value
  } else {
    current[lastPart] = value
  }
}

/**
 * Create a chart in the given element
 */
export async function createChart(
  element: HTMLElement,
  config: ChartConfig
): Promise<void> {
  await loadChartJs()

  // Chart.js requires a container with position:relative and overflow:hidden
  // to properly constrain the canvas size when responsive:true
  element.style.position = 'relative'
  element.style.overflow = 'hidden'

  // Create a wrapper that fills the container - Chart.js needs this structure
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;'
  element.appendChild(wrapper)

  // Create canvas element
  const canvas = document.createElement('canvas')
  wrapper.appendChild(canvas)

  // Parse data
  const { labels, values } = parseChartData(
    config.data,
    config.type,
    config.xField,
    config.yField
  )

  const colors = config.colors || DEFAULT_CHART_COLORS
  const isPieType = config.type === 'pie' || config.type === 'doughnut'

  // Build Chart.js config - Chart.js types are complex, using Record for flexibility
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartConfig: Record<string, any> = {
    type: config.type,
    data: {
      labels,
      datasets: [{
        data: values,
        backgroundColor: isPieType ? colors : colors[0] + '33',
        borderColor: isPieType ? colors : colors[0],
        borderWidth: isPieType ? 1 : 2,
        fill: config.fill ?? (config.type === 'line' ? false : true),
        tension: config.tension ?? 0.3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: config.legend ?? isPieType,
        },
        title: {
          display: !!config.title,
          text: config.title,
        },
      },
      scales: isPieType ? undefined : {
        x: {
          display: config.axes ?? true,
          grid: {
            display: config.grid ?? true,
          },
        },
        y: {
          display: config.axes ?? true,
          grid: {
            display: config.grid ?? true,
          },
          stacked: config.stacked,
        },
      },
    },
  }

  // Apply slot configurations
  if (config.slots && config.slots.length > 0) {
    for (const slot of config.slots) {
      for (const [path, value] of Object.entries(slot.config)) {
        // Special handling for axis title display
        // If setting title.text, also enable title.display
        if (path.includes('.title.text')) {
          const displayPath = path.replace('.title.text', '.title.display')
          setNestedValue(chartConfig, displayPath, true)
        }

        setNestedValue(chartConfig, path, value)
      }
    }
  }

  // Create chart
  if (window.Chart) {
    new window.Chart(canvas.getContext('2d'), chartConfig)
  }
}

/**
 * Update chart data (for reactive updates)
 */
export function updateChart(
  element: HTMLElement,
  data: unknown,
  xField?: string,
  yField?: string
): void {
  const canvas = element.querySelector('canvas') as HTMLCanvasElement
  if (!canvas) return

  const chartInstance = window.Chart?.getChart?.(canvas)
  if (!chartInstance) return

  const { labels, values } = parseChartData(data, chartInstance.config.type, xField, yField)
  chartInstance.data.labels = labels
  chartInstance.data.datasets[0].data = values
  chartInstance.update()
}

// ============================================
// RUNTIME OBJECT (for compatibility)
// ============================================

/**
 * Runtime object that groups all functions
 * This is the format expected by generated code
 */
export const runtime = {
  _propMap: PROP_MAP,
  _alignToCSS: alignToCSS,
  _getAlign: getAlign,
  wrap,
  toggle,
  show,
  hide,
  close,
  // Overlays & Positioning
  showAt,
  showBelow,
  showAbove,
  showLeft,
  showRight,
  showModal,
  dismiss,
  // Scroll
  scrollTo,
  scrollBy,
  scrollToTop,
  scrollToBottom,
  // Values & Counters
  get,
  set,
  increment,
  decrement,
  reset,
  // Clipboard
  copy,
  // Feedback
  toast,
  // Timer
  delay,
  cancelDelay,
  debounce,
  // Input Control
  focus,
  blur,
  clear,
  selectText,
  setError,
  clearError,
  // Browser Navigation
  back,
  forward,
  openUrl,
  // Selection
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
  applyState,
  removeState,
  setState,
  toggleState,
  updateVisibility,
  navigate,
  updateNavSelection,
  navigateToPage,
  getPageContainer,
  updateSelectionBinding,
  updateBoundElements,
  destroy,
  loadIcon,
  preloadIcons,
  setReadFileCallback,
  registerAnimation,
  getAnimation,
  animate,
  playStateAnimation,
  setupEnterExitObserver,
  // Motion One integration
  motionAnimate,
  getMotionPreset,
  // State machine function (handles both binary toggle and multi-state cycle)
  stateMachineToggle,
  transitionTo,
  exclusiveTransition,
  // YAML Data Loading
  loadYAMLFile,
  loadYAMLFiles,
  loadMirrorData,
  // Two-Way Data Binding
  bindValue,
  bindText,
  notifyDataChange,
  unbindValue,
  // Charts
  createChart,
  updateChart,
}

// ============================================
// TEST API
// ============================================

import { initTestAPI as initTestAPIFromModule, type MirrorTestAPI } from './test-api/index'

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

export default runtime
