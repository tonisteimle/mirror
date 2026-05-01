/**
 * Size Verification — fixed/full/hug widths and heights match rendered bounds
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getLayoutInfo, assertSize } from '../../layout-assertions'

function assertOk(result: { passed: boolean; message: string }): void {
  if (!result.passed) throw new Error(result.message)
}

export const sizeVerificationTests: TestCase[] = describe('Size Verification', [
  testWithSetup(
    'Fixed width: element has exact width',
    'Frame w 200, h 100, bg #1e293b\n  Frame w 80, h 50, bg #3b82f6',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-2')
      if (!info) throw new Error('Node not found')
      assertOk(assertSize(info, 'width', 80))
    }
  ),

  testWithSetup(
    'Fixed height: element has exact height',
    'Frame w 200, h 100, bg #1e293b\n  Frame w 80, h 60, bg #3b82f6',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-2')
      if (!info) throw new Error('Node not found')
      assertOk(assertSize(info, 'height', 60))
    }
  ),

  testWithSetup(
    'Full width: element fills parent',
    'Frame w 200, h 100, bg #1e293b\n  Frame w full, h 50, bg #3b82f6',
    async (_api: TestAPI) => {
      const parentInfo = getLayoutInfo('node-1')
      const childInfo = getLayoutInfo('node-2')
      if (!parentInfo || !childInfo) throw new Error('Nodes not found')
      assertOk(assertSize(childInfo, 'width', 'full', parentInfo))
    }
  ),

  testWithSetup(
    'Hug width: element shrinks to content',
    'Frame w 200, h 100, bg #1e293b\n  Frame bg #3b82f6, pad 8\n    Text "Short"',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-2')
      if (!info) throw new Error('Node not found')
      assertOk(assertSize(info, 'width', 'hug'))
    }
  ),
])
