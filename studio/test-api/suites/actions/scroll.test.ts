/**
 * Scroll Actions — scrollToTop, scrollToBottom, scrollTo
 */

import { testWithSetup, testWithSetupSkip, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const scrollActionTests: TestCase[] = describe('Scroll Actions', [
  // TODO: Runtime bug - scrollToTop() doesn't scroll container in headless tests
  testWithSetupSkip(
    'scrollToTop() scrolls container to top on click',
    `Frame h 150, scroll, bg #1a1a1a
  Frame h 400, pad 16, gap 8
    Text "Top", col white
    Spacer h 100
    Button "Go to top", scrollToTop()
    Spacer h 200
    Text "Bottom", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Scroll container should exist')

      container.scrollTop = 200
      await api.utils.delay(50)
      api.assert.ok(container.scrollTop > 100, 'Should be scrolled down')

      await api.interact.click('node-4')
      await api.utils.delay(150)

      api.assert.ok(container.scrollTop < 10, 'Should be scrolled to top')
    }
  ),

  // TODO: Runtime bug - scrollToBottom() doesn't scroll container in headless tests
  testWithSetupSkip(
    'scrollToBottom() scrolls container to bottom on click',
    `Frame h 150, scroll, bg #1a1a1a
  Frame h 400, pad 16, gap 8
    Button "Go to bottom", scrollToBottom()
    Spacer h 300
    Text "Bottom marker", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(container !== null, 'Scroll container should exist')

      api.assert.ok(container.scrollTop < 10, 'Should start at top')

      await api.interact.click('node-3')
      await api.utils.delay(150)

      const maxScroll = container.scrollHeight - container.clientHeight
      api.assert.ok(container.scrollTop > maxScroll - 20, 'Should be scrolled to bottom')
    }
  ),

  testWithSetup(
    'scrollTo() scrolls to named element on click',
    `Frame h 150, scroll, bg #1a1a1a
  Frame h 500, pad 16, gap 8
    Button "Go to Section 2", scrollTo(Section2)
    Frame name Section1, h 100, bg #333, pad 8
      Text "Section 1", col white
    Frame name Section2, h 100, bg #2271C1, pad 8
      Text "Section 2", col white
    Frame name Section3, h 100, bg #10b981, pad 8
      Text "Section 3", col white`,
    async (api: TestAPI) => {
      await api.utils.waitForCompile()

      const container = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      const section2 = document.querySelector('[data-mirror-id="node-5"]') as HTMLElement

      api.assert.ok(container !== null, 'Container should exist')
      api.assert.ok(section2 !== null, 'Section 2 should exist')

      api.assert.ok(container.scrollTop < 10, 'Should start at top')

      await api.interact.click('node-3')
      await api.utils.delay(200)

      api.assert.ok(container.scrollTop > 50, 'Should have scrolled down to Section 2')
    }
  ),
])
