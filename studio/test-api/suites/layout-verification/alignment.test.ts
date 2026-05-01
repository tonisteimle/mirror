/**
 * Alignment Verification — center / start / end / spread produce expected positions
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getLayoutInfo, assertAlignment } from '../../layout-assertions'

function assertOk(result: { passed: boolean; message: string }): void {
  if (!result.passed) throw new Error(result.message)
}

export const alignmentVerificationTests: TestCase[] = describe('Alignment Verification', [
  testWithSetup(
    'Center alignment: children centered in container',
    'Frame center, w 200, h 100, bg #1e293b\n  Frame w 50, h 30, bg #3b82f6',
    async (api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertAlignment(info, { main: 'center', cross: 'center' }))
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Start alignment (tl): children at top-left',
    'Frame tl, w 200, h 100, bg #1e293b\n  Frame w 50, h 30, bg #3b82f6',
    async (api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertAlignment(info, { main: 'start', cross: 'start' }))
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'End alignment (br): children at bottom-right',
    'Frame br, w 200, h 100, bg #1e293b\n  Frame w 50, h 30, bg #3b82f6',
    async (api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertAlignment(info, { main: 'end', cross: 'end' }))
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),

  testWithSetup(
    'Space-between: first at start, last at end',
    'Frame hor, spread, w 200, h 50, bg #1e293b\n  Frame w 40, h 30, bg #3b82f6\n  Frame w 40, h 30, bg #10b981',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertAlignment(info, { main: 'space-between' }))
      const firstChild = info.children[0]
      const lastChild = info.children[info.children.length - 1]
      if (firstChild.bounds.left > 20) {
        throw new Error('First child should be near left edge')
      }
      if (lastChild.bounds.right < info.bounds.width - 20) {
        throw new Error('Last child should be near right edge')
      }
    }
  ),
])
