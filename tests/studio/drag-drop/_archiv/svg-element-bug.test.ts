/**
 * SVG Element Bug Tests
 *
 * Tests verifying that SVG elements are correctly handled in the drag-drop system.
 *
 * BUG FIXED: Previously, getChildRects(), getSiblingRects(), and hasValidChildren()
 * used `instanceof HTMLElement` which excluded SVG elements (which inherit from
 * SVGElement, not HTMLElement).
 *
 * FIX: Changed to `instanceof Element` which is the common base class for both
 * HTMLElement and SVGElement.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getChildRects,
  getSiblingRects,
  hasValidChildren,
  clearTargetCache,
} from '../../../studio/drag-drop/system/target-detector'

describe('SVG Element Bug', () => {
  beforeEach(() => {
    clearTargetCache()
  })

  const createMockAdapter = (rect = { x: 0, y: 0, width: 100, height: 100 }) => ({
    getBoundingClientRect: vi.fn(() => ({
      ...rect,
      top: rect.y,
      left: rect.x,
      right: rect.x + rect.width,
      bottom: rect.y + rect.height,
      toJSON: () => ({}),
    })),
    getComputedStyle: vi.fn(
      () =>
        ({
          display: 'flex',
          flexDirection: 'row',
          position: 'static',
        }) as CSSStyleDeclaration
    ),
  })

  describe('getChildRects', () => {
    /**
     * FIXED: SVG children are now included in getChildRects
     */
    it('includes SVG elements with data-mirror-id', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-mirror-id', 'svg-icon')
      container.appendChild(svg)

      const mockAdapter = createMockAdapter()
      const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

      expect(rects).toHaveLength(1)
      expect(rects[0].nodeId).toBe('svg-icon')
    })

    it('includes mixed HTML and SVG children', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      // HTML child
      const div = document.createElement('div')
      div.setAttribute('data-mirror-id', 'html-child')
      container.appendChild(div)

      // SVG child
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-mirror-id', 'svg-child')
      container.appendChild(svg)

      // Another HTML child
      const span = document.createElement('span')
      span.setAttribute('data-mirror-id', 'span-child')
      container.appendChild(span)

      const mockAdapter = createMockAdapter()
      const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

      expect(rects).toHaveLength(3)
      expect(rects.map(r => r.nodeId)).toContain('html-child')
      expect(rects.map(r => r.nodeId)).toContain('svg-child')
      expect(rects.map(r => r.nodeId)).toContain('span-child')
    })

    it('excludes SVG elements without data-mirror-id', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      // SVG without node ID
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      container.appendChild(svg)

      const mockAdapter = createMockAdapter()
      const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

      expect(rects).toHaveLength(0)
    })
  })

  describe('getSiblingRects', () => {
    /**
     * FIXED: SVG siblings are now included in getSiblingRects
     */
    it('includes SVG elements in sibling rects', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-mirror-id', 'svg-sibling')
      container.appendChild(svg)

      const mockAdapter = createMockAdapter()
      const siblings = getSiblingRects(container, null, 'data-mirror-id', null, mockAdapter)

      expect(siblings).toHaveLength(1)
      expect(siblings[0].nodeId).toBe('svg-sibling')
    })

    it('correctly excludes SVG element by nodeId', () => {
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'container')

      const svg1 = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg1.setAttribute('data-mirror-id', 'svg-1')
      container.appendChild(svg1)

      const svg2 = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg2.setAttribute('data-mirror-id', 'svg-2')
      container.appendChild(svg2)

      const mockAdapter = createMockAdapter()
      const siblings = getSiblingRects(container, 'svg-1', 'data-mirror-id', null, mockAdapter)

      expect(siblings).toHaveLength(1)
      expect(siblings[0].nodeId).toBe('svg-2')
    })
  })

  describe('hasValidChildren', () => {
    /**
     * FIXED: hasValidChildren correctly detects SVG children
     */
    it('returns true when container has SVG child with node ID', () => {
      const container = document.createElement('div')

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-mirror-id', 'svg-child')
      container.appendChild(svg)

      expect(hasValidChildren(container, 'data-mirror-id')).toBe(true)
    })

    it('returns false when SVG children lack node ID', () => {
      const container = document.createElement('div')

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      container.appendChild(svg)

      expect(hasValidChildren(container, 'data-mirror-id')).toBe(false)
    })

    it('returns true for mixed HTML and SVG children', () => {
      const container = document.createElement('div')

      // Only SVG child has the node ID
      const div = document.createElement('div')
      container.appendChild(div)

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-mirror-id', 'svg-icon')
      container.appendChild(svg)

      expect(hasValidChildren(container, 'data-mirror-id')).toBe(true)
    })
  })

  describe('Real-world scenarios', () => {
    it('Icon component in flex container is draggable', () => {
      // Simulates: Frame hor; Icon "heart"; Text "Like"
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'frame')
      container.style.display = 'flex'

      // Icon component renders as SVG
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      svg.setAttribute('data-mirror-id', 'icon-1')
      container.appendChild(svg)

      // Text component renders as span
      const span = document.createElement('span')
      span.setAttribute('data-mirror-id', 'text-1')
      container.appendChild(span)

      const mockAdapter = createMockAdapter()
      const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

      // Both icon and text should be included for drag-drop
      expect(rects).toHaveLength(2)
      expect(rects.map(r => r.nodeId)).toEqual(['icon-1', 'text-1'])
    })

    it('SVG chart in dashboard card is detected', () => {
      // Simulates: Card; Chart (renders as SVG)
      const container = document.createElement('div')
      container.setAttribute('data-mirror-id', 'card')

      const chartSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
      chartSvg.setAttribute('data-mirror-id', 'chart-1')
      container.appendChild(chartSvg)

      expect(hasValidChildren(container, 'data-mirror-id')).toBe(true)

      const mockAdapter = createMockAdapter()
      const rects = getChildRects(container, 'data-mirror-id', null, mockAdapter)

      expect(rects).toHaveLength(1)
      expect(rects[0].nodeId).toBe('chart-1')
    })
  })
})
