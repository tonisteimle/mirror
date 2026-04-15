/**
 * Test Runner Module Exports
 *
 * Clean, modular test runner for Mirror Studio.
 */

// Types
export * from './types'

// Core
export { launchChrome } from './chrome'
export { connectCDP, getPageTarget } from './cdp'
export { ConsoleCollector } from './console-collector'
export { ScreenshotCapture } from './screenshot'
export { TestRunner } from './runner'

// Reporters
export { ConsoleReporter, JUnitReporter, HTMLReporter } from './reporters'
