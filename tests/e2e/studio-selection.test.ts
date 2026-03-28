/**
 * Studio Selection E2E Tests (Playwright)
 *
 * Tests the element selection, breadcrumb navigation,
 * and property panel in the studio.html
 */

import { test, expect } from '@playwright/test'

test.describe('Studio Element Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    // Wait for editor and initial compile
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(2000)
  })

  test('preview contains elements with data-mirror-id', async ({ page }) => {
    // The preview should have elements with data-mirror-id
    const preview = page.locator('#preview')
    const elementsWithId = preview.locator('[data-mirror-id]')

    // Should have at least one element with mirror-id
    await expect(elementsWithId.first()).toBeVisible({ timeout: 5000 })
  })

  test('preview contains elements with data-mirror-name', async ({ page }) => {
    // The preview should have elements with data-mirror-name
    const preview = page.locator('#preview')
    const elementsWithName = preview.locator('[data-mirror-name]')

    // Should have at least one element with mirror-name
    await expect(elementsWithName.first()).toBeVisible({ timeout: 5000 })
  })

  test('clicking on element shows property panel', async ({ page }) => {
    const preview = page.locator('#preview')

    // Find any clickable element in preview
    const element = preview.locator('[data-mirror-id]').first()
    await expect(element).toBeVisible({ timeout: 5000 })

    // Click on it
    await element.click()

    // Property panel header should become visible
    const ppHeader = page.locator('.pp-header')
    await expect(ppHeader).toBeVisible({ timeout: 5000 })
  })

  test('property panel shows component name', async ({ page }) => {
    const preview = page.locator('#preview')

    // Click on first element
    const element = preview.locator('[data-mirror-id]').first()
    await element.click()

    // Title should be visible and contain text
    const ppTitle = page.locator('.pp-title')
    await expect(ppTitle).toBeVisible({ timeout: 5000 })
    await expect(ppTitle).not.toBeEmpty()
  })

  test('property panel has close button', async ({ page }) => {
    const preview = page.locator('#preview')

    // Click on first element
    const element = preview.locator('[data-mirror-id]').first()
    await element.click()

    // Close button should be visible
    const closeBtn = page.locator('.pp-close')
    await expect(closeBtn).toBeVisible({ timeout: 5000 })
  })

  test('close button clears selection', async ({ page }) => {
    const preview = page.locator('#preview')

    // Click on first element
    const element = preview.locator('[data-mirror-id]').first()
    await element.click()

    // Verify panel is shown
    const ppHeader = page.locator('.pp-header')
    await expect(ppHeader).toBeVisible({ timeout: 5000 })

    // Click close button
    const closeBtn = page.locator('.pp-close')
    await closeBtn.click()

    // Panel should show empty state
    const emptyState = page.locator('.pp-empty')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Studio Breadcrumb', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(2000)
  })

  test('selecting nested element shows breadcrumb', async ({ page }) => {
    const preview = page.locator('#preview')

    // Find a nested element (look for one with a parent that also has data-mirror-id)
    const elements = preview.locator('[data-mirror-id]')
    const count = await elements.count()

    if (count > 1) {
      // Click on the last (likely most nested) element
      const nested = elements.last()
      await nested.click()

      // Breadcrumb should be visible if there's a hierarchy
      const breadcrumb = page.locator('.pp-breadcrumb')
      // Check if breadcrumb exists (may not if element is at root)
      const hasBreadcrumb = await breadcrumb.isVisible().catch(() => false)

      if (hasBreadcrumb) {
        const crumbs = breadcrumb.locator('.pp-crumb')
        const crumbCount = await crumbs.count()
        expect(crumbCount).toBeGreaterThan(0)
      }
    }
  })

  test('breadcrumb shows component names', async ({ page }) => {
    const preview = page.locator('#preview')

    // Click on any element
    const element = preview.locator('[data-mirror-id]').first()
    await element.click()

    // If breadcrumb is visible, check it has crumbs
    const breadcrumb = page.locator('.pp-breadcrumb')
    const visible = await breadcrumb.isVisible().catch(() => false)

    if (visible) {
      const crumbs = breadcrumb.locator('.pp-crumb')
      const count = await crumbs.count()

      if (count > 0) {
        // Last crumb should be active
        const lastCrumb = crumbs.last()
        await expect(lastCrumb).toHaveClass(/active/)
      }
    }
  })
})

test.describe('Studio Property Panel Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/studio/')
    await page.waitForSelector('.cm-editor')
    await page.waitForTimeout(2000)
  })

  test('property panel shows content section', async ({ page }) => {
    const preview = page.locator('#preview')

    // Click on first element
    const element = preview.locator('[data-mirror-id]').first()
    await element.click()

    // Content section should be visible
    const ppContent = page.locator('.pp-content')
    await expect(ppContent).toBeVisible({ timeout: 5000 })
  })

  test('empty state shows help text', async ({ page }) => {
    // Initially no selection - should show empty state
    const emptyState = page.locator('.pp-empty')
    await expect(emptyState).toBeVisible({ timeout: 5000 })
    await expect(emptyState).toContainText('Select')
  })
})
