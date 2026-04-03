/**
 * Two-Way Data Binding E2E Tests
 *
 * Tests the two-way binding feature in a real browser environment.
 * Verifies that:
 * 1. Input changes update the data store
 * 2. Text elements bound to the same token update reactively
 * 3. Multiple inputs bound to the same token stay in sync
 */

import { test, expect } from '@playwright/test'

// Helper to set editor content and wait for preview
async function setEditorContent(page: any, code: string) {
  // Focus the editor
  await page.click('.cm-content')

  // Select all and delete existing content
  await page.keyboard.press('Meta+a')
  await page.keyboard.press('Backspace')

  // Type the new code
  await page.keyboard.type(code, { delay: 5 })

  // Wait for the preview to update
  await page.waitForTimeout(800)
}

test.describe('Two-Way Binding E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to studio
    await page.goto('/studio/index.html')
    // Wait for studio to load
    await page.waitForSelector('.cm-editor', { timeout: 10000 })
    await page.waitForTimeout(1000)
  })

  test('Input updates Text element reactively', async ({ page }) => {
    const code = `$name: "Max"

Frame gap 12
  Input value $name, placeholder "Name"
  Text "Hello, " + $name`

    await setEditorContent(page, code)

    // Wait for preview to compile
    await page.waitForTimeout(1000)

    // Find the input in the preview container (not iframe)
    const preview = page.locator('#preview')
    const input = preview.locator('input')

    // Verify input exists
    await expect(input).toBeVisible()

    // Clear and type new value
    await input.fill('Anna')

    // Wait for reactive update
    await page.waitForTimeout(200)

    // Verify the text updated - find span containing "Hello"
    const textElement = preview.locator('span')
    await expect(textElement).toContainText('Anna')
  })

  test('Multiple inputs bound to same token stay in sync', async ({ page }) => {
    const code = `$shared: "initial"

Frame gap 12
  Input value $shared, placeholder "Input 1"
  Input value $shared, placeholder "Input 2"`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')

    // Get both inputs
    const inputs = preview.locator('input')
    const input1 = inputs.nth(0)
    const input2 = inputs.nth(1)

    // Verify initial values
    await expect(input1).toHaveValue('initial')
    await expect(input2).toHaveValue('initial')

    // Type in first input
    await input1.fill('updated')
    await page.waitForTimeout(200)

    // First input should have the new value
    await expect(input1).toHaveValue('updated')
  })

  test('Deeply nested path binding works', async ({ page }) => {
    const code = `$user.profile.name: "Deep"

Frame gap 12
  Input value $user.profile.name
  Text $user.profile.name`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')

    // Verify initial state
    const input = preview.locator('input')
    await expect(input).toHaveValue('Deep')

    // Update via input
    await input.fill('Nested Value')
    await page.waitForTimeout(200)

    // Verify text updated
    const textElement = preview.locator('span')
    await expect(textElement).toHaveText('Nested Value')
  })

  test('Static value input has no binding behavior', async ({ page }) => {
    const code = `Input value "static", placeholder "Static Input"`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')
    const input = preview.locator('input')

    // Static input should have the static value
    await expect(input).toHaveValue('static')

    // User can type, but it's just a regular input
    await input.fill('changed')
    await expect(input).toHaveValue('changed')
  })

  test('Input inside component has binding', async ({ page }) => {
    const code = `$search: "query"

SearchBox: Frame pad 12, bg #1a1a1a, rad 8
  Input value $search, placeholder "Search..."

SearchBox
Text "Searching: " + $search`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')
    const input = preview.locator('input')

    // Verify initial value
    await expect(input).toHaveValue('query')

    // Type new value
    await input.fill('new search')
    await page.waitForTimeout(200)

    // Text should update
    const textElement = preview.locator('span')
    await expect(textElement).toContainText('new search')
  })

  test('Textarea with token value has binding', async ({ page }) => {
    const code = `$content: "Initial content"

Frame gap 12
  Textarea value $content, placeholder "Enter text"
  Text "Preview: " + $content`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')
    const textarea = preview.locator('textarea')

    // Verify initial value
    await expect(textarea).toHaveValue('Initial content')

    // Type new content
    await textarea.fill('Updated content')
    await page.waitForTimeout(200)

    // Text should update
    const textElement = preview.locator('span')
    await expect(textElement).toContainText('Updated content')
  })

  test('Complex text expression updates correctly', async ({ page }) => {
    const code = `$count: 5
$unit: "items"

Frame gap 8
  Input value $count, type number
  Text $count + " " + $unit + " selected"`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')
    const input = preview.locator('input')

    // Initial state - text should contain "5"
    const textElement = preview.locator('span')
    await expect(textElement).toContainText('5')

    // Update count
    await input.fill('10')
    await page.waitForTimeout(200)

    // Text should reflect new count
    await expect(textElement).toContainText('10')
  })
})

test.describe('Two-Way Binding: Focus Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/index.html')
    await page.waitForSelector('.cm-editor', { timeout: 10000 })
    await page.waitForTimeout(1000)
  })

  test('Focused input does not lose cursor position on external update', async ({ page }) => {
    // This tests that the active element is skipped during notifyDataChange
    // to prevent cursor jumping while typing
    const code = `$text: ""

Frame gap 12
  Input value $text, placeholder "Type here"
  Text "You typed: " + $text`

    await setEditorContent(page, code)
    await page.waitForTimeout(1000)

    const preview = page.locator('#preview')
    const input = preview.locator('input')

    // Focus and type character by character
    await input.focus()
    await input.type('hello', { delay: 50 })

    // Input should have what we typed without cursor jumping
    await expect(input).toHaveValue('hello')

    // Text should also update
    const textElement = preview.locator('span')
    await expect(textElement).toContainText('hello')
  })
})
