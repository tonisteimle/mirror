/**
 * Simple Token Picker Test
 *
 * Simplified version to debug what's happening
 */

import { test, expect } from '@playwright/test'

test('simple token picker test', async ({ page }) => {
  // Navigate and wait
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor', { timeout: 10000 })
  await page.waitForTimeout(2000)  // Wait for full initialization

  // Check Test API
  const hasTestAPI = await page.evaluate(() => typeof (window as any).__STUDIO_TEST__ !== 'undefined')
  console.log('Has Test API:', hasTestAPI)
  expect(hasTestAPI).toBe(true)

  // Click on editor
  const editor = page.locator('.cm-editor .cm-content')
  await editor.click()

  // Type content directly (not using select-all)
  await page.keyboard.type('$primary.bg: blue\n\nButton bg ')

  // Wait for any processing
  await page.waitForTimeout(500)

  // Type the trigger character
  await page.keyboard.type('$')

  // Wait for picker to open using state polling
  await page.waitForFunction(
    () => {
      const testAPI = (window as any).__STUDIO_TEST__
      return testAPI && testAPI.isPickerOpen()
    },
    { timeout: 5000 }
  )

  // Check state
  const isOpen = await page.evaluate(() => (window as any).__STUDIO_TEST__.isPickerOpen())
  const pickerType = await page.evaluate(() => (window as any).__STUDIO_TEST__.getActivePickerType())

  console.log('Picker is open:', isOpen)
  console.log('Picker type:', pickerType)

  expect(isOpen).toBe(true)
  expect(pickerType).toBe('token')

  // Check DOM element
  const tokenPicker = page.locator('.token-picker')
  await expect(tokenPicker).toBeVisible()
})

test('token picker with setEditorContent helper', async ({ page }) => {
  // Navigate and wait
  await page.goto('/studio/')
  await page.waitForSelector('.cm-editor', { timeout: 10000 })
  await page.waitForTimeout(2000)  // Wait for full initialization

  // Check Test API
  const hasTestAPI = await page.evaluate(() => typeof (window as any).__STUDIO_TEST__ !== 'undefined')
  expect(hasTestAPI).toBe(true)

  // Use the same approach as setEditorContent helper
  const editor = page.locator('.cm-editor .cm-content')
  await editor.click()
  await page.keyboard.press('Meta+a')  // Select all
  await page.keyboard.type('$primary.bg: blue\n\nButton bg ')  // Type WITHOUT trigger

  // Wait for any processing
  await page.waitForTimeout(500)

  // Now type the trigger character
  await page.keyboard.type('$')

  // Wait for picker to open using state polling
  await page.waitForFunction(
    () => {
      const testAPI = (window as any).__STUDIO_TEST__
      return testAPI && testAPI.isPickerOpen()
    },
    { timeout: 5000 }
  )

  // Verify
  const isOpen = await page.evaluate(() => (window as any).__STUDIO_TEST__.isPickerOpen())
  expect(isOpen).toBe(true)
})
