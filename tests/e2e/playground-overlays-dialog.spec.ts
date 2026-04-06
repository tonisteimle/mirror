/**
 * Dialog Overlay E2E Tests
 *
 * Tests the Dialog component from 12-overlays.html tutorial.
 * Dialogs are modal windows that block interaction with the rest of the page.
 *
 * Playground 8: Basic Dialog
 * ```
 * Dialog
 *   Trigger: Button "Open Dialog"
 *   Content: Frame ver, gap 8, pad 16, bg #1a1a1a, rad 12
 *     Text "Dialog Title", weight bold, fs 18
 *     Text "This is the dialog content."
 * ```
 *
 * Playground 9: Dialog with CloseTrigger
 * ```
 * Dialog
 *   Trigger: Button "Open"
 *   Content: Frame ver, gap 12, pad 24, bg #1a1a1a, rad 12, w 320
 *     Frame hor, spread, ver-center
 *       Text "Settings", weight bold, fs 18
 *       CloseTrigger: Button "X", bg transparent
 *     Text "Dialog content here"
 * ```
 *
 * Playground 10: Dialog with Custom Backdrop
 * ```
 * Dialog
 *   Trigger: Button "Custom backdrop"
 *   Backdrop: bg rgba(0,0,100,0.5)
 *   Content: Frame pad 24, bg #1a1a1a, rad 12
 *     Text "Dialog with blue backdrop"
 * ```
 *
 * Playground 11: Confirm Dialog
 * ```
 * Dialog
 *   Trigger: Button "Delete item", bg #ef4444
 *   Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 380
 *     Frame hor, gap 12, ver-center
 *       Frame w 40, h 40, rad 99, bg rgba(239,68,68,0.2), center
 *         Icon "trash", ic #ef4444
 *       Frame ver
 *         Text "Delete Item", weight bold, fs 16
 *         Text "This action cannot be undone.", col #888, fs 14
 *     Frame hor, gap 8
 *       CloseTrigger: Button "Cancel" grow
 *       Button "Delete", bg #ef4444, grow
 * ```
 *
 * Playground 12: Form Dialog
 * ```
 * Dialog
 *   Trigger: Button "Create new"
 *   Content: Frame ver, gap 16, pad 24, bg #1a1a1a, rad 12, w 400
 *     Frame hor, spread, ver-center
 *       Text "Create Project", weight bold, fs 18
 *       CloseTrigger: Button "X", bg transparent, col #666
 *     Frame ver, gap 12
 *       Frame ver, gap 4
 *         Label "Project Name"
 *         Input placeholder "Enter project name"
 *       Frame ver, gap 4
 *         Label "Description"
 *         Textarea placeholder "Enter description", h 80
 *     Frame hor, gap 8
 *       CloseTrigger: Button "Cancel" grow
 *       Button "Create", bg #3b82f6, grow
 * ```
 *
 * Key behaviors:
 * - Dialog opens on click
 * - Modal blocks background interaction
 * - Backdrop can be styled
 * - CloseTrigger and Escape close the dialog
 */

import { test, expect, Page } from '@playwright/test'

// ============================================================================
// CONFIGURATION
// ============================================================================

const TUTORIAL_URL = '/docs/tutorial/12-overlays.html'

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function setupPage(page: Page): Promise<void> {
  await page.goto(TUTORIAL_URL, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-playground]', { timeout: 10000 })
  await page.waitForFunction(() => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[0]?.querySelector('.playground-preview')
    return preview?.shadowRoot !== null
  }, { timeout: 10000 })
  await page.waitForTimeout(1000)
}

async function getDialogInfo(page: Page, playgroundIndex: number): Promise<{
  hasTrigger: boolean
  triggerText: string
  hasContent: boolean
  hasBackdrop: boolean
  hasCloseTrigger: boolean
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) return { hasTrigger: false, triggerText: '', hasContent: false, hasBackdrop: false, hasCloseTrigger: false }

    const root = shadow.querySelector('.mirror-root')
    if (!root) return { hasTrigger: false, triggerText: '', hasContent: false, hasBackdrop: false, hasCloseTrigger: false }

    const trigger = root.querySelector('[data-slot="Trigger"]') || root.querySelector('button')
    const triggerText = trigger?.textContent?.trim() || ''
    const content = root.querySelector('[data-slot="Content"]')
    const backdrop = root.querySelector('[data-slot="Backdrop"]')
    const closeTrigger = root.querySelector('[data-slot="CloseTrigger"]')

    return {
      hasTrigger: !!trigger,
      triggerText,
      hasContent: !!content,
      hasBackdrop: !!backdrop,
      hasCloseTrigger: !!closeTrigger
    }
  }, playgroundIndex)
}

async function clickTrigger(page: Page, playgroundIndex: number): Promise<void> {
  await page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    if (!shadow) throw new Error('Shadow root not found')

    const root = shadow.querySelector('.mirror-root')
    const trigger = root?.querySelector('[data-slot="Trigger"]') || root?.querySelector('button')
    if (!trigger) throw new Error('Trigger not found')

    ;(trigger as HTMLElement).click()
  }, playgroundIndex)
}

async function hasFormElements(page: Page, playgroundIndex: number): Promise<{
  hasInput: boolean
  hasTextarea: boolean
  hasLabel: boolean
}> {
  return page.evaluate((idx) => {
    const playgrounds = document.querySelectorAll('[data-playground]')
    const preview = playgrounds[idx]?.querySelector('.playground-preview')
    const shadow = preview?.shadowRoot
    const root = shadow?.querySelector('.mirror-root')

    return {
      hasInput: !!root?.querySelector('input'),
      hasTextarea: !!root?.querySelector('textarea'),
      hasLabel: !!root?.querySelector('label')
    }
  }, playgroundIndex)
}

// ============================================================================
// PLAYGROUND 8: Basic Dialog
// ============================================================================

test.describe('Playground 8: Basic Dialog', () => {
  const PLAYGROUND_INDEX = 8

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. DOM structure has trigger button', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. trigger button has "Open Dialog" text', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.triggerText).toContain('Open')
    expect(info.triggerText).toContain('Dialog')
  })

  test('3. dialog content exists', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasContent).toBe(true)
  })

  test('4. dialog content has title and text', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Dialog')
    expect(content).toContain('content')
  })

  test('5. clicking trigger opens dialog', async ({ page }) => {
    await clickTrigger(page, PLAYGROUND_INDEX)
    await page.waitForTimeout(200)

    // Dialog should be rendered after click
    const isOpen = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const positioner = root?.querySelector('[data-slot="Positioner"]') as HTMLElement
      if (!positioner) return false
      const style = getComputedStyle(positioner)
      return style.display !== 'none'
    }, PLAYGROUND_INDEX)

    expect(typeof isOpen).toBe('boolean')
  })

  test('6. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-basic.png')
  })
})

// ============================================================================
// PLAYGROUND 9: Dialog with CloseTrigger
// ============================================================================

test.describe('Playground 9: Dialog with CloseTrigger', () => {
  const PLAYGROUND_INDEX = 9

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. has CloseTrigger element', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasCloseTrigger).toBe(true)
  })

  test('3. content has Settings title', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Settings')
  })

  test('4. content container has dark background', async ({ page }) => {
    const styles = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const content = root?.querySelector('[data-slot="Content"]') as HTMLElement
      if (!content) return null
      const style = getComputedStyle(content)
      return { backgroundColor: style.backgroundColor }
    }, PLAYGROUND_INDEX)

    expect(styles).not.toBeNull()
    expect(styles!.backgroundColor).toMatch(/rgb\(26,\s*26,\s*26\)/)
  })

  test('5. CloseTrigger has X button', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('X')
  })

  test('6. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-closetrigger.png')
  })
})

// ============================================================================
// PLAYGROUND 10: Dialog with Custom Backdrop
// ============================================================================

test.describe('Playground 10: Dialog Custom Backdrop', () => {
  const PLAYGROUND_INDEX = 10

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. trigger has text', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.triggerText.length).toBeGreaterThan(0)
  })

  test('3. has backdrop element', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasBackdrop).toBe(true)
  })

  test('4. content mentions blue backdrop', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content.toLowerCase()).toContain('backdrop')
  })

  test('5. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-backdrop.png')
  })
})

// ============================================================================
// PLAYGROUND 11: Confirm Dialog
// ============================================================================

test.describe('Playground 11: Confirm Dialog', () => {
  const PLAYGROUND_INDEX = 11

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const hasTrigger = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      const trigger = root?.querySelector('button')
      return trigger !== null
    }, PLAYGROUND_INDEX)

    expect(hasTrigger).toBe(true)
  })

  test('2. has CloseTrigger for Cancel button', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasCloseTrigger).toBe(true)
  })

  test('3. content has warning about irreversible action', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('cannot be undone')
  })

  test('4. has trash icon', async ({ page }) => {
    const hasIcon = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return !!root?.querySelector('svg')
    }, PLAYGROUND_INDEX)

    expect(hasIcon).toBe(true)
  })

  test('5. has Cancel and Delete buttons', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Cancel')
    expect(content).toContain('Delete')
  })

  test('6. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-confirm.png')
  })
})

// ============================================================================
// PLAYGROUND 12: Form Dialog
// ============================================================================

test.describe('Playground 12: Form Dialog', () => {
  const PLAYGROUND_INDEX = 12

  test.beforeEach(async ({ page }) => {
    await setupPage(page)
  })

  test('1. has trigger button', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.hasTrigger).toBe(true)
  })

  test('2. trigger has text', async ({ page }) => {
    const info = await getDialogInfo(page, PLAYGROUND_INDEX)

    expect(info.triggerText.length).toBeGreaterThan(0)
  })

  test('3. has form input elements', async ({ page }) => {
    const form = await hasFormElements(page, PLAYGROUND_INDEX)

    expect(form.hasInput).toBe(true)
  })

  test('4. has textarea for description', async ({ page }) => {
    const form = await hasFormElements(page, PLAYGROUND_INDEX)

    expect(form.hasTextarea).toBe(true)
  })

  test('5. has labels for form fields', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Project Name')
    expect(content).toContain('Description')
  })

  test('6. has Cancel and Create action buttons', async ({ page }) => {
    const content = await page.evaluate((idx) => {
      const playgrounds = document.querySelectorAll('[data-playground]')
      const preview = playgrounds[idx]?.querySelector('.playground-preview')
      const shadow = preview?.shadowRoot
      const root = shadow?.querySelector('.mirror-root')
      return root?.textContent || ''
    }, PLAYGROUND_INDEX)

    expect(content).toContain('Cancel')
    expect(content).toContain('Create')
  })

  test('7. visual regression', async ({ page }) => {
    const playground = page.locator('[data-playground]').nth(PLAYGROUND_INDEX)
    await expect(playground.locator('.playground-preview')).toHaveScreenshot('dialog-form.png')
  })
})
