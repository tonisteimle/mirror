/**
 * Focus Events — focus border, blur restore, focus cycling
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const focusEventTests: TestCase[] = describe('Focus Events', [
  testWithSetup(
    'focus state changes border color',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Email", pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #2271C1`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const borderBefore = api.preview.inspect('node-2')?.styles.borderColor
      api.assert.ok(
        borderBefore?.includes('68') || borderBefore?.includes('444'),
        `Initial border should be #444 (rgb 68), got: ${borderBefore}`
      )

      await api.interact.focus('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'borderColor', 'rgb(34, 113, 193)')
    }
  ),

  testWithSetup(
    'blur restores original state',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "Name", pad 12, bg #222, col white, rad 6, bor 2, boc #333
    focus:
      boc #2271C1
      bg #2a2a2a`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 34, 34)')

      await api.interact.focus('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(42, 42, 42)')

      await api.interact.blur('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'backgroundColor', 'rgb(34, 34, 34)')
    }
  ),

  // TODO: Runtime bug - focus state styles don't apply correctly in headless tests
  testWithSetupSkip(
    'focus cycle between inputs',
    `Frame gap 8, pad 16, bg #1a1a1a
  Input placeholder "First", pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #2271C1
  Input placeholder "Second", pad 12, bg #222, col white, rad 6, bor 1, boc #444
    focus:
      boc #10b981`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      await api.interact.focus('node-2')
      await api.utils.delay(100)

      api.assert.hasStyle('node-2', 'borderColor', 'rgb(34, 113, 193)')

      await api.interact.focus('node-3')
      await api.utils.delay(100)

      const firstBorder = api.preview.inspect('node-2')?.styles.borderColor
      api.assert.ok(
        firstBorder?.includes('68') || firstBorder?.includes('444'),
        'First input should lose focus style'
      )

      api.assert.hasStyle('node-3', 'borderColor', 'rgb(16, 185, 129)')
    }
  ),
])
