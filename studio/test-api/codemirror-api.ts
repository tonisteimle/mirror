/**
 * CodeMirror Test API
 *
 * Provides direct access to CodeMirror internals for testing.
 * This is necessary because DOM keyboard events don't trigger
 * CodeMirror's keymap handlers properly.
 *
 * IMPORTANT: This API tests the ACTUAL integration, not mocked behavior.
 * If a test passes here but fails in the browser, the integration is broken.
 */

import type { EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'
import { events as localEvents } from '../core/events'

/**
 * Get the global events bus from the main studio bundle.
 * Falls back to local events if not available (shouldn't happen in tests).
 */
function getEvents() {
  // Use the events from the main studio instance to ensure we're using
  // the same singleton as the actual application code
  const studio = (window as any).__mirrorStudio__
  if (studio?.events) {
    return studio.events
  }
  // Fallback to local events (may not work in bundled tests)
  console.warn('[TEST-API] WARNING: Using local events (bundled copy) - event tests may fail')
  return localEvents
}

// =============================================================================
// Types
// =============================================================================

export interface CodeMirrorTestAPI {
  /** Get the EditorView instance */
  getView(): EditorView | null

  /** Check if an extension is registered by name/type */
  hasExtension(name: string): boolean

  /** Get all registered extension names (for debugging) */
  getExtensionNames(): string[]

  /** Run a CodeMirror command by name */
  runCommand(command: string): boolean

  /** Execute a keymap binding (e.g., 'Mod-Enter', 'Escape') */
  executeKeyBinding(key: string): boolean

  /** Type text into the editor at current cursor */
  typeText(text: string): void

  /** Set cursor position (line is 1-indexed) */
  setCursor(line: number, column?: number): void

  /** Get cursor position */
  getCursor(): { line: number; column: number; offset: number }

  /** Get current content */
  getContent(): string

  /** Set content */
  setContent(content: string): void

  /** Get line content (1-indexed) */
  getLine(lineNumber: number): string | null

  /** Focus the editor */
  focus(): void

  /** Check if editor has focus */
  hasFocus(): boolean
}

export interface EventTestAPI {
  /** Wait for any event */
  waitFor<T = unknown>(eventName: string, timeout?: number): Promise<T>

  /** Check if event was emitted (since last reset) */
  wasEmitted(eventName: string): boolean

  /** Get all emitted events (since last reset) */
  getEmittedEvents(): Array<{ name: string; payload: unknown; timestamp: number }>

  /** Reset event tracking */
  reset(): void

  /** Start tracking events */
  startTracking(): void

  /** Stop tracking events */
  stopTracking(): void
}

// =============================================================================
// Implementation
// =============================================================================

/**
 * Create CodeMirror Test API
 */
export function createCodeMirrorTestAPI(): CodeMirrorTestAPI {
  const getView = (): EditorView | null => {
    return (window as any).editor as EditorView | null
  }

  return {
    getView,

    hasExtension(name: string): boolean {
      const view = getView()
      if (!view) return false

      // Check state extensions
      const stateExtensions = (view.state as any).config?.extensions || []

      // Flatten and search for extension by name
      const checkExtension = (ext: any): boolean => {
        if (!ext) return false
        if (ext.name === name) return true
        if (ext.id === name) return true
        if (ext.constructor?.name === name) return true

        // Check for StateField
        if (ext.spec?.id === name) return true

        // Check arrays
        if (Array.isArray(ext)) {
          return ext.some(e => checkExtension(e))
        }

        // Check extension value
        if (ext.extension) {
          return checkExtension(ext.extension)
        }

        return false
      }

      return stateExtensions.some((ext: any) => checkExtension(ext))
    },

    getExtensionNames(): string[] {
      const view = getView()
      if (!view) return []

      const names: string[] = []
      const stateExtensions = (view.state as any).config?.extensions || []

      const collectNames = (ext: any, depth = 0): void => {
        if (!ext || depth > 10) return

        if (ext.name) names.push(ext.name)
        if (ext.id) names.push(`id:${ext.id}`)
        if (ext.constructor?.name && ext.constructor.name !== 'Object') {
          names.push(`class:${ext.constructor.name}`)
        }
        if (ext.spec?.id) names.push(`spec:${ext.spec.id}`)

        if (Array.isArray(ext)) {
          ext.forEach(e => collectNames(e, depth + 1))
        }
        if (ext.extension) {
          collectNames(ext.extension, depth + 1)
        }
      }

      stateExtensions.forEach((ext: any) => collectNames(ext))
      return Array.from(new Set(names))
    },

    runCommand(command: string): boolean {
      const view = getView()
      if (!view) return false

      // Try to find and run the command
      // Note: This is complex - commands are registered differently in CodeMirror
      // const cmds = view.state.facet // keymap access is complex

      // For now, just return false - we'll use executeKeyBinding instead
      console.warn(`runCommand('${command}') not implemented - use executeKeyBinding`)
      return false
    },

    executeKeyBinding(key: string): boolean {
      const view = getView()
      if (!view) return false

      // Parse the key binding
      const parts = key.split('-')
      const modifiers = {
        ctrl: false,
        meta: false,
        alt: false,
        shift: false,
      }

      const actualKey = parts[parts.length - 1]

      for (let i = 0; i < parts.length - 1; i++) {
        const mod = parts[i].toLowerCase()
        if (mod === 'mod') {
          // Mod = Cmd on Mac, Ctrl on others
          const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
          if (isMac) modifiers.meta = true
          else modifiers.ctrl = true
        } else if (mod === 'ctrl') modifiers.ctrl = true
        else if (mod === 'meta' || mod === 'cmd') modifiers.meta = true
        else if (mod === 'alt') modifiers.alt = true
        else if (mod === 'shift') modifiers.shift = true
      }

      // Create the key event
      const event = new KeyboardEvent('keydown', {
        key: actualKey,
        code:
          actualKey === 'Enter'
            ? 'Enter'
            : actualKey === 'Escape'
              ? 'Escape'
              : `Key${actualKey.toUpperCase()}`,
        ctrlKey: modifiers.ctrl,
        metaKey: modifiers.meta,
        altKey: modifiers.alt,
        shiftKey: modifiers.shift,
        bubbles: true,
        cancelable: true,
      })

      // Use CodeMirror's internal key handling
      // This is the key insight - we need to use runScopeHandlers
      try {
        const { runScopeHandlers } = require('@codemirror/view')
        const handled = runScopeHandlers(view, event, 'editor')
        return handled
      } catch (e) {
        // Fallback: dispatch to contentDOM
        view.contentDOM.dispatchEvent(event)
        return false
      }
    },

    typeText(text: string): void {
      const view = getView()
      if (!view) return

      const pos = view.state.selection.main.head
      view.dispatch({
        changes: { from: pos, to: pos, insert: text },
        selection: { anchor: pos + text.length },
      })
    },

    setCursor(line: number, column: number = 1): void {
      const view = getView()
      if (!view) return

      try {
        const lineInfo = view.state.doc.line(line)
        const offset = lineInfo.from + Math.min(column - 1, lineInfo.length)
        view.dispatch({ selection: { anchor: offset } })
      } catch {
        // Line doesn't exist
      }
    },

    getCursor(): { line: number; column: number; offset: number } {
      const view = getView()
      if (!view) return { line: 1, column: 1, offset: 0 }

      const offset = view.state.selection.main.head
      const line = view.state.doc.lineAt(offset)
      return {
        line: line.number,
        column: offset - line.from + 1,
        offset,
      }
    },

    getContent(): string {
      const view = getView()
      return view?.state.doc.toString() ?? ''
    },

    setContent(content: string): void {
      const view = getView()
      if (!view) return

      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: content },
      })
    },

    getLine(lineNumber: number): string | null {
      const view = getView()
      if (!view) return null

      try {
        return view.state.doc.line(lineNumber).text
      } catch {
        return null
      }
    },

    focus(): void {
      const view = getView()
      view?.focus()
    },

    hasFocus(): boolean {
      const view = getView()
      return view?.hasFocus ?? false
    },
  }
}

/**
 * Create Event Test API
 */
export function createEventTestAPI(): EventTestAPI {
  let tracking = false
  let emittedEvents: Array<{ name: string; payload: unknown; timestamp: number }> = []
  let unsubscribers: Array<() => void> = []

  // Events to track
  const TRACKED_EVENTS = [
    'selection:changed',
    'editor:content-changed',
    'compile:complete',
    'compile:error',
  ]

  return {
    waitFor<T = unknown>(eventName: string, timeout = 5000): Promise<T> {
      return new Promise((resolve, reject) => {
        const events = getEvents()
        const timeoutId = setTimeout(() => {
          unsubscribe()
          reject(new Error(`Timeout waiting for event: ${eventName}`))
        }, timeout)

        const unsubscribe = events.on(eventName as any, (payload: T) => {
          clearTimeout(timeoutId)
          unsubscribe()
          resolve(payload)
        })
      })
    },

    wasEmitted(eventName: string): boolean {
      return emittedEvents.some(e => e.name === eventName)
    },

    getEmittedEvents() {
      return [...emittedEvents]
    },

    reset(): void {
      emittedEvents = []
    },

    startTracking(): void {
      if (tracking) return
      tracking = true
      emittedEvents = []
      const events = getEvents()

      for (const eventName of TRACKED_EVENTS) {
        const unsub = events.on(eventName as any, (payload: unknown) => {
          emittedEvents.push({
            name: eventName,
            payload,
            timestamp: Date.now(),
          })
        })
        unsubscribers.push(unsub)
      }
    },

    stopTracking(): void {
      tracking = false
      unsubscribers.forEach(unsub => unsub())
      unsubscribers = []
    },
  }
}

// =============================================================================
// Singleton Instances
// =============================================================================

let codemirrorAPI: CodeMirrorTestAPI | null = null
let eventAPI: EventTestAPI | null = null

export function getCodeMirrorTestAPI(): CodeMirrorTestAPI {
  if (!codemirrorAPI) {
    codemirrorAPI = createCodeMirrorTestAPI()
  }
  return codemirrorAPI
}

export function getEventTestAPI(): EventTestAPI {
  if (!eventAPI) {
    eventAPI = createEventTestAPI()
  }
  return eventAPI
}
