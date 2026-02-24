/**
 * EditorPage - Page Object Model for the Mirror Editor
 *
 * Encapsulates all editor interactions for reliable E2E testing.
 */

import { Page, Locator, expect } from '@playwright/test'

const BASE_URL = 'http://localhost:5173/mirror/app/'

export class EditorPage {
  readonly page: Page

  // Locators
  readonly container: Locator
  readonly codemirror: Locator
  readonly tablist: Locator

  constructor(page: Page) {
    this.page = page
    this.container = page.getByTestId('editor-panel')
    this.codemirror = page.locator('.cm-content[contenteditable="true"]')
    this.tablist = page.getByTestId('editor-tablist')
  }

  /**
   * Navigate to the app and set up a clean project state.
   */
  async setup() {
    await this.page.goto(BASE_URL)
    await this.page.evaluate(() => {
      localStorage.setItem('mirror-project', JSON.stringify({
        pages: [{ id: 'main', name: 'Main', layoutCode: '' }],
        currentPageId: 'main',
        componentsCode: '',
        tokensCode: '',
        dataCode: ''
      }))
    })
    await this.page.reload()
    await this.codemirror.waitFor()
    // Wait for test helper to be available
    await this.page.waitForFunction(
      () => (window as any).__mirrorTestHelper?.setLayoutCode,
      { timeout: 5000 }
    )
  }

  /**
   * Set code directly via the test helper (fast, no typing).
   */
  async setCode(code: string) {
    await this.page.evaluate((layoutCode) => {
      const helper = (window as any).__mirrorTestHelper
      if (helper) {
        helper.setLayoutCode(layoutCode)
      }
    }, code)
  }

  /**
   * Set components code via the test helper.
   */
  async setComponentsCode(code: string) {
    await this.page.evaluate((componentsCode) => {
      const helper = (window as any).__mirrorTestHelper
      if (helper) {
        helper.setComponentsCode(componentsCode)
      }
    }, code)
  }

  /**
   * Set tokens code via the test helper.
   */
  async setTokensCode(code: string) {
    await this.page.evaluate((tokensCode) => {
      const helper = (window as any).__mirrorTestHelper
      if (helper) {
        helper.setTokensCode(tokensCode)
      }
    }, code)
  }

  /**
   * Type code into the editor (simulates real user typing).
   */
  async typeCode(code: string) {
    await this.codemirror.click()
    await this.page.keyboard.press('Meta+a')
    await this.page.keyboard.insertText(code)
  }

  /**
   * Clear the editor content.
   */
  async clear() {
    await this.codemirror.click()
    await this.page.keyboard.press('Meta+a')
    await this.page.keyboard.press('Backspace')
  }

  /**
   * Get a specific tab button.
   */
  tab(name: 'pages' | 'components' | 'tokens' | 'data') {
    return this.page.getByTestId(`editor-tab-${name}`)
  }

  /**
   * Switch to a specific editor tab.
   */
  async switchTab(name: 'pages' | 'components' | 'tokens' | 'data') {
    await this.tab(name).click()
    await expect(this.tab(name)).toHaveAttribute('aria-selected', 'true')
  }

  /**
   * Assert that the editor contains specific text.
   */
  async expectCodeContains(text: string) {
    await expect(this.codemirror).toContainText(text)
  }

  /**
   * Trigger undo action.
   */
  async undo() {
    await this.page.keyboard.press('Meta+z')
  }

  /**
   * Trigger redo action.
   */
  async redo() {
    await this.page.keyboard.press('Meta+Shift+z')
  }

  /**
   * Focus the editor.
   */
  async focus() {
    await this.codemirror.click()
  }
}
