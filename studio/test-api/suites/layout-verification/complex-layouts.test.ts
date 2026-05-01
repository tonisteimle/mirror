/**
 * Complex Layout Verification — app-shell, card, toolbar, nested grids
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { getLayoutInfo, assertDirection, assertSize, assertGap } from '../../layout-assertions'

function assertOk(result: { passed: boolean; message: string }): void {
  if (!result.passed) throw new Error(result.message)
}

export const complexLayoutVerificationTests: TestCase[] = describe('Complex Layouts', [
  testWithSetup(
    'App shell: sidebar + content with correct widths',
    'Frame hor, w 400, h 200, bg #0a0a0a\n  Frame w 100, h full, bg #1e293b\n  Frame grow, h full, bg #334155',
    async (_api: TestAPI) => {
      const parentInfo = getLayoutInfo('node-1')
      const sidebarInfo = getLayoutInfo('node-2')
      const contentInfo = getLayoutInfo('node-3')

      if (!parentInfo || !sidebarInfo || !contentInfo) {
        throw new Error('Nodes not found')
      }

      assertOk(assertSize(sidebarInfo, 'width', 100))

      if (contentInfo.bounds.width < 250) {
        throw new Error(`Content should fill remaining space, got ${contentInfo.bounds.width}px`)
      }
    }
  ),

  testWithSetup(
    'Card layout: vertical stack with gap',
    'Frame gap 12, pad 16, w 200, bg #1e293b\n  Frame h 20, bg #3b82f6\n  Frame h 40, bg #10b981\n  Frame h 30, bg #f59e0b',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')

      assertOk(assertDirection(info, 'vertical'))
      assertOk(assertGap(info, 12))
    }
  ),

  testWithSetup(
    'Toolbar: horizontal with even spacing',
    'Frame hor, gap 8, pad 8, bg #1e293b\n  Frame w 32, h 32, bg #3b82f6\n  Frame w 32, h 32, bg #3b82f6\n  Frame w 32, h 32, bg #3b82f6',
    async (_api: TestAPI) => {
      const info = getLayoutInfo('node-1')
      if (!info) throw new Error('Node not found')

      assertOk(assertDirection(info, 'horizontal'))
      assertOk(assertGap(info, 8))

      for (const child of info.children) {
        assertOk(assertSize(child, 'width', 32))
        assertOk(assertSize(child, 'height', 32))
      }
    }
  ),

  testWithSetup(
    'Nested grids maintain structure',
    'Frame gap 8\n  Frame hor, gap 8\n    Frame w 50, h 50, bg #3b82f6\n    Frame w 50, h 50, bg #10b981\n  Frame hor, gap 8\n    Frame w 50, h 50, bg #f59e0b\n    Frame w 50, h 50, bg #ef4444',
    async (_api: TestAPI) => {
      const outerInfo = getLayoutInfo('node-1')
      if (!outerInfo) throw new Error('Node not found')

      assertOk(assertDirection(outerInfo, 'vertical'))

      for (const row of outerInfo.children) {
        const rowInfo = getLayoutInfo(row.nodeId)
        if (rowInfo && rowInfo.children.length >= 2) {
          assertOk(assertDirection(rowInfo, 'horizontal'))
        }
      }
    }
  ),
])
