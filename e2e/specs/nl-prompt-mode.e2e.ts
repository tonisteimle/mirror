/**
 * NL Prompt Mode E2E Tests
 *
 * Tests for the natural language prompt mode:
 * - "/" at line start enables NL mode (no autocomplete)
 * - Shift+Enter adds newline (stays in block)
 * - Enter sends the block to LLM and removes it
 */

import { test, expect } from '../fixtures'

test.describe('NL Prompt Mode', () => {
  test.describe('Autocomplete Suppression', () => {
    test('does NOT show autocomplete when line starts with /', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Clear and verify empty
      await editorPage.clear()
      await page.waitForTimeout(100)

      // Type "/" to start NL mode - use insertText to avoid keyboard interpretation issues
      await page.keyboard.insertText('/')

      // Type some text that would normally trigger autocomplete
      await page.keyboard.insertText('pad')

      // Wait a bit for autocomplete to potentially appear
      await page.waitForTimeout(300)

      // Autocomplete dropdown should NOT be visible
      const autocomplete = page.locator('.cm-tooltip-autocomplete')
      await expect(autocomplete).not.toBeVisible()
    })

    test('DOES show autocomplete on normal lines', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Type "Box " first (component)
      await page.keyboard.type('Box ')

      // Type property that should trigger autocomplete
      await page.keyboard.type('pad')

      // Wait for autocomplete
      await page.waitForTimeout(300)

      // Autocomplete dropdown SHOULD be visible
      const autocomplete = page.locator('.cm-tooltip-autocomplete')
      await expect(autocomplete).toBeVisible()
    })

    test('does NOT show autocomplete on continuation lines of NL block', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Clear editor first
      await editorPage.clear()
      await page.waitForTimeout(100)

      // Start NL block - use insertText to avoid triggering other keymaps
      await page.keyboard.insertText('/ ein button')

      // Shift+Enter to continue
      await page.keyboard.press('Shift+Enter')

      // Type on continuation line
      await page.keyboard.insertText('mit pad')

      // Wait a bit
      await page.waitForTimeout(300)

      // Autocomplete should NOT appear (still in NL block)
      const autocomplete = page.locator('.cm-tooltip-autocomplete')
      await expect(autocomplete).not.toBeVisible()
    })
  })

  test.describe('Block Behavior', () => {
    test('Shift+Enter creates newline within NL block', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Start NL block
      await page.keyboard.type('/ zeile eins')

      // Shift+Enter to continue
      await page.keyboard.press('Shift+Enter')

      // Type second line
      await page.keyboard.type('zeile zwei')

      // Editor should contain both lines
      await editorPage.expectCodeContains('/ zeile eins')
      await editorPage.expectCodeContains('zeile zwei')
    })

    test('Enter removes the NL block (sends to LLM)', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Clear editor first
      await editorPage.clear()
      await page.waitForTimeout(100)

      // Start NL block - use insertText to avoid triggering other keymaps
      await page.keyboard.insertText('/ ein einfacher button')

      // Press Enter to send
      await page.keyboard.press('Enter')

      // Wait for the block removal to complete
      await page.waitForTimeout(200)

      // The "/" line should be removed (sent to LLM)
      // We can't easily check LLM response without mocking,
      // but we can verify the prompt line is gone
      const content = await page.locator('.cm-content').textContent()
      expect(content).not.toContain('/ ein einfacher button')
    })

    test('multi-line NL block is completely removed on Enter', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Clear editor first
      await editorPage.clear()
      await page.waitForTimeout(100)

      // Create multi-line NL block - use insertText to avoid triggering other keymaps
      await page.keyboard.insertText('/ ein formular mit')
      await page.keyboard.press('Shift+Enter')
      await page.keyboard.insertText('  name eingabe')
      await page.keyboard.press('Shift+Enter')
      await page.keyboard.insertText('  email eingabe')

      // Press Enter to send
      await page.keyboard.press('Enter')

      // Wait for the block removal to complete
      await page.waitForTimeout(200)

      // All lines of the block should be removed
      const content = await page.locator('.cm-content').textContent()
      expect(content).not.toContain('/ ein formular')
      expect(content).not.toContain('name eingabe')
      expect(content).not.toContain('email eingabe')
    })
  })

  test.describe('Context Preservation', () => {
    test('NL block inside existing code preserves context', async ({ editorPage, page }) => {
      // Set up some existing code
      await editorPage.setCode(`Card pad 16
  Title "Welcome"

  Text "Footer"`)

      await editorPage.focus()

      // Navigate to empty line (line 3)
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('End')

      // Type NL prompt
      await page.keyboard.type('/ add a button here')

      // Verify the surrounding code is still there
      await editorPage.expectCodeContains('Card pad 16')
      await editorPage.expectCodeContains('Title "Welcome"')
      await editorPage.expectCodeContains('Text "Footer"')
    })
  })

  test.describe('Edge Cases', () => {
    test('empty line after / block breaks the block', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Type NL block
      await page.keyboard.type('/ test prompt')
      await page.keyboard.press('Enter') // This sends the block

      // Now we're on a new line, outside NL mode
      // Typing should trigger autocomplete again
      await page.keyboard.type('pad')
      await page.waitForTimeout(300)

      // Autocomplete should appear (no longer in NL block)
      // Note: This depends on the block being removed
    })

    test('/ in middle of line does NOT trigger NL mode', async ({ editorPage, page }) => {
      await editorPage.focus()

      // Type something first, then /
      await page.keyboard.type('Button "Click / here"')

      // The / in the string should not affect anything
      await editorPage.expectCodeContains('Button "Click / here"')
    })
  })
})
