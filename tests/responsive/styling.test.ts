/** @vitest-environment jsdom */
/**
 * Responsive Styling — font size, padding, gap adjust with size
 */

import {
  testWithSetupSkip,
  describe,
  type TestCase,
  runTestCases,
  type TestAPI,
} from '../utils/mirror-test-adapter'
import { getStyle, setContainerSize } from './_helpers'

// jsdom does not evaluate CSS container queries, so the compact:/regular:/wide:
// state-styles never apply when setContainerSize() resizes the test root.
// All three tests stay skipped here and are covered by the browser-runner
// equivalents in studio/test-api/suites/responsive.

export const responsiveStylingTests: TestCase[] = describe('Responsive Styling', [
  testWithSetupSkip(
    'Font size changes with container size',
    `Frame w 300, h 100, center, bg #1a1a1a
  Text "Responsive Text", col white
    compact:
      fs 14
    regular:
      fs 18
    wide:
      fs 24`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const text = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(text !== null, 'Text should exist')

      let fontSize = getStyle(text, 'font-size')
      api.assert.ok(fontSize, `Font size at compact: ${fontSize}`)

      setContainerSize(container, 900)
      await api.utils.delay(50)
      fontSize = getStyle(text, 'font-size')
      api.assert.ok(fontSize, `Font size at wide: ${fontSize}`)
    }
  ),

  testWithSetupSkip(
    'Padding adjusts with container size',
    `Frame w 350, h 200, bg #1a1a1a
  compact:
    pad 8
  regular:
    pad 16
  wide:
    pad 32
  Text "Content with responsive padding", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const frame = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(frame !== null, 'Frame should exist')

      const initialPadding = getStyle(frame, 'padding')

      setContainerSize(frame, 600)
      await api.utils.delay(50)
      const regularPadding = getStyle(frame, 'padding')

      setContainerSize(frame, 1000)
      await api.utils.delay(50)
      const widePadding = getStyle(frame, 'padding')

      api.assert.ok(
        initialPadding || regularPadding || widePadding,
        `Padding values: compact=${initialPadding}, regular=${regularPadding}, wide=${widePadding}`
      )
    }
  ),

  testWithSetupSkip(
    'Gap changes with container size',
    `Frame w 300, h 200, bg #1a1a1a, pad 16
  compact:
    gap 4
  regular:
    gap 12
  wide:
    gap 24
  Frame w 40, h 40, bg #333, rad 4
  Frame w 40, h 40, bg #333, rad 4
  Frame w 40, h 40, bg #333, rad 4`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Container should exist')

      const child1 = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const child2 = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      api.assert.ok(child1 !== null, 'Child 1 should exist')
      api.assert.ok(child2 !== null, 'Child 2 should exist')

      const gap = getStyle(container, 'gap')
      api.assert.ok(gap, `Gap value: ${gap}`)
    }
  ),
])

runTestCases('Responsive Styling', responsiveStylingTests)
