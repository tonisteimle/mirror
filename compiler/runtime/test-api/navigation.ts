/**
 * Navigation Test API Module
 *
 * Provides navigation control and inspection for testing.
 * Includes page navigation, view switching, and history tracking.
 */

import type { RuntimeFunctions, MirrorElement, NavigationTestAPI, NavigationState } from './types'

// ============================================
// NAVIGATION STATE TRACKING
// ============================================

// Track navigation history for testing
let navigationHistory: string[] = []
let currentHistoryIndex = -1

/**
 * Reset navigation history (for test cleanup)
 */
export function resetNavigationHistory(): void {
  navigationHistory = []
  currentHistoryIndex = -1
}

/**
 * Add page to navigation history
 */
function addToHistory(pageName: string): void {
  // Remove forward history if we're not at the end
  if (currentHistoryIndex < navigationHistory.length - 1) {
    navigationHistory = navigationHistory.slice(0, currentHistoryIndex + 1)
  }
  navigationHistory.push(pageName)
  currentHistoryIndex = navigationHistory.length - 1
}

// ============================================
// CREATE NAVIGATION API
// ============================================

/**
 * Create Navigation API module
 *
 * @param runtime - Reference to runtime functions
 * @returns Navigation API object
 */
export function createNavigationAPI(runtime: RuntimeFunctions): NavigationTestAPI {
  return {
    // ========================================
    // NAVIGATION ACTIONS
    // ========================================

    /**
     * Navigate to a component target (single-page routing)
     * Targets with PascalCase names switch component visibility
     */
    navigate(target: string): void {
      if (!target) return
      runtime.navigate?.(target, null)
    },

    /**
     * Navigate to a page (load .mirror file)
     * Returns a promise that resolves when page is loaded
     */
    async navigateToPage(pageName: string): Promise<void> {
      if (!pageName) return

      addToHistory(pageName)

      // Use runtime function if available
      if (runtime.navigateToPage) {
        runtime.navigateToPage(pageName, null)
        // Give time for page to render
        await new Promise(resolve => setTimeout(resolve, 50))
      }
    },

    /**
     * Go back in navigation history
     */
    goBack(): void {
      if (currentHistoryIndex <= 0) return

      currentHistoryIndex--
      const previousPage = navigationHistory[currentHistoryIndex]
      if (previousPage && runtime.navigateToPage) {
        runtime.navigateToPage(previousPage, null)
      }
    },

    /**
     * Go forward in navigation history
     */
    goForward(): void {
      if (currentHistoryIndex >= navigationHistory.length - 1) return

      currentHistoryIndex++
      const nextPage = navigationHistory[currentHistoryIndex]
      if (nextPage && runtime.navigateToPage) {
        runtime.navigateToPage(nextPage, null)
      }
    },

    // ========================================
    // NAVIGATION STATE
    // ========================================

    /**
     * Get the current page name
     */
    getCurrentPage(): string | null {
      if (currentHistoryIndex >= 0 && currentHistoryIndex < navigationHistory.length) {
        return navigationHistory[currentHistoryIndex]
      }
      return null
    },

    /**
     * Get full navigation history
     */
    getNavigationHistory(): string[] {
      return [...navigationHistory]
    },

    /**
     * Get complete navigation state
     */
    getNavigationState(): NavigationState {
      return {
        currentPage: this.getCurrentPage(),
        history: this.getNavigationHistory(),
        canGoBack: currentHistoryIndex > 0,
        canGoForward: currentHistoryIndex < navigationHistory.length - 1,
      }
    },

    /**
     * Get the page container element
     */
    getPageContainer(): MirrorElement | null {
      if (typeof document === 'undefined') return null

      // Use runtime function if available and returns non-null
      if (runtime.getPageContainer) {
        const runtimeContainer = runtime.getPageContainer()
        if (runtimeContainer) return runtimeContainer
      }

      // Fallback: find container manually
      let container = document.querySelector('[data-page-container]') as MirrorElement | null
      if (container) return container

      container = document.querySelector(
        '[data-instance-name="PageContent"]'
      ) as MirrorElement | null
      if (container) return container

      container = document.querySelector('[data-instance-name="Content"]') as MirrorElement | null
      if (container) return container

      return null
    },

    // ========================================
    // VIEW SWITCHING
    // ========================================

    /**
     * Show a view element
     */
    showView(view: MirrorElement): void {
      if (!view) return
      view.style.display = ''
      view.hidden = false
    },

    /**
     * Hide a view element
     */
    hideView(view: MirrorElement): void {
      if (!view) return
      view.style.display = 'none'
      view.hidden = true
    },

    /**
     * Switch to a specific view, hiding all siblings with data-component
     */
    switchToView(view: MirrorElement): void {
      if (!view) return

      const parent = view.parentElement
      if (!parent) return

      // Hide all sibling views
      Array.from(parent.children).forEach(sibling => {
        const siblingEl = sibling as MirrorElement
        if (siblingEl.dataset?.component) {
          if (sibling === view) {
            siblingEl.style.display = ''
            siblingEl.hidden = false
          } else {
            siblingEl.style.display = 'none'
            siblingEl.hidden = true
          }
        }
      })
    },

    /**
     * Get the currently active (visible) view in a container
     */
    getActiveView(container?: MirrorElement): MirrorElement | null {
      const searchContainer = container || this.getPageContainer()?.parentElement
      if (!searchContainer) {
        if (typeof document === 'undefined') return null
        // Search globally for visible component
        const views = document.querySelectorAll('[data-component]') as NodeListOf<MirrorElement>
        for (const view of views) {
          if (this.isViewVisible(view)) {
            return view
          }
        }
        return null
      }

      const views = searchContainer.querySelectorAll(
        '[data-component]'
      ) as NodeListOf<MirrorElement>
      for (const view of views) {
        if (this.isViewVisible(view)) {
          return view
        }
      }
      return null
    },

    /**
     * Get all views in a container
     */
    getAllViews(container?: MirrorElement): MirrorElement[] {
      const searchContainer = container || (typeof document !== 'undefined' ? document.body : null)
      if (!searchContainer) return []

      return Array.from(
        searchContainer.querySelectorAll('[data-component]') as NodeListOf<MirrorElement>
      )
    },

    /**
     * Get a view by its component name
     */
    getViewByName(name: string): MirrorElement | null {
      if (typeof document === 'undefined') return null
      return document.querySelector(`[data-component="${name}"]`) as MirrorElement | null
    },

    // ========================================
    // ASYNC HELPERS
    // ========================================

    /**
     * Wait for navigation to a specific page
     */
    async waitForNavigation(pageName: string, timeout: number = 1000): Promise<boolean> {
      const startTime = Date.now()
      return new Promise(resolve => {
        const check = () => {
          if (this.getCurrentPage() === pageName) return resolve(true)
          if (Date.now() - startTime >= timeout) return resolve(false)
          setTimeout(check, 16)
        }
        check()
      })
    },

    /**
     * Wait for a view to become visible
     */
    async waitForViewChange(view: MirrorElement, timeout: number = 1000): Promise<boolean> {
      if (!view) return false
      const startTime = Date.now()
      return new Promise(resolve => {
        const check = () => {
          if (this.isViewVisible(view)) return resolve(true)
          if (Date.now() - startTime >= timeout) return resolve(false)
          setTimeout(check, 16)
        }

        check()
      })
    },

    // ========================================
    // INTERNAL HELPERS
    // ========================================

    /**
     * Check if a view is visible (internal helper)
     */
    isViewVisible(view: MirrorElement): boolean {
      if (!view) return false
      if (typeof window === 'undefined') return false

      const style = window.getComputedStyle(view)
      return style.display !== 'none' && !view.hidden
    },
  } as NavigationTestAPI & { isViewVisible: (view: MirrorElement) => boolean }
}
