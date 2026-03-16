/**
 * PreviewController API Contract Tests
 *
 * These tests ensure the PreviewController exposes all methods
 * that app.js and other consumers expect.
 *
 * If these tests fail, it means we broke the public API.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { PreviewController, createPreviewController } from '../index'

describe('PreviewController API Contract', () => {
  let container: HTMLElement
  let controller: PreviewController

  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    document.body.appendChild(container)

    controller = createPreviewController({
      container,
      enableVisualCode: true,
    })
  })

  describe('required methods for app.js', () => {
    it('exposes showDropZone method', () => {
      expect(typeof controller.showDropZone).toBe('function')
    })

    it('exposes hideDropZone method', () => {
      expect(typeof controller.hideDropZone).toBe('function')
    })

    it('exposes select method', () => {
      expect(typeof controller.select).toBe('function')
    })

    it('exposes clearSelection method', () => {
      expect(typeof controller.clearSelection).toBe('function')
    })

    it('exposes attach method', () => {
      expect(typeof controller.attach).toBe('function')
    })

    it('exposes detach method', () => {
      expect(typeof controller.detach).toBe('function')
    })

    it('exposes refresh method', () => {
      expect(typeof controller.refresh).toBe('function')
    })

    it('exposes dispose method', () => {
      expect(typeof controller.dispose).toBe('function')
    })

    it('exposes setSourceMap method', () => {
      expect(typeof controller.setSourceMap).toBe('function')
    })

    it('exposes onSelect method', () => {
      expect(typeof controller.onSelect).toBe('function')
    })

    it('exposes onHover method', () => {
      expect(typeof controller.onHover).toBe('function')
    })

    it('exposes getElementByNodeId method', () => {
      expect(typeof controller.getElementByNodeId).toBe('function')
    })

    it('exposes getHandleManager method', () => {
      expect(typeof controller.getHandleManager).toBe('function')
    })

    it('exposes getResizeManager method', () => {
      expect(typeof controller.getResizeManager).toBe('function')
    })

    it('exposes getOverlayManager method', () => {
      expect(typeof controller.getOverlayManager).toBe('function')
    })
  })

  describe('showDropZone/hideDropZone functionality', () => {
    it('showDropZone does not throw', () => {
      expect(() => {
        controller.showDropZone({ left: 10, top: 10, width: 100, height: 50 })
      }).not.toThrow()
    })

    it('hideDropZone does not throw', () => {
      expect(() => {
        controller.hideDropZone()
      }).not.toThrow()
    })

    it('showDropZone followed by hideDropZone does not throw', () => {
      expect(() => {
        controller.showDropZone({ left: 10, top: 10, width: 100, height: 50 })
        controller.hideDropZone()
      }).not.toThrow()
    })

    it('multiple showDropZone calls do not throw', () => {
      expect(() => {
        controller.showDropZone({ left: 10, top: 10, width: 100, height: 50 })
        controller.showDropZone({ left: 20, top: 20, width: 200, height: 100 })
        controller.showDropZone({ left: 30, top: 30, width: 300, height: 150 })
      }).not.toThrow()
    })
  })

  describe('controller without visual code', () => {
    it('showDropZone does not throw when enableVisualCode=false', () => {
      const minimalController = createPreviewController({
        container,
        enableVisualCode: false,
      })

      // Should not throw even without overlay manager
      expect(() => {
        minimalController.showDropZone({ left: 10, top: 10, width: 100, height: 50 })
      }).not.toThrow()
    })

    it('hideDropZone does not throw when enableVisualCode=false', () => {
      const minimalController = createPreviewController({
        container,
        enableVisualCode: false,
      })

      expect(() => {
        minimalController.hideDropZone()
      }).not.toThrow()
    })
  })
})
