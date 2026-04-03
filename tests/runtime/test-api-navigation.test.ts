/**
 * Test API Navigation Module Tests
 *
 * Tests for navigation control and view switching functionality.
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createNavigationAPI, resetNavigationHistory } from '../../compiler/runtime/test-api/navigation'
import type { RuntimeFunctions, MirrorElement } from '../../compiler/runtime/test-api/types'

// Mock runtime functions
const mockRuntime: RuntimeFunctions = {
  transitionTo: vi.fn(),
  stateMachineToggle: vi.fn(),
  exclusiveTransition: vi.fn(),
  navigate: vi.fn(),
  navigateToPage: vi.fn(),
  getPageContainer: vi.fn(),
}

describe('Test API - Navigation Module', () => {
  let api: ReturnType<typeof createNavigationAPI>

  beforeEach(() => {
    vi.clearAllMocks()
    resetNavigationHistory()
    api = createNavigationAPI(mockRuntime)
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
    resetNavigationHistory()
  })

  describe('API Interface', () => {
    it('should have all navigation action methods', () => {
      expect(typeof api.navigate).toBe('function')
      expect(typeof api.navigateToPage).toBe('function')
      expect(typeof api.goBack).toBe('function')
      expect(typeof api.goForward).toBe('function')
    })

    it('should have all navigation state methods', () => {
      expect(typeof api.getCurrentPage).toBe('function')
      expect(typeof api.getNavigationHistory).toBe('function')
      expect(typeof api.getNavigationState).toBe('function')
      expect(typeof api.getPageContainer).toBe('function')
    })

    it('should have all view switching methods', () => {
      expect(typeof api.showView).toBe('function')
      expect(typeof api.hideView).toBe('function')
      expect(typeof api.switchToView).toBe('function')
      expect(typeof api.getActiveView).toBe('function')
      expect(typeof api.getAllViews).toBe('function')
      expect(typeof api.getViewByName).toBe('function')
    })

    it('should have async helper methods', () => {
      expect(typeof api.waitForNavigation).toBe('function')
      expect(typeof api.waitForViewChange).toBe('function')
    })
  })

  describe('Navigation Actions', () => {
    it('navigate() should call runtime.navigate', () => {
      api.navigate('Home')
      expect(mockRuntime.navigate).toHaveBeenCalledWith('Home', null)
    })

    it('navigate() should not throw for empty target', () => {
      expect(() => api.navigate('')).not.toThrow()
      expect(mockRuntime.navigate).not.toHaveBeenCalled()
    })

    it('navigateToPage() should call runtime and track history', async () => {
      await api.navigateToPage('about')
      expect(mockRuntime.navigateToPage).toHaveBeenCalledWith('about', null)
      expect(api.getNavigationHistory()).toContain('about')
    })

    it('navigateToPage() should update current page', async () => {
      await api.navigateToPage('home')
      expect(api.getCurrentPage()).toBe('home')
    })

    it('goBack() should navigate to previous page', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')
      vi.clearAllMocks()

      api.goBack()
      expect(mockRuntime.navigateToPage).toHaveBeenCalledWith('page1', null)
    })

    it('goBack() should not navigate if at start', async () => {
      await api.navigateToPage('page1')
      vi.clearAllMocks()

      api.goBack()
      expect(mockRuntime.navigateToPage).not.toHaveBeenCalled()
    })

    it('goForward() should navigate to next page', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')
      api.goBack()
      vi.clearAllMocks()

      api.goForward()
      expect(mockRuntime.navigateToPage).toHaveBeenCalledWith('page2', null)
    })

    it('goForward() should not navigate if at end', async () => {
      await api.navigateToPage('page1')
      vi.clearAllMocks()

      api.goForward()
      expect(mockRuntime.navigateToPage).not.toHaveBeenCalled()
    })
  })

  describe('Navigation History', () => {
    it('getCurrentPage() should return null initially', () => {
      expect(api.getCurrentPage()).toBeNull()
    })

    it('getNavigationHistory() should return empty array initially', () => {
      expect(api.getNavigationHistory()).toEqual([])
    })

    it('history should track multiple navigations', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')
      await api.navigateToPage('page3')

      expect(api.getNavigationHistory()).toEqual(['page1', 'page2', 'page3'])
    })

    it('navigating after going back should clear forward history', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')
      await api.navigateToPage('page3')

      api.goBack()
      api.goBack()
      await api.navigateToPage('newpage')

      expect(api.getNavigationHistory()).toEqual(['page1', 'newpage'])
    })

    it('getNavigationState() should return complete state', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')

      const state = api.getNavigationState()
      expect(state.currentPage).toBe('page2')
      expect(state.history).toEqual(['page1', 'page2'])
      expect(state.canGoBack).toBe(true)
      expect(state.canGoForward).toBe(false)
    })

    it('getNavigationState().canGoBack should be false at start', async () => {
      await api.navigateToPage('page1')
      const state = api.getNavigationState()
      expect(state.canGoBack).toBe(false)
    })

    it('getNavigationState().canGoForward should be true after goBack', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')
      api.goBack()

      const state = api.getNavigationState()
      expect(state.canGoForward).toBe(true)
    })
  })

  describe('Page Container', () => {
    it('getPageContainer() should use runtime function if available', () => {
      const mockContainer = document.createElement('div')
      ;(mockRuntime.getPageContainer as any).mockReturnValue(mockContainer)

      const result = api.getPageContainer()
      expect(result).toBe(mockContainer)
    })

    it('getPageContainer() should find [data-page-container] element', () => {
      ;(mockRuntime.getPageContainer as any).mockReturnValue(null)

      const container = document.createElement('div')
      container.setAttribute('data-page-container', 'true')
      document.body.appendChild(container)

      const result = api.getPageContainer()
      expect(result).toBe(container)
    })

    it('getPageContainer() should find PageContent instance', () => {
      ;(mockRuntime.getPageContainer as any).mockReturnValue(null)

      const container = document.createElement('div')
      container.setAttribute('data-instance-name', 'PageContent')
      document.body.appendChild(container)

      const result = api.getPageContainer()
      expect(result).toBe(container)
    })

    it('getPageContainer() should find Content instance', () => {
      ;(mockRuntime.getPageContainer as any).mockReturnValue(null)

      const container = document.createElement('div')
      container.setAttribute('data-instance-name', 'Content')
      document.body.appendChild(container)

      const result = api.getPageContainer()
      expect(result).toBe(container)
    })
  })

  describe('View Switching', () => {
    function createView(name: string, visible = true): HTMLElement {
      const view = document.createElement('div')
      view.dataset.component = name
      if (!visible) {
        view.style.display = 'none'
        view.hidden = true
      }
      document.body.appendChild(view)
      return view
    }

    it('showView() should make view visible', () => {
      const view = createView('HomeView', false) as MirrorElement
      api.showView(view)

      expect(view.style.display).toBe('')
      expect(view.hidden).toBe(false)
    })

    it('showView() should not throw for null', () => {
      expect(() => api.showView(null as any)).not.toThrow()
    })

    it('hideView() should hide view', () => {
      const view = createView('HomeView') as MirrorElement
      api.hideView(view)

      expect(view.style.display).toBe('none')
      expect(view.hidden).toBe(true)
    })

    it('hideView() should not throw for null', () => {
      expect(() => api.hideView(null as any)).not.toThrow()
    })

    it('switchToView() should show target and hide siblings', () => {
      const container = document.createElement('div')
      const view1 = document.createElement('div')
      view1.dataset.component = 'View1'
      const view2 = document.createElement('div')
      view2.dataset.component = 'View2'
      const view3 = document.createElement('div')
      view3.dataset.component = 'View3'

      container.appendChild(view1)
      container.appendChild(view2)
      container.appendChild(view3)
      document.body.appendChild(container)

      api.switchToView(view2 as MirrorElement)

      expect(view1.style.display).toBe('none')
      expect(view2.style.display).toBe('')
      expect(view3.style.display).toBe('none')
    })

    it('switchToView() should not throw for null', () => {
      expect(() => api.switchToView(null as any)).not.toThrow()
    })

    it('getActiveView() should return visible view', () => {
      createView('View1', false)
      const view2 = createView('View2', true)
      createView('View3', false)

      const active = api.getActiveView()
      expect(active).toBe(view2)
    })

    it('getActiveView() should return null if all hidden', () => {
      createView('View1', false)
      createView('View2', false)

      const active = api.getActiveView()
      expect(active).toBeNull()
    })

    it('getActiveView() with container should search only in container', () => {
      const container = document.createElement('div')
      const view1 = document.createElement('div')
      view1.dataset.component = 'ContainerView'
      container.appendChild(view1)
      document.body.appendChild(container)

      // Create another view outside container
      createView('OutsideView', true)

      const active = api.getActiveView(container as MirrorElement)
      expect(active).toBe(view1)
    })

    it('getAllViews() should return all views', () => {
      createView('View1')
      createView('View2')
      createView('View3')

      const views = api.getAllViews()
      expect(views).toHaveLength(3)
    })

    it('getAllViews() with container should return only container views', () => {
      const container = document.createElement('div')
      const view1 = document.createElement('div')
      view1.dataset.component = 'ContainerView'
      container.appendChild(view1)
      document.body.appendChild(container)

      createView('OutsideView')

      const views = api.getAllViews(container as MirrorElement)
      expect(views).toHaveLength(1)
      expect(views[0]).toBe(view1)
    })

    it('getViewByName() should find view by component name', () => {
      const view1 = createView('HomeView')
      createView('AboutView')

      const found = api.getViewByName('HomeView')
      expect(found).toBe(view1)
    })

    it('getViewByName() should return null for unknown name', () => {
      createView('HomeView')

      const found = api.getViewByName('UnknownView')
      expect(found).toBeNull()
    })
  })

  describe('Async Helpers', () => {
    it('waitForNavigation() should resolve immediately if already on page', async () => {
      await api.navigateToPage('target-page')

      const start = Date.now()
      const result = await api.waitForNavigation('target-page', 1000)
      const elapsed = Date.now() - start

      expect(result).toBe(true)
      expect(elapsed).toBeLessThan(50)
    })

    it('waitForNavigation() should timeout if page not reached', async () => {
      const result = await api.waitForNavigation('unknown-page', 100)
      expect(result).toBe(false)
    })

    it('waitForNavigation() should resolve when page changes', async () => {
      // Start waiting for the page
      const waitPromise = api.waitForNavigation('delayed-page', 500)

      // Navigate after a delay
      setTimeout(() => {
        api.navigateToPage('delayed-page')
      }, 50)

      const result = await waitPromise
      expect(result).toBe(true)
    })

    it('waitForViewChange() should resolve immediately if view is visible', async () => {
      const view = document.createElement('div')
      view.dataset.component = 'TestView'
      document.body.appendChild(view)

      const start = Date.now()
      const result = await api.waitForViewChange(view as MirrorElement, 1000)
      const elapsed = Date.now() - start

      expect(result).toBe(true)
      expect(elapsed).toBeLessThan(50)
    })

    it('waitForViewChange() should return false for null view', async () => {
      const result = await api.waitForViewChange(null as any, 100)
      expect(result).toBe(false)
    })

    it('waitForViewChange() should timeout if view stays hidden', async () => {
      const view = document.createElement('div')
      view.dataset.component = 'TestView'
      view.style.display = 'none'
      document.body.appendChild(view)

      const result = await api.waitForViewChange(view as MirrorElement, 100)
      expect(result).toBe(false)
    })

    it('waitForViewChange() should resolve when view becomes visible', async () => {
      const view = document.createElement('div')
      view.dataset.component = 'TestView'
      view.style.display = 'none'
      document.body.appendChild(view)

      // Make visible after delay
      setTimeout(() => {
        view.style.display = ''
      }, 50)

      const result = await api.waitForViewChange(view as MirrorElement, 500)
      expect(result).toBe(true)
    })
  })

  describe('Reset Function', () => {
    it('resetNavigationHistory() should clear history', async () => {
      await api.navigateToPage('page1')
      await api.navigateToPage('page2')

      resetNavigationHistory()
      api = createNavigationAPI(mockRuntime)

      expect(api.getNavigationHistory()).toEqual([])
      expect(api.getCurrentPage()).toBeNull()
    })
  })
})
