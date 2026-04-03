/**
 * Tests for layout-detection utilities
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  detectLayout,
  isHorizontalLayout,
  getLayoutDirection,
  isAbsoluteLayoutContainer,
  clientToContainer,
  type LayoutInfo,
} from '../../compiler/studio/utils/layout-detection'

// ===========================================
// TEST HELPERS
// ===========================================

function createElement(
  styles: Partial<CSSStyleDeclaration> = {},
  dataset: Record<string, string> = {}
): HTMLElement {
  const element = document.createElement('div')
  Object.assign(element.style, styles)
  Object.entries(dataset).forEach(([key, value]) => {
    element.dataset[key] = value
  })
  document.body.appendChild(element)
  return element
}

function cleanupElement(element: HTMLElement): void {
  if (element.parentNode) {
    element.parentNode.removeChild(element)
  }
}

// ===========================================
// detectLayout
// ===========================================

describe('detectLayout', () => {
  let element: HTMLElement

  afterEach(() => {
    if (element) {
      cleanupElement(element)
    }
    vi.restoreAllMocks()
  })

  describe('null handling', () => {
    it('should return default layout for null element', () => {
      const result = detectLayout(null)

      expect(result).toEqual({
        type: 'block',
        direction: 'vertical',
        isRTL: false,
        scale: 1,
      })
    })
  })

  describe('flex layout detection', () => {
    it('should detect horizontal flex (row)', () => {
      element = createElement({ display: 'flex', flexDirection: 'row' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('horizontal')
    })

    it('should detect horizontal flex (row-reverse)', () => {
      element = createElement({ display: 'flex', flexDirection: 'row-reverse' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('horizontal')
    })

    it('should detect vertical flex (column)', () => {
      element = createElement({ display: 'flex', flexDirection: 'column' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('vertical')
    })

    it('should detect vertical flex (column-reverse)', () => {
      element = createElement({ display: 'flex', flexDirection: 'column-reverse' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('vertical')
    })

    it('should detect inline-flex', () => {
      element = createElement({ display: 'inline-flex', flexDirection: 'row' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('horizontal')
    })
  })

  describe('grid layout detection', () => {
    it('should detect grid layout', () => {
      element = createElement({ display: 'grid' })

      const result = detectLayout(element)

      expect(result.type).toBe('grid')
    })

    it('should detect inline-grid layout', () => {
      element = createElement({ display: 'inline-grid' })

      const result = detectLayout(element)

      expect(result.type).toBe('grid')
    })
  })

  describe('absolute layout detection', () => {
    it('should detect absolute layout via data-layout="abs"', () => {
      element = createElement({ position: 'relative' }, { layout: 'abs' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
      expect(result.direction).toBe('vertical')
    })

    it('should detect absolute layout via data-layout="absolute"', () => {
      element = createElement({ position: 'relative' }, { layout: 'absolute' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should detect absolute layout via data-layout="stacked"', () => {
      element = createElement({ position: 'relative' }, { layout: 'stacked' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should detect absolute layout via data-mirror-absolute', () => {
      element = createElement({ position: 'relative' }, { mirrorAbsolute: 'true' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should detect absolute layout via data-mirror-abs (DOM generator format)', () => {
      element = createElement({ position: 'relative' }, { mirrorAbs: 'true' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should detect ZStack as absolute layout', () => {
      element = createElement({ position: 'relative' }, { mirrorName: 'ZStack' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should detect Canvas as absolute layout', () => {
      element = createElement({ position: 'relative' }, { mirrorName: 'Canvas' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should detect Artboard as absolute layout', () => {
      element = createElement({ position: 'relative' }, { mirrorName: 'Artboard' })

      const result = detectLayout(element)

      expect(result.type).toBe('absolute')
    })

    it('should not detect absolute without position:relative', () => {
      element = createElement({ position: 'static' }, { layout: 'abs' })

      const result = detectLayout(element)

      expect(result.type).toBe('block')
    })
  })

  describe('Mirror-specific layout hints', () => {
    it('should detect horizontal layout via data-layout="hor"', () => {
      element = createElement({}, { layout: 'hor' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('horizontal')
    })

    it('should detect horizontal layout via data-layout="horizontal"', () => {
      element = createElement({}, { layout: 'horizontal' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('horizontal')
    })

    it('should detect vertical layout via data-layout="ver"', () => {
      element = createElement({}, { layout: 'ver' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('vertical')
    })

    it('should detect vertical layout via data-layout="vertical"', () => {
      element = createElement({}, { layout: 'vertical' })

      const result = detectLayout(element)

      expect(result.type).toBe('flex')
      expect(result.direction).toBe('vertical')
    })
  })

  describe('RTL detection', () => {
    it('should detect RTL direction', () => {
      element = createElement({ direction: 'rtl', display: 'flex' })

      const result = detectLayout(element)

      expect(result.isRTL).toBe(true)
    })

    it('should detect LTR direction', () => {
      element = createElement({ direction: 'ltr', display: 'flex' })

      const result = detectLayout(element)

      expect(result.isRTL).toBe(false)
    })
  })

  describe('scale detection', () => {
    it('should detect scale from matrix transform', () => {
      element = createElement({ transform: 'matrix(2, 0, 0, 2, 0, 0)' })

      // Need to mock getComputedStyle since jsdom doesn't compute transforms
      const originalGetComputedStyle = window.getComputedStyle
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        const style = originalGetComputedStyle(el)
        return {
          ...style,
          transform: 'matrix(2, 0, 0, 2, 0, 0)',
          direction: style.direction,
          position: style.position,
          display: style.display,
          flexDirection: style.flexDirection,
          gridTemplateColumns: style.gridTemplateColumns,
        } as CSSStyleDeclaration
      })

      const result = detectLayout(element)

      expect(result.scale).toBe(2)
    })

    it('should detect scale from scale() shorthand', () => {
      element = createElement({})

      // Mock getComputedStyle to return scale() shorthand
      const originalGetComputedStyle = window.getComputedStyle
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        const style = originalGetComputedStyle(el)
        return {
          ...style,
          transform: 'scale(0.5)',
          direction: style.direction,
          position: style.position,
          display: style.display,
          flexDirection: style.flexDirection,
          getPropertyValue: style.getPropertyValue.bind(style),
        } as CSSStyleDeclaration
      })

      const result = detectLayout(element)

      expect(result.scale).toBe(0.5)
    })

    it('should detect scale from scale(x, y) format', () => {
      element = createElement({})

      // Mock getComputedStyle to return scale(x, y) format
      const originalGetComputedStyle = window.getComputedStyle
      vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
        const style = originalGetComputedStyle(el)
        return {
          ...style,
          transform: 'scale(1.5, 1.5)',
          direction: style.direction,
          position: style.position,
          display: style.display,
          flexDirection: style.flexDirection,
          getPropertyValue: style.getPropertyValue.bind(style),
        } as CSSStyleDeclaration
      })

      const result = detectLayout(element)

      expect(result.scale).toBe(1.5)
    })

    it('should return scale 1 for no transform', () => {
      element = createElement({})

      const result = detectLayout(element)

      expect(result.scale).toBe(1)
    })

    it('should return scale 1 for transform: none', () => {
      element = createElement({ transform: 'none' })

      const result = detectLayout(element)

      expect(result.scale).toBe(1)
    })
  })

  describe('default layout', () => {
    it('should return block layout by default', () => {
      element = createElement({})

      const result = detectLayout(element)

      expect(result.type).toBe('block')
      expect(result.direction).toBe('vertical')
    })
  })
})

// ===========================================
// isHorizontalLayout
// ===========================================

describe('isHorizontalLayout', () => {
  let element: HTMLElement

  afterEach(() => {
    if (element) {
      cleanupElement(element)
    }
  })

  it('should return true for horizontal flex', () => {
    element = createElement({ display: 'flex', flexDirection: 'row' })

    expect(isHorizontalLayout(element)).toBe(true)
  })

  it('should return false for vertical flex', () => {
    element = createElement({ display: 'flex', flexDirection: 'column' })

    expect(isHorizontalLayout(element)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isHorizontalLayout(null)).toBe(false)
  })

  it('should return true for data-layout="hor"', () => {
    element = createElement({}, { layout: 'hor' })

    expect(isHorizontalLayout(element)).toBe(true)
  })
})

// ===========================================
// getLayoutDirection
// ===========================================

describe('getLayoutDirection', () => {
  let element: HTMLElement

  afterEach(() => {
    if (element) {
      cleanupElement(element)
    }
  })

  it('should return horizontal for row flex', () => {
    element = createElement({ display: 'flex', flexDirection: 'row' })

    expect(getLayoutDirection(element)).toBe('horizontal')
  })

  it('should return vertical for column flex', () => {
    element = createElement({ display: 'flex', flexDirection: 'column' })

    expect(getLayoutDirection(element)).toBe('vertical')
  })

  it('should return vertical for null', () => {
    expect(getLayoutDirection(null)).toBe('vertical')
  })
})

// ===========================================
// isAbsoluteLayoutContainer
// ===========================================

describe('isAbsoluteLayoutContainer', () => {
  let element: HTMLElement

  afterEach(() => {
    if (element) {
      cleanupElement(element)
    }
  })

  it('should return true for absolute layout', () => {
    element = createElement({ position: 'relative' }, { layout: 'abs' })

    expect(isAbsoluteLayoutContainer(element)).toBe(true)
  })

  it('should return false for flex layout', () => {
    element = createElement({ display: 'flex' })

    expect(isAbsoluteLayoutContainer(element)).toBe(false)
  })

  it('should return false for null', () => {
    expect(isAbsoluteLayoutContainer(null)).toBe(false)
  })
})

// ===========================================
// clientToContainer
// ===========================================

describe('clientToContainer', () => {
  let element: HTMLElement

  afterEach(() => {
    if (element) {
      cleanupElement(element)
    }
    vi.restoreAllMocks()
  })

  it('should transform coordinates relative to container', () => {
    element = createElement({
      position: 'absolute',
      left: '100px',
      top: '50px',
      width: '200px',
      height: '200px',
    })

    // Mock getBoundingClientRect
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(100, 50, 200, 200)
    )

    const result = clientToContainer(150, 100, element)

    expect(result.x).toBe(50) // 150 - 100
    expect(result.y).toBe(50) // 100 - 50
  })

  it('should account for scale', () => {
    element = createElement({
      position: 'absolute',
      left: '100px',
      top: '100px',
      width: '200px',
      height: '200px',
    })

    // Mock getBoundingClientRect and getComputedStyle
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(100, 100, 200, 200)
    )

    const originalGetComputedStyle = window.getComputedStyle
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      const style = originalGetComputedStyle(el)
      return {
        ...style,
        transform: 'matrix(2, 0, 0, 2, 0, 0)',
        direction: style.direction,
        position: style.position,
        display: style.display,
        flexDirection: style.flexDirection,
        gridTemplateColumns: style.gridTemplateColumns,
      } as CSSStyleDeclaration
    })

    const result = clientToContainer(200, 200, element)

    // (200 - 100) / 2 = 50
    expect(result.x).toBe(50)
    expect(result.y).toBe(50)
  })
})
