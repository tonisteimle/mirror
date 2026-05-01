/**
 * Studio Test API
 *
 * Exposes internal studio systems for E2E testing.
 * This module is imported by bootstrap.ts and initializes test globals.
 *
 * Includes event-based API for testing picker/trigger interactions
 * without relying on timeouts.
 */

import type { StudioInstance } from './bootstrap'
import { events, type StudioEvents } from './core/events'
import { getTriggerManager } from './editor/trigger-manager'
import { createLogger } from '../compiler/utils/logger'
import { setupBrowserDragTestAPI } from './preview/drag/browser-test-api'
import { setupMirrorTestAPI } from './test-api/index'

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

declare global {
  interface Window {
    __mirrorStudio__?: StudioInstance
    __STUDIO_TEST__?: StudioTestAPI
    /** Legacy global set by app.js — CodeMirror EditorView. Tests use it. */
    editor?: import('@codemirror/view').EditorView
    /** Desktop files API (set by desktop-files.js) — file CRUD for tests. */
    desktopFiles?: {
      readFile?: (path: string) => string | Promise<string>
      writeFile?: (path: string, content: string) => void | Promise<void>
      listFiles?: () => string[] | Promise<string[]>
      /** Synchronous cache of all files: { [path]: content }. */
      getFiles?: () => Record<string, string>
      getFileContent?: (path: string) => string | undefined
      updateFileCache?: (path: string, content?: string) => void
      [key: string]: unknown
    }
  }
}

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

/**
 * Create the event-based test API
 */
function createStudioTestAPI(): StudioTestAPI {
  return {
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
}

/**
 * Initialize the Studio Test API.
 * Exposes studio systems on the window object for Playwright tests.
 *
 * @param studio - The studio instance
 * @param _dragDrop - Unused, kept for backwards compatibility
 */
export function initStudioTestAPI(studio: StudioInstance, _dragDrop: unknown): void {
  if (typeof window !== 'undefined') {
    window.__mirrorStudio__ = studio
    window.__STUDIO_TEST__ = createStudioTestAPI()

    // Initialize Browser Drag Test API (window.__dragTest)
    try {
      setupBrowserDragTestAPI()
      log.info('Browser Drag Test API initialized at window.__dragTest')
    } catch (e) {
      log.warn('Failed to initialize Browser Drag Test API:', e)
    }

    // Initialize Mirror Test API (window.__mirrorTest, window.__mirrorTestSuites)
    try {
      setupMirrorTestAPI()
      log.info('Mirror Test API initialized at window.__mirrorTest')
    } catch (e) {
      log.warn('Failed to initialize Mirror Test API:', e)
    }
  }
  log.info('Test API initialized')
}

/**
 * Clean up the Studio Test API.
 * Removes test globals from the window object.
 */
export function cleanupStudioTestAPI(): void {
  if (typeof window !== 'undefined') {
    delete window.__mirrorStudio__
    delete window.__STUDIO_TEST__
  }
}
