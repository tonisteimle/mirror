/**
 * GhostFactory Tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { JSDOM } from 'jsdom'
import {
  GhostFactory,
  createGhostFactory,
  getGhostFactory,
  calculateGhostPosition,
  calculateElementGhostRect,
  calculatePaletteGhostRect,
  getDefaultSize,
  COMPONENT_DEFAULT_SIZES,
} from '../ghost-factory'

// Setup JSDOM
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost',
})
global.document = dom.window.document
global.HTMLElement = dom.window.HTMLElement

describe('GhostFactory', () => {
  let factory: GhostFactory

  beforeEach(() => {
    factory = createGhostFactory()
  })

  afterEach(() => {
    factory.dispose()
    // Clean up any remaining ghosts
    document.querySelectorAll('.mirror-ghost-placeholder').forEach(el => el.remove())
  })

  describe('createPlaceholder()', () => {
    it('creates a placeholder ghost with default size', () => {
      const ghost = factory.createPlaceholder()

      expect(ghost).toBeDefined()
      expect(ghost.style.position).toBe('fixed')
      expect(ghost.style.width).toBe('100px')
      expect(ghost.style.height).toBe('40px')
    })

    it('creates a placeholder ghost with custom size', () => {
      const ghost = factory.createPlaceholder({ width: 200, height: 150 })

      expect(ghost.style.width).toBe('200px')
      expect(ghost.style.height).toBe('150px')
    })

    it('creates a placeholder with component name label', () => {
      const ghost = factory.createPlaceholder({ width: 100, height: 40 }, {
        componentName: 'Button',
        showLabel: true,
      })

      const label = ghost.querySelector('span')
      expect(label).toBeDefined()
      expect(label?.textContent).toBe('Button')
    })

    it('applies dashed border style', () => {
      const ghost = factory.createPlaceholder({ width: 100, height: 40 }, {
        borderStyle: 'dashed',
      })

      expect(ghost.style.border).toContain('dashed')
    })
  })

  describe('createFromElement()', () => {
    it('creates a clone ghost from an element', () => {
      // Create a test element
      const element = document.createElement('div')
      element.dataset.mirrorId = 'test-node'
      element.textContent = 'Test Content'
      element.style.width = '150px'
      element.style.height = '80px'
      document.body.appendChild(element)

      // Mock getBoundingClientRect
      element.getBoundingClientRect = () => ({
        x: 100,
        y: 50,
        left: 100,
        top: 50,
        right: 250,
        bottom: 130,
        width: 150,
        height: 80,
        toJSON: () => {},
      })

      const ghost = factory.createFromElement(element)

      expect(ghost).toBeDefined()
      expect(ghost.style.position).toBe('fixed')
      expect(ghost.style.width).toBe('150px')
      expect(ghost.style.height).toBe('80px')
      expect(ghost.textContent).toBe('Test Content')
      // data-mirror-id should be removed to avoid conflicts
      expect(ghost.dataset.mirrorId).toBeUndefined()

      document.body.removeChild(element)
    })

    it('removes selection classes from clone', () => {
      const element = document.createElement('div')
      element.classList.add('studio-selected', 'studio-hover', 'studio-multi-selected')
      element.getBoundingClientRect = () => ({
        x: 0, y: 0, left: 0, top: 0, right: 100, bottom: 100, width: 100, height: 100, toJSON: () => {},
      })
      document.body.appendChild(element)

      const ghost = factory.createFromElement(element)

      expect(ghost.classList.contains('studio-selected')).toBe(false)
      expect(ghost.classList.contains('studio-hover')).toBe(false)
      expect(ghost.classList.contains('studio-multi-selected')).toBe(false)

      document.body.removeChild(element)
    })
  })

  describe('setPosition()', () => {
    it('updates ghost position using transform', () => {
      const ghost = factory.createPlaceholder()
      factory.setPosition({ x: 100, y: 200 })

      expect(ghost.style.transform).toBe('translate(100px, 200px)')
    })

    it('does nothing if no ghost exists', () => {
      factory.dispose()
      expect(() => factory.setPosition({ x: 100, y: 200 })).not.toThrow()
    })
  })

  describe('setRect()', () => {
    it('updates ghost position and size', () => {
      const ghost = factory.createPlaceholder()
      factory.setRect({ x: 50, y: 75, width: 200, height: 150 })

      expect(ghost.style.transform).toBe('translate(50px, 75px)')
      expect(ghost.style.width).toBe('200px')
      expect(ghost.style.height).toBe('150px')
    })
  })

  describe('hasGhost()', () => {
    it('returns true when ghost exists', () => {
      factory.createPlaceholder()
      expect(factory.hasGhost()).toBe(true)
    })

    it('returns false when no ghost', () => {
      expect(factory.hasGhost()).toBe(false)
    })

    it('returns false after dispose', () => {
      factory.createPlaceholder()
      factory.dispose()
      expect(factory.hasGhost()).toBe(false)
    })
  })

  describe('dispose()', () => {
    it('removes ghost from DOM', () => {
      factory.createPlaceholder()
      expect(document.body.querySelector('.mirror-ghost-placeholder')).not.toBeNull()

      factory.dispose()
      expect(document.body.querySelector('.mirror-ghost-placeholder')).toBeNull()
    })

    it('can be called multiple times safely', () => {
      factory.createPlaceholder()
      factory.dispose()
      expect(() => factory.dispose()).not.toThrow()
    })
  })
})

describe('Utility Functions', () => {
  describe('calculateGhostPosition()', () => {
    it('calculates position from cursor and grab offset', () => {
      const cursor = { x: 200, y: 150 }
      const grabOffset = { x: 30, y: 20 }
      const elementRect = { x: 100, y: 80, width: 100, height: 50 }

      const pos = calculateGhostPosition(cursor, grabOffset, elementRect)

      expect(pos).toEqual({ x: 170, y: 130 })
    })
  })

  describe('calculateElementGhostRect()', () => {
    it('calculates rect for element drags', () => {
      const cursor = { x: 200, y: 150 }
      const grabOffset = { x: 30, y: 20 }
      const originalRect = { x: 100, y: 80, width: 120, height: 60 }

      const rect = calculateElementGhostRect(cursor, grabOffset, originalRect)

      expect(rect).toEqual({
        x: 170,
        y: 130,
        width: 120,
        height: 60,
      })
    })
  })

  describe('calculatePaletteGhostRect()', () => {
    it('centers ghost on cursor', () => {
      const cursor = { x: 200, y: 150 }
      const size = { width: 100, height: 40 }

      const rect = calculatePaletteGhostRect(cursor, size)

      expect(rect).toEqual({
        x: 150, // 200 - 50
        y: 130, // 150 - 20
        width: 100,
        height: 40,
      })
    })
  })

  describe('getDefaultSize()', () => {
    it('returns size for known components', () => {
      expect(getDefaultSize('Button')).toEqual({ width: 80, height: 36 })
      expect(getDefaultSize('Input')).toEqual({ width: 200, height: 36 })
      expect(getDefaultSize('Box')).toEqual({ width: 100, height: 100 })
    })

    it('returns fallback for unknown components', () => {
      expect(getDefaultSize('UnknownComponent')).toEqual({ width: 100, height: 40 })
    })
  })

  describe('COMPONENT_DEFAULT_SIZES', () => {
    it('contains expected components', () => {
      expect(COMPONENT_DEFAULT_SIZES).toHaveProperty('Box')
      expect(COMPONENT_DEFAULT_SIZES).toHaveProperty('Text')
      expect(COMPONENT_DEFAULT_SIZES).toHaveProperty('Button')
      expect(COMPONENT_DEFAULT_SIZES).toHaveProperty('Input')
      expect(COMPONENT_DEFAULT_SIZES).toHaveProperty('Image')
    })
  })
})
