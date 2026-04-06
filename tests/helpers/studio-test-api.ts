/**
 * Studio Test API Helpers for Playwright
 *
 * Provides event-based waiting methods for testing Studio interactions.
 * Uses window.__STUDIO_TEST__ API registered by the Studio runtime.
 */

import type { Page } from '@playwright/test'

/**
 * Result from waiting for picker open
 */
export interface PickerOpenResult {
  pickerId: string
  pickerType: string
}

/**
 * Result from waiting for picker close
 */
export interface PickerCloseResult {
  pickerId: string
  reason: string
}

/**
 * Helper class for interacting with Studio in Playwright tests
 */
export class StudioTestHelper {
  constructor(private page: Page) {}

  /**
   * Wait for the Test API to be available
   */
  async waitForTestAPI(timeout: number = 5000): Promise<boolean> {
    try {
      await this.page.waitForFunction(
        () => typeof (window as any).__STUDIO_TEST__ !== 'undefined',
        { timeout }
      )
      return true
    } catch {
      return false
    }
  }

  /**
   * Wait for any picker to open
   * First checks if a picker is already open, then waits for event
   */
  async waitForPickerOpen(timeout: number = 5000): Promise<PickerOpenResult> {
    // First check if picker is already open (handles race condition)
    const alreadyOpen = await this.page.evaluate(() => {
      const testAPI = (window as any).__STUDIO_TEST__
      if (!testAPI) return null
      if (testAPI.isPickerOpen()) {
        // Return mock result for already open picker
        return {
          pickerId: 'already-open',
          pickerType: testAPI.getActivePickerType() || 'unknown',
        }
      }
      return null
    })

    if (alreadyOpen) {
      return alreadyOpen as PickerOpenResult
    }

    // Otherwise wait for the event
    return this.page.evaluate(
      (timeout) => (window as any).__STUDIO_TEST__.waitForPickerOpen(timeout),
      timeout
    )
  }

  /**
   * Wait for any picker to close
   * First checks if picker is already closed, then waits for event
   */
  async waitForPickerClose(timeout: number = 5000): Promise<PickerCloseResult> {
    // First check if picker is already closed (handles race condition)
    const alreadyClosed = await this.page.evaluate(() => {
      const testAPI = (window as any).__STUDIO_TEST__
      if (!testAPI) return null
      if (!testAPI.isPickerOpen()) {
        // Return mock result for already closed picker
        return {
          pickerId: 'already-closed',
          reason: 'unknown',
        }
      }
      return null
    })

    if (alreadyClosed) {
      return alreadyClosed as PickerCloseResult
    }

    // Otherwise wait for the event
    return this.page.evaluate(
      (timeout) => (window as any).__STUDIO_TEST__.waitForPickerClose(timeout),
      timeout
    )
  }

  /**
   * Wait for a specific trigger to activate
   */
  async waitForTrigger(triggerId: string, timeout: number = 5000): Promise<{ triggerId: string; startPos: number }> {
    return this.page.evaluate(
      ({ triggerId, timeout }) => (window as any).__STUDIO_TEST__.waitForTrigger(triggerId, timeout),
      { triggerId, timeout }
    )
  }

  /**
   * Wait for a specific trigger to deactivate
   */
  async waitForTriggerDeactivate(triggerId: string, timeout: number = 5000): Promise<{ triggerId: string }> {
    return this.page.evaluate(
      ({ triggerId, timeout }) => (window as any).__STUDIO_TEST__.waitForTriggerDeactivate(triggerId, timeout),
      { triggerId, timeout }
    )
  }

  /**
   * Check if any picker is currently open
   */
  async isPickerOpen(): Promise<boolean> {
    return this.page.evaluate(() => (window as any).__STUDIO_TEST__.isPickerOpen())
  }

  /**
   * Get the type of the currently active picker
   */
  async getActivePickerType(): Promise<string | null> {
    return this.page.evaluate(() => (window as any).__STUDIO_TEST__.getActivePickerType())
  }

  /**
   * Get the ID of the currently active trigger
   */
  async getActiveTrigger(): Promise<string | null> {
    return this.page.evaluate(() => (window as any).__STUDIO_TEST__.getActiveTrigger())
  }

  /**
   * Type text into the editor
   */
  async typeInEditor(text: string): Promise<void> {
    const editor = this.page.locator('.cm-editor .cm-content')
    await editor.click()
    await this.page.keyboard.type(text)
  }

  /**
   * Clear the editor and type new content
   */
  async setEditorContent(content: string): Promise<void> {
    const editor = this.page.locator('.cm-editor .cm-content')
    await editor.click()
    await this.page.keyboard.press('Meta+a')
    await this.page.keyboard.type(content)
  }

  /**
   * Get the current editor content
   */
  async getEditorContent(): Promise<string> {
    return this.page.locator('.cm-editor .cm-content').textContent() ?? ''
  }

  /**
   * Navigate picker selection down
   */
  async navigatePickerDown(): Promise<void> {
    await this.page.keyboard.press('ArrowDown')
  }

  /**
   * Navigate picker selection up
   */
  async navigatePickerUp(): Promise<void> {
    await this.page.keyboard.press('ArrowUp')
  }

  /**
   * Navigate picker selection left (for grid pickers)
   */
  async navigatePickerLeft(): Promise<void> {
    await this.page.keyboard.press('ArrowLeft')
  }

  /**
   * Navigate picker selection right (for grid pickers)
   */
  async navigatePickerRight(): Promise<void> {
    await this.page.keyboard.press('ArrowRight')
  }

  /**
   * Select the current picker item (Enter)
   */
  async selectPickerItem(): Promise<void> {
    await this.page.keyboard.press('Enter')
  }

  /**
   * Dismiss the current picker (Escape)
   */
  async dismissPicker(): Promise<void> {
    await this.page.keyboard.press('Escape')
  }

  /**
   * Wait for the editor to be ready
   */
  async waitForEditorReady(): Promise<void> {
    await this.page.waitForSelector('.cm-editor')
  }

  /**
   * Type trigger character and wait for picker to open
   * Uses state polling to reliably detect when picker opens.
   */
  async typeAndWaitForPicker(triggerChar: string, timeout: number = 5000): Promise<PickerOpenResult> {
    // Type the trigger character
    await this.page.keyboard.type(triggerChar)

    // Wait for the picker to open using state polling
    await this.page.waitForFunction(
      () => {
        const testAPI = (window as any).__STUDIO_TEST__
        return testAPI && testAPI.isPickerOpen()
      },
      { timeout }
    )

    // Get the picker info
    const pickerInfo = await this.page.evaluate(() => {
      const testAPI = (window as any).__STUDIO_TEST__
      return {
        pickerId: 'state-based',
        pickerType: testAPI.getActivePickerType() || 'unknown',
      }
    })

    // Wait for picker items to be available (for icon picker, wait for CDN icons)
    await this.waitForPickerItems(timeout)

    return pickerInfo as PickerOpenResult
  }

  /**
   * Dismiss picker and wait for it to close
   * Uses state polling to reliably detect when picker closes.
   */
  async dismissAndWaitForClose(timeout: number = 5000): Promise<PickerCloseResult> {
    // Press Escape to dismiss
    await this.page.keyboard.press('Escape')

    // Wait for the picker to close using state polling
    await this.page.waitForFunction(
      () => {
        const testAPI = (window as any).__STUDIO_TEST__
        return testAPI && !testAPI.isPickerOpen()
      },
      { timeout }
    )

    return {
      pickerId: 'state-based',
      reason: 'escape',
    }
  }

  /**
   * Select picker item and wait for close
   * Uses state polling to reliably detect when picker closes.
   */
  async selectAndWaitForClose(timeout: number = 5000): Promise<PickerCloseResult> {
    // Wait for icons to be available before selecting (avoids race with async icon loading)
    await this.waitForPickerItems(timeout)

    // Press Enter to select (search input has focus, handles Enter)
    await this.page.keyboard.press('Enter')

    // Wait for the picker to close using state polling
    await this.page.waitForFunction(
      () => {
        const testAPI = (window as any).__STUDIO_TEST__
        return testAPI && !testAPI.isPickerOpen()
      },
      { timeout }
    )

    return {
      pickerId: 'state-based',
      reason: 'select',
    }
  }

  /**
   * Wait for picker items to be available (icons loaded, tokens rendered, etc.)
   * For icon picker, waits for main grid items (not just recent section)
   */
  async waitForPickerItems(timeout: number = 5000): Promise<void> {
    // Wait for at least one selectable item in the main picker grid (not recent section)
    await this.page.waitForSelector(
      '.icon-picker-grid:not(.recent) .icon-picker-item, .token-picker-item, .color-picker-item, .animation-picker-item',
      { timeout }
    )
  }

  /**
   * Wait for compilation to complete
   */
  async waitForCompile(timeout: number = 5000): Promise<void> {
    await this.page.evaluate(
      (timeout) =>
        new Promise<void>((resolve, reject) => {
          const timeoutId = setTimeout(() => reject(new Error('Compile timeout')), timeout)
          const unsub = (window as any).__STUDIO_TEST__
            .getEventBus()
            .on('compile:completed', () => {
              clearTimeout(timeoutId)
              unsub()
              resolve()
            })
        }),
      timeout
    )
  }

  /**
   * Wait for any event to be emitted
   */
  async waitForEvent(eventName: string, timeout: number = 5000): Promise<any> {
    return this.page.evaluate(
      ({ eventName, timeout }) => (window as any).__STUDIO_TEST__.waitForEvent(eventName, timeout),
      { eventName, timeout }
    )
  }
}

/**
 * Create a StudioTestHelper for a page
 */
export function createStudioTestHelper(page: Page): StudioTestHelper {
  return new StudioTestHelper(page)
}
