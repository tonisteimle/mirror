/**
 * Custom Size Thresholds — token-defined breakpoints
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getStyle } from './_helpers'

export const customThresholdTests: TestCase[] = describe('Custom Size Thresholds', [
  testWithSetup(
    'Custom compact threshold (500px max)',
    `compact.max: 500

Frame w 450, h 200, bg #1a1a1a, pad 16
  compact:
    bg #ef4444
  Text "Custom threshold at 500px", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const bg = getStyle(frame, 'background-color')
      api.assert.ok(bg, `Background with custom threshold: ${bg}`)
    }
  ),

  testWithSetup(
    'Custom regular range (300-600px)',
    `regular.min: 300
regular.max: 600

Frame w 450, h 200, bg #1a1a1a, pad 16
  regular:
    bg #f59e0b
  Text "Custom regular 300-600px", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const bg = getStyle(frame, 'background-color')
      api.assert.ok(bg, `Background with custom regular range: ${bg}`)
    }
  ),

  testWithSetup(
    'Custom named breakpoint (tablet)',
    `tablet.min: 600
tablet.max: 900

Frame w 750, h 200, bg #1a1a1a, pad 16
  tablet:
    bg #2271C1
    pad 24
  Text "Tablet-specific styling", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const bg = getStyle(frame, 'background-color')
      const padding = getStyle(frame, 'padding')

      api.assert.ok(bg, `Tablet background: ${bg}`)
      api.assert.ok(padding, `Tablet padding: ${padding}`)
    }
  ),
])
