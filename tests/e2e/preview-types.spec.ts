import { test, expect } from '@playwright/test'

test('preview shows tokens when tokens file is selected', async ({ page }) => {
  await page.goto('/studio/')
  await page.waitForTimeout(1000)

  // Look for tokens.mirror file in the file list
  const tokensFile = page.locator('.file[data-file="tokens.mirror"]')

  if (await tokensFile.count() > 0) {
    // Click on tokens file
    await tokensFile.click()
    await page.waitForTimeout(500)

    // Check that preview has tokens-preview class
    const preview = page.locator('#preview')
    const previewClass = await preview.getAttribute('class')
    console.log('Preview class after selecting tokens file:', previewClass)
    expect(previewClass).toBe('tokens-preview')

    // Check for tokens preview content
    const tokensSection = page.locator('.tokens-preview-section')
    const tokensCount = await tokensSection.count()
    console.log('Tokens sections found:', tokensCount)
    expect(tokensCount).toBeGreaterThan(0)

    // Take screenshot
    await preview.screenshot({ path: '/tmp/tokens-preview.png' })
  } else {
    console.log('No tokens.mirror file found in demo')
  }
})

test('preview shows components when components file is selected', async ({ page }) => {
  await page.goto('/studio/')
  await page.waitForTimeout(1000)

  // Look for components.mirror file in the file list
  const componentsFile = page.locator('.file[data-file="components.mirror"]')

  if (await componentsFile.count() > 0) {
    // Click on components file
    await componentsFile.click()
    await page.waitForTimeout(500)

    // Check that preview has components-preview class
    const preview = page.locator('#preview')
    const previewClass = await preview.getAttribute('class')
    console.log('Preview class after selecting components file:', previewClass)
    expect(previewClass).toBe('components-preview')

    // Check for components preview content
    const componentsSection = page.locator('.components-preview-section')
    const componentsCount = await componentsSection.count()
    console.log('Components sections found:', componentsCount)
    expect(componentsCount).toBeGreaterThan(0)

    // Take screenshot
    await preview.screenshot({ path: '/tmp/components-preview.png' })
  } else {
    console.log('No components.mirror file found in demo')
  }
})

test('preview shows UI when layout file is selected', async ({ page }) => {
  await page.goto('/studio/')
  await page.waitForTimeout(1000)

  // Look for index.mirror or any layout file
  const indexFile = page.locator('.file[data-file="index.mirror"]')

  if (await indexFile.count() > 0) {
    // Click on layout file
    await indexFile.click()
    await page.waitForTimeout(500)

    // Check that preview does NOT have tokens-preview or components-preview class
    const preview = page.locator('#preview')
    const previewClass = await preview.getAttribute('class') || ''
    console.log('Preview class after selecting layout file:', previewClass)
    expect(previewClass).not.toContain('tokens-preview')
    expect(previewClass).not.toContain('components-preview')

    // Should have rendered elements with data-mirror-id
    const mirrorElements = page.locator('[data-mirror-id]')
    const count = await mirrorElements.count()
    console.log('Mirror elements found:', count)
    expect(count).toBeGreaterThan(0)

    // Take screenshot
    await preview.screenshot({ path: '/tmp/layout-preview.png' })
  }
})
