import { test, expect } from '@playwright/test'

test.describe('Mirror App - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Clear localStorage to start fresh
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should load the app with correct layout', async ({ page }) => {
    // Check header is visible
    await expect(page.locator('img[alt="mirror"]')).toBeVisible()

    // Check tabs are visible
    await expect(page.getByRole('button', { name: 'Page' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Components' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Tokens' })).toBeVisible()
  })

  test('should switch between tabs', async ({ page }) => {
    // Click Components tab
    await page.getByRole('button', { name: 'Components' }).click()
    // Active tab has brighter text color and heavier font weight
    await expect(page.getByRole('button', { name: 'Components' })).toHaveCSS('font-weight', '600')

    // Click Tokens tab
    await page.getByRole('button', { name: 'Tokens' }).click()
    await expect(page.getByRole('button', { name: 'Tokens' })).toHaveCSS('font-weight', '600')
    // Previous tab should be inactive
    await expect(page.getByRole('button', { name: 'Components' })).toHaveCSS('font-weight', '500')

    // Click Page tab
    await page.getByRole('button', { name: 'Page' }).click()
    await expect(page.getByRole('button', { name: 'Page' })).toHaveCSS('font-weight', '600')
  })
})

test.describe('Mirror App - Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should type code in the editor', async ({ page }) => {
    // Focus the editor
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type some DSL code
    await page.keyboard.type('Box')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Hello World"')

    // Check the code is in the editor
    await expect(page.locator('.cm-content')).toContainText('Box')
    await expect(page.locator('.cm-content')).toContainText('Hello World')
  })

  test('should render preview when typing valid DSL', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type a simple component
    await page.keyboard.type('Button')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Click me"')

    // Wait for preview to update
    await page.waitForTimeout(500)

    // Check preview contains the text
    const preview = page.locator('[style*="flex: 1"]').last()
    await expect(preview).toContainText('Click me')
  })
})

test.describe('Mirror App - Library Auto-Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should auto-import Dropdown definitions when typing Dropdown', async ({ page }) => {
    // Focus the editor (Page tab)
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type Dropdown
    await page.keyboard.type('Dropdown')

    // Wait for auto-import
    await page.waitForTimeout(1000)

    // Switch to Components tab
    await page.getByRole('button', { name: 'Components' }).click()

    // Check that Dropdown definitions were added
    await expect(page.locator('.cm-content')).toContainText('// Dropdown')
    await expect(page.locator('.cm-content')).toContainText('DropdownTrigger')
    await expect(page.locator('.cm-content')).toContainText('DropdownContent')
    await expect(page.locator('.cm-content')).toContainText('DropdownItem')
  })

  test('should auto-import Dialog definitions when typing Dialog', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.type('Dialog')
    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: 'Components' }).click()

    await expect(page.locator('.cm-content')).toContainText('// Dialog')
    await expect(page.locator('.cm-content')).toContainText('DialogTrigger')
    await expect(page.locator('.cm-content')).toContainText('DialogContent')
  })

  test('should not duplicate definitions on re-typing', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type Dropdown twice
    await page.keyboard.type('Dropdown')
    await page.keyboard.press('Enter')
    await page.keyboard.type('Dropdown')

    await page.waitForTimeout(1000)

    await page.getByRole('button', { name: 'Components' }).click()

    // Count occurrences of "// Dropdown" - should only be 1
    const content = await page.locator('.cm-content').textContent()
    const matches = (content?.match(/\/\/ Dropdown/g) || []).length
    expect(matches).toBe(1)
  })
})

// Page Management tests removed - PageSidebar temporarily hidden

test.describe('Mirror App - Export/Import', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should have export button', async ({ page }) => {
    // Export button is now an icon button with title
    await expect(page.locator('button[title="Export"]')).toBeVisible()
  })

  test('should have import button', async ({ page }) => {
    // Import button is now an icon button with title
    await expect(page.locator('button[title="Import"]')).toBeVisible()
  })
})

test.describe('Mirror App - Color Picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should open color picker with Cmd+K', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Press Cmd+K (or Ctrl+K on non-Mac)
    await page.keyboard.press('Meta+k')

    // Check color picker is visible
    await expect(page.locator('text=Navigation')).toBeVisible()
  })

  test('should close color picker with Escape', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.press('Meta+k')
    await expect(page.locator('text=Navigation')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('text=Navigation')).not.toBeVisible()
  })
})

test.describe('Mirror App - Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should start with empty tokens', async ({ page }) => {
    await page.getByRole('button', { name: 'Tokens' }).click()

    // Token editor should be empty by default
    const content = await page.locator('.cm-content').textContent()
    expect(content?.trim()).toBe('')
  })

  test('should create tokens in tokens tab', async ({ page }) => {
    // Go to Tokens tab
    await page.getByRole('button', { name: 'Tokens' }).click()
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Create a token
    await page.keyboard.type(':primary #3B82F6')
    await page.waitForTimeout(300)

    // Verify the token was created
    await expect(page.locator('.cm-content')).toContainText(':primary')
    await expect(page.locator('.cm-content')).toContainText('#3B82F6')
  })
})

test.describe('Mirror App - Auto-Save', () => {
  test('should persist data in localStorage', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.type('PersistTest')

    // Wait for auto-save (debounced 500ms)
    await page.waitForTimeout(1000)

    // Check localStorage
    const saved = await page.evaluate(() => localStorage.getItem('mirror-project'))
    expect(saved).toContain('PersistTest')
  })

  test('should restore data on reload', async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    const editor = page.locator('.cm-editor')
    await editor.click()
    await page.keyboard.type('ReloadTest')

    await page.waitForTimeout(1000)

    // Reload the page
    await page.reload()

    // Check content is restored
    await expect(page.locator('.cm-content')).toContainText('ReloadTest')
  })
})

