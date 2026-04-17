/**
 * 9-Zone Alignment Tests
 *
 * Tests for: center, tl, tc, tr, cl, cr, bl, bc, br
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const alignmentTests: TestCase[] = describe('9-Zone Alignment', [
  testWithSetup(
    'center aligns both axes',
    'Frame center, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'tl aligns top-left',
    'Frame tl, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'flex-start')
      api.assert.hasStyle('node-1', 'alignItems', 'flex-start')
    }
  ),

  testWithSetup(
    'tc aligns top-center',
    'Frame tc, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'flex-start')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'tr aligns top-right',
    'Frame tr, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'flex-start')
      api.assert.hasStyle('node-1', 'alignItems', 'flex-end')
    }
  ),

  testWithSetup(
    'cl aligns center-left',
    'Frame cl, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'flex-start')
    }
  ),

  testWithSetup(
    'cr aligns center-right',
    'Frame cr, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'center')
      api.assert.hasStyle('node-1', 'alignItems', 'flex-end')
    }
  ),

  testWithSetup(
    'bl aligns bottom-left',
    'Frame bl, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'flex-end')
      api.assert.hasStyle('node-1', 'alignItems', 'flex-start')
    }
  ),

  testWithSetup(
    'bc aligns bottom-center',
    'Frame bc, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'flex-end')
      api.assert.hasStyle('node-1', 'alignItems', 'center')
    }
  ),

  testWithSetup(
    'br aligns bottom-right',
    'Frame br, w 200, h 100\n  Text "X"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'flex-end')
      api.assert.hasStyle('node-1', 'alignItems', 'flex-end')
    }
  ),
])

export const distributionTests: TestCase[] = describe('Distribution', [
  testWithSetup(
    'spread uses space-between',
    'Frame hor, spread\n  Text "L"\n  Text "R"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'space-between')
    }
  ),

  testWithSetup(
    'spread with vertical',
    'Frame spread, h 200\n  Text "T"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'space-between')
    }
  ),
])
