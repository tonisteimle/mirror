// @ts-nocheck
// TODO: Update to Zag.js 1.x API (breaking changes in machine/service types)
/**
 * Base UI Component for Zag.js Integration
 *
 * Provides a foundation for building headless UI components
 * with Zag.js state machines in vanilla TypeScript.
 */

import type { Machine, StateMachine } from '@zag-js/core'

export interface ZagComponentConfig {
  /** Container element to render into */
  container: HTMLElement
  /** Optional CSS class prefix */
  classPrefix?: string
}

/**
 * Abstract base class for Zag.js-powered UI components
 *
 * Handles:
 * - Machine lifecycle (start/stop)
 * - State subscriptions
 * - DOM cleanup
 */
export abstract class ZagComponent<
  TContext extends Record<string, unknown>,
  TState extends StateMachine.State<TContext, StateMachine.StateSchema>,
  TApi
> {
  protected container: HTMLElement
  protected classPrefix: string
  protected service: Machine<TContext, TState> | null = null
  protected api: TApi | null = null
  private unsubscribe: (() => void) | null = null

  constructor(config: ZagComponentConfig) {
    this.container = config.container
    this.classPrefix = config.classPrefix || 'zag'
  }

  /**
   * Initialize the component - must be called after construction
   */
  init(): this {
    this.service = this.createMachine()
    this.subscribe()
    this.service.start()
    return this
  }

  /**
   * Create the Zag machine instance
   * Override in subclass
   */
  protected abstract createMachine(): Machine<TContext, TState>

  /**
   * Create the API from current state
   * Override in subclass
   */
  protected abstract createApi(
    state: TState,
    send: Machine<TContext, TState>['send']
  ): TApi

  /**
   * Render the component
   * Override in subclass
   */
  protected abstract render(api: TApi): void

  /**
   * Subscribe to state changes
   */
  private subscribe(): void {
    if (!this.service) return

    this.unsubscribe = this.service.subscribe((state) => {
      this.api = this.createApi(state, this.service!.send)
      this.render(this.api)
    })
  }

  /**
   * Get current API (for external access)
   */
  getApi(): TApi | null {
    return this.api
  }

  /**
   * Update machine context
   */
  setContext(context: Partial<TContext>): void {
    this.service?.send({ type: 'SET_CONTEXT', context })
  }

  /**
   * Cleanup and destroy component
   */
  destroy(): void {
    this.unsubscribe?.()
    this.service?.stop()
    this.container.innerHTML = ''
    this.service = null
    this.api = null
  }

  /**
   * Helper: Create element with class
   */
  protected createElement<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    attrs?: Record<string, string>
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag)
    if (className) {
      el.className = `${this.classPrefix}-${className}`
    }
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        el.setAttribute(key, value)
      }
    }
    return el
  }

  /**
   * Helper: Spread Zag props onto element
   */
  protected spreadProps(
    el: HTMLElement,
    props: Record<string, unknown>
  ): void {
    for (const [key, value] of Object.entries(props)) {
      if (key === 'style' && typeof value === 'object') {
        Object.assign(el.style, value)
      } else if (key.startsWith('on') && typeof value === 'function') {
        const event = key.slice(2).toLowerCase()
        el.addEventListener(event, value as EventListener)
      } else if (key.startsWith('data-') || key.startsWith('aria-') || key === 'role' || key === 'id' || key === 'tabindex') {
        el.setAttribute(key, String(value))
      } else if (typeof value === 'boolean') {
        if (value) {
          el.setAttribute(key, '')
        } else {
          el.removeAttribute(key)
        }
      }
    }
  }

  /**
   * Helper: Add compact IDE styling
   */
  protected applyCompactStyle(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
    Object.assign(el.style, styles)
  }
}

/**
 * CSS custom properties for consistent IDE styling
 */
export const IDE_THEME = {
  // Spacing (compact)
  '--ui-gap-xs': '2px',
  '--ui-gap-sm': '4px',
  '--ui-gap-md': '8px',
  '--ui-pad-xs': '2px 4px',
  '--ui-pad-sm': '4px 8px',
  '--ui-pad-md': '6px 10px',

  // Typography
  '--ui-font-size': '12px',
  '--ui-font-family': '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  '--ui-line-height': '1.4',

  // Colors (inherit from studio theme)
  '--ui-bg': 'var(--bg-secondary, #1c1c22)',
  '--ui-bg-hover': 'var(--bg-tertiary, #25252d)',
  '--ui-bg-selected': 'var(--accent, #5BA8F5)',
  '--ui-text': 'var(--text-primary, #e4e4e7)',
  '--ui-text-muted': 'var(--text-secondary, #71717a)',
  '--ui-border': 'var(--border, #2e2e38)',

  // Sizing
  '--ui-item-height': '22px',
  '--ui-icon-size': '14px',
  '--ui-indent': '16px',
} as const

export type IDETheme = typeof IDE_THEME
