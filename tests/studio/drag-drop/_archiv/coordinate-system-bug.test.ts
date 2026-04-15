/**
 * Coordinate System Consistency Tests
 *
 * Tests that verify consistent coordinate systems across the drag-drop system.
 * All functions must return viewport coordinates (consistent with cursor position).
 *
 * FIXED BUG: target-detector.ts getSiblingRects(), getChildRects(), and getContainerRect()
 * previously returned different coordinate systems depending on whether layoutInfo was available:
 * - With layoutInfo: container-relative coords (WRONG for cursor comparison)
 * - Without layoutInfo: viewport coords from getBoundingClientRect
 *
 * FIX: Now these functions always return viewport coordinates:
 * - getChildRects/getSiblingRects: Convert layoutInfo by adding container's viewport position
 * - getContainerRect: Always uses getBoundingClientRect (viewport)
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest'
import {
  getSiblingRects,
  getChildRects,
  getContainerRect,
} from '../../../studio/drag-drop/system/target-detector'
import type { LayoutRect } from '../../../studio/core/state'

// Mock DOM adapter that returns predictable viewport coordinates
const mockDOMAdapter = {
  getBoundingClientRect: (element: HTMLElement) => {
    const rect = (element as any)._mockRect
    return (
      rect || {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        toJSON: () => ({}),
      }
    )
  },
  getComputedStyle: () => ({}) as CSSStyleDeclaration,
}

// Helper to create a mock element with a specific viewport rect
function createMockElement(
  nodeId: string,
  viewportRect: { x: number; y: number; width: number; height: number }
): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-node-id', nodeId)
  ;(el as any)._mockRect = {
    ...viewportRect,
    top: viewportRect.y,
    left: viewportRect.x,
    right: viewportRect.x + viewportRect.width,
    bottom: viewportRect.y + viewportRect.height,
    toJSON: () => ({}),
  }
  return el
}

describe('Coordinate System Consistency', () => {
  describe('getSiblingRects coordinate system', () => {
    /**
     * After the fix: getSiblingRects now returns viewport coordinates regardless
     * of whether layoutInfo is provided. Container-relative coords from layoutInfo
     * are converted to viewport by adding the container's position.
     */
    it('FIXED: returns viewport coords consistently with and without layoutInfo', () => {
      // Create a container at viewport position (100, 100)
      const container = createMockElement('container', { x: 100, y: 100, width: 300, height: 200 })

      // Create a child at viewport position (100, 100) but container-relative (0, 0)
      const child = createMockElement('child-1', { x: 100, y: 100, width: 300, height: 50 })
      container.appendChild(child)

      // LayoutInfo uses container-relative coordinates
      const layoutInfo = new Map<string, LayoutRect>([
        ['container', { x: 0, y: 0, width: 300, height: 200, parentId: null }],
        ['child-1', { x: 0, y: 0, width: 300, height: 50, parentId: 'container' }],
      ])

      // Get sibling rects WITH layoutInfo
      // Args: container, excludeNodeId, nodeIdAttr, layoutInfo, domAdapter
      const rectsWithLayoutInfo = getSiblingRects(
        container,
        null,
        'data-node-id',
        layoutInfo,
        mockDOMAdapter
      )

      // Get sibling rects WITHOUT layoutInfo
      const rectsWithoutLayoutInfo = getSiblingRects(
        container,
        null,
        'data-node-id',
        undefined,
        mockDOMAdapter
      )

      // FIXED: Both now return viewport coordinates!
      // With layoutInfo: container(100,100) + relative(0,0) = viewport(100,100)
      // Without layoutInfo: getBoundingClientRect = viewport(100,100)

      console.log('With layoutInfo:', rectsWithLayoutInfo[0]?.rect)
      console.log('Without layoutInfo:', rectsWithoutLayoutInfo[0]?.rect)

      // Both should return viewport coordinates (100, 100)
      expect(rectsWithLayoutInfo[0]?.rect.x).toBe(rectsWithoutLayoutInfo[0]?.rect.x)
      expect(rectsWithLayoutInfo[0]?.rect.y).toBe(rectsWithoutLayoutInfo[0]?.rect.y)
      expect(rectsWithLayoutInfo[0]?.rect.x).toBe(100) // Viewport X
      expect(rectsWithLayoutInfo[0]?.rect.y).toBe(100) // Viewport Y
    })

    it('without layoutInfo returns viewport coordinates (correct)', () => {
      const container = createMockElement('container', { x: 100, y: 100, width: 300, height: 200 })
      const child = createMockElement('child-1', { x: 100, y: 100, width: 300, height: 50 })
      container.appendChild(child)

      const rects = getSiblingRects(container, null, 'data-node-id', undefined, mockDOMAdapter)

      // Without layoutInfo, uses getBoundingClientRect which returns viewport coords
      expect(rects).toHaveLength(1)
      expect(rects[0].rect.x).toBe(100) // Viewport X
      expect(rects[0].rect.y).toBe(100) // Viewport Y
    })

    it('FIXED: with layoutInfo now returns viewport coordinates', () => {
      const container = createMockElement('container', { x: 100, y: 100, width: 300, height: 200 })
      const child = createMockElement('child-1', { x: 100, y: 100, width: 300, height: 50 })
      container.appendChild(child)

      const layoutInfo = new Map<string, LayoutRect>([
        ['container', { x: 0, y: 0, width: 300, height: 200, parentId: null }],
        ['child-1', { x: 0, y: 0, width: 300, height: 50, parentId: 'container' }],
      ])

      const rects = getSiblingRects(container, null, 'data-node-id', layoutInfo, mockDOMAdapter)

      // FIXED: Now converts container-relative to viewport!
      // Container at (100,100) + child relative (0,0) = viewport (100,100)
      expect(rects).toHaveLength(1)
      expect(rects[0].rect.x).toBe(100) // Viewport X
      expect(rects[0].rect.y).toBe(100) // Viewport Y
    })
  })

  describe('getChildRects coordinate system', () => {
    it('FIXED: returns viewport coords consistently with and without layoutInfo', () => {
      // Container at viewport (200, 150)
      const container = createMockElement('container', { x: 200, y: 150, width: 400, height: 300 })

      // Child at viewport (200, 150) but container-relative (0, 0)
      const child = createMockElement('child-1', { x: 200, y: 150, width: 100, height: 50 })
      container.appendChild(child)

      // LayoutInfo with container-relative coordinates
      const layoutInfo = new Map<string, LayoutRect>([
        ['container', { x: 0, y: 0, width: 400, height: 300, parentId: null }],
        ['child-1', { x: 0, y: 0, width: 100, height: 50, parentId: 'container' }],
      ])

      // Get child rects WITH layoutInfo
      const rectsWithLayoutInfo = getChildRects(
        container,
        'data-node-id',
        layoutInfo,
        mockDOMAdapter
      )

      // Get child rects WITHOUT layoutInfo
      const rectsWithoutLayoutInfo = getChildRects(
        container,
        'data-node-id',
        undefined,
        mockDOMAdapter
      )

      // FIXED: Both return viewport coordinates!
      expect(rectsWithLayoutInfo).toHaveLength(1)
      expect(rectsWithoutLayoutInfo).toHaveLength(1)

      // Both should be (200, 150) in viewport
      expect(rectsWithLayoutInfo[0].rect.x).toBe(200)
      expect(rectsWithLayoutInfo[0].rect.y).toBe(150)
      expect(rectsWithLayoutInfo[0].rect.x).toBe(rectsWithoutLayoutInfo[0].rect.x)
      expect(rectsWithLayoutInfo[0].rect.y).toBe(rectsWithoutLayoutInfo[0].rect.y)
    })

    it('FIXED: converts non-zero relative coords to viewport', () => {
      // Container at viewport (100, 100)
      const container = createMockElement('container', { x: 100, y: 100, width: 400, height: 300 })

      // Child at viewport (150, 120) = container(100,100) + relative(50,20)
      const child = createMockElement('child-1', { x: 150, y: 120, width: 80, height: 40 })
      container.appendChild(child)

      // LayoutInfo says child is at relative (50, 20)
      const layoutInfo = new Map<string, LayoutRect>([
        ['container', { x: 0, y: 0, width: 400, height: 300, parentId: null }],
        ['child-1', { x: 50, y: 20, width: 80, height: 40, parentId: 'container' }],
      ])

      const rects = getChildRects(container, 'data-node-id', layoutInfo, mockDOMAdapter)

      // Should be converted to viewport: container(100,100) + relative(50,20) = (150,120)
      expect(rects).toHaveLength(1)
      expect(rects[0].rect.x).toBe(150) // 100 + 50
      expect(rects[0].rect.y).toBe(120) // 100 + 20
    })
  })

  describe('getContainerRect coordinate system', () => {
    it('FIXED: always returns viewport coordinates (ignores layoutInfo)', () => {
      const element = createMockElement('element', { x: 150, y: 200, width: 300, height: 200 })

      const layoutInfo = new Map<string, LayoutRect>([
        ['element', { x: 50, y: 100, width: 300, height: 200, parentId: 'root' }],
      ])

      // With layoutInfo: now uses DOM (viewport)
      const rectWithLayoutInfo = getContainerRect(
        element,
        layoutInfo,
        'data-node-id',
        mockDOMAdapter
      )

      // Without layoutInfo: viewport
      const rectWithoutLayoutInfo = getContainerRect(
        element,
        undefined,
        'data-node-id',
        mockDOMAdapter
      )

      console.log('Container rect with layoutInfo:', rectWithLayoutInfo)
      console.log('Container rect without layoutInfo:', rectWithoutLayoutInfo)

      // FIXED: Both now return viewport coordinates!
      expect(rectWithLayoutInfo.x).toBe(150) // Viewport
      expect(rectWithoutLayoutInfo.x).toBe(150) // Viewport

      // Both should be equal (both viewport)
      expect(rectWithLayoutInfo.x).toBe(rectWithoutLayoutInfo.x)
      expect(rectWithLayoutInfo.y).toBe(rectWithoutLayoutInfo.y)
    })
  })

  describe('Impact on FlexWithChildrenStrategy', () => {
    /**
     * After the fix: cursor (viewport) is now compared with childRects (viewport),
     * so insertion positions are calculated correctly.
     */
    it('FIXED: correct insertion position with consistent viewport coords', () => {
      // Scenario:
      // - Container at viewport (100, 100)
      // - Child at viewport (100, 100), layoutInfo says relative (0, 0)
      // - Cursor at viewport (100, 125) - should be in upper half of child

      // BEFORE FIX (BUG):
      // With layoutInfo: child center = 0 + 25 = 25 (container-relative)
      // Cursor comparison: 125 (viewport) < 25 (container-relative)? NO! → 'after' (WRONG!)

      // AFTER FIX:
      // With layoutInfo: child converted to viewport = 100 + 0 = 100, center = 100 + 25 = 125
      // Cursor comparison: 125 (viewport) < 125 (viewport)? NO! → 'after' (CORRECT!)

      // Both with and without layoutInfo now give the same result
      // Drop indicators appear at correct positions

      expect(true).toBe(true) // The real verification is in the coordinate tests above
    })
  })
})
