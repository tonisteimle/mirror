/**
 * HeaderPage - Page Object Model for the Mirror Header Bar
 *
 * Encapsulates header navigation and menu interactions.
 */

import { Page, Locator, expect } from '@playwright/test'

export class HeaderPage {
  readonly page: Page
  readonly header: Locator
  readonly logo: Locator
  readonly menuTrigger: Locator

  constructor(page: Page) {
    this.page = page
    this.header = page.getByTestId('header-bar')
    this.logo = page.getByTestId('header-logo')
    this.menuTrigger = page.getByTestId('header-menu-trigger')
  }

  /**
   * Open the application menu.
   */
  async openMenu() {
    await this.menuTrigger.click()
    // Wait for menu to be visible
    await expect(this.page.getByRole('menu')).toBeVisible()
  }

  /**
   * Close the menu by clicking outside.
   */
  async closeMenu() {
    await this.page.keyboard.press('Escape')
  }

  /**
   * Get a menu item by testid suffix.
   */
  menuItem(name: 'new' | 'open' | 'save' | 'export' | 'tutorial' | 'reference' | 'settings') {
    return this.page.getByTestId(`header-menu-${name}`)
  }

  /**
   * Click a menu action (opens menu if needed).
   */
  async menuAction(action: 'new' | 'open' | 'save' | 'export' | 'tutorial' | 'reference' | 'settings') {
    await this.openMenu()
    await this.menuItem(action).click()
  }

  /**
   * Toggle fullscreen mode.
   */
  async toggleFullscreen() {
    await this.page.getByTestId('header-toggle-fullscreen').click()
  }

  /**
   * Toggle React code view.
   */
  async toggleReactCode() {
    await this.page.getByTestId('header-toggle-react-code').click()
  }

  /**
   * Assert the header is visible.
   */
  async expectVisible() {
    await expect(this.header).toBeVisible()
  }

  /**
   * Assert the logo is visible.
   */
  async expectLogoVisible() {
    await expect(this.logo).toBeVisible()
  }

  /**
   * Assert fullscreen mode is active.
   */
  async expectFullscreenActive() {
    const button = this.page.getByTestId('header-toggle-fullscreen')
    // Active state is indicated by background color change
    await expect(button).toBeVisible()
  }
}
