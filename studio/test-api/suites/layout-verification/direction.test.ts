/**
 * Direction Verification — flex direction reflected in actual rendered positions
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getLayoutInfo, assertDirection } from '../../layout-assertions'

function assertOk(result: { passed: boolean; message: string }): void {
  if (!result.passed) throw new Error(result.message)
}

export const directionVerificationTests: TestCase[] = describe('Direction Verification', [
  testWithSetup(
    'Horizontal: children have same Y, increasing X',
    'Frame hor, gap 8\n  Frame w 50, h 30, bg #3b82f6\n  Frame w 50, h 30, bg #10b981\n  Frame w 50, h 30, bg #f59e0b',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertDirection(info, 'horizontal'))
    }
  ),

  testWithSetup(
    'Vertical: children have same X, increasing Y',
    'Frame gap 8\n  Frame w 100, h 30, bg #3b82f6\n  Frame w 100, h 30, bg #10b981\n  Frame w 100, h 30, bg #f59e0b',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertDirection(info, 'vertical'))
    }
  ),

  testWithSetup(
    'Nested: outer vertical, inner horizontal',
    'Frame gap 8\n  Frame hor, gap 4\n    Frame w 30, h 30, bg #3b82f6\n    Frame w 30, h 30, bg #10b981\n  Frame hor, gap 4\n    Frame w 30, h 30, bg #f59e0b\n    Frame w 30, h 30, bg #ef4444',
    async (_api: TestAPI) => {
      const outerInfo = getLayoutInfo('node-1')
      const innerInfo1 = getLayoutInfo('node-2')
      const innerInfo2 = getLayoutInfo('node-5')

      if (!outerInfo || !innerInfo1 || !innerInfo2) throw new Error('Nodes not found')

      assertOk(assertDirection(outerInfo, 'vertical'))
      assertOk(assertDirection(innerInfo1, 'horizontal'))
      assertOk(assertDirection(innerInfo2, 'horizontal'))
    }
  ),
])
