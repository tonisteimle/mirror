/**
 * Test API Visibility Module Tests
 *
 * Tests for visibility control and inspection functionality.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createVisibilityAPI } from '../../compiler/runtime/test-api/visibility'
import type { RuntimeFunctions, MirrorElement } from '../../compiler/runtime/test-api/types'

// Mock runtime functions
const mockRuntime: RuntimeFunctions = {
  transitionTo: vi.fn(),
  stateMachineToggle: vi.fn(),
  exclusiveTransition: vi.fn(),
  show: vi.fn(),
  hide: vi.fn(),
  updateVisibility: vi.fn(),
}

describe('Test API - Visibility Module', () => {
  let api: ReturnType<typeof createVisibilityAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    api = createVisibilityAPI(mockRuntime)
  })

  describe('API Interface', () => {
    it('should have all visibility control methods', () => {
      expect(typeof api.show).toBe('function')
      expect(typeof api.hide).toBe('function')
    })

    it('should have all visibility check methods', () => {
      expect(typeof api.isVisible).toBe('function')
      expect(typeof api.isHidden).toBe('function')
      expect(typeof api.isDisplayNone).toBe('function')
      expect(typeof api.isOpacityZero).toBe('function')
      expect(typeof api.hasHiddenAttribute).toBe('function')
    })

    it('should have getVisibilityState method', () => {
      expect(typeof api.getVisibilityState).toBe('function')
    })

    it('should have async helper methods', () => {
      expect(typeof api.waitForVisible).toBe('function')
      expect(typeof api.waitForHidden).toBe('function')
    })
  })

  describe('Null Safety', () => {
    it('show() should not throw for null element', () => {
      expect(() => api.show(null as any)).not.toThrow()
    })

    it('hide() should not throw for null element', () => {
      expect(() => api.hide(null as any)).not.toThrow()
    })

    it('isVisible() should return false for null element', () => {
      expect(api.isVisible(null as any)).toBe(false)
    })

    it('isHidden() should return true for null element', () => {
      expect(api.isHidden(null as any)).toBe(true)
    })

    it('isDisplayNone() should return true for null element', () => {
      expect(api.isDisplayNone(null as any)).toBe(true)
    })

    it('isOpacityZero() should return true for null element', () => {
      expect(api.isOpacityZero(null as any)).toBe(true)
    })

    it('hasHiddenAttribute() should return true for null element', () => {
      expect(api.hasHiddenAttribute(null as any)).toBe(true)
    })

    it('getVisibilityState() should return hidden state for null element', () => {
      const state = api.getVisibilityState(null as any)
      expect(state.visible).toBe(false)
      expect(state.reason).toBe('hidden')
    })

    it('waitForVisible() should resolve false for null element', async () => {
      const result = await api.waitForVisible(null as any, 100)
      expect(result).toBe(false)
    })

    it('waitForHidden() should resolve true for null element', async () => {
      const result = await api.waitForHidden(null as any, 100)
      expect(result).toBe(true)
    })
  })

  describe('Runtime Integration', () => {
    it('show() should call runtime.show when available', () => {
      const mockElement = {} as MirrorElement
      api.show(mockElement)
      expect(mockRuntime.show).toHaveBeenCalledWith(mockElement)
    })

    it('hide() should call runtime.hide when available', () => {
      const mockElement = {} as MirrorElement
      api.hide(mockElement)
      expect(mockRuntime.hide).toHaveBeenCalledWith(mockElement)
    })
  })

  describe('Visibility State Detection', () => {
    // Create mock element with computed style support
    function createMockElement(options: {
      display?: string
      opacity?: string
      visibility?: string
      hidden?: boolean
    }): MirrorElement {
      const { display = 'flex', opacity = '1', visibility = 'visible', hidden = false } = options

      // Create a real element for getComputedStyle to work
      const el = document.createElement('div')
      el.style.display = display
      el.style.opacity = opacity
      el.style.visibility = visibility
      el.hidden = hidden
      document.body.appendChild(el)

      return el as unknown as MirrorElement
    }

    afterEach(() => {
      // Clean up any appended elements
      document.body.innerHTML = ''
    })

    it('getVisibilityState should detect display:none', () => {
      const el = createMockElement({ display: 'none' })
      const state = api.getVisibilityState(el)

      expect(state.visible).toBe(false)
      expect(state.reason).toBe('display')
      expect(state.display).toBe('none')
    })

    it('getVisibilityState should detect opacity:0', () => {
      const el = createMockElement({ opacity: '0' })
      const state = api.getVisibilityState(el)

      expect(state.visible).toBe(false)
      expect(state.reason).toBe('opacity')
      expect(state.opacity).toBe(0)
    })

    it('getVisibilityState should detect hidden attribute', () => {
      const el = createMockElement({ hidden: true })
      const state = api.getVisibilityState(el)

      // Note: hidden attribute may cause display:none in some browsers
      expect(state.visible).toBe(false)
      expect(state.hidden).toBe(true)
    })

    it('getVisibilityState should detect visibility:hidden', () => {
      const el = createMockElement({ visibility: 'hidden' })
      const state = api.getVisibilityState(el)

      expect(state.visible).toBe(false)
      expect(state.reason).toBe('visibility')
    })

    it('getVisibilityState should detect visible element', () => {
      const el = createMockElement({})
      const state = api.getVisibilityState(el)

      expect(state.visible).toBe(true)
      expect(state.reason).toBe('visible')
    })

    it('isDisplayNone should return true for display:none', () => {
      const el = createMockElement({ display: 'none' })
      expect(api.isDisplayNone(el)).toBe(true)
    })

    it('isDisplayNone should return false for visible element', () => {
      const el = createMockElement({})
      expect(api.isDisplayNone(el)).toBe(false)
    })

    it('isOpacityZero should return true for opacity:0', () => {
      const el = createMockElement({ opacity: '0' })
      expect(api.isOpacityZero(el)).toBe(true)
    })

    it('isOpacityZero should return false for opacity:1', () => {
      const el = createMockElement({ opacity: '1' })
      expect(api.isOpacityZero(el)).toBe(false)
    })

    it('hasHiddenAttribute should return true for hidden element', () => {
      const el = createMockElement({ hidden: true })
      expect(api.hasHiddenAttribute(el)).toBe(true)
    })

    it('hasHiddenAttribute should return false for visible element', () => {
      const el = createMockElement({})
      expect(api.hasHiddenAttribute(el)).toBe(false)
    })

    it('isVisible should return true for visible element', () => {
      const el = createMockElement({})
      expect(api.isVisible(el)).toBe(true)
    })

    it('isVisible should return false for hidden element', () => {
      const el = createMockElement({ display: 'none' })
      expect(api.isVisible(el)).toBe(false)
    })

    it('isHidden should be inverse of isVisible', () => {
      const visibleEl = createMockElement({})
      const hiddenEl = createMockElement({ display: 'none' })

      expect(api.isHidden(visibleEl)).toBe(!api.isVisible(visibleEl))
      expect(api.isHidden(hiddenEl)).toBe(!api.isVisible(hiddenEl))
    })
  })

  describe('Async Helpers', () => {
    it('waitForVisible should resolve immediately for visible element', async () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      const start = Date.now()
      const result = await api.waitForVisible(el as unknown as MirrorElement, 1000)
      const elapsed = Date.now() - start

      expect(result).toBe(true)
      expect(elapsed).toBeLessThan(50) // Should resolve almost immediately
    })

    it('waitForHidden should resolve immediately for hidden element', async () => {
      const el = document.createElement('div')
      el.style.display = 'none'
      document.body.appendChild(el)

      const start = Date.now()
      const result = await api.waitForHidden(el as unknown as MirrorElement, 1000)
      const elapsed = Date.now() - start

      expect(result).toBe(true)
      expect(elapsed).toBeLessThan(50)
    })

    it('waitForVisible should timeout for hidden element', async () => {
      const el = document.createElement('div')
      el.style.display = 'none'
      document.body.appendChild(el)

      const result = await api.waitForVisible(el as unknown as MirrorElement, 100)
      expect(result).toBe(false)
    })

    it('waitForHidden should timeout for visible element', async () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      const result = await api.waitForHidden(el as unknown as MirrorElement, 100)
      expect(result).toBe(false)
    })

    it('waitForVisible should resolve when element becomes visible', async () => {
      const el = document.createElement('div')
      el.style.display = 'none'
      document.body.appendChild(el)

      // Schedule showing the element after 50ms
      setTimeout(() => {
        el.style.display = 'flex'
      }, 50)

      const result = await api.waitForVisible(el as unknown as MirrorElement, 500)
      expect(result).toBe(true)
    })

    it('waitForHidden should resolve when element becomes hidden', async () => {
      const el = document.createElement('div')
      document.body.appendChild(el)

      // Schedule hiding the element after 50ms
      setTimeout(() => {
        el.style.display = 'none'
      }, 50)

      const result = await api.waitForHidden(el as unknown as MirrorElement, 500)
      expect(result).toBe(true)
    })
  })

  describe('Show/Hide Fallback Behavior', () => {
    it('show() should use fallback when runtime.show is not available', () => {
      const apiWithoutRuntime = createVisibilityAPI({
        transitionTo: vi.fn(),
        stateMachineToggle: vi.fn(),
        exclusiveTransition: vi.fn(),
        // No show/hide functions
      })

      const el = document.createElement('div')
      el.style.display = 'none'
      el.hidden = true
      document.body.appendChild(el)

      apiWithoutRuntime.show(el as unknown as MirrorElement)

      expect(el.hidden).toBe(false)
    })

    it('hide() should use fallback when runtime.hide is not available', () => {
      const apiWithoutRuntime = createVisibilityAPI({
        transitionTo: vi.fn(),
        stateMachineToggle: vi.fn(),
        exclusiveTransition: vi.fn(),
        // No show/hide functions
      })

      const el = document.createElement('div')
      document.body.appendChild(el)

      apiWithoutRuntime.hide(el as unknown as MirrorElement)

      expect(el.style.display).toBe('none')
      expect(el.hidden).toBe(true)
    })

    it('hide() should save current display value', () => {
      const apiWithoutRuntime = createVisibilityAPI({
        transitionTo: vi.fn(),
        stateMachineToggle: vi.fn(),
        exclusiveTransition: vi.fn(),
      })

      const el = document.createElement('div') as any
      el.style.display = 'flex'
      document.body.appendChild(el)

      apiWithoutRuntime.hide(el)

      expect(el._savedDisplay).toBe('flex')
    })
  })
})
