/**
 * Layout Test Suite
 *
 * Tests all layout properties: hor, ver, center, spread, gap, wrap, grid, stacked.
 */

import { testWithSetup, describe, type TestCase } from '../test-runner'
import type { TestAPI } from '../types'

// =============================================================================
// Direction Tests
// =============================================================================

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

// =============================================================================
// Alignment Tests (9-Zone)
// =============================================================================

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

// =============================================================================
// Distribution Tests
// =============================================================================

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

// =============================================================================
// Gap Tests
// =============================================================================

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

// =============================================================================
// Wrap Tests
// =============================================================================

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

// =============================================================================
// Grow & Shrink Tests
// =============================================================================

export const flexTests: TestCase[] = describe('Grow & Shrink', [
  testWithSetup(
    'grow makes element fill space',
    'Frame hor, h 100\n  Text "Fixed"\n  Frame grow, bg #333',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.exists('node-3')
      // grow should set flex-grow
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

// =============================================================================
// Stacked Layout Tests
// =============================================================================

export const stackedTests: TestCase[] = describe('Stacked Layout', [
  testWithSetup(
    'stacked positions children absolutely',
    'Frame stacked, w 100, h 100\n  Text "Bottom"\n  Text "Top"',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      // Stacked uses position relative/absolute
    }
  ),

  testWithSetup(
    'stacked with positioned children',
    'Frame stacked, w 100, h 100\n  Frame w full, h full, bg blue\n  Frame x 10, y 10, w 20, h 20, bg red',
    async (api: TestAPI) => {
      api.assert.exists('node-1')
      api.assert.hasChildren('node-1', 2)
    }
  ),
])

// =============================================================================
// Grid Layout Tests
// =============================================================================

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

// =============================================================================
// Nesting Tests
// =============================================================================

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

// =============================================================================
// Complex Layout Tests
// =============================================================================

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

// =============================================================================
// Export All
// =============================================================================

export const allLayoutTests: TestCase[] = [
  ...directionTests,
  ...alignmentTests,
  ...distributionTests,
  ...gapTests,
  ...wrapTests,
  ...flexTests,
  ...stackedTests,
  ...gridTests,
  ...nestingTests,
  ...complexLayoutTests,
]
