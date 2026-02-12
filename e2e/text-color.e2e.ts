import { test, expect } from '@playwright/test'

test.describe('Text Color in Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(200)
  })

  // Helper to set editor content via localStorage and reload
  async function setEditorContent(page: any, layoutCode: string) {
    await page.evaluate((code: string) => {
      const projectData = {
        pages: [
          { id: 'page-1', name: 'Home', layoutCode: code }
        ],
        currentPageId: 'page-1',
        componentsCode: '',
        tokensCode: ''
      }
      localStorage.setItem('mirror-project', JSON.stringify(projectData))
    }, layoutCode)
    await page.reload()
    await page.waitForTimeout(600)
  }

  test('should apply white color from template to instance text', async ({ page }) => {
    const code = `Button: pad 8 16, col #E72A69, rad 8, "Label" #fff

Button "Erdbeeren"`

    await setEditorContent(page, code)

    // Find the button in preview - it should contain "Erdbeeren"
    const preview = page.locator('[style*="flex: 1"]').last()
    await expect(preview).toContainText('Erdbeeren')

    // Check that the text span has white color
    const textSpan = preview.locator('span:has-text("Erdbeeren")')
    await expect(textSpan).toBeVisible()

    // Check the computed color - should be white (#fff = rgb(255, 255, 255))
    const color = await textSpan.evaluate(el => window.getComputedStyle(el).color)
    expect(color).toBe('rgb(255, 255, 255)')
  })

  test('should override template text color when instance specifies color', async ({ page }) => {
    const code = `Button: "Label" #fff

Button "Override" #ff0`

    await setEditorContent(page, code)

    const preview = page.locator('[style*="flex: 1"]').last()
    const textSpan = preview.locator('span:has-text("Override")')
    await expect(textSpan).toBeVisible()

    // Check the computed color - should be yellow (#ff0 = rgb(255, 255, 0))
    const color = await textSpan.evaluate(el => window.getComputedStyle(el).color)
    expect(color).toBe('rgb(255, 255, 0)')
  })
})
