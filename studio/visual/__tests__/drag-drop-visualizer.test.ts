/**
 * Tests for DragDropVisualizer
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { DragDropVisualizer, createDragDropVisualizer, DropZoneInfo } from '../drag-drop-visualizer'
import { OverlayManager, createOverlayManager } from '../overlay-manager'

// Mock DOMRect for JSDOM
class MockDOMRect {
  x: number
  y: number
  width: number
  height: number
  top: number
  right: number
  bottom: number
  left: number

  constructor(x = 0, y = 0, width = 0, height = 0) {
    this.x = x
    this.y = y
    this.width = width
    this.height = height
    this.top = y
    this.left = x
    this.right = x + width
    this.bottom = y + height
  }

  toJSON() {
    return { x: this.x, y: this.y, width: this.width, height: this.height }
  }
}

// @ts-ignore - Mock global
global.DOMRect = MockDOMRect

describe('DragDropVisualizer', () => {
  let dom: JSDOM
  let container: HTMLElement
  let overlayManager: OverlayManager
  let visualizer: DragDropVisualizer

  beforeEach(() => {
    dom = new JSDOM('<!DOCTYPE html><html><body><div id="container"></div></body></html>')
    const document = dom.window.document
    global.document = document as unknown as Document
    global.window = dom.window as unknown as Window & typeof globalThis

    container = document.getElementById('container')!
    container.style.position = 'relative'
    container.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      width: 800,
      height: 600,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    overlayManager = createOverlayManager({ container })
    visualizer = createDragDropVisualizer({ container, overlayManager })
  })

  afterEach(() => {
    visualizer.dispose()
    overlayManager.dispose()
  })

  describe('showDropZone', () => {
    it('shows semantic dots for inside placement', () => {
      const showSemanticDotsSpy = vi.spyOn(overlayManager, 'showSemanticDots')
      const showDropZoneSpy = vi.spyOn(overlayManager, 'showDropZone')
      const showZoneIndicatorSpy = vi.spyOn(overlayManager, 'showZoneIndicator')
      const hideSiblingLineSpy = vi.spyOn(overlayManager, 'hideSiblingLine')

      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        semanticZone: 'top-left',
        targetRect: new MockDOMRect(100, 100, 200, 150),
        targetName: 'Box',
      }

      visualizer.showDropZone(zone)

      // Prototype behavior: ALWAYS show drop zone and semantic dots
      expect(showDropZoneSpy).toHaveBeenCalled()
      expect(showSemanticDotsSpy).toHaveBeenCalledWith(
        expect.objectContaining({ left: 100, top: 100, width: 200, height: 150 }),
        'top-left'
      )
      expect(showZoneIndicatorSpy).toHaveBeenCalledWith('Box', 'Top Left')
      expect(hideSiblingLineSpy).toHaveBeenCalled()
      expect(visualizer.isShowing()).toBe(true)
    })

    it('shows ONLY sibling line for before placement (prototype behavior)', () => {
      const showSiblingLineSpy = vi.spyOn(overlayManager, 'showSiblingLine')
      const hideSemanticDotsSpy = vi.spyOn(overlayManager, 'hideSemanticDots')
      const hideDropZoneSpy = vi.spyOn(overlayManager, 'hideDropZone')
      const showZoneIndicatorSpy = vi.spyOn(overlayManager, 'showZoneIndicator')

      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'before',
        targetRect: new MockDOMRect(100, 100, 200, 150),
        parentDirection: 'vertical',
        parentName: 'Container',
      }

      visualizer.showDropZone(zone)

      // Prototype: sibling mode shows ONLY line, NO dots
      expect(hideDropZoneSpy).toHaveBeenCalled()
      expect(hideSemanticDotsSpy).toHaveBeenCalled()
      expect(showSiblingLineSpy).toHaveBeenCalledWith(
        expect.objectContaining({ left: 100, top: 100, width: 200, height: 150 }),
        'before',
        'vertical'
      )
      // Zone indicator shows parent context
      expect(showZoneIndicatorSpy).toHaveBeenCalledWith('Container', 'als Schwester (davor)')
    })

    it('shows sibling line for after placement in horizontal layout', () => {
      const showSiblingLineSpy = vi.spyOn(overlayManager, 'showSiblingLine')
      const showZoneIndicatorSpy = vi.spyOn(overlayManager, 'showZoneIndicator')

      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'after',
        targetRect: new MockDOMRect(100, 100, 200, 150),
        parentDirection: 'horizontal',
        parentName: 'HBox',
      }

      visualizer.showDropZone(zone)

      expect(showSiblingLineSpy).toHaveBeenCalledWith(
        expect.any(Object),
        'after',
        'horizontal'
      )
      expect(showZoneIndicatorSpy).toHaveBeenCalledWith('HBox', 'als Schwester (danach)')
    })
  })

  describe('hideDropZone', () => {
    it('hides all visual feedback', () => {
      const hideSemanticDotsSpy = vi.spyOn(overlayManager, 'hideSemanticDots')
      const hideSiblingLineSpy = vi.spyOn(overlayManager, 'hideSiblingLine')
      const hideDropZoneSpy = vi.spyOn(overlayManager, 'hideDropZone')
      const hideZoneIndicatorSpy = vi.spyOn(overlayManager, 'hideZoneIndicator')

      visualizer.hideDropZone()

      expect(hideSemanticDotsSpy).toHaveBeenCalled()
      expect(hideSiblingLineSpy).toHaveBeenCalled()
      expect(hideDropZoneSpy).toHaveBeenCalled()
      expect(hideZoneIndicatorSpy).toHaveBeenCalled()
      expect(visualizer.isShowing()).toBe(false)
    })
  })

  describe('getCurrentZone', () => {
    it('returns current zone info when showing', () => {
      const zone: DropZoneInfo = {
        targetId: 'node-1',
        placement: 'inside',
        semanticZone: 'mid-center',
        targetRect: new MockDOMRect(100, 100, 200, 150),
      }

      visualizer.showDropZone(zone)
      const current = visualizer.getCurrentZone()

      expect(current).toEqual(zone)
    })

    it('returns null when not showing', () => {
      expect(visualizer.getCurrentZone()).toBeNull()
    })
  })

  describe('zone display names', () => {
    it.each([
      ['top-left', 'Top Left'],
      ['top-center', 'Top Center'],
      ['top-right', 'Top Right'],
      ['mid-left', 'Middle Left'],
      ['mid-center', 'Center'],
      ['mid-right', 'Middle Right'],
      ['bot-left', 'Bottom Left'],
      ['bot-center', 'Bottom Center'],
      ['bot-right', 'Bottom Right'],
    ])('displays %s as "%s"', (zone, expected) => {
      const showZoneIndicatorSpy = vi.spyOn(overlayManager, 'showZoneIndicator')

      visualizer.showDropZone({
        targetId: 'node-1',
        placement: 'inside',
        semanticZone: zone as any,
        targetRect: new MockDOMRect(0, 0, 100, 100),
        targetName: 'Container',
      })

      expect(showZoneIndicatorSpy).toHaveBeenCalledWith('Container', expected)
    })
  })
})
