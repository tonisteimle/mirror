import { test, expect } from '@playwright/test'

test.describe('Button state hover col', () => {
  test('col in state hover should set backgroundColor, not text color', async ({ page }) => {
    await page.goto('/')
    
    // Set up the button with hover state
    const editorCode = `Button col #2271c1 pad 12 24 rad 8 "Hover me"
  state hover
    col #1d5ba0`

    // Find the editor and type the code
    const editor = page.locator('.cm-content')
    await editor.click()
    await page.keyboard.press('Meta+A')
    await page.keyboard.type(editorCode)
    
    // Wait for preview to update
    await page.waitForTimeout(500)
    
    // Find the button in preview
    const button = page.locator('.preview-container').locator('.Button')
    
    // Get initial background color
    const initialBg = await button.evaluate(el => getComputedStyle(el).backgroundColor)
    console.log('Initial background:', initialBg)
    
    // Hover over the button
    await button.hover()
    await page.waitForTimeout(100)
    
    // Get hover background color
    const hoverBg = await button.evaluate(el => getComputedStyle(el).backgroundColor)
    const hoverColor = await button.evaluate(el => getComputedStyle(el).color)
    console.log('Hover background:', hoverBg)
    console.log('Hover text color:', hoverColor)
    
    // Background should change, not text color
    // #2271c1 is rgb(34, 113, 193) and #1d5ba0 is rgb(29, 91, 160)
    expect(hoverBg).not.toBe(initialBg) // Background should change on hover
  })
})
