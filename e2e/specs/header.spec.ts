/**
 * Header E2E Tests
 *
 * Tests for the Mirror header bar using Page Object Models.
 */

import { test, expect } from '../fixtures'

test.describe('Header', () => {
  test.describe('Visibility', () => {
    test('header bar is visible', async ({ headerPage }) => {
      await headerPage.expectVisible()
    })

    test('logo is visible', async ({ headerPage }) => {
      await headerPage.expectLogoVisible()
    })
  })

  test.describe('Menu', () => {
    test('opens and closes menu', async ({ headerPage }) => {
      await headerPage.openMenu()
      await expect(headerPage.page.getByRole('menu')).toBeVisible()

      await headerPage.closeMenu()
      await expect(headerPage.page.getByRole('menu')).not.toBeVisible()
    })

    test('menu items are accessible', async ({ headerPage }) => {
      await headerPage.openMenu()

      // Check all menu items are visible
      await expect(headerPage.menuItem('new')).toBeVisible()
      await expect(headerPage.menuItem('open')).toBeVisible()
      await expect(headerPage.menuItem('save')).toBeVisible()
      await expect(headerPage.menuItem('export')).toBeVisible()
      await expect(headerPage.menuItem('settings')).toBeVisible()
    })

    test('menu items have correct roles', async ({ headerPage }) => {
      await headerPage.openMenu()

      // All items should have role="menuitem"
      const menuItems = headerPage.page.getByRole('menuitem')
      await expect(menuItems).toHaveCount(7) // New, Open, Save, Export, Tutorial, Reference, Settings
    })
  })

  test.describe('Accessibility', () => {
    test('header has banner role', async ({ headerPage }) => {
      await expect(headerPage.header).toHaveAttribute('role', 'banner')
    })

    test('menu trigger has aria-haspopup', async ({ headerPage }) => {
      await expect(headerPage.menuTrigger).toHaveAttribute('aria-haspopup', 'true')
    })

    test('menu trigger updates aria-expanded', async ({ headerPage }) => {
      await expect(headerPage.menuTrigger).toHaveAttribute('aria-expanded', 'false')

      await headerPage.openMenu()
      await expect(headerPage.menuTrigger).toHaveAttribute('aria-expanded', 'true')
    })
  })
})
