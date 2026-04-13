/**
 * DOM Adapter
 *
 * Low-level abstraction for DOM operations. Used by:
 * - target-detector.ts (for element detection)
 * - adapters/dom-adapters.ts (for port implementations)
 *
 * This enables unit testing without a full DOM environment.
 * For the full Ports & Adapters architecture, see ./adapters/
 */

/**
 * Interface for DOM operations that can be mocked in tests.
 */
export interface DOMAdapter {
  /**
   * Get computed style for an element
   */
  getComputedStyle(element: HTMLElement): CSSStyleDeclaration

  /**
   * Get element at specific coordinates
   */
  elementFromPoint(x: number, y: number): Element | null

  /**
   * Get bounding client rect for an element
   */
  getBoundingClientRect(element: HTMLElement): DOMRect
}

/**
 * Default DOM adapter that delegates to standard DOM APIs.
 */
const defaultDOMAdapter: DOMAdapter = {
  getComputedStyle: (element: HTMLElement) => window.getComputedStyle(element),
  elementFromPoint: (x: number, y: number) => document.elementFromPoint(x, y),
  getBoundingClientRect: (element: HTMLElement) => element.getBoundingClientRect(),
}

/**
 * Create a DOM adapter with standard DOM APIs.
 * Use this in production code.
 */
export function createDOMAdapter(): DOMAdapter {
  return defaultDOMAdapter
}

/**
 * Get the default DOM adapter (singleton).
 * Useful when you don't need a custom adapter.
 */
export function getDefaultDOMAdapter(): DOMAdapter {
  return defaultDOMAdapter
}
