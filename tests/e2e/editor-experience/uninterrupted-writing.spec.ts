/**
 * Uninterrupted Writing Tests
 *
 * Critical tests ensuring that pickers and autocomplete NEVER block or disrupt
 * the writing flow. The user must always be able to continue typing, editing,
 * and deleting without unexpected behavior.
 *
 * Principle: Pickers are helpers, not blockers. Writing takes priority.
 */

import { test, expect } from '@playwright/test'
import { createStudioTestHelper, type StudioTestHelper } from '../../helpers/studio-test-api'

test.describe('Uninterrupted Writing - Basic Flow', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('can dismiss picker with Escape and continue typing', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(300)

    // Trigger picker
    await helper.typeAndWaitForPicker(' ')
    expect(await helper.isPickerOpen()).toBe(true)

    // Dismiss with Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)
    expect(await helper.isPickerOpen()).toBe(false)

    // Continue typing - should work normally
    await page.keyboard.type('"home"')
    await page.waitForTimeout(100)

    const content = await helper.getEditorContent()
    expect(content).toContain('Icon "home"')
  })

  test('typing space closes picker and inserts the space', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(300)

    await helper.typeAndWaitForPicker(' ')

    // Focus editor and type another space (closeOnChars behavior)
    await page.locator('.cm-content').focus()
    await page.waitForTimeout(50)
    await page.keyboard.type(' more text')
    await page.waitForTimeout(200)

    // Picker should be closed
    expect(await helper.isPickerOpen()).toBe(false)

    // The space and text should be in the editor
    const content = await helper.getEditorContent()
    expect(content).toContain('Icon')
    expect(content).toContain('more text')
  })

  test('rapid typing does not cause unexpected replacements', async ({ page }) => {
    await helper.setEditorContent(`Frame`)
    await page.waitForTimeout(300)

    // Type rapidly - mixing trigger and non-trigger content
    await page.keyboard.type('\n  Icon "star"\n  Text "Hello"\n  Button "Click"', { delay: 30 })
    await page.waitForTimeout(300)

    const content = await helper.getEditorContent()

    // All typed content should be present, nothing replaced
    expect(content).toContain('Frame')
    expect(content).toContain('Icon "star"')
    expect(content).toContain('Text "Hello"')
    expect(content).toContain('Button "Click"')
  })

  test('backspace works correctly with picker open', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(300)

    await helper.typeAndWaitForPicker(' ')

    // Focus editor and use backspace
    await page.locator('.cm-content').click()
    await page.waitForTimeout(50)

    // Delete the space - should close picker
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(150)

    expect(await helper.isPickerOpen()).toBe(false)

    // Continue typing - should work
    await page.keyboard.type(' "heart"')
    await page.waitForTimeout(100)

    const content = await helper.getEditorContent()
    expect(content).toContain('Icon "heart"')
  })

  test('can delete multiple characters and continue writing', async ({ page }) => {
    await helper.setEditorContent(`Icon "star"`)
    await page.waitForTimeout(300)

    // Select all and verify we can delete
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(100)

    // Type new content
    await page.keyboard.type('Button "New"')
    await page.waitForTimeout(100)

    const content = await helper.getEditorContent()
    expect(content).toBe('Button "New"')
    expect(content).not.toContain('Icon')
  })
})

test.describe('Uninterrupted Writing - Ignore Picker', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('can ignore picker and type quoted value directly', async ({ page }) => {
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(300)

    // Type space (triggers picker) then immediately type the value
    await page.keyboard.type(' "my-custom-icon"', { delay: 50 })
    await page.waitForTimeout(300)

    // Picker should be closed (closed on space or quote)
    expect(await helper.isPickerOpen()).toBe(false)

    // The manually typed value should be in the editor
    const content = await helper.getEditorContent()
    expect(content).toContain('Icon "my-custom-icon"')
  })

  test('can type past picker without selecting', async ({ page }) => {
    await helper.setEditorContent(`Frame\n  Icon`)
    await page.waitForTimeout(300)

    // Move to end
    await page.keyboard.press('End')

    // Type space (triggers picker) then escape and continue
    await helper.typeAndWaitForPicker(' ')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(50)

    // Continue on new line
    await page.keyboard.type('\n  Text "Hello"')
    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Frame')
    expect(content).toContain('Icon')
    expect(content).toContain('Text "Hello"')
  })

  test('writing flow not interrupted by multiple triggers', async ({ page }) => {
    await helper.setEditorContent(``)
    await page.waitForTimeout(300)

    // Write a complete component tree with multiple potential triggers
    const code = `Frame gap 12
  Icon "star"
  Text "Rating"
  Icon "heart"
  Button "Like"`

    // Type line by line to simulate real writing
    for (const line of code.split('\n')) {
      await page.keyboard.type(line, { delay: 20 })
      await page.keyboard.press('Enter')
      await page.waitForTimeout(50)
    }

    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Frame gap 12')
    expect(content).toContain('Icon "star"')
    expect(content).toContain('Text "Rating"')
    expect(content).toContain('Icon "heart"')
    expect(content).toContain('Button "Like"')
  })
})

test.describe('Uninterrupted Writing - Edit Existing Code', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('can edit middle of existing code', async ({ page }) => {
    await helper.setEditorContent(`Frame\n  Text "Hello"\n  Button "Click"`)
    await page.waitForTimeout(300)

    // Click at end of line 2 (after "Hello")
    // Navigate to position
    await page.keyboard.press('Meta+a')
    await page.keyboard.press('ArrowRight') // Deselect, cursor at end

    // Go to line 2
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('ArrowUp')
    await page.keyboard.press('End')

    // Add new line with Icon
    await page.keyboard.type('\n  Icon "star"')
    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Text "Hello"')
    expect(content).toContain('Icon "star"')
    expect(content).toContain('Button "Click"')
  })

  test('can change icon name by selecting and retyping', async ({ page }) => {
    await helper.setEditorContent(`Icon "star"`)
    await page.waitForTimeout(300)

    // Select all and retype the whole thing (more reliable than double-click)
    await page.keyboard.press('Meta+a')
    await page.keyboard.type('Icon "heart"')
    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Icon "heart"')
    expect(content).not.toContain('star')
  })

  test('undo/redo works correctly after picker interaction', async ({ page }) => {
    // Clear and set content, then wait for undo history to stabilize
    await helper.setEditorContent(`Icon`)
    await page.waitForTimeout(500)

    // Store the content after setup (this is what we'll undo to)
    const beforePicker = await helper.getEditorContent()

    // Use picker to insert icon
    await helper.typeAndWaitForPicker(' ')
    await helper.selectAndWaitForClose()

    await page.waitForTimeout(200)
    const afterSelect = await helper.getEditorContent()
    expect(afterSelect).toMatch(/Icon\s+"[a-z0-9-]+"/)

    // Undo - undo the icon selection (icon insertion is a single transaction)
    await page.keyboard.press('Meta+z')
    await page.waitForTimeout(200)

    const afterUndo = await helper.getEditorContent()
    // After one undo, we should be back to "Icon " (with space)
    // The picker insertion is a single transaction: replace "Icon " with 'Icon "icon-name"'
    // Undoing it goes back to "Icon " (the space was typed before picker opened)
    expect(afterUndo.trim()).toBe('Icon')

    // Redo - redo the icon insertion
    await page.keyboard.press('Meta+Shift+z')
    await page.waitForTimeout(200)

    const afterRedo = await helper.getEditorContent()
    expect(afterRedo).toMatch(/Icon\s+"[a-z0-9-]+"/)
  })
})

test.describe('Uninterrupted Writing - Edge Cases', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('empty editor - can start typing immediately', async ({ page }) => {
    await helper.setEditorContent(``)
    await page.waitForTimeout(300)

    await page.keyboard.type('Frame\n  Text "Hello"')
    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Frame')
    expect(content).toContain('Text "Hello"')
  })

  test('cursor position preserved after picker dismiss', async ({ page }) => {
    await helper.setEditorContent(`Frame\n  Icon`)
    await page.waitForTimeout(300)

    await page.keyboard.press('End')
    await helper.typeAndWaitForPicker(' ')

    // Dismiss
    await page.keyboard.press('Escape')
    await page.waitForTimeout(100)

    // Type at current position
    await page.keyboard.type('"test"')
    await page.waitForTimeout(100)

    const content = await helper.getEditorContent()
    // The "test" should be right after "Icon "
    expect(content).toContain('Icon "test"')
  })

  test('can write special characters without issues', async ({ page }) => {
    await helper.setEditorContent(``)
    await page.waitForTimeout(300)

    await page.keyboard.type('Text "Hello, Wörld! 日本語 $100"')
    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Wörld')
    expect(content).toContain('日本語')
    expect(content).toContain('$100')
  })

  test('multiline paste works correctly', async ({ page, context }) => {
    await helper.setEditorContent(``)
    await page.waitForTimeout(300)

    const codeToPaste = `Frame gap 12
  Icon "star"
  Text "Rating"
  Button "Submit"`

    // Grant clipboard permissions and use Playwright's method
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.evaluate((text) => navigator.clipboard.writeText(text), codeToPaste)
    await page.keyboard.press('Meta+v')
    await page.waitForTimeout(300)

    const content = await helper.getEditorContent()
    expect(content).toContain('Frame gap 12')
    expect(content).toContain('Icon "star"')
    expect(content).toContain('Text "Rating"')
    expect(content).toContain('Button "Submit"')
  })

  test('cut and paste works correctly', async ({ page }) => {
    await helper.setEditorContent(`Frame\n  Icon "star"\n  Text "Hello"`)
    await page.waitForTimeout(300)

    // Select all
    await page.keyboard.press('Meta+a')

    // Cut
    await page.keyboard.press('Meta+x')
    await page.waitForTimeout(100)

    // Editor should be empty
    let content = await helper.getEditorContent()
    expect(content.trim()).toBe('')

    // Paste back
    await page.keyboard.press('Meta+v')
    await page.waitForTimeout(200)

    content = await helper.getEditorContent()
    expect(content).toContain('Frame')
    expect(content).toContain('Icon "star"')
    expect(content).toContain('Text "Hello"')
  })
})

test.describe('Uninterrupted Writing - Token Picker', () => {
  let helper: StudioTestHelper

  test.beforeEach(async ({ page }) => {
    helper = createStudioTestHelper(page)
    await page.goto('/studio/')
    await helper.waitForEditorReady()
    await page.waitForTimeout(2000)
    await helper.waitForTestAPI()
  })

  test('can type $ and continue without selecting token', async ({ page }) => {
    await helper.setEditorContent(`Frame bg `)
    await page.waitForTimeout(300)

    // Move to end
    await page.keyboard.press('End')

    // Type $ which might trigger token picker
    await page.keyboard.type('$myToken')
    await page.waitForTimeout(300)

    const content = await helper.getEditorContent()
    expect(content).toContain('Frame bg $myToken')
  })

  test('Escape from token picker lets you continue typing', async ({ page }) => {
    // Start with just the Frame line, add token definition after
    await helper.setEditorContent(`Frame bg `)
    await page.waitForTimeout(300)

    // Move to end of line
    await page.keyboard.press('End')

    // Type $ to trigger token picker
    await page.keyboard.type('$')
    await page.waitForTimeout(500)

    const isOpen = await helper.isPickerOpen()
    if (isOpen) {
      await page.keyboard.press('Escape')
      await page.waitForTimeout(100)
    }

    // Continue typing the token name
    await page.keyboard.type('custom, col white')
    await page.waitForTimeout(200)

    const content = await helper.getEditorContent()
    expect(content).toContain('Frame bg $custom')
    expect(content).toContain('col white')
  })
})
