/**
 * Overlay Positioning System
 *
 * Functions for positioning overlays, modals, dropdowns, and tooltips
 * relative to trigger elements.
 */

import { createFocusTrap } from 'focus-trap'
import type { MirrorElement, OverlayPosition, PositionOptions } from './types'
import { show, hide } from './visibility'
import { registerForCleanup } from './cleanup'

// Re-export types for convenience
export type { OverlayPosition, PositionOptions }

interface Viewport {
  width: number
  height: number
}

interface Position {
  top: number
  left: number
}

// ============================================
// ELEMENT DIMENSION HELPERS
// ============================================

/**
 * Get element dimensions, temporarily showing if hidden.
 * Restores hidden state after measurement.
 */
function getElementRect(element: HTMLElement): DOMRect {
  const wasHidden = element.style.display === 'none' || element.hidden
  if (wasHidden) {
    element.style.visibility = 'hidden'
    element.style.display = ''
    element.hidden = false
  }
  const rect = element.getBoundingClientRect()
  if (wasHidden) {
    element.style.visibility = ''
    element.style.display = 'none'
    element.hidden = true
  }
  return rect
}

/**
 * Get element dimensions, ensuring it is visible synchronously after the call.
 * Used by show flows where the caller will keep the element visible — avoids
 * the restore-to-hidden round-trip that would race with batchInFrame'd show().
 */
function getElementRectAndShow(element: HTMLElement): DOMRect {
  const wasHidden = element.style.display === 'none' || element.hidden
  if (wasHidden) {
    element.style.visibility = 'hidden'
    element.style.display = ''
    element.hidden = false
  }
  const rect = element.getBoundingClientRect()
  if (wasHidden) {
    element.style.visibility = ''
    // Leave display='' and hidden=false — caller keeps it visible.
  }
  return rect
}

/**
 * Get current viewport dimensions
 */
function getViewport(): Viewport {
  return {
    width: window.innerWidth,
    height: window.innerHeight,
  }
}

// ============================================
// ALIGNMENT CALCULATIONS
// ============================================

/**
 * Calculate horizontal position based on alignment
 */
function getHorizontalPosition(
  align: 'start' | 'center' | 'end',
  triggerRect: DOMRect,
  elementRect: DOMRect
): number {
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

/**
 * Calculate vertical position based on alignment
 */
function getVerticalPosition(
  align: 'start' | 'center' | 'end',
  triggerRect: DOMRect,
  elementRect: DOMRect
): number {
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

// ============================================
// POSITION CALCULATIONS WITH FLIP
// ============================================

/**
 * Calculate position below trigger with flip support
 */
function positionBelow(
  triggerRect: DOMRect,
  elementRect: DOMRect,
  viewport: Viewport,
  offset: number,
  flip: boolean,
  align: 'start' | 'center' | 'end'
): Position {
  let top = triggerRect.bottom + offset
  const left = getHorizontalPosition(align, triggerRect, elementRect)
  if (flip && top + elementRect.height > viewport.height) {
    const flippedTop = triggerRect.top - elementRect.height - offset
    if (flippedTop >= 0) top = flippedTop
  }
  return { top, left }
}

/**
 * Calculate position above trigger with flip support
 */
function positionAbove(
  triggerRect: DOMRect,
  elementRect: DOMRect,
  viewport: Viewport,
  offset: number,
  flip: boolean,
  align: 'start' | 'center' | 'end'
): Position {
  let top = triggerRect.top - elementRect.height - offset
  const left = getHorizontalPosition(align, triggerRect, elementRect)
  if (flip && top < 0) {
    const flippedTop = triggerRect.bottom + offset
    if (flippedTop + elementRect.height <= viewport.height) top = flippedTop
  }
  return { top, left }
}

/**
 * Calculate position to left of trigger with flip support
 */
function positionLeft(
  triggerRect: DOMRect,
  elementRect: DOMRect,
  viewport: Viewport,
  offset: number,
  flip: boolean,
  align: 'start' | 'center' | 'end'
): Position {
  const top = getVerticalPosition(align, triggerRect, elementRect)
  let left = triggerRect.left - elementRect.width - offset
  if (flip && left < 0) {
    const flippedLeft = triggerRect.right + offset
    if (flippedLeft + elementRect.width <= viewport.width) left = flippedLeft
  }
  return { top, left }
}

/**
 * Calculate position to right of trigger with flip support
 */
function positionRight(
  triggerRect: DOMRect,
  elementRect: DOMRect,
  viewport: Viewport,
  offset: number,
  flip: boolean,
  align: 'start' | 'center' | 'end'
): Position {
  const top = getVerticalPosition(align, triggerRect, elementRect)
  let left = triggerRect.right + offset
  if (flip && left + elementRect.width > viewport.width) {
    const flippedLeft = triggerRect.left - elementRect.width - offset
    if (flippedLeft >= 0) left = flippedLeft
  }
  return { top, left }
}

/**
 * Calculate center position in viewport
 */
function positionCenter(elementRect: DOMRect, viewport: Viewport): Position {
  return {
    top: (viewport.height - elementRect.height) / 2,
    left: (viewport.width - elementRect.width) / 2,
  }
}

/**
 * Clamp position to viewport bounds with margin
 */
function clampToViewport(pos: Position, elementRect: DOMRect, viewport: Viewport): Position {
  const margin = 8
  return {
    top: Math.max(margin, Math.min(pos.top, viewport.height - elementRect.height - margin)),
    left: Math.max(margin, Math.min(pos.left, viewport.width - elementRect.width - margin)),
  }
}

/**
 * Calculate position for an overlay relative to a trigger element
 */
function calculateOverlayPosition(
  element: HTMLElement,
  trigger: HTMLElement,
  position: OverlayPosition,
  options: PositionOptions = {}
): Position {
  const { offset = 4, flip = true, align = 'start' } = options
  const triggerRect = trigger.getBoundingClientRect()
  const elementRect = getElementRect(element)
  const viewport = getViewport()

  let pos: Position

  switch (position) {
    case 'below':
      pos = positionBelow(triggerRect, elementRect, viewport, offset, flip, align)
      break
    case 'above':
      pos = positionAbove(triggerRect, elementRect, viewport, offset, flip, align)
      break
    case 'left':
      pos = positionLeft(triggerRect, elementRect, viewport, offset, flip, align)
      break
    case 'right':
      pos = positionRight(triggerRect, elementRect, viewport, offset, flip, align)
      break
    case 'center':
      pos = positionCenter(elementRect, viewport)
      break
    default:
      pos = { top: triggerRect.bottom + offset, left: triggerRect.left }
  }

  return clampToViewport(pos, elementRect, viewport)
}

// ============================================
// CLICK OUTSIDE HANDLER
// ============================================

/**
 * Setup click-outside handler for auto-dismiss
 */
function setupClickOutsideHandler(element: MirrorElement, trigger: MirrorElement | null): void {
  // Remove existing handler
  if (element._clickOutsideHandler) {
    document.removeEventListener('click', element._clickOutsideHandler)
    delete element._clickOutsideHandler
  }

  // Cancel any pending handler setup
  if (element._clickOutsideTimeout) {
    clearTimeout(element._clickOutsideTimeout)
    delete element._clickOutsideTimeout
  }

  registerForCleanup(element)

  // Create new handler with delay to avoid immediate trigger
  element._clickOutsideTimeout = setTimeout(() => {
    delete element._clickOutsideTimeout

    if (!element.isConnected) return

    element._clickOutsideHandler = (e: MouseEvent) => {
      const target = e.target
      if (!target || !(target instanceof Element)) return
      if (element.contains(target)) return
      if (trigger && trigger.contains(target)) return
      dismiss(element)
    }

    document.addEventListener('click', element._clickOutsideHandler)
  }, 10)
}

// ============================================
// ELEMENT RESOLUTION
// ============================================

/**
 * Resolve element by name or return element directly
 */
function resolveElement(element: MirrorElement | string | null): MirrorElement | null {
  if (typeof element === 'string') {
    return document.querySelector(`[data-mirror-name="${element}"]`) as MirrorElement
  }
  return element
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Show element positioned relative to trigger
 */
export function showAt(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  position: OverlayPosition = 'below',
  options?: PositionOptions
): void {
  const el = resolveElement(element)
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

  if (position === 'center') {
    positionAsCenter(el)
  } else if (triggerEl) {
    positionRelativeToTrigger(el, triggerEl, position, options)
  }

  show(el)
  el.dataset.triggerId = triggerEl?.dataset.mirrorId || ''
  setupClickOutsideHandler(el, triggerEl)
}

/**
 * Position element at viewport center
 */
function positionAsCenter(el: MirrorElement): void {
  el.style.position = 'fixed'
  const viewport = getViewport()
  const rect = getElementRectAndShow(el)

  el.style.top = `${(viewport.height - rect.height) / 2}px`
  el.style.left = `${(viewport.width - rect.width) / 2}px`
}

/**
 * Position element relative to trigger
 */
function positionRelativeToTrigger(
  el: MirrorElement,
  trigger: HTMLElement,
  position: OverlayPosition,
  options?: PositionOptions
): void {
  const pos = calculateOverlayPosition(el, trigger, position, options)
  el.style.position = 'fixed'
  el.style.top = `${pos.top}px`
  el.style.left = `${pos.left}px`
}

/**
 * Show element positioned below trigger
 */
export function showBelow(
  element: MirrorElement | string | null,
  trigger?: MirrorElement | null,
  offset?: number
): void {
  showAt(element, trigger, 'below', { offset, flip: true })
}

/**
 * Show element positioned above trigger
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

// ============================================
// MODAL
// ============================================

/**
 * Create or get backdrop element
 */
function getOrCreateBackdrop(): HTMLElement {
  let backdrop = document.querySelector('[data-mirror-backdrop]') as HTMLElement
  if (backdrop) return backdrop
  backdrop = document.createElement('div')
  backdrop.dataset.mirrorBackdrop = 'true'
  backdrop.style.cssText =
    'position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.5); z-index: 999;'
  document.body.appendChild(backdrop)
  return backdrop
}

/**
 * Setup focus trap for modal accessibility
 */
function setupFocusTrap(el: MirrorElement): void {
  const isBrowserEnv = typeof MutationObserver !== 'undefined'
  if (!isBrowserEnv) {
    setupFallbackEscapeHandler(el)
    return
  }

  try {
    el._focusTrap = createFocusTrap(el, {
      escapeDeactivates: true,
      allowOutsideClick: true,
      returnFocusOnDeactivate: true,
      initialFocus: () => findInitialFocus(el),
      onDeactivate: () => dismiss(el),
      preventScroll: true,
    })
    el._focusTrap.activate()
  } catch (err) {
    console.warn('[Accessibility] Focus trap creation failed:', err)
    setupFallbackEscapeHandler(el)
  }
}

/**
 * Find initial focus element in modal
 */
function findInitialFocus(el: HTMLElement): HTMLElement {
  const autofocus = el.querySelector('[autofocus]') as HTMLElement
  if (autofocus) return autofocus

  const firstFocusable = el.querySelector(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  ) as HTMLElement
  return firstFocusable || el
}

/**
 * Setup fallback escape handler when focus-trap not available
 */
function setupFallbackEscapeHandler(element: MirrorElement): void {
  const escapeHandler = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      dismiss(element)
      document.removeEventListener('keydown', escapeHandler)
    }
  }
  document.addEventListener('keydown', escapeHandler)
  element._escapeHandler = escapeHandler
}

/**
 * Show element as centered modal with optional backdrop
 */
export function showModal(element: MirrorElement | string | null, backdrop: boolean = true): void {
  const el = resolveElement(element)
  if (!el) return

  if (backdrop) {
    const backdropEl = getOrCreateBackdrop()
    backdropEl.style.display = ''
    backdropEl.onclick = () => dismiss(el)
    el.dataset.hasBackdrop = 'true'
  }

  el.style.position = 'fixed'
  el.style.zIndex = '1000'

  const rect = getElementRectAndShow(el)
  const viewport = getViewport()

  el.style.top = `${Math.max(20, (viewport.height - rect.height) / 2)}px`
  el.style.left = `${Math.max(20, (viewport.width - rect.width) / 2)}px`

  show(el)
  el._previouslyFocused = document.activeElement
  setupFocusTrap(el)
  registerForCleanup(el)
}

// ============================================
// DISMISS
// ============================================

/**
 * Clean up click-outside handler
 */
function cleanupClickOutside(el: MirrorElement): void {
  if (el._clickOutsideTimeout) {
    clearTimeout(el._clickOutsideTimeout)
    delete el._clickOutsideTimeout
  }
  if (el._clickOutsideHandler) {
    document.removeEventListener('click', el._clickOutsideHandler)
    delete el._clickOutsideHandler
  }
}

/**
 * Clean up focus trap
 */
function cleanupFocusTrap(el: MirrorElement): void {
  if (el._focusTrap) {
    try {
      el._focusTrap.deactivate({ returnFocus: false })
    } catch {
      // Ignore errors during deactivation
    }
    delete el._focusTrap
  }
}

/**
 * Restore focus to previously focused element
 */
function restorePreviousFocus(el: MirrorElement): void {
  if (
    el._previouslyFocused &&
    typeof el._previouslyFocused === 'object' &&
    'focus' in el._previouslyFocused
  ) {
    ;(el._previouslyFocused as HTMLElement).focus()
    delete el._previouslyFocused
  }
}

/**
 * Clean up escape handler
 */
function cleanupEscapeHandler(el: MirrorElement): void {
  if (el._escapeHandler) {
    document.removeEventListener('keydown', el._escapeHandler)
    delete el._escapeHandler
  }
}

/**
 * Dismiss/close an overlay element.
 * Cleans up positioning, backdrop, and event handlers.
 */
export function dismiss(element: MirrorElement | string | null): void {
  const el = resolveElement(element)
  if (!el) return

  hide(el)

  // Restore original position
  if (el.dataset.originalPosition !== undefined) {
    el.style.position = el.dataset.originalPosition
    delete el.dataset.originalPosition
  }

  // Remove backdrop if present
  if (el.dataset.hasBackdrop) {
    const backdrop = document.querySelector('[data-mirror-backdrop]') as HTMLElement
    if (backdrop) backdrop.style.display = 'none'
    delete el.dataset.hasBackdrop
  }

  cleanupClickOutside(el)
  cleanupFocusTrap(el)
  restorePreviousFocus(el)
  cleanupEscapeHandler(el)

  // Clear positioning styles
  el.style.top = ''
  el.style.left = ''
  el.style.zIndex = ''

  delete el.dataset.triggerId
}
