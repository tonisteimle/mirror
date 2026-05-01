/**
 * Component Inheritance Tests (`as` keyword)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const inheritanceTests: TestCase[] = describe('Component Inheritance', [
  testWithSetup(
    'Inherit from Button primitive',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6

PrimaryBtn "Save"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Save' })
    }
  ),

  testWithSetup(
    'Inherit from Frame primitive',
    `Card as Frame: bg #1a1a1a, pad 16, rad 8, shadow md

Card
  Text "Card content", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')

      const card = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(card !== null, 'Card element should exist in DOM')
      api.assert.ok(
        card!.tagName === 'DIV',
        `Card should be a div (from Frame), got: ${card!.tagName}`
      )
    }
  ),

  testWithSetup(
    'Inherit from Text primitive',
    `Heading as Text: fs 24, weight bold, col white

Heading "Welcome"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { textContains: 'Welcome' })
    }
  ),

  testWithSetup(
    'Inherit from Input primitive',
    `SearchInput as Input: pad 12, bg #222, col white, rad 6, bor 1, boc #444

SearchInput placeholder "Search..."`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'input' })
    }
  ),

  testWithSetup(
    'Inherit from Icon primitive',
    `StatusIcon as Icon: is 20, ic #888

StatusIcon "check"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      const el = document.querySelector('[data-mirror-id="node-1"]')
      api.assert.ok(el !== null, 'Icon should exist')
    }
  ),
])
