/**
 * Direction Tests
 *
 * Tests for: hor, ver, horizontal, vertical
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const directionTests: TestCase[] = describe('Direction', [
  testWithSetup(
    'Default is vertical (column)',
    'Frame\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
    }
  ),

  testWithSetup(
    'hor sets flex-direction row',
    'Frame hor\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
    }
  ),

  testWithSetup(
    'ver explicitly sets column',
    'Frame ver\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'column')
    }
  ),

  testWithSetup(
    'hor alias horizontal works',
    'Frame horizontal\n  Text "A"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
    }
  ),

  testWithSetup('ver alias vertical works', 'Frame vertical\n  Text "A"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'flexDirection', 'column')
  }),
])
