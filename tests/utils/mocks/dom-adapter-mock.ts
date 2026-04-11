/**
 * DOM Adapter Mock
 *
 * Controllable mock implementation of DOMAdapter for testing.
 * Allows tests to control what getComputedStyle, elementFromPoint,
 * and getBoundingClientRect return.
 */

import { vi } from 'vitest'
import type { DOMAdapter } from '../../../studio/drag-drop/system/dom-adapter'

/**
 * Extended DOMAdapter with mock control methods
 */
export interface MockDOMAdapter extends DOMAdapter {
  /** Set the computed style that will be returned for any element */
  setComputedStyle(style: Partial<CSSStyleDeclaration>): void

  /** Set element-specific computed styles (keyed by element reference) */
  setComputedStyleForElement(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void

  /** Set the element that elementFromPoint will return */
  setElementFromPoint(element: Element | null): void

  /** Set coordinate-specific elements for elementFromPoint */
  setElementFromPointAt(x: number, y: number, element: Element | null): void

  /** Set the rect that getBoundingClientRect will return for any element */
  setBoundingClientRect(rect: DOMRect): void

  /** Set element-specific rects (keyed by element reference) */
  setBoundingClientRectForElement(element: HTMLElement, rect: DOMRect): void

  /** Reset all mocks to defaults */
  reset(): void

  /** Get access to underlying spy functions for verification */
  spies: {
    getComputedStyle: ReturnType<typeof vi.fn>
    elementFromPoint: ReturnType<typeof vi.fn>
    getBoundingClientRect: ReturnType<typeof vi.fn>
  }
}

/**
 * Creates a mock CSSStyleDeclaration with default values
 */
export function createMockStyle(overrides: Partial<CSSStyleDeclaration> = {}): CSSStyleDeclaration {
  return {
    display: 'block',
    position: 'static',
    flexDirection: 'row',
    ...overrides,
  } as CSSStyleDeclaration
}

/**
 * Creates a mock DOMRect
 */
export function createMockRect(
  x: number,
  y: number,
  width: number,
  height: number
): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON: () => ({ x, y, width, height }),
  } as DOMRect
}

/**
 * Creates a controllable mock DOMAdapter for testing.
 *
 * @example
 * ```typescript
 * const mockAdapter = createMockDOMAdapter()
 *
 * // Set default computed style
 * mockAdapter.setComputedStyle({ display: 'flex', flexDirection: 'column' })
 *
 * // Set default bounding rect
 * mockAdapter.setBoundingClientRect(createMockRect(0, 0, 400, 300))
 *
 * // Use in target detector
 * const target = detectTarget(element, 'data-node-id', mockAdapter)
 *
 * // Verify calls
 * expect(mockAdapter.spies.getComputedStyle).toHaveBeenCalledWith(element)
 * ```
 */
export function createMockDOMAdapter(): MockDOMAdapter {
  // Default values
  let defaultStyle = createMockStyle()
  let defaultRect = createMockRect(0, 0, 100, 100)
  let defaultElementFromPoint: Element | null = null

  // Element-specific overrides
  const elementStyles = new WeakMap<HTMLElement, CSSStyleDeclaration>()
  const elementRects = new WeakMap<HTMLElement, DOMRect>()

  // Coordinate-specific elementFromPoint
  const pointElements = new Map<string, Element | null>()

  // Spy functions
  const getComputedStyleSpy = vi.fn((element: HTMLElement): CSSStyleDeclaration => {
    return elementStyles.get(element) ?? defaultStyle
  })

  const elementFromPointSpy = vi.fn((x: number, y: number): Element | null => {
    const key = `${x},${y}`
    if (pointElements.has(key)) {
      return pointElements.get(key) ?? null
    }
    return defaultElementFromPoint
  })

  const getBoundingClientRectSpy = vi.fn((element: HTMLElement): DOMRect => {
    return elementRects.get(element) ?? defaultRect
  })

  const adapter: MockDOMAdapter = {
    getComputedStyle: getComputedStyleSpy,
    elementFromPoint: elementFromPointSpy,
    getBoundingClientRect: getBoundingClientRectSpy,

    setComputedStyle(style: Partial<CSSStyleDeclaration>): void {
      defaultStyle = createMockStyle(style)
    },

    setComputedStyleForElement(element: HTMLElement, style: Partial<CSSStyleDeclaration>): void {
      elementStyles.set(element, createMockStyle(style))
    },

    setElementFromPoint(element: Element | null): void {
      defaultElementFromPoint = element
    },

    setElementFromPointAt(x: number, y: number, element: Element | null): void {
      pointElements.set(`${x},${y}`, element)
    },

    setBoundingClientRect(rect: DOMRect): void {
      defaultRect = rect
    },

    setBoundingClientRectForElement(element: HTMLElement, rect: DOMRect): void {
      elementRects.set(element, rect)
    },

    reset(): void {
      defaultStyle = createMockStyle()
      defaultRect = createMockRect(0, 0, 100, 100)
      defaultElementFromPoint = null
      pointElements.clear()
      getComputedStyleSpy.mockClear()
      elementFromPointSpy.mockClear()
      getBoundingClientRectSpy.mockClear()
    },

    spies: {
      getComputedStyle: getComputedStyleSpy,
      elementFromPoint: elementFromPointSpy,
      getBoundingClientRect: getBoundingClientRectSpy,
    },
  }

  return adapter
}

/**
 * Pre-configured mock adapter for flex containers
 */
export function createFlexDOMAdapter(): MockDOMAdapter {
  const adapter = createMockDOMAdapter()
  adapter.setComputedStyle({
    display: 'flex',
    flexDirection: 'column',
    position: 'static',
  })
  return adapter
}

/**
 * Pre-configured mock adapter for positioned (stacked) containers
 */
export function createPositionedDOMAdapter(): MockDOMAdapter {
  const adapter = createMockDOMAdapter()
  adapter.setComputedStyle({
    display: 'block',
    position: 'relative',
  })
  return adapter
}
