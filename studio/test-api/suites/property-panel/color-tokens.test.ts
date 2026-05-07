/**
 * Color-section token-button tests (P3 of property-panel-tokens).
 *
 * Color tokens used to surface only inside the color picker dialog —
 * the panel's color rows showed just a swatch + value, with no quick
 * way to click a token from the immediate panel surface. After P2,
 * each color row (bg/col/boc/ic) renders the matching token buttons
 * inline above the swatch, parity with spacing/sizing.
 *
 * Suffix logic under test:
 *   - Suffixed token (`primary.bg`): shows only on the bg row.
 *   - Property-set token (`primary`): shows on every color row.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

function queryAllPropertyPanel(selector: string): Element[] {
  const panel = document.querySelector('#property-panel') as HTMLElement | null
  if (!panel) return []
  return Array.from(panel.querySelectorAll(selector))
}

export const colorTokenTests: TestCase[] = describe('Color Tokens (P2)', [
  testWithSetup(
    'Suffixed bg token (primary.bg) renders in Background row only',
    `primary.bg: #2271C1
danger.bg: #ef4444

Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const bgButtons = queryAllPropertyPanel('.token-btn[data-bg-token]')
      api.assert.ok(
        bgButtons.length >= 2,
        `Expected at least 2 bg token buttons, got ${bgButtons.length}`
      )

      // .col tokens should NOT appear in bg row (different suffix).
      const colButtons = queryAllPropertyPanel('.token-btn[data-col-token]')
      api.assert.ok(
        colButtons.length === 0,
        `Expected 0 col-token buttons (only .bg defined), got ${colButtons.length}`
      )
    }
  ),

  testWithSetup(
    'Property-set token (no suffix) appears in every color row',
    `primary: #2271C1
accent: #f0a

Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      // Both tokens should show up in bg AND col rows (when the panel
      // shows both — Frame primitive surfaces both bg and col).
      const bgButtons = queryAllPropertyPanel('.token-btn[data-bg-token]')
      api.assert.ok(
        bgButtons.length >= 2,
        `Expected 2+ property-set tokens in bg row, got ${bgButtons.length}`
      )
    }
  ),

  testWithSetup(
    'Clicking a bg token writes $primary into source',
    `primary.bg: #2271C1
danger.bg: #ef4444

Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const bgButtons = queryAllPropertyPanel('.token-btn[data-bg-token]') as HTMLElement[]
      const primaryBtn = bgButtons.find(b => b.textContent?.trim() === 'primary')
      api.assert.ok(primaryBtn !== undefined, 'primary bg button should exist')

      primaryBtn!.click()
      await api.utils.delay(300)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      const bgRewritten = /Frame bg \$primary(?:\.bg)?\b/.test(code)
      api.assert.ok(bgRewritten, `Expected bg to be rewritten as $primary token. Got: ${code}`)
    }
  ),

  testWithSetup(
    'No bg-token buttons when no color tokens are defined',
    `Frame bg #333, w 100, h 100`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const bgButtons = queryAllPropertyPanel('.token-btn[data-bg-token]')
      api.assert.ok(
        bgButtons.length === 0,
        `Expected 0 bg-token buttons (no color tokens defined), got ${bgButtons.length}`
      )
    }
  ),
])
