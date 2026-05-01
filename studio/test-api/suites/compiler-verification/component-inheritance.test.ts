/**
 * Compiler Verification — Component Inheritance
 */

import { testWithSetup, describe, type TestCase } from '../../test-runner'
import type { TestAPI } from '../../types'
import { colorsMatch } from './_helpers'

// =============================================================================
// 7. Component Inheritance
// =============================================================================

export const componentInheritanceTests: TestCase[] = describe('Component Inheritance', [
  testWithSetup(
    'Component inherits from primitive',
    `PrimaryBtn as Button: bg #2271C1, col white, pad 12 24, rad 6, cursor pointer

PrimaryBtn "Click Me"`,
    async (api: TestAPI) => {
      const btn = api.preview.inspect('node-1')
      api.assert.ok(btn !== null, 'Button inspect should return info')
      api.assert.ok(btn!.tagName === 'button', `Should be button, got ${btn!.tagName}`)
      api.assert.ok(
        btn!.styles.cursor === 'pointer',
        `Cursor should be pointer, got ${btn!.styles.cursor}`
      )
      api.assert.ok(
        colorsMatch(btn!.styles.backgroundColor || '', '#2271C1'),
        `Background should be blue, got ${btn!.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Component chain inheritance',
    `Btn: pad 10 20, rad 6, cursor pointer
PrimaryBtn as Btn: bg #2271C1, col white
DangerBtn as Btn: bg #ef4444, col white
GhostBtn as Btn: bg transparent, col #888, bor 1, boc #888

Frame hor, gap 8
  PrimaryBtn "Save"
  DangerBtn "Delete"
  GhostBtn "Cancel"`,
    async (api: TestAPI) => {
      // All buttons should have base Btn styles
      const primary = api.preview.inspect('node-2')
      api.assert.ok(primary !== null, 'Primary button inspect should return info')
      api.assert.ok(primary!.styles.cursor === 'pointer', 'Primary should have pointer cursor')

      const danger = api.preview.inspect('node-3')
      api.assert.ok(danger, 'danger should exist')
      api.assert.ok(
        colorsMatch(danger?.styles.backgroundColor || '', '#ef4444'),
        `Danger should be red, got ${danger?.styles.backgroundColor}`
      )

      const ghost = api.preview.inspect('node-4')
      api.assert.ok(ghost, 'ghost should exist')
      api.assert.ok(
        ghost?.styles.backgroundColor === 'rgba(0, 0, 0, 0)' ||
          ghost?.styles.backgroundColor === 'transparent',
        `Ghost should be transparent, got ${ghost?.styles.backgroundColor}`
      )
    }
  ),

  testWithSetup(
    'Component with slots',
    `Card: bg #1a1a1a, pad 16, rad 8, gap 8
  Title: fs 18, weight bold, col white
  Desc: fs 14, col #888

Card
  Title "Product Name"
  Desc "A great product description."`,
    async (api: TestAPI) => {
      const card = api.preview.inspect('node-1')
      api.assert.ok(card !== null, 'Card should exist')

      const title = api.preview.inspect('node-2')
      api.assert.ok(title, 'title should exist')
      api.assert.ok(
        title?.styles.fontSize === '18px',
        `Title fontSize should be 18px, got ${title?.styles.fontSize}`
      )
      api.assert.ok(
        title?.styles.fontWeight === '700' || title?.styles.fontWeight === 'bold',
        `Title should be bold`
      )

      const desc = api.preview.inspect('node-3')
      api.assert.ok(desc, 'desc should exist')
      api.assert.ok(
        desc?.styles.fontSize === '14px',
        `Desc fontSize should be 14px, got ${desc?.styles.fontSize}`
      )
    }
  ),
])
