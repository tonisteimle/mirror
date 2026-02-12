import { test, expect } from '@playwright/test'

async function setEditorContent(page: any, content: string) {
  const editor = page.locator('.cm-editor')
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Escape')
  await page.waitForTimeout(50)

  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    await page.keyboard.type(lines[i])
    await page.keyboard.press('Escape')
    if (i < lines.length - 1) {
      await page.keyboard.press('Enter')
    }
  }
  await page.waitForTimeout(300)
}

test.describe('Tutorial Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('Button onclick open Dialog center works', async ({ page }) => {
    // Define the dialog component in Components tab
    await page.getByRole('button', { name: 'Components' }).click()
    await setEditorContent(page, `SettingsDialog: pad 20 bg white rad 8
  "Dialog Content"`)

    // Switch to Page tab and add trigger button
    await page.getByRole('button', { name: 'Page' }).click()
    await setEditorContent(page, `Button onclick open SettingsDialog center "Open"`)

    await page.waitForTimeout(500)

    // Find the button in preview
    const preview = page.locator('[style*="flex: 1"]').last()
    await expect(preview.locator('text=Open')).toBeVisible({ timeout: 10000 })

    // Dialog should NOT be visible initially
    await expect(page.locator('[data-overlay="SettingsDialog"]')).not.toBeVisible()

    // Click the button
    await preview.locator('text=Open').click()

    // Dialog overlay should now be visible
    await expect(page.locator('[data-overlay="SettingsDialog"]')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('text=Dialog Content')).toBeVisible()
  })

  test('All-in-one tab also works with definition', async ({ page }) => {
    // Test that defining and using in same tab also works
    await setEditorContent(page, `MyDialog: pad 20 bg white rad 8
  "My Dialog Content"

Button onclick open MyDialog center "Show Dialog"`)

    await page.waitForTimeout(500)

    // Find the button in preview
    const preview = page.locator('[style*="flex: 1"]').last()
    await expect(preview.locator('text=Show Dialog')).toBeVisible({ timeout: 10000 })

    // Click the button
    await preview.locator('text=Show Dialog').click()

    // Dialog overlay should now be visible
    await expect(page.locator('[data-overlay="MyDialog"]')).toBeVisible({ timeout: 10000 })
    // Check the content inside the overlay (not the editor)
    await expect(page.locator('[data-overlay="MyDialog"] >> text=My Dialog Content')).toBeVisible()
  })
})
