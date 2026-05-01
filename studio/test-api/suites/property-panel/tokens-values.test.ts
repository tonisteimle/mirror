/**
 * Token Value Tests
 *
 * Verifies the property panel surfaces token references / resolved values
 * for the currently selected element.
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const tokenValueTests: TestCase[] = describe('Token Values', [
  testWithSetup(
    'Token reference shown via Panel API',
    `sm.pad: 8

Frame pad $sm, bg #333`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const padValue = api.panel.property.getPropertyValue('pad')
      api.assert.ok(
        padValue === '$sm' || padValue === '$sm.pad' || padValue === '8',
        `Pad should show token reference or value, got "${padValue}"`
      )
    }
  ),

  testWithSetup(
    'Color token shown via Panel API',
    `primary.bg: #2271C1

Frame bg $primary, w 100, h 100`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const bgValue = api.panel.property.getPropertyValue('bg')
      api.assert.ok(
        bgValue?.includes('primary') || bgValue === '#2271C1',
        `Background should show token reference, got "${bgValue}"`
      )
    }
  ),

  testWithSetup(
    'Get all properties via Panel API',
    `Frame pad 16, bg #333, gap 8, rad 4`,
    async (api: TestAPI) => {
      await api.studio.setSelection('node-1')
      await api.utils.waitForIdle()

      const allProps = api.panel.property.getAllProperties()
      api.assert.ok(
        Object.keys(allProps).length > 0,
        `Should have properties, got: ${JSON.stringify(allProps)}`
      )
    }
  ),
])
