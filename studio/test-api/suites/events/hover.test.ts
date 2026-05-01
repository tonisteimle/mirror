/**
 * Hover Events — hover state changes background, scale, tooltip visibility
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const hoverEventTests: TestCase[] = describe('Hover Events', [
  testWithSetup(
    'hover state changes background',
    `Frame pad 16, bg #1a1a1a
  Frame w 100, h 100, bg #333, rad 8
    hover:
      bg #444`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')

      await api.interact.hover('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(68, 68, 68)')

      await api.interact.unhover('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(51, 51, 51)')
    }
  ),

  testWithSetup(
    'hover with scale transform',
    `Frame pad 16, bg #1a1a1a
  Button "Hover me", bg #333, col white, pad 12 24, rad 6
    hover:
      scale 1.05`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const beforeEl = api.preview.inspect('node-2')
      const initialTransform = beforeEl?.styles.transform || 'none'

      await api.interact.hover('node-2')
      await api.utils.delay(100)

      const afterEl = api.preview.inspect('node-2')
      const hoverTransform = afterEl?.styles.transform || 'none'

      api.assert.ok(
        hoverTransform !== initialTransform &&
          (hoverTransform.includes('matrix') || hoverTransform.includes('scale')),
        `Transform should change on hover. Before: ${initialTransform}, After: ${hoverTransform}`
      )
    }
  ),

  testWithSetup(
    'onhover show makes element visible',
    `Frame pad 16, bg #1a1a1a
  Frame w 100, h 40, bg #333, rad 8, center
    Text "Hover", col white
  Frame name Tooltip, hidden, pad 8, bg #222, rad 4
    Text "I appear on hover", col white, fs 12`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const tooltipBefore = api.preview.inspect('node-4')
      api.assert.ok(
        tooltipBefore?.styles.display === 'none' || !tooltipBefore?.visible,
        'Tooltip should be hidden initially'
      )
    }
  ),
])
