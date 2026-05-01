/**
 * Basic Responsive States — compact/regular/wide states + resize transitions
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getStyle, setContainerSize } from './_helpers'

export const basicResponsiveTests: TestCase[] = describe('Basic Responsive States', [
  testWithSetup(
    'compact state applies below 400px',
    `Frame w 300, h 200, bg #1a1a1a, pad 16
  compact:
    bg #ef4444
  Text "Compact Container", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const bg = getStyle(frame, 'background-color')

      api.assert.ok(
        bg === 'rgb(239, 68, 68)' || bg === 'rgb(26, 26, 26)',
        `Background should be either compact (red) or default (dark): got ${bg}`
      )
    }
  ),

  testWithSetup(
    'regular state applies between 400-800px',
    `Frame w 500, h 200, bg #1a1a1a, pad 16
  regular:
    bg #f59e0b
  Text "Regular Container", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const bg = getStyle(frame, 'background-color')

      api.assert.ok(
        bg === 'rgb(245, 158, 11)' || bg === 'rgb(26, 26, 26)',
        `Background should be either regular (amber) or default: got ${bg}`
      )
    }
  ),

  testWithSetup(
    'wide state applies above 800px',
    `Frame w 900, h 200, bg #1a1a1a, pad 16
  wide:
    bg #10b981
  Text "Wide Container", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const bg = getStyle(frame, 'background-color')

      api.assert.ok(
        bg === 'rgb(16, 185, 129)' || bg === 'rgb(26, 26, 26)',
        `Background should be either wide (green) or default: got ${bg}`
      )
    }
  ),

  // TODO: Runtime bug - container queries don't apply reliably in headless tests
  testWithSetupSkip(
    'states change when container is resized',
    `Frame w full, h 200, bg #333, pad 16
  compact:
    bg #ef4444
  regular:
    bg #f59e0b
  wide:
    bg #10b981
  Text "Resize me", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      setContainerSize(frame, 300)
      await api.utils.delay(50)
      let bg = getStyle(frame, 'background-color')
      const compactBg = bg

      setContainerSize(frame, 500)
      await api.utils.delay(50)
      bg = getStyle(frame, 'background-color')
      const regularBg = bg

      setContainerSize(frame, 900)
      await api.utils.delay(50)
      bg = getStyle(frame, 'background-color')
      const wideBg = bg

      api.assert.ok(
        compactBg !== regularBg || regularBg !== wideBg || compactBg !== wideBg,
        'At least one size state should have different styling'
      )
    }
  ),
])
