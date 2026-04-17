/**
 * Nesting Tests
 *
 * Tests for: nested containers, complex layouts
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

export const nestingTests: TestCase[] = describe('Nesting', [
  testWithSetup(
    '2 levels of nesting',
    'Frame gap 16\n  Frame gap 8\n    Text "Inner"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.hasChildren('node-1', 1)
      api.assert.hasChildren('node-2', 1)
    }
  ),

  testWithSetup(
    '3 levels of nesting',
    'Frame\n  Frame\n    Frame\n      Text "Deep"',
    async (api: TestAPI) => {
      api.assert.exists('node-4')
      api.assert.hasText('node-4', 'Deep')
    }
  ),

  testWithSetup(
    'siblings at same level',
    'Frame gap 8\n  Text "A"\n  Text "B"\n  Text "C"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
    }
  ),

  testWithSetup(
    'mixed horizontal and vertical',
    'Frame gap 16\n  Frame hor, gap 8\n    Button "A"\n    Button "B"\n  Frame gap 4\n    Text "X"\n    Text "Y"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)
      api.assert.hasStyle('node-2', 'flexDirection', 'row')
      api.assert.hasStyle('node-5', 'flexDirection', 'column')
    }
  ),
])

export const complexLayoutTests: TestCase[] = describe('Complex Layouts', [
  testWithSetup(
    'App Shell layout',
    'Frame hor, h full\n  Frame w 200, bg #1a1a1a\n    Text "Sidebar"\n  Frame grow, bg #0a0a0a\n    Text "Content"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'flexDirection', 'row')
      api.assert.hasChildren('node-1', 2)
    }
  ),

  testWithSetup(
    'Card layout',
    'Frame gap 12, pad 16, bg #1a1a1a, rad 8\n  Text "Title", fs 18\n  Text "Description"\n  Frame hor, gap 8\n    Button "OK"\n    Button "Cancel"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 3)
      api.assert.hasStyle('node-4', 'flexDirection', 'row')
    }
  ),

  testWithSetup(
    'Header with spread',
    'Frame hor, spread, pad 16, bg #1a1a1a\n  Text "Logo"\n  Frame hor, gap 12\n    Text "Home"\n    Text "About"\n    Text "Contact"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasStyle('node-1', 'justifyContent', 'space-between')
      api.assert.hasChildren('node-1', 2)
    }
  ),
])
