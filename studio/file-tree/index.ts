/**
 * File Tree Module
 *
 * Testable file tree management.
 *
 * Architecture:
 * - utils.ts: Pure functions (fully testable)
 * - controller.ts: State management (testable, no DOM)
 * - view.ts: DOM rendering (thin layer, delegates to controller)
 */

export * from './utils'
export * from './controller'
export * from './view'
export * from './init'
