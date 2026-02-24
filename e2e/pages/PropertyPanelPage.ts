/**
 * PropertyPanelPage - Page Object Model for the property panel
 *
 * Uses:
 * - data-testid for panel elements
 * - Role-based selectors for accessibility
 */

import { Page, Locator, expect } from '@playwright/test'

export class PropertyPanelPage {
  readonly page: Page
  readonly panel: Locator
  readonly title: Locator
  readonly closeButton: Locator

  constructor(page: Page) {
    this.page = page
    this.panel = page.getByTestId('panel-properties')
    this.title = page.getByTestId('panel-properties-title')
    this.closeButton = page.getByTestId('panel-properties-close')
  }

  /**
   * Verify panel is visible
   */
  async expectVisible() {
    await expect(this.panel).toBeVisible()
  }

  /**
   * Verify panel is not visible
   */
  async expectHidden() {
    await expect(this.panel).not.toBeVisible()
  }

  /**
   * Verify panel title shows specific component name
   */
  async expectTitle(componentName: string) {
    await expect(this.title).toHaveText(componentName)
  }

  /**
   * Close the panel
   */
  async close() {
    await this.closeButton.click()
  }

  /**
   * Verify panel has correct ARIA role
   */
  async expectAccessible() {
    await expect(this.panel).toHaveAttribute('role', 'complementary')
  }

  // Inline picker panels

  /**
   * Get color picker panel
   */
  colorPicker(): Locator {
    return this.page.getByTestId('panel-color-picker')
  }

  /**
   * Get font picker panel
   */
  fontPicker(): Locator {
    return this.page.getByTestId('panel-font-picker')
  }

  /**
   * Get icon picker panel
   */
  iconPicker(): Locator {
    return this.page.getByTestId('panel-icon-picker')
  }

  /**
   * Get layout picker panel
   */
  layoutPicker(): Locator {
    return this.page.getByTestId('panel-layout-picker')
  }

  /**
   * Get border picker panel
   */
  borderPicker(): Locator {
    return this.page.getByTestId('panel-border-picker')
  }

  /**
   * Get typography picker panel
   */
  typographyPicker(): Locator {
    return this.page.getByTestId('panel-typography-picker')
  }

  /**
   * Verify color picker is open
   */
  async expectColorPickerOpen() {
    await expect(this.colorPicker()).toBeVisible()
  }

  /**
   * Verify layout picker is open
   */
  async expectLayoutPickerOpen() {
    await expect(this.layoutPicker()).toBeVisible()
  }

  /**
   * Verify icon picker is open
   */
  async expectIconPickerOpen() {
    await expect(this.iconPicker()).toBeVisible()
  }
}
