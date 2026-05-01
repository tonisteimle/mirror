/**
 * Compiler Verification — Nested Structures
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'

// =============================================================================
// 3. Verschachtelte Strukturen
// =============================================================================

export const nestedStructureTests: TestCase[] = describe('Nested Structures', [
  testWithSetup(
    '5 levels deep nesting',
    `Frame pad 8, bg #111
  Frame pad 8, bg #222
    Frame pad 8, bg #333
      Frame pad 8, bg #444
        Frame pad 8, bg #555
          Text "Deep", col white`,
    async (api: TestAPI) => {
      // All levels should exist
      api.assert.exists('node-1')
      api.assert.exists('node-2')
      api.assert.exists('node-3')
      api.assert.exists('node-4')
      api.assert.exists('node-5')
      api.assert.exists('node-6')

      // Verify parent-child relationships
      const level5 = api.preview.inspect('node-5')
      api.assert.ok(level5, 'level5 should exist')
      api.assert.ok(
        level5?.parent === 'node-4',
        `Level 5 parent should be node-4, got ${level5?.parent}`
      )

      const text = api.preview.inspect('node-6')
      api.assert.ok(text !== null, 'Text element should exist')
      api.assert.ok(text!.parent === 'node-5', `Text parent should be node-5, got ${text!.parent}`)
      api.assert.hasText('node-6', 'Deep')
    }
  ),

  testWithSetup(
    'Mixed horizontal and vertical nesting',
    `Frame hor, gap 16, pad 16, bg #1a1a1a
  Frame gap 8, w 100
    Text "Col 1", col white
    Text "Item A", col #888
    Text "Item B", col #888
  Frame gap 8, w 100
    Text "Col 2", col white
    Text "Item C", col #888
    Text "Item D", col #888`,
    async (api: TestAPI) => {
      const parent = api.preview.inspect('node-1')
      api.assert.ok(parent !== null, 'Parent frame should exist')
      api.assert.ok(
        parent!.styles.flexDirection === 'row',
        `Parent should be row, got: ${parent!.styles.flexDirection}`
      )
      api.assert.ok(
        parent!.children.length === 2,
        `Should have 2 column children, got: ${parent!.children.length}`
      )

      const col1 = api.preview.inspect('node-2')
      api.assert.ok(col1 !== null, 'Column 1 should exist')
      api.assert.ok(
        col1!.styles.flexDirection === 'column',
        `Column 1 should be column, got: ${col1!.styles.flexDirection}`
      )
      api.assert.ok(
        col1!.children.length === 3,
        `Column 1 should have 3 children, got: ${col1!.children.length}`
      )
    }
  ),

  testWithSetup(
    'Component with nested slots',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 12
  Header: hor, spread, ver-center
  Body: gap 8
  Footer: hor, gap 8

Card
  Header
    Text "Title", col white, fs 18, weight bold
    Icon "x", ic #888, is 20
  Body
    Text "Content goes here.", col #888
    Text "More content.", col #666
  Footer
    Button "Cancel", bg #333, col white, pad 8 16, rad 4
    Button "Save", bg #2271C1, col white, pad 8 16, rad 4`,
    async (api: TestAPI) => {
      // Card structure should exist
      api.assert.exists('node-1') // Card
      api.assert.exists('node-2') // Header
      api.assert.exists('node-5') // Body
      api.assert.exists('node-8') // Footer

      // Header should be horizontal with spread
      const header = api.preview.inspect('node-2')
      api.assert.ok(header !== null, 'Header should exist')
      api.assert.ok(
        header!.styles.flexDirection === 'row',
        `Header should be row, got: ${header!.styles.flexDirection}`
      )
      api.assert.ok(
        header!.styles.justifyContent === 'space-between',
        `Header should be spread, got: ${header!.styles.justifyContent}`
      )
    }
  ),
])
