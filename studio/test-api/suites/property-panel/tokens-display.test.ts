/**
 * Token Display Tests
 *
 * Verifies that defined design tokens (pad/gap/etc.) are surfaced as
 * options in the property panel for the selected element.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tokenDisplayTests: TestCase[] = describe('Token Display', [
  testWithSetup(
    'Property panel visibility check via Panel API',
    `sm.pad: 8
md.pad: 16
lg.pad: 24

Frame pad 16, bg #333`,
    async (api: TestAPI) => {
      const code = api.editor.getCode()
      api.assert.ok(
        code.includes('sm.pad: 8'),
        `Code should contain sm.pad: 8, got: ${code.substring(0, 100)}...`
      )

      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      api.assert.ok(api.panel.property.isVisible(), 'Property panel should be visible')

      const selectedId = await api.panel.property.waitForSelectedNodeId()
      api.assert.ok(
        selectedId === 'node-1',
        `Property panel should show node-1, got "${selectedId}"`
      )

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
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length >= 3,
        `Expected at least 3 pad tokens, got ${padTokens.length}`
      )

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
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

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
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

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
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const padTokens = api.panel.property.getTokenOptions('pad')
      api.assert.ok(
        padTokens.length === 0,
        `Expected no pad tokens without definitions, got ${padTokens.length}`
      )
    }
  ),
])
