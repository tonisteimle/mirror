/**
 * Mirror Test API
 *
 * Comprehensive testing API for Mirror applications.
 * Combines all test modules into a single API.
 *
 * Usage:
 *   const api = window.__MIRROR_TEST__
 *   const btn = api.getElement('btn-1')
 *   api.trigger(btn, 'click')
 *   expect(api.getState(btn)).toBe('active')
 */

import type { MirrorTestAPI, RuntimeFunctions } from './types'
import { createCoreAPI } from './core'
import { createVisibilityAPI } from './visibility'
import { createNavigationAPI, resetNavigationHistory } from './navigation'

// Re-export types
export type {
  MirrorTestAPI,
  RuntimeFunctions,
  MirrorElement,
  StateMachineInfo,
  VisibilityState,
  VisibilityReason,
  NavigationState,
  ViewInfo,
  CoreTestAPI,
  VisibilityTestAPI,
  NavigationTestAPI,
} from './types'

// Re-export navigation helpers for test cleanup
export { resetNavigationHistory }

/**
 * Create the complete Test API
 *
 * @param runtime - Reference to the runtime functions
 * @returns Complete Test API object
 */
export function createTestAPI(runtime: RuntimeFunctions): MirrorTestAPI {
  const coreAPI = createCoreAPI(runtime)
  const visibilityAPI = createVisibilityAPI(runtime)
  const navigationAPI = createNavigationAPI(runtime)

  return {
    ...coreAPI,
    ...visibilityAPI,
    ...navigationAPI,
  }
}

/**
 * Initialize Test API on window object
 *
 * @param runtime - Reference to the runtime functions
 * @returns The initialized Test API
 */
export function initTestAPI(runtime: RuntimeFunctions): MirrorTestAPI {
  const api = createTestAPI(runtime)

  if (typeof window !== 'undefined') {
    window.__MIRROR_TEST__ = api
  }

  return api
}
