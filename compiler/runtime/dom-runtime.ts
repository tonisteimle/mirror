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

// ============================================
// TYPES
// ============================================

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
    setStyle(prop: string, val: string) { (el.style as unknown as Record<string, string>)[prop] = val },
    getStyle(prop: string) { return (el.style as unknown as Record<string, string>)[prop] },
  }
}

// ============================================
// VISIBILITY & TOGGLE
// ============================================

/**
 * Toggle element visibility or state
 */
export function toggle(el: MirrorElement | null): void {
  if (!el) return

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

  // Setup escape key handler
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss(el)
      document.removeEventListener('keydown', escapeHandler)
    }
  }
  document.addEventListener('keydown', escapeHandler)
  ;(el as any)._escapeHandler = escapeHandler
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

  // Clean up click-outside handler
  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }

  // Clean up escape handler
  if ((el as any)._escapeHandler) {
    document.removeEventListener('keydown', (el as any)._escapeHandler)
    delete (el as any)._escapeHandler
  }

  // Clear positioning styles
  el.style.top = ''
  el.style.left = ''
  el.style.zIndex = ''

  // Clear trigger reference
  delete el.dataset.triggerId
}

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
  }

  // Create new handler with delay to avoid immediate trigger
  setTimeout(() => {
    element._clickOutsideHandler = (e: MouseEvent) => {
      const target = e.target as HTMLElement

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
 * Load a single YAML file and add to __mirrorData
 * @param filename Filename (e.g., 'users.yaml')
 * @param basePath Base path for data files (default: '/data/')
 */
export async function loadYAMLFile(filename: string, basePath = '/data/'): Promise<void> {
  try {
    const url = basePath + filename
    const response = await fetch(url)

    if (!response.ok) {
      console.warn(`YAML file not found: ${url}`)
      return
    }

    const text = await response.text()
    const data = parseSimpleYAML(text)
    const name = filename.replace(/\.ya?ml$/i, '')

    const mirrorData = getMirrorData()
    mirrorData[name] = data

    console.log(`Loaded YAML: ${name}`, data)
  } catch (err) {
    console.warn(`Failed to load YAML file ${filename}:`, err)
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

  // Get custom states (exclude 'default')
  const order = stateOrder || Object.keys(sm.states).filter(s => s !== 'default')
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
  if ((el as any)._isTransitioning) return
  (el as any)._isTransitioning = true

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
      el.style.display = (el as any)._baseDisplay || 'flex'
      el.hidden = false
    }

    // 3. Restore base styles before applying new state
    // This ensures toggling back to 'default' properly resets styles
    if (el._baseStyles) {
      Object.assign(el.style, el._baseStyles)
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
      // Play animation and apply styles
      playStateAnimation(el, anim, newState.styles).then(() => {
        (el as any)._isTransitioning = false
      })
    } else {
      // No animation, apply styles immediately
      Object.assign(el.style, newState.styles as Partial<CSSStyleDeclaration>)
      ;(el as any)._isTransitioning = false
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

  // Update state based on condition
  function updateState(): void {
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

      if (condition.includes('&&') || condition.includes('||')) {
        try {
          const open = state === 'open'
          const closed = state === 'closed'
          const expanded = state === 'expanded'
          const collapsed = state === 'collapsed'
          // Using Function constructor instead of eval for slightly better security
          visible = new Function('open', 'closed', 'expanded', 'collapsed',
            `return ${condition}`)(open, closed, expanded, collapsed)
        } catch {
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
 * Navigate to a page (load .mirror file)
 */
export function navigateToPage(pageName: string, clickedElement: MirrorElement | null): void {
  if (!pageName) return

  const filename = pageName.endsWith('.mirror') ? pageName : pageName + '.mirror'

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

    container.innerHTML = ''
    const execCode = pageCode.replace('export function createUI', 'function createUI')
    const fn = new Function(execCode + '\nreturn createUI();')
    const ui = fn() as { root?: HTMLElement }

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

/**
 * Fetch icon from CDN and cache it
 */
async function fetchIcon(iconName: string): Promise<string | null> {
  try {
    const url = `https://unpkg.com/lucide-static/icons/${iconName}.svg`
    const res = await fetch(url)

    if (!res.ok) {
      return null
    }

    const svgText = await res.text()

    // Cache the result
    iconCache.set(iconName, svgText)

    return svgText
  } catch (err) {
    console.warn(`Failed to load icon "${iconName}":`, err)
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
  (el as any)._valueBinding = path

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
  (el as any)._textBinding = path

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
      if ((el as any)._textTemplate) {
        // Re-evaluate the template expression
        try {
          el.textContent = (el as any)._textTemplate()
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
  const path = (el as any)._valueBinding
  if (path && _valueBindings.has(path)) {
    _valueBindings.get(path)!.delete(el)
  }
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
