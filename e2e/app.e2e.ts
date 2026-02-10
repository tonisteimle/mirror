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
    await expect(page.getByRole('button', { name: 'Components' })).toHaveCSS('border-bottom-color', 'rgb(91, 168, 245)')

    // Click Tokens tab
    await page.getByRole('button', { name: 'Tokens' }).click()
    await expect(page.getByRole('button', { name: 'Tokens' })).toHaveCSS('border-bottom-color', 'rgb(91, 168, 245)')

    // Click Page tab
    await page.getByRole('button', { name: 'Page' }).click()
    await expect(page.getByRole('button', { name: 'Page' })).toHaveCSS('border-bottom-color', 'rgb(91, 168, 245)')
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

  test('should have default tokens', async ({ page }) => {
    await page.getByRole('button', { name: 'Tokens' }).click()

    await expect(page.locator('.cm-content')).toContainText('$primary')
    await expect(page.locator('.cm-content')).toContainText('$bg')
    await expect(page.locator('.cm-content')).toContainText('$text')
  })

  test('should use tokens in layout', async ({ page }) => {
    // Go to Page tab
    await page.getByRole('button', { name: 'Page' }).click()

    const editor = page.locator('.cm-editor')
    await editor.click()

    // Type component - after "Box " PropertyPicker opens, close it first
    await page.keyboard.type('Box ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(50)

    // Continue typing the properties
    await editor.click()
    await page.keyboard.type('bg ')
    // ColorPicker opens after "bg " showing tokens - click on $primary token
    await page.waitForTimeout(100)

    // Click on the $primary token in the ColorPicker
    await page.click('text=$primary')
    await page.waitForTimeout(50)

    // Now continue with the text content
    await editor.click()
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Token Test"')

    await page.waitForTimeout(500)

    // Preview should render (no error)
    const preview = page.locator('[style*="flex: 1"]').last()
    await expect(preview).toContainText('Token Test')
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

test.describe('Mirror App - AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
  })

  test('should open AI assistant panel with ? key', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    // Press ? to open AI assistant
    await page.keyboard.type('?')

    // Check AI assistant panel is visible
    await expect(page.locator('text=AI Assistent')).toBeVisible()
    await expect(page.getByPlaceholder('Was möchtest du erstellen?')).toBeVisible()
  })

  test('should close AI assistant panel with Escape', async ({ page }) => {
    const editor = page.locator('.cm-editor')
    await editor.click()

    await page.keyboard.type('?')
    await expect(page.locator('text=AI Assistent')).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(page.locator('text=AI Assistent')).not.toBeVisible()
  })
})
