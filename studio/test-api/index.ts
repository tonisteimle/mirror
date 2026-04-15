/**
 * Studio Test API
 *
 * Event-based API for testing Studio interactions without timeouts.
 * Provides methods to wait for picker/trigger state changes.
 */

import { events, type StudioEvents } from '../core/events'
import { getTriggerManager } from '../editor/trigger-manager'
import { createLogger } from '../../compiler/utils/logger'

const log = createLogger('TestAPI')

export interface StudioTestAPI {
  /** Wait for any picker to open */
  waitForPickerOpen(timeout?: number): Promise<{ pickerId: string; pickerType: string }>
  /** Wait for any picker to close */
  waitForPickerClose(timeout?: number): Promise<{ pickerId: string; reason: string }>
  /** Wait for a specific trigger to activate */
  waitForTrigger(
    triggerId: string,
    timeout?: number
  ): Promise<{ triggerId: string; startPos: number }>
  /** Wait for a specific trigger to deactivate */
  waitForTriggerDeactivate(triggerId: string, timeout?: number): Promise<{ triggerId: string }>
  /** Check if any picker is currently open */
  isPickerOpen(): boolean
  /** Get the type of the currently active picker */
  getActivePickerType(): string | null
  /** Get the ID of the currently active trigger */
  getActiveTrigger(): string | null
  /** Wait for any event of a specific type */
  waitForEvent<K extends keyof StudioEvents>(event: K, timeout?: number): Promise<StudioEvents[K]>
  /** Get the EventBus for direct access */
  getEventBus(): typeof events
}

/**
 * Create the Studio Test API
 */
export function createStudioTestAPI(): StudioTestAPI {
  const DEFAULT_TIMEOUT = 5000

  /**
   * Generic event waiter
   */
  function waitForEvent<K extends keyof StudioEvents>(
    event: K,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<StudioEvents[K]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Timeout waiting for event: ${event}`))
      }, timeout)
      const unsubscribe = events.on(event, payload => {
        clearTimeout(timeoutId)
        unsubscribe()
        resolve(payload)
      })
    })
  }

  /**
   * Wait for a specific event with a filter condition
   */
  function waitForEventWithFilter<K extends keyof StudioEvents>(
    event: K,
    filter: (payload: StudioEvents[K]) => boolean,
    timeout: number = DEFAULT_TIMEOUT
  ): Promise<StudioEvents[K]> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        unsubscribe()
        reject(new Error(`Timeout waiting for event: ${event}`))
      }, timeout)

      const unsubscribe = events.on(event, payload => {
        if (filter(payload)) {
          clearTimeout(timeoutId)
          unsubscribe()
          resolve(payload)
        }
      })
    })
  }

  const api: StudioTestAPI = {
    waitForPickerOpen(timeout = DEFAULT_TIMEOUT) {
      return waitForEvent('picker:opened', timeout)
    },

    waitForPickerClose(timeout = DEFAULT_TIMEOUT) {
      return waitForEvent('picker:closed', timeout)
    },

    waitForTrigger(triggerId: string, timeout = DEFAULT_TIMEOUT) {
      return waitForEventWithFilter(
        'trigger:activated',
        payload => payload.triggerId === triggerId,
        timeout
      )
    },

    waitForTriggerDeactivate(triggerId: string, timeout = DEFAULT_TIMEOUT) {
      return waitForEventWithFilter(
        'trigger:deactivated',
        payload => payload.triggerId === triggerId,
        timeout
      )
    },

    isPickerOpen() {
      const triggerManager = getTriggerManager()
      return triggerManager.isOpen()
    },

    getActivePickerType() {
      const triggerManager = getTriggerManager()
      const state = triggerManager.getState()
      if (!state.isOpen || !state.picker) return null

      // Try to get picker type from the picker instance
      const picker = state.picker as { pickerType?: string }
      return picker.pickerType ?? null
    },

    getActiveTrigger() {
      const triggerManager = getTriggerManager()
      return triggerManager.getActiveTrigger()
    },

    waitForEvent,

    getEventBus() {
      return events
    },
  }

  return api
}

// Singleton instance
let testAPI: StudioTestAPI | null = null

/**
 * Get or create the Studio Test API
 */
export function getStudioTestAPI(): StudioTestAPI {
  if (!testAPI) {
    testAPI = createStudioTestAPI()
  }
  return testAPI
}

/**
 * Initialize and register the test API on window object
 * Call this during app initialization (only in test/dev environments)
 *
 * @param _studio - Studio instance (optional, for future use)
 * @param _editor - CodeMirror editor instance (optional, for drag test API)
 */
export function initStudioTestAPI(_studio?: unknown, _editor?: unknown): void {
  const api = getStudioTestAPI()

  // Register on window for Playwright access
  if (typeof window !== 'undefined') {
    ;(window as Window & { __STUDIO_TEST__?: StudioTestAPI }).__STUDIO_TEST__ = api
  }

  // Initialize drag test API (available at window.__testDragDrop)
  try {
    const { setupGlobalDragTestAPI } = require('../preview/drag/test-api/global')
    setupGlobalDragTestAPI(_editor)
    log.info('Drag Test API initialized at window.__testDragDrop')
  } catch (e) {
    log.warn('Failed to initialize Drag Test API:', e)
  }

  // Initialize browser drag test API (available at window.__dragTest)
  // This API uses real DOM events for visual testing
  try {
    const { setupBrowserDragTestAPI } = require('../preview/drag/browser-test-api')
    setupBrowserDragTestAPI()
    log.info('Browser Drag Test API initialized at window.__dragTest')
  } catch (e) {
    log.warn('Failed to initialize Browser Drag Test API:', e)
  }

  log.info('Test API initialized')
}

/**
 * Check if running in test mode
 */
export function isTestMode(): boolean {
  if (typeof window === 'undefined') return false

  // Check for Playwright
  if ((window as any).__playwright) return true

  // Check for test query param
  const params = new URLSearchParams(window.location.search)
  if (params.has('test')) return true

  // Check for NODE_ENV
  if (process.env.NODE_ENV === 'test') return true

  return false
}
