/**
 * Component Property Override Tests
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const propertyOverrideTests: TestCase[] = describe('Property Overrides', [
  testWithSetup(
    'Override single property',
    `Btn: pad 10 20, bg #2271C1, col white, rad 6

Frame gap 8
  Btn "Primary"
  Btn "Danger", bg #ef4444`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')

      const primary = document.querySelector('[data-mirror-id="node-2"]') as HTMLElement
      const danger = document.querySelector('[data-mirror-id="node-3"]') as HTMLElement

      api.assert.ok(primary !== null, 'Primary button should exist')
      api.assert.ok(danger !== null, 'Danger button should exist')
    }
  ),

  testWithSetup(
    'Override multiple properties',
    `Btn as Button: pad 10 20, bg #333, col white, rad 6

Btn "Custom", bg #10b981, col black, rad 99`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Custom' })
    }
  ),

  testWithSetup(
    'Add properties not in definition',
    `Box: pad 16, bg #1a1a1a

Box shadow md, bor 1, boc #333
  Text "With extra styling", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),
])
