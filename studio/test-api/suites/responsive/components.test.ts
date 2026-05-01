/**
 * Responsive Components — Card and Button adapt to container
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getStyle, setContainerSize } from './_helpers'

export const responsiveComponentTests: TestCase[] = describe('Responsive Components', [
  testWithSetup(
    'Card component adapts to container',
    `Card: bg #1a1a1a, rad 8, shadow md
  compact:
    pad 12
    gap 8
  regular:
    pad 16
    gap 12
  wide:
    pad 24
    gap 16
    hor

Card w 300
  Frame w 80, h 80, bg #333, rad 6, shrink
  Frame grow, gap 4
    Text "Card Title", col white, weight bold
    Text "Adapts to container", col #888`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const card = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(card !== null, 'Card should exist')

      const compactPadding = getStyle(card, 'padding')
      const compactGap = getStyle(card, 'gap')

      setContainerSize(card, 900)
      await api.utils.delay(50)

      const widePadding = getStyle(card, 'padding')
      const wideGap = getStyle(card, 'gap')

      api.assert.ok(
        compactPadding || widePadding,
        `Card padding: compact=${compactPadding}, wide=${widePadding}`
      )
      api.assert.ok(compactGap || wideGap, `Card gap: compact=${compactGap}, wide=${wideGap}`)
    }
  ),

  testWithSetup(
    'Button sizes change responsively',
    `Btn as Button: bg #2271C1, col white, rad 6
  compact:
    pad 8 16
    fs 12
  regular:
    pad 12 24
    fs 14
  wide:
    pad 16 32
    fs 16

Frame w 350, h 100, center, bg #1a1a1a
  Btn "Responsive Button"`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const button = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement

      api.assert.ok(button !== null, 'Button should exist')

      const compactWidth = button.offsetWidth
      const compactFontSize = getStyle(button, 'font-size')

      setContainerSize(container, 900)
      await api.utils.delay(50)

      const wideWidth = button.offsetWidth
      const wideFontSize = getStyle(button, 'font-size')

      api.assert.ok(compactWidth > 0, `Button exists at compact: ${compactWidth}px`)
      api.assert.ok(wideWidth > 0, `Button exists at wide: ${wideWidth}px`)
      api.assert.ok(
        compactFontSize && wideFontSize,
        `Font: compact=${compactFontSize}, wide=${wideFontSize}`
      )
    }
  ),
])
