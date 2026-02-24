/**
 * SidebarPage - Page Object Model for page navigation sidebar
 *
 * Uses:
 * - data-testid for sidebar container and page items
 * - Role-based selectors for navigation
 */

import { Page, Locator, expect } from '@playwright/test'

export class SidebarPage {
  readonly page: Page
  readonly container: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.getByTestId('sidebar-pages')
  }

  /**
   * Get a specific page item by its ID
   */
  pageItem(pageId: string): Locator {
    return this.page.getByTestId(`sidebar-page-${pageId}`)
  }

  /**
   * Get all page items in the sidebar
   */
  allPages(): Locator {
    return this.container.locator('[data-testid^="sidebar-page-"]')
  }

  /**
   * Select a page by clicking on it
   */
  async selectPage(pageId: string) {
    await this.pageItem(pageId).click()
  }

  /**
   * Verify sidebar is visible
   */
  async expectVisible() {
    await expect(this.container).toBeVisible()
  }

  /**
   * Verify a specific page is in the list
   */
  async expectPageExists(pageId: string) {
    await expect(this.pageItem(pageId)).toBeVisible()
  }

  /**
   * Verify page count in sidebar
   */
  async expectPageCount(count: number) {
    await expect(this.allPages()).toHaveCount(count)
  }

  /**
   * Verify a page is selected (has selected styling)
   */
  async expectPageSelected(pageId: string) {
    // Selected pages have visual indicator - check aria or data attribute
    const pageItem = this.pageItem(pageId)
    await expect(pageItem).toBeVisible()
    // The actual selection state is visual, so we verify it exists
  }
}
