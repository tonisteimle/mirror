import { test, expect } from '@playwright/test'

test.describe('Token Picker', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    // Wait for editor to be ready
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(1000)
  })

  test('shows token panel when typing "bg $" after defining tokens', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    // Clear editor and add token definitions
    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`// Tokens
primary.bg: #3B82F6
surface.bg: #1a1a23

// UI
Button bg $`)

    // Token panel should appear
    const tokenPanel = page.locator('#token-panel')
    await expect(tokenPanel).toBeVisible()

    // Should show matching tokens with .bg suffix
    await expect(page.locator('.token-item')).toHaveCount(2)
    await expect(page.locator('.token-name').first()).toContainText('$accent.bg')
  })

  test('hides color picker for spacing properties', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`sm.pad: 4
md.pad: 8

Button pad `)

    // Token panel should appear
    const tokenPanel = page.locator('#token-panel')
    await expect(tokenPanel).toBeVisible()

    // Color picker section should be hidden
    const colorSection = page.locator('#token-panel-picker')
    await expect(colorSection).toBeHidden()

    // Should show spacing tokens
    await expect(page.locator('.token-name').first()).toContainText('$s.pad')
  })

  test('inserts token when clicking on it', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`primary.bg: #3B82F6

Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Click on token
    await page.locator('.token-item').first().click()

    // Token should be inserted ($ was already typed as trigger)
    const editorContent = await editor.textContent()
    expect(editorContent).toContain('primary.bg')

    // Panel should be closed
    await expect(page.locator('#token-panel')).toBeHidden()
  })

  test('closes panel when typing continues', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Continue typing (any character closes the panel)
    await page.keyboard.type('x')

    // Panel should be closed
    await expect(page.locator('#token-panel')).toBeHidden()

    // Typed value should be in editor
    const editorContent = await editor.textContent()
    expect(editorContent).toContain('$x')
  })

  test('closes panel on Escape', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Press Escape
    await page.keyboard.press('Escape')

    // Panel should be closed
    await expect(page.locator('#token-panel')).toBeHidden()
  })

  test('keyboard navigation with arrow keys', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`primary.bg: #3B82F6
surface.bg: #1a1a23

Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // First token should be selected
    await expect(page.locator('.token-item').first()).toHaveClass(/selected/)

    // Press down arrow
    await page.keyboard.press('ArrowDown')

    // Second token should be selected
    await expect(page.locator('.token-item').nth(1)).toHaveClass(/selected/)

    // Press up arrow
    await page.keyboard.press('ArrowUp')

    // First token should be selected again
    await expect(page.locator('.token-item').first()).toHaveClass(/selected/)
  })

  test('Enter selects highlighted token', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`primary.bg: #3B82F6
surface.bg: #1a1a23

Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Navigate to second token
    await page.keyboard.press('ArrowDown')

    // Press Enter
    await page.keyboard.press('Enter')

    // Second token should be inserted ($ was already typed as trigger)
    const editorContent = await editor.textContent()
    expect(editorContent).toContain('surface.bg')

    // Panel should be closed
    await expect(page.locator('#token-panel')).toBeHidden()
  })

  test('filters tokens by suffix for different properties', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`primary.bg: #3B82F6
primary.col: #ffffff
sm.pad: 4
sm.gap: 8

Button col $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Should only show .col tokens
    const tokenNames = await page.locator('.token-name').allTextContents()
    expect(tokenNames).toHaveLength(1)
    expect(tokenNames[0]).toContain('$primary.col')
  })

  test('falls back to type matching when no suffix match', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`primary: #3B82F6
secondary: #10B981

Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Should show all color tokens (type-based matching)
    const tokenItems = page.locator('.token-item')
    await expect(tokenItems).toHaveCount(2)
  })

  test('shows empty token section when no tokens defined', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`Button bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Token section should be hidden (no tokens)
    await expect(page.locator('#token-panel-tokens')).toBeHidden()

    // Color picker is hidden with $ trigger (only shows with space trigger)
    await expect(page.locator('#token-panel-picker')).toBeHidden()
  })

  test('works with hover-bg property', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`primary.bg: #3B82F6
hover.bg: #2563EB

Button hover-bg $`)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Should show .bg tokens
    const tokenNames = await page.locator('.token-name').allTextContents()
    expect(tokenNames.some(n => n.includes('.bg'))).toBe(true)
  })

  test('works with rad property', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`sm.rad: 4
md.rad: 8

Button rad `)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Should show .rad tokens
    await expect(page.locator('.token-name').first()).toContainText('.rad')

    // No color picker for rad
    await expect(page.locator('#token-panel-picker')).toBeHidden()
  })

  test('works with gap property', async ({ page }) => {
    const editor = page.locator('.cm-editor .cm-content')

    await editor.click()
    await page.keyboard.press('Meta+a')
    await page.keyboard.type(`sm.gap: 4
md.gap: 8

Container gap `)

    // Wait for panel
    await expect(page.locator('#token-panel')).toBeVisible()

    // Should show .gap tokens
    await expect(page.locator('.token-name').first()).toContainText('.gap')
  })
})
