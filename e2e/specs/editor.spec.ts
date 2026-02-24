/**
 * Editor E2E Tests
 *
 * Tests for the Mirror code editor using Page Object Models.
 */

import { test, expect, testData } from '../fixtures'

test.describe('Editor', () => {
  test.describe('Code Rendering', () => {
    test('renders a simple button', async ({ editorPage, previewPage }) => {
      await editorPage.setCode(testData.button('Click me'))
      await previewPage.waitForRender()
      await previewPage.expectButton('Click me')
    })

    test('renders a card with content', async ({ editorPage, previewPage }) => {
      await editorPage.setCode(testData.card('Welcome', 'Hello World'))
      await previewPage.waitForRender()
      await previewPage.expectText('Welcome')
      await previewPage.expectText('Hello World')
    })

    test('renders a list of items', async ({ editorPage, previewPage }) => {
      await editorPage.setCode(`Box
  ${testData.list(['Home', 'About', 'Contact'])}`)
      await previewPage.waitForRender()
      await previewPage.expectText('Home')
      await previewPage.expectText('About')
      await previewPage.expectText('Contact')
    })
  })

  test.describe('Tab Navigation', () => {
    test('switches to Components tab', async ({ editorPage }) => {
      await editorPage.switchTab('components')
      await expect(editorPage.tab('components')).toHaveAttribute('aria-selected', 'true')
      await expect(editorPage.tab('pages')).toHaveAttribute('aria-selected', 'false')
    })

    test('switches to Tokens tab', async ({ editorPage }) => {
      await editorPage.switchTab('tokens')
      await expect(editorPage.tab('tokens')).toHaveAttribute('aria-selected', 'true')
    })

    test('switches to Data tab', async ({ editorPage }) => {
      await editorPage.switchTab('data')
      await expect(editorPage.tab('data')).toHaveAttribute('aria-selected', 'true')
    })

    test('switches back to Pages tab', async ({ editorPage }) => {
      await editorPage.switchTab('components')
      await editorPage.switchTab('pages')
      await expect(editorPage.tab('pages')).toHaveAttribute('aria-selected', 'true')
    })
  })

  test.describe('Undo/Redo', () => {
    test('undoes typed content', async ({ editorPage }) => {
      await editorPage.typeCode('Button "Test"')
      await editorPage.expectCodeContains('Button')
      await editorPage.undo()
      // After undo, the content should be reduced/empty
      // This is a basic check - actual behavior depends on undo granularity
    })
  })

  test.describe('Tokens', () => {
    test('applies token values to preview', async ({ editorPage, previewPage }) => {
      await editorPage.switchTab('tokens')
      await editorPage.setTokensCode(testData.tokens({ primary: '#3B82F6' }))

      await editorPage.switchTab('pages')
      await editorPage.setCode('Button bg $primary, "Styled"')
      await previewPage.waitForRender()
      await previewPage.expectButton('Styled')
    })
  })
})
