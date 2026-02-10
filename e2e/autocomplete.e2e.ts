import { test, expect, Page } from '@playwright/test'

// Helper to type in CodeMirror editor
async function typeInEditor(page: Page, text: string) {
  const editor = page.locator('.cm-content[contenteditable="true"]').first()
  await editor.click()
  await page.keyboard.type(text)
}

// Helper to clear editor and type fresh
async function clearAndType(page: Page, text: string) {
  const editor = page.locator('.cm-content[contenteditable="true"]').first()
  await editor.click()
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')
  await page.keyboard.type(text)
}

// Helper to click on a tab
async function clickTab(page: Page, tabName: string) {
  await page.click(`button:has-text("${tabName}")`)
  await page.waitForTimeout(100)
}

test.describe('Autocomplete System', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for app to load
    await page.waitForSelector('.cm-editor')
    // Click Page tab (this is the layout editor)
    await clickTab(page, 'Page')
  })

  test.describe('Color Picker', () => {
    test('opens after # and inserts selected color (Tile 300 400 # test)', async ({ page }) => {
      // Type "Tile 300 400 #" - the # should trigger the color picker
      await clearAndType(page, 'Tile 300 400 #')

      // Color picker should open
      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Or just press Enter to select the currently highlighted color
      await page.keyboard.press('Enter')

      // Check what's in the editor now
      const content = await page.locator('.cm-content').textContent()
      console.log('Editor content after color selection:', content)

      // The color should have been inserted after the #
      expect(content).toMatch(/Tile 300 400 #[A-F0-9]{6}/i)
    })

    test('allows typing hex value after # without losing focus', async ({ page }) => {
      // Type "Tile 200 200 #" - the # should trigger the color picker
      await clearAndType(page, 'Tile 200 200 #')

      // Color picker should open
      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Continue typing hex value - cursor should stay in editor
      await page.keyboard.type('333')

      // Check editor content - should have the typed hex
      const content = await page.locator('.cm-content').textContent()
      console.log('Editor content after typing hex:', content)

      // The content should contain what we typed
      expect(content).toContain('Tile 200 200 #333')

      // Press Enter to confirm
      await page.keyboard.press('Enter')

      // Final content should be the hex color
      const finalContent = await page.locator('.cm-content').textContent()
      console.log('Final content:', finalContent)
      expect(finalContent).toContain('#333')
    })

    test('closes color picker on space after hex value', async ({ page }) => {
      // Type "Tile 300 400 #" - the # should trigger the color picker
      await clearAndType(page, 'Tile 300 400 #')

      // Color picker should open
      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Type hex value
      await page.keyboard.type('300')

      // Picker should still be open
      await expect(picker).toBeVisible({ timeout: 500 })

      // Type space - picker should close
      await page.keyboard.type(' ')

      // Picker should be closed now
      await expect(picker).not.toBeVisible({ timeout: 1000 })

      // Editor content should have the hex with space
      const content = await page.locator('.cm-content').textContent()
      console.log('Content after space:', content)
      expect(content).toContain('#300 ')
    })

    test('opens automatically after "bg " (space)', async ({ page }) => {
      await clearAndType(page, 'bg ')

      // ColorPicker should be visible - look for the picker container
      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Tokens|Picker/ })
      await expect(picker).toBeVisible({ timeout: 2000 })
    })

    test('opens automatically after "col " (space)', async ({ page }) => {
      await clearAndType(page, 'col ')

      // ColorPicker should be visible
      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Tokens|Picker/ })
      await expect(picker).toBeVisible({ timeout: 2000 })
    })

    test('closes on Escape', async ({ page }) => {
      await clearAndType(page, 'bg ')

      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Tokens|Picker/ })
      await expect(picker).toBeVisible({ timeout: 2000 })

      await page.keyboard.press('Escape')
      await expect(picker).not.toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Font Picker', () => {
    test('opens automatically after "font " (space)', async ({ page }) => {
      await clearAndType(page, 'font ')

      // FontPicker has font search - look for the input
      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Font|Inter|Arial/ })
      await expect(picker).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Icon Picker', () => {
    test('opens automatically after "icon " (space)', async ({ page }) => {
      await clearAndType(page, 'icon ')

      // IconPicker has categories
      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Popular|Navigation|Actions/ })
      await expect(picker).toBeVisible({ timeout: 2000 })
    })
  })

  // SpacingPicker and ValuePicker tests removed - pickers were deleted
  // These properties now use inline autocomplete instead

  test.describe('Command Palette', () => {
    test('opens with "/" at line start', async ({ page }) => {
      await clearAndType(page, '/')

      // CommandPalette should be visible
      const palette = page.locator('[style*="position: fixed"]').filter({ hasText: /Layout|Alignment|Spacing/ })
      await expect(palette).toBeVisible({ timeout: 2000 })
    })

    test('can search commands', async ({ page }) => {
      await clearAndType(page, '/')

      // Type search
      await page.keyboard.type('drop')

      // Should show Dropdown (use first() to avoid strict mode violation)
      await expect(page.locator('text=Dropdown').first()).toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('Escape closes picker', async ({ page }) => {
      await clearAndType(page, 'bg ')

      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Tokens|Picker/ })
      await expect(picker).toBeVisible({ timeout: 2000 })

      await page.keyboard.press('Escape')
      await expect(picker).not.toBeVisible({ timeout: 2000 })
    })

    test('Enter selects item in color picker', async ({ page }) => {
      await clearAndType(page, 'bg ')

      const picker = page.locator('[style*="position: fixed"]').filter({ hasText: /Tokens|Picker/ })
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Press Enter to select first item
      await page.keyboard.press('Enter')

      // Picker should be closed
      await expect(picker).not.toBeVisible({ timeout: 2000 })
    })
  })

  test.describe('Normal typing works', () => {
    test('space inside string works normally', async ({ page }) => {
      // Type directly without triggering picker (start with string)
      await clearAndType(page, '"Hello World"')

      const content = await page.locator('.cm-content').textContent()
      expect(content).toContain('Hello World')
    })

    // PropertyPicker tests removed - PropertyPicker was deleted
    // Inline autocomplete now handles property suggestions

    test('can type multiple properties', async ({ page }) => {
      // Start typing - ver doesn't need a value picker
      await clearAndType(page, 'ver gap 16')

      // Check content contains both properties
      const content = await page.locator('.cm-content').textContent()
      expect(content).toContain('ver')
      expect(content).toContain('gap')
      expect(content).toContain('16')
    })
  })
})
