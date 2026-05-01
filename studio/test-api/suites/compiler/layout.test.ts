/**
 * Compiler Layout Tests — flex direction, alignment, spread, gap, nesting
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const layoutTests: TestCase[] = describe('Layout', [
  testWithSetup(
    'hor creates horizontal flex',
    'Frame hor, gap 8\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasChildren('node-1', 2)
    }
  ),

  testWithSetup(
    'center aligns items center',
    'Frame center, w 200, h 100\n  Text "Centered"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'spread distributes items',
    'Frame hor, spread\n  Text "Left"\n  Text "Right"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'space-between')
    }
  ),

  testWithSetup(
    'gap applies spacing',
    'Frame gap 24\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '24px')
    }
  ),

  testWithSetup(
    'nested frames maintain structure',
    'Frame gap 16\n  Frame gap 8\n    Text "Inner"\n  Text "Outer"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasChildren('node-1', 2)
      api.assert.hasChildren('node-2', 1)
    }
  ),
])
