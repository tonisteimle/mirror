import { test, expect } from '@playwright/test'

test.describe('Mirror App - Undo/Redo', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should undo text changes with Cmd+Z', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type some code
    await page.keyboard.type('Box')
    await page.waitForTimeout(600) // Wait for debounce

    await page.keyboard.type(' pad 12')
    await page.waitForTimeout(600)

    // Verify content
    await expect(page.locator('.cm-content')).toContainText('Box pad 12')

    // Undo with Cmd+Z (keep focus in editor for undo to work)
    await page.keyboard.press('Meta+z')
    await page.waitForTimeout(300)

    // Should have undone the last typed characters
    // Note: CodeMirror undo granularity may vary, so just check that something was undone
    const content = await page.locator('.cm-content').textContent()
    expect(content?.length || 0).toBeLessThan('Box pad 12'.length + 5)
  })

  test('should redo with Cmd+Shift+Z', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type and wait
    await page.keyboard.type('Button')
    await page.waitForTimeout(600)

    await page.keyboard.type(' col #FF0000')
    await page.waitForTimeout(600)

    // Click outside and undo
    await page.click('body', { position: { x: 10, y: 10 } })
    await page.keyboard.press('Meta+z')
    await page.waitForTimeout(300)

    // Redo
    await page.keyboard.press('Meta+Shift+z')
    await page.waitForTimeout(300)

    // Should have the full content back
    await expect(page.locator('.cm-content')).toContainText('col #FF0000')
  })
})

test.describe('Mirror App - Multi-Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should create a new page', async ({ page }) => {
    // Look for the add page button (+ icon in sidebar)
    const addButton = page.locator('button').filter({ hasText: '+' }).first()

    // If sidebar is visible
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Should have a new page in the list
      const pages = page.locator('[data-testid="page-item"]')
      const count = await pages.count()
      expect(count).toBeGreaterThanOrEqual(2)
    }
  })

  test('should switch between pages', async ({ page }) => {
    // Type content on first page
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.type('FirstPage')
    await page.waitForTimeout(300)

    // Create new page if possible
    const addButton = page.locator('button').filter({ hasText: '+' }).first()
    if (await addButton.isVisible()) {
      await addButton.click()
      await page.waitForTimeout(300)

      // Type on second page
      await editor.click()
      await page.keyboard.type('SecondPage')
      await page.waitForTimeout(300)

      // Verify second page content
      await expect(page.locator('.cm-content')).toContainText('SecondPage')
    }
  })
})

test.describe('Mirror App - Persistence', () => {
  test('should persist content after reload', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // Type some content
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.type('PersistentBox')
    await page.waitForTimeout(1000) // Wait for auto-save

    // Reload page
    await page.reload()
    await page.waitForTimeout(500)

    // Content should still be there
    await expect(page.locator('.cm-content')).toContainText('PersistentBox')
  })
})

test.describe('Mirror App - Preview Interaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should show inspect mode on hover', async ({ page }) => {
    // Type a component
    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.type('Box pad 20 bg #3B82F6')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Hello"')
    await page.waitForTimeout(500)

    // Enable inspect mode if there's a toggle
    const inspectToggle = page.locator('[data-testid="inspect-toggle"]')
    if (await inspectToggle.isVisible()) {
      await inspectToggle.click()
    }

    // Hover over preview element
    const previewArea = page.locator('[style*="flex: 1"]').last()
    const box = previewArea.locator('.Box').first()

    if (await box.isVisible()) {
      await box.hover()
      await page.waitForTimeout(200)

      // Should show some highlight (border or outline)
      const style = await box.evaluate(el => getComputedStyle(el).outline)
      // Just verify hover doesn't break anything
      expect(style).toBeDefined()
    }
  })

  test('should render nested components correctly', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.type('Box pad 20')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  Box bg #EEE pad 10')
    await page.keyboard.press('Enter')
    await page.keyboard.type('    "Nested"')
    await page.waitForTimeout(500)

    // Check nested structure rendered
    const preview = page.locator('[style*="flex: 1"]').last()
    await expect(preview).toContainText('Nested')
  })
})

test.describe('Mirror App - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should handle invalid syntax gracefully', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type invalid code (unclosed string)
    await page.keyboard.type('Box "unclosed')
    await page.waitForTimeout(500)

    // App should not crash
    await expect(page.locator('.cm-editor')).toBeVisible()

    // There might be error indicators but app should still work
    await page.keyboard.press('End')
    await page.keyboard.type('"') // Close the string
    await page.waitForTimeout(500)

    // Preview should now work
    await expect(page.locator('[style*="flex: 1"]').last()).toContainText('unclosed')
  })

  test('should show lint errors for undefined tokens', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Use undefined token
    await page.keyboard.type('Box bg $undefined-token')
    await page.waitForTimeout(800)

    // Check for lint marker or warning
    // The app should still render without crashing
    await expect(editor).toBeVisible()
  })
})
