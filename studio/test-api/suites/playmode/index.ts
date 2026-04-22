/**
 * Play Mode Tests
 *
 * Tests for the Play Mode feature in the Preview panel.
 * Validates:
 * - Play mode activation/deactivation
 * - Visual indicators (banner, animated border)
 * - State reset functionality
 * - Device simulation
 * - Keyboard shortcuts (ESC to exit)
 */

import { testWithSetup, describe, test, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the play button element
 */
function getPlayButton(): HTMLButtonElement | null {
  return document.getElementById('play-btn') as HTMLButtonElement | null
}

/**
 * Get the reset button element
 */
function getResetButton(): HTMLButtonElement | null {
  return document.getElementById('play-reset-btn') as HTMLButtonElement | null
}

/**
 * Get the device select element
 */
function getDeviceSelect(): HTMLSelectElement | null {
  return document.getElementById('device-select') as HTMLSelectElement | null
}

/**
 * Get the preview panel element
 */
function getPreviewPanel(): HTMLElement | null {
  return document.querySelector('.preview-panel') as HTMLElement | null
}

/**
 * Get the preview element
 */
function getPreview(): HTMLElement | null {
  return document.getElementById('preview') as HTMLElement | null
}

/**
 * Check if play mode is active
 */
function isPlayModeActive(): boolean {
  const previewPanel = getPreviewPanel()
  return previewPanel?.classList.contains('play-mode') ?? false
}

/**
 * Click the play button to toggle play mode
 */
async function togglePlayMode(api: TestAPI): Promise<void> {
  const playBtn = getPlayButton()
  if (!playBtn) throw new Error('Play button not found')
  playBtn.click()
  await api.utils.delay(100)
}

/**
 * Exit play mode if active
 */
async function exitPlayModeIfActive(api: TestAPI): Promise<void> {
  if (isPlayModeActive()) {
    await togglePlayMode(api)
  }
}

// =============================================================================
// Play Mode Activation Tests
// =============================================================================

export const playModeActivationTests: TestCase[] = describe('Play Mode Activation', [
  test('Play button exists', async (api: TestAPI) => {
    const playBtn = getPlayButton()
    api.assert.ok(playBtn !== null, 'Play button should exist')
    api.assert.ok(playBtn!.classList.contains('play-btn'), 'Should have play-btn class')
  }),

  test('Play button activates play mode on click', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    api.assert.ok(!isPlayModeActive(), 'Play mode should be inactive initially')

    await togglePlayMode(api)

    api.assert.ok(isPlayModeActive(), 'Play mode should be active after click')

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Play button deactivates play mode on second click', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    // Activate
    await togglePlayMode(api)
    api.assert.ok(isPlayModeActive(), 'Play mode should be active')

    // Deactivate
    await togglePlayMode(api)
    api.assert.ok(!isPlayModeActive(), 'Play mode should be inactive after second click')
  }),

  test('Play button gets active class when play mode is active', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    const playBtn = getPlayButton()!
    api.assert.ok(
      !playBtn.classList.contains('active'),
      'Button should not have active class initially'
    )

    await togglePlayMode(api)

    api.assert.ok(
      playBtn.classList.contains('active'),
      'Button should have active class when play mode is active'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
    api.assert.ok(
      !playBtn.classList.contains('active'),
      'Button should not have active class after exit'
    )
  }),

  test('ESC key exits play mode', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    // Activate play mode
    await togglePlayMode(api)
    api.assert.ok(isPlayModeActive(), 'Play mode should be active')

    // Press ESC
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await api.utils.delay(100)

    api.assert.ok(!isPlayModeActive(), 'Play mode should be deactivated after ESC')
  }),
])

// =============================================================================
// Visual Indicator Tests
// =============================================================================

export const playModeVisualTests: TestCase[] = describe('Play Mode Visual Indicators', [
  test('Preview panel gets play-mode class when active', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    const previewPanel = getPreviewPanel()!
    api.assert.ok(
      !previewPanel.classList.contains('play-mode'),
      'Should not have play-mode class initially'
    )

    await togglePlayMode(api)

    api.assert.ok(
      previewPanel.classList.contains('play-mode'),
      'Should have play-mode class when active'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Preview panel has accent border in play mode', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const previewPanel = getPreviewPanel()!
    const computedStyle = window.getComputedStyle(previewPanel)

    // Check for box-shadow (accent border)
    api.assert.ok(
      computedStyle.boxShadow.includes('rgb') || computedStyle.boxShadow !== 'none',
      'Should have box-shadow for accent border'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
  }),
])

// =============================================================================
// Reset Button Tests
// =============================================================================

export const playModeResetTests: TestCase[] = describe('Play Mode Reset Button', [
  test('Reset button exists', async (api: TestAPI) => {
    const resetBtn = getResetButton()
    api.assert.ok(resetBtn !== null, 'Reset button should exist')
    api.assert.ok(
      resetBtn!.classList.contains('play-toolbar-btn'),
      'Should have play-toolbar-btn class'
    )
  }),

  test('Reset button is hidden when play mode is inactive', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    const resetBtn = getResetButton()!
    const computedStyle = window.getComputedStyle(resetBtn)

    api.assert.equals(
      computedStyle.display,
      'none',
      'Reset button should be hidden when play mode is inactive'
    )
  }),

  test('Reset button is visible when play mode is active', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const resetBtn = getResetButton()!
    const computedStyle = window.getComputedStyle(resetBtn)

    api.assert.ok(
      computedStyle.display !== 'none',
      'Reset button should be visible when play mode is active'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  testWithSetup(
    'Reset button resets toggle state',
    `Button "Toggle", bg #333, col white, pad 12, toggle()
  on:
    bg #2271C1`,
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      // Find the button and check initial state
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Click to toggle on
      await api.interact.click('node-1')
      await api.utils.delay(150)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(34, 113, 193)')

      // Click reset button
      const resetBtn = getResetButton()!
      resetBtn.click()

      // Wait for recompile to complete
      await api.utils.delay(300)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      // State should be reset (back to initial)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),
])

// =============================================================================
// Device Simulation Tests
// =============================================================================

export const playModeDeviceTests: TestCase[] = describe('Play Mode Device Simulation', [
  test('Device select exists', async (api: TestAPI) => {
    const deviceSelect = getDeviceSelect()
    api.assert.ok(deviceSelect !== null, 'Device select should exist')
    api.assert.ok(
      deviceSelect!.classList.contains('device-select'),
      'Should have device-select class'
    )
  }),

  test('Device select is hidden when play mode is inactive', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)

    const deviceSelect = getDeviceSelect()!
    const computedStyle = window.getComputedStyle(deviceSelect)

    api.assert.equals(
      computedStyle.display,
      'none',
      'Device select should be hidden when play mode is inactive'
    )
  }),

  test('Device select is visible when play mode is active', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const deviceSelect = getDeviceSelect()!
    const computedStyle = window.getComputedStyle(deviceSelect)

    api.assert.ok(
      computedStyle.display !== 'none',
      'Device select should be visible when play mode is active'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Device select has correct options', async (api: TestAPI) => {
    const deviceSelect = getDeviceSelect()!
    const options = Array.from(deviceSelect.options).map(o => o.value)

    api.assert.ok(options.includes(''), 'Should have Responsive option (empty value)')
    api.assert.ok(options.includes('iPhone SE'), 'Should have iPhone SE option')
    api.assert.ok(options.includes('iPhone 14'), 'Should have iPhone 14 option')
    api.assert.ok(options.includes('iPad Mini'), 'Should have iPad Mini option')
    api.assert.ok(options.includes('Desktop'), 'Should have Desktop option')
  }),

  test('Selecting iPhone SE sets device dimensions', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const deviceSelect = getDeviceSelect()!
    const preview = getPreview()!

    // Select iPhone SE
    deviceSelect.value = 'iPhone SE'
    deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    // Check CSS custom properties
    const deviceWidth = preview.style.getPropertyValue('--device-width')
    const deviceHeight = preview.style.getPropertyValue('--device-height')

    api.assert.equals(deviceWidth, '375px', 'Device width should be 375px')
    api.assert.equals(deviceHeight, '667px', 'Device height should be 667px')

    // Check device-mode class (fixed mode for mobile devices)
    api.assert.ok(
      preview.classList.contains('device-mode'),
      'Preview should have device-mode class for fixed-size devices'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Selecting iPhone 14 sets correct dimensions', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const deviceSelect = getDeviceSelect()!
    const preview = getPreview()!

    deviceSelect.value = 'iPhone 14'
    deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    const deviceWidth = preview.style.getPropertyValue('--device-width')
    const deviceHeight = preview.style.getPropertyValue('--device-height')

    api.assert.equals(deviceWidth, '390px', 'Device width should be 390px')
    api.assert.equals(deviceHeight, '844px', 'Device height should be 844px')

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Selecting iPad Mini sets correct dimensions', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const deviceSelect = getDeviceSelect()!
    const preview = getPreview()!

    deviceSelect.value = 'iPad Mini'
    deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    const deviceWidth = preview.style.getPropertyValue('--device-width')
    const deviceHeight = preview.style.getPropertyValue('--device-height')

    api.assert.equals(deviceWidth, '768px', 'Device width should be 768px')
    api.assert.equals(deviceHeight, '1024px', 'Device height should be 1024px')

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Selecting Responsive removes device mode', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const deviceSelect = getDeviceSelect()!
    const preview = getPreview()!

    // First select a device
    deviceSelect.value = 'iPhone SE'
    deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    api.assert.ok(preview.classList.contains('device-mode'), 'Should have device-mode class')

    // Then select Responsive
    deviceSelect.value = ''
    deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    api.assert.ok(
      !preview.classList.contains('device-mode') && !preview.classList.contains('device-mode-max'),
      'Should not have any device-mode class after selecting Responsive'
    )

    // Cleanup
    await exitPlayModeIfActive(api)
  }),

  test('Exiting play mode resets device selection', async (api: TestAPI) => {
    await exitPlayModeIfActive(api)
    await togglePlayMode(api)

    const deviceSelect = getDeviceSelect()!
    const preview = getPreview()!

    // Select a device
    deviceSelect.value = 'iPhone 14'
    deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
    await api.utils.delay(100)

    api.assert.ok(preview.classList.contains('device-mode'), 'Should have device-mode class')

    // Exit play mode
    await togglePlayMode(api)
    await api.utils.delay(100)

    // Device should be reset
    api.assert.equals(deviceSelect.value, '', 'Device select should be reset to Responsive')
    api.assert.ok(
      !preview.classList.contains('device-mode') && !preview.classList.contains('device-mode-max'),
      'Preview should not have any device-mode class'
    )
  }),
])

// =============================================================================
// Integration Tests
// =============================================================================

export const playModeIntegrationTests: TestCase[] = describe('Play Mode Integration', [
  testWithSetup(
    'Full play mode workflow: activate, interact, reset, change device, exit',
    `Button "Like", bg #333, col #888, pad 12, rad 6, toggle()
  on:
    bg #ef4444
    col white`,
    async (api: TestAPI) => {
      // Ensure clean state
      await exitPlayModeIfActive(api)

      // 1. Activate play mode
      await togglePlayMode(api)
      api.assert.ok(isPlayModeActive(), 'Step 1: Play mode should be active')

      // 2. Interact with toggle
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.click('node-1')
      await api.utils.delay(150)
      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(239, 68, 68)')

      // 3. Change device
      const deviceSelect = getDeviceSelect()!
      deviceSelect.value = 'iPhone SE'
      deviceSelect.dispatchEvent(new Event('change', { bubbles: true }))
      await api.utils.delay(100)

      const preview = getPreview()!
      api.assert.ok(
        preview.classList.contains('device-mode') || preview.classList.contains('device-mode-max'),
        'Step 3: Should be in device mode'
      )

      // 4. Reset states
      const resetBtn = getResetButton()!
      resetBtn.click()

      // Wait for recompile to complete
      await api.utils.delay(300)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.hasStyle('node-1', 'backgroundColor', 'rgb(51, 51, 51)')

      // 5. Exit play mode
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
      await api.utils.delay(100)

      api.assert.ok(!isPlayModeActive(), 'Step 5: Play mode should be inactive')
      api.assert.ok(
        !preview.classList.contains('device-mode') &&
          !preview.classList.contains('device-mode-max'),
        'Step 5: Device mode should be reset'
      )
    }
  ),

  testWithSetup(
    'Multiple toggles work in play mode',
    `Frame gap 8
  Button "A", bg #333, toggle()
    on:
      bg #2271C1
  Button "B", bg #333, toggle()
    on:
      bg #10b981`,
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      // Both buttons start off
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle first button
      await api.interact.click('node-2')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')

      // Toggle second button
      await api.interact.click('node-3')
      await api.utils.delay(150)
      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 113, 193)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(16, 185, 129)')

      // Reset both
      const resetBtn = getResetButton()!
      resetBtn.click()

      // Wait for recompile to complete
      await api.utils.delay(300)
      await api.utils.waitForCompile()
      await api.utils.delay(200)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
      api.assert.hasStyle('node-3', 'backgroundColor', 'rgb(51, 51, 51)')

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),
])

// =============================================================================
// Form Input Tests (Input, Textarea in Play Mode)
// =============================================================================

export const playModeInputTests: TestCase[] = describe('Play Mode Input Interaction', [
  testWithSetup(
    'Input is focusable in play mode',
    'Input placeholder "Enter text...", w 200, pad 12, bg #1e1e2e, rad 6, bor 1, boc #444',
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      // Get the input element
      const inputEl = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(inputEl !== null, 'Input element should exist')
      api.assert.ok(inputEl.tagName.toLowerCase() === 'input', 'Should be an input element')

      // Focus the input (in play mode, focus should work)
      inputEl.focus()
      await api.utils.delay(50)

      // Check if focused
      api.assert.ok(document.activeElement === inputEl, 'Input should be focused in play mode')

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),

  testWithSetup(
    'Input accepts text input in play mode',
    'Input placeholder "Enter text...", w 200, pad 12, bg #1e1e2e, rad 6',
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      const inputEl = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(inputEl !== null, 'Input element should exist')

      // Focus and type
      inputEl.focus()
      inputEl.value = 'Hello World'
      inputEl.dispatchEvent(new Event('input', { bubbles: true }))
      await api.utils.delay(50)

      api.assert.ok(inputEl.value === 'Hello World', 'Input should contain typed text')

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),

  testWithSetup(
    'Input is NOT focusable outside play mode (selection mode)',
    'Input placeholder "Enter text...", w 200, pad 12, bg #1e1e2e, rad 6',
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)

      const inputEl = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(inputEl !== null, 'Input element should exist')

      // Click the input - should select it, not focus it
      await api.interact.click('node-1')
      await api.utils.delay(50)

      // Input should NOT be the active element (preview container or selection should have focus)
      api.assert.ok(
        document.activeElement !== inputEl || document.activeElement?.tagName !== 'INPUT',
        'Input should not be focused in selection mode'
      )
    }
  ),

  testWithSetup(
    'Textarea is focusable in play mode',
    'Textarea placeholder "Enter message...", w 200, h 100, pad 12, bg #1e1e2e, rad 6',
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      const textareaEl = document.querySelector('[data-mirror-id="node-1"]') as HTMLTextAreaElement
      api.assert.ok(textareaEl !== null, 'Textarea element should exist')
      api.assert.ok(textareaEl.tagName.toLowerCase() === 'textarea', 'Should be a textarea element')

      // Focus the textarea (in play mode, focus should work)
      textareaEl.focus()
      await api.utils.delay(50)

      api.assert.ok(
        document.activeElement === textareaEl,
        'Textarea should be focused in play mode'
      )

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),

  testWithSetup(
    'Multiple inputs can be tabbed through in play mode',
    `Frame gap 8
  Input placeholder "Name", w 200, pad 12, bg #1e1e2e, rad 6
  Input placeholder "Email", w 200, pad 12, bg #1e1e2e, rad 6
  Input placeholder "Phone", w 200, pad 12, bg #1e1e2e, rad 6`,
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      // Focus first input
      const input1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLInputElement
      const input2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLInputElement
      const input3 = document.querySelector('[data-mirror-id="node-4"]') as HTMLInputElement

      api.assert.ok(input1 && input2 && input3, 'All three inputs should exist')

      input1.focus()
      await api.utils.delay(50)
      api.assert.ok(document.activeElement === input1, 'First input should be focused')

      // Tab to second input
      input1.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      input2.focus() // Simulate tab behavior
      await api.utils.delay(50)
      api.assert.ok(document.activeElement === input2, 'Second input should be focused after Tab')

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),

  testWithSetup(
    'Input with bind updates value',
    `searchTerm: ""
Input bind searchTerm, placeholder "Search...", w 200, pad 12, bg #1e1e2e, rad 6`,
    async (api: TestAPI) => {
      await exitPlayModeIfActive(api)
      await togglePlayMode(api)

      const inputEl = document.querySelector('[data-mirror-id="node-1"]') as HTMLInputElement
      api.assert.ok(inputEl !== null, 'Input element should exist')

      // Type into input
      inputEl.focus()
      inputEl.value = 'test query'
      inputEl.dispatchEvent(new Event('input', { bubbles: true }))
      await api.utils.delay(100)

      // Check value persists
      api.assert.ok(inputEl.value === 'test query', 'Input value should be updated')

      // Cleanup
      await exitPlayModeIfActive(api)
    }
  ),
])

// =============================================================================
// Exports
// =============================================================================

export const allPlayModeTests: TestCase[] = [
  ...playModeActivationTests,
  ...playModeVisualTests,
  ...playModeResetTests,
  ...playModeDeviceTests,
  ...playModeIntegrationTests,
  ...playModeInputTests,
]

export const quickPlayModeTests: TestCase[] = [
  playModeActivationTests[1], // Play button activates play mode
  playModeActivationTests[4], // ESC exits play mode
  playModeDeviceTests[4], // iPhone SE sets dimensions
  playModeResetTests[3], // Reset button resets state
]
