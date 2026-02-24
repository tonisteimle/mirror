/**
 * Playwright Test Fixtures
 *
 * Provides pre-configured page objects for all tests.
 * Usage: import { test, expect } from '../fixtures'
 */

import { test as base } from '@playwright/test'
import { EditorPage, PreviewPage, HeaderPage, SidebarPage, PropertyPanelPage } from '../pages'

/**
 * Extended test type with page objects.
 */
export const test = base.extend<{
  editorPage: EditorPage
  previewPage: PreviewPage
  headerPage: HeaderPage
  sidebarPage: SidebarPage
  propertyPanelPage: PropertyPanelPage
}>({
  editorPage: async ({ page }, use) => {
    const editorPage = new EditorPage(page)
    await editorPage.setup()
    await use(editorPage)
  },

  previewPage: async ({ page }, use) => {
    await use(new PreviewPage(page))
  },

  headerPage: async ({ page }, use) => {
    await use(new HeaderPage(page))
  },

  sidebarPage: async ({ page }, use) => {
    await use(new SidebarPage(page))
  },

  propertyPanelPage: async ({ page }, use) => {
    await use(new PropertyPanelPage(page))
  },
})

export { expect } from '@playwright/test'

/**
 * Test data generators for deterministic tests.
 */
export const testData = {
  /**
   * Generate a simple button code.
   */
  button: (label: string) => `Button "${label}"`,

  /**
   * Generate a card with title and content.
   */
  card: (title: string, content: string) => `Card
  Title "${title}"
  Text "${content}"`,

  /**
   * Generate a list of items.
   */
  list: (items: string[]) => items.map(item => `- Item "${item}"`).join('\n'),

  /**
   * Generate a simple form.
   */
  form: () => `Box ver, gap 16
  Input "Name"
  Input "Email"
  Button "Submit"`,

  /**
   * Generate tokens.
   */
  tokens: (values: Record<string, string>) =>
    Object.entries(values).map(([name, value]) => `$${name}: ${value}`).join('\n'),
}
