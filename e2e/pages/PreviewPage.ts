/**
 * PreviewPage - Page Object Model for the Mirror Preview Panel
 *
 * Encapsulates all preview assertions and interactions.
 */

import { Page, Locator, expect } from '@playwright/test'

export class PreviewPage {
  readonly page: Page
  readonly container: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.getByTestId('preview-container')
  }

  /**
   * Wait for the preview to render content.
   */
  async waitForRender() {
    await this.page.waitForFunction(() => {
      const preview = document.querySelector('[data-testid="preview-container"]')
      return preview && preview.children.length > 0
    }, { timeout: 5000 })
  }

  /**
   * Get a component by role and optional name.
   */
  getComponent(role: string, name?: string) {
    return name
      ? this.container.getByRole(role as any, { name })
      : this.container.getByRole(role as any)
  }

  /**
   * Get an element by text content.
   */
  getText(text: string) {
    return this.container.getByText(text)
  }

  /**
   * Assert that a button with the given name is visible.
   */
  async expectButton(name: string) {
    await expect(this.getComponent('button', name)).toBeVisible()
  }

  /**
   * Assert that specific text is visible in the preview.
   */
  async expectText(text: string) {
    await expect(this.getText(text)).toBeVisible()
  }

  /**
   * Assert that text is NOT visible in the preview.
   */
  async expectNoText(text: string) {
    await expect(this.getText(text)).not.toBeVisible()
  }

  /**
   * Assert that a heading with the given text is visible.
   */
  async expectHeading(text: string) {
    await expect(this.container.getByRole('heading', { name: text })).toBeVisible()
  }

  /**
   * Click a component by role and optional name.
   */
  async clickComponent(role: string, name?: string) {
    await this.getComponent(role, name).click()
  }

  /**
   * Click a button with the given name.
   */
  async clickButton(name: string) {
    await this.getComponent('button', name).click()
  }

  /**
   * Assert that a certain number of components with the given role exist.
   */
  async expectComponentCount(role: string, count: number) {
    await expect(this.container.getByRole(role as any)).toHaveCount(count)
  }

  /**
   * Assert that the preview container is visible.
   */
  async expectVisible() {
    await expect(this.container).toBeVisible()
  }

  /**
   * Assert that a component has specific CSS.
   */
  async expectComponentCSS(role: string, name: string | undefined, css: Record<string, string>) {
    const component = this.getComponent(role, name)
    for (const [prop, value] of Object.entries(css)) {
      await expect(component).toHaveCSS(prop, value)
    }
  }

  /**
   * Get all elements matching a role.
   */
  getAllByRole(role: string) {
    return this.container.getByRole(role as any)
  }
}
