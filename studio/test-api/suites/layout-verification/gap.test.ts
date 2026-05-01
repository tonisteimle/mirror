/**
 * Gap Verification — gap value reflected in actual rendered spacing
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getLayoutInfo, assertGap } from '../../layout-assertions'

function assertOk(result: { passed: boolean; message: string }): void {
  if (!result.passed) throw new Error(result.message)
}

export const gapVerificationTests: TestCase[] = describe('Gap Verification', [
  testWithSetup(
    'Gap 8px between horizontal children',
    'Frame hor, gap 8\n  Frame w 50, h 30, bg #3b82f6\n  Frame w 50, h 30, bg #10b981\n  Frame w 50, h 30, bg #f59e0b',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertGap(info, 8))
    }
  ),

  testWithSetup(
    'Gap 16px between vertical children',
    'Frame gap 16\n  Frame w 100, h 30, bg #3b82f6\n  Frame w 100, h 30, bg #10b981\n  Frame w 100, h 30, bg #f59e0b',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertGap(info, 16))
    }
  ),

  testWithSetup(
    'Gap 0 means no space between children',
    'Frame hor, gap 0\n  Frame w 50, h 30, bg #3b82f6\n  Frame w 50, h 30, bg #10b981',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertGap(info, 0))
    }
  ),

  testWithSetup(
    'Large gap 24px',
    'Frame hor, gap 24\n  Frame w 40, h 30, bg #3b82f6\n  Frame w 40, h 30, bg #10b981',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')
      assertOk(assertGap(info, 24))
    }
  ),
])
