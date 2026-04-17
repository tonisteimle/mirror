/**
 * Grid Layout Tests
 *
 * Tests for: grid, 12-column system
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const gridTests: TestCase[] = describe('Grid Layout', [
  testWithSetup(
    'grid creates 12-column grid',
    'Frame grid 12\n  Frame w 6, bg blue\n  Frame w 6, bg green',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'display', 'grid')
    }
  ),

  testWithSetup(
    'grid with gap',
    'Frame grid 12, gap 8\n  Frame w 4, bg red\n  Frame w 4, bg green\n  Frame w 4, bg blue',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'display', 'grid')
      api.assert.hasStyle('node-1', 'gap', '8px')
    }
  ),
])
