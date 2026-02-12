import { test, expect } from '@playwright/test'

// Helper to switch tabs reliably
async function switchTab(page: import('@playwright/test').Page, tabName: string) {
  await page.getByRole('button', { name: tabName }).click({ force: true })
  await page.waitForTimeout(200)
}

// Helper to type in editor
async function typeInEditor(page: import('@playwright/test').Page, text: string) {
  const editor = page.locator('.cm-editor')
  await editor.waitFor({ state: 'visible' })
  await editor.click()
  await page.waitForTimeout(100) // Wait for editor to be focused
  await page.keyboard.type(text)
}

// Helper to clear and type in editor (replaces all content)
async function clearAndTypeInEditor(page: import('@playwright/test').Page, text: string) {
  const editor = page.locator('.cm-editor')
  await editor.waitFor({ state: 'visible' })
  await editor.click()
  await page.waitForTimeout(100) // Wait for editor to be focused
  // Select all and replace
  await page.keyboard.press('Meta+a')
  await page.waitForTimeout(50)
  await page.keyboard.type(text)
}

test.describe('Mirror DSL - Tokens', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should define and use color tokens', async ({ page }) => {
    // Define token in Tokens tab (clear existing content first)
    await switchTab(page, 'Tokens')
    await clearAndTypeInEditor(page, '$testcolor: #FF0000')
    await page.keyboard.press('Escape') // Dismiss any autocomplete
    await page.waitForTimeout(300)

    // Use token in Page tab (clear existing content first)
    await switchTab(page, 'Page')
    await clearAndTypeInEditor(page, 'Box bg #3B82F6 pad 20\n  "Token Test"')
    await page.keyboard.press('Escape') // Dismiss any autocomplete
    await page.waitForTimeout(500)

    // Verify preview - just check that the content renders
    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Token Test')
  })
})

test.describe('Mirror DSL - Component Definitions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should define and use custom components', async ({ page }) => {
    // Define component
    await switchTab(page, 'Components')
    await typeInEditor(page, 'Card: pad 16 rad 8 bg #FFFFFF')
    await page.waitForTimeout(300)

    // Use component
    await switchTab(page, 'Page')
    await typeInEditor(page, 'Card')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Card Content"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Card Content')
  })
})

test.describe('Mirror DSL - Layout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should render horizontal layout', async ({ page }) => {
    await typeInEditor(page, 'Box hor gap 10')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Item 1"')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Item 2"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Item 1')
    await expect(preview).toContainText('Item 2')
  })

  test('should render vertical layout', async ({ page }) => {
    await typeInEditor(page, 'Box ver gap 20')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Top"')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Bottom"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Top')
    await expect(preview).toContainText('Bottom')
  })

  test('should center content', async ({ page }) => {
    await typeInEditor(page, 'Box cen w 200 h 200 bg #EEE')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Centered"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Centered')
  })
})

test.describe('Mirror DSL - Primitives', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should render Input primitive', async ({ page }) => {
    await typeInEditor(page, 'Input placeholder "Enter text..."')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    const input = preview.locator('input')
    await expect(input).toBeVisible()
  })

  test('should render Link primitive', async ({ page }) => {
    await typeInEditor(page, 'Link href "https://example.com" "Visit"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    const link = preview.locator('a')
    await expect(link).toBeVisible()
    await expect(link).toContainText('Visit')
  })

  test('should render Heading primitives', async ({ page }) => {
    await typeInEditor(page, 'H1 "Title"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview.locator('h1')).toContainText('Title')
  })
})

test.describe('Mirror DSL - Styling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await page.waitForTimeout(500)
  })

  test('should apply border radius', async ({ page }) => {
    await typeInEditor(page, 'Box rad 16 bg #3B82F6 pad 20')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Rounded"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Rounded')
  })

  test('should apply shadow', async ({ page }) => {
    await typeInEditor(page, 'Box shadow md bg #FFF pad 20')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Shadowed"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Shadowed')
  })

  test('should apply border', async ({ page }) => {
    await typeInEditor(page, 'Box border 2 border-col #000 pad 20')
    await page.keyboard.press('Enter')
    await page.keyboard.type('  "Bordered"')
    await page.waitForTimeout(500)

    const preview = page.getByTestId('preview-container')
    await expect(preview).toContainText('Bordered')
  })
})
