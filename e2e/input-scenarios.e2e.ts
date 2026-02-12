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

// Helper to get editor content
async function getEditorContent(page: Page): Promise<string> {
  return await page.locator('.cm-content').textContent() || ''
}

// Helper to click on a tab
async function clickTab(page: Page, tabName: string) {
  await page.click(`button:has-text("${tabName}")`)
  await page.waitForTimeout(100)
}

test.describe('Systematic Input Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForSelector('.cm-editor')
    await clickTab(page, 'Page')
  })

  // ==========================================
  // 1. BASIC TYPING WITHOUT PICKERS
  // ==========================================
  test.describe('Basic typing without pickers', () => {
    test('simple component name', async ({ page }) => {
      await clearAndType(page, 'Tile')
      const content = await getEditorContent(page)
      expect(content).toBe('Tile')
    })

    test('component with dimensions', async ({ page }) => {
      await clearAndType(page, 'Tile 300 400')
      const content = await getEditorContent(page)
      expect(content).toBe('Tile 300 400')
    })

    test('component with text content', async ({ page }) => {
      await clearAndType(page, 'Text "Hello World"')
      const content = await getEditorContent(page)
      expect(content).toBe('Text "Hello World"')
    })

    test('pad with number value', async ({ page }) => {
      await clearAndType(page, 'pad 16')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('pad 16')
    })

    test('gap with number value', async ({ page }) => {
      await clearAndType(page, 'gap 8')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('gap 8')
    })

    test('multiple properties on same line', async ({ page }) => {
      await clearAndType(page, 'ver gap 16 pad 20')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('ver gap 16 pad 20')
    })

    test('width and height', async ({ page }) => {
      await clearAndType(page, 'w 200 h 100')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('w 200 h 100')
    })

    test('size property', async ({ page }) => {
      await clearAndType(page, 'size 14')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('size 14')
    })

    test('complex line with multiple properties', async ({ page }) => {
      await clearAndType(page, 'Tile 300 400 pad 16 rad 8')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('Tile 300 400 pad 16 rad 8')
    })
  })

  // ==========================================
  // 2. COLOR PICKER WITH # TRIGGER
  // ==========================================
  test.describe('Color picker with # trigger', () => {
    test('# opens picker, Enter selects color', async ({ page }) => {
      await clearAndType(page, 'Tile 300 400 #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      await page.keyboard.press('Enter')

      const content = await getEditorContent(page)
      expect(content).toMatch(/Tile 300 400 #[A-F0-9]{6}/i)
    })

    test('# then type hex manually', async ({ page }) => {
      await clearAndType(page, 'Tile #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Type slowly and wait for state to settle
      for (const char of 'FF0000') {
        await page.keyboard.press(char)
        await page.waitForTimeout(30)
      }
      await page.waitForTimeout(200)
      await page.keyboard.press('Enter')

      const content = await getEditorContent(page)
      expect(content).toContain('#FF0000')
    })

    test('# then type short hex', async ({ page }) => {
      await clearAndType(page, 'col #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Type hex value
      await page.keyboard.type('333')
      await page.waitForTimeout(100)
      await page.keyboard.press('Enter')

      const content = await getEditorContent(page)
      expect(content).toContain('#333')
    })

    test('# then space closes picker', async ({ page }) => {
      await clearAndType(page, 'Tile #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      await page.keyboard.type('ABC')
      await page.keyboard.type(' ')

      await expect(picker).not.toBeVisible({ timeout: 1000 })

      const content = await getEditorContent(page)
      expect(content).toContain('#ABC ')
    })

    test('# then Escape closes picker without change', async ({ page }) => {
      await clearAndType(page, 'Tile #')

      const picker = page.locator('[style*="position: fixed"]')
      await expect(picker).toBeVisible({ timeout: 2000 })

      // Press Escape and wait for picker to close
      await page.keyboard.press('Escape')
      await page.waitForTimeout(200)

      // Try again if still visible
      const stillVisible = await picker.isVisible()
      if (stillVisible) {
        await page.keyboard.press('Escape')
        await page.waitForTimeout(200)
      }

      await expect(picker).not.toBeVisible({ timeout: 2000 })

      const content = await getEditorContent(page)
      expect(content).toBe('Tile #')
    })

    test('multiple colors on same line', async ({ page }) => {
      await clearAndType(page, 'col #')
      // Wait for color picker to open
      await page.waitForTimeout(200)

      // Type first color slowly
      for (const char of 'FF0000') {
        await page.keyboard.press(char)
        await page.waitForTimeout(30)
      }
      await page.waitForTimeout(200)
      await page.keyboard.press('Enter')

      // Type space and second property
      await page.keyboard.type(' boc #')
      // Wait for color picker to open
      await page.waitForTimeout(200)

      // Type second color slowly
      for (const char of '00FF00') {
        await page.keyboard.press(char)
        await page.waitForTimeout(30)
      }
      await page.waitForTimeout(200)
      await page.keyboard.press('Enter')

      const content = await getEditorContent(page)
      expect(content).toContain('#FF0000')
      expect(content).toContain('#00FF00')
    })
  })

  // ==========================================
  // 3. TYPING COLORS WITHOUT PICKER
  // ==========================================
  test.describe('Typing colors without using picker', () => {
    test('type full hex color and continue', async ({ page }) => {
      await clearAndType(page, 'col #FF0000 pad 16')
      await page.waitForTimeout(300)
      const content = await getEditorContent(page)
      expect(content).toBe('col #FF0000 pad 16')
    })

    test('type short hex and continue', async ({ page }) => {
      await clearAndType(page, 'col #333 bor 1')
      await page.waitForTimeout(300)
      const content = await getEditorContent(page)
      expect(content).toBe('col #333 bor 1')
    })
  })

  // ==========================================
  // 4. MULTILINE INPUT
  // ==========================================
  test.describe('Multiline input', () => {
    test('two lines with Enter', async ({ page }) => {
      await clearAndType(page, 'Tile 300 400')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Text "Hello"')

      const content = await getEditorContent(page)
      expect(content).toContain('Tile 300 400')
      expect(content).toContain('Text "Hello"')
    })

    test('nested structure', async ({ page }) => {
      await clearAndType(page, 'Container')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Header')
      await page.keyboard.press('Enter')
      await page.keyboard.type('  Content')

      const content = await getEditorContent(page)
      expect(content).toContain('Container')
      expect(content).toContain('Header')
      expect(content).toContain('Content')
    })
  })

  // ==========================================
  // 5. AUTOCOMPLETE BEHAVIOR
  // ==========================================
  test.describe('Autocomplete behavior', () => {
    test('autocomplete should not replace typed numbers', async ({ page }) => {
      // This tests the bug where "pad 16" became "pad w"
      await clearAndType(page, 'pad ')
      await page.waitForTimeout(100)
      await page.keyboard.type('16')
      await page.waitForTimeout(300)

      const content = await getEditorContent(page)
      expect(content).toBe('pad 16')
    })

    test('autocomplete should not interfere with dimensions', async ({ page }) => {
      await clearAndType(page, 'Tile ')
      await page.waitForTimeout(100)
      await page.keyboard.type('300 400')
      await page.waitForTimeout(300)

      const content = await getEditorContent(page)
      expect(content).toBe('Tile 300 400')
    })

    test('Escape dismisses autocomplete', async ({ page }) => {
      await clearAndType(page, 'pa')
      await page.waitForTimeout(200)

      // Check if autocomplete is showing
      const autocomplete = page.locator('.cm-tooltip-autocomplete')
      const isVisible = await autocomplete.isVisible().catch(() => false)

      if (isVisible) {
        await page.keyboard.press('Escape')
        await expect(autocomplete).not.toBeVisible({ timeout: 1000 })
      }

      // Continue typing
      await page.keyboard.type('d 20')
      await page.waitForTimeout(200)

      const content = await getEditorContent(page)
      expect(content).toBe('pad 20')
    })
  })

  // ==========================================
  // 6. EDGE CASES
  // ==========================================
  test.describe('Edge cases', () => {
    test('empty input', async ({ page }) => {
      await clearAndType(page, '')
      const content = await getEditorContent(page)
      expect(content).toBe('')
    })

    test('only whitespace', async ({ page }) => {
      await clearAndType(page, '   ')
      const content = await getEditorContent(page)
      expect(content).toBe('   ')
    })

    test('special characters in strings', async ({ page }) => {
      await clearAndType(page, 'Text "Hello & World!"')
      const content = await getEditorContent(page)
      expect(content).toBe('Text "Hello & World!"')
    })

    test('numbers only', async ({ page }) => {
      await clearAndType(page, '100 200 300')
      await page.waitForTimeout(200)
      const content = await getEditorContent(page)
      expect(content).toBe('100 200 300')
    })

    test('rapid typing', async ({ page }) => {
      const editor = page.locator('.cm-content[contenteditable="true"]').first()
      await editor.click()
      await page.keyboard.press('Meta+a')
      await page.keyboard.press('Backspace')

      // Type rapidly without delays
      await page.keyboard.type('Tile 300 400 col #FF0000 pad 16', { delay: 10 })
      await page.waitForTimeout(300)

      const content = await getEditorContent(page)
      expect(content).toContain('Tile')
      expect(content).toContain('300')
      expect(content).toContain('400')
    })
  })

  // ==========================================
  // 7. COMMAND PALETTE (/)
  // ==========================================
  test.describe('Command palette', () => {
    test('/ at line start opens palette', async ({ page }) => {
      await clearAndType(page, '/')

      const palette = page.locator('[style*="position: fixed"]').filter({ hasText: /Layout|Alignment|Spacing/ })
      await expect(palette).toBeVisible({ timeout: 2000 })
    })

    test('/ then Escape closes palette', async ({ page }) => {
      await clearAndType(page, '/')

      const palette = page.locator('[style*="position: fixed"]').filter({ hasText: /Layout|Alignment|Spacing/ })
      await expect(palette).toBeVisible({ timeout: 2000 })

      await page.keyboard.press('Escape')
      await expect(palette).not.toBeVisible({ timeout: 1000 })
    })
  })
})
