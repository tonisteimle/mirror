/**
 * Sizing-section token-button tests.
 *
 * Width and Height surfaced their first token-button row in
 * commit P2 of the property-panel-tokens quality pass. Before that,
 * users could *type* `$token` into the input and see it resolve, but
 * couldn't click a token suggestion the way spacing/margin/layout
 * already allowed. These tests pin the new UI down.
 *
 * Covers:
 *   1. Width tokens defined → token buttons rendered with .w suffix
 *   2. Height tokens defined → token buttons rendered with .h suffix
 *   3. Clicking a width token writes `$tokenName` into the source
 *   4. Without token defs no buttons rendered (parity with other sections)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

function queryAllPropertyPanel(selector: string): Element[] {
  const panel = document.querySelector('#property-panel') as HTMLElement | null
  if (!panel) return []
  return Array.from(panel.querySelectorAll(selector))
}

export const sizingTokenTests: TestCase[] = describe('Sizing Tokens (P2)', [
  testWithSetup(
    'Width tokens render as buttons in Sizing section',
    `sm.w: 100
md.w: 200
lg.w: 300

Frame w 200, h 100, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const wButtons = queryAllPropertyPanel('.token-btn[data-w-token]')
      api.assert.ok(
        wButtons.length >= 3,
        `Expected at least 3 width token buttons, got ${wButtons.length}`
      )

      const labels = wButtons.map(b => b.textContent?.trim().toLowerCase())
      api.assert.ok(
        labels.some(l => l === 'sm'),
        `Should have "sm" button. Got: ${labels.join(', ')}`
      )
      api.assert.ok(
        labels.some(l => l === 'md'),
        `Should have "md" button. Got: ${labels.join(', ')}`
      )
      api.assert.ok(
        labels.some(l => l === 'lg'),
        `Should have "lg" button. Got: ${labels.join(', ')}`
      )
    }
  ),

  testWithSetup(
    'Height tokens render as buttons in Sizing section',
    `xs.h: 32
sm.h: 64
md.h: 128

Frame w 200, h 100, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const hButtons = queryAllPropertyPanel('.token-btn[data-h-token]')
      api.assert.ok(
        hButtons.length >= 3,
        `Expected at least 3 height token buttons, got ${hButtons.length}`
      )
    }
  ),

  testWithSetup(
    'Clicking a width token writes $tokenName into source',
    `sm.w: 100
md.w: 200

Frame w 50, h 100, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const wButtons = queryAllPropertyPanel('.token-btn[data-w-token]') as HTMLElement[]
      const mdBtn = wButtons.find(b => b.textContent?.trim() === 'md')
      api.assert.ok(mdBtn !== undefined, 'md width token button should exist')

      mdBtn!.click()
      await api.utils.delay(300)
      await api.utils.waitForCompile()

      const code = api.editor.getCode()
      // The token click should have replaced the literal `w 50` with a
      // `$md`-form reference. Acceptable forms: `$md` (short) or
      // `$md.w` (full) — both are valid in the source.
      const widthAfter = /Frame w \$md(?:\.w)?\b/.test(code)
      api.assert.ok(widthAfter, `Expected width to be written as $md token reference, got: ${code}`)
    }
  ),

  testWithSetup(
    'No width-token buttons rendered when no .w tokens are defined',
    `sm.pad: 8
md.pad: 16

Frame w 200, h 100, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const wButtons = queryAllPropertyPanel('.token-btn[data-w-token]')
      api.assert.ok(
        wButtons.length === 0,
        `Expected 0 width-token buttons (no .w tokens defined), got ${wButtons.length}`
      )
    }
  ),
])
