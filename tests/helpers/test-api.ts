/**
 * Test API Utilities
 *
 * Helpers for testing Mirror components using the Test API.
 * These utilities make it easier to write tests that verify
 * state machines, events, and visual states.
 */

import { compile } from '../../compiler'
import type { MirrorTestAPI, StateMachineInfo } from '../../compiler/runtime/test-api'

// Re-export types for convenience
export type { MirrorTestAPI, StateMachineInfo }

/**
 * Get the Test API from the window object
 * Only works in browser/jsdom environment after runtime is initialized
 */
export function getTestAPI(): MirrorTestAPI | undefined {
  if (typeof window !== 'undefined') {
    return (window as Window & { __MIRROR_TEST__?: MirrorTestAPI }).__MIRROR_TEST__
  }
  return undefined
}

/**
 * Assert that the Test API is available
 * Throws if not available
 */
export function requireTestAPI(): MirrorTestAPI {
  const api = getTestAPI()
  if (!api) {
    throw new Error('Test API not available. Make sure the runtime is initialized.')
  }
  return api
}

/**
 * Compile Mirror code and render it into a container
 * Returns the container element and the Test API
 */
export async function renderMirror(
  code: string,
  options: {
    container?: HTMLElement
    backend?: 'dom'
  } = {}
): Promise<{
  container: HTMLElement
  api: MirrorTestAPI
  cleanup: () => void
}> {
  const container = options.container || document.createElement('div')
  if (!options.container) {
    document.body.appendChild(container)
  }

  // Compile the code
  const compiled = compile(code, { backend: options.backend || 'dom' })

  // Execute the compiled code
  // Note: createUI() returns the root element directly, not an object with { root }
  const execCode = compiled.replace('export function createUI', 'function createUI')
  const fn = new Function(execCode + '\nreturn createUI();')
  const root = fn() as HTMLElement

  if (root) {
    while (root.firstChild) {
      container.appendChild(root.firstChild)
    }
  }

  // Get the Test API (should be available after runtime init)
  const api = requireTestAPI()

  return {
    container,
    api,
    cleanup: () => {
      container.innerHTML = ''
      if (!options.container) {
        container.remove()
      }
    },
  }
}

// ============================================
// ASSERTION HELPERS
// ============================================

/**
 * Assert that an element is in a specific state
 */
export function expectState(
  api: MirrorTestAPI,
  element: HTMLElement | null,
  expectedState: string
): void {
  if (!element) {
    throw new Error('Element is null')
  }
  const actualState = api.getState(element as any)
  if (actualState !== expectedState) {
    throw new Error(`Expected state "${expectedState}" but got "${actualState}"`)
  }
}

/**
 * Assert that an element has a specific style value
 */
export function expectStyle(
  element: HTMLElement | null,
  property: string,
  expectedValue: string
): void {
  if (!element) {
    throw new Error('Element is null')
  }

  // Get computed style
  const computed = window.getComputedStyle(element)
  const actualValue = computed.getPropertyValue(property)

  // Normalize colors for comparison
  const normalize = (v: string) => v.replace(/\s+/g, '').toLowerCase()

  if (normalize(actualValue) !== normalize(expectedValue)) {
    throw new Error(
      `Expected style "${property}: ${expectedValue}" but got "${property}: ${actualValue}"`
    )
  }
}

/**
 * Assert that an element is visible
 */
export function expectVisible(
  api: MirrorTestAPI,
  element: HTMLElement | null,
  visible: boolean = true
): void {
  if (!element) {
    throw new Error('Element is null')
  }
  const isVisible = api.isVisible(element as any)
  if (isVisible !== visible) {
    throw new Error(`Expected element to be ${visible ? 'visible' : 'hidden'} but it was ${isVisible ? 'visible' : 'hidden'}`)
  }
}

/**
 * Assert that an element has a state machine
 */
export function expectStateMachine(
  api: MirrorTestAPI,
  element: HTMLElement | null
): StateMachineInfo {
  if (!element) {
    throw new Error('Element is null')
  }
  const info = api.getStateMachineInfo(element as any)
  if (!info) {
    throw new Error('Element does not have a state machine')
  }
  return info
}

/**
 * Assert that an element has specific available states
 */
export function expectAvailableStates(
  api: MirrorTestAPI,
  element: HTMLElement | null,
  expectedStates: string[]
): void {
  if (!element) {
    throw new Error('Element is null')
  }
  const actualStates = api.getAvailableStates(element as any).sort()
  const sortedExpected = [...expectedStates].sort()

  if (JSON.stringify(actualStates) !== JSON.stringify(sortedExpected)) {
    throw new Error(
      `Expected states [${sortedExpected.join(', ')}] but got [${actualStates.join(', ')}]`
    )
  }
}

// ============================================
// INTERACTION HELPERS
// ============================================

/**
 * Click an element and wait for state change
 */
export async function clickAndWaitForState(
  api: MirrorTestAPI,
  element: HTMLElement | null,
  expectedState: string,
  timeout: number = 1000
): Promise<boolean> {
  if (!element) {
    throw new Error('Element is null')
  }

  api.trigger(element as any, 'click')
  return api.waitForState(element as any, expectedState, timeout)
}

/**
 * Type text into an input element
 */
export function typeText(
  element: HTMLInputElement | HTMLTextAreaElement | null,
  text: string
): void {
  if (!element) {
    throw new Error('Element is null')
  }

  element.value = text
  element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
}

/**
 * Wait for a condition to be true
 */
export function waitFor(
  condition: () => boolean,
  timeout: number = 1000,
  interval: number = 16
): Promise<boolean> {
  return new Promise((resolve) => {
    if (condition()) {
      resolve(true)
      return
    }

    const startTime = Date.now()
    const check = setInterval(() => {
      if (condition()) {
        clearInterval(check)
        resolve(true)
      } else if (Date.now() - startTime > timeout) {
        clearInterval(check)
        resolve(false)
      }
    }, interval)
  })
}

// ============================================
// DEBUGGING HELPERS
// ============================================

/**
 * Log the state machine info for all elements with state machines
 */
export function debugStateMachines(api: MirrorTestAPI): void {
  const elements = api.getAllElements()

  console.group('Mirror State Machines')
  for (const el of elements) {
    const info = api.getStateMachineInfo(el as any)
    if (info) {
      const nodeId = el.getAttribute('data-mirror-id')
      console.log(`[${nodeId}]`, info.current, '/', info.states.join(', '))
    }
  }
  console.groupEnd()
}

/**
 * Get a snapshot of all element states
 */
export function getStateSnapshot(api: MirrorTestAPI): Record<string, string> {
  const snapshot: Record<string, string> = {}
  const elements = api.getAllElements()

  for (const el of elements) {
    const nodeId = el.getAttribute('data-mirror-id')
    if (nodeId) {
      const state = api.getState(el as any)
      snapshot[nodeId] = state
    }
  }

  return snapshot
}
