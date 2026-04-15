/**
 * Toast Module
 *
 * Toast notification system for user feedback.
 * Extracted from dom-runtime.ts for Clean Code.
 */

// ============================================
// TYPES
// ============================================

export interface ToastOptions {
  duration?: number
  type?: 'info' | 'success' | 'error' | 'warning'
  position?: ToastPosition
}

type ToastPosition = 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'

interface ActiveToast {
  element: HTMLElement
  dismissTimeout: number
  fadeTimeout: number
}

// ============================================
// STATE
// ============================================

let toastCounter = 0
const activeToasts = new Map<number, ActiveToast>()

// ============================================
// CONSTANTS
// ============================================

const POSITION_STYLES: Record<ToastPosition, Record<string, string>> = {
  top: { top: '20px', left: '50%', transform: 'translateX(-50%) translateY(-10px)' },
  bottom: { bottom: '20px', left: '50%', transform: 'translateX(-50%) translateY(10px)' },
  'top-left': { top: '20px', left: '20px', transform: 'translateY(-10px)' },
  'top-right': { top: '20px', right: '20px', transform: 'translateY(-10px)' },
  'bottom-left': { bottom: '20px', left: '20px', transform: 'translateY(10px)' },
  'bottom-right': { bottom: '20px', right: '20px', transform: 'translateY(10px)' },
}

const TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  info: { bg: '#1a1a1a', color: '#fff' },
  success: { bg: '#10b981', color: '#fff' },
  error: { bg: '#ef4444', color: '#fff' },
  warning: { bg: '#f59e0b', color: '#000' },
}

// ============================================
// PUBLIC API
// ============================================

export function toast(message: string, options?: ToastOptions): number {
  const { duration = 3000, type = 'info', position = 'bottom' } = options || {}
  const toastId = ++toastCounter

  dismissToastsAtPosition(position)

  const toastEl = createToastElement(message, type, position, toastId)
  document.body.appendChild(toastEl)

  animateIn(toastEl, position)
  scheduleAutoDismiss(toastId, toastEl, duration)

  return toastId
}

export function dismissToast(toastId?: number): void {
  if (toastId !== undefined) {
    dismissSingleToast(toastId)
  } else {
    dismissAllToasts()
  }
}

// ============================================
// TOAST CREATION
// ============================================

function createToastElement(
  message: string,
  type: string,
  position: ToastPosition,
  toastId: number
): HTMLElement {
  const el = document.createElement('div')
  el.className = 'mirror-toast'
  el.dataset.type = type
  el.dataset.position = position
  el.dataset.toastId = String(toastId)
  el.textContent = message

  applyBaseStyles(el)
  applyPositionStyles(el, position)
  applyTypeStyles(el, type)

  return el
}

function applyBaseStyles(el: HTMLElement): void {
  Object.assign(el.style, {
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
}

function applyPositionStyles(el: HTMLElement, position: ToastPosition): void {
  Object.assign(el.style, POSITION_STYLES[position])
}

function applyTypeStyles(el: HTMLElement, type: string): void {
  const colors = TYPE_COLORS[type]
  el.style.background = colors.bg
  el.style.color = colors.color
}

// ============================================
// ANIMATIONS
// ============================================

function animateIn(el: HTMLElement, position: ToastPosition): void {
  requestAnimationFrame(() => {
    el.style.opacity = '1'
    el.style.transform = getInTransform(position)
  })
}

function getInTransform(position: ToastPosition): string {
  if (position === 'top') return 'translateX(-50%) translateY(0)'
  if (position === 'bottom') return 'translateX(-50%) translateY(0)'
  return 'translateY(0)'
}

// ============================================
// DISMISSAL
// ============================================

function dismissToastsAtPosition(position: ToastPosition): void {
  for (const [id, toast] of activeToasts) {
    if (toast.element.dataset.position === position) {
      dismissSingleToast(id)
    }
  }
}

function dismissSingleToast(toastId: number): void {
  const toast = activeToasts.get(toastId)
  if (!toast) return

  clearTimeout(toast.dismissTimeout)
  clearTimeout(toast.fadeTimeout)
  toast.element.remove()
  activeToasts.delete(toastId)
}

function dismissAllToasts(): void {
  for (const [id] of activeToasts) {
    dismissSingleToast(id)
  }
}

function scheduleAutoDismiss(toastId: number, el: HTMLElement, duration: number): void {
  const dismissTimeout = window.setTimeout(() => {
    startFadeOut(toastId, el)
  }, duration)

  activeToasts.set(toastId, {
    element: el,
    dismissTimeout,
    fadeTimeout: 0,
  })
}

function startFadeOut(toastId: number, el: HTMLElement): void {
  const toastData = activeToasts.get(toastId)
  if (!toastData) return

  el.style.opacity = '0'

  const fadeTimeout = window.setTimeout(() => {
    if (el.parentNode) el.remove()
    activeToasts.delete(toastId)
  }, 200)

  toastData.fadeTimeout = fadeTimeout
}
