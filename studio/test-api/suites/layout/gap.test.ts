/**
 * Gap Tests
 *
 * Tests for: gap, g, wrap
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const gapTests: TestCase[] = describe('Gap', [
  testWithSetup(
    'gap sets spacing',
    'Frame gap 16\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '16px')
    }
  ),

  testWithSetup('gap with alias g', 'Frame g 8\n  Text "A"\n  Text "B"', async (api: TestAPI) => {
    api.assert.exists('node-1')
    api.assert.hasStyle('node-1', 'gap', '8px')
  }),

  testWithSetup(
    'gap 0 removes spacing',
    'Frame gap 0\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '0px')
    }
  ),

  testWithSetup(
    'large gap value',
    'Frame gap 100\n  Text "A"\n  Text "B"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'gap', '100px')
    }
  ),
])

export const wrapTests: TestCase[] = describe('Wrap', [
  testWithSetup(
    'wrap enables flex-wrap',
    'Frame hor, wrap, w 100\n  Button "A"\n  Button "B"\n  Button "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexWrap', 'wrap')
    }
  ),
])

export const flexTests: TestCase[] = describe('Grow & Shrink', [
  testWithSetup(
    'grow makes element fill space',
    'Frame hor, h 100\n  Text "Fixed"\n  Frame grow, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3')
    }
  ),

  testWithSetup(
    'shrink allows element to shrink',
    'Frame hor\n  Frame shrink, w 200\n    Text "Shrinkable"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
    }
  ),
])
