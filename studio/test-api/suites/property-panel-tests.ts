/**
 * Property Panel Test Suite
 *
 * Tests for property panel functionality:
 * - Token buttons display when tokens are defined
 * - Token values are shown correctly
 * - Token selection works
 *
 * Uses the Panel API (api.panel.property.*) for property panel interactions.
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Legacy Helper Functions (for tests not yet migrated to Panel API)
// =============================================================================

function queryPropertyPanel(selector: string): Element | null {
  const panel = document.querySelector('.property-panel')
  if (!panel) return null
  return panel.querySelector(selector)
}

function queryAllPropertyPanel(selector: string): Element[] {
  const panel = document.querySelector('.property-panel')
  if (!panel) return []
  return Array.from(panel.querySelectorAll(selector))
}

function getPadTokenButtons(): Element[] {
  return queryAllPropertyPanel('.token-btn[data-pad-token]')
}

function getGapTokenButtons(): Element[] {
  return queryAllPropertyPanel('.token-btn[data-gap-token]')
}

function showPropertyPanel(): void {
  // Ensure the property panel is visible
  const panel = document.getElementById('property-panel')
  if (panel) {
    panel.style.display = 'flex'
  }
}

// =============================================================================
// Token Display Tests
// =============================================================================

export const tokenDisplayTests: TestCase[] = describe('Token Display', [
  testWithSetup(
    'Property panel visibility check via Panel API',
    `sm.pad: 8
md.pad: 16
lg.pad: 24

Frame pad 16, bg #333`,
    async (api: TestAPI) => {
      // Check code was set correctly
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('sm.pad: 8'),
        `Code should contain sm.pad: 8, got: ${code.substring(0, 100)}...`
      )

      // Select the Frame using Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Check if property panel is visible via Panel API
      api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

      // Verify selected node matches via Panel API
      const selectedId = api.panel.property.getSelectedNodeId()
      api.assert.ok(
        selectedId === 'node-1',
        `Property panel should show node-1, got "${selectedId}"`
      )

      // Get available token options for padding via Panel API
      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length >= 3,
        `Expected at least 3 pad tokens, got ${padTokens.length}: ${padTokens.join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Padding tokens appear as buttons when defined',
    `sm.pad: 8
md.pad: 16
lg.pad: 24

Frame pad 16, bg #333`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Check that token options are available via Panel API
      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length >= 3,
        `Expected at least 3 pad tokens, got ${padTokens.length}`
      )

      // Check token names
      const hasSmToken = padTokens.some(t => t.toLowerCase().includes('sm'))
      const hasMdToken = padTokens.some(t => t.toLowerCase().includes('md'))
      const hasLgToken = padTokens.some(t => t.toLowerCase().includes('lg'))

      api.assert.ok(hasSmToken, `Should have sm token, got: ${padTokens.join(', ')}`)
      api.assert.ok(hasMdToken, `Should have md token, got: ${padTokens.join(', ')}`)
      api.assert.ok(hasLgToken, `Should have lg token, got: ${padTokens.join(', ')}`)
    }
  ),

  testWithSetup(
    'Gap tokens appear in Layout section',
    `sm.gap: 4
md.gap: 8
lg.gap: 16

Frame gap 8, bg #333
  Text "A"
  Text "B"`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Check gap tokens via Panel API
      const gapTokens = api.panel.property.getTokenOptions('gap')
      api.assert.ok(
        gapTokens.length >= 3,
        `Expected at least 3 gap tokens, got ${gapTokens.length}`
      )
    }
  ),

  testWithSetup(
    'Token value shown in property panel',
    `sm.pad: 8
md.pad: 16

Frame pad $md, bg #333`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Get the pad property value via Panel API
      const padValue = api.panel.property.getPropertyValue('pad')
      api.assert.ok(
        padValue?.includes('md') || padValue === '16' || padValue === '$md',
        `Pad value should reference md token, got "${padValue}"`
      )
    }
  ),

  testWithSetup(
    'No token buttons without token definitions',
    `Frame pad 16, bg #333`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Check pad tokens via Panel API - should be empty
      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length === 0,
        `Expected no pad tokens without definitions, got ${padTokens.length}`
      )
    }
  ),
])

// =============================================================================
// Token Value Tests
// =============================================================================

export const tokenValueTests: TestCase[] = describe('Token Values', [
  testWithSetup(
    'Token reference shown via Panel API',
    `sm.pad: 8

Frame pad $sm, bg #333`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Get property value via Panel API
      const padValue = api.panel.property.getPropertyValue('pad')
      api.assert.ok(
        padValue === '$sm' || padValue === '$sm.pad' || padValue === '8',
        `Pad should show token reference or value, got "${padValue}"`
      )
    }
  ),

  testWithSetup(
    'Color token shown via Panel API',
    `primary.bg: #2271C1

Frame bg $primary, w 100, h 100`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Get bg property value via Panel API
      const bgValue = api.panel.property.getPropertyValue('bg')
      api.assert.ok(
        bgValue?.includes('primary') || bgValue === '#2271C1',
        `Background should show token reference, got "${bgValue}"`
      )
    }
  ),

  testWithSetup(
    'Get all properties via Panel API',
    `Frame pad 16, bg #333, gap 8, rad 4`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Get all properties via Panel API
      const allProps = api.panel.property.getAllProperties()
      api.assert.ok(
        Object.keys(allProps).length > 0,
        `Should have properties, got: ${JSON.stringify(allProps)}`
      )
    }
  ),
])

// =============================================================================
// Token Interaction Tests
// =============================================================================

export const tokenInteractionTests: TestCase[] = describe('Token Interaction', [
  testWithSetup(
    'Clicking token via Panel API updates code',
    `sm.pad: 8
md.pad: 16

Frame pad 20, bg #333`,
    async (api: TestAPI) => {
      // Select the Frame via Studio API
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Click the sm token via Panel API
      const success = await api.panel.property.clickToken('pad', 'sm')
      api.assert.ok(success, 'Token click should succeed')

      await api.utils.waitForIdle()

      // Check code was updated
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('pad $sm') || code.includes('pad 8'),
        `Code should be updated with token reference or value, got: ${code.substring(code.indexOf('Frame'), code.indexOf('Frame') + 50)}`
      )
    }
  ),

  testWithSetup('Set property via Panel API', `Frame pad 16, bg #333`, async (api: TestAPI) => {
    // Select the Frame via Studio API
    await api.studio.setSelection('node-1')
    await api.utils.waitForIdle()

    // Wait for property panel to be ready
    await api.utils.delay(200)

    // Verify panel is showing the selected element
    const selectedId = api.panel.property.getSelectedNodeId()
    api.assert.ok(selectedId === 'node-1', `Panel should show node-1, got "${selectedId}"`)

    // Set padding via Panel API
    const success = await api.panel.property.setProperty('pad', '24')
    api.assert.ok(success, 'setProperty should succeed')

    // Wait for debounce (300ms) + compile cycle + buffer
    await api.utils.delay(800)
    await api.utils.waitForCompile()

    // Check code was updated
    const code = api.editor.getCode()
    api.assert.ok(code.includes('pad 24'), `Code should contain pad 24, got: ${code}`)
  }),
])

// =============================================================================
// Project Token Tests - Full tokens.tok scenario
// =============================================================================

/**
 * Full tokens.tok content as provided by the user.
 * Tests that all token types appear correctly in the property panel.
 */
const FULL_TOKENS_TOK = `// Theme Tokens

// Typography (max 3)
s.fs: 12
m.fs: 14
l.fs: 18

// Colors (max 3 per type)
accent.bg: #5BA8F5
surface.bg: #27272a
canvas.bg: #18181b
text.col: #ffffff
muted.col: #a1a1aa
border.boc: #333333

// Spacing (max 3)
s.pad: 4
m.pad: 8
l.pad: 16

s.gap: 4
m.gap: 8
l.gap: 16

// Radius (max 3)
s.rad: 4
m.rad: 8
l.rad: 12`

function getRadiusTokenButtons(): Element[] {
  return queryAllPropertyPanel('.token-btn[data-radius]')
}

function getColorTrigger(prop: string): Element | null {
  return queryPropertyPanel(`[data-color-prop="${prop}"], [data-border-color-prop="${prop}"]`)
}

function getColorValue(prop: string): string | null {
  const trigger = queryPropertyPanel(`[data-color-prop="${prop}"]`)
  const valueEl = trigger?.querySelector('.pp-color-value')
  return valueEl?.textContent?.trim() || null
}

export const projectTokenTests: TestCase[] = describe('Project Tokens', [
  testWithSetup(
    'Property panel shows visible token buttons for padding',
    `${FULL_TOKENS_TOK}

Button "Click me", pad 16, bg #2271C1, col white`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button using Studio API for reliable selection
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200) // Wait for panel to update

      // 1. Verify property panel is visible via Panel API
      api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

      // 2. Check selected node
      const selectedId = api.panel.property.getSelectedNodeId()
      api.assert.ok(selectedId === 'node-1', `Panel should show node-1, got "${selectedId}"`)

      // 3. Verify tokens are available via Panel API (more reliable than DOM queries)
      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length >= 3,
        `Expected 3+ pad tokens via API, got ${padTokens.length}: ${padTokens.join(', ')}`
      )

      // 4. Check token names - tokens are named s, m, l in FULL_TOKENS_TOK
      const hasS = padTokens.some(t => t.toLowerCase() === 's')
      const hasM = padTokens.some(t => t.toLowerCase() === 'm')
      const hasL = padTokens.some(t => t.toLowerCase() === 'l')
      api.assert.ok(hasS, `Should have "s" token. Found: ${padTokens.join(', ')}`)
      api.assert.ok(hasM, `Should have "m" token. Found: ${padTokens.join(', ')}`)
      api.assert.ok(hasL, `Should have "l" token. Found: ${padTokens.join(', ')}`)
    }
  ),

  testWithSetup(
    'Padding tokens from tokens.tok appear for Button',
    `${FULL_TOKENS_TOK}

Button "Click me", pad 16, bg #2271C1, col white`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button (node-1)
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // Check that padding token buttons exist
      const buttons = getPadTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Expected at least 3 pad token buttons (s, m, l), got ${buttons.length}`
      )

      // Check button labels contain s, m, l
      const labels = buttons.map(b => b.textContent?.trim().toLowerCase())
      api.assert.ok(
        labels.some(l => l === 's'),
        'Should have "s" token button'
      )
      api.assert.ok(
        labels.some(l => l === 'm'),
        'Should have "m" token button'
      )
      api.assert.ok(
        labels.some(l => l === 'l'),
        'Should have "l" token button'
      )
    }
  ),

  testWithSetup(
    'Gap tokens from tokens.tok appear for Frame',
    `${FULL_TOKENS_TOK}

Frame gap 8, pad 16, bg #27272a
  Button "A"
  Button "B"`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Frame (node-1)
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // Check that gap token buttons exist
      const buttons = getGapTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Expected at least 3 gap token buttons (s, m, l), got ${buttons.length}`
      )

      // Check button labels
      const labels = buttons.map(b => b.textContent?.trim().toLowerCase())
      api.assert.ok(
        labels.some(l => l === 's'),
        'Should have "s" gap token button'
      )
      api.assert.ok(
        labels.some(l => l === 'm'),
        'Should have "m" gap token button'
      )
      api.assert.ok(
        labels.some(l => l === 'l'),
        'Should have "l" gap token button'
      )
    }
  ),

  testWithSetup(
    'Radius tokens from tokens.tok appear in Border section',
    `${FULL_TOKENS_TOK}

Frame rad 8, pad 16, bg #27272a
  Text "Content"`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Frame (node-1)
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // Check that radius token buttons exist
      const buttons = getRadiusTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Expected at least 3 radius token buttons (s, m, l), got ${buttons.length}`
      )

      // Check button labels - should have s, m, l (plus 0 preset and possibly circle)
      const labels = buttons.map(b => b.textContent?.trim().toLowerCase())
      api.assert.ok(
        labels.some(l => l === 's'),
        'Should have "s" radius token button'
      )
      api.assert.ok(
        labels.some(l => l === 'm'),
        'Should have "m" radius token button'
      )
      api.assert.ok(
        labels.some(l => l === 'l'),
        'Should have "l" radius token button'
      )
    }
  ),

  testWithSetup(
    'Color token reference shown when using $accent',
    `${FULL_TOKENS_TOK}

Button "Primary", bg $accent, col $text, pad 12 24, rad 8`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button (node-1)
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // Check color value display shows token reference
      const bgColorValue = getColorValue('bg')
      api.assert.ok(
        bgColorValue?.includes('accent') || bgColorValue?.includes('$accent'),
        `Background color should show $accent token reference, got "${bgColorValue}"`
      )
    }
  ),

  testWithSetup(
    'Active padding token is highlighted when using $m.pad',
    `${FULL_TOKENS_TOK}

Button "Test", pad $m.pad, bg #333`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button (node-1)
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // Check that m token button is active
      const buttons = getPadTokenButtons()
      const activeButtons = buttons.filter(b => b.classList.contains('active'))
      api.assert.ok(activeButtons.length >= 1, 'Should have at least one active token button')

      // Find the m button
      const mButton = buttons.find(
        b =>
          b.textContent?.trim().toLowerCase() === 'm' ||
          (b as HTMLElement).dataset.tokenRef?.includes('m.pad')
      )
      api.assert.ok(mButton?.classList.contains('active'), 'm token button should be active')
    }
  ),

  testWithSetup(
    'Clicking padding token updates code with token reference',
    `${FULL_TOKENS_TOK}

Button "Test", pad 20, bg #333`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button using Studio API for reliable selection
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200) // Wait for panel to update

      // Verify tokens are available
      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(padTokens.length >= 3, `Expected 3+ pad tokens, got ${padTokens.length}`)

      // Click the l token via Panel API (value 16 in FULL_TOKENS_TOK)
      const success = await api.panel.property.clickToken('pad', 'l')
      api.assert.ok(success, 'Token click should succeed')

      // Wait for debounce + compile
      await api.utils.delay(800)
      await api.utils.waitForCompile()

      // Check code was updated with token reference or value
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('pad $l') || code.includes('pad 16'),
        `Code should contain token reference or value, got: ${code.substring(code.indexOf('Button'), code.indexOf('Button') + 50)}...`
      )
    }
  ),

  testWithSetup(
    'All spacing tokens visible after switching elements',
    `${FULL_TOKENS_TOK}

Frame pad 16, gap 8, bg #18181b
  Button "First", pad 8
  Button "Second", pad 16`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select first button
      api.interact.select('node-2')
      await api.utils.waitForIdle()

      let buttons = getPadTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `First button: Expected 3+ pad tokens, got ${buttons.length}`
      )

      // Select second button
      api.interact.select('node-3')
      await api.utils.waitForIdle()

      buttons = getPadTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Second button: Expected 3+ pad tokens, got ${buttons.length}`
      )

      // Select Frame to check gap tokens
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const gapButtons = getGapTokenButtons()
      api.assert.ok(
        gapButtons.length >= 3,
        `Frame: Expected 3+ gap tokens, got ${gapButtons.length}`
      )
    }
  ),

  testWithSetup(
    'Custom value shows in white and deselects tokens',
    `${FULL_TOKENS_TOK}

Button "Test", pad 20, bg #333`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // 1. Check that padding input shows value 20 (not a token)
      const padInput = queryPropertyPanel('input[data-pad-dir="h"]') as HTMLInputElement
      api.assert.ok(padInput !== null, 'Padding input should exist')
      api.assert.equals(padInput?.value, '20', 'Input should show custom value "20"')

      // 2. Check input does NOT have token-resolved class (should be white, not muted)
      api.assert.ok(
        !padInput?.classList.contains('token-resolved'),
        'Custom value should NOT have token-resolved class (should be white)'
      )

      // 3. Check that no token button is active (20 is not a token value)
      const buttons = getPadTokenButtons()
      const activeButtons = buttons.filter(b => b.classList.contains('active'))
      api.assert.equals(
        activeButtons.length,
        0,
        `No token should be active for custom value. Active: ${activeButtons.map(b => b.textContent).join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Token value shows in muted color',
    `${FULL_TOKENS_TOK}

Button "Test", pad $m.pad, bg #333`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // 1. Check that padding input shows resolved value "8" (from $m token)
      const padInput = queryPropertyPanel('input[data-pad-dir="h"]') as HTMLInputElement
      api.assert.ok(padInput !== null, 'Padding input should exist')
      api.assert.equals(padInput?.value, '8', 'Input should show resolved token value "8"')

      // 2. Check input HAS token-resolved class (should be muted)
      api.assert.ok(
        padInput?.classList.contains('token-resolved'),
        'Token value SHOULD have token-resolved class (should be muted)'
      )

      // 3. Check that m token button is active
      const buttons = getPadTokenButtons()
      const mButton = buttons.find(b => b.textContent?.trim().toLowerCase() === 'm')
      api.assert.ok(mButton?.classList.contains('active'), 'm token button should be active')
    }
  ),

  testWithSetup(
    'Color section shows token reference for bg',
    `${FULL_TOKENS_TOK}

Button "Accent", bg $accent.bg, col white, pad 12 24`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      // Select the Button
      api.interact.select('node-1')
      await api.utils.waitForIdle()

      // Find color trigger for background
      const bgTrigger = queryPropertyPanel('[data-color-prop="bg"]')
      api.assert.ok(bgTrigger !== null, 'Background color trigger should exist')

      // Check that the trigger has the current value stored
      const currentValue = (bgTrigger as HTMLElement)?.dataset.currentValue
      api.assert.ok(
        currentValue?.includes('accent'),
        `Color trigger should store token reference, got "${currentValue}"`
      )

      // Check swatch exists (even if empty for token values)
      const swatch = bgTrigger?.querySelector('.pp-color-swatch')
      api.assert.ok(swatch !== null, 'Color swatch element should exist')
    }
  ),
])

// =============================================================================
// Export All
// =============================================================================

export const allPropertyPanelTests: TestCase[] = [
  ...tokenDisplayTests,
  ...tokenValueTests,
  ...tokenInteractionTests,
  ...projectTokenTests,
]
