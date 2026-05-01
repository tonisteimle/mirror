/**
 * Preview Sync After Property Change — verify preview reflects panel edits
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const previewSyncTests: TestCase[] = describe('Preview Sync After Property Change', [
  testWithSetup(
    'Background color syncs to preview',
    `Frame w 100, h 100, bg #333`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('bg', '#10b981')
      await api.utils.delay(400)

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.backgroundColor.includes('16, 185, 129') ||
          el.style.background.includes('16, 185, 129'),
        'Preview should show green'
      )
    }
  ),

  testWithSetup('Width syncs to preview', `Frame w 100, h 50, bg #333`, async (api: TestAPI) => {
    await api.interact.click('node-1')
    await api.utils.delay(200)

    await api.panel.property.setProperty('w', '200')
    await api.utils.delay(400)

    const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
    api.assert.ok(el !== null, 'Element should exist')
    const width = parseInt(el.style.width || '0')
    api.assert.ok(width >= 195 && width <= 205, `Width should be ~200, got ${width}`)
  }),

  testWithSetup(
    'Padding syncs to preview',
    `Frame pad 8, bg #333, w 100, h 50`,
    async (api: TestAPI) => {
      await api.interact.click('node-1')
      await api.utils.delay(200)

      await api.panel.property.setProperty('pad', '24')
      await api.utils.delay(400)

      const el = document.querySelector('[data-mirror-id="node-1"]') as HTMLElement
      api.assert.ok(el !== null, 'Element should exist')
      api.assert.ok(
        el.style.padding === '24px' || el.style.padding.includes('24'),
        'Preview should have 24px padding'
      )
    }
  ),
])
