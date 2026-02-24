/**
 * Picker Behavior E2E Tests
 *
 * Tests that pickers stay open when selecting options
 * and only close on Enter or Escape.
 */

import { test, expect } from '../fixtures'

test.describe('Picker Behavior', () => {
  test.describe('Input Panel', () => {
    test('stays open when selecting input type', async ({ editorPage }) => {
      // Type "Input " to trigger the input panel
      await editorPage.focus()
      await editorPage.page.keyboard.type('Input ')

      // Wait for panel to appear
      const inputPanel = editorPage.page.getByTestId('panel-input-picker')
      await expect(inputPanel).toBeVisible({ timeout: 2000 })

      // Click on "Email" type button
      const emailButton = inputPanel.getByRole('button', { name: /email/i })
      await emailButton.click()

      // Panel should still be visible after clicking
      await expect(inputPanel).toBeVisible()

      // Click on "Number" type button
      const numberButton = inputPanel.getByRole('button', { name: /number/i })
      await numberButton.click()

      // Panel should still be visible
      await expect(inputPanel).toBeVisible()

      // Press Enter to confirm and close
      await editorPage.page.keyboard.press('Enter')

      // Now panel should be closed
      await expect(inputPanel).not.toBeVisible()
    })

    test('closes on Escape', async ({ editorPage }) => {
      await editorPage.focus()
      await editorPage.page.keyboard.type('Input ')

      const inputPanel = editorPage.page.getByTestId('panel-input-picker')
      await expect(inputPanel).toBeVisible({ timeout: 2000 })

      // Press Escape to close
      await editorPage.page.keyboard.press('Escape')

      // Panel should be closed
      await expect(inputPanel).not.toBeVisible()
    })

    test('updates code live while selecting', async ({ editorPage }) => {
      await editorPage.focus()
      await editorPage.page.keyboard.type('Input ')

      const inputPanel = editorPage.page.getByTestId('panel-input-picker')
      await expect(inputPanel).toBeVisible({ timeout: 2000 })

      // Click on "Email" type button
      const emailButton = inputPanel.getByRole('button', { name: /email/i })
      await emailButton.click()

      // Editor should show the updated code
      await editorPage.expectCodeContains('type email')

      // Click on "Password" type button
      const passwordButton = inputPanel.getByRole('button', { name: /password/i })
      await passwordButton.click()

      // Editor should show the updated code
      await editorPage.expectCodeContains('type password')

      // Panel should still be open
      await expect(inputPanel).toBeVisible()
    })
  })

  test.describe('Layout Panel', () => {
    test('stays open when clicking direction buttons', async ({ editorPage }) => {
      // Type "Box " to trigger layout panel
      await editorPage.focus()
      await editorPage.page.keyboard.type('Box ')

      // Wait for panel to appear
      const layoutPanel = editorPage.page.getByTestId('panel-layout-picker')
      await expect(layoutPanel).toBeVisible({ timeout: 2000 })

      // Click on a button in the panel (direction toggle)
      const buttons = layoutPanel.locator('button')
      const buttonCount = await buttons.count()

      if (buttonCount > 0) {
        await buttons.first().click()

        // Panel should still be visible
        await expect(layoutPanel).toBeVisible()
      }

      // Press Escape to close
      await editorPage.page.keyboard.press('Escape')
      await expect(layoutPanel).not.toBeVisible()
    })
  })
})
