/**
 * Toast Module
 *
 * Toast notification system for user feedback.
 *
 * Implementation lives inside `createToastModule()` so the entire
 * thing is self-contained — typed unit tests instantiate the module,
 * and the runtime template stamps the factory verbatim via .toString()
 * so production runs the same code.
 */

// ============================================
// TYPES
// ============================================

export interface ToastOptions {
  duration?: number
  type?: 'info' | 'success' | 'error' | 'warning'
  position?: ToastPosition
}

export type ToastPosition =
  | 'top'
  | 'bottom'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'

interface ToastModule {
  toast(message: string, options?: ToastOptions): number
  dismissToast(toastId?: number): void
}

/**
 * Factory: returns a fresh toast module with its own counter and
 * active-toast registry. Self-contained — all helpers and state are
 * captured in the closure so this can be stamped into the runtime
 * template as a single block.
 */
export function createToastModule(): ToastModule {
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
  // STATE
  // ============================================

  let toastCounter = 0
  interface ActiveToast {
    element: HTMLElement
    dismissTimeout: number
    fadeTimeout: number
  }
  const activeToasts = new Map<number, ActiveToast>()

  // ============================================
  // ELEMENT CREATION
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
    Object.assign(el.style, POSITION_STYLES[position])

    const colors = TYPE_COLORS[type] || TYPE_COLORS.info
    el.style.background = colors.bg
    el.style.color = colors.color

    return el
  }

  // ============================================
  // ANIMATIONS
  // ============================================

  function animateIn(el: HTMLElement, position: ToastPosition): void {
    requestAnimationFrame(() => {
      el.style.opacity = '1'
      if (position === 'top' || position === 'bottom') {
        el.style.transform = 'translateX(-50%) translateY(0)'
      } else {
        el.style.transform = 'translateY(0)'
      }
    })
  }

  // ============================================
  // DISMISSAL
  // ============================================

  function dismissToastsAtPosition(position: ToastPosition): void {
    for (const [id, t] of activeToasts) {
      if (t.element.dataset.position === position) {
        dismissSingleToast(id)
      }
    }
  }

  function dismissSingleToast(toastId: number): void {
    const t = activeToasts.get(toastId)
    if (!t) return
    clearTimeout(t.dismissTimeout)
    clearTimeout(t.fadeTimeout)
    t.element.remove()
    activeToasts.delete(toastId)
  }

  function scheduleAutoDismiss(toastId: number, el: HTMLElement, duration: number): void {
    const dismissTimeout = window.setTimeout(() => startFadeOut(toastId, el), duration)
    activeToasts.set(toastId, { element: el, dismissTimeout, fadeTimeout: 0 })
  }

  function startFadeOut(toastId: number, el: HTMLElement): void {
    const data = activeToasts.get(toastId)
    if (!data) return
    el.style.opacity = '0'
    const fadeTimeout = window.setTimeout(() => {
      if (el.parentNode) el.remove()
      activeToasts.delete(toastId)
    }, 200)
    data.fadeTimeout = fadeTimeout
  }

  // ============================================
  // PUBLIC API
  // ============================================

  function toast(message: string, options?: ToastOptions): number {
    const opts = options || {}
    const duration = opts.duration ?? 3000
    const type = opts.type ?? 'info'
    const position = opts.position ?? 'bottom'
    const toastId = ++toastCounter

    dismissToastsAtPosition(position)

    const el = createToastElement(message, type, position, toastId)
    document.body.appendChild(el)

    animateIn(el, position)
    scheduleAutoDismiss(toastId, el, duration)

    return toastId
  }

  function dismissToast(toastId?: number): void {
    if (toastId !== undefined) {
      dismissSingleToast(toastId)
    } else {
      for (const [id] of activeToasts) dismissSingleToast(id)
    }
  }

  return { toast, dismissToast }
}

// Module-level singleton for code that imports `toast` directly. The
// runtime template instantiates its own copy via createToastModule() —
// see compiler/backends/dom/runtime-template/index.ts.
const _module = createToastModule()
export const toast = _module.toast
export const dismissToast = _module.dismissToast
