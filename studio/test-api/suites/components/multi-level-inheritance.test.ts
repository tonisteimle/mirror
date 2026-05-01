/**
 * Multi-level Component Inheritance Tests (3+ levels of `as`)
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const multiLevelInheritanceTests: TestCase[] = describe('Multi-level Inheritance', [
  testWithSetup(
    'Three levels of inheritance',
    `BaseBtn as Button: pad 10 20, rad 6, cursor pointer
ColoredBtn as BaseBtn: col white
PrimaryBtn as ColoredBtn: bg #2271C1

PrimaryBtn "Deep Inheritance"`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.dom.expect('node-1', { tag: 'button', text: 'Deep Inheritance' })
    }
  ),

  testWithSetup(
    'Override at each level',
    `Base: pad 8, bg #111
Level1 as Base: pad 12, col white
Level2 as Level1: pad 16, rad 4
Level3 as Level2: pad 20, shadow sm

Level3
  Text "Inherited styles", col white`,
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),
])
