/**
 * Color Picker Token Tests
 *
 * Tests that verify the color picker displays token colors correctly
 * and allows selecting them to change element properties.
 */

import { test, testSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// Demo project tokens (for tokens.tok file)
const DEMO_TOKENS_FILE = `// Design Tokens
primary.bg: #3b82f6
secondary.bg: #8b5cf6
success.bg: #10b981
danger.bg: #ef4444
warning.bg: #f59e0b

text.col: #ffffff
muted.col: #94a3b8
`

// Layout code (for index.mir file)
const DEMO_LAYOUT = `// Layout
Frame bg #1a1a1a, pad 24, gap 16
  Text "Demo Project", col white, fs 24
  Button "Click me", bg #333333, col white, pad 12 24, rad 8
`

/**
 * Helper to setup demo project with tokens
 */
async function setupDemoProject(api: TestAPI): Promise<void> {
  // Use unique filenames to avoid conflicts with existing files
  const tokenFileName = `demo-tokens-${Date.now()}.tok`
  const layoutFileName = `demo-layout-${Date.now()}.mir`

  // Directly populate window.files
  const windowFiles = (window as any).files || {}
  ;(window as any).files = windowFiles

  // Add tokens file to window.files
  windowFiles[tokenFileName] = DEMO_TOKENS_FILE

  // Set the layout code directly in the editor
  await api.editor.setCode(DEMO_LAYOUT)
  await api.utils.waitForCompile()
  await api.utils.delay(300)
}

/**
 * Helper to click on a color trigger in the property panel
 */
async function openColorPicker(api: TestAPI, property: 'bg' | 'color'): Promise<boolean> {
  const trigger = document.querySelector(`[data-color-prop="${property}"]`) as HTMLElement
  if (!trigger) {
    console.log('Color trigger not found for property:', property)
    return false
  }
  trigger.click()
  await api.utils.delay(300)
  return true
}

/**
 * Helper to check if color picker is visible
 */
function isColorPickerVisible(): boolean {
  const picker = document.getElementById('color-picker')
  return picker?.classList.contains('visible') ?? false
}

/**
 * Helper to get token colors from the color picker
 */
function getTokenColorsFromPicker(): Array<{ name: string; color: string }> {
  const tokenGrid = document.getElementById('color-picker-token-grid')
  if (!tokenGrid) return []

  // The swatches have class 'token-swatch', not 'color-swatch'
  const swatches = tokenGrid.querySelectorAll('.token-swatch')
  const tokens: Array<{ name: string; color: string }> = []

  swatches.forEach(swatch => {
    const el = swatch as HTMLElement
    tokens.push({
      name: el.title || '',
      color: el.dataset.color || '',
    })
  })

  return tokens
}

/**
 * Helper to click a token color in the picker
 */
async function selectTokenColor(api: TestAPI, tokenName: string): Promise<boolean> {
  const tokenGrid = document.getElementById('color-picker-token-grid')
  if (!tokenGrid) return false

  // The swatches have class 'token-swatch'
  const swatches = tokenGrid.querySelectorAll('.token-swatch')
  for (const swatch of swatches) {
    const el = swatch as HTMLElement
    if (el.title === tokenName) {
      el.click()
      await api.utils.delay(400)
      return true
    }
  }
  return false
}

/**
 * Helper to select a color from the palette
 */
async function selectPaletteColor(api: TestAPI, hexColor: string): Promise<boolean> {
  const picker = document.getElementById('color-picker')
  if (!picker) return false

  // Find any swatch with matching color
  const swatches = picker.querySelectorAll('.color-swatch')
  for (const swatch of swatches) {
    const el = swatch as HTMLElement
    if (el.dataset.color?.toUpperCase() === hexColor.toUpperCase()) {
      el.click()
      await api.utils.delay(400)
      return true
    }
  }
  return false
}

export const colorPickerTests: TestCase[] = describe('Color Picker', [
  // SKIPPED: Dynamic token file injection via window.files doesn't trigger prelude rebuild
  // The studio requires proper file loading for tokens to be compiled and available
  testSkip('Color picker shows token colors for background property', async (api: TestAPI) => {
    // Setup demo project with tokens
    await setupDemoProject(api)

    // Verify button exists (node-2 is the Button in this layout)
    api.assert.exists('node-2', 'Button should exist')

    // Select the button
    await api.studio.setSelection('node-2')
    await api.utils.delay(200)

    // Verify property panel is visible
    api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

    // Open color picker for background
    const opened = await openColorPicker(api, 'bg')
    api.assert.ok(opened, 'Should be able to open color picker')
    api.assert.ok(isColorPickerVisible(), 'Color picker should be visible')

    // Get token colors from picker
    const tokenColors = getTokenColorsFromPicker()

    // Verify token colors are displayed (we defined 7 tokens, 5 are .bg)
    api.assert.ok(
      tokenColors.length >= 5,
      `Should have at least 5 token colors, got ${tokenColors.length}`
    )

    // Check for specific tokens
    const primaryToken = tokenColors.find(t => t.name.includes('primary'))
    api.assert.ok(primaryToken !== undefined, 'Should have primary token')

    const successToken = tokenColors.find(t => t.name.includes('success'))
    api.assert.ok(successToken !== undefined, 'Should have success token')

    // Close picker by pressing Escape
    await api.interact.pressKey('Escape')
    await api.utils.delay(200)
  }),

  // SKIPPED: Dynamic token file injection via window.files doesn't trigger prelude rebuild
  testSkip('Selecting token color changes button background', async (api: TestAPI) => {
    // Setup demo project with tokens
    await setupDemoProject(api)

    // Select the button (node-2)
    await api.studio.setSelection('node-2')
    await api.utils.delay(200)

    // Open color picker for background
    await openColorPicker(api, 'bg')
    await api.utils.delay(200)

    // Select the primary token color
    const selected = await selectTokenColor(api, '$primary.bg')
    api.assert.ok(selected, 'Should be able to select primary token')

    // Wait for code update
    await api.utils.delay(500)

    // Verify code was updated
    const code = api.editor.getCode()
    api.assert.ok(
      code.includes('bg $primary') || code.includes('bg #3B82F6') || code.includes('bg #3b82f6'),
      `Code should have primary background, got: ${code.substring(0, 200)}`
    )
  }),

  // SKIPPED: Dynamic token file injection via window.files doesn't trigger prelude rebuild
  testSkip('Token colors section is visible when tokens exist', async (api: TestAPI) => {
    // Setup demo project with tokens
    await setupDemoProject(api)

    // Select button
    await api.studio.setSelection('node-2')
    await api.utils.delay(200)

    // Open color picker
    await openColorPicker(api, 'bg')
    await api.utils.delay(200)

    // Check token section visibility
    const tokenSection = document.getElementById('color-picker-tokens')
    api.assert.ok(tokenSection !== null, 'Token section should exist')

    const isVisible = tokenSection && tokenSection.style.display !== 'none'
    api.assert.ok(isVisible, 'Token section should be visible')

    // Clean up
    await api.interact.pressKey('Escape')
  }),

  // SKIPPED: Dynamic token file injection via window.files doesn't trigger prelude rebuild
  testSkip('Token colors show correct hex values', async (api: TestAPI) => {
    // Setup demo project with tokens
    await setupDemoProject(api)

    // Select button and open color picker
    await api.studio.setSelection('node-2')
    await api.utils.delay(200)
    await openColorPicker(api, 'bg')
    await api.utils.delay(200)

    // Get tokens and verify colors
    const tokens = getTokenColorsFromPicker()

    // STRICT: Tokens must exist - no silent skipping
    const primary = tokens.find(t => t.name.includes('primary'))
    api.assert.ok(primary !== undefined, 'Primary token must exist in picker')
    api.assert.ok(
      primary!.color.toUpperCase() === '#3B82F6',
      `Primary token should be #3B82F6, got ${primary!.color}`
    )

    const success = tokens.find(t => t.name.includes('success'))
    api.assert.ok(success !== undefined, 'Success token must exist in picker')
    api.assert.ok(
      success!.color.toUpperCase() === '#10B981',
      `Success token should be #10B981, got ${success!.color}`
    )

    const danger = tokens.find(t => t.name.includes('danger'))
    api.assert.ok(danger !== undefined, 'Danger token must exist in picker')
    api.assert.ok(
      danger!.color.toUpperCase() === '#EF4444',
      `Danger token should be #EF4444, got ${danger!.color}`
    )

    // Clean up
    await api.interact.pressKey('Escape')
  }),

  test('Selecting palette color updates button', async (api: TestAPI) => {
    // Setup simple layout without tokens
    await api.editor.setCode(`Frame bg #1a1a1a, pad 24
  Button "Test", bg #333333, col white, pad 12`)
    await api.utils.waitForCompile()
    await api.utils.delay(300)

    // Select button (node-2)
    await api.studio.setSelection('node-2')
    await api.utils.delay(200)

    // Open color picker
    await openColorPicker(api, 'bg')
    await api.utils.delay(200)

    // Select a red color from palette
    const selected = await selectPaletteColor(api, '#EF4444')
    api.assert.ok(selected, 'Should be able to select red from palette')

    // Wait for update
    await api.utils.delay(500)

    // Verify code changed
    const code = api.editor.getCode()
    api.assert.ok(
      code.toLowerCase().includes('#ef4444'),
      `Code should have red background, got: ${code}`
    )
  }),
])

export const allColorPickerTests = colorPickerTests
