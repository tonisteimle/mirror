/**
 * Project Token Tests — Full tokens.tok scenario
 *
 * Mirrors a realistic project-wide token file and verifies that all token
 * categories (typography / color / spacing / radius) appear correctly in
 * the property panel and round-trip back to source via clicks / inputs.
 *
 * Uses both the Panel API and direct DOM queries against the property
 * panel's data attributes (`.token-btn[data-pad-token]`, `[data-color-prop]`,
 * etc.) since some assertions cover the rendered DOM, not only API state.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// Local helpers (panel DOM queries)
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
  const panel = document.getElementById('property-panel')
  if (panel) {
    panel.style.display = 'flex'
  }
}

function getColorValue(prop: string): string | null {
  const trigger = queryPropertyPanel(`[data-color-prop="${prop}"]`)
  const valueEl = trigger?.querySelector('.pp-color-value')
  return valueEl?.textContent?.trim() || null
}

/**
 * Realistic tokens.tok content covering all token categories.
 * Used as fixture for the project-wide tests below.
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

// =============================================================================
// Tests
// =============================================================================

export const projectTokenTests: TestCase[] = describe('Project Tokens', [
  testWithSetup(
    'Property panel shows visible token buttons for padding',
    `${FULL_TOKENS_TOK}

Button "Click me", pad 16, bg #2271C1, col white`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

      const selectedId = await api.panel.property.waitForSelectedNodeId()
      api.assert.ok(selectedId === 'node-1', `Panel should show node-1, got "${selectedId}"`)

      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length >= 3,
        `Expected 3+ pad tokens via API, got ${padTokens.length}: ${padTokens.join(', ')}`
      )

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

      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const buttons = getPadTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Expected at least 3 pad token buttons (s, m, l), got ${buttons.length}`
      )

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

      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const buttons = getGapTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Expected at least 3 gap token buttons (s, m, l), got ${buttons.length}`
      )

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

      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      const radTokens = api.panel.property.getTokenOptions('rad')
      api.assert.ok(
        radTokens.length >= 3,
        `Expected at least 3 radius tokens (s, m, l), got ${radTokens.length}: ${radTokens.join(', ')}`
      )

      const hasS = radTokens.some(t => t.toLowerCase() === 's')
      const hasM = radTokens.some(t => t.toLowerCase() === 'm')
      const hasL = radTokens.some(t => t.toLowerCase() === 'l')
      api.assert.ok(hasS, `Should have "s" token. Found: ${radTokens.join(', ')}`)
      api.assert.ok(hasM, `Should have "m" token. Found: ${radTokens.join(', ')}`)
      api.assert.ok(hasL, `Should have "l" token. Found: ${radTokens.join(', ')}`)
    }
  ),

  testWithSetup(
    'Color token reference shown when using $accent',
    `${FULL_TOKENS_TOK}

Button "Primary", bg $accent, col $text, pad 12 24, rad 8`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      api.interact.select('node-1')
      await api.utils.waitForIdle()

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

      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const buttons = getPadTokenButtons()
      const activeButtons = buttons.filter(b => b.classList.contains('active'))
      api.assert.ok(activeButtons.length >= 1, 'Should have at least one active token button')

      const mButton = buttons.find(
        b =>
          b.textContent?.trim().toLowerCase() === 'm' ||
          (b as HTMLElement).dataset.tokenRef?.includes('m.pad')
      )
      api.assert.ok(mButton !== undefined, 'm token button should exist')
      api.assert.ok(mButton!.classList.contains('active'), 'm token button should be active')
    }
  ),

  testWithSetup(
    'Clicking padding token updates code with token reference',
    `${FULL_TOKENS_TOK}

Button "Test", pad 20, bg #333`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()
      await api.utils.delay(200)

      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(padTokens.length >= 3, `Expected 3+ pad tokens, got ${padTokens.length}`)

      const success = await api.panel.property.clickToken('pad', 'l')
      api.assert.ok(success, 'Token click should succeed')

      await api.utils.delay(800)
      await api.utils.waitForCompile()

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

      api.interact.select('node-2')
      await api.utils.waitForIdle()

      let buttons = getPadTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `First button: Expected 3+ pad tokens, got ${buttons.length}`
      )

      api.interact.select('node-3')
      await api.utils.waitForIdle()

      buttons = getPadTokenButtons()
      api.assert.ok(
        buttons.length >= 3,
        `Second button: Expected 3+ pad tokens, got ${buttons.length}`
      )

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

      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const padInput = queryPropertyPanel('input[data-pad-dir="h"]') as HTMLInputElement
      api.assert.ok(padInput !== null, 'Padding input should exist')
      api.assert.equals(padInput?.value, '20', 'Input should show custom value "20"')

      api.assert.ok(
        !padInput?.classList.contains('token-resolved'),
        'Custom value should NOT have token-resolved class (should be white)'
      )

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

      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const padInput = queryPropertyPanel('input[data-pad-dir="h"]') as HTMLInputElement
      api.assert.ok(padInput !== null, 'Padding input should exist')
      api.assert.equals(padInput.value, '8', 'Input should show resolved token value "8"')

      api.assert.ok(
        padInput.classList.contains('token-resolved'),
        'Token value SHOULD have token-resolved class (should be muted)'
      )

      const buttons = getPadTokenButtons()
      const mButton = buttons.find(b => b.textContent?.trim().toLowerCase() === 'm')
      api.assert.ok(mButton !== undefined, 'm token button should exist')
      api.assert.ok(mButton!.classList.contains('active'), 'm token button should be active')
    }
  ),

  testWithSetup(
    'Color section shows token reference for bg',
    `${FULL_TOKENS_TOK}

Button "Accent", bg $accent.bg, col white, pad 12 24`,
    async (api: TestAPI) => {
      showPropertyPanel()
      await api.utils.waitForIdle()

      api.interact.select('node-1')
      await api.utils.waitForIdle()

      const bgTrigger = queryPropertyPanel('[data-color-prop="bg"]')
      api.assert.ok(bgTrigger !== null, 'Background color trigger should exist')

      const currentValue = (bgTrigger as HTMLElement)?.dataset.currentValue
      api.assert.ok(
        currentValue?.includes('accent'),
        `Color trigger should store token reference, got "${currentValue}"`
      )

      const swatch = bgTrigger?.querySelector('.pp-color-swatch')
      api.assert.ok(swatch !== null, 'Color swatch element should exist')
    }
  ),
])
